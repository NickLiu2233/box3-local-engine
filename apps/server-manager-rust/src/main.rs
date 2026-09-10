#![recursion_limit = "256"]

use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Utc};
use ed25519_dalek::{pkcs8::DecodePublicKey, Signature, VerifyingKey};
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream},
    path::{Path as FsPath, PathBuf},
    process::Command,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tower_http::services::ServeDir;

const SERVICES: [&str; 5] = [
    "creator",
    "voxa",
    "play",
    "player-service",
    "player-auth-portal",
];
const KEY: &str = include_str!("../../../distribution/license-public-key.pem");
const LEGAL_NOTICE: &str = include_str!("../../../distribution/LICENSE.txt");

#[derive(Clone)]
struct App {
    root: PathBuf,
    token: String,
    compose_file: PathBuf,
    environment_file: PathBuf,
}
#[derive(Deserialize)]
struct Request {
    #[serde(flatten)]
    body: BTreeMap<String, Value>,
}
#[derive(Deserialize)]
struct LicensePayload {
    format_version: u8,
    license_id: String,
    #[serde(rename = "type")]
    license_type: String,
    holder_id: String,
    device_id: String,
    issued_at: String,
    expires_at: String,
    features: Vec<String>,
    commercial_use: bool,
}
#[derive(Serialize)]
struct Error {
    message: String,
}

fn fail(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(Error {
            message: message.into(),
        }),
    )
        .into_response()
}
fn env_path(app: &App) -> PathBuf {
    app.environment_file.clone()
}
fn parse_env(s: &str) -> BTreeMap<String, String> {
    s.lines()
        .filter_map(|l| {
            l.trim()
                .split_once('=')
                .map(|(k, v)| (k.trim().into(), v.trim().into()))
        })
        .collect()
}
fn set_env(mut source: String, key: &str, value: &str) -> String {
    let mut found = false;
    source = source
        .lines()
        .map(|line| {
            if line.trim_start().starts_with(&format!("{key}=")) {
                found = true;
                format!("{key}={value}")
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\n");
    if !found {
        source.push_str(&format!("\n{key}={value}"));
    }
    format!("{}\n", source.trim_end())
}
fn json_value(value: &Value) -> Result<String, String> {
    let rendered = match value {
        Value::String(value) => value.clone(),
        Value::Number(value) => value.to_string(),
        Value::Bool(value) => value.to_string(),
        _ => return Err("配置项格式无效".into()),
    };
    if rendered.len() > 2048 || rendered.contains(['\r', '\n', '\0']) {
        return Err("配置项内容无效".into());
    }
    Ok(rendered)
}
fn port(value: &Value, label: &str) -> Result<String, String> {
    let value = json_value(value)?;
    match value.parse::<u16>() {
        Ok(1..=65535) => Ok(value),
        _ => Err(format!("{label} 必须在 1–65535 之间")),
    }
}
fn auth(headers: &HeaderMap, app: &App) -> Result<(), Response> {
    if let Some(origin) = headers
        .get(header::ORIGIN)
        .and_then(|value| value.to_str().ok())
    {
        let host = headers
            .get(header::HOST)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("");
        let matches = origin
            .strip_prefix("http://")
            .or_else(|| origin.strip_prefix("https://"))
            .map(|value| value.trim_end_matches('/'))
            == Some(host);
        if !matches {
            return Err((
                StatusCode::FORBIDDEN,
                Json(Error {
                    message: "拒绝跨站管理请求".into(),
                }),
            )
                .into_response());
        }
    }
    let got = headers
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .unwrap_or("");
    if got.len() == app.token.len()
        && got
            .as_bytes()
            .iter()
            .zip(app.token.as_bytes())
            .fold(0u8, |a, (x, y)| a | (x ^ y))
            == 0
    {
        Ok(())
    } else {
        Err((
            StatusCode::UNAUTHORIZED,
            Json(Error {
                message: "管理令牌无效".into(),
            }),
        )
            .into_response())
    }
}
fn compose(app: &App, args: &[&str]) -> Result<String, String> {
    let output = Command::new("docker")
        .args([
            "compose",
            "--project-name",
            "box-local-engine",
            "--env-file",
            env_path(app).to_str().unwrap(),
            "-f",
            app.compose_file.to_str().unwrap(),
        ])
        .args(args)
        .current_dir(&app.root)
        .output()
        .map_err(|e| format!("无法运行 Docker：{e}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).into())
    }
}
fn docker(args: &[&str]) -> Result<String, String> {
    let output = Command::new("docker")
        .args(args)
        .output()
        .map_err(|error| format!("无法运行 Docker：{error}"))?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}
fn docker_check() -> (bool, String, String) {
    match Command::new("docker")
        .args(["info", "--format", "{{.ServerVersion}}"])
        .output()
    {
        Ok(output) if output.status.success() => (
            true,
            String::from_utf8_lossy(&output.stdout).trim().to_string(),
            String::new(),
        ),
        Ok(output) => (
            false,
            String::new(),
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ),
        Err(error) => (false, String::new(), format!("无法运行 Docker：{error}")),
    }
}
fn random_hex(bytes: usize) -> String {
    let mut value = vec![0u8; bytes];
    OsRng.fill_bytes(&mut value);
    value.iter().map(|byte| format!("{byte:02x}")).collect()
}
fn managed_image(values: &BTreeMap<String, String>, service: &str) -> Result<String, String> {
    match service {
        "postgresql" => Ok(values
            .get("BOX_POSTGRES_IMAGE")
            .cloned()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "docker.m.daocloud.io/library/postgres:16-alpine".into())),
        "redis" => Ok(values
            .get("BOX_REDIS_IMAGE")
            .cloned()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "docker.m.daocloud.io/library/redis:7-alpine".into())),
        _ => Err("只支持内置 PostgreSQL 或 Redis".into()),
    }
}
fn managed_service_name(service: &str) -> Result<&'static str, String> {
    match service {
        "postgresql" => Ok("managed-postgres"),
        "redis" => Ok("managed-redis"),
        _ => Err("只支持内置 PostgreSQL 或 Redis".into()),
    }
}
fn managed_running(service: &str) -> bool {
    docker(&[
        "ps",
        "--filter",
        "label=com.docker.compose.project=box-local-engine",
        "--filter",
        &format!("label=com.docker.compose.service={service}"),
        "--filter",
        "status=running",
        "--format",
        "{{.ID}}",
    ])
    .is_ok_and(|output| !output.is_empty())
}
fn managed_service_info(app: &App, service: &str) -> Result<Value, String> {
    let values = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let image = managed_image(&values, service)?;
    let image_available = docker(&["image", "inspect", &image]).is_ok();
    match service {
        "postgresql" => {
            let database = values
                .get("BOX_MANAGED_POSTGRES_DATABASE")
                .or_else(|| values.get("BOX_DATABASE_NAME"))
                .cloned()
                .unwrap_or_else(|| "box".into());
            let user = values
                .get("BOX_MANAGED_POSTGRES_USER")
                .or_else(|| values.get("BOX_DATABASE_USER"))
                .cloned()
                .unwrap_or_else(|| "box".into());
            let password = values
                .get("BOX_MANAGED_POSTGRES_PASSWORD")
                .or_else(|| values.get("BOX_DATABASE_PASSWORD"))
                .cloned()
                .unwrap_or_default();
            let port = values
                .get("BOX_MANAGED_POSTGRES_HOST_PORT")
                .cloned()
                .unwrap_or_else(|| "5432".into());
            let configured = values
                .get("BOX_DATABASE_MODE")
                .is_some_and(|mode| mode == "managed")
                && !password.is_empty();
            Ok(json!({
                "imageAvailable": image_available,
                "configured": configured,
                "running": managed_running("managed-postgres"),
                "host": "127.0.0.1",
                "port": port,
                "database": database,
                "user": user,
                "password": password,
                "connectionUrl": if configured { format!("postgresql://{}:{}@127.0.0.1:{}/{}", urlencoding::encode(&user), urlencoding::encode(&password), port, urlencoding::encode(&database)) } else { String::new() }
            }))
        }
        "redis" => {
            let password = values
                .get("BOX_MANAGED_REDIS_PASSWORD")
                .or_else(|| values.get("REDIS_PASSWORD"))
                .cloned()
                .unwrap_or_default();
            let port = values
                .get("BOX_MANAGED_REDIS_HOST_PORT")
                .cloned()
                .unwrap_or_else(|| "6379".into());
            let database = values
                .get("REDIS_DB")
                .cloned()
                .unwrap_or_else(|| "0".into());
            let configured = values
                .get("BOX_REDIS_MODE")
                .is_some_and(|mode| mode == "managed")
                && !password.is_empty();
            Ok(json!({
                "imageAvailable": image_available,
                "configured": configured,
                "running": managed_running("managed-redis"),
                "host": "127.0.0.1",
                "port": port,
                "database": database,
                "user": "",
                "password": password,
                "connectionUrl": if configured { format!("redis://:{}@127.0.0.1:{}/{}", urlencoding::encode(&password), port, database) } else { String::new() }
            }))
        }
        _ => unreachable!(),
    }
}
fn prepare_managed_service(app: &App, service: &str) -> Result<(), String> {
    let values = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let image = managed_image(&values, service)?;
    docker(&["info", "--format", "{{.ServerVersion}}"])?;
    if docker(&["image", "inspect", &image]).is_err() {
        docker(&["pull", &image])?;
    }
    Ok(())
}
fn start_managed_service(app: &App, service: &str) -> Result<(), String> {
    let values = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let compose_service = managed_service_name(service)?;
    let mode_key = if service == "postgresql" {
        "BOX_DATABASE_MODE"
    } else {
        "BOX_REDIS_MODE"
    };
    if !values.get(mode_key).is_some_and(|mode| mode == "managed") {
        return Err("请先保存内置服务配置".into());
    }
    compose(app, &["up", "-d", "--wait", compose_service])?;
    Ok(())
}
fn private(path: &FsPath, value: &str) -> Result<(), String> {
    fs::create_dir_all(path.parent().ok_or("无效路径")?).map_err(|e| e.to_string())?;
    let tmp = path.with_extension(format!("{}.{}.tmp", std::process::id(), random_hex(8)));
    fs::write(&tmp, value).map_err(|e| e.to_string())?;
    fs::rename(tmp, path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    Ok(())
}
fn private_bytes(path: &FsPath, value: &[u8]) -> Result<(), String> {
    fs::create_dir_all(path.parent().ok_or("无效路径")?).map_err(|error| error.to_string())?;
    let temporary = path.with_extension(format!("{}.{}.tmp", std::process::id(), random_hex(8)));
    fs::write(&temporary, value).map_err(|error| error.to_string())?;
    fs::rename(temporary, path).map_err(|error| error.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}
fn backup_dir(app: &App) -> PathBuf {
    app.root.join("apps/local-engine/backups")
}
fn backup_file(app: &App, value: &str) -> Result<PathBuf, String> {
    let name = FsPath::new(value)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("备份文件名无效")?;
    if !name.ends_with(".tar.gz") {
        return Err("仅允许 BOX3 备份归档".into());
    }
    Ok(backup_dir(app).join(name))
}
fn list_backups(app: &App) -> Result<Value, String> {
    let directory = backup_dir(app);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let mut items = fs::read_dir(directory).map_err(|error| error.to_string())?.filter_map(Result::ok).filter_map(|entry| {
        let path=entry.path(); let name=path.file_name()?.to_str()?.to_string();
        (name.ends_with(".tar.gz") && path.is_file()).then(|| { let meta=entry.metadata().ok()?; Some(json!({"name":name,"path":name,"sizeBytes":meta.len(),"modifiedAt":meta.modified().ok()?.duration_since(UNIX_EPOCH).ok()?.as_secs()})) }).flatten()
    }).collect::<Vec<_>>();
    items.sort_by(|left, right| {
        right
            .get("modifiedAt")
            .and_then(Value::as_u64)
            .cmp(&left.get("modifiedAt").and_then(Value::as_u64))
    });
    Ok(json!(items))
}
fn create_backup(app: &App) -> Result<String, String> {
    let directory = backup_dir(app);
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let name = format!("box3-backup-{stamp}.tar.gz");
    let destination = directory.join(&name);
    let paths = [
        "apps/local-engine/projects",
        "apps/local-engine/dist",
        "apps/local-engine/play-worlds",
        "apps/voxa/data",
    ]
    .into_iter()
    .filter(|path| app.root.join(path).exists())
    .collect::<Vec<_>>();
    if paths.is_empty() {
        return Err("没有可备份的数据目录".into());
    }
    let status = Command::new("tar")
        .args(["-czf", destination.to_str().ok_or("备份路径无效")?])
        .args(&paths)
        .current_dir(&app.root)
        .status()
        .map_err(|error| format!("无法创建备份：{error}"))?;
    if !status.success() {
        let _ = fs::remove_file(&destination);
        return Err("创建备份失败".into());
    }
    Ok(name)
}
fn restore_backup(app: &App, value: &str) -> Result<(), String> {
    let archive = backup_file(app, value)?;
    if !archive.is_file() {
        return Err("备份不存在".into());
    }
    let list = Command::new("tar")
        .args(["-tzf", archive.to_str().ok_or("备份路径无效")?])
        .output()
        .map_err(|error| format!("无法验证备份：{error}"))?;
    if !list.status.success()
        || String::from_utf8_lossy(&list.stdout)
            .lines()
            .any(|line| line.starts_with('/') || line.split('/').any(|part| part == ".."))
    {
        return Err("备份内容无效".into());
    }
    let verbose = Command::new("tar")
        .args(["-tvzf", archive.to_str().ok_or("备份路径无效")?])
        .output()
        .map_err(|error| format!("无法验证备份类型：{error}"))?;
    if !verbose.status.success()
        || String::from_utf8_lossy(&verbose.stdout)
            .lines()
            .any(|line| line.starts_with('l') || line.starts_with('h'))
    {
        return Err("备份不能包含符号链接或硬链接".into());
    }
    compose(
        app,
        &[
            "stop",
            "creator",
            "voxa",
            "play",
            "player-service",
            "player-auth-portal",
            "managed-postgres",
            "managed-redis",
        ],
    )?;
    let status = Command::new("tar")
        .args([
            "-xzf",
            archive.to_str().ok_or("备份路径无效")?,
            "--no-same-owner",
            "--no-same-permissions",
            "-C",
            app.root.to_str().ok_or("部署目录无效")?,
        ])
        .status()
        .map_err(|error| format!("无法恢复备份：{error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("恢复备份失败".into())
    }
}
fn performance(app: &App) -> Result<Value, String> {
    let output = Command::new("docker")
        .args(["stats", "--no-stream", "--format", "{{json .}}"])
        .output()
        .map_err(|error| format!("无法读取 Docker 性能数据：{error}"))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let rows = String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| serde_json::from_str::<Value>(line).ok())
        .collect::<Vec<_>>();
    let environment = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let mut names = SERVICES.to_vec();
    names.extend(["managed-postgres", "managed-redis"]);
    let services = names
        .iter()
        .map(|service| {
            let row = rows.iter().find(|row| {
                row.get("Name")
                    .and_then(Value::as_str)
                    .is_some_and(|name| name.contains(service))
            });
            let cpu = row
                .and_then(|row| row.get("CPUPerc"))
                .and_then(Value::as_str)
                .unwrap_or("0%")
                .trim_end_matches('%')
                .parse::<f64>()
                .unwrap_or(0.0);
            let memory = row
                .and_then(|row| row.get("MemUsage"))
                .and_then(Value::as_str)
                .unwrap_or("0B / 0B");
            let mut parts = memory.split('/').map(str::trim);
            let enabled = match *service {
                "managed-postgres" => environment
                    .get("BOX_DATABASE_MODE")
                    .is_some_and(|mode| mode == "managed"),
                "managed-redis" => environment
                    .get("BOX_REDIS_MODE")
                    .is_some_and(|mode| mode == "managed"),
                name => environment.get("COMPOSE_PROFILES").is_some_and(|profiles| {
                    profiles.split(',').any(|profile| {
                        profile
                            == if name == "player-auth-portal" {
                                "auth-portal"
                            } else {
                                name
                            }
                    })
                }),
            };
            json!({
                "name": service,
                "enabled": enabled,
                "running": row.is_some(),
                "cpuPercent": cpu,
                "memoryUsage": parts.next().unwrap_or("0B"),
                "memoryLimit": parts.next().unwrap_or("0B"),
                "memoryPercent": row.and_then(|row|row.get("MemPerc")).and_then(Value::as_str).unwrap_or("0%").trim_end_matches('%').parse::<f64>().unwrap_or(0.0),
                "pids": row.and_then(|row|row.get("PIDs")).and_then(Value::as_str).and_then(|value|value.parse::<u64>().ok()).unwrap_or(0)
            })
        })
        .collect::<Vec<_>>();
    Ok(json!({
        "sampledAt": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
        "services": services
    }))
}
fn test_connection(app: &App, body: &BTreeMap<String, Value>) -> Result<Value, String> {
    let text = |key: &str| {
        body.get(key)
            .and_then(Value::as_str)
            .unwrap_or_default()
            .trim()
            .to_string()
    };
    let kind = text("kind");
    let host = text("host");
    if host.is_empty()
        || host.len() > 253
        || host
            .chars()
            .any(|value| !(value.is_ascii_alphanumeric() || ".:-".contains(value)))
    {
        return Err("服务器地址无效".into());
    }
    let port = body
        .get("port")
        .and_then(|value| value.as_u64().or_else(|| value.as_str()?.parse().ok()))
        .filter(|value| *value > 0 && *value <= 65535)
        .ok_or("服务器端口无效")? as u16;
    let stored = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    if kind == "postgresql" {
        let database = if text("database").is_empty() {
            stored.get("BOX_DATABASE_NAME").cloned().unwrap_or_default()
        } else {
            text("database")
        };
        let user = if text("user").is_empty() {
            stored.get("BOX_DATABASE_USER").cloned().unwrap_or_default()
        } else {
            text("user")
        };
        let password = if text("password").is_empty() {
            stored
                .get("BOX_DATABASE_PASSWORD")
                .cloned()
                .unwrap_or_default()
        } else {
            text("password")
        };
        if database.is_empty() || user.is_empty() || password.is_empty() {
            return Err("请填写 PostgreSQL 数据库名、账号和密码后再测试".into());
        }
        postgres::Config::new()
            .host(&host)
            .port(port)
            .dbname(&database)
            .user(&user)
            .password(&password)
            .connect_timeout(Duration::from_secs(5))
            .connect(postgres::NoTls)
            .map_err(|error| format!("PostgreSQL 连接失败：{error}"))?;
        Ok(json!({"ok":true,"message":format!("PostgreSQL 服务连接并认证成功：{host}:{port}")}))
    } else if kind == "redis" {
        let password = if text("password").is_empty() {
            stored.get("REDIS_PASSWORD").cloned().unwrap_or_default()
        } else {
            text("password")
        };
        let redis_db = body
            .get("redisDb")
            .and_then(|value| value.as_u64().or_else(|| value.as_str()?.parse().ok()))
            .unwrap_or(0)
            .min(255);
        let client = redis::Client::open(format!("redis://{host}:{port}/"))
            .map_err(|error| format!("Redis 客户端初始化失败：{error}"))?;
        let mut connection = client
            .get_connection()
            .map_err(|error| format!("Redis 连接失败：{error}"))?;
        if !password.is_empty() {
            redis::cmd("AUTH")
                .arg(password)
                .query::<()>(&mut connection)
                .map_err(|error| format!("Redis 认证失败：{error}"))?;
        }
        redis::cmd("SELECT")
            .arg(redis_db)
            .query::<()>(&mut connection)
            .map_err(|error| format!("Redis 数据库选择失败：{error}"))?;
        redis::cmd("PING")
            .query::<String>(&mut connection)
            .map_err(|error| format!("Redis 协议检查失败：{error}"))?;
        Ok(json!({"ok":true,"message":format!("Redis 服务连接并认证成功：{host}:{port}")}))
    } else {
        Err("不支持的连接类型".into())
    }
}
fn unavailable_runtime() -> Value {
    json!({"phase":"stopped","percent":0,"message":"运行时未连接","updatedAt":"","cpuPercent":null,"memoryBytes":null,"uptimeMs":null,"processCount":0,"rooms":[]})
}
fn runtime_status(host: &str, port: u16, project_id: &str, prefix: &str) -> Value {
    let Ok(mut stream) = TcpStream::connect((host, port)) else {
        return unavailable_runtime();
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(1200)));
    let path = if prefix.is_empty() {
        format!("/{project_id}/__local_runtime/status")
    } else {
        format!("/{prefix}/{project_id}/__local_runtime/status")
    };
    if stream
        .write_all(
            format!("GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n").as_bytes(),
        )
        .is_err()
    {
        return unavailable_runtime();
    }
    let mut response = String::new();
    if stream.read_to_string(&mut response).is_err()
        || !(response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200"))
    {
        return unavailable_runtime();
    }
    response
        .split_once("\r\n\r\n")
        .and_then(|(_, body)| serde_json::from_str(body).ok())
        .unwrap_or_else(unavailable_runtime)
}
fn runtime_catalog(app: &App) -> Value {
    let projects = |relative: &str, metadata: &str, is_creator: bool| {
        fs::read_dir(app.root.join(relative)).ok().into_iter().flatten().filter_map(Result::ok).filter_map(|entry| {
        if !entry.file_type().ok()?.is_dir() { return None }; let project_id=entry.file_name().to_string_lossy().to_string();
        let value:Value=serde_json::from_str(&fs::read_to_string(entry.path().join(metadata)).ok()?).ok()?;
        if !is_creator && value.get("id").and_then(Value::as_str)!=Some(project_id.as_str()) {return None}
        let edit = if is_creator { runtime_status("creator", 9967, &project_id, "") } else { unavailable_runtime() };
        let play = if is_creator { unavailable_runtime() } else { runtime_status("play", 3000, &project_id, "p") };
        Some(json!({"projectId":project_id,"permanentMapId":value.get("permanentMapId").and_then(Value::as_str).unwrap_or(""),"name":if is_creator{value.get("name").and_then(Value::as_str).unwrap_or("")}else{value.get("projectName").and_then(Value::as_str).unwrap_or("")},"mapRole":value.get("mapRole").and_then(Value::as_str).unwrap_or("main"),"mainProjectId":value.get("mainProjectId").and_then(Value::as_str).unwrap_or(""),"edit":edit,"play":play}))
    }).collect::<Vec<_>>()
    };
    json!({"creator":projects("apps/local-engine/projects","project.json",true),"play":projects("apps/local-engine/play-worlds","manifest.json",false)})
}
fn destroy_runtime(project_id: &str, mode: &str, room_id: Option<&str>) -> Result<(), String> {
    if project_id.is_empty()
        || !project_id
            .bytes()
            .all(|value| value.is_ascii_alphanumeric() || value == b'-')
    {
        return Err("作品 ID 无效".into());
    }
    if room_id.is_some_and(|value| {
        value.is_empty()
            || !value
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    }) {
        return Err("房间 ID 无效".into());
    }
    let (host, port, prefix) = match mode {
        "creator" => ("creator", 9967, ""),
        "play" => ("play", 3000, "p"),
        _ => return Err("运行端类型无效".into()),
    };
    let path = match room_id {
        Some(room) if prefix.is_empty() => {
            format!("/{project_id}/__room/{room}/__local_runtime/destroy")
        }
        Some(room) => format!("/{prefix}/{project_id}/__room/{room}/__local_runtime/destroy"),
        None if prefix.is_empty() => format!("/{project_id}/__local_runtime/destroy"),
        None => format!("/{prefix}/{project_id}/__local_runtime/destroy"),
    };
    let mut stream =
        TcpStream::connect((host, port)).map_err(|error| format!("无法连接运行时：{error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(5)))
        .map_err(|error| error.to_string())?;
    stream.write_all(format!("POST {path} HTTP/1.1\r\nHost: {host}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").as_bytes()).map_err(|error|format!("无法发送销毁请求：{error}"))?;
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .map_err(|error| format!("无法读取销毁结果：{error}"))?;
    if response.starts_with("HTTP/1.1 204") || response.starts_with("HTTP/1.0 204") {
        Ok(())
    } else {
        Err(format!(
            "运行时拒绝销毁请求：{}",
            response.lines().next().unwrap_or("未知错误")
        ))
    }
}
fn service_images() -> Vec<Value> {
    let tag = env::var("BOX_IMAGE_TAG").unwrap_or_default();
    let platform = match env::consts::ARCH {
        "x86_64" => "linux/amd64",
        "aarch64" | "arm64" => "linux/arm64",
        _ => "linux",
    };
    let image_tag = if tag.is_empty() { "0.1.1".into() } else { tag };
    [
        ("地图创作工具 / 创作作品管理", "box-local-engine-creator"),
        ("模型创作工具", "box-local-engine-voxa"),
        ("游玩端", "box-local-engine-play"),
        ("账号服务", "box-local-engine-player-service"),
        ("登录页面", "box-local-engine-player-auth-portal"),
    ]
    .into_iter()
    .map(|(name, image)| {
        let full = format!("{image}:{image_tag}");
        let inspect = docker(&["image", "inspect", &full]);
        let (image_id, created_at, source_revision, build_source) = inspect
            .ok()
            .and_then(|text| serde_json::from_str::<Vec<Value>>(&text).ok())
            .and_then(|mut list| list.pop())
            .map(|value| {
                let image_id = value
                    .get("Id")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
                    .to_string();
                let created_at = value
                    .get("Created")
                    .and_then(Value::as_str)
                    .unwrap_or("unknown")
                    .to_string();
                let labels = value.get("Config").and_then(|c| c.get("Labels")).cloned();
                let source_revision = labels
                    .as_ref()
                    .and_then(|l| l.get("org.opencontainers.image.revision"))
                    .and_then(Value::as_str)
                    .map(String::from)
                    .unwrap_or_else(|| {
                        option_env!("BOX_BUILD_COMMIT")
                            .unwrap_or("unknown")
                            .to_string()
                    });
                let build_source = labels
                    .as_ref()
                    .and_then(|l| l.get("org.opencontainers.image.source"))
                    .and_then(Value::as_str)
                    .map(String::from)
                    .unwrap_or_else(|| {
                        option_env!("BOX_BUILD_SOURCE")
                            .unwrap_or("local")
                            .to_string()
                    });
                (image_id, created_at, source_revision, build_source)
            })
            .unwrap_or_else(|| {
                (
                    "unknown".into(),
                    "unknown".into(),
                    option_env!("BOX_BUILD_COMMIT")
                        .unwrap_or("unknown")
                        .to_string(),
                    option_env!("BOX_BUILD_SOURCE")
                        .unwrap_or("local")
                        .to_string(),
                )
            });
        json!({
            "name": name,
            "image": image,
            "tag": image_tag,
            "platform": platform,
            "imageId": image_id,
            "createdAt": created_at,
            "sourceRevision": source_revision,
            "buildSource": build_source,
        })
    })
    .collect()
}

fn export_diagnostics(app: &App) -> Result<String, String> {
    let directory = app.root.join("diagnostics");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let text = directory.join(format!("BOX-diagnostic-{stamp}.txt"));
    let docker = compose(app, &["ps", "--all", "--format", "json"])
        .unwrap_or_else(|error| format!("Docker 状态读取失败：{error}"));
    private(
        &text,
        &format!(
            "BOX3 Engine Linux diagnostic\ncreatedAt={stamp}\n\nDocker Compose status:\n{docker}\n"
        ),
    )?;
    Ok(text
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string())
}
fn database_fields(value: Option<&String>) -> (String, String, String, String, String) {
    let Some(value) = value else {
        return (
            String::new(),
            "5432".into(),
            "box".into(),
            "".into(),
            String::new(),
        );
    };
    let value = value
        .strip_prefix("postgres://")
        .or_else(|| value.strip_prefix("postgresql://"))
        .unwrap_or(value);
    let (credentials, rest) = value.rsplit_once('@').unwrap_or(("", value));
    let (user, password) = credentials
        .split_once(':')
        .map(|(user, password)| {
            (
                urlencoding::decode(user).unwrap_or_default().into_owned(),
                urlencoding::decode(password)
                    .unwrap_or_default()
                    .into_owned(),
            )
        })
        .unwrap_or_default();
    let (server, database) = rest.split_once('/').unwrap_or((rest, "box"));
    let (host, port) = server
        .rsplit_once(':')
        .map(|(host, port)| (host.to_string(), port.to_string()))
        .unwrap_or((server.to_string(), "5432".into()));
    (
        host,
        port,
        database.split('?').next().unwrap_or("box").to_string(),
        user,
        password,
    )
}
fn url_host(value: Option<&String>, fallback: &str) -> String {
    value
        .and_then(|value| value.split("://").nth(1))
        .and_then(|value| value.split('/').next())
        .map(|value| value.split(':').next().unwrap_or(value).to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| fallback.into())
}
fn device(app: &App) -> Result<String, String> {
    let dir = app.root.join("license");
    let secret = dir.join("install-secret");
    let value = fs::read_to_string(&secret)
        .ok()
        .filter(|v| v.trim().len() == 64)
        .unwrap_or_else(|| {
            let mut b = [0u8; 32];
            OsRng.fill_bytes(&mut b);
            let v = b.iter().map(|b| format!("{b:02x}")).collect::<String>();
            private(&secret, &v).unwrap();
            v
        });
    let hw_path =
        env::var("BOX_LICENSE_HARDWARE_ID_FILE").unwrap_or_else(|_| "/run/host-machine-id".into());
    let hw = fs::read_to_string(&hw_path)
        .or_else(|_| fs::read_to_string("/run/host-machine-id"))
        .or_else(|_| fs::read_to_string("/etc/machine-id"))
        .map_err(|_| "无法读取 Linux 设备标识")?;
    let mut h = Sha256::new();
    h.update(b"box3-engine-device-v2\0");
    h.update(hw.trim().to_lowercase());
    h.update(b"\0");
    h.update(value.trim());
    let id = format!("dev_{:x}", h.finalize());
    private(&dir.join("device-id"), &id)?;
    Ok(id)
}
fn license(app: &App, install: Option<&str>) -> Result<Value, String> {
    let id = device(app)?;
    let path = app.root.join("license/box3-license.boxlic");
    if let Some(token) = install {
        private(&path, token)?;
    }
    let token = match fs::read_to_string(&path) {
        Ok(v) => v,
        Err(_) => {
            return Ok(
                json!({"installed":false,"valid":false,"deviceId":id,"message":"尚未安装个人学习许可证"}),
            )
        }
    };
    let parts: Vec<_> = token.trim().split('.').collect();
    let invalid = |m: &str| Ok(json!({"installed":true,"valid":false,"deviceId":id,"message":m}));
    if parts.len() != 3 || parts[0] != "box3l1" {
        return invalid("许可证格式无效");
    }
    let key = VerifyingKey::from_public_key_pem(KEY).map_err(|_| "内置许可证公钥无效")?;
    let sig = Signature::from_slice(
        &URL_SAFE_NO_PAD
            .decode(parts[2])
            .map_err(|_| "许可证签名编码无效")?,
    )
    .map_err(|_| "许可证签名无效")?;
    if key.verify_strict(parts[1].as_bytes(), &sig).is_err() {
        return invalid("许可证签名无效");
    }
    let p: LicensePayload = serde_json::from_slice(
        &URL_SAFE_NO_PAD
            .decode(parts[1])
            .map_err(|_| "许可证内容无效")?,
    )
    .map_err(|_| "许可证内容无效")?;
    let expires = DateTime::parse_from_rfc3339(&p.expires_at)
        .map_err(|_| "许可证到期时间无效")?
        .with_timezone(&Utc);
    if p.format_version != 1
        || p.license_type != "personal-learning"
        || p.commercial_use
        || p.device_id != id
        || expires <= Utc::now()
        || SERVICES.iter().any(|s| !p.features.iter().any(|f| f == s))
    {
        return invalid("许可证无效、已到期或与当前设备不匹配");
    }
    Ok(
        json!({"installed":true,"valid":true,"deviceId":id,"licenseId":p.license_id,"holderId":p.holder_id,"issuedAt":p.issued_at,"expiresAt":p.expires_at,"message":"许可证有效"}),
    )
}
async fn health() -> Json<Value> {
    Json(json!({"ok":true}))
}
async fn index() -> Result<Html<String>, StatusCode> {
    fs::read_to_string("/app/public/index.html")
        .map(Html)
        .map_err(|_| StatusCode::NOT_FOUND)
}
async fn download_backup(
    State(app): State<Arc<App>>,
    Path(archive): Path<String>,
    headers: HeaderMap,
) -> Response {
    if let Err(response) = auth(&headers, &app) {
        return response;
    }
    let result = (|| -> Result<Response, String> {
        let path = backup_file(&app, &archive)?;
        let bytes = fs::read(path).map_err(|_| "备份不存在")?;
        let mut response = Response::new(bytes.into());
        response
            .headers_mut()
            .insert(header::CONTENT_TYPE, "application/gzip".parse().unwrap());
        response.headers_mut().insert(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", archive)
                .parse()
                .map_err(|_| "备份文件名无效")?,
        );
        Ok(response)
    })();
    result.unwrap_or_else(fail)
}
async fn download_diagnostics(
    State(app): State<Arc<App>>,
    Path(archive): Path<String>,
    headers: HeaderMap,
) -> Response {
    if let Err(response) = auth(&headers, &app) {
        return response;
    }
    let result = (|| -> Result<Response, String> {
        let name = FsPath::new(&archive)
            .file_name()
            .and_then(|value| value.to_str())
            .ok_or("诊断文件名无效")?;
        if name != archive || !name.starts_with("BOX-diagnostic-") || !name.ends_with(".txt") {
            return Err("诊断文件名无效".into());
        }
        let bytes =
            fs::read(app.root.join("diagnostics").join(name)).map_err(|_| "诊断文件不存在")?;
        let mut response = Response::new(bytes.into());
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            "text/plain; charset=utf-8".parse().unwrap(),
        );
        response.headers_mut().insert(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{name}\"")
                .parse()
                .map_err(|_| "诊断文件名无效")?,
        );
        Ok(response)
    })();
    result.unwrap_or_else(fail)
}
async fn upload_backup(State(app): State<Arc<App>>, headers: HeaderMap, body: Bytes) -> Response {
    if let Err(response) = auth(&headers, &app) {
        return response;
    }
    let result = (|| -> Result<Value, String> {
        if body.len() > 512 * 1024 * 1024 {
            return Err("备份文件不能超过 512 MB".into());
        };
        let encoded = headers
            .get("x-backup-name")
            .and_then(|value| value.to_str().ok())
            .ok_or("缺少备份文件名")?;
        let name = urlencoding::decode(encoded).map_err(|_| "备份文件名无效")?;
        let path = backup_file(&app, &name)?;
        if !body.starts_with(&[0x1f, 0x8b]) {
            return Err("只接受 gzip 备份归档".into());
        };
        private_bytes(&path, &body)?;
        Ok(json!({"path":name}))
    })();
    match result {
        Ok(value) => Json(value).into_response(),
        Err(error) => fail(error),
    }
}
async fn security(request: axum::extract::Request, next: Next) -> Response {
    let mut response = next.run(request).await;
    let headers = response.headers_mut();
    headers.insert(header::CACHE_CONTROL, "no-store".parse().unwrap());
    headers.insert("content-security-policy", "default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'".parse().unwrap());
    headers.insert("x-content-type-options", "nosniff".parse().unwrap());
    headers.insert("x-frame-options", "DENY".parse().unwrap());
    response
}
async fn command(
    State(app): State<Arc<App>>,
    Path(name): Path<String>,
    headers: HeaderMap,
    Json(req): Json<Request>,
) -> Response {
    if let Err(r) = auth(&headers, &app) {
        return r;
    }
    let answer = tokio::task::spawn_blocking(move || -> Result<Value, String> {
        match name.as_str() {
            "get_license_status" => license(&app, None),
            "install_license" => license(
                &app,
                Some(
                    req.body
                        .get("token")
                        .and_then(Value::as_str)
                        .ok_or("许可证内容无效")?,
                ),
            ),
            "get_raw_environment" => Ok(json!(
                fs::read_to_string(env_path(&app)).map_err(|e| e.to_string())?
            )),
            "save_raw_environment" => {
                let s = req
                    .body
                    .get("content")
                    .and_then(Value::as_str)
                    .ok_or("配置内容无效")?;
                if s.len() > 524288 || s.contains('\0') {
                    return Err("配置内容无效".into());
                }
                private(&env_path(&app), s)?;
                Ok(json!(false))
            }
            "get_install_config" => {
                let values = parse_env(
                    &fs::read_to_string(env_path(&app)).map_err(|error| error.to_string())?,
                );
                let number = |key: &str, fallback: u64| {
                    values
                        .get(key)
                        .and_then(|value| value.parse().ok())
                        .unwrap_or(fallback)
                };
                let decimal = |key: &str, fallback: f64| {
                    values
                        .get(key)
                        .and_then(|value| value.parse().ok())
                        .unwrap_or(fallback)
                };
                let enabled = |key: &str, fallback: bool| {
                    values
                        .get(key)
                        .map(|value| matches!(value.as_str(), "1" | "true" | "yes" | "on"))
                        .unwrap_or(fallback)
                };
                let memory = |key: &str, fallback: u64| {
                    values
                        .get(key)
                        .and_then(|value| value.trim_end_matches(['m', 'M']).parse().ok())
                        .unwrap_or(fallback)
                };
                let (
                    url_database_host,
                    url_database_port,
                    url_database_name,
                    url_database_user,
                    url_database_password,
                ) = database_fields(values.get("BOX_DATABASE_URL"));
                let database_mode = values.get("BOX_DATABASE_MODE").cloned().unwrap_or_else(|| {
                    if url_database_host.is_empty() {
                        "managed".into()
                    } else {
                        "external".into()
                    }
                });
                let redis_mode = values.get("BOX_REDIS_MODE").cloned().unwrap_or_else(|| {
                    if values
                        .get("REDIS_HOST")
                        .is_some_and(|value| !value.is_empty())
                    {
                        "external".into()
                    } else {
                        "disabled".into()
                    }
                });
                Ok(json!({
                    "databaseMode": database_mode,
                    "databaseHost": values.get("BOX_DATABASE_HOST").cloned().unwrap_or(url_database_host),
                    "databasePort": values.get("BOX_DATABASE_PORT").cloned().unwrap_or(url_database_port),
                    "databaseName": values.get("BOX_DATABASE_NAME").cloned().unwrap_or(url_database_name),
                    "databaseUser": values.get("BOX_DATABASE_USER").cloned().unwrap_or(url_database_user),
                    "databaseSsl": enabled("BOX_DATABASE_SSL", false),
                    "hasDatabasePassword": values.get("BOX_DATABASE_PASSWORD").is_some_and(|value| !value.is_empty()) || !url_database_password.is_empty(),
                    "hasPermissionTokenSecret": values.get("PERMISSION_TOKEN_SECRET").is_some_and(|value| value.len() >= 16),
                    "hasPlayerAuthApiKey": values.get("BOX_PLAYER_AUTH_API_KEY").is_some_and(|value| value.len() >= 16),
                    "hasPlayAdminToken": values.get("BOX_PLAY_ADMIN_TOKEN").is_some_and(|value| value.len() >= 16),
                    "redisMode": redis_mode,
                    "redisHost": values.get("REDIS_HOST").cloned().unwrap_or_default(),
                    "redisPort": values.get("REDIS_PORT").cloned().unwrap_or_else(|| "6379".into()),
                    "hasRedisPassword": values.get("REDIS_PASSWORD").is_some_and(|value| !value.is_empty()),
                    "redisDb": number("REDIS_DB", 0),
                    "storageCacheRedisDb": number("STORAGE_CACHE_REDIS_DB", 1),
                    "databasePoolSize": number("BOX_DATABASE_POOL_SIZE", 4),
                    "storageCacheRedisTtl": number("STORAGE_CACHE_REDIS_TTL", 240),
                    "autoBackupEnabled": enabled("BOX_AUTO_BACKUP_ENABLED", false),
                    "autoBackupIntervalMinutes": number("BOX_AUTO_BACKUP_INTERVAL_MINUTES", 60),
                    "autoBackupRetentionCount": number("BOX_AUTO_BACKUP_RETENTION_COUNT", 24),
                    "autoBackupRetentionDays": number("BOX_AUTO_BACKUP_RETENTION_DAYS", 30),
                    "publicHost": values.get("BOX_PLAY_PUBLIC_HOST").cloned().unwrap_or_else(|| url_host(values.get("BOX_PLAY_PUBLIC_URL"), "127.0.0.1")),
                    "playNetworkMode": values.get("BOX_PLAY_NETWORK_MODE").cloned().unwrap_or_else(|| "local".into()),
                    "creatorNetworkMode": values.get("BOX_CREATOR_NETWORK_MODE").cloned().unwrap_or_else(|| "local".into()),
                    "creatorHost": values.get("BOX_CREATOR_HOST").cloned().unwrap_or_else(|| url_host(values.get("BOX_CREATOR_PUBLIC_URL"), "127.0.0.1")),
                    "lanIp": "",
                    "playPort": number("BOX_PLAY_PORT", 3121),
                    "voxaPort": number("BOX_VOXA_PORT", 3123),
                    "creatorPort": number("BOX_CREATOR_PORT", 3127),
                    "playerServicePort": number("BOX_PLAYER_SERVICE_PORT", 3124),
                    "authPortalPort": number("BOX_AUTH_PORTAL_PORT", 3125),
                    "playRuntimes": number("BOX_PLAY_MAX_RUNTIMES", 8),
                    "creatorEditRuntimes": number("BOX_CREATOR_EDIT_MAX_RUNTIMES", 6),
                    "creatorPlayRuntimes": number("BOX_CREATOR_PLAY_MAX_RUNTIMES", 4),
                    "creatorEditPrewarmRuntimes": number("BOX_CREATOR_EDIT_PREWARM_RUNTIMES", 0),
                    "playPrewarmRuntimes": number("BOX_PLAY_PREWARM_RUNTIMES", 0),
                    "playerLimit": number("BOX_LOCAL_PLAYER_LIMIT", 8),
                    "scriptMemoryMb": number("BOX_SCRIPT_MEMORY_MB", 512),
                    "runtimeIdleMinutes": number("BOX_RUNTIME_IDLE_TIMEOUT_MS", 900000) / 60000,
                    "runtimeStartTimeoutMinutes": number("BOX_RUNTIME_START_TIMEOUT_MS", 1800000) / 60000,
                    "teleportMaxRooms": number("BOX_TELEPORT_MAX_ROOMS", 64),
                    "teleportRoomIdleMinutes": number("BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS", 900000) / 60000,
                    "registrationEnabled": enabled("BOX_PLAYER_REGISTRATION_ENABLED", true),
                    "libraryManagementEnabled": !enabled("BOX_PLAY_LIBRARY_READ_ONLY", false),
                    "playerServiceMemoryMb": memory("BOX_PLAYER_SERVICE_MEMORY_LIMIT", 1024),
                    "playerServiceCpuLimit": decimal("BOX_PLAYER_SERVICE_CPU_LIMIT", 1.0),
                    "authPortalMemoryMb": memory("BOX_AUTH_PORTAL_MEMORY_LIMIT", 128),
                    "authPortalCpuLimit": decimal("BOX_AUTH_PORTAL_CPU_LIMIT", 0.5),
                    "creatorMemoryMb": memory("BOX_CREATOR_MEMORY_LIMIT", 6144),
                    "creatorCpuLimit": decimal("BOX_CREATOR_CPU_LIMIT", 4.0),
                    "playMemoryMb": memory("BOX_PLAY_MEMORY_LIMIT", 4096),
                    "playCpuLimit": decimal("BOX_PLAY_CPU_LIMIT", 4.0)
                }))
            }
            "get_managed_service_info" => managed_service_info(
                &app,
                req.body
                    .get("service")
                    .and_then(Value::as_str)
                    .ok_or("内置服务名称无效")?,
            ),
            "has_managed_database_image" => {
                let values = parse_env(&fs::read_to_string(env_path(&app)).unwrap_or_default());
                Ok(json!(docker(&[
                    "image",
                    "inspect",
                    &managed_image(&values, "postgresql")?
                ])
                .is_ok()))
            }
            "prepare_managed_database" => {
                prepare_managed_service(&app, "postgresql")?;
                Ok(Value::Null)
            }
            "has_managed_redis_image" => {
                let values = parse_env(&fs::read_to_string(env_path(&app)).unwrap_or_default());
                Ok(json!(docker(&[
                    "image",
                    "inspect",
                    &managed_image(&values, "redis")?
                ])
                .is_ok()))
            }
            "prepare_managed_redis" => {
                prepare_managed_service(&app, "redis")?;
                Ok(Value::Null)
            }
            "start_managed_service" => {
                start_managed_service(
                    &app,
                    req.body
                        .get("service")
                        .and_then(Value::as_str)
                        .ok_or("内置服务名称无效")?,
                )?;
                Ok(Value::Null)
            }
            "get_legal_notices" => Ok(json!({
                "licenseName": "BOX3 Engine 本地部署用户许可协议",
                "licenseText": LEGAL_NOTICE
            })),
            "get_docker_check" => Ok({
                let (ready, version, message) = docker_check();
                json!({"cliAvailable":ready || !message.contains("无法运行 Docker"),"cliVersion":version,"engineReady":ready,"message":if ready{"Docker 已连接"}else{&message}})
            }),
            "get_owner_secrets" => {
                let values = parse_env(
                    &fs::read_to_string(env_path(&app)).map_err(|error| error.to_string())?,
                );
                let secret = |key: &str| {
                    values
                        .get(key)
                        .filter(|value| value.len() >= 16)
                        .cloned()
                        .ok_or("服主密钥尚未生成，请先保存一次配置")
                };
                Ok(json!({
                    "permissionTokenSecret": secret("PERMISSION_TOKEN_SECRET")?,
                    "playerAuthApiKey": secret("BOX_PLAYER_AUTH_API_KEY")?,
                    "playAdminToken": secret("BOX_PLAY_ADMIN_TOKEN")?
                }))
            }
            "get_project_runtime_status" => Ok(runtime_catalog(&app)),
            "destroy_project_runtime" => {
                let project = req
                    .body
                    .get("projectId")
                    .and_then(Value::as_str)
                    .ok_or("作品 ID 无效")?;
                let mode = req
                    .body
                    .get("mode")
                    .and_then(Value::as_str)
                    .ok_or("运行端类型无效")?;
                let room = req.body.get("roomId").and_then(Value::as_str);
                destroy_runtime(project, mode, room)?;
                Ok(Value::Null)
            }
            "get_performance_status" => performance(&app),
            "export_diagnostics" => Ok(json!(export_diagnostics(&app)?)),
            "test_remote_connection" => test_connection(&app, &req.body),
            "list_backups" => list_backups(&app),
            "create_backup" => Ok(json!(create_backup(&app)?)),
            "delete_backup" => {
                let archive = req
                    .body
                    .get("archive")
                    .and_then(Value::as_str)
                    .ok_or("备份文件名无效")?;
                let path = backup_file(&app, archive)?;
                if !path.is_file() {
                    return Err("备份不存在".into());
                };
                fs::remove_file(path).map_err(|error| error.to_string())?;
                Ok(Value::Null)
            }
            "restore_backup" => {
                let archive = req
                    .body
                    .get("archive")
                    .and_then(Value::as_str)
                    .ok_or("备份文件名无效")?;
                restore_backup(&app, archive)?;
                Ok(Value::Null)
            }
            "save_configuration_command" => {
                let config = req
                    .body
                    .get("config")
                    .and_then(Value::as_object)
                    .ok_or("配置格式无效")?;
                let mut source =
                    fs::read_to_string(env_path(&app)).map_err(|error| error.to_string())?;
                let existing = parse_env(&source);
                let database_mode = config
                    .get("databaseMode")
                    .and_then(Value::as_str)
                    .unwrap_or("external");
                let redis_mode = config
                    .get("redisMode")
                    .and_then(Value::as_str)
                    .unwrap_or("disabled");
                if !["managed", "external"].contains(&database_mode) {
                    return Err("数据库模式无效".into());
                }
                if !["disabled", "managed", "external"].contains(&redis_mode) {
                    return Err("Redis 模式无效".into());
                }
                source = set_env(source, "BOX_DATABASE_MODE", database_mode);
                source = set_env(source, "BOX_REDIS_MODE", redis_mode);
                for (input, key) in [
                    ("playPort", "BOX_PLAY_PORT"),
                    ("creatorPort", "BOX_CREATOR_PORT"),
                    ("voxaPort", "BOX_VOXA_PORT"),
                    ("playerServicePort", "BOX_PLAYER_SERVICE_PORT"),
                    ("authPortalPort", "BOX_AUTH_PORTAL_PORT"),
                ] {
                    if let Some(value) = config.get(input) {
                        source = set_env(source, key, &port(value, input)?);
                    }
                }
                for (input, key) in [
                    ("redisHost", "REDIS_HOST"),
                    ("redisPort", "REDIS_PORT"),
                    ("redisDb", "REDIS_DB"),
                    ("storageCacheRedisDb", "STORAGE_CACHE_REDIS_DB"),
                    ("storageCacheRedisTtl", "STORAGE_CACHE_REDIS_TTL"),
                    ("databasePoolSize", "BOX_DATABASE_POOL_SIZE"),
                    ("publicHost", "BOX_PLAY_PUBLIC_HOST"),
                    ("playNetworkMode", "BOX_PLAY_NETWORK_MODE"),
                    ("creatorHost", "BOX_CREATOR_HOST"),
                    ("creatorNetworkMode", "BOX_CREATOR_NETWORK_MODE"),
                    ("creatorEditRuntimes", "BOX_CREATOR_EDIT_MAX_RUNTIMES"),
                    ("creatorPlayRuntimes", "BOX_CREATOR_PLAY_MAX_RUNTIMES"),
                    (
                        "creatorEditPrewarmRuntimes",
                        "BOX_CREATOR_EDIT_PREWARM_RUNTIMES",
                    ),
                    ("playRuntimes", "BOX_PLAY_MAX_RUNTIMES"),
                    ("playPrewarmRuntimes", "BOX_PLAY_PREWARM_RUNTIMES"),
                    ("playerLimit", "BOX_LOCAL_PLAYER_LIMIT"),
                    ("teleportMaxRooms", "BOX_TELEPORT_MAX_ROOMS"),
                    ("scriptMemoryMb", "BOX_SCRIPT_MEMORY_MB"),
                    (
                        "autoBackupIntervalMinutes",
                        "BOX_AUTO_BACKUP_INTERVAL_MINUTES",
                    ),
                    (
                        "autoBackupRetentionCount",
                        "BOX_AUTO_BACKUP_RETENTION_COUNT",
                    ),
                    ("autoBackupRetentionDays", "BOX_AUTO_BACKUP_RETENTION_DAYS"),
                ] {
                    if let Some(value) = config.get(input) {
                        source = set_env(source, key, &json_value(value)?);
                    }
                }
                for (input, key) in [
                    ("runtimeIdleMinutes", "BOX_RUNTIME_IDLE_TIMEOUT_MS"),
                    ("runtimeStartTimeoutMinutes", "BOX_RUNTIME_START_TIMEOUT_MS"),
                    (
                        "teleportRoomIdleMinutes",
                        "BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS",
                    ),
                ] {
                    if let Some(value) = config.get(input) {
                        let minutes = json_value(value)?
                            .parse::<u64>()
                            .map_err(|_| format!("{input} 必须是有效分钟数"))?;
                        if minutes == 0 {
                            return Err(format!("{input} 必须大于 0"));
                        }
                        source = set_env(source, key, &minutes.saturating_mul(60_000).to_string());
                    }
                }
                for (input, key) in [
                    ("playerServiceMemoryMb", "BOX_PLAYER_SERVICE_MEMORY_LIMIT"),
                    ("authPortalMemoryMb", "BOX_AUTH_PORTAL_MEMORY_LIMIT"),
                    ("creatorMemoryMb", "BOX_CREATOR_MEMORY_LIMIT"),
                    ("playMemoryMb", "BOX_PLAY_MEMORY_LIMIT"),
                ] {
                    if let Some(value) = config.get(input) {
                        source = set_env(source, key, &format!("{}m", json_value(value)?));
                    }
                }
                for (input, key) in [
                    ("playerServiceCpuLimit", "BOX_PLAYER_SERVICE_CPU_LIMIT"),
                    ("authPortalCpuLimit", "BOX_AUTH_PORTAL_CPU_LIMIT"),
                    ("creatorCpuLimit", "BOX_CREATOR_CPU_LIMIT"),
                    ("playCpuLimit", "BOX_PLAY_CPU_LIMIT"),
                ] {
                    if let Some(value) = config.get(input) {
                        source = set_env(source, key, &json_value(value)?);
                    }
                }
                for (input, key, inverted) in [
                    ("databaseSsl", "BOX_DATABASE_SSL", false),
                    ("autoBackupEnabled", "BOX_AUTO_BACKUP_ENABLED", false),
                    (
                        "registrationEnabled",
                        "BOX_PLAYER_REGISTRATION_ENABLED",
                        false,
                    ),
                    (
                        "libraryManagementEnabled",
                        "BOX_PLAY_LIBRARY_READ_ONLY",
                        true,
                    ),
                ] {
                    if let Some(value) = config.get(input).and_then(Value::as_bool) {
                        source =
                            set_env(source, key, if value ^ inverted { "true" } else { "false" });
                    }
                }
                for (input, key) in [
                    ("databasePassword", "BOX_DATABASE_PASSWORD"),
                    ("redisPassword", "REDIS_PASSWORD"),
                    ("permissionTokenSecret", "PERMISSION_TOKEN_SECRET"),
                    ("playerAuthApiKey", "BOX_PLAYER_AUTH_API_KEY"),
                    ("playAdminToken", "BOX_PLAY_ADMIN_TOKEN"),
                ] {
                    if let Some(value) = config
                        .get(input)
                        .and_then(Value::as_str)
                        .filter(|value| !value.is_empty())
                    {
                        source = set_env(source, key, value);
                    }
                }
                if database_mode == "managed" {
                    let database = existing
                        .get("BOX_MANAGED_POSTGRES_DATABASE")
                        .cloned()
                        .unwrap_or_else(|| format!("box_db_{}", random_hex(8)));
                    let user = existing
                        .get("BOX_MANAGED_POSTGRES_USER")
                        .cloned()
                        .unwrap_or_else(|| format!("box_user_{}", random_hex(8)));
                    let password = existing
                        .get("BOX_MANAGED_POSTGRES_PASSWORD")
                        .cloned()
                        .filter(|value| !value.is_empty())
                        .unwrap_or_else(|| random_hex(32));
                    source = set_env(source, "BOX_DATABASE_HOST", "managed-postgres");
                    source = set_env(source, "BOX_DATABASE_PORT", "5432");
                    source = set_env(source, "BOX_DATABASE_NAME", &database);
                    source = set_env(source, "BOX_DATABASE_USER", &user);
                    source = set_env(source, "BOX_DATABASE_PASSWORD", &password);
                    source = set_env(source, "BOX_MANAGED_POSTGRES_DATABASE", &database);
                    source = set_env(source, "BOX_MANAGED_POSTGRES_USER", &user);
                    source = set_env(source, "BOX_MANAGED_POSTGRES_PASSWORD", &password);
                    source = set_env(
                        source,
                        "BOX_DATABASE_URL",
                        &format!(
                            "postgres://{}:{}@managed-postgres:5432/{}",
                            urlencoding::encode(&user),
                            urlencoding::encode(&password),
                            urlencoding::encode(&database)
                        ),
                    );
                    source = set_env(source, "BOX_DATABASE_SSL", "false");
                } else if let Some(host) = config.get("databaseHost") {
                    let host = json_value(host)?;
                    if host.is_empty() {
                        source = set_env(source, "BOX_DATABASE_URL", "");
                    } else {
                        let existing = parse_env(&source);
                        let (_, old_port, old_name, old_user, old_password) =
                            database_fields(existing.get("BOX_DATABASE_URL"));
                        let database_port = config
                            .get("databasePort")
                            .map(|value| port(value, "数据库端口"))
                            .transpose()?
                            .unwrap_or(old_port);
                        let database_name = config
                            .get("databaseName")
                            .map(json_value)
                            .transpose()?
                            .unwrap_or(old_name);
                        let database_user = config
                            .get("databaseUser")
                            .map(json_value)
                            .transpose()?
                            .unwrap_or(old_user);
                        let database_password = config
                            .get("databasePassword")
                            .and_then(Value::as_str)
                            .filter(|value| !value.is_empty())
                            .map(str::to_string)
                            .or_else(|| existing.get("BOX_DATABASE_PASSWORD").cloned())
                            .unwrap_or(old_password);
                        let authority = if database_user.is_empty() {
                            host.clone()
                        } else {
                            format!(
                                "{}:{}@{}",
                                urlencoding::encode(&database_user),
                                urlencoding::encode(&database_password),
                                host
                            )
                        };
                        source = set_env(source, "BOX_DATABASE_HOST", &host);
                        source = set_env(source, "BOX_DATABASE_PORT", &database_port);
                        source = set_env(source, "BOX_DATABASE_NAME", &database_name);
                        source = set_env(source, "BOX_DATABASE_USER", &database_user);
                        source = set_env(source, "BOX_DATABASE_PASSWORD", &database_password);
                        source = set_env(
                            source,
                            "BOX_DATABASE_URL",
                            &format!(
                                "postgres://{authority}:{database_port}/{}",
                                urlencoding::encode(&database_name)
                            ),
                        );
                    }
                }
                if redis_mode == "managed" {
                    let password = existing
                        .get("BOX_MANAGED_REDIS_PASSWORD")
                        .cloned()
                        .filter(|value| !value.is_empty())
                        .unwrap_or_else(|| random_hex(32));
                    source = set_env(source, "REDIS_HOST", "managed-redis");
                    source = set_env(source, "REDIS_PORT", "6379");
                    source = set_env(source, "REDIS_PASSWORD", &password);
                    source = set_env(source, "BOX_MANAGED_REDIS_PASSWORD", &password);
                    source = set_env(source, "REDIS_DB", "0");
                    source = set_env(source, "STORAGE_CACHE_REDIS_DB", "1");
                    source = set_env(source, "STORAGE_CACHE_REDIS_TTL", "240");
                } else if redis_mode == "disabled" {
                    source = set_env(source, "REDIS_HOST", "");
                    source = set_env(source, "REDIS_PASSWORD", "");
                }
                if let Some(host) = config.get("publicHost") {
                    let host = json_value(host)?;
                    let port = config
                        .get("playPort")
                        .map(|value| port(value, "Play 端口"))
                        .transpose()?
                        .unwrap_or_else(|| "3121".into());
                    source = set_env(
                        source,
                        "BOX_PLAY_PUBLIC_URL",
                        &format!("http://{host}:{port}"),
                    );
                    let bind =
                        if config.get("playNetworkMode").and_then(Value::as_str) == Some("local") {
                            "127.0.0.1"
                        } else {
                            "0.0.0.0"
                        };
                    source = set_env(source, "BOX_BIND_IP", bind);
                }
                if let Some(host) = config.get("creatorHost") {
                    let host = json_value(host)?;
                    let port = config
                        .get("creatorPort")
                        .map(|value| port(value, "Creator 端口"))
                        .transpose()?
                        .unwrap_or_else(|| "3127".into());
                    source = set_env(
                        source,
                        "BOX_CREATOR_PUBLIC_URL",
                        &format!("http://{host}:{port}"),
                    );
                    let bind = if config.get("creatorNetworkMode").and_then(Value::as_str)
                        == Some("local")
                    {
                        "127.0.0.1"
                    } else {
                        "0.0.0.0"
                    };
                    source = set_env(source, "BOX_CREATOR_BIND_IP", bind);
                    source = set_env(source, "BOX_VOXA_BIND_IP", bind);
                }
                if let Some(value) = config.get("registrationEnabled").and_then(Value::as_bool) {
                    source = set_env(
                        source,
                        "BOX_PLAYER_REGISTRATION_ENABLED",
                        if value { "true" } else { "false" },
                    );
                }
                if let Some(value) = config
                    .get("libraryManagementEnabled")
                    .and_then(Value::as_bool)
                {
                    source = set_env(
                        source,
                        "BOX_PLAY_LIBRARY_READ_ONLY",
                        if value { "false" } else { "true" },
                    );
                }
                private(&env_path(&app), &source)?;
                Ok(Value::Null)
            }
            "start_services" => {
                if !license(&app, None)?
                    .get("valid")
                    .and_then(Value::as_bool)
                    .unwrap_or(false)
                {
                    return Err("请先安装有效许可证".into());
                }
                let values = parse_env(&fs::read_to_string(env_path(&app)).unwrap_or_default());
                if values
                    .get("BOX_DATABASE_MODE")
                    .is_some_and(|mode| mode == "managed")
                {
                    start_managed_service(&app, "postgresql")?;
                }
                if values
                    .get("BOX_REDIS_MODE")
                    .is_some_and(|mode| mode == "managed")
                {
                    start_managed_service(&app, "redis")?;
                }
                let scope = req
                    .body
                    .get("scope")
                    .and_then(Value::as_str)
                    .ok_or("启动范围无效")?;
                let targets: &[&str] = match scope {
                    "all" => &SERVICES,
                    "creator" => &["creator", "voxa", "player-service", "player-auth-portal"],
                    "play" => &["play", "player-service", "player-auth-portal"],
                    _ => return Err("启动范围无效".into()),
                };
                let mut arguments = vec!["up", "-d", "--no-build", "--remove-orphans"];
                arguments.extend_from_slice(targets);
                compose(&app, &arguments)?;
                Ok(Value::Null)
            }
            "get_system_status" => {
                let env = parse_env(&fs::read_to_string(env_path(&app)).unwrap_or_default());
                let (docker_ready, docker_version, docker_message) = docker_check();
                let text = if docker_ready {
                    compose(&app, &["ps", "--all", "--format", "json"]).unwrap_or_default()
                } else {
                    String::new()
                };
                let rows: Vec<Value> = text
                    .lines()
                    .filter_map(|l| serde_json::from_str(l).ok())
                    .collect();
                let mut services=SERVICES.iter().map(|name|{let row=rows.iter().find(|row|row.get("Service").and_then(Value::as_str)==Some(name));let state=row.and_then(|row|row.get("State")).and_then(Value::as_str).unwrap_or("stopped").to_lowercase();json!({"name":name,"enabled":env.get("COMPOSE_PROFILES").map(|profiles|profiles.split(',').any(|profile|profile==if *name=="player-auth-portal"{"auth-portal"}else{name})).unwrap_or(false),"running":state=="running","state":state})}).collect::<Vec<_>>();
                for (name, mode_key) in [
                    ("managed-postgres", "BOX_DATABASE_MODE"),
                    ("managed-redis", "BOX_REDIS_MODE"),
                ] {
                    let row = rows
                        .iter()
                        .find(|row| row.get("Service").and_then(Value::as_str) == Some(name));
                    let state = row
                        .and_then(|row| row.get("State"))
                        .and_then(Value::as_str)
                        .unwrap_or("stopped")
                        .to_lowercase();
                    services.push(json!({"name":name,"enabled":env.get(mode_key).is_some_and(|mode|mode=="managed"),"running":state=="running","state":state}));
                }
                Ok(
                    json!({"dockerReady":docker_ready,"dockerCliAvailable":docker_ready || !docker_message.contains("无法运行 Docker"),"dockerCliVersion":docker_version,"dockerMessage":docker_message,"configured":env_path(&app).is_file(),"allHealthy":services.iter().filter(|service|service.get("enabled").and_then(Value::as_bool).unwrap_or(false)).all(|service|service.get("running").and_then(Value::as_bool).unwrap_or(false)),"services":services,"dataDirectory":app.root}),
                )
            }
            "control_service" => {
                let a = req
                    .body
                    .get("action")
                    .and_then(Value::as_str)
                    .ok_or("操作名称无效")?;
                let s = req
                    .body
                    .get("service")
                    .and_then(Value::as_str)
                    .ok_or("服务名称无效")?;
                let managed = ["managed-postgres", "managed-redis"].contains(&s);
                if (!SERVICES.contains(&s) && !managed)
                    || !["start", "stop", "restart"].contains(&a)
                {
                    return Err("操作名称或服务名称无效".into());
                }
                if !managed
                    && a != "stop"
                    && !license(&app, None)?
                        .get("valid")
                        .and_then(Value::as_bool)
                        .unwrap_or(false)
                {
                    return Err("请先安装有效许可证".into());
                }
                if a == "start" {
                    compose(&app, &["up", "-d", "--wait", s])?;
                } else {
                    compose(&app, &[a, s])?;
                }
                Ok(Value::Null)
            }
            "stop_services" => {
                compose(
                    &app,
                    &[
                        "stop",
                        "creator",
                        "voxa",
                        "play",
                        "player-service",
                        "player-auth-portal",
                        "managed-postgres",
                        "managed-redis",
                    ],
                )?;
                Ok(Value::Null)
            }
            "get_about_info" => Ok(json!({
                "applicationVersion": option_env!("BOX_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")),
                "imageTag": env::var("BOX_IMAGE_TAG").unwrap_or_default(),
                "sourceRevision": option_env!("BOX_BUILD_COMMIT").unwrap_or("unknown"),
                "buildCreatedAt": option_env!("BOX_BUILD_DATE").unwrap_or("unknown"),
                "buildSource": option_env!("BOX_BUILD_SOURCE").unwrap_or("local"),
                "platform": "linux",
                "architecture": env::consts::ARCH,
                "license": "本地部署用户许可协议（非开源、非商业）",
                "serviceImages": service_images()
            })),
            _ => Err(format!("暂不支持命令 {name}")),
        }
    })
    .await
    .unwrap_or_else(|error| Err(format!("管理命令异常结束：{error}")));
    match answer {
        Ok(result) => Json(json!({"result":result})).into_response(),
        Err(e) => fail(e),
    }
}
#[tokio::main]
async fn main() {
    let root = env::var("BOX_SERVER_MANAGER_ROOT").unwrap_or_else(|_| "/workspace".into());
    let root_path = PathBuf::from(&root);
    let token = env::var("BOX_SERVER_MANAGER_TOKEN").expect("BOX_SERVER_MANAGER_TOKEN is required");
    assert!(
        token.len() >= 32,
        "BOX_SERVER_MANAGER_TOKEN must be at least 32 characters"
    );
    let app = Arc::new(App {
        root: root_path.clone(),
        token,
        compose_file: env::var("BOX_SERVER_MANAGER_COMPOSE_FILE")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_path.join("compose.yml")),
        environment_file: env::var("BOX_SERVER_MANAGER_ENV_FILE")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_path.join(".env")),
    });
    let router = Router::new()
        .route("/", get(index))
        .route("/api/health", get(health))
        .route("/api/backups/upload", post(upload_backup))
        .route("/api/backups/{archive}/download", get(download_backup))
        .route(
            "/api/diagnostics/{archive}/download",
            get(download_diagnostics),
        )
        .route("/api/commands/{name}", post(command))
        .layer(DefaultBodyLimit::max(512 * 1024 * 1024))
        .fallback_service(ServeDir::new("/app/public").append_index_html_on_directories(true))
        .layer(middleware::from_fn(security))
        .with_state(app);
    let host = env::var("BOX_SERVER_MANAGER_HOST")
        .unwrap_or_else(|_| "0.0.0.0".into())
        .parse()
        .expect("BOX_SERVER_MANAGER_HOST must be an IP address");
    let port = env::var("BOX_SERVER_MANAGER_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(3130);
    let addr = SocketAddr::new(host, port);
    println!("BOX3 Rust server manager listening on {addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), router)
        .await
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn environment_replacement_is_key_scoped_and_keeps_a_final_newline() {
        let output = set_env(
            "BOX_PLAY_PORT=3121\nOTHER=value\n".into(),
            "BOX_PLAY_PORT",
            "4000",
        );
        assert_eq!(output, "BOX_PLAY_PORT=4000\nOTHER=value\n");
        assert_eq!(
            set_env(output, "NEW_VALUE", "yes"),
            "BOX_PLAY_PORT=4000\nOTHER=value\nNEW_VALUE=yes\n"
        );
    }

    #[test]
    fn backup_file_rejects_paths_and_non_archives() {
        let app = App {
            root: PathBuf::from("/workspace"),
            token: "x".repeat(32),
            compose_file: PathBuf::from("/workspace/compose.yml"),
            environment_file: PathBuf::from("/workspace/.env"),
        };
        assert!(backup_file(&app, "../../.env").is_err());
        assert!(backup_file(&app, "backup.zip").is_err());
        assert_eq!(
            backup_file(&app, "backup.tar.gz").unwrap(),
            PathBuf::from("/workspace/apps/local-engine/backups/backup.tar.gz")
        );
    }

    #[test]
    fn port_validation_rejects_out_of_range_values() {
        assert_eq!(port(&json!(3130), "port").unwrap(), "3130");
        assert!(port(&json!(0), "port").is_err());
        assert!(port(&json!(65536), "port").is_err());
        assert!(port(&json!("10\nEVIL=1"), "port").is_err());
    }

    #[test]
    fn database_url_fields_round_trip_common_postgres_urls() {
        let url =
            "postgres://box%20user:secret%21@db.example:5444/box_data?sslmode=require".to_string();
        assert_eq!(
            database_fields(Some(&url)),
            (
                "db.example".into(),
                "5444".into(),
                "box_data".into(),
                "box user".into(),
                "secret!".into()
            )
        );
        assert_eq!(
            database_fields(None),
            ("".into(), "5432".into(), "box".into(), "".into(), "".into())
        );
    }

    #[test]
    fn runtime_catalog_returns_empty_collections_for_empty_deployment_data() {
        let root = std::env::temp_dir().join(format!("box-runtime-catalog-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let app = App {
            root: root.clone(),
            token: "x".repeat(32),
            compose_file: root.join("compose.yml"),
            environment_file: root.join(".env"),
        };
        assert_eq!(runtime_catalog(&app), json!({"creator":[],"play":[]}));
        let _ = fs::remove_dir_all(root);
    }
}
