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
use chrono::Utc;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::{Path as FsPath, PathBuf},
    process::Command,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tower_http::services::ServeDir;

mod operations;
use box_manager_core::configuration as shared_config;
use box_manager_core::configuration_migration::{
    clear_overrides_on_configuration_change, migrate_document,
};
use box_manager_core::services::{
    self, Runtime as ServiceRuntime, APPLICATION_SERVICES as SERVICES,
};
use box_manager_core::{backup, backup_store};
use operations::Operations;

const KEY: &str = include_str!("../../../distribution/license-public-key.pem");
const LEGAL_NOTICE: &str = include_str!("../../../distribution/LICENSE.txt");

#[derive(Clone)]
struct App {
    root: PathBuf,
    token: String,
    compose_file: PathBuf,
    environment_file: PathBuf,
    operations: Arc<Operations>,
    operation_id: Option<String>,
}
impl App {
    fn progress(&self, stage: &str, message: &str, percent: u8) {
        if let Some(id) = &self.operation_id {
            self.operations.update(id, stage, message, percent, false);
        }
    }
}
struct WebRuntime<'a>(&'a App);
impl ServiceRuntime for WebRuntime<'_> {
    fn require_license(&self) -> Result<(), String> {
        if license(self.0, None)?
            .get("valid")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            Ok(())
        } else {
            Err("请先安装有效许可证".into())
        }
    }
    fn prepare_images(&self) -> Result<(), String> {
        generate_runtime_environment(self.0)?;
        database_url(&parse_env(
            &fs::read_to_string(env_path(self.0)).map_err(|e| e.to_string())?,
        ))?;
        docker(&["info", "--format", "{{.ServerVersion}}"])?;
        Ok(())
    }
    fn managed_enabled(&self, service: &str) -> bool {
        let key = match service {
            "managed-postgres" => "BOX_DATABASE_MODE",
            "managed-redis" => "BOX_REDIS_MODE",
            _ => return false,
        };
        parse_env(&fs::read_to_string(env_path(self.0)).unwrap_or_default())
            .get(key)
            .is_some_and(|mode| mode == "managed")
    }
    fn check_managed(&self, service: &str) -> Result<(), String> {
        if !self.managed_enabled(service) {
            return Err("该内置基础服务尚未启用".into());
        }
        let values = parse_env(&fs::read_to_string(env_path(self.0)).map_err(|e| e.to_string())?);
        let image = managed_image(
            &values,
            if service == "managed-postgres" {
                "postgresql"
            } else {
                "redis"
            },
        )?;
        docker(&["image", "inspect", &image])
            .map_err(|_| "该内置基础服务尚未安装，请先在数据配置中下载镜像".to_string())?;
        Ok(())
    }
    fn compose(&self, args: &[&str]) -> Result<(), String> {
        compose(self.0, args).map(|_| ())
    }
    fn progress(&self, stage: &str, message: &str, percent: u8) {
        self.0.progress(stage, message, percent);
    }
}

#[derive(Deserialize)]
struct Request {
    #[serde(flatten)]
    body: BTreeMap<String, Value>,
}
use box_manager_core::license as shared_license;
#[cfg(test)]
use shared_license::LicensePayload;
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
use box_manager_core::environment::parse_env;

fn set_env(mut source: String, key: &str, value: &str) -> Result<String, String> {
    box_manager_core::environment::set_env(&mut source, key, value)?;
    Ok(source)
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
fn host_project_root(app: &App) -> Result<PathBuf, String> {
    if let Some(root) = env::var("BOX_SERVER_MANAGER_HOST_ROOT")
        .ok()
        .filter(|root| !root.trim().is_empty())
    {
        let root = PathBuf::from(root);
        if root.is_absolute() {
            return Ok(root);
        }
        return Err("BOX_SERVER_MANAGER_HOST_ROOT 必须是宿主机绝对路径".into());
    }
    if !in_container() {
        return Ok(app.root.clone());
    }
    let container = env::var("HOSTNAME")
        .map_err(|_| "无法定位管理容器，请配置 BOX_SERVER_MANAGER_HOST_ROOT")?;
    let mounts: Value = serde_json::from_str(&docker(&[
        "inspect",
        "--format",
        "{{json .Mounts}}",
        &container,
    ])?)
    .map_err(|e| e.to_string())?;
    mapped_host_root(&app.root, &mounts)
}
fn mapped_host_root(root: &FsPath, mounts: &Value) -> Result<PathBuf, String> {
    mounts
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|mount| {
            if mount.get("Type")?.as_str()? != "bind" {
                return None;
            }
            let destination = PathBuf::from(mount.get("Destination")?.as_str()?);
            let relative = root.strip_prefix(&destination).ok()?;
            let source = PathBuf::from(mount.get("Source")?.as_str()?);
            source
                .is_absolute()
                .then(|| (destination.components().count(), source.join(relative)))
        })
        .max_by_key(|(depth, _)| *depth)
        .map(|(_, root)| root)
        .ok_or_else(|| {
            "无法定位部署目录的宿主机挂载路径，请配置 BOX_SERVER_MANAGER_HOST_ROOT".into()
        })
}
fn compose(app: &App, args: &[&str]) -> Result<String, String> {
    if let Some(result) = services::control_existing(args, "box-local-engine", docker) {
        return result;
    }
    let environment = generate_runtime_environment(app)?;
    let mut command = Command::new("docker");
    command
        .args([
            "compose",
            "--project-name",
            "box-local-engine",
            "--project-directory",
        ])
        .arg(host_project_root(app)?)
        .arg("--env-file")
        .arg(&environment)
        .arg("-f")
        .arg(&app.compose_file)
        .args(args)
        .current_dir(&app.root);
    for key in
        parse_env(&fs::read_to_string(&environment).map_err(|error| error.to_string())?).keys()
    {
        command.env_remove(key);
    }
    // These variables configure the manager process, not host-side bind paths.
    command
        .env_remove("BOX_SERVER_MANAGER_ROOT")
        .env_remove("BOX_SERVER_MANAGER_COMPOSE_FILE");
    let output = command
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
fn managed_value(values: &BTreeMap<String, String>, key: &str) -> Option<String> {
    values
        .get(key)
        .cloned()
        .filter(|value| !value.trim().is_empty())
}
fn managed_database_identity(existing: &BTreeMap<String, String>) -> Option<(String, String)> {
    let database = managed_value(existing, "BOX_MANAGED_POSTGRES_DATABASE");
    let user = managed_value(existing, "BOX_MANAGED_POSTGRES_USER");
    if let (Some(database), Some(user)) = (database, user) {
        return Some((database, user));
    }
    existing
        .get("BOX_DATABASE_MODE")
        .is_some_and(|mode| mode == "managed")
        .then(|| {
            Some((
                managed_value(existing, "BOX_DATABASE_NAME")?,
                managed_value(existing, "BOX_DATABASE_USER")?,
            ))
        })
        .flatten()
}
fn managed_database_password(existing: &BTreeMap<String, String>) -> Option<String> {
    managed_value(existing, "BOX_MANAGED_POSTGRES_PASSWORD").or_else(|| {
        existing
            .get("BOX_DATABASE_MODE")
            .is_some_and(|mode| mode == "managed")
            .then(|| managed_value(existing, "BOX_DATABASE_PASSWORD"))
            .flatten()
    })
}
fn managed_redis_password(existing: &BTreeMap<String, String>) -> Option<String> {
    managed_value(existing, "BOX_MANAGED_REDIS_PASSWORD").or_else(|| {
        existing
            .get("BOX_REDIS_MODE")
            .is_some_and(|mode| mode == "managed")
            .then(|| managed_value(existing, "REDIS_PASSWORD"))
            .flatten()
    })
}
fn managed_volume_exists(name: &str) -> bool {
    docker(&["volume", "inspect", name]).is_ok()
}
fn guard_managed_storage_credentials(
    content: &str,
    config: &serde_json::Map<String, Value>,
    postgres_volume_exists: bool,
    redis_volume_exists: bool,
) -> Result<(), String> {
    let existing = parse_env(&migrate_document(content)?);
    if config.get("databaseMode").and_then(Value::as_str) == Some("managed")
        && postgres_volume_exists
        && (managed_database_identity(&existing).is_none()
            || managed_database_password(&existing).is_none())
    {
        return Err("检测到已有内置 PostgreSQL 数据，但缺少其原始连接凭据。为避免生成不匹配的新账号，已停止保存；请恢复此前的 .env 后重试。".into());
    }
    if config.get("redisMode").and_then(Value::as_str) == Some("managed")
        && redis_volume_exists
        && managed_redis_password(&existing).is_none()
    {
        return Err("检测到已有内置 Redis 数据，但缺少其原始连接凭据。为避免生成不匹配的新密码，已停止保存；请恢复此前的 .env 后重试。".into());
    }
    Ok(())
}

/// The Web console no longer runs on the server's own network namespace, so a
/// container-local probe would return the Docker bridge address (for example
/// 172.18.0.2) instead of the address players actually use. Prefer the value
/// install.sh detected on the host and never fall back to a probe inside a
/// container.
fn configured_lan_ip() -> Option<String> {
    let value = env::var("BOX_LAN_IP").ok()?;
    let value = value.trim();
    (!value.is_empty() && validate_host(value, "局域网地址").is_ok()).then(|| value.to_string())
}
fn in_container() -> bool {
    FsPath::new("/.dockerenv").exists() || FsPath::new("/run/.containerenv").exists()
}
/// Ask the OS which outbound interface it would use. No traffic is sent to the
/// documentation-only probe address; this only reveals the LAN address.
fn detect_lan_ip() -> Option<String> {
    if let Some(value) = configured_lan_ip() {
        return Some(value);
    }
    if in_container() {
        return None;
    }
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:80").ok()?;
    let address = socket.local_addr().ok()?.ip();
    (!address.is_loopback() && !address.is_unspecified()).then(|| address.to_string())
}
use shared_config::validate_host;

fn runtime_env_path(app: &App) -> PathBuf {
    app.root.join(".runtime.env")
}

/// Same limits the desktop launcher enforces, so the Web form cannot persist a
/// configuration the launcher would reject.
use shared_config::validate_configuration;
use shared_config::validate_raw_environment;
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
/// The five business containers plus the Web manager itself. Managed
/// PostgreSQL/Redis only join the profile set when the operator selects them,
/// otherwise `--remove-orphans` would treat their running containers as
/// orphans and delete them on the next start.
use shared_config::database_url;
/// Docker only ever consumes this derived file. `.env` stays the single source
/// of truth that the operator edits, while hostnames, origins and public URLs
/// are recomputed from the access modes on every compose call so the Web console
/// and the desktop launcher behave identically.
fn generate_runtime_environment(app: &App) -> Result<PathBuf, String> {
    let owner =
        fs::read_to_string(env_path(app)).map_err(|error| format!("无法读取部署配置：{error}"))?;
    let migrated_owner = migrate_document(&owner)?;
    let values = parse_env(&migrated_owner);
    let lan_ip = detect_lan_ip();
    let image_tag = values
        .get("BOX_IMAGE_TAG")
        .cloned()
        .or_else(|| env::var("BOX_IMAGE_TAG").ok())
        .unwrap_or_else(|| env!("CARGO_PKG_VERSION").into());
    let derived = shared_config::runtime_environment(
        &values,
        &shared_config::RuntimeInputs {
            lan_ip: lan_ip.as_deref(),
            image_tag: &image_tag,
            platform: if cfg!(target_arch = "aarch64") {
                "linux/arm64"
            } else {
                "linux/amd64"
            },
            license_file: values
                .get("BOX_LICENSE_FILE")
                .map(String::as_str)
                .unwrap_or("./license/box3-license.boxlic"),
            license_device_file: values
                .get("BOX_LICENSE_DEVICE_FILE")
                .map(String::as_str)
                .unwrap_or("./license/device-id"),
            database_required: false,
            web_manager: true,
        },
    )?;
    let mut runtime = migrated_owner.clone();
    for (key, value) in derived {
        runtime = set_env(runtime, &key, &value)?;
    }
    let path = runtime_env_path(app);
    private(&path, &runtime)?;
    // Persist migration markers only after all derivation and runtime writing
    // succeed, so a rejected configuration does not silently change the owner.
    if migrated_owner != owner {
        private(&env_path(app), &migrated_owner)?;
    }
    Ok(path)
}
/// Pure form-to-owner transformation, shared by the HTTP save path and fixtures.
fn configuration_document_for_save(
    content: &str,
    config: &serde_json::Map<String, Value>,
) -> Result<String, String> {
    let mut source = migrate_document(content)?;
    clear_overrides_on_configuration_change(&mut source, config)?;
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
    source = set_env(source, "BOX_DATABASE_MODE", database_mode)?;
    source = set_env(source, "BOX_REDIS_MODE", redis_mode)?;
    for (input, key) in [
        ("playPort", "BOX_PLAY_PORT"),
        ("creatorPort", "BOX_CREATOR_PORT"),
        ("voxaPort", "BOX_VOXA_PORT"),
        ("playerServicePort", "BOX_PLAYER_SERVICE_PORT"),
        ("authPortalPort", "BOX_AUTH_PORTAL_PORT"),
    ] {
        if let Some(value) = config.get(input) {
            source = set_env(source, key, &port(value, input)?)?;
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
            source = set_env(source, key, &json_value(value)?)?;
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
            source = set_env(source, key, &minutes.saturating_mul(60_000).to_string())?;
        }
    }
    for (input, key) in [
        ("playerServiceMemoryMb", "BOX_PLAYER_SERVICE_MEMORY_LIMIT"),
        ("authPortalMemoryMb", "BOX_AUTH_PORTAL_MEMORY_LIMIT"),
        ("creatorMemoryMb", "BOX_CREATOR_MEMORY_LIMIT"),
        ("playMemoryMb", "BOX_PLAY_MEMORY_LIMIT"),
    ] {
        if let Some(value) = config.get(input) {
            source = set_env(source, key, &format!("{}m", json_value(value)?))?;
        }
    }
    for (input, key) in [
        ("playerServiceCpuLimit", "BOX_PLAYER_SERVICE_CPU_LIMIT"),
        ("authPortalCpuLimit", "BOX_AUTH_PORTAL_CPU_LIMIT"),
        ("creatorCpuLimit", "BOX_CREATOR_CPU_LIMIT"),
        ("playCpuLimit", "BOX_PLAY_CPU_LIMIT"),
    ] {
        if let Some(value) = config.get(input) {
            source = set_env(source, key, &json_value(value)?)?;
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
            source = set_env(source, key, if value ^ inverted { "true" } else { "false" })?;
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
            source = set_env(source, key, value)?;
        }
    }
    if database_mode == "managed" {
        let (database, user) = managed_database_identity(&existing).unwrap_or_else(|| {
            (
                format!("box_db_{}", random_hex(8)),
                format!("box_user_{}", random_hex(8)),
            )
        });
        let password = managed_database_password(&existing).unwrap_or_else(|| random_hex(32));
        source = set_env(source, "BOX_DATABASE_HOST", "managed-postgres")?;
        source = set_env(source, "BOX_DATABASE_PORT", "5432")?;
        source = set_env(source, "BOX_DATABASE_NAME", &database)?;
        source = set_env(source, "BOX_DATABASE_USER", &user)?;
        source = set_env(source, "BOX_DATABASE_PASSWORD", &password)?;
        source = set_env(source, "BOX_MANAGED_POSTGRES_DATABASE", &database)?;
        source = set_env(source, "BOX_MANAGED_POSTGRES_USER", &user)?;
        source = set_env(source, "BOX_MANAGED_POSTGRES_PASSWORD", &password)?;
        source = set_env(
            source,
            "BOX_DATABASE_URL",
            &format!(
                "postgres://{}:{}@managed-postgres:5432/{}",
                urlencoding::encode(&user),
                urlencoding::encode(&password),
                urlencoding::encode(&database)
            ),
        )?;
        source = set_env(source, "BOX_DATABASE_SSL", "false")?;
    } else if let Some(host) = config.get("databaseHost") {
        let host = json_value(host)?;
        if host.is_empty() {
            source = set_env(source, "BOX_DATABASE_URL", "")?;
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
            source = set_env(source, "BOX_DATABASE_HOST", &host)?;
            source = set_env(source, "BOX_DATABASE_PORT", &database_port)?;
            source = set_env(source, "BOX_DATABASE_NAME", &database_name)?;
            source = set_env(source, "BOX_DATABASE_USER", &database_user)?;
            source = set_env(source, "BOX_DATABASE_PASSWORD", &database_password)?;
            source = set_env(
                source,
                "BOX_DATABASE_URL",
                &format!(
                    "postgres://{authority}:{database_port}/{}",
                    urlencoding::encode(&database_name)
                ),
            )?;
        }
    }
    if redis_mode == "managed" {
        let password = managed_redis_password(&existing).unwrap_or_else(|| random_hex(32));
        source = set_env(source, "REDIS_HOST", "managed-redis")?;
        source = set_env(source, "REDIS_PORT", "6379")?;
        source = set_env(source, "REDIS_PASSWORD", &password)?;
        source = set_env(source, "BOX_MANAGED_REDIS_PASSWORD", &password)?;
        source = set_env(source, "REDIS_DB", "0")?;
        source = set_env(source, "STORAGE_CACHE_REDIS_DB", "1")?;
        source = set_env(source, "STORAGE_CACHE_REDIS_TTL", "240")?;
    } else if redis_mode == "disabled" {
        source = set_env(source, "REDIS_HOST", "")?;
        source = set_env(source, "REDIS_PASSWORD", "")?;
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
        )?;
        let bind = if config.get("playNetworkMode").and_then(Value::as_str) == Some("local") {
            "127.0.0.1"
        } else {
            "0.0.0.0"
        };
        source = set_env(source, "BOX_BIND_IP", bind)?;
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
        )?;
        let bind = if config.get("creatorNetworkMode").and_then(Value::as_str) == Some("local") {
            "127.0.0.1"
        } else {
            "0.0.0.0"
        };
        source = set_env(source, "BOX_CREATOR_BIND_IP", bind)?;
        source = set_env(source, "BOX_VOXA_BIND_IP", bind)?;
    }
    if let Some(value) = config.get("registrationEnabled").and_then(Value::as_bool) {
        source = set_env(
            source,
            "BOX_PLAYER_REGISTRATION_ENABLED",
            if value { "true" } else { "false" },
        )?;
    }
    if let Some(value) = config
        .get("libraryManagementEnabled")
        .and_then(Value::as_bool)
    {
        source = set_env(
            source,
            "BOX_PLAY_LIBRARY_READ_ONLY",
            if value { "false" } else { "true" },
        )?;
    }
    // The desktop launcher keeps the script heap limit in step with
    // the memory limit; the runtime reads BOX_SCRIPT_HEAP_MB.
    if let Some(value) = config.get("scriptMemoryMb") {
        source = set_env(source, "BOX_SCRIPT_HEAP_MB", &json_value(value)?)?;
    }
    if database_mode == "managed" {
        box_manager_core::environment::remove_env(&mut source, "BOX_DATABASE_QUERY");
    }
    Ok(source)
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
    app.progress("managed-check", "正在检查内置服务镜像…", 10);
    let values = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let image = managed_image(&values, service)?;
    docker(&["info", "--format", "{{.ServerVersion}}"])?;
    if docker(&["image", "inspect", &image]).is_err() {
        app.progress("managed-image", "正在下载内置服务镜像…", 20);
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
    remove_empty_file_placeholder(path)?;
    let tmp = path.with_extension(format!("{}.{}.tmp", std::process::id(), random_hex(8)));
    fs::write(&tmp, value).map_err(|e| e.to_string())?;
    if let Err(error) = fs::rename(&tmp, path) {
        let _ = fs::remove_file(tmp);
        return Err(error.to_string());
    }
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600)).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Docker creates a directory when a configured bind-mounted file does not
/// exist yet. Treat only an empty real directory as that placeholder; links or
/// directories containing data remain hard errors.
fn remove_empty_file_placeholder(path: &FsPath) -> Result<(), String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.to_string()),
    };
    if !metadata.file_type().is_dir() {
        return Ok(());
    }
    let mut entries = fs::read_dir(path).map_err(|error| error.to_string())?;
    if entries.next().is_some() {
        return Err(format!("{} 应为文件，但当前是非空目录", path.display()));
    }
    fs::remove_dir(path).map_err(|error| error.to_string())
}

fn backup_dir(app: &App) -> PathBuf {
    app.root.join("apps/local-engine/backups")
}
fn backup_file(app: &App, value: &str) -> Result<PathBuf, String> {
    backup_store::resolve(&backup_dir(app), value)
}
fn list_backups(app: &App) -> Result<Value, String> {
    serde_json::to_value(backup_store::list(&backup_dir(app))?).map_err(|error| error.to_string())
}
fn create_backup(app: &App) -> Result<String, String> {
    app.progress("backup", "正在创建数据备份…", 20);
    backup_store::create(&app.root, &backup_dir(app))
}
fn restore_backup(app: &App, value: &str) -> Result<Option<String>, String> {
    let archive = backup_file(app, value)?;
    app.progress("restore-validate", "正在校验备份…", 10);
    let report = backup::restore_archive(&app.root, &archive, backup::Limits::default(), |_| {
        services::stop(&WebRuntime(app))?;
        app.progress("restore", "正在恢复数据…", 50);
        Ok(())
    })?;
    Ok(report.cleanup_warning)
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
            let enabled = services::enabled(service, &environment);
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
fn decode_chunked_body(mut body: &[u8]) -> Option<Vec<u8>> {
    let mut decoded = Vec::new();
    loop {
        let line_end = body.windows(2).position(|window| window == b"\r\n")?;
        let length = std::str::from_utf8(&body[..line_end])
            .ok()?
            .split(';')
            .next()?
            .trim();
        let length = usize::from_str_radix(length, 16).ok()?;
        body = &body[line_end + 2..];
        if length == 0 {
            return Some(decoded);
        }
        if body.len() < length + 2 || &body[length..length + 2] != b"\r\n" {
            return None;
        }
        decoded.extend_from_slice(&body[..length]);
        body = &body[length + 2..];
    }
}
fn runtime_status(host: &str, port: u16, project_id: &str, prefix: &str) -> Value {
    let Ok(mut stream) = TcpStream::connect((host, port)) else { return unavailable_runtime() };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(1200)));
    let path = if prefix.is_empty() {
        format!("/{project_id}/__local_runtime/status")
    } else {
        format!("/{prefix}/{project_id}/__local_runtime/status")
    };
    if stream.write_all(
        format!("GET {path} HTTP/1.1\r\nHost: {host}\r\nConnection: close\r\n\r\n").as_bytes(),
    ).is_err() {
        return unavailable_runtime();
    }
    // Node's proxy uses chunked transfer encoding for this tiny document and
    // may keep the socket alive.  Read complete HTTP framing rather than
    // waiting for EOF or treating chunk markers as JSON.
    let mut raw = Vec::with_capacity(1024);
    let mut chunk = [0_u8; 4096];
    while raw.len() < 16 * 1024 {
        let length = match stream.read(&mut chunk) { Ok(length) if length > 0 => length, _ => break };
        raw.extend_from_slice(&chunk[..length]);
        if let Some(header_end) = raw.windows(4).position(|window| window == b"\r\n\r\n") {
            let headers = String::from_utf8_lossy(&raw[..header_end]).to_ascii_lowercase();
            let body = &raw[header_end + 4..];
            if headers.contains("transfer-encoding: chunked") {
                if body.windows(5).any(|window| window == b"0\r\n\r\n") { break; }
            } else if let Some(length) = headers.lines().find_map(|line| line.strip_prefix("content-length:")?.trim().parse::<usize>().ok()) {
                if body.len() >= length { break; }
            } else { break; }
        }
    }
    let response = String::from_utf8_lossy(&raw);
    if !(response.starts_with("HTTP/1.1 200") || response.starts_with("HTTP/1.0 200")) {
        return unavailable_runtime();
    }
    let Some((headers, body)) = raw.windows(4).position(|window| window == b"\r\n\r\n").map(|index| (&raw[..index], &raw[index + 4..])) else { return unavailable_runtime() };
    let chunked = String::from_utf8_lossy(headers).to_ascii_lowercase().contains("transfer-encoding: chunked");
    let body = if chunked { decode_chunked_body(body) } else { Some(body.to_vec()) };
    body.and_then(|body| serde_json::from_slice(&body).ok()).unwrap_or_else(unavailable_runtime)
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

fn is_sensitive_env_key(key: &str) -> bool {
    let key = key.to_ascii_uppercase();
    key.contains("PASSWORD")
        || key.contains("SECRET")
        || key.contains("TOKEN")
        || key.contains("API_KEY")
        || key == "BOX_DATABASE_URL"
}
fn redact_text(text: String, values: &BTreeMap<String, String>) -> String {
    let mut redacted = text;
    for (key, value) in values {
        if !is_sensitive_env_key(key) || value.len() < 4 {
            continue;
        }
        redacted = redacted.replace(value.as_str(), "[REDACTED]");
    }
    redacted
}
fn export_diagnostics(app: &App) -> Result<String, String> {
    let directory = app.root.join("diagnostics");
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let text = directory.join(format!("BOX-diagnostic-{stamp}.txt"));
    // The Web console offers this as the diagnostic download, so it carries
    // the same redacted configuration, status and logs the launcher exports.
    let environment = parse_env(&fs::read_to_string(env_path(app)).unwrap_or_default());
    let runtime_environment =
        parse_env(&fs::read_to_string(runtime_env_path(app)).unwrap_or_default());
    let safe_environment = environment
        .iter()
        .map(|(key, value)| {
            (
                key.clone(),
                if is_sensitive_env_key(key) {
                    "[REDACTED]".to_string()
                } else {
                    value.clone()
                },
            )
        })
        .collect::<BTreeMap<_, _>>();
    let docker_info = docker(&["info", "--format", "{{json .}}"])
        .unwrap_or_else(|error| format!("Docker info unavailable: {error}"));
    let compose_state = redact_text(
        compose(app, &["ps", "--all", "--format", "json"])
            .unwrap_or_else(|error| format!("Compose state unavailable: {error}")),
        &runtime_environment,
    );
    let logs = redact_text(
        redact_text(
            compose(app, &["logs", "--tail", "500", "--no-color"])
                .unwrap_or_else(|error| format!("Logs unavailable: {error}")),
            &runtime_environment,
        ),
        &environment,
    );
    let report = json!({
        "formatVersion": 1,
        "generatedAt": stamp,
        "applicationVersion": option_env!("BOX_BUILD_VERSION").unwrap_or(env!("CARGO_PKG_VERSION")),
        "platform": "linux",
        "architecture": env::consts::ARCH,
        "configuration": safe_environment,
        "dockerInfo": docker_info,
        "composeState": compose_state,
    });
    private(
        &text,
        &format!(
            "BOX3 Engine Linux diagnostic\ncreatedAt={stamp}\n此诊断文件已自动隐藏密码、令牌、API Key 和数据库连接串。发送前仍建议人工检查。\n\n== 配置 ==\n{}\n\n== Docker 信息 ==\n{}\n\n== Compose 状态 ==\n{}\n\n== 服务日志（最近 500 行） ==\n{}\n",
            serde_json::to_string_pretty(&report).map_err(|error| error.to_string())?,
            report.get("dockerInfo").and_then(Value::as_str).unwrap_or(""),
            report.get("composeState").and_then(Value::as_str).unwrap_or(""),
            logs,
        ),
    )?;
    Ok(text
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string())
}
fn database_fields(value: Option<&String>) -> (String, String, String, String, String) {
    value
        .and_then(|url| shared_config::parse_database_url(url).ok())
        .map(|fields| {
            (
                fields.host,
                fields.port.to_string(),
                fields.database,
                fields.user,
                fields.password,
            )
        })
        .unwrap_or_else(|| {
            (
                String::new(),
                "5432".into(),
                "box".into(),
                String::new(),
                String::new(),
            )
        })
}
fn url_host(value: Option<&String>, fallback: &str) -> String {
    value
        .and_then(|url| shared_config::host_from_http_url(url))
        .unwrap_or_else(|| fallback.into())
}
fn is_hex_secret(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}
/// The installation secret must survive a package upgrade. Keeping it in the
/// unpacked directory meant that replacing the ZIP silently produced a new
/// device identity and invalidated an installed license, so the operator's
/// `.env` is now authoritative and the old file is only a migration fallback.
fn install_secret(app: &App) -> Result<String, String> {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = LOCK.lock().map_err(|_| "设备密钥锁不可用")?;
    if let Ok(value) = env::var("BOX_LICENSE_INSTALL_SECRET") {
        let value = value.trim().to_ascii_lowercase();
        if is_hex_secret(&value) {
            return Ok(value);
        }
    }
    let path = app.root.join("license/install-secret");
    if let Ok(value) = fs::read_to_string(&path) {
        let value = value.trim().to_ascii_lowercase();
        if is_hex_secret(&value) {
            return Ok(value);
        }
    }
    let value = random_hex(32);
    private(&path, &value)?;
    Ok(value)
}
fn device(app: &App) -> Result<String, String> {
    let dir = app.root.join("license");
    let value = install_secret(app)?;
    let hw_path =
        env::var("BOX_LICENSE_HARDWARE_ID_FILE").unwrap_or_else(|_| "/run/host-machine-id".into());
    let hw = fs::read_to_string(&hw_path)
        .or_else(|_| fs::read_to_string("/run/host-machine-id"))
        .or_else(|_| fs::read_to_string("/etc/machine-id"))
        .map_err(|_| "无法读取 Linux 设备标识")?;
    let id = shared_license::derive_web_device_id(&hw, &value);
    let path = dir.join("device-id");
    remove_empty_file_placeholder(&path)?;
    // This path is bind-mounted as a single file into every business
    // container. Replacing an existing file (even atomically) can briefly
    // make it disappear to Docker's file mount and races child runtime
    // startup. Its contents are deterministic, so a matching file is already
    // the correct durable identity and must retain its inode.
    if fs::read_to_string(&path)
        .ok()
        .is_some_and(|existing| existing.trim() == id)
    {
        return Ok(id);
    }
    private(&path, &id)?;
    Ok(id)
}
/// Create the bind-mounted device file before any Compose operation can create
/// a business container. Docker preserves a missing-file bind mount as a
/// directory/inode in an already-created container, so creating it later is
/// too late for that container.
fn initialize_license_storage(app: &App) -> Result<(), String> {
    device(app).map(|_| ())
}
fn license(app: &App, install: Option<&str>) -> Result<Value, String> {
    let id = device(app)?;
    let path = app
        .root
        .join("license")
        .join(shared_license::LICENSE_FILE_NAME);
    remove_empty_file_placeholder(&path)?;
    let token = match install {
        Some(token) => Some(token.to_string()),
        None => match fs::read_to_string(&path) {
            Ok(token) => Some(token),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
            Err(error) => return Err(format!("无法读取许可证：{error}")),
        },
    };
    let now = if token.is_some() {
        shared_license::trusted_now(
            &app.root.join("license/trusted-time.json"),
            &install_secret(app)?,
            Utc::now(),
            private,
        )?
    } else {
        Utc::now()
    };
    if let Some(token) = install {
        shared_license::verify_token(token, KEY, &id, now)?;
        private(&path, &format!("{}\n", token.trim()))?;
    }
    serde_json::to_value(shared_license::status_from_token(
        token.as_deref(),
        KEY,
        &id,
        now,
    ))
    .map_err(|error| error.to_string())
}
async fn health() -> Json<Value> {
    Json(json!({"ok":true}))
}
fn manager_port() -> u16 {
    env::var("BOX_SERVER_MANAGER_PORT")
        .ok()
        .and_then(|value| value.parse().ok())
        .unwrap_or(3130)
}
fn run_healthcheck() -> Result<(), String> {
    let address = SocketAddr::from(([127, 0, 0, 1], manager_port()));
    let mut stream = TcpStream::connect_timeout(&address, Duration::from_secs(2))
        .map_err(|error| format!("管理服务不可达：{error}"))?;
    stream
        .set_read_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;
    stream
        .set_write_timeout(Some(Duration::from_secs(2)))
        .map_err(|error| error.to_string())?;
    stream
        .write_all(b"GET /api/health HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n")
        .map_err(|error| format!("无法发送健康检查：{error}"))?;
    let mut response = [0_u8; 64];
    let length = stream
        .read(&mut response)
        .map_err(|error| format!("无法读取健康检查：{error}"))?;
    if response[..length].starts_with(b"HTTP/1.1 200") {
        Ok(())
    } else {
        Err("管理服务健康检查返回异常状态".into())
    }
}
fn public_directory() -> PathBuf {
    env::var("BOX_SERVER_MANAGER_PUBLIC_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/app/public"))
}
async fn index() -> Result<Html<String>, StatusCode> {
    fs::read_to_string(public_directory().join("index.html"))
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
        response.headers_mut().insert(
            header::CONTENT_TYPE,
            if archive.to_ascii_lowercase().ends_with(".zip") {
                "application/zip"
            } else if archive.to_ascii_lowercase().ends_with(".tar") {
                "application/x-tar"
            } else {
                "application/gzip"
            }
            .parse()
            .unwrap(),
        );
        response.headers_mut().insert(
            header::CONTENT_DISPOSITION,
            format!(
                "attachment; filename*=UTF-8''{}",
                urlencoding::encode(&archive)
            )
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
    let result = tokio::task::spawn_blocking(move || -> Result<Value, String> {
        let _operation = box_manager_core::operation::mutation_guard()?;
        if body.len() > 512 * 1024 * 1024 {
            return Err("备份文件不能超过 512 MB".into());
        }
        let encoded = headers
            .get("x-backup-name")
            .and_then(|v| v.to_str().ok())
            .ok_or("缺少备份文件名")?;
        let name = urlencoding::decode(encoded).map_err(|_| "备份文件名无效")?;
        let name = backup_store::import_bytes(&backup_dir(&app), &name, &body)?;
        Ok(json!({"path":name}))
    })
    .await
    .unwrap_or_else(|error| Err(format!("上传任务异常结束：{error}")));
    match result {
        Ok(value) => Json(value).into_response(),
        Err(error) => fail(error),
    }
}
async fn operation_progress(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> Response {
    if let Err(response) = auth(&headers, &app) {
        return response;
    }
    match app.operations.get(&id) {
        Some(progress) => Json(progress).into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
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
    if name != "get_legal_notices" {
        if let Err(r) = auth(&headers, &app) {
            return r;
        }
    }
    let operation_id = headers
        .get("x-operation-id")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    if let Some(id) = &operation_id {
        if let Err(error) = app.operations.begin(id) {
            return fail(error);
        }
    }
    let operations = app.operations.clone();
    let mut request_app = (*app).clone();
    request_app.operation_id = operation_id.clone();
    let app = request_app;
    let answer = tokio::task::spawn_blocking(move || -> Result<Value, String> {
        let _operation = if box_manager_core::operation::mutates_runtime(&name) {
            Some(box_manager_core::operation::mutation_guard()?)
        } else { None };
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
                validate_raw_environment(s)?;
                private(&env_path(&app), s)?;
                generate_runtime_environment(&app)?;
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
                    "lanIp": detect_lan_ip().unwrap_or_default(),
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
                let archive = req.body.get("archive").and_then(Value::as_str).ok_or("备份名称无效")?;
                Ok(json!(restore_backup(&app, archive)?))
            }
            "save_configuration_command" => {
                let config = req
                    .body
                    .get("config")
                    .and_then(Value::as_object)
                    .ok_or("配置格式无效")?;
                validate_configuration(config)?;
                if config.get("databaseMode").and_then(Value::as_str) == Some("external") {
                    let host = config
                        .get("databaseHost")
                        .and_then(Value::as_str)
                        .map(str::trim)
                        .unwrap_or_default();
                    if !host.is_empty() {
                        let host = validate_host(host, "数据库地址")?;
                        let database_port = config
                            .get("databasePort")
                            .map(|value| port(value, "数据库端口"))
                            .transpose()?
                            .map(|value| value.parse::<u16>().unwrap_or(5432))
                            .unwrap_or(5432);
                        check_remote_endpoint(" PostgreSQL", &host, database_port)?;
                    }
                }
                if config.get("redisMode").and_then(Value::as_str) == Some("external") {
                    let host = config
                        .get("redisHost")
                        .and_then(Value::as_str)
                        .map(str::trim)
                        .unwrap_or_default();
                    if !host.is_empty() {
                        let host = validate_host(host, "Redis 地址")?;
                        let redis_port = config
                            .get("redisPort")
                            .map(|value| port(value, "Redis 端口"))
                            .transpose()?
                            .map(|value| value.parse::<u16>().unwrap_or(6379))
                            .unwrap_or(6379);
                        check_remote_endpoint(" Redis", &host, redis_port)?;
                    }
                }
                let content = fs::read_to_string(env_path(&app)).map_err(|error| error.to_string())?;
                guard_managed_storage_credentials(
                    &content,
                    config,
                    managed_volume_exists("box-local-engine_box-managed-postgres-data"),
                    managed_volume_exists("box-local-engine_box-managed-redis-data"),
                )?;
                let source = configuration_document_for_save(&content, config)?;
                private(&env_path(&app), &source)?;
                generate_runtime_environment(&app)?;
                Ok(Value::Null)
            }
            "start_services" => {
                let scope = req.body.get("scope").and_then(Value::as_str).ok_or("启动范围无效")?;
                services::start(&WebRuntime(&app), scope)?;
                Ok(Value::Null)
            }
            "get_system_status" => {
                let env = parse_env(&fs::read_to_string(env_path(&app)).unwrap_or_default());
                let (mut docker_ready, docker_version, mut docker_message) = docker_check();
                let text = if docker_ready {
                    match compose(&app, &["ps", "--all", "--format", "json"]) {
                        Ok(output) => output,
                        Err(error) => { docker_ready = false; docker_message = format!("无法读取服务状态：{error}"); String::new() }
                    }
                } else {
                    String::new()
                };
                let mut services = services::statuses(&text, &env);
                if !docker_ready { for service in &mut services { service.state = "unknown".into(); } }
                Ok(
                    json!({"dockerReady":docker_ready,"dockerCliAvailable":docker_ready || !docker_message.contains("无法运行 Docker"),"dockerCliVersion":docker_version,"dockerMessage":docker_message,"configured":env_path(&app).is_file(),"allHealthy":services.iter().filter(|service|service.enabled).all(|service|service.running),"services":services,"dataDirectory":app.root}),
                )
            }
            "control_service" => {
                let action = req.body.get("action").and_then(Value::as_str).ok_or("操作名称无效")?;
                let service = req.body.get("service").and_then(Value::as_str).ok_or("服务名称无效")?;
                services::control(&WebRuntime(&app), service, action)?;
                Ok(Value::Null)
            }
            "stop_services" => { services::stop(&WebRuntime(&app))?; Ok(Value::Null) }
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
    if let Some(id) = operation_id {
        match &answer {
            Ok(_) => operations.update(&id, "complete", "操作已完成", 100, true),
            Err(error) => operations.update(&id, "error", error, 100, true),
        }
    }
    match answer {
        Ok(result) => Json(json!({"result":result})).into_response(),
        Err(e) => fail(e),
    }
}
#[tokio::main(flavor = "current_thread")]
async fn main() {
    if env::args().nth(1).as_deref() == Some("--healthcheck") {
        if let Err(error) = run_healthcheck() {
            eprintln!("{error}");
            std::process::exit(1);
        }
        return;
    }
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
        operations: Arc::new(Operations::default()),
        operation_id: None,
        environment_file: env::var("BOX_SERVER_MANAGER_ENV_FILE")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_path.join(".env")),
    });
    initialize_license_storage(&app)
        .expect("unable to initialize the license device file before serving requests");
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
        .route("/api/operations/{id}", get(operation_progress))
        .layer(DefaultBodyLimit::max(512 * 1024 * 1024))
        .fallback_service(ServeDir::new(public_directory()).append_index_html_on_directories(true))
        .layer(middleware::from_fn(security))
        .with_state(app);
    let host = env::var("BOX_SERVER_MANAGER_HOST")
        .unwrap_or_else(|_| "0.0.0.0".into())
        .parse()
        .expect("BOX_SERVER_MANAGER_HOST must be an IP address");
    let port = manager_port();
    let addr = SocketAddr::new(host, port);
    println!("BOX3 Rust server manager listening on {addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), router)
        .await
        .unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn http_command_progress_has_the_same_shape_and_requires_authentication() {
        let app = Arc::new(App {
            root: PathBuf::from("/unused-test-root"),
            token: "fixture-token-with-at-least-32-chars".into(),
            compose_file: PathBuf::from("/unused-test-root/compose.yml"),
            environment_file: PathBuf::from("/unused-test-root/.env"),
            operations: Arc::new(Operations::default()),
            operation_id: None,
        });
        let id = "fixture-operation-0001";
        let mut headers = HeaderMap::new();
        headers.insert(
            header::AUTHORIZATION,
            format!("Bearer {}", app.token).parse().unwrap(),
        );
        headers.insert("x-operation-id", id.parse().unwrap());
        let public_notice = command(
            State(app.clone()),
            Path("get_legal_notices".into()),
            HeaderMap::new(),
            Json(Request {
                body: BTreeMap::new(),
            }),
        )
        .await;
        assert_eq!(public_notice.status(), StatusCode::OK);
        let protected_about = command(
            State(app.clone()),
            Path("get_about_info".into()),
            HeaderMap::new(),
            Json(Request {
                body: BTreeMap::new(),
            }),
        )
        .await;
        assert_eq!(protected_about.status(), StatusCode::UNAUTHORIZED);
        let response = command(
            State(app.clone()),
            Path("get_legal_notices".into()),
            headers.clone(),
            Json(Request {
                body: BTreeMap::new(),
            }),
        )
        .await;
        assert_eq!(response.status(), StatusCode::OK);
        let response = operation_progress(State(app.clone()), Path(id.into()), headers).await;
        let body = axum::body::to_bytes(response.into_body(), 4096)
            .await
            .unwrap();
        let progress: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(
            progress,
            json!({"stage":"complete","message":"操作已完成","percent":100})
        );
        let denied = operation_progress(State(app), Path(id.into()), HeaderMap::new()).await;
        assert_eq!(denied.status(), StatusCode::UNAUTHORIZED);
    }

    const MIGRATION_OWNER: &str = "# owner comment\nBOX_PLAY_PUBLIC_URL=https://play.example/worlds\nBOX_CREATOR_PUBLIC_URL=https://create.example/editor\nBOX_AUTH_PORTAL_PUBLIC_URL=https://auth.example/\nBOX_PLAYER_LOGIN_URL=https://login.example/custom\nBOX_DATABASE_URL=postgres://owner:fixture@db/box?sslmode=require\n";

    #[test]
    fn web_form_preserves_unchanged_migrated_urls_and_external_query() {
        let form = json!({"databaseMode":"external", "publicHost":"play.example", "playNetworkMode":"public",
            "creatorHost":"create.example", "creatorNetworkMode":"public", "playPort":3121,
            "databaseHost":"db", "databasePort":"5432", "databaseName":"box", "databaseUser":"owner", "databasePassword":""});
        let source =
            configuration_document_for_save(MIGRATION_OWNER, form.as_object().unwrap()).unwrap();
        let values = parse_env(&source);
        assert_eq!(
            values["BOX_PLAY_PUBLIC_URL_OVERRIDE"],
            "https://play.example/worlds"
        );
        assert_eq!(
            values["BOX_CREATOR_PUBLIC_URL_OVERRIDE"],
            "https://create.example/editor"
        );
        assert_eq!(values["BOX_DATABASE_QUERY"], "sslmode=require");
        assert_eq!(values["BOX_DATABASE_PASSWORD"], "fixture");
        assert_eq!(
            database_url(&values).unwrap(),
            "postgresql://owner:fixture@db:5432/box?sslmode=require"
        );
        assert!(source.contains("# owner comment"));
    }

    #[test]
    fn web_form_changes_clear_only_affected_overrides_without_recreating_them() {
        for (form, clear_auth) in [
            (
                json!({"publicHost":"new.example", "playNetworkMode":"public", "playPort":4000}),
                true,
            ),
            (json!({"playPort":4000}), false),
        ] {
            let source =
                configuration_document_for_save(MIGRATION_OWNER, form.as_object().unwrap())
                    .unwrap();
            let values = parse_env(&migrate_document(&source).unwrap());
            assert!(!values.contains_key("BOX_PLAY_PUBLIC_URL_OVERRIDE"));
            assert_eq!(
                values.contains_key("BOX_AUTH_PORTAL_PUBLIC_URL_OVERRIDE"),
                !clear_auth
            );
            assert!(values.contains_key("BOX_CREATOR_PUBLIC_URL_OVERRIDE"));
            assert_eq!(
                values["BOX_PLAYER_LOGIN_URL_OVERRIDE"],
                "https://login.example/custom"
            );
        }
    }

    #[test]
    fn web_form_clears_external_query_after_switching_to_managed() {
        let form = json!({"databaseMode":"managed"});
        let source =
            configuration_document_for_save(MIGRATION_OWNER, form.as_object().unwrap()).unwrap();
        let values = parse_env(&source);
        assert_eq!(values["BOX_DATABASE_MODE"], "managed");
        assert!(!values.contains_key("BOX_DATABASE_QUERY"));
        assert!(!database_url(&values).unwrap().contains('?'));
        assert!(!parse_env(&migrate_document(&source).unwrap()).contains_key("BOX_DATABASE_QUERY"));
    }

    #[test]
    fn web_form_preserves_legacy_managed_storage_credentials() {
        let owner = "BOX_DATABASE_MODE=managed\nBOX_DATABASE_NAME=existing_db\nBOX_DATABASE_USER=existing_user\nBOX_DATABASE_PASSWORD=existing_password\nBOX_REDIS_MODE=managed\nREDIS_PASSWORD=existing_redis_password\n";
        let form = json!({"databaseMode":"managed", "redisMode":"managed"});
        let source = configuration_document_for_save(owner, form.as_object().unwrap()).unwrap();
        let values = parse_env(&source);
        assert_eq!(values["BOX_MANAGED_POSTGRES_DATABASE"], "existing_db");
        assert_eq!(values["BOX_MANAGED_POSTGRES_USER"], "existing_user");
        assert_eq!(values["BOX_MANAGED_POSTGRES_PASSWORD"], "existing_password");
        assert_eq!(
            values["BOX_MANAGED_REDIS_PASSWORD"],
            "existing_redis_password"
        );
    }

    #[test]
    fn existing_managed_volumes_reject_missing_original_credentials() {
        let postgres = json!({"databaseMode":"managed"});
        let postgres_error = guard_managed_storage_credentials(
            "BOX_DATABASE_MODE=managed\n",
            postgres.as_object().unwrap(),
            true,
            false,
        )
        .unwrap_err();
        assert!(postgres_error.contains("已有内置 PostgreSQL 数据"));

        let redis = json!({"redisMode":"managed"});
        let redis_error = guard_managed_storage_credentials(
            "BOX_REDIS_MODE=managed\n",
            redis.as_object().unwrap(),
            false,
            true,
        )
        .unwrap_err();
        assert!(redis_error.contains("已有内置 Redis 数据"));
    }

    struct MigrationFixture(App);
    impl MigrationFixture {
        fn new(source: &str) -> Self {
            let root = std::env::temp_dir().join(format!("box-web-migration-{}", random_hex(12)));
            fs::create_dir(&root).unwrap();
            fs::write(root.join(".env"), source).unwrap();
            Self(App {
                environment_file: root.join(".env"),
                compose_file: root.join("compose.yml"),
                root,
                token: "fixture-token-not-used-for-network".into(),
                operations: Arc::new(Operations::default()),
                operation_id: None,
            })
        }
    }
    impl Drop for MigrationFixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0.root);
        }
    }

    #[test]
    fn web_runtime_persists_migration_after_successful_derivation() {
        let fixture = MigrationFixture::new(MIGRATION_OWNER);
        let path = generate_runtime_environment(&fixture.0).unwrap();
        let owner = fs::read_to_string(env_path(&fixture.0)).unwrap();
        assert_eq!(owner, migrate_document(MIGRATION_OWNER).unwrap());
        let runtime = parse_env(&fs::read_to_string(path).unwrap());
        assert_eq!(
            runtime["BOX_PLAY_PUBLIC_URL"],
            "https://play.example/worlds"
        );
        assert_eq!(runtime["BOX_CREATOR_BIND_IP"], "0.0.0.0");
        assert_eq!(
            runtime["BOX_PLAYER_LOGIN_URL"],
            "https://login.example/custom"
        );
        assert_eq!(
            runtime["BOX_DATABASE_URL"],
            "postgresql://owner:fixture@db:5432/box?sslmode=require"
        );
        generate_runtime_environment(&fixture.0).unwrap();
        assert_eq!(fs::read_to_string(env_path(&fixture.0)).unwrap(), owner);
    }

    #[test]
    fn web_runtime_failure_leaves_unmigrated_owner_untouched() {
        let invalid = format!("{MIGRATION_OWNER}BOX_PLAY_PORT=3123\n");
        let fixture = MigrationFixture::new(&invalid);
        assert!(generate_runtime_environment(&fixture.0).is_err());
        assert_eq!(fs::read_to_string(env_path(&fixture.0)).unwrap(), invalid);
        assert!(!runtime_env_path(&fixture.0).exists());
        let fixture = MigrationFixture::new(MIGRATION_OWNER);
        fs::create_dir(runtime_env_path(&fixture.0)).unwrap();
        fs::write(runtime_env_path(&fixture.0).join("owner-data"), "keep").unwrap();
        assert!(generate_runtime_environment(&fixture.0).is_err());
        assert_eq!(
            fs::read_to_string(env_path(&fixture.0)).unwrap(),
            MIGRATION_OWNER
        );
    }

    #[test]
    fn compose_uses_host_bind_paths_instead_of_container_workspace_paths() {
        let mounts = json!([
            {"Type":"bind","Source":"/opt/box","Destination":"/workspace"},
            {"Type":"bind","Source":"/other","Destination":"/unrelated"}
        ]);
        assert_eq!(
            mapped_host_root(FsPath::new("/workspace"), &mounts).unwrap(),
            PathBuf::from("/opt/box")
        );
        assert_eq!(
            mapped_host_root(FsPath::new("/workspace/sub"), &mounts).unwrap(),
            PathBuf::from("/opt/box/sub")
        );
        assert!(mapped_host_root(FsPath::new("/missing"), &mounts).is_err());
    }

    #[test]
    fn environment_ignores_comments_and_updates_spaced_keys() {
        let source = "# EXAMPLE=value\nBOX_PLAY_PORT = 3121\n";
        assert!(!parse_env(source).contains_key("# EXAMPLE"));
        let updated = set_env(source.into(), "BOX_PLAY_PORT", "4000").unwrap();
        assert_eq!(updated, "# EXAMPLE=value\nBOX_PLAY_PORT=4000\n");
    }

    #[test]
    fn environment_replacement_is_key_scoped_and_keeps_a_final_newline() {
        let output = set_env(
            "BOX_PLAY_PORT=3121\nOTHER=value\n".into(),
            "BOX_PLAY_PORT",
            "4000",
        )
        .unwrap();
        assert_eq!(output, "BOX_PLAY_PORT=4000\nOTHER=value\n");
        assert_eq!(
            set_env(output, "NEW_VALUE", "yes").unwrap(),
            "BOX_PLAY_PORT=4000\nOTHER=value\nNEW_VALUE=yes\n"
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
    fn license_payload_parses_camel_case_tokens() {
        // Regression: without #[serde(rename_all = "camelCase")] every signed
        // license failed to deserialize and the Web console reported it invalid.
        let payload = br#"{"formatVersion":1,"licenseId":"lic_a","type":"personal-learning",
            "holderId":"device_a","deviceId":"dev_a","issuedAt":"2026-09-10T07:36:54.957Z",
            "expiresAt":"2026-10-10T06:50:00.000Z",
            "features":["creator","play","voxa","player-service","player-auth-portal"],
            "commercialUse":false,"version":1}"#;
        let parsed: LicensePayload = serde_json::from_slice(payload).unwrap();
        assert_eq!(parsed.format_version, 1);
        assert_eq!(parsed.license_id, "lic_a");
        assert_eq!(parsed.license_type, "personal-learning");
        assert_eq!(parsed.device_id, "dev_a");
        assert!(!parsed.commercial_use);
        assert_eq!(parsed.features.len(), 5);
    }

    #[test]
    fn private_file_replaces_only_empty_docker_directory_placeholders() {
        let root = std::env::temp_dir().join(format!(
            "box-private-placeholder-{}-{}",
            std::process::id(),
            random_hex(6)
        ));
        fs::create_dir_all(&root).unwrap();
        let empty = root.join("device-id");
        fs::create_dir(&empty).unwrap();
        private(&empty, "device").unwrap();
        assert_eq!(fs::read_to_string(&empty).unwrap(), "device");

        let nonempty = root.join("license.boxlic");
        fs::create_dir(&nonempty).unwrap();
        fs::write(nonempty.join("keep"), "owner data").unwrap();
        assert!(private(&nonempty, "license").is_err());
        assert_eq!(
            fs::read_to_string(nonempty.join("keep")).unwrap(),
            "owner data"
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn startup_initialization_creates_the_device_file_before_containers_start() {
        let root = std::env::temp_dir().join(format!(
            "box-startup-license-device-{}-{}",
            std::process::id(),
            random_hex(6)
        ));
        fs::create_dir_all(&root).unwrap();
        let app = App {
            root: root.clone(),
            token: "fixture-token-with-at-least-32-chars".into(),
            compose_file: root.join("compose.yml"),
            environment_file: root.join(".env"),
            operations: Arc::new(Operations::default()),
            operation_id: None,
        };
        let hardware = root.join("machine-id");
        fs::write(&hardware, "fixture-machine-id\n").unwrap();
        std::env::set_var("BOX_LICENSE_HARDWARE_ID_FILE", &hardware);
        initialize_license_storage(&app).unwrap();
        std::env::remove_var("BOX_LICENSE_HARDWARE_ID_FILE");
        let device = root.join("license/device-id");
        assert!(device.is_file());
        assert!(fs::read_to_string(&device).unwrap().starts_with("dev_"));
        #[cfg(unix)]
        {
            use std::os::unix::fs::MetadataExt;
            let inode = fs::metadata(&device).unwrap().ino();
            std::env::set_var("BOX_LICENSE_HARDWARE_ID_FILE", &hardware);
            initialize_license_storage(&app).unwrap();
            std::env::remove_var("BOX_LICENSE_HARDWARE_ID_FILE");
            assert_eq!(fs::metadata(&device).unwrap().ino(), inode);
        }
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn database_url_prefers_fields_and_falls_back_to_stored_url() {
        let mut managed = BTreeMap::new();
        managed.insert("BOX_DATABASE_MODE".to_string(), "managed".to_string());
        managed.insert("BOX_DATABASE_NAME".to_string(), "box".to_string());
        managed.insert("BOX_DATABASE_USER".to_string(), "box".to_string());
        managed.insert("BOX_DATABASE_PASSWORD".to_string(), "secret".to_string());
        assert_eq!(
            database_url(&managed).unwrap(),
            "postgresql://box:secret@managed-postgres:5432/box"
        );
        let mut external = BTreeMap::new();
        external.insert(
            "BOX_DATABASE_URL".to_string(),
            "postgresql://box:pw@db.example:5432/box".to_string(),
        );
        assert_eq!(
            database_url(&external).unwrap(),
            "postgresql://box:pw@db.example:5432/box"
        );
        assert!(database_url(&BTreeMap::new()).is_err());
    }

    #[test]
    fn runtime_catalog_returns_empty_collections_for_empty_deployment_data() {
        let root = std::env::temp_dir().join(format!("box-runtime-catalog-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        let app = App {
            root: root.clone(),
            token: "x".repeat(32),
            compose_file: root.join("compose.yml"),
            operations: Arc::new(Operations::default()),
            operation_id: None,
            environment_file: root.join(".env"),
        };
        assert_eq!(runtime_catalog(&app), json!({"creator":[],"play":[]}));
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn runtime_status_does_not_wait_for_a_keep_alive_socket_to_close() {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let _ = stream.read(&mut request).unwrap();
            stream
                .write_all(
                    b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 17\r\nConnection: keep-alive\r\n\r\n{\"phase\":\"ready\"}",
                )
                .unwrap();
            std::thread::sleep(Duration::from_millis(1500));
        });
        let status = runtime_status("127.0.0.1", port, "project-id", "");
        assert_eq!(status["phase"], "ready");
        server.join().unwrap();
    }

    #[test]
    fn chunked_runtime_status_body_decodes_before_json_parsing() {
        assert_eq!(
            decode_chunked_body(b"11\r\n{\"phase\":\"ready\"}\r\n0\r\n\r\n"),
            Some(b"{\"phase\":\"ready\"}".to_vec())
        );
    }
}
