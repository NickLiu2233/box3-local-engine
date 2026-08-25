use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    net::{IpAddr, TcpListener, TcpStream, ToSocketAddrs},
    path::{Path, PathBuf},
    process::Command,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

#[path = "config.rs"]
mod config;
#[path = "docker.rs"]
mod docker;

use config::{
    compose_path, detect_lan_ip, ensure_runtime_files, env_path, parse_env, random_hex, remove_env,
    resolve_secret, runtime_env_path, runtime_root, set_env, validate_raw_environment,
    write_private_file, IMAGE_TAG, SERVICE_NAMES,
};
use docker::{
    command as docker_command, hide_window, output as docker_output, run_command,
    unavailable_message as docker_message,
};

const ENV_TEMPLATE: &str = include_str!("../defaults.env");
const IMAGE_INFO: &str = include_str!("../payload/IMAGE-INFO.json");
const PROJECT_NAME: &str = "box-local-engine";
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OfflineImageManifest {
    format_version: u8,
    archive: String,
    sha256: String,
    image_tag: String,
    platform: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AboutInfo {
    application_version: String,
    image_tag: String,
    source_revision: String,
    build_created_at: String,
    build_source: String,
    platform: String,
    architecture: String,
    license: String,
    service_images: Vec<ServiceImageInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceImageInfo {
    name: String,
    image: String,
    tag: String,
    platform: String,
    image_id: String,
    created_at: String,
    source_revision: String,
    build_source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmbeddedImageInfo {
    images: Vec<EmbeddedServiceImageInfo>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EmbeddedServiceImageInfo {
    image: String,
    tag: String,
    image_id: String,
    created_at: String,
    platform: String,
    source_revision: String,
    build_source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LegalNotices {
    license_name: String,
    license_text: String,
}

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
struct ServicePerformance {
    name: String,
    enabled: bool,
    running: bool,
    cpu_percent: f64,
    memory_usage: String,
    memory_limit: String,
    memory_percent: f64,
    pids: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct PerformanceStatus {
    sampled_at: u128,
    services: Vec<ServicePerformance>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupInfo {
    name: String,
    path: String,
    size_bytes: u64,
    modified_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct EnvironmentCheck {
    id: String,
    label: String,
    level: String,
    message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConnectionTest {
    ok: bool,
    message: String,
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
    has_permission_token_secret: bool,
    has_player_auth_api_key: bool,
    has_play_admin_token: bool,
    redis_host: String,
    redis_port: String,
    has_redis_password: bool,
    redis_db: u8,
    storage_cache_redis_db: u8,
    auto_backup_enabled: bool,
    auto_backup_interval_minutes: u32,
    auto_backup_retention_count: u32,
    auto_backup_retention_days: u32,
    public_host: String,
    creator_host: String,
    lan_ip: String,
    play_port: u16,
    voxa_port: u16,
    creator_port: u16,
    player_service_port: u16,
    auth_portal_port: u16,
    play_runtimes: u32,
    creator_edit_runtimes: u32,
    creator_play_runtimes: u32,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnerSecretsView {
    permission_token_secret: String,
    player_auth_api_key: String,
    play_admin_token: String,
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
            has_permission_token_secret: false,
            has_player_auth_api_key: false,
            has_play_admin_token: false,
            redis_host: String::new(),
            redis_port: "6379".into(),
            has_redis_password: false,
            redis_db: 0,
            storage_cache_redis_db: 1,
            auto_backup_enabled: false,
            auto_backup_interval_minutes: 60,
            auto_backup_retention_count: 24,
            auto_backup_retention_days: 30,
            public_host: "127.0.0.1".into(),
            creator_host: "127.0.0.1".into(),
            lan_ip: detect_lan_ip().unwrap_or_default(),
            play_port: 3000,
            voxa_port: 3001,
            creator_port: 3002,
            player_service_port: 3213,
            auth_portal_port: 3214,
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
    permission_token_secret: String,
    #[serde(default)]
    player_auth_api_key: String,
    #[serde(default)]
    play_admin_token: String,
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
    #[serde(default)]
    auto_backup_enabled: bool,
    #[serde(default = "default_auto_backup_interval_minutes")]
    auto_backup_interval_minutes: u32,
    #[serde(default = "default_auto_backup_retention_count")]
    auto_backup_retention_count: u32,
    #[serde(default = "default_auto_backup_retention_days")]
    auto_backup_retention_days: u32,
    #[serde(default = "default_public_host")]
    public_host: String,
    #[serde(default = "default_creator_host")]
    creator_host: String,
    #[serde(default = "default_play_port")]
    play_port: u16,
    #[serde(default = "default_voxa_port")]
    voxa_port: u16,
    #[serde(default = "default_creator_port")]
    creator_port: u16,
    #[serde(default = "default_player_service_port")]
    player_service_port: u16,
    #[serde(default = "default_auth_portal_port")]
    auth_portal_port: u16,
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
fn default_auto_backup_interval_minutes() -> u32 {
    60
}
fn default_auto_backup_retention_count() -> u32 {
    24
}
fn default_auto_backup_retention_days() -> u32 {
    30
}
fn default_public_host() -> String {
    "127.0.0.1".into()
}
fn default_creator_host() -> String {
    "127.0.0.1".into()
}
fn default_play_port() -> u16 {
    3000
}
fn default_voxa_port() -> u16 {
    3001
}
fn default_creator_port() -> u16 {
    3002
}
fn default_player_service_port() -> u16 {
    3213
}
fn default_auth_portal_port() -> u16 {
    3214
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

fn compose_output(app: &AppHandle, args: &[&str]) -> Result<String, String> {
    ensure_runtime_files(app)?;
    let root = runtime_root(app)?;
    // Regenerate on every invocation. The owner can edit .env directly, but
    // Docker only ever consumes the policy-checked derived configuration.
    generate_runtime_environment(app)?;
    let env = runtime_env_path(app)?;
    let compose = compose_path(app)?;
    let mut command = docker_command();
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

fn validate_creator_host(value: &str) -> Result<String, String> {
    let host = validate_host(value, "创作端访问地址")?;
    if matches!(host.as_str(), "localhost" | "127.0.0.1" | "::1") {
        return Ok(host);
    }
    let ip = host
        .parse::<IpAddr>()
        .map_err(|_| "创作端只允许填写本机或局域网 IP，不能使用公网 IP 或域名".to_string())?;
    let private = match ip {
        IpAddr::V4(ip) => ip.is_private() || ip.is_loopback() || ip.is_link_local(),
        IpAddr::V6(ip) => {
            ip.is_loopback() || ip.is_unicast_link_local() || (ip.segments()[0] & 0xfe00) == 0xfc00
        }
    };
    if private {
        Ok(host)
    } else {
        Err("创作端只允许本机或局域网地址，禁止公网部署".into())
    }
}

fn host_from_http_url(value: &str) -> Option<String> {
    let authority = value
        .trim()
        .strip_prefix("http://")
        .or_else(|| value.trim().strip_prefix("https://"))?
        .split('/')
        .next()?;
    if authority.is_empty() || authority.contains('@') {
        return None;
    }
    if let Some(bracketed) = authority.strip_prefix('[') {
        return bracketed
            .split_once(']')
            .map(|(host, _)| host.to_string())
            .filter(|host| !host.is_empty());
    }
    match authority.rsplit_once(':') {
        Some((host, port)) if port.parse::<u16>().is_ok() => Some(host.to_string()),
        Some(_) => None,
        None => Some(authority.to_string()),
    }
}

fn origin_host(host: &str) -> String {
    if host.contains(':') {
        format!("[{host}]")
    } else {
        host.to_string()
    }
}

fn env_port(values: &BTreeMap<String, String>, key: &str, fallback: u16) -> u16 {
    values
        .get(key)
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port != 0)
        .unwrap_or(fallback)
}

const GENERATED_ENV_KEYS: [&str; 16] = [
    "COMPOSE_PROFILES",
    "BOX_IMAGE_TAG",
    "BOX_PLAY_PLATFORM",
    "BOX_BIND_IP",
    "BOX_CREATOR_BIND_IP",
    "BOX_VOXA_BIND_IP",
    "BOX_PLAY_PUBLIC_URL",
    "BOX_VOXA_PUBLIC_URL",
    "BOX_CREATOR_PUBLIC_URL",
    "BOX_PLAYER_SERVICE_PUBLIC_URL",
    "BOX_AUTH_PORTAL_PUBLIC_URL",
    "BOX_PLAYER_LOGIN_URL",
    "BOX_PLAYER_AUTH_ALLOWED_ORIGINS",
    "BOX_CREATOR_ALLOWED_HOSTS",
    "BOX_VOXA_ALLOWED_ORIGINS",
    "BOX_RESOURCE_ALLOWED_ORIGINS",
];

fn decode_database_url_component(value: &str) -> Option<String> {
    urlencoding::decode(value)
        .ok()
        .map(|value| value.into_owned())
}

/// Best-effort support for a pre-manager installation that only has the
/// standard DATABASE_URL. The manager itself always writes the clearer split
/// fields, but this prevents an upgrade from silently disabling accounts.
fn legacy_database_url_fields(value: &str) -> Option<(String, String, String, String, String)> {
    let value = value
        .trim()
        .strip_prefix("postgresql://")
        .or_else(|| value.trim().strip_prefix("postgres://"))?;
    let (credentials, authority_and_database) = value.rsplit_once('@')?;
    let (user, password) = credentials.split_once(':')?;
    let authority_and_database = authority_and_database
        .split_once('?')
        .map_or(authority_and_database, |(authority_and_database, _)| {
            authority_and_database
        });
    let (authority, database) = authority_and_database.split_once('/')?;
    let (host, port) = if let Some(bracketed) = authority.strip_prefix('[') {
        let (host, rest) = bracketed.split_once(']')?;
        (host, rest.strip_prefix(':')?)
    } else {
        authority.rsplit_once(':')?
    };
    port.parse::<u16>().ok().filter(|port| *port > 0)?;
    Some((
        host.to_string(),
        port.to_string(),
        decode_database_url_component(database)?,
        decode_database_url_component(user)?,
        decode_database_url_component(password)?,
    ))
}

/// Convert installations created by earlier manager releases to the compact
/// operator configuration. Derived fields are discarded; they are recreated
/// in .runtime.env every time Docker Compose is invoked.
fn normalize_owner_environment(content: &str) -> Result<String, String> {
    let mut normalized = content.to_string();
    let values = parse_env(content);

    let play_host = values
        .get("BOX_PLAY_PUBLIC_HOST")
        .cloned()
        .or_else(|| {
            values
                .get("BOX_PLAY_PUBLIC_URL")
                .and_then(|url| host_from_http_url(url))
        })
        .or_else(|| values.get("BOX_BIND_IP").cloned())
        .filter(|host| validate_host(host, "游玩端访问地址").is_ok())
        .unwrap_or_else(default_public_host);
    let creator_host = values
        .get("BOX_CREATOR_HOST")
        .cloned()
        .or_else(|| {
            values
                .get("BOX_CREATOR_PUBLIC_URL")
                .and_then(|url| host_from_http_url(url))
        })
        .or_else(|| values.get("BOX_CREATOR_BIND_IP").cloned())
        .filter(|host| validate_creator_host(host).is_ok())
        .unwrap_or_else(default_creator_host);

    set_env(&mut normalized, "BOX_PLAY_PUBLIC_HOST", &play_host)?;
    set_env(&mut normalized, "BOX_CREATOR_HOST", &creator_host)?;

    // Old versions duplicated the database password in five manager-only
    // variables. Move it to the standard database fields once and remove the
    // duplicate copies.
    for (target, legacy) in [
        ("BOX_DATABASE_HOST", "BOX_DEPLOYMENT_MANAGER_DATABASE_HOST"),
        ("BOX_DATABASE_PORT", "BOX_DEPLOYMENT_MANAGER_DATABASE_PORT"),
        ("BOX_DATABASE_NAME", "BOX_DEPLOYMENT_MANAGER_DATABASE_NAME"),
        ("BOX_DATABASE_USER", "BOX_DEPLOYMENT_MANAGER_DATABASE_USER"),
        (
            "BOX_DATABASE_PASSWORD",
            "BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD",
        ),
    ] {
        if !values.contains_key(target) {
            if let Some(value) = values.get(legacy) {
                set_env(&mut normalized, target, value)?;
            }
        }
        remove_env(&mut normalized, legacy);
    }
    let has_database_fields = [
        "BOX_DATABASE_HOST",
        "BOX_DATABASE_PORT",
        "BOX_DATABASE_NAME",
        "BOX_DATABASE_USER",
        "BOX_DATABASE_PASSWORD",
    ]
    .iter()
    .any(|key| values.get(*key).is_some_and(|value| !value.is_empty()));
    if !has_database_fields {
        if let Some((host, port, database, user, password)) = values
            .get("BOX_DATABASE_URL")
            .and_then(|value| legacy_database_url_fields(value))
        {
            set_env(&mut normalized, "BOX_DATABASE_HOST", &host)?;
            set_env(&mut normalized, "BOX_DATABASE_PORT", &port)?;
            set_env(&mut normalized, "BOX_DATABASE_NAME", &database)?;
            set_env(&mut normalized, "BOX_DATABASE_USER", &user)?;
            set_env(&mut normalized, "BOX_DATABASE_PASSWORD", &password)?;
        }
    }
    for key in GENERATED_ENV_KEYS {
        remove_env(&mut normalized, key);
    }
    // Compose already supplies these defaults. Keep a value only when the
    // owner intentionally changed it as an advanced override.
    for (key, default) in [
        ("BOX_DATABASE_SCHEMA", "box_engine"),
        ("BOX_IDENTITY_DATABASE_SCHEMA", "box_identity"),
        ("BOX_DATABASE_POOL_SIZE", "10"),
        ("BOX_DATABASE_SSL_REJECT_UNAUTHORIZED", "true"),
        ("STORAGE_CACHE_REDIS_TTL", "240"),
        ("BOX_RUNTIME_IDLE_TIMEOUT_MS", "900000"),
        ("BOX_TRUST_PROXY", "false"),
    ] {
        if values.get(key).is_some_and(|value| value == default) {
            remove_env(&mut normalized, key);
        }
    }
    // This contains the same credential as the split configuration above and
    // belongs only in the generated runtime file.
    remove_env(&mut normalized, "BOX_DATABASE_URL");
    remove_env(&mut normalized, "BOX_PLAYER_SERVICE_INTERNAL_URL");
    Ok(normalized)
}

/// Creator and VOXA are deliberately constrained to loopback or a private
/// network address. This is applied after raw editing too, so changing a
/// derived variable can never bypass the deployment policy.
fn enforce_creator_network_policy(app: &AppHandle) -> Result<bool, String> {
    let path = env_path(app)?;
    if !path.exists() {
        return Ok(false);
    }
    let original =
        fs::read_to_string(&path).map_err(|error| format!("无法读取部署配置：{error}"))?;
    let normalized = normalize_owner_environment(&original)?;
    if normalized != original {
        write_private_file(&path, normalized, "部署配置")?;
        return Ok(true);
    }
    Ok(false)
}

fn database_url(values: &BTreeMap<String, String>) -> Result<String, String> {
    let host = values
        .get("BOX_DATABASE_HOST")
        .map(|value| value.trim())
        .unwrap_or_default();
    if host.is_empty() {
        return Err("必须配置 PostgreSQL 数据库地址后才能启动服务".into());
    }
    let host = validate_host(host, "数据库地址")?;
    let port = validate_port(
        values
            .get("BOX_DATABASE_PORT")
            .map(String::as_str)
            .unwrap_or("5432"),
    )?;
    let database = values
        .get("BOX_DATABASE_NAME")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or("启用 PostgreSQL 时，数据库名不能为空")?;
    let user = values
        .get("BOX_DATABASE_USER")
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .ok_or("启用 PostgreSQL 时，数据库账号不能为空")?;
    let password = values
        .get("BOX_DATABASE_PASSWORD")
        .map(String::as_str)
        .filter(|value| !value.is_empty())
        .ok_or("启用 PostgreSQL 时，数据库密码不能为空")?;
    let host = if host.contains(':') && !host.starts_with('[') {
        format!("[{host}]")
    } else {
        host
    };
    Ok(format!(
        "postgresql://{}:{}@{}:{}/{}",
        urlencoding::encode(user),
        urlencoding::encode(password),
        host,
        port,
        urlencoding::encode(database)
    ))
}

fn generate_runtime_environment(app: &AppHandle) -> Result<BTreeMap<String, String>, String> {
    ensure_runtime_files(app)?;
    enforce_creator_network_policy(app)?;
    let owner_path = env_path(app)?;
    if !owner_path.exists() {
        return Err("尚未完成安装配置".into());
    }
    let owner =
        fs::read_to_string(&owner_path).map_err(|error| format!("无法读取部署配置：{error}"))?;
    let owner_values = parse_env(&owner);
    let play_host = owner_values
        .get("BOX_PLAY_PUBLIC_HOST")
        .map(String::as_str)
        .map(|host| validate_host(host, "游玩端访问地址"))
        .transpose()?
        .unwrap_or_else(default_public_host);
    let creator_host = owner_values
        .get("BOX_CREATOR_HOST")
        .map(String::as_str)
        .map(validate_creator_host)
        .transpose()?
        .unwrap_or_else(default_creator_host);
    let play_port = env_port(&owner_values, "BOX_PLAY_PORT", default_play_port());
    let voxa_port = env_port(&owner_values, "BOX_VOXA_PORT", default_voxa_port());
    let creator_port = env_port(&owner_values, "BOX_CREATOR_PORT", default_creator_port());
    let player_service_port = env_port(
        &owner_values,
        "BOX_PLAYER_SERVICE_PORT",
        default_player_service_port(),
    );
    let auth_portal_port = env_port(
        &owner_values,
        "BOX_AUTH_PORTAL_PORT",
        default_auth_portal_port(),
    );
    let play_bind_ip = if matches!(play_host.as_str(), "127.0.0.1" | "localhost" | "::1") {
        "127.0.0.1"
    } else {
        "0.0.0.0"
    };
    let creator_bind_ip = if matches!(creator_host.as_str(), "127.0.0.1" | "localhost" | "::1") {
        "127.0.0.1"
    } else {
        creator_host.as_str()
    };
    let play_origin_host = origin_host(&play_host);
    let creator_origin_host = origin_host(&creator_host);
    let database_url = database_url(&owner_values)?;
    let mut runtime = owner;
    set_env(
        &mut runtime,
        "COMPOSE_PROFILES",
        "player-service,auth-portal,creator,play,voxa",
    )?;
    set_env(&mut runtime, "BOX_IMAGE_TAG", IMAGE_TAG)?;
    set_env(
        &mut runtime,
        "BOX_PLAY_PLATFORM",
        if cfg!(target_arch = "aarch64") {
            "linux/arm64"
        } else {
            "linux/amd64"
        },
    )?;
    set_env(&mut runtime, "BOX_BIND_IP", play_bind_ip)?;
    set_env(&mut runtime, "BOX_CREATOR_BIND_IP", creator_bind_ip)?;
    set_env(&mut runtime, "BOX_VOXA_BIND_IP", creator_bind_ip)?;
    set_env(&mut runtime, "BOX_PLAY_PORT", &play_port.to_string())?;
    set_env(&mut runtime, "BOX_VOXA_PORT", &voxa_port.to_string())?;
    set_env(&mut runtime, "BOX_CREATOR_PORT", &creator_port.to_string())?;
    set_env(
        &mut runtime,
        "BOX_PLAYER_SERVICE_PORT",
        &player_service_port.to_string(),
    )?;
    set_env(
        &mut runtime,
        "BOX_AUTH_PORTAL_PORT",
        &auth_portal_port.to_string(),
    )?;
    set_env(
        &mut runtime,
        "BOX_PLAY_PUBLIC_URL",
        &format!("http://{play_origin_host}:{play_port}"),
    )?;
    set_env(
        &mut runtime,
        "BOX_VOXA_PUBLIC_URL",
        &format!("http://{creator_origin_host}:{voxa_port}"),
    )?;
    set_env(
        &mut runtime,
        "BOX_CREATOR_PUBLIC_URL",
        &format!("http://{creator_origin_host}:{creator_port}"),
    )?;
    set_env(
        &mut runtime,
        "BOX_PLAYER_SERVICE_PUBLIC_URL",
        &format!("http://{play_origin_host}:{player_service_port}"),
    )?;
    set_env(
        &mut runtime,
        "BOX_AUTH_PORTAL_PUBLIC_URL",
        &format!("http://{play_origin_host}:{auth_portal_port}"),
    )?;
    let login_url = format!("http://{play_origin_host}:{auth_portal_port}");
    set_env(&mut runtime, "BOX_PLAYER_LOGIN_URL", &login_url)?;
    let creator_origins = format!(
        "http://{creator_origin_host}:{voxa_port},http://{creator_origin_host}:{creator_port}"
    );
    set_env(&mut runtime, "BOX_VOXA_ALLOWED_ORIGINS", &creator_origins)?;
    set_env(
        &mut runtime,
        "BOX_RESOURCE_ALLOWED_ORIGINS",
        &creator_origins,
    )?;
    set_env(&mut runtime, "BOX_CREATOR_ALLOWED_HOSTS", &creator_host)?;
    set_env(
        &mut runtime,
        "BOX_PLAYER_AUTH_ALLOWED_ORIGINS",
        &format!(
            "http://{play_origin_host}:{play_port},http://{creator_origin_host}:{creator_port},http://{play_origin_host}:{auth_portal_port}"
        ),
    )?;
    set_env(&mut runtime, "BOX_DATABASE_URL", &database_url)?;
    set_env(
        &mut runtime,
        "BOX_PLAYER_SERVICE_INTERNAL_URL",
        "http://player-service:3213",
    )?;
    write_private_file(&runtime_env_path(app)?, runtime, "运行时配置")?;
    Ok(owner_values)
}

fn validate_port(value: &str) -> Result<u16, String> {
    value
        .parse::<u16>()
        .map_err(|_| "数据库端口必须是 1-65535 之间的整数".into())
}

fn enabled_services(_values: &BTreeMap<String, String>) -> Vec<&str> {
    SERVICE_NAMES.to_vec()
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

fn configured_ports(config: &InstallConfigInput) -> [(String, u16); 5] {
    [
        ("Play".into(), config.play_port),
        ("VOXA".into(), config.voxa_port),
        ("Creator".into(), config.creator_port),
        ("玩家管理".into(), config.player_service_port),
        ("登录门户".into(), config.auth_portal_port),
    ]
}

fn validate_service_ports(config: &InstallConfigInput) -> Result<(), String> {
    let ports = configured_ports(config);
    if let Some((label, _)) = ports.iter().find(|(_, port)| *port == 0) {
        return Err(format!("{label} 端口必须在 1 到 65535 之间"));
    }
    for (index, (label, port)) in ports.iter().enumerate() {
        if let Some((other_label, _)) = ports
            .iter()
            .skip(index + 1)
            .find(|(_, other)| other == port)
        {
            return Err(format!(
                "{label} 与 {other_label} 不能使用同一个端口 {port}"
            ));
        }
    }
    Ok(())
}

fn validate_auto_backup_config(config: &InstallConfigInput) -> Result<(), String> {
    if !(1..=10_080).contains(&config.auto_backup_interval_minutes) {
        return Err("自动备份间隔必须在 1 到 10080 分钟之间".into());
    }
    if !(1..=1_000).contains(&config.auto_backup_retention_count) {
        return Err("每地图备份保留份数必须在 1 到 1000 之间".into());
    }
    if !(1..=3_650).contains(&config.auto_backup_retention_days) {
        return Err("自动备份最长保留天数必须在 1 到 3650 天之间".into());
    }
    Ok(())
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
    let public_host = validate_host(&config.public_host, "公开访问地址")?;
    let creator_host = validate_creator_host(&config.creator_host)?;
    validate_service_ports(config)?;
    validate_auto_backup_config(config)?;
    let existing = load_existing_env(app);
    let existing_file = env_path(app)?;
    let source = if existing_file.exists() {
        fs::read_to_string(&existing_file).map_err(|error| format!("无法读取现有配置：{error}"))?
    } else {
        ENV_TEMPLATE.to_string()
    };
    let mut content = normalize_owner_environment(&source)?;

    set_env(
        &mut content,
        "PERMISSION_TOKEN_SECRET",
        &resolve_secret(
            "PERMISSION_TOKEN_SECRET",
            &config.permission_token_secret,
            &existing,
        )?,
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_AUTH_API_KEY",
        &resolve_secret(
            "BOX_PLAYER_AUTH_API_KEY",
            &config.player_auth_api_key,
            &existing,
        )?,
    )?;
    set_env(
        &mut content,
        "BOX_PLAY_ADMIN_TOKEN",
        &resolve_secret("BOX_PLAY_ADMIN_TOKEN", &config.play_admin_token, &existing)?,
    )?;
    set_env(&mut content, "BOX_PLAY_LIBRARY_READ_ONLY", "false")?;
    set_env(&mut content, "BOX_PLAY_PUBLIC_HOST", &public_host)?;
    set_env(&mut content, "BOX_CREATOR_HOST", &creator_host)?;
    set_env(&mut content, "BOX_PLAY_PORT", &config.play_port.to_string())?;
    set_env(&mut content, "BOX_VOXA_PORT", &config.voxa_port.to_string())?;
    set_env(
        &mut content,
        "BOX_CREATOR_PORT",
        &config.creator_port.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_SERVICE_PORT",
        &config.player_service_port.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_AUTH_PORTAL_PORT",
        &config.auth_portal_port.to_string(),
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
    let host = validate_host(&config.database_host, "数据库地址")?;
    let port = validate_port(&config.database_port)?;
    let database = config.database_name.trim().to_string();
    let user = config.database_user.trim().to_string();
    if database.is_empty() || user.is_empty() {
        return Err("PostgreSQL 数据库名和账号不能为空".into());
    }
    let password = if config.database_password.is_empty() {
        existing
            .get("BOX_DATABASE_PASSWORD")
            .or_else(|| existing.get("BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD"))
            .cloned()
            .unwrap_or_default()
    } else {
        config.database_password.clone()
    };
    if password.is_empty() {
        return Err("PostgreSQL 数据库密码不能为空".into());
    }
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
    set_env(&mut content, "BOX_DATABASE_HOST", &host)?;
    set_env(&mut content, "BOX_DATABASE_PORT", &port.to_string())?;
    set_env(&mut content, "BOX_DATABASE_NAME", &database)?;
    set_env(&mut content, "BOX_DATABASE_USER", &user)?;
    set_env(&mut content, "BOX_DATABASE_PASSWORD", &password)?;
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
    set_env(
        &mut content,
        "BOX_AUTO_BACKUP_ENABLED",
        if config.auto_backup_enabled {
            "true"
        } else {
            "false"
        },
    )?;
    set_env(
        &mut content,
        "BOX_AUTO_BACKUP_INTERVAL_MINUTES",
        &config.auto_backup_interval_minutes.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_AUTO_BACKUP_RETENTION_COUNT",
        &config.auto_backup_retention_count.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_AUTO_BACKUP_RETENTION_DAYS",
        &config.auto_backup_retention_days.to_string(),
    )?;
    write_private_file(&existing_file, content, "部署配置")?;
    generate_runtime_environment(app)?;
    Ok(())
}

fn offline_archive_search_roots(app: Option<&AppHandle>) -> Vec<PathBuf> {
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
    roots.sort();
    roots.dedup();
    roots
}

fn archive_candidates(app: Option<&AppHandle>) -> Vec<PathBuf> {
    let mut archives = Vec::new();
    for root in offline_archive_search_roots(app) {
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

fn verify_offline_image_archive(app: &AppHandle, archive: &Path) -> Result<String, String> {
    let archive_name = archive
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or("离线镜像归档名称无效")?;
    let expected_platform = if cfg!(target_arch = "aarch64") {
        "linux/arm64"
    } else {
        "linux/amd64"
    };
    let manifest = offline_archive_search_roots(Some(app))
        .into_iter()
        .map(|root| root.join("BOX-OFFLINE-IMAGE.json"))
        .find_map(|path| fs::read_to_string(path).ok())
        .ok_or("离线包缺少完整性清单 BOX-OFFLINE-IMAGE.json，请重新下载完整离线包")?;
    let manifest: OfflineImageManifest = serde_json::from_str(&manifest)
        .map_err(|error| format!("离线镜像完整性清单格式无效：{error}"))?;
    if manifest.format_version != 1
        || manifest.archive != archive_name
        || manifest.image_tag != IMAGE_TAG
        || manifest.platform != expected_platform
        || manifest.sha256.len() != 64
        || !manifest
            .sha256
            .chars()
            .all(|character| character.is_ascii_hexdigit())
    {
        return Err("离线镜像与当前启动器不匹配，请下载同一版本、同一架构的完整离线包".into());
    }
    let actual = file_sha256(archive).map_err(|error| format!("无法校验离线镜像：{error}"))?;
    if !actual.eq_ignore_ascii_case(&manifest.sha256) {
        return Err("离线镜像 SHA-256 校验失败，文件可能损坏或被替换，请重新下载离线包".into());
    }
    Ok(actual)
}

fn synchronize_runtime_image_tag(app: &AppHandle) -> Result<(), String> {
    // The image tag is owned by this application. It is generated into the
    // Docker-only file rather than being persisted in the operator's .env.
    if env_path(app)?.exists() {
        generate_runtime_environment(app)?;
    }
    Ok(())
}

fn ensure_images(app: &AppHandle) -> Result<(), String> {
    synchronize_runtime_image_tag(app)?;
    let tag = IMAGE_TAG;
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
    let archive = archive_candidates(Some(app))
        .into_iter()
        .find(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().contains(expected))
        })
        .ok_or_else(|| format!("未找到 {expected} 离线镜像归档。请重新下载完整离线包。"))?;
    verify_offline_image_archive(app, &archive)?;
    let archive_string = archive.to_string_lossy().to_string();
    docker_output(&["load", "-i", &archive_string])?;
    Ok(())
}

#[tauri::command]
fn get_install_config(app: AppHandle) -> InstallConfigView {
    // Loading configuration is also a policy boundary: a manually edited
    // public Creator address is normalized before it reaches the UI.
    let _ = enforce_creator_network_policy(&app);
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
        database_host: values.get("BOX_DATABASE_HOST").cloned().unwrap_or_default(),
        database_port: values
            .get("BOX_DATABASE_PORT")
            .cloned()
            .unwrap_or_else(default_database_port),
        database_name: values
            .get("BOX_DATABASE_NAME")
            .cloned()
            .unwrap_or_else(default_database_name),
        database_user: values
            .get("BOX_DATABASE_USER")
            .cloned()
            .unwrap_or_else(default_database_user),
        database_ssl: values
            .get("BOX_DATABASE_SSL")
            .is_some_and(|value| value == "true"),
        has_database_password: values
            .get("BOX_DATABASE_PASSWORD")
            .is_some_and(|value| !value.is_empty()),
        has_permission_token_secret: values
            .get("PERMISSION_TOKEN_SECRET")
            .is_some_and(|value| value.len() >= 16),
        has_player_auth_api_key: values
            .get("BOX_PLAYER_AUTH_API_KEY")
            .is_some_and(|value| value.len() >= 16),
        has_play_admin_token: values
            .get("BOX_PLAY_ADMIN_TOKEN")
            .is_some_and(|value| value.len() >= 16),
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
        auto_backup_enabled: values
            .get("BOX_AUTO_BACKUP_ENABLED")
            .is_some_and(|value| matches!(value.as_str(), "1" | "true" | "yes" | "on")),
        auto_backup_interval_minutes: number_u32("BOX_AUTO_BACKUP_INTERVAL_MINUTES", 60),
        auto_backup_retention_count: number_u32("BOX_AUTO_BACKUP_RETENTION_COUNT", 24),
        auto_backup_retention_days: number_u32("BOX_AUTO_BACKUP_RETENTION_DAYS", 30),
        public_host: values
            .get("BOX_PLAY_PUBLIC_HOST")
            .cloned()
            .unwrap_or_else(default_public_host),
        creator_host: values
            .get("BOX_CREATOR_HOST")
            .cloned()
            .unwrap_or_else(default_creator_host),
        lan_ip: detect_lan_ip().unwrap_or_default(),
        play_port: number_u32("BOX_PLAY_PORT", 3000).try_into().unwrap_or(3000),
        voxa_port: number_u32("BOX_VOXA_PORT", 3001).try_into().unwrap_or(3001),
        creator_port: number_u32("BOX_CREATOR_PORT", 3002)
            .try_into()
            .unwrap_or(3002),
        player_service_port: number_u32("BOX_PLAYER_SERVICE_PORT", 3213)
            .try_into()
            .unwrap_or(3213),
        auth_portal_port: number_u32("BOX_AUTH_PORTAL_PORT", 3214)
            .try_into()
            .unwrap_or(3214),
        play_runtimes: number_u32("BOX_PLAY_MAX_RUNTIMES", 8),
        creator_edit_runtimes: number_u32("BOX_CREATOR_EDIT_MAX_RUNTIMES", 6),
        creator_play_runtimes: number_u32("BOX_CREATOR_PLAY_MAX_RUNTIMES", 4),
    }
}

#[tauri::command]
fn get_owner_secrets(app: AppHandle) -> Result<OwnerSecretsView, String> {
    let values = load_existing_env(&app);
    let secret = |name: &str| {
        values
            .get(name)
            .filter(|value| value.len() >= 16)
            .cloned()
            .ok_or_else(|| "服主密钥尚未生成，请先保存一次配置".to_string())
    };
    Ok(OwnerSecretsView {
        permission_token_secret: secret("PERMISSION_TOKEN_SECRET")?,
        player_auth_api_key: secret("BOX_PLAYER_AUTH_API_KEY")?,
        play_admin_token: secret("BOX_PLAY_ADMIN_TOKEN")?,
    })
}

#[tauri::command]
fn get_raw_environment(app: AppHandle) -> Result<String, String> {
    ensure_runtime_files(&app)?;
    enforce_creator_network_policy(&app)?;
    let path = env_path(&app)?;
    if path.exists() {
        fs::read_to_string(path).map_err(|error| format!("无法读取 .env：{error}"))
    } else {
        Ok(ENV_TEMPLATE.to_string())
    }
}

#[tauri::command]
fn save_raw_environment(app: AppHandle, content: String) -> Result<bool, String> {
    validate_raw_environment(&content)?;
    ensure_runtime_files(&app)?;
    write_private_file(
        &env_path(&app)?,
        format!("{}\n", content.trim_end()),
        ".env",
    )?;
    let normalized = enforce_creator_network_policy(&app)?;
    generate_runtime_environment(&app)?;
    Ok(normalized)
}

#[tauri::command]
fn get_system_status(app: AppHandle) -> SystemStatus {
    let _ = enforce_creator_network_policy(&app);
    let data_directory = runtime_root(&app)
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    let docker = docker_output(&["info", "--format", "{{.ServerVersion}}"]);
    let docker_ready = docker.is_ok();
    let docker_message = docker.unwrap_or_else(docker_message);
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
fn get_about_info() -> AboutInfo {
    let image_platform = if IMAGE_TAG.ends_with("-arm64") {
        "linux/arm64"
    } else if IMAGE_TAG.ends_with("-amd64") {
        "linux/amd64"
    } else {
        "由 Docker 自动选择"
    };
    let embedded_images = serde_json::from_str::<EmbeddedImageInfo>(IMAGE_INFO)
        .unwrap_or(EmbeddedImageInfo { images: vec![] })
        .images;
    let service_images = [
        ("ARENA（创作端）", "box-local-engine-creator"),
        ("VOXA（模型编辑）", "box-local-engine-voxa"),
        ("游玩端", "box-local-engine-play"),
        ("玩家管理", "box-local-engine-player-service"),
        ("登录门户", "box-local-engine-player-auth-portal"),
    ]
    .into_iter()
    .map(|(name, image)| {
        let embedded = embedded_images
            .iter()
            .find(|candidate| candidate.image == image);
        ServiceImageInfo {
            name: name.into(),
            image: image.into(),
            tag: embedded
                .map(|candidate| candidate.tag.clone())
                .unwrap_or_else(|| IMAGE_TAG.into()),
            platform: embedded
                .map(|candidate| candidate.platform.clone())
                .unwrap_or_else(|| image_platform.into()),
            image_id: embedded
                .map(|candidate| candidate.image_id.clone())
                .unwrap_or_else(|| "unknown".into()),
            created_at: embedded
                .map(|candidate| candidate.created_at.clone())
                .unwrap_or_else(|| "unknown".into()),
            source_revision: embedded
                .map(|candidate| candidate.source_revision.clone())
                .unwrap_or_else(|| "unknown".into()),
            build_source: embedded
                .map(|candidate| candidate.build_source.clone())
                .unwrap_or_else(|| "unknown".into()),
        }
    })
    .collect();

    AboutInfo {
        application_version: env!("CARGO_PKG_VERSION").into(),
        image_tag: IMAGE_TAG.into(),
        source_revision: option_env!("BOX_BUILD_COMMIT").unwrap_or("unknown").into(),
        build_created_at: option_env!("BOX_BUILD_DATE").unwrap_or("unknown").into(),
        build_source: option_env!("BOX_BUILD_SOURCE").unwrap_or("local").into(),
        platform: std::env::consts::OS.into(),
        architecture: std::env::consts::ARCH.into(),
        license: "非商业本地部署许可".into(),
        service_images,
    }
}

#[tauri::command]
fn get_legal_notices() -> LegalNotices {
    LegalNotices {
        license_name: "BOX3 Engine 非商业本地部署最终用户许可协议".into(),
        license_text: include_str!("../../../../distribution/LICENSE.txt").into(),
    }
}

fn parse_percentage(value: Option<&Value>) -> f64 {
    value
        .and_then(Value::as_str)
        .unwrap_or_default()
        .trim_end_matches('%')
        .trim()
        .parse()
        .unwrap_or(0.0)
}

fn split_memory_usage(value: Option<&Value>) -> (String, String) {
    let usage = value.and_then(Value::as_str).unwrap_or_default();
    let mut parts = usage.splitn(2, '/').map(str::trim);
    (
        parts.next().unwrap_or("0 B").to_string(),
        parts.next().unwrap_or("—").to_string(),
    )
}

#[tauri::command]
async fn get_performance_status(app: AppHandle) -> Result<PerformanceStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        docker_output(&["info", "--format", "{{.ServerVersion}}"]).map_err(docker_message)?;
        let environment = load_existing_env(&app);
        let enabled = enabled_services(&environment);
        let mut services: Vec<ServicePerformance> = SERVICE_NAMES
            .iter()
            .map(|name| ServicePerformance {
                name: (*name).into(),
                enabled: enabled.contains(name),
                running: false,
                cpu_percent: 0.0,
                memory_usage: "0 B".into(),
                memory_limit: "—".into(),
                memory_percent: 0.0,
                pids: 0,
            })
            .collect();

        if env_path(&app).is_ok_and(|path| path.exists()) {
            let compose = compose_output(&app, &["ps", "--format", "json"])?;
            let containers: Vec<Value> = serde_json::from_str(&compose).unwrap_or_else(|_| {
                compose
                    .lines()
                    .filter_map(|line| serde_json::from_str(line).ok())
                    .collect()
            });
            let mut running_containers = Vec::new();
            for container in containers {
                let name = container
                    .get("Service")
                    .or_else(|| container.get("service"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                let state = container
                    .get("State")
                    .or_else(|| container.get("state"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                let id = container
                    .get("ID")
                    .or_else(|| container.get("Id"))
                    .or_else(|| container.get("id"))
                    .and_then(Value::as_str)
                    .unwrap_or_default();
                if let Some(service) = services.iter_mut().find(|service| service.name == name) {
                    service.running = state.eq_ignore_ascii_case("running");
                    if service.running && !id.is_empty() {
                        running_containers.push((id.to_string(), name.to_string()));
                    }
                }
            }
            if !running_containers.is_empty() {
                let mut args = vec!["stats", "--no-stream", "--format", "{{json .}}"];
                args.extend(running_containers.iter().map(|(id, _)| id.as_str()));
                let stats = docker_output(&args)?;
                for value in stats
                    .lines()
                    .filter_map(|line| serde_json::from_str::<Value>(line).ok())
                {
                    let stats_id = value
                        .get("ID")
                        .or_else(|| value.get("Container"))
                        .and_then(Value::as_str)
                        .unwrap_or_default();
                    let Some((_, service_name)) = running_containers
                        .iter()
                        .find(|(id, _)| id.starts_with(stats_id) || stats_id.starts_with(id))
                    else {
                        continue;
                    };
                    let Some(service) = services
                        .iter_mut()
                        .find(|service| service.name == *service_name)
                    else {
                        continue;
                    };
                    service.cpu_percent = parse_percentage(value.get("CPUPerc"));
                    service.memory_percent = parse_percentage(value.get("MemPerc"));
                    (service.memory_usage, service.memory_limit) =
                        split_memory_usage(value.get("MemUsage"));
                    service.pids = value
                        .get("PIDs")
                        .and_then(|value| value.as_str().and_then(|value| value.parse().ok()))
                        .or_else(|| value.get("PIDs").and_then(Value::as_u64))
                        .unwrap_or(0);
                }
            }
        }
        Ok(PerformanceStatus {
            sampled_at: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            services,
        })
    })
    .await
    .map_err(|error| format!("性能采样任务异常结束：{error}"))?
}

#[tauri::command]
async fn run_environment_checks(
    app: AppHandle,
    config: InstallConfigInput,
) -> Result<Vec<EnvironmentCheck>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut checks = Vec::new();
        match docker_output(&["info", "--format", "{{.ServerVersion}}"]).map_err(docker_message) {
            Ok(version) => checks.push(EnvironmentCheck {
                id: "docker".into(),
                label: "Docker".into(),
                level: "success".into(),
                message: format!("已连接，服务端版本 {version}"),
            }),
            Err(error) => checks.push(EnvironmentCheck {
                id: "docker".into(),
                label: "Docker".into(),
                level: "error".into(),
                message: error,
            }),
        }

        match runtime_root(&app).and_then(|root| {
            let probe = root.join(".write-test");
            fs::write(&probe, b"ok").map_err(|error| format!("无法写入数据目录：{error}"))?;
            fs::remove_file(probe).map_err(|error| format!("无法清理测试文件：{error}"))?;
            Ok(root)
        }) {
            Ok(root) => checks.push(EnvironmentCheck {
                id: "storage".into(),
                label: "数据目录".into(),
                level: "success".into(),
                message: format!("可正常读写：{}", root.display()),
            }),
            Err(error) => checks.push(EnvironmentCheck {
                id: "storage".into(),
                label: "数据目录".into(),
                level: "error".into(),
                message: error,
            }),
        }

        match validate_service_ports(&config) {
            Ok(()) => {
                let running = get_system_status(app.clone())
                    .services
                    .into_iter()
                    .any(|service| service.running);
                let conflicts: Vec<String> = if running {
                    Vec::new()
                } else {
                    configured_ports(&config)
                        .into_iter()
                        .filter_map(|(label, port)| {
                            TcpListener::bind(("0.0.0.0", port))
                                .err()
                                .map(|_| format!("{label} {port}"))
                        })
                        .collect()
                };
                checks.push(EnvironmentCheck {
                    id: "ports".into(),
                    label: "服务端口".into(),
                    level: if conflicts.is_empty() {
                        "success"
                    } else {
                        "error"
                    }
                    .into(),
                    message: if running {
                        "服务正在运行，端口由 BOX 容器正常占用".into()
                    } else if conflicts.is_empty() {
                        "五个端口均可使用且没有重复".into()
                    } else {
                        format!("端口已被占用：{}", conflicts.join("、"))
                    },
                });
            }
            Err(error) => checks.push(EnvironmentCheck {
                id: "ports".into(),
                label: "服务端口".into(),
                level: "error".into(),
                message: error,
            }),
        }

        for (id, label, host, port) in [
            (
                "postgresql",
                "PostgreSQL",
                config.database_host.as_str(),
                config.database_port.as_str(),
            ),
            (
                "redis",
                "Redis",
                config.redis_host.as_str(),
                config.redis_port.as_str(),
            ),
        ] {
            if host.trim().is_empty() {
                checks.push(EnvironmentCheck {
                    id: id.into(),
                    label: label.into(),
                    level: if id == "postgresql" {
                        "error"
                    } else {
                        "neutral"
                    }
                    .into(),
                    message: if id == "postgresql" {
                        "必须配置后才能启动服务".into()
                    } else {
                        "未配置（选填）".into()
                    },
                });
                continue;
            }
            let result = validate_host(host, label).and_then(|host| {
                let port = validate_port(port)?;
                check_remote_endpoint(label, &host, port)
            });
            checks.push(EnvironmentCheck {
                id: id.into(),
                label: label.into(),
                level: if result.is_ok() { "success" } else { "error" }.into(),
                message: result
                    .err()
                    .unwrap_or_else(|| format!("网络可达：{}:{}", host.trim(), port)),
            });
        }
        Ok(checks)
    })
    .await
    .map_err(|error| format!("环境检查任务异常结束：{error}"))?
}

#[tauri::command]
async fn test_remote_connection(
    kind: String,
    host: String,
    port: String,
) -> Result<ConnectionTest, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let label = match kind.as_str() {
            "postgresql" => "PostgreSQL",
            "redis" => "Redis",
            _ => return Err("不支持的连接类型".into()),
        };
        let host = validate_host(&host, label)?;
        let port = validate_port(&port)?;
        check_remote_endpoint(label, &host, port)?;
        Ok(ConnectionTest {
            ok: true,
            message: format!("已连接到 {host}:{port}"),
        })
    })
    .await
    .map_err(|error| format!("连接测试异常结束：{error}"))?
}

fn validate_service_name(service: &str) -> Result<(), String> {
    if SERVICE_NAMES.contains(&service) {
        Ok(())
    } else {
        Err("未知的 BOX 服务".into())
    }
}

#[tauri::command]
async fn control_service(app: AppHandle, service: String, action: String) -> Result<(), String> {
    validate_service_name(&service)?;
    if !["start", "stop", "restart"].contains(&action.as_str()) {
        return Err("不支持的服务操作".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        if action == "start" {
            ensure_images(&app)?;
            // Image archives keep stable release tags.  Without recreation,
            // Compose reuses an existing container and the UI keeps serving its
            // old application layer even after a newer archive was imported.
            compose_output(&app, &["up", "-d", "--force-recreate", &service])?;
        } else {
            compose_output(&app, &[&action, &service])?;
        }
        Ok(())
    })
    .await
    .map_err(|error| format!("服务操作异常结束：{error}"))?
}

#[tauri::command]
async fn get_service_logs(app: AppHandle, service: String) -> Result<String, String> {
    validate_service_name(&service)?;
    tauri::async_runtime::spawn_blocking(move || {
        compose_output(&app, &["logs", "--tail", "300", "--no-color", &service])
    })
    .await
    .map_err(|error| format!("日志任务异常结束：{error}"))?
}

fn is_sensitive_env_key(key: &str) -> bool {
    let key = key.to_ascii_uppercase();
    key.contains("PASSWORD")
        || key.contains("SECRET")
        || key.contains("TOKEN")
        || key.contains("API_KEY")
        || key == "BOX_DATABASE_URL"
}

fn redact_text(mut text: String, values: &BTreeMap<String, String>) -> String {
    for (key, value) in values {
        if is_sensitive_env_key(key) && value.len() >= 4 {
            text = text.replace(value, "[REDACTED]");
        }
    }
    text
}

fn create_diagnostic_zip(source: &Path, destination: &Path) -> Result<(), String> {
    if destination.exists() {
        fs::remove_file(destination).map_err(|error| format!("无法覆盖旧诊断包：{error}"))?;
    }
    #[cfg(target_os = "windows")]
    let command = {
        let mut command = Command::new("powershell");
        let source = source.to_string_lossy().replace('\'', "''");
        let destination = destination.to_string_lossy().replace('\'', "''");
        command.args([
            "-NoProfile",
            "-Command",
            &format!(
                "Compress-Archive -LiteralPath '{source}' -DestinationPath '{destination}' -Force"
            ),
        ]);
        command
    };
    #[cfg(target_os = "macos")]
    let command = {
        let mut command = Command::new("/usr/bin/ditto");
        command.args(["-c", "-k", "--norsrc"]);
        command.arg(source).arg(destination);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let command = {
        let mut command = Command::new("zip");
        command
            .arg("-r")
            .arg(destination)
            .arg(".")
            .current_dir(source);
        command
    };
    run_command(command)?;
    Ok(())
}

fn copy_directory_contents(source: &Path, destination: &Path) -> Result<(), String> {
    fs::create_dir_all(destination).map_err(|error| format!("无法创建备份目录：{error}"))?;
    for entry in fs::read_dir(source).map_err(|error| format!("无法读取数据目录：{error}"))?
    {
        let entry = entry.map_err(|error| format!("无法读取数据目录项：{error}"))?;
        let from = entry.path();
        let to = destination.join(entry.file_name());
        if from.is_dir() {
            copy_directory_contents(&from, &to)?;
        } else {
            copy_file_for_backup(&from, &to)?;
        }
    }
    Ok(())
}

fn copy_file_for_backup(source: &Path, destination: &Path) -> Result<(), String> {
    match fs::copy(source, destination) {
        Ok(_) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::PermissionDenied => {
            #[cfg(unix)]
            {
                // Files created through a bind-mounted container can retain
                // owner-write-only permissions on macOS. The desktop app owns
                // the file but cannot read it until the read bit is restored.
                let original = fs::metadata(source)
                    .map_err(|metadata_error| {
                        format!("无法读取 {}：{metadata_error}", source.display())
                    })?
                    .permissions();
                let mut readable = original.clone();
                readable.set_mode(readable.mode() | 0o400);
                fs::set_permissions(source, readable).map_err(|permission_error| {
                    format!("无法读取 {}：{permission_error}", source.display())
                })?;
                let copied = fs::copy(source, destination)
                    .map(|_| ())
                    .map_err(|copy_error| format!("无法备份 {}：{copy_error}", source.display()));
                fs::set_permissions(source, original).map_err(|restore_error| {
                    format!("无法恢复 {} 的原始权限：{restore_error}", source.display())
                })?;
                copied
            }
            #[cfg(not(unix))]
            {
                Err(format!("无法备份 {}：{error}", source.display()))
            }
        }
        Err(error) => Err(format!("无法备份 {}：{error}", source.display())),
    }
}

fn create_backup_archive(source: &Path, destination: &Path) -> Result<(), String> {
    if destination.exists() {
        fs::remove_file(destination).map_err(|error| format!("无法覆盖旧备份：{error}"))?;
    }
    #[cfg(target_os = "windows")]
    let command = {
        let mut command = Command::new("powershell");
        let source = source.to_string_lossy().replace('\'', "''");
        let destination = destination.to_string_lossy().replace('\'', "''");
        command.args([
            "-NoProfile",
            "-Command",
            &format!(
                "Compress-Archive -Path '{source}\\*' -DestinationPath '{destination}' -Force"
            ),
        ]);
        command
    };
    #[cfg(target_os = "macos")]
    let command = {
        let mut command = Command::new("/usr/bin/ditto");
        command.args(["-c", "-k", "--norsrc"]);
        command.arg(source).arg(destination);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let command = {
        let mut command = Command::new("tar");
        command.args(["-czf"]);
        command.arg(destination).arg("-C").arg(source).arg(".");
        command
    };
    run_command(command)?;
    Ok(())
}

fn extract_backup_archive(archive: &Path, destination: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    let command = {
        let mut command = Command::new("powershell");
        let archive = archive.to_string_lossy().replace('\'', "''");
        let destination = destination.to_string_lossy().replace('\'', "''");
        command.args([
            "-NoProfile",
            "-Command",
            &format!(
                "Expand-Archive -LiteralPath '{archive}' -DestinationPath '{destination}' -Force"
            ),
        ]);
        command
    };
    #[cfg(target_os = "macos")]
    let command = {
        let mut command = Command::new("/usr/bin/ditto");
        command.args(["-x", "-k"]);
        command.arg(archive).arg(destination);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let command = {
        let mut command = Command::new("tar");
        command.args(["-xzf"]);
        command.arg(archive).arg("-C").arg(destination);
        command
    };
    run_command(command)?;
    Ok(())
}

fn backup_directory(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join("apps/local-engine/backups"))
}

fn is_backup_archive(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|value| value.to_str()),
        Some("zip" | "gz" | "tar")
    )
}

fn validate_backup_archive(archive: &Path, staging: &Path) -> Result<(), String> {
    if !archive.is_file() || !is_backup_archive(archive) {
        return Err("请选择 BOX3 Engine 备份包（.zip、.tar 或 .tar.gz）".into());
    }
    if staging.exists() {
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理导入校验目录：{error}"))?;
    }
    fs::create_dir_all(staging).map_err(|error| format!("无法创建导入校验目录：{error}"))?;
    let extracted = extract_backup_archive(archive, staging);
    let valid = extracted.is_ok()
        && staging.join("BACKUP-README.txt").is_file()
        && [
            "apps/local-engine/projects",
            "apps/local-engine/dist",
            "apps/local-engine/play-worlds",
            "apps/voxa/data",
        ]
        .iter()
        .any(|relative| staging.join(relative).exists());
    let cleanup =
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理导入校验目录：{error}"));
    extracted?;
    cleanup?;
    if !valid {
        return Err("该文件不是有效的 BOX3 Engine 数据备份包".into());
    }
    Ok(())
}

fn unique_backup_path(directory: &Path, original_name: &str) -> PathBuf {
    let candidate = directory.join(original_name);
    if !candidate.exists() {
        return candidate;
    }
    let name = Path::new(original_name)
        .file_stem()
        .unwrap_or_default()
        .to_string_lossy();
    let extension = Path::new(original_name)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("zip");
    directory.join(format!("{name}-import-{}.{}", random_hex(6), extension))
}

fn dialog_result(mut command: Command) -> Result<Option<PathBuf>, String> {
    let output = command
        .output()
        .map_err(|error| format!("无法打开文件选择器：{error}"))?;
    if !output.status.success() {
        let detail = format!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        if detail.contains("User canceled") || detail.contains("-128") {
            return Ok(None);
        }
        return Err(format!("文件选择器未完成：{}", detail.trim()));
    }
    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    Ok((!path.is_empty()).then(|| PathBuf::from(path)))
}

#[cfg(target_os = "macos")]
fn choose_backup_import() -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("/usr/bin/osascript");
    command.args([
        "-e",
        "POSIX path of (choose file with prompt \"选择 BOX3 Engine 备份包\")",
    ]);
    dialog_result(command)
}

#[cfg(target_os = "macos")]
fn choose_backup_export(name: &str) -> Result<Option<PathBuf>, String> {
    let safe_name = name.replace('\\', "\\\\").replace('"', "\\\"");
    let mut command = Command::new("/usr/bin/osascript");
    command.args([
        "-e",
        &format!(
            "POSIX path of (choose file name with prompt \"导出 BOX3 Engine 备份包\" default name \"{safe_name}\")"
        ),
    ]);
    dialog_result(command)
}

#[cfg(target_os = "windows")]
fn choose_backup_import() -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("powershell");
    command.args(["-NoProfile", "-Command", "Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.OpenFileDialog; $d.Filter='BOX3 Engine backup (*.zip;*.tar;*.gz)|*.zip;*.tar;*.gz'; if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){Write-Output $d.FileName}"]);
    dialog_result(command)
}

#[cfg(target_os = "windows")]
fn choose_backup_export(name: &str) -> Result<Option<PathBuf>, String> {
    let safe_name = name.replace('\'', "''");
    let mut command = Command::new("powershell");
    command.args(["-NoProfile", "-Command", &format!("Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.SaveFileDialog; $d.Filter='BOX3 Engine backup (*.zip;*.tar;*.gz)|*.zip;*.tar;*.gz'; $d.FileName='{safe_name}'; if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){{Write-Output $d.FileName}}")]);
    dialog_result(command)
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn choose_backup_import() -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("zenity");
    command.args([
        "--file-selection",
        "--title=选择 BOX3 Engine 备份包",
        "--file-filter=*.zip *.tar *.gz",
    ]);
    dialog_result(command)
}

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn choose_backup_export(name: &str) -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("zenity");
    command.args([
        "--file-selection",
        "--save",
        "--confirm-overwrite",
        "--filename",
        name,
    ]);
    dialog_result(command)
}

#[tauri::command]
async fn list_backups(app: AppHandle) -> Result<Vec<BackupInfo>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let directory = backup_directory(&app)?;
        fs::create_dir_all(&directory).map_err(|error| format!("无法创建备份目录：{error}"))?;
        let mut backups = Vec::new();
        for entry in
            fs::read_dir(directory).map_err(|error| format!("无法读取备份目录：{error}"))?
        {
            let entry = entry.map_err(|error| format!("无法读取备份项：{error}"))?;
            let path = entry.path();
            let extension = path
                .extension()
                .and_then(|value| value.to_str())
                .unwrap_or_default();
            if !path.is_file() || !matches!(extension, "zip" | "gz" | "tar") {
                continue;
            }
            let metadata =
                fs::metadata(&path).map_err(|error| format!("无法读取备份信息：{error}"))?;
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|value| value.as_secs())
                .unwrap_or_default();
            backups.push(BackupInfo {
                name: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string(),
                path: path.to_string_lossy().to_string(),
                size_bytes: metadata.len(),
                modified_at,
            });
        }
        backups.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));
        Ok(backups)
    })
    .await
    .map_err(|error| format!("备份列表任务异常结束：{error}"))?
}

#[tauri::command]
async fn create_backup(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = runtime_root(&app)?;
        let backups = backup_directory(&app)?;
        fs::create_dir_all(&backups).map_err(|error| format!("无法创建备份目录：{error}"))?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let staging = backups.join(format!(".staging-{timestamp}"));
        if staging.exists() {
            fs::remove_dir_all(&staging).map_err(|error| format!("无法清理临时备份：{error}"))?;
        }
        fs::create_dir_all(&staging).map_err(|error| format!("无法创建临时备份：{error}"))?;
        for relative in [
            "apps/local-engine/projects",
            "apps/local-engine/dist",
            "apps/local-engine/play-worlds",
            "apps/voxa/data",
        ] {
            let source = root.join(relative);
            if source.exists() {
                copy_directory_contents(&source, &staging.join(relative))?;
            }
        }
        fs::write(
            staging.join("BACKUP-README.txt"),
            "BOX3 Engine 数据备份。此文件不包含 .env、密码或密钥。\n",
        )
        .map_err(|error| format!("无法写入备份说明：{error}"))?;
        let archive = backups.join(format!(
            "BOX-backup-{timestamp}.{}",
            if cfg!(target_os = "windows") || cfg!(target_os = "macos") {
                "zip"
            } else {
                "tar.gz"
            }
        ));
        create_backup_archive(&staging, &archive)?;
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理临时备份：{error}"))?;
        Ok(archive.to_string_lossy().to_string())
    })
    .await
    .map_err(|error| format!("备份任务异常结束：{error}"))?
}

#[tauri::command]
async fn restore_backup(app: AppHandle, archive: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let backups = backup_directory(&app)?;
        let requested = PathBuf::from(&archive);
        let canonical_directory =
            fs::canonicalize(&backups).map_err(|error| format!("无法定位备份目录：{error}"))?;
        let canonical_archive =
            fs::canonicalize(&requested).map_err(|error| format!("找不到备份文件：{error}"))?;
        if canonical_archive.parent() != Some(canonical_directory.as_path())
            || !canonical_archive.is_file()
        {
            return Err("只能恢复应用备份目录中的文件".into());
        }
        // A restore replaces bind-mounted source data. Stop containers first
        // so a running Creator/VOXA process cannot write a newer state while
        // files are being replaced.
        if env_path(&app).is_ok_and(|path| path.exists()) {
            compose_output(&app, &["stop"])?;
        }
        let root = runtime_root(&app)?;
        let staging = backups.join(".restore-staging");
        if staging.exists() {
            fs::remove_dir_all(&staging)
                .map_err(|error| format!("无法清理恢复临时目录：{error}"))?;
        }
        fs::create_dir_all(&staging).map_err(|error| format!("无法创建恢复临时目录：{error}"))?;
        extract_backup_archive(&canonical_archive, &staging)?;
        for relative in [
            "apps/local-engine/projects",
            "apps/local-engine/dist",
            "apps/local-engine/play-worlds",
            "apps/voxa/data",
        ] {
            let source = staging.join(relative);
            if !source.exists() {
                continue;
            }
            let destination = root.join(relative);
            if destination.exists() {
                fs::remove_dir_all(&destination)
                    .map_err(|error| format!("无法替换 {}：{error}", destination.display()))?;
            }
            copy_directory_contents(&source, &destination)?;
        }
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理恢复临时目录：{error}"))?;
        Ok(())
    })
    .await
    .map_err(|error| format!("恢复任务异常结束：{error}"))?
}

#[tauri::command]
async fn delete_backup(app: AppHandle, archive: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let backups = backup_directory(&app)?;
        let requested = PathBuf::from(&archive);
        let canonical_directory =
            fs::canonicalize(&backups).map_err(|error| format!("无法定位备份目录：{error}"))?;
        let canonical_archive =
            fs::canonicalize(&requested).map_err(|error| format!("找不到备份文件：{error}"))?;
        let extension = canonical_archive
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or_default();
        if canonical_archive.parent() != Some(canonical_directory.as_path())
            || !canonical_archive.is_file()
            || !matches!(extension, "zip" | "gz" | "tar")
        {
            return Err("只能删除应用备份目录中的备份文件".into());
        }
        fs::remove_file(&canonical_archive)
            .map_err(|error| format!("无法删除备份 {}：{error}", canonical_archive.display()))
    })
    .await
    .map_err(|error| format!("删除备份任务异常结束：{error}"))?
}

#[tauri::command]
async fn export_backup(app: AppHandle, archive: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let backups = backup_directory(&app)?;
        let canonical_directory =
            fs::canonicalize(&backups).map_err(|error| format!("无法定位备份目录：{error}"))?;
        let canonical_archive = fs::canonicalize(PathBuf::from(&archive))
            .map_err(|error| format!("找不到备份文件：{error}"))?;
        if canonical_archive.parent() != Some(canonical_directory.as_path())
            || !canonical_archive.is_file()
            || !is_backup_archive(&canonical_archive)
        {
            return Err("只能导出应用备份目录中的备份文件".into());
        }
        let suggested_name = canonical_archive
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let Some(destination) = choose_backup_export(&suggested_name)? else {
            return Ok(None);
        };
        if destination == canonical_archive {
            return Err("导出位置不能与原始备份相同".into());
        }
        fs::copy(&canonical_archive, &destination)
            .map_err(|error| format!("无法导出备份：{error}"))?;
        Ok(Some(destination.to_string_lossy().to_string()))
    })
    .await
    .map_err(|error| format!("导出备份任务异常结束：{error}"))?
}

#[tauri::command]
async fn import_backup(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(source) = choose_backup_import()? else {
            return Ok(None);
        };
        let source =
            fs::canonicalize(source).map_err(|error| format!("无法读取备份文件：{error}"))?;
        let backups = backup_directory(&app)?;
        fs::create_dir_all(&backups).map_err(|error| format!("无法创建备份目录：{error}"))?;
        let validation = backups.join(format!(".import-check-{}", random_hex(8)));
        validate_backup_archive(&source, &validation)?;
        let destination = unique_backup_path(
            &backups,
            &source.file_name().unwrap_or_default().to_string_lossy(),
        );
        fs::copy(&source, &destination).map_err(|error| format!("无法导入备份：{error}"))?;
        Ok(Some(destination.to_string_lossy().to_string()))
    })
    .await
    .map_err(|error| format!("导入备份任务异常结束：{error}"))?
}

#[tauri::command]
async fn export_diagnostics(app: AppHandle) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let root = runtime_root(&app)?;
        let diagnostic_root = root.join("diagnostics");
        let staging = diagnostic_root.join("current");
        fs::create_dir_all(&diagnostic_root)
            .map_err(|error| format!("无法创建诊断目录：{error}"))?;
        if staging.exists() {
            fs::remove_dir_all(&staging).map_err(|error| format!("无法清理诊断目录：{error}"))?;
        }
        fs::create_dir_all(&staging).map_err(|error| format!("无法创建诊断目录：{error}"))?;
        let environment = load_existing_env(&app);
        let runtime_environment = runtime_env_path(&app)
            .ok()
            .and_then(|path| fs::read_to_string(path).ok())
            .map(|content| parse_env(&content))
            .unwrap_or_default();
        let safe_environment: BTreeMap<String, String> = environment
            .iter()
            .map(|(key, value)| {
                (
                    key.clone(),
                    if is_sensitive_env_key(key) {
                        "[REDACTED]".into()
                    } else {
                        value.clone()
                    },
                )
            })
            .collect();
        let docker_info = docker_output(&["info", "--format", "{{json .}}"])
        .unwrap_or_else(|error| format!("Docker info unavailable: {error}"));
        let compose_state = redact_text(
            compose_output(&app, &["ps", "--format", "json"])
                .unwrap_or_else(|error| format!("Compose state unavailable: {error}")),
            &runtime_environment,
        );
        let report = serde_json::json!({
            "formatVersion": 1,
            "generatedAtMs": SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis(),
            "applicationVersion": env!("CARGO_PKG_VERSION"),
            "imageTag": IMAGE_TAG,
            "platform": std::env::consts::OS,
            "architecture": std::env::consts::ARCH,
            "systemStatus": get_system_status(app.clone()),
            "configuration": safe_environment,
            "dockerInfo": docker_info,
            "composeState": compose_state,
        });
        fs::write(
            staging.join("report.json"),
            serde_json::to_vec_pretty(&report).map_err(|error| format!("无法生成诊断报告：{error}"))?,
        )
        .map_err(|error| format!("无法写入诊断报告：{error}"))?;
        let logs = compose_output(&app, &["logs", "--tail", "500", "--no-color"])
            .unwrap_or_else(|error| format!("Logs unavailable: {error}"));
        let logs = redact_text(redact_text(logs, &runtime_environment), &environment);
        fs::write(staging.join("logs.txt"), logs)
            .map_err(|error| format!("无法写入诊断日志：{error}"))?;
        fs::write(
            staging.join("README.txt"),
            "此诊断包已自动隐藏密码、令牌、API Key 和数据库连接串。发送前仍建议人工检查。\n",
        )
        .map_err(|error| format!("无法写入诊断说明：{error}"))?;
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let destination = diagnostic_root.join(format!("BOX-diagnostic-{timestamp}.zip"));
        create_diagnostic_zip(&staging, &destination)?;
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理诊断临时目录：{error}"))?;
        Ok(destination.to_string_lossy().to_string())
    })
    .await
    .map_err(|error| format!("诊断包任务异常结束：{error}"))?
}

#[tauri::command]
async fn save_configuration_command(
    app: AppHandle,
    config: InstallConfigInput,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "preflight", "正在检查 PostgreSQL 数据库…", 20);
        let database_host = validate_host(&config.database_host, "数据库地址")?;
        let database_port = validate_port(&config.database_port)?;
        check_remote_endpoint(" PostgreSQL", &database_host, database_port)?;
        if !config.redis_host.trim().is_empty() {
            let redis_host = validate_host(&config.redis_host, "Redis 地址")?;
            let redis_port = validate_port(&config.redis_port)?;
            check_remote_endpoint(" Redis", &redis_host, redis_port)?;
        }
        emit_progress(&app, "config", "正在保存安全配置…", 70);
        save_configuration(&app, &config)?;
        emit_progress(&app, "complete", "配置已保存，请在总览选择启动范围", 100);
        Ok(())
    })
    .await
    .map_err(|error| format!("配置任务异常结束：{error}"))?
}

#[tauri::command]
async fn start_services(app: AppHandle, scope: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
        emit_progress(&app, "images", "正在检查离线镜像…", 20);
        ensure_images(&app)?;
        let label = match scope.as_str() {
            "all" => {
                emit_progress(&app, "start", "正在启动全部服务…", 65);
                compose_output(&app, &["up", "-d", "--force-recreate", "--remove-orphans"])?;
                "全部服务"
            }
            "creator" => {
                emit_progress(&app, "start", "正在启动创作端…", 65);
                let args = vec![
                    "up",
                    "-d",
                    "--force-recreate",
                    "creator",
                    "voxa",
                    "player-service",
                    "player-auth-portal",
                ];
                compose_output(&app, &args)?;
                "创作端"
            }
            "play" => {
                emit_progress(&app, "start", "正在启动游玩端…", 65);
                let args = vec![
                    "up",
                    "-d",
                    "--force-recreate",
                    "play",
                    "player-service",
                    "player-auth-portal",
                ];
                compose_output(&app, &args)?;
                "游玩端"
            }
            _ => return Err("未知启动范围，只能选择全部服务、创作端或游玩端".into()),
        };
        emit_progress(&app, "complete", &format!("{label}已启动"), 100);
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
fn open_service(app: AppHandle, url: String) -> Result<(), String> {
    generate_runtime_environment(&app)?;
    let values = runtime_env_path(&app)
        .ok()
        .and_then(|path| fs::read_to_string(path).ok())
        .map(|content| parse_env(&content))
        .unwrap_or_default();
    let configured_url = |name: &str, fallback: &str| {
        values
            .get(name)
            .filter(|value| !value.is_empty())
            .map(String::as_str)
            .unwrap_or(fallback)
            .trim_end_matches('/')
            .to_string()
    };
    let allowed = [
        format!(
            "{}/",
            configured_url("BOX_CREATOR_PUBLIC_URL", "http://127.0.0.1:3002")
        ),
        format!(
            "{}/",
            configured_url("BOX_PLAY_PUBLIC_URL", "http://127.0.0.1:3000")
        ),
        format!(
            "{}/players",
            configured_url("BOX_PLAYER_SERVICE_PUBLIC_URL", "http://127.0.0.1:3213")
        ),
        format!(
            "{}/",
            configured_url("BOX_AUTH_PORTAL_PUBLIC_URL", "http://127.0.0.1:3214")
        ),
        format!(
            "{}/",
            configured_url("BOX_VOXA_PUBLIC_URL", "http://127.0.0.1:3001")
        ),
    ];
    if !allowed.contains(&url) {
        return Err("只允许打开当前配置中的 BOX 服务地址".into());
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
    verify_offline_image_archive(&app, &archive)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn resolves_docker_desktop_cli_without_a_shell_path() {
        if !Path::new("/Applications/Docker.app/Contents/Resources/bin/docker").is_file()
            || std::env::var_os("BOX_DOCKER_CLI").is_some()
        {
            return;
        }
        let command = docker_command();
        assert_eq!(
            command.get_program(),
            "/Applications/Docker.app/Contents/Resources/bin/docker"
        );
    }

    #[test]
    fn explains_a_docker_daemon_that_is_not_ready() {
        assert!(docker_message("Cannot connect to the Docker daemon".into())
            .contains("已安装但尚未就绪"));
    }

    #[test]
    fn rejects_duplicate_service_ports() {
        let config = InstallConfigInput {
            database_host: String::new(),
            database_port: default_database_port(),
            database_name: default_database_name(),
            database_user: default_database_user(),
            database_password: String::new(),
            database_ssl: false,
            permission_token_secret: String::new(),
            player_auth_api_key: String::new(),
            play_admin_token: String::new(),
            redis_host: String::new(),
            redis_port: default_redis_port(),
            redis_password: String::new(),
            redis_db: 0,
            storage_cache_redis_db: 1,
            auto_backup_enabled: false,
            auto_backup_interval_minutes: 60,
            auto_backup_retention_count: 24,
            auto_backup_retention_days: 30,
            public_host: default_public_host(),
            creator_host: default_creator_host(),
            play_port: 3000,
            voxa_port: 3000,
            creator_port: 3002,
            player_service_port: 3213,
            auth_portal_port: 3214,
            play_runtimes: 8,
            creator_edit_runtimes: 6,
            creator_play_runtimes: 4,
        };
        assert!(validate_service_ports(&config)
            .unwrap_err()
            .contains("不能使用同一个端口"));
    }

    #[test]
    fn rejects_invalid_automatic_backup_retention() {
        let config = InstallConfigInput {
            database_host: String::new(),
            database_port: default_database_port(),
            database_name: default_database_name(),
            database_user: default_database_user(),
            database_password: String::new(),
            database_ssl: false,
            permission_token_secret: String::new(),
            player_auth_api_key: String::new(),
            play_admin_token: String::new(),
            redis_host: String::new(),
            redis_port: default_redis_port(),
            redis_password: String::new(),
            redis_db: 0,
            storage_cache_redis_db: 1,
            auto_backup_enabled: true,
            auto_backup_interval_minutes: 0,
            auto_backup_retention_count: 24,
            auto_backup_retention_days: 30,
            public_host: default_public_host(),
            creator_host: default_creator_host(),
            play_port: 3000,
            voxa_port: 3001,
            creator_port: 3002,
            player_service_port: 3213,
            auth_portal_port: 3214,
            play_runtimes: 8,
            creator_edit_runtimes: 6,
            creator_play_runtimes: 4,
        };
        assert!(validate_auto_backup_config(&config)
            .unwrap_err()
            .contains("自动备份间隔"));
    }

    #[test]
    fn requires_postgresql_before_generating_runtime_configuration() {
        assert!(database_url(&BTreeMap::new())
            .unwrap_err()
            .contains("必须配置 PostgreSQL"));
    }

    #[test]
    fn diagnostic_redaction_hides_secret_values() {
        let values = BTreeMap::from([
            ("BOX_PLAY_ADMIN_TOKEN".into(), "owner-secret-value".into()),
            ("BOX_PLAY_PORT".into(), "3000".into()),
        ]);
        let redacted = redact_text("token=owner-secret-value port=3000".into(), &values);
        assert_eq!(redacted, "token=[REDACTED] port=3000");
    }

    #[test]
    fn validates_raw_environment_without_hiding_owner_values() {
        assert!(validate_raw_environment(
            "# owner-managed configuration\nBOX_PLAY_ADMIN_TOKEN=owner-secret-value\nBOX_PLAY_PORT=3000\n"
        )
        .is_ok());
        assert!(validate_raw_environment("BOX_PLAY_PORT\n").is_err());
        assert!(validate_raw_environment("box_play_port=3000\n").is_err());
    }

    #[test]
    fn creator_network_policy_rejects_public_hosts() {
        assert!(validate_creator_host("127.0.0.1").is_ok());
        assert!(validate_creator_host("192.168.1.10").is_ok());
        assert!(validate_creator_host("10.0.0.10").is_ok());
        assert!(validate_creator_host("0.0.0.0").is_err());
        assert!(validate_creator_host("203.0.113.20").is_err());
        assert!(validate_creator_host("arena.example.com").is_err());
        assert_eq!(
            host_from_http_url("https://[fd00::10]:3002/path"),
            Some("fd00::10".into())
        );
    }

    #[test]
    fn accepts_an_owner_supplied_secret() {
        let value = resolve_secret(
            "BOX_PLAY_ADMIN_TOKEN",
            "owner-controlled-token",
            &BTreeMap::new(),
        )
        .unwrap();
        assert_eq!(value, "owner-controlled-token");
    }

    #[test]
    fn migrates_a_legacy_database_url_without_retaining_it() {
        let normalized = normalize_owner_environment(
            "BOX_DATABASE_URL=postgresql://box%20user:secret%21@db.example.test:5432/box%20data\nBOX_TRUST_PROXY=false\nBOX_RUNTIME_IDLE_TIMEOUT_MS=900000\n",
        )
        .unwrap();
        let values = parse_env(&normalized);
        assert_eq!(
            values.get("BOX_DATABASE_HOST"),
            Some(&"db.example.test".into())
        );
        assert_eq!(values.get("BOX_DATABASE_PORT"), Some(&"5432".into()));
        assert_eq!(values.get("BOX_DATABASE_NAME"), Some(&"box data".into()));
        assert_eq!(values.get("BOX_DATABASE_USER"), Some(&"box user".into()));
        assert_eq!(values.get("BOX_DATABASE_PASSWORD"), Some(&"secret!".into()));
        assert!(!values.contains_key("BOX_DATABASE_URL"));
        assert!(!values.contains_key("BOX_TRUST_PROXY"));
        assert!(!values.contains_key("BOX_RUNTIME_IDLE_TIMEOUT_MS"));
    }

    #[test]
    fn backup_archive_round_trip_preserves_file_tree() {
        let root = std::env::temp_dir().join(format!("box-manager-backup-{}", random_hex(8)));
        let source = root.join("source");
        let nested = source.join("apps/local-engine/projects");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("world.json"), "world-data").unwrap();
        fs::write(source.join("BACKUP-README.txt"), "BOX3 Engine 数据备份。\n").unwrap();
        let archive = root.join(
            if cfg!(target_os = "windows") || cfg!(target_os = "macos") {
                "snapshot.zip"
            } else {
                "snapshot.tar.gz"
            },
        );
        create_backup_archive(&source, &archive).unwrap();
        let validation = root.join("validation");
        validate_backup_archive(&archive, &validation).unwrap();
        assert!(!validation.exists());
        let restored = root.join("restored");
        fs::create_dir_all(&restored).unwrap();
        extract_backup_archive(&archive, &restored).unwrap();
        assert_eq!(
            fs::read_to_string(restored.join("apps/local-engine/projects/world.json")).unwrap(),
            "world-data"
        );
        fs::remove_dir_all(root).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn backup_copy_temporarily_reads_owner_write_only_files() {
        let root =
            std::env::temp_dir().join(format!("box-manager-backup-permission-{}", random_hex(8)));
        let source = root.join("source.bin");
        let destination = root.join("backup.bin");
        fs::create_dir_all(&root).unwrap();
        fs::write(&source, "backup-data").unwrap();
        fs::set_permissions(&source, fs::Permissions::from_mode(0o200)).unwrap();

        copy_file_for_backup(&source, &destination).unwrap();

        assert_eq!(fs::read_to_string(&destination).unwrap(), "backup-data");
        assert_eq!(
            fs::metadata(&source).unwrap().permissions().mode() & 0o777,
            0o200
        );
        fs::set_permissions(&source, fs::Permissions::from_mode(0o600)).unwrap();
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_install_config,
            get_owner_secrets,
            get_raw_environment,
            save_raw_environment,
            get_system_status,
            get_about_info,
            get_legal_notices,
            get_performance_status,
            list_backups,
            create_backup,
            restore_backup,
            delete_backup,
            export_backup,
            import_backup,
            run_environment_checks,
            test_remote_connection,
            save_configuration_command,
            start_services,
            stop_services,
            control_service,
            get_logs,
            get_service_logs,
            export_diagnostics,
            open_service,
            verify_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BOX Local Engine manager");
}
