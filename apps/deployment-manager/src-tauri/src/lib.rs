use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    net::{TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Command, Output},
    time::Duration,
};
use tauri::{AppHandle, Emitter, Manager};

const COMPOSE_TEMPLATE: &str = include_str!("../../../../docker-compose.yml");
const ENV_TEMPLATE: &str = include_str!("../defaults.env");
const PROJECT_NAME: &str = "box-local-engine";
const IMAGE_TAG: &str = match option_env!("BOX_MANAGER_IMAGE_TAG") {
    Some(value) => value,
    None => "0.1.0",
};
const SERVICE_NAMES: [&str; 5] = [
    "creator",
    "play",
    "player-service",
    "player-auth-portal",
    "voxa",
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceStatus {
    name: String,
    enabled: bool,
    running: bool,
    state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SystemStatus {
    docker_ready: bool,
    docker_message: String,
    configured: bool,
    all_healthy: bool,
    services: Vec<ServiceStatus>,
    data_directory: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallProgress {
    stage: String,
    message: String,
    percent: u8,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallConfigView {
    database_host: String,
    database_port: String,
    database_name: String,
    database_user: String,
    database_ssl: bool,
    has_database_password: bool,
    redis_host: String,
    redis_port: String,
    has_redis_password: bool,
    redis_db: u8,
    storage_cache_redis_db: u8,
    bind_ip: String,
    public_host: String,
    play_runtimes: u32,
    creator_edit_runtimes: u32,
    creator_play_runtimes: u32,
}

impl Default for InstallConfigView {
    fn default() -> Self {
        Self {
            database_host: String::new(),
            database_port: "5432".into(),
            database_name: "box".into(),
            database_user: "box".into(),
            database_ssl: false,
            has_database_password: false,
            redis_host: String::new(),
            redis_port: "6379".into(),
            has_redis_password: false,
            redis_db: 0,
            storage_cache_redis_db: 1,
            bind_ip: "127.0.0.1".into(),
            public_host: "127.0.0.1".into(),
            play_runtimes: 8,
            creator_edit_runtimes: 6,
            creator_play_runtimes: 4,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallConfigInput {
    #[serde(default)]
    database_host: String,
    #[serde(default = "default_database_port")]
    database_port: String,
    #[serde(default = "default_database_name")]
    database_name: String,
    #[serde(default = "default_database_user")]
    database_user: String,
    #[serde(default)]
    database_password: String,
    #[serde(default)]
    database_ssl: bool,
    #[serde(default)]
    redis_host: String,
    #[serde(default = "default_redis_port")]
    redis_port: String,
    #[serde(default)]
    redis_password: String,
    #[serde(default)]
    redis_db: u8,
    #[serde(default = "default_storage_cache_redis_db")]
    storage_cache_redis_db: u8,
    #[serde(default = "default_bind_ip")]
    bind_ip: String,
    #[serde(default = "default_public_host")]
    public_host: String,
    #[serde(default = "default_play_runtimes")]
    play_runtimes: u32,
    #[serde(default = "default_creator_edit_runtimes")]
    creator_edit_runtimes: u32,
    #[serde(default = "default_creator_play_runtimes")]
    creator_play_runtimes: u32,
}

fn default_database_port() -> String {
    "5432".into()
}
fn default_database_name() -> String {
    "box".into()
}
fn default_database_user() -> String {
    "box".into()
}
fn default_redis_port() -> String {
    "6379".into()
}
fn default_storage_cache_redis_db() -> u8 {
    1
}
fn default_bind_ip() -> String {
    "127.0.0.1".into()
}
fn default_public_host() -> String {
    "127.0.0.1".into()
}
fn default_play_runtimes() -> u32 {
    8
}
fn default_creator_edit_runtimes() -> u32 {
    6
}
fn default_creator_play_runtimes() -> u32 {
    4
}

fn runtime_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法确定应用数据目录：{error}"))?
        .join("runtime");
    fs::create_dir_all(&root).map_err(|error| format!("无法创建应用数据目录：{error}"))?;
    Ok(root)
}

fn env_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join(".env"))
}
fn compose_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join("docker-compose.yml"))
}

fn ensure_runtime_files(app: &AppHandle) -> Result<(), String> {
    let root = runtime_root(app)?;
    let compose = root.join("docker-compose.yml");
    if !compose.exists() || fs::read_to_string(&compose).ok().as_deref() != Some(COMPOSE_TEMPLATE) {
        fs::write(&compose, COMPOSE_TEMPLATE)
            .map_err(|error| format!("无法写入 Docker Compose 配置：{error}"))?;
    }
    for directory in [
        "apps/local-engine/projects",
        "apps/local-engine/dist",
        "apps/local-engine/backups",
        "apps/local-engine/play-worlds",
        "apps/voxa/data",
    ] {
        fs::create_dir_all(root.join(directory))
            .map_err(|error| format!("无法创建数据目录 {directory}：{error}"))?;
    }
    Ok(())
}

fn parse_env(content: &str) -> BTreeMap<String, String> {
    content
        .lines()
        .filter_map(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return None;
            }
            let (key, value) = line.split_once('=')?;
            Some((key.trim().to_string(), value.trim().to_string()))
        })
        .collect()
}

fn set_env(content: &mut String, key: &str, value: &str) -> Result<(), String> {
    if value.contains(['\r', '\n']) {
        return Err(format!("配置项 {key} 不能包含换行符"));
    }
    let replacement = format!("{key}={value}");
    let mut found = false;
    let mut lines = Vec::new();
    for line in content.lines() {
        if line.trim_start().starts_with(&format!("{key}=")) {
            lines.push(replacement.clone());
            found = true;
        } else {
            lines.push(line.to_string());
        }
    }
    if !found {
        lines.push(replacement);
    }
    *content = format!("{}\n", lines.join("\n"));
    Ok(())
}

fn random_hex(bytes: usize) -> String {
    let mut data = vec![0_u8; bytes];
    OsRng.fill_bytes(&mut data);
    data.iter().map(|byte| format!("{byte:02x}")).collect()
}

#[cfg(target_os = "windows")]
fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

#[cfg(not(target_os = "windows"))]
fn hide_window(_command: &mut Command) {}

fn run_command(mut command: Command) -> Result<Output, String> {
    hide_window(&mut command);
    let rendered = format!("{command:?}");
    let output = command
        .output()
        .map_err(|error| format!("无法执行 {rendered}：{error}"))?;
    if output.status.success() {
        Ok(output)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

fn docker_output(args: &[&str]) -> Result<String, String> {
    let mut command = Command::new("docker");
    command.args(args);
    let output = run_command(command)?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn compose_output(app: &AppHandle, args: &[&str]) -> Result<String, String> {
    ensure_runtime_files(app)?;
    let root = runtime_root(app)?;
    let env = env_path(app)?;
    if !env.exists() {
        return Err("尚未完成安装配置".into());
    }
    let compose = compose_path(app)?;
    let mut command = Command::new("docker");
    command
        .current_dir(&root)
        .args(["compose", "--project-name", PROJECT_NAME, "--env-file"]);
    command.arg(env).arg("-f").arg(compose).args(args);
    let output = run_command(command)?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

fn emit_progress(app: &AppHandle, stage: &str, message: &str, percent: u8) {
    let _ = app.emit(
        "install-progress",
        InstallProgress {
            stage: stage.into(),
            message: message.into(),
            percent,
        },
    );
}

fn validate_host(value: &str, label: &str) -> Result<String, String> {
    let value = value.trim().trim_end_matches('/');
    if value.is_empty() || value.contains(['/', '@', ' ', '\\']) || value.starts_with("http") {
        return Err(format!("{label}无效，请只填写 IP 或域名"));
    }
    Ok(value.into())
}

fn validate_port(value: &str) -> Result<u16, String> {
    value
        .parse::<u16>()
        .map_err(|_| "数据库端口必须是 1-65535 之间的整数".into())
}

fn enabled_services(values: &BTreeMap<String, String>) -> Vec<&str> {
    let profiles = values
        .get("COMPOSE_PROFILES")
        .map(String::as_str)
        .unwrap_or("creator,play,voxa");
    SERVICE_NAMES
        .iter()
        .copied()
        .filter(|name| {
            let profile = match *name {
                "player-service" => "player-service",
                "player-auth-portal" => "auth-portal",
                other => other,
            };
            profiles.split(',').any(|value| value.trim() == profile)
        })
        .collect()
}

fn check_remote_endpoint(label: &str, host: &str, port: u16) -> Result<(), String> {
    let addresses = (host, port)
        .to_socket_addrs()
        .map_err(|error| format!("无法解析{label}地址 {host}:{port}：{error}"))?;
    let mut last_error = None;
    for address in addresses {
        match TcpStream::connect_timeout(&address, Duration::from_secs(5)) {
            Ok(_) => return Ok(()),
            Err(error) => last_error = Some(error),
        }
    }
    Err(format!(
        "无法连接{label} {host}:{port}：{}。请检查云安全组、防火墙和监听地址。",
        last_error
            .map(|error| error.to_string())
            .unwrap_or_else(|| "没有可用地址".into())
    ))
}

fn load_existing_env(app: &AppHandle) -> BTreeMap<String, String> {
    env_path(app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .map(|content| parse_env(&content))
        .unwrap_or_default()
}

fn save_configuration(app: &AppHandle, config: &InstallConfigInput) -> Result<(), String> {
    ensure_runtime_files(app)?;
    if config.play_runtimes == 0
        || config.creator_edit_runtimes == 0
        || config.creator_play_runtimes == 0
    {
        return Err("运行时数量必须大于 0".into());
    }
    let bind_ip = validate_host(&config.bind_ip, "监听地址")?;
    if bind_ip != "127.0.0.1" && bind_ip != "0.0.0.0" {
        return Err("监听地址仅支持 127.0.0.1 或 0.0.0.0".into());
    }
    let public_host = validate_host(&config.public_host, "公开访问地址")?;
    let existing = load_existing_env(app);
    let existing_file = env_path(app)?;
    let mut content = if existing_file.exists() {
        fs::read_to_string(&existing_file).map_err(|error| format!("无法读取现有配置：{error}"))?
    } else {
        ENV_TEMPLATE.to_string()
    };

    let secret = |name: &str| {
        existing
            .get(name)
            .filter(|value| value.len() >= 16)
            .cloned()
            .unwrap_or_else(|| random_hex(32))
    };
    set_env(
        &mut content,
        "PERMISSION_TOKEN_SECRET",
        &secret("PERMISSION_TOKEN_SECRET"),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_AUTH_API_KEY",
        &secret("BOX_PLAYER_AUTH_API_KEY"),
    )?;
    set_env(
        &mut content,
        "BOX_PLAY_ADMIN_TOKEN",
        &secret("BOX_PLAY_ADMIN_TOKEN"),
    )?;
    set_env(&mut content, "BOX_PLAY_LIBRARY_READ_ONLY", "false")?;
    set_env(&mut content, "BOX_IMAGE_TAG", IMAGE_TAG)?;
    set_env(&mut content, "BOX_PLAY_HOST_IP", &bind_ip)?;
    set_env(&mut content, "BOX_PLAYER_SERVICE_HOST_IP", &bind_ip)?;
    set_env(&mut content, "BOX_AUTH_PORTAL_HOST_IP", &bind_ip)?;
    set_env(
        &mut content,
        "BOX_PLAY_PUBLIC_URL",
        &format!("http://{public_host}:3000"),
    )?;
    set_env(&mut content, "BOX_VOXA_PUBLIC_URL", "http://127.0.0.1:3001")?;
    set_env(
        &mut content,
        "BOX_CREATOR_PUBLIC_URL",
        "http://127.0.0.1:3002",
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_SERVICE_PUBLIC_URL",
        &format!("http://{public_host}:3213"),
    )?;
    set_env(
        &mut content,
        "BOX_AUTH_PORTAL_PUBLIC_URL",
        &format!("http://{public_host}:3214"),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_LOGIN_URL",
        &format!("http://{public_host}:3214"),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_AUTH_ALLOWED_ORIGINS",
        &format!("http://{public_host}:3000,http://127.0.0.1:3002,http://{public_host}:3214"),
    )?;
    set_env(
        &mut content,
        "BOX_PLAY_MAX_RUNTIMES",
        &config.play_runtimes.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_CREATOR_EDIT_MAX_RUNTIMES",
        &config.creator_edit_runtimes.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_CREATOR_PLAY_MAX_RUNTIMES",
        &config.creator_play_runtimes.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_PLAY_PLATFORM",
        if cfg!(target_arch = "aarch64") {
            "linux/arm64"
        } else {
            "linux/amd64"
        },
    )?;

    let database_enabled = !config.database_host.trim().is_empty();
    let (host, port, database, user, password, url) = if database_enabled {
        let host = validate_host(&config.database_host, "数据库地址")?;
        let port = validate_port(&config.database_port)?;
        let database = config.database_name.trim().to_string();
        let user = config.database_user.trim().to_string();
        if database.is_empty() || user.is_empty() {
            return Err("启用 PostgreSQL 时，数据库名和账号不能为空".into());
        }
        let password = if config.database_password.is_empty() {
            existing
                .get("BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD")
                .cloned()
                .unwrap_or_default()
        } else {
            config.database_password.clone()
        };
        if password.is_empty() {
            return Err("启用 PostgreSQL 时，数据库密码不能为空".into());
        }
        let host_for_url = if host.contains(':') && !host.starts_with('[') {
            format!("[{host}]")
        } else {
            host.clone()
        };
        let url = format!(
            "postgresql://{}:{}@{}:{}/{}",
            urlencoding::encode(&user),
            urlencoding::encode(&password),
            host_for_url,
            port,
            urlencoding::encode(&database)
        );
        (host, port.to_string(), database, user, password, url)
    } else {
        (
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
            String::new(),
        )
    };
    let redis_enabled = !config.redis_host.trim().is_empty();
    let (redis_host, redis_port, redis_password) = if redis_enabled {
        let host = validate_host(&config.redis_host, "Redis 地址")?;
        let port = validate_port(&config.redis_port)?;
        let password = if config.redis_password.is_empty() {
            existing.get("REDIS_PASSWORD").cloned().unwrap_or_default()
        } else {
            config.redis_password.clone()
        };
        (host, port.to_string(), password)
    } else {
        (String::new(), String::new(), String::new())
    };
    set_env(
        &mut content,
        "COMPOSE_PROFILES",
        if database_enabled {
            "player-service,auth-portal,creator,play,voxa"
        } else {
            "creator,play,voxa"
        },
    )?;
    set_env(&mut content, "BOX_DATABASE_URL", &url)?;
    set_env(
        &mut content,
        "BOX_DATABASE_SSL",
        if config.database_ssl { "true" } else { "false" },
    )?;
    set_env(&mut content, "REDIS_HOST", &redis_host)?;
    set_env(&mut content, "REDIS_PORT", &redis_port)?;
    set_env(&mut content, "REDIS_PASSWORD", &redis_password)?;
    set_env(&mut content, "REDIS_DB", &config.redis_db.to_string())?;
    set_env(
        &mut content,
        "STORAGE_CACHE_REDIS_DB",
        &config.storage_cache_redis_db.to_string(),
    )?;
    set_env(&mut content, "BOX_DEPLOYMENT_MANAGER_DATABASE_HOST", &host)?;
    set_env(&mut content, "BOX_DEPLOYMENT_MANAGER_DATABASE_PORT", &port)?;
    set_env(
        &mut content,
        "BOX_DEPLOYMENT_MANAGER_DATABASE_NAME",
        &database,
    )?;
    set_env(&mut content, "BOX_DEPLOYMENT_MANAGER_DATABASE_USER", &user)?;
    set_env(
        &mut content,
        "BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD",
        &password,
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_SERVICE_INTERNAL_URL",
        if database_enabled {
            "http://player-service:3213"
        } else {
            ""
        },
    )?;
    if !database_enabled {
        set_env(&mut content, "BOX_PLAYER_LOGIN_URL", "")?;
    }
    fs::write(existing_file, content).map_err(|error| format!("无法保存部署配置：{error}"))
}

fn archive_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Some(app) = app {
        if let Ok(resource_dir) = app.path().resource_dir() {
            roots.push(resource_dir.clone());
            roots.push(resource_dir.join("payload"));
        }
    }
    if let Ok(executable) = std::env::current_exe() {
        if let Some(parent) = executable.parent() {
            roots.extend(parent.ancestors().take(5).map(Path::to_path_buf));
        }
    }
    roots.push(PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("payload"));
    let mut archives = Vec::new();
    for root in roots {
        if let Ok(entries) = fs::read_dir(root) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if name.starts_with("box-local-engine-images-")
                    && (name.ends_with(".tar.gz") || name.ends_with(".tar"))
                {
                    archives.push(entry.path());
                }
            }
        }
    }
    archives.sort();
    archives.dedup();
    archives
}

fn image_tag(app: &AppHandle) -> Result<String, String> {
    let values = load_existing_env(app);
    values
        .get("BOX_IMAGE_TAG")
        .cloned()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "部署配置缺少 BOX_IMAGE_TAG".into())
}

fn ensure_images(app: &AppHandle) -> Result<(), String> {
    let tag = image_tag(app)?;
    let missing = SERVICE_NAMES.iter().any(|name| {
        let image_name = match *name {
            "player-auth-portal" => "box-local-engine-player-auth-portal",
            other => {
                return docker_output(&[
                    "image",
                    "inspect",
                    &format!("box-local-engine-{other}:{tag}"),
                ])
                .is_err()
            }
        };
        docker_output(&["image", "inspect", &format!("{image_name}:{tag}")]).is_err()
    });
    if !missing {
        return Ok(());
    }
    let expected = if cfg!(target_arch = "aarch64") {
        "arm64"
    } else {
        "amd64"
    };
    let archive = archive_candidates(Some(app)).into_iter()
        .find(|path| path.file_name().is_some_and(|name| name.to_string_lossy().contains(expected)))
        .ok_or_else(|| format!("未找到 Windows/macOS {expected} 离线镜像归档。请把 box-local-engine-images-*-{expected}.tar.gz 与程序放在同一目录。"))?;
    let archive_string = archive.to_string_lossy().to_string();
    docker_output(&["load", "-i", &archive_string])?;
    Ok(())
}

#[tauri::command]
fn get_install_config(app: AppHandle) -> InstallConfigView {
    let values = load_existing_env(&app);
    if values.is_empty() {
        return InstallConfigView::default();
    }
    let number_u32 = |name: &str, fallback| {
        values
            .get(name)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    };
    let number_u8 = |name: &str, fallback| {
        values
            .get(name)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    };
    InstallConfigView {
        database_host: values
            .get("BOX_DEPLOYMENT_MANAGER_DATABASE_HOST")
            .cloned()
            .unwrap_or_default(),
        database_port: values
            .get("BOX_DEPLOYMENT_MANAGER_DATABASE_PORT")
            .cloned()
            .unwrap_or_else(default_database_port),
        database_name: values
            .get("BOX_DEPLOYMENT_MANAGER_DATABASE_NAME")
            .cloned()
            .unwrap_or_else(default_database_name),
        database_user: values
            .get("BOX_DEPLOYMENT_MANAGER_DATABASE_USER")
            .cloned()
            .unwrap_or_else(default_database_user),
        database_ssl: values
            .get("BOX_DATABASE_SSL")
            .is_some_and(|value| value == "true"),
        has_database_password: values
            .get("BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD")
            .is_some_and(|value| !value.is_empty()),
        redis_host: values.get("REDIS_HOST").cloned().unwrap_or_default(),
        redis_port: values
            .get("REDIS_PORT")
            .cloned()
            .unwrap_or_else(default_redis_port),
        has_redis_password: values
            .get("REDIS_PASSWORD")
            .is_some_and(|value| !value.is_empty()),
        redis_db: number_u8("REDIS_DB", 0),
        storage_cache_redis_db: number_u8("STORAGE_CACHE_REDIS_DB", 1),
        bind_ip: values
            .get("BOX_PLAY_HOST_IP")
            .cloned()
            .unwrap_or_else(default_bind_ip),
        public_host: values
            .get("BOX_PLAY_PUBLIC_URL")
            .and_then(|url| url.strip_prefix("http://"))
            .and_then(|value| value.rsplit_once(':').map(|(host, _)| host.to_string()))
            .unwrap_or_else(default_public_host),
        play_runtimes: number_u32("BOX_PLAY_MAX_RUNTIMES", 8),
        creator_edit_runtimes: number_u32("BOX_CREATOR_EDIT_MAX_RUNTIMES", 6),
        creator_play_runtimes: number_u32("BOX_CREATOR_PLAY_MAX_RUNTIMES", 4),
    }
}

#[tauri::command]
fn get_system_status(app: AppHandle) -> SystemStatus {
    let data_directory = runtime_root(&app)
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    let docker = docker_output(&["info", "--format", "{{.ServerVersion}}"]);
    let docker_ready = docker.is_ok();
    let docker_message = docker.unwrap_or_else(|error| error);
    let configured = env_path(&app).is_ok_and(|path| path.exists());
    let environment = load_existing_env(&app);
    let enabled = enabled_services(&environment);
    let mut services: Vec<ServiceStatus> = SERVICE_NAMES
        .iter()
        .map(|name| ServiceStatus {
            name: (*name).into(),
            enabled: enabled.contains(name),
            running: false,
            state: "stopped".into(),
        })
        .collect();
    if docker_ready && configured {
        if let Ok(output) = compose_output(&app, &["ps", "--format", "json"]) {
            let values: Vec<Value> = serde_json::from_str(&output).unwrap_or_else(|_| {
                output
                    .lines()
                    .filter_map(|line| serde_json::from_str(line).ok())
                    .collect()
            });
            for value in values {
                let name = value
                    .get("Service")
                    .or_else(|| value.get("service"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                let state = value
                    .get("State")
                    .or_else(|| value.get("state"))
                    .and_then(Value::as_str)
                    .unwrap_or_default()
                    .to_lowercase();
                if let Some(service) = services.iter_mut().find(|service| service.name == name) {
                    service.running = state == "running";
                    service.state = if state.is_empty() {
                        "stopped".into()
                    } else {
                        state
                    };
                }
            }
        }
    }
    let all_healthy = services
        .iter()
        .filter(|service| service.enabled)
        .all(|service| service.running);
    SystemStatus {
        docker_ready,
        docker_message,
        configured,
        all_healthy,
        services,
        data_directory,
    }
}

#[tauri::command]
async fn install_and_start(app: AppHandle, config: InstallConfigInput) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "preflight", "正在检查部署环境与可选远程服务…", 8);
        docker_output(&["info", "--format", "{{.ServerVersion}}"])
            .map_err(|error| format!("Docker Desktop 未启动或不可用：{error}"))?;
        if !config.database_host.trim().is_empty() {
            let database_host = validate_host(&config.database_host, "数据库地址")?;
            let database_port = validate_port(&config.database_port)?;
            check_remote_endpoint(" PostgreSQL", &database_host, database_port)?;
        }
        if !config.redis_host.trim().is_empty() {
            let redis_host = validate_host(&config.redis_host, "Redis 地址")?;
            let redis_port = validate_port(&config.redis_port)?;
            check_remote_endpoint(" Redis", &redis_host, redis_port)?;
        }
        emit_progress(&app, "config", "正在生成安全配置…", 15);
        save_configuration(&app, &config)?;
        if config.database_host.trim().is_empty() {
            let _ = compose_output(&app, &["stop", "player-service", "player-auth-portal"]);
        }
        emit_progress(&app, "images", "正在校验并导入离线镜像…", 22);
        ensure_images(&app)?;
        emit_progress(&app, "start", "正在创建并启动服务…", 72);
        compose_output(&app, &["up", "-d", "--remove-orphans"])?;
        emit_progress(&app, "complete", "部署完成", 100);
        Ok(())
    })
    .await
    .map_err(|error| format!("部署任务异常结束：{error}"))?
}

#[tauri::command]
async fn start_services(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
        emit_progress(&app, "images", "正在检查离线镜像…", 20);
        ensure_images(&app)?;
        emit_progress(&app, "start", "正在启动全部服务…", 65);
        compose_output(&app, &["up", "-d", "--remove-orphans"])?;
        emit_progress(&app, "complete", "全部服务已启动", 100);
        Ok(())
    })
    .await
    .map_err(|error| format!("启动任务异常结束：{error}"))?
}

#[tauri::command]
async fn stop_services(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "stop", "正在停止全部服务…", 35);
        compose_output(&app, &["stop"])?;
        emit_progress(&app, "complete", "全部服务已停止", 100);
        Ok(())
    })
    .await
    .map_err(|error| format!("停止任务异常结束：{error}"))?
}

#[tauri::command]
async fn get_logs(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        compose_output(&app, &["logs", "--tail", "500", "--no-color"])
    })
    .await
    .map_err(|error| format!("日志任务异常结束：{error}"))?
}

#[tauri::command]
fn open_service(url: String) -> Result<(), String> {
    if !url.starts_with("http://127.0.0.1:") && !url.starts_with("http://localhost:") {
        return Err("只允许打开本机 BOX 服务地址".into());
    }
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", &url]);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(&url);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(&url);
        command
    };
    hide_window(&mut command);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开浏览器：{error}"))
}

fn file_sha256(path: &Path) -> Result<String, String> {
    let mut file = fs::File::open(path).map_err(|error| error.to_string())?;
    let mut digest = Sha256::new();
    let mut buffer = [0_u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
        if read == 0 {
            break;
        }
        digest.update(&buffer[..read]);
    }
    Ok(format!("{:x}", digest.finalize()))
}

#[tauri::command]
fn verify_archive(app: AppHandle) -> Result<String, String> {
    let archive = archive_candidates(Some(&app))
        .into_iter()
        .next()
        .ok_or_else(|| "未找到离线镜像归档".to_string())?;
    file_sha256(&archive)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_install_config,
            get_system_status,
            install_and_start,
            start_services,
            stop_services,
            get_logs,
            open_service,
            verify_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BOX Local Engine manager");
}
