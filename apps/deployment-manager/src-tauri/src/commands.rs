use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
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
#[path = "license.rs"]
mod license;

use config::{
    compose_path, detect_lan_ip, ensure_runtime_files, env_path, parse_env, random_hex, remove_env,
    resolve_secret, runtime_env_path, runtime_root, set_env, validate_raw_environment,
    write_private_file, IMAGE_TAG, SERVICE_NAMES,
};
use docker::{
    command as docker_command, hide_window, output as docker_output, run_command,
    unavailable_message as docker_message,
};

#[path = "models.rs"]
mod models;

use models::*;

use license::LicenseStatus;

const ENV_TEMPLATE: &str = include_str!("../defaults.env");
const IMAGE_INFO: &str = include_str!("../payload/IMAGE-INFO.json");
const PROJECT_NAME: &str = "box-local-engine";
const MANAGED_DATABASE_IMAGE: &str = "docker.m.daocloud.io/library/postgres:16-alpine";
const MANAGED_REDIS_IMAGE: &str = "docker.m.daocloud.io/library/redis:7-alpine";
const MANAGED_SERVICE_NAMES: [&str; 2] = ["managed-postgres", "managed-redis"];
const ONBOARDING_LOCK_FILE: &str = "onboarding.lock";
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstallConfigView {
    database_mode: String,
    database_host: String,
    database_port: String,
    database_name: String,
    database_user: String,
    database_ssl: bool,
    has_database_password: bool,
    has_permission_token_secret: bool,
    has_player_auth_api_key: bool,
    has_play_admin_token: bool,
    redis_mode: String,
    redis_host: String,
    redis_port: String,
    has_redis_password: bool,
    redis_db: u8,
    storage_cache_redis_db: u8,
    database_pool_size: u32,
    storage_cache_redis_ttl: u8,
    auto_backup_enabled: bool,
    auto_backup_interval_minutes: u32,
    auto_backup_retention_count: u32,
    auto_backup_retention_days: u32,
    public_host: String,
    play_network_mode: String,
    creator_network_mode: String,
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
    creator_edit_prewarm_runtimes: u32,
    play_prewarm_runtimes: u32,
    player_limit: u32,
    script_memory_mb: u32,
    runtime_idle_minutes: u32,
    runtime_start_timeout_minutes: u32,
    teleport_max_rooms: u32,
    teleport_room_idle_minutes: u32,
    registration_enabled: bool,
    library_management_enabled: bool,
    player_service_memory_mb: u32,
    player_service_cpu_limit: f64,
    auth_portal_memory_mb: u32,
    auth_portal_cpu_limit: f64,
    creator_memory_mb: u32,
    creator_cpu_limit: f64,
    play_memory_mb: u32,
    play_cpu_limit: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OwnerSecretsView {
    permission_token_secret: String,
    player_auth_api_key: String,
    play_admin_token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ManagedServiceInfo {
    image_available: bool,
    configured: bool,
    running: bool,
    host: String,
    port: String,
    database: String,
    user: String,
    password: String,
    connection_url: String,
}

impl Default for InstallConfigView {
    fn default() -> Self {
        Self {
            database_mode: default_database_mode(),
            database_host: String::new(),
            database_port: "5432".into(),
            database_name: "box".into(),
            database_user: "box".into(),
            database_ssl: false,
            has_database_password: false,
            has_permission_token_secret: false,
            has_player_auth_api_key: false,
            has_play_admin_token: false,
            redis_mode: default_redis_mode(),
            redis_host: String::new(),
            redis_port: "6379".into(),
            has_redis_password: false,
            redis_db: 0,
            storage_cache_redis_db: 1,
            database_pool_size: 10,
            storage_cache_redis_ttl: 240,
            auto_backup_enabled: false,
            auto_backup_interval_minutes: 60,
            auto_backup_retention_count: 24,
            auto_backup_retention_days: 30,
            public_host: "127.0.0.1".into(),
            play_network_mode: "local".into(),
            creator_network_mode: "local".into(),
            creator_host: "127.0.0.1".into(),
            lan_ip: detect_lan_ip().unwrap_or_default(),
            play_port: 3121,
            voxa_port: 3123,
            creator_port: 3127,
            player_service_port: 3124,
            auth_portal_port: 3125,
            play_runtimes: 8,
            creator_edit_runtimes: 6,
            creator_play_runtimes: 4,
            creator_edit_prewarm_runtimes: 6,
            play_prewarm_runtimes: 8,
            player_limit: 8,
            script_memory_mb: 512,
            runtime_idle_minutes: 15,
            runtime_start_timeout_minutes: 30,
            teleport_max_rooms: 64,
            teleport_room_idle_minutes: 15,
            registration_enabled: true,
            library_management_enabled: true,
            player_service_memory_mb: 1024,
            player_service_cpu_limit: 1.0,
            auth_portal_memory_mb: 128,
            auth_portal_cpu_limit: 0.5,
            creator_memory_mb: 6144,
            creator_cpu_limit: 4.0,
            play_memory_mb: 4096,
            play_cpu_limit: 4.0,
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallConfigInput {
    #[serde(default = "default_database_mode")]
    database_mode: String,
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
    #[serde(default = "default_redis_mode")]
    redis_mode: String,
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
    #[serde(default = "default_database_pool_size")]
    database_pool_size: u32,
    #[serde(default = "default_storage_cache_redis_ttl")]
    storage_cache_redis_ttl: u8,
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
    #[serde(default = "default_play_network_mode")]
    play_network_mode: String,
    #[serde(default = "default_creator_host")]
    creator_host: String,
    #[serde(default = "default_creator_network_mode")]
    creator_network_mode: String,
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
    #[serde(default = "default_creator_edit_prewarm_runtimes")]
    creator_edit_prewarm_runtimes: u32,
    #[serde(default = "default_play_prewarm_runtimes")]
    play_prewarm_runtimes: u32,
    #[serde(default = "default_player_limit")]
    player_limit: u32,
    #[serde(default = "default_script_memory_mb")]
    script_memory_mb: u32,
    #[serde(default = "default_runtime_idle_minutes")]
    runtime_idle_minutes: u32,
    #[serde(default = "default_runtime_start_timeout_minutes")]
    runtime_start_timeout_minutes: u32,
    #[serde(default = "default_teleport_max_rooms")]
    teleport_max_rooms: u32,
    #[serde(default = "default_teleport_room_idle_minutes")]
    teleport_room_idle_minutes: u32,
    #[serde(default = "default_true")]
    registration_enabled: bool,
    #[serde(default = "default_true")]
    library_management_enabled: bool,
    #[serde(default = "default_player_service_memory_mb")]
    player_service_memory_mb: u32,
    #[serde(default = "default_player_service_cpu_limit")]
    player_service_cpu_limit: f64,
    #[serde(default = "default_auth_portal_memory_mb")]
    auth_portal_memory_mb: u32,
    #[serde(default = "default_auth_portal_cpu_limit")]
    auth_portal_cpu_limit: f64,
    #[serde(default = "default_creator_memory_mb")]
    creator_memory_mb: u32,
    #[serde(default = "default_creator_cpu_limit")]
    creator_cpu_limit: f64,
    #[serde(default = "default_play_memory_mb")]
    play_memory_mb: u32,
    #[serde(default = "default_play_cpu_limit")]
    play_cpu_limit: f64,
}

fn default_database_mode() -> String {
    "managed".into()
}

fn validate_database_mode(value: &str) -> Result<&str, String> {
    match value {
        "managed" | "external" => Ok(value),
        _ => Err("PostgreSQL 模式只能是内置数据库或外部数据库".into()),
    }
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
fn default_redis_mode() -> String {
    "disabled".into()
}
fn validate_redis_mode(value: &str) -> Result<&str, String> {
    match value {
        "disabled" | "managed" | "external" => Ok(value),
        _ => Err("Redis 模式只能是不启用、内置 Redis 或外部 Redis".into()),
    }
}
fn default_storage_cache_redis_db() -> u8 {
    1
}
fn default_database_pool_size() -> u32 {
    10
}
fn default_storage_cache_redis_ttl() -> u8 {
    240
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
fn default_play_network_mode() -> String {
    "local".into()
}
fn default_creator_host() -> String {
    "127.0.0.1".into()
}
fn default_creator_network_mode() -> String {
    "local".into()
}
fn default_play_port() -> u16 {
    3121
}
fn default_voxa_port() -> u16 {
    3123
}
fn default_creator_port() -> u16 {
    3127
}
fn default_player_service_port() -> u16 {
    3124
}
fn default_auth_portal_port() -> u16 {
    3125
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
fn default_creator_edit_prewarm_runtimes() -> u32 {
    6
}
fn default_play_prewarm_runtimes() -> u32 {
    8
}
fn default_player_limit() -> u32 {
    8
}
fn default_script_memory_mb() -> u32 {
    512
}
fn default_runtime_idle_minutes() -> u32 {
    15
}
fn default_runtime_start_timeout_minutes() -> u32 {
    30
}
fn default_teleport_max_rooms() -> u32 {
    64
}
fn default_teleport_room_idle_minutes() -> u32 {
    15
}
fn default_true() -> bool {
    true
}
fn default_player_service_memory_mb() -> u32 {
    1024
}
fn default_player_service_cpu_limit() -> f64 {
    1.0
}
fn default_auth_portal_memory_mb() -> u32 {
    128
}
fn default_auth_portal_cpu_limit() -> f64 {
    0.5
}
fn default_creator_memory_mb() -> u32 {
    6144
}
fn default_creator_cpu_limit() -> f64 {
    4.0
}
fn default_play_memory_mb() -> u32 {
    4096
}
fn default_play_cpu_limit() -> f64 {
    4.0
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
    if matches!(host.as_str(), "0.0.0.0" | "::" | "[::]") {
        return Err("创作端访问地址不能使用监听地址".into());
    }
    Ok(host)
}

fn validate_creator_network_mode(value: &str) -> Result<&str, String> {
    match value {
        "local" | "lan" | "public" => Ok(value),
        _ => Err("创作端访问范围只能是本机、局域网或公网".into()),
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
    let creator_network_mode = values
        .get("BOX_CREATOR_NETWORK_MODE")
        .map(String::as_str)
        .filter(|mode| validate_creator_network_mode(mode).is_ok())
        .unwrap_or("local");

    set_env(&mut normalized, "BOX_PLAY_PUBLIC_HOST", &play_host)?;
    set_env(&mut normalized, "BOX_CREATOR_HOST", &creator_host)?;
    set_env(
        &mut normalized,
        "BOX_CREATOR_NETWORK_MODE",
        creator_network_mode,
    )?;

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
    let normalized_values = parse_env(&normalized);
    let database_mode = normalized_values
        .get("BOX_DATABASE_MODE")
        .map(String::as_str)
        .filter(|mode| matches!(*mode, "managed" | "external"))
        .unwrap_or_else(|| {
            if normalized_values
                .get("BOX_DATABASE_HOST")
                .is_some_and(|host| !host.trim().is_empty())
            {
                "external"
            } else {
                "managed"
            }
        });
    set_env(&mut normalized, "BOX_DATABASE_MODE", database_mode)?;
    let redis_mode = normalized_values
        .get("BOX_REDIS_MODE")
        .map(String::as_str)
        .filter(|mode| matches!(*mode, "disabled" | "managed" | "external"))
        .unwrap_or_else(|| {
            if normalized_values
                .get("REDIS_HOST")
                .is_some_and(|host| !host.trim().is_empty())
            {
                "external"
            } else {
                "disabled"
            }
        });
    set_env(&mut normalized, "BOX_REDIS_MODE", redis_mode)?;
    for key in GENERATED_ENV_KEYS {
        remove_env(&mut normalized, key);
    }
    // Compose already supplies these defaults. Keep a value only when the
    // owner intentionally changed it as an advanced override.
    for (key, default) in [
        ("BOX_DATABASE_SCHEMA", "box_engine"),
        ("BOX_IDENTITY_DATABASE_SCHEMA", "box_identity"),
        ("BOX_DATABASE_POOL_SIZE", "4"),
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
    let mode = values
        .get("BOX_DATABASE_MODE")
        .map(String::as_str)
        .unwrap_or("external");
    validate_database_mode(mode)?;
    let host = if mode == "managed" {
        "managed-postgres"
    } else {
        values
            .get("BOX_DATABASE_HOST")
            .map(|value| value.trim())
            .unwrap_or_default()
    };
    if host.is_empty() {
        return Err("外部 PostgreSQL 模式必须配置数据库地址后才能启动服务".into());
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
    let configured_play_host = owner_values
        .get("BOX_PLAY_PUBLIC_HOST")
        .map(String::as_str)
        .map(|host| validate_host(host, "游玩端访问地址"))
        .transpose()?
        .unwrap_or_else(default_public_host);
    let play_mode = owner_values
        .get("BOX_PLAY_NETWORK_MODE")
        .map(String::as_str)
        .unwrap_or("local");
    let play_host = if play_mode == "lan" {
        detect_lan_ip().ok_or("已选择局域网模式，但当前未检测到可用的局域网 IP")?
    } else {
        configured_play_host
    };
    let configured_creator_host = owner_values
        .get("BOX_CREATOR_HOST")
        .map(String::as_str)
        .map(validate_creator_host)
        .transpose()?
        .unwrap_or_else(default_creator_host);
    let creator_mode = owner_values
        .get("BOX_CREATOR_NETWORK_MODE")
        .map(String::as_str)
        .map(validate_creator_network_mode)
        .transpose()?
        .unwrap_or("local");
    let creator_host = match creator_mode {
        "local" => "127.0.0.1".into(),
        "lan" => detect_lan_ip().ok_or("已选择创作端局域网模式，但当前未检测到可用的局域网 IP")?,
        "public" => configured_creator_host,
        _ => unreachable!(),
    };
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
    let creator_bind_ip = if creator_mode == "local" {
        "127.0.0.1"
    } else {
        "0.0.0.0"
    };
    let play_origin_host = origin_host(&play_host);
    let creator_origin_host = origin_host(&creator_host);
    let database_url = database_url(&owner_values)?;
    let mut runtime = owner;
    let compose_profiles = match (
        owner_values
            .get("BOX_DATABASE_MODE")
            .is_some_and(|mode| mode == "managed"),
        owner_values
            .get("BOX_REDIS_MODE")
            .is_some_and(|mode| mode == "managed"),
    ) {
        (true, true) => {
            "desktop-postgres,desktop-redis,player-service,auth-portal,creator,play,voxa"
        }
        (true, false) => "desktop-postgres,player-service,auth-portal,creator,play,voxa",
        (false, true) => "desktop-redis,player-service,auth-portal,creator,play,voxa",
        (false, false) => "player-service,auth-portal,creator,play,voxa",
    };
    set_env(&mut runtime, "COMPOSE_PROFILES", compose_profiles)?;
    set_env(&mut runtime, "BOX_IMAGE_TAG", IMAGE_TAG)?;
    set_env(
        &mut runtime,
        "BOX_LICENSE_FILE",
        &license::license_path(app)?.to_string_lossy(),
    )?;
    set_env(
        &mut runtime,
        "BOX_LICENSE_DEVICE_FILE",
        &license::device_id_path(app)?.to_string_lossy(),
    )?;
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

fn validate_runtime_capacity(config: &InstallConfigInput) -> Result<(), String> {
    if config.play_runtimes == 0
        || config.creator_edit_runtimes == 0
        || config.creator_play_runtimes == 0
    {
        return Err("运行时数量必须大于 0".into());
    }
    if !(1..=1_000).contains(&config.player_limit) {
        return Err("单实例玩家上限必须在 1 到 1000 之间".into());
    }
    for (label, prewarm, maximum) in [
        (
            "Creator 编辑预热数量",
            config.creator_edit_prewarm_runtimes,
            config.creator_edit_runtimes,
        ),
        (
            "Play 预热数量",
            config.play_prewarm_runtimes,
            config.play_runtimes,
        ),
    ] {
        if prewarm > maximum {
            return Err(format!("{label}不能超过对应的运行时上限 {maximum}"));
        }
    }
    if !(128..=8_192).contains(&config.script_memory_mb) {
        return Err("单运行时脚本内存必须在 128 到 8192 MiB 之间".into());
    }
    if !(1..=10_080).contains(&config.runtime_idle_minutes) {
        return Err("运行时空闲回收时间必须在 1 到 10080 分钟之间".into());
    }
    if !(1..=1_440).contains(&config.runtime_start_timeout_minutes) {
        return Err("运行时启动超时必须在 1 到 1440 分钟之间".into());
    }
    if !(1..=1_024).contains(&config.teleport_max_rooms) {
        return Err("Teleport 私有房间上限必须在 1 到 1024 之间".into());
    }
    if !(1..=10_080).contains(&config.teleport_room_idle_minutes) {
        return Err("Teleport 房间空闲回收时间必须在 1 到 10080 分钟之间".into());
    }
    Ok(())
}

fn validate_operator_performance(config: &InstallConfigInput) -> Result<(), String> {
    if !(1..=100).contains(&config.database_pool_size) {
        return Err("数据库连接池必须在 1 到 100 之间".into());
    }
    for (label, memory, minimum) in [
        ("Player Service", config.player_service_memory_mb, 512),
        ("登录门户", config.auth_portal_memory_mb, 128),
        ("Creator", config.creator_memory_mb, 1_024),
        ("Play", config.play_memory_mb, 1_024),
    ] {
        if !(minimum..=262_144).contains(&memory) {
            return Err(format!(
                "{label} 容器内存必须在 {minimum} 到 262144 MiB 之间"
            ));
        }
    }
    for (label, cpu) in [
        ("Player Service", config.player_service_cpu_limit),
        ("登录门户", config.auth_portal_cpu_limit),
        ("Creator", config.creator_cpu_limit),
        ("Play", config.play_cpu_limit),
    ] {
        if !cpu.is_finite() || !(0.1..=256.0).contains(&cpu) {
            return Err(format!("{label} CPU 限制必须在 0.1 到 256 核之间"));
        }
    }
    Ok(())
}

fn minutes_to_milliseconds(minutes: u32) -> u64 {
    u64::from(minutes) * 60_000
}

fn memory_mebibytes(value: Option<&String>, fallback: u32) -> u32 {
    let Some(value) = value.map(|value| value.trim().to_ascii_lowercase()) else {
        return fallback;
    };
    let parsed = if let Some(number) = value.strip_suffix('g') {
        number
            .parse::<f64>()
            .ok()
            .map(|gigabytes| (gigabytes * 1024.0).round() as u32)
    } else if let Some(number) = value.strip_suffix('m') {
        number
            .parse::<f64>()
            .ok()
            .map(|megabytes| megabytes.round() as u32)
    } else {
        value.parse::<u32>().ok()
    };
    parsed.filter(|memory| *memory > 0).unwrap_or(fallback)
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
    let database_mode = validate_database_mode(&config.database_mode)?;
    let redis_mode = validate_redis_mode(&config.redis_mode)?;
    validate_runtime_capacity(config)?;
    validate_operator_performance(config)?;
    let public_host = validate_host(&config.public_host, "公开访问地址")?;
    let creator_host = validate_creator_host(&config.creator_host)?;
    validate_creator_network_mode(&config.creator_network_mode)?;
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
    set_env(
        &mut content,
        "BOX_PLAY_LIBRARY_READ_ONLY",
        if config.library_management_enabled {
            "false"
        } else {
            "true"
        },
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_REGISTRATION_ENABLED",
        if config.registration_enabled {
            "true"
        } else {
            "false"
        },
    )?;
    set_env(&mut content, "BOX_PLAY_PUBLIC_HOST", &public_host)?;
    set_env(
        &mut content,
        "BOX_PLAY_NETWORK_MODE",
        &config.play_network_mode,
    )?;
    set_env(&mut content, "BOX_CREATOR_HOST", &creator_host)?;
    set_env(
        &mut content,
        "BOX_CREATOR_NETWORK_MODE",
        &config.creator_network_mode,
    )?;
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
    set_env(
        &mut content,
        "BOX_CREATOR_EDIT_PREWARM_RUNTIMES",
        &config.creator_edit_prewarm_runtimes.to_string(),
    )?;
    remove_env(&mut content, "BOX_CREATOR_PLAY_PREWARM_RUNTIMES");
    set_env(
        &mut content,
        "BOX_PLAY_PREWARM_RUNTIMES",
        &config.play_prewarm_runtimes.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_LOCAL_PLAYER_LIMIT",
        &config.player_limit.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_RUNTIME_IDLE_TIMEOUT_MS",
        &minutes_to_milliseconds(config.runtime_idle_minutes).to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_RUNTIME_START_TIMEOUT_MS",
        &minutes_to_milliseconds(config.runtime_start_timeout_minutes).to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_TELEPORT_MAX_ROOMS",
        &config.teleport_max_rooms.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS",
        &minutes_to_milliseconds(config.teleport_room_idle_minutes).to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_SCRIPT_HEAP_MB",
        &config.script_memory_mb.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_SCRIPT_MEMORY_MB",
        &config.script_memory_mb.to_string(),
    )?;
    for (key, value) in [
        (
            "BOX_PLAYER_SERVICE_MEMORY_LIMIT",
            format!("{}m", config.player_service_memory_mb),
        ),
        (
            "BOX_PLAYER_SERVICE_CPU_LIMIT",
            config.player_service_cpu_limit.to_string(),
        ),
        (
            "BOX_AUTH_PORTAL_MEMORY_LIMIT",
            format!("{}m", config.auth_portal_memory_mb),
        ),
        (
            "BOX_AUTH_PORTAL_CPU_LIMIT",
            config.auth_portal_cpu_limit.to_string(),
        ),
        (
            "BOX_CREATOR_MEMORY_LIMIT",
            format!("{}m", config.creator_memory_mb),
        ),
        (
            "BOX_CREATOR_CPU_LIMIT",
            config.creator_cpu_limit.to_string(),
        ),
        (
            "BOX_PLAY_MEMORY_LIMIT",
            format!("{}m", config.play_memory_mb),
        ),
        ("BOX_PLAY_CPU_LIMIT", config.play_cpu_limit.to_string()),
    ] {
        set_env(&mut content, key, &value)?;
    }
    let host = if database_mode == "managed" {
        "managed-postgres".to_string()
    } else {
        validate_host(&config.database_host, "数据库地址")?
    };
    let port = if database_mode == "managed" {
        5432
    } else {
        validate_port(&config.database_port)?
    };
    let existing_database_mode = existing
        .get("BOX_DATABASE_MODE")
        .map(String::as_str)
        .filter(|mode| matches!(*mode, "managed" | "external"))
        .unwrap_or_else(|| {
            if existing
                .get("BOX_DATABASE_HOST")
                .is_some_and(|host| !host.trim().is_empty())
            {
                "external"
            } else {
                "managed"
            }
        });
    let (database, user) = if database_mode == "managed" {
        if let Some(identity) = managed_database_identity(&existing) {
            identity
        } else if managed_database_volume_exists() {
            return Err("检测到已有内置 PostgreSQL 数据，但缺少其原始连接凭据。为避免覆盖既有数据，已停止切换；请恢复此前的 .env 后重试。".into());
        } else {
            (
                format!("box_db_{}", random_hex(8)),
                format!("box_user_{}", random_hex(8)),
            )
        }
    } else {
        (
            config.database_name.trim().to_string(),
            config.database_user.trim().to_string(),
        )
    };
    if database.is_empty() || user.is_empty() {
        return Err("PostgreSQL 数据库名和账号不能为空".into());
    }
    let saved_password = if database_mode == "managed" {
        managed_database_password(&existing)
    } else {
        (existing_database_mode == database_mode)
            .then(|| {
                existing
                    .get("BOX_DATABASE_PASSWORD")
                    .or_else(|| existing.get("BOX_DEPLOYMENT_MANAGER_DATABASE_PASSWORD"))
                    .cloned()
                    .filter(|password| !password.is_empty())
            })
            .flatten()
    };
    let password = if database_mode == "managed" {
        saved_password.unwrap_or_else(|| random_hex(32))
    } else if config.database_password.is_empty() {
        saved_password.unwrap_or_default()
    } else {
        config.database_password.clone()
    };
    if password.is_empty() {
        return Err("PostgreSQL 数据库密码不能为空".into());
    }
    let existing_redis_mode = existing
        .get("BOX_REDIS_MODE")
        .map(String::as_str)
        .filter(|mode| matches!(*mode, "disabled" | "managed" | "external"))
        .unwrap_or_else(|| {
            if existing
                .get("REDIS_HOST")
                .is_some_and(|host| !host.trim().is_empty())
            {
                "external"
            } else {
                "disabled"
            }
        });
    let saved_redis_password = if redis_mode == "managed" {
        managed_redis_password(&existing)
    } else {
        (existing_redis_mode == redis_mode)
            .then(|| {
                existing
                    .get("REDIS_PASSWORD")
                    .cloned()
                    .filter(|password| !password.is_empty())
            })
            .flatten()
    };
    let (redis_host, redis_port, redis_password) = match redis_mode {
        "managed" => {
            let password = if let Some(password) = saved_redis_password {
                password
            } else if managed_redis_volume_exists() {
                return Err("检测到已有内置 Redis 数据，但缺少其原始连接凭据。为避免重置现有访问配置，已停止切换；请恢复此前的 .env 后重试。".into());
            } else {
                random_hex(32)
            };
            ("managed-redis".into(), "6379".into(), password)
        }
        "external" => {
            let host = validate_host(&config.redis_host, "Redis 地址")?;
            let port = validate_port(&config.redis_port)?;
            let password = if config.redis_password.is_empty() {
                saved_redis_password.unwrap_or_default()
            } else {
                config.redis_password.clone()
            };
            (host, port.to_string(), password)
        }
        "disabled" => (String::new(), String::new(), String::new()),
        _ => unreachable!(),
    };
    let (redis_db, storage_cache_redis_db, storage_cache_redis_ttl) = if redis_mode == "managed" {
        (0, 1, 240)
    } else {
        (
            config.redis_db,
            config.storage_cache_redis_db,
            config.storage_cache_redis_ttl,
        )
    };
    set_env(&mut content, "BOX_DATABASE_MODE", database_mode)?;
    set_env(&mut content, "BOX_DATABASE_HOST", &host)?;
    set_env(&mut content, "BOX_DATABASE_PORT", &port.to_string())?;
    set_env(&mut content, "BOX_DATABASE_NAME", &database)?;
    set_env(&mut content, "BOX_DATABASE_USER", &user)?;
    set_env(&mut content, "BOX_DATABASE_PASSWORD", &password)?;
    if database_mode == "managed" {
        set_env(&mut content, "BOX_MANAGED_POSTGRES_DATABASE", &database)?;
        set_env(&mut content, "BOX_MANAGED_POSTGRES_USER", &user)?;
        set_env(&mut content, "BOX_MANAGED_POSTGRES_PASSWORD", &password)?;
    }
    set_env(
        &mut content,
        "BOX_DATABASE_SSL",
        if database_mode == "external" && config.database_ssl {
            "true"
        } else {
            "false"
        },
    )?;
    set_env(&mut content, "BOX_REDIS_MODE", redis_mode)?;
    set_env(&mut content, "REDIS_HOST", &redis_host)?;
    set_env(&mut content, "REDIS_PORT", &redis_port)?;
    set_env(&mut content, "REDIS_PASSWORD", &redis_password)?;
    if redis_mode == "managed" {
        set_env(&mut content, "BOX_MANAGED_REDIS_PASSWORD", &redis_password)?;
    }
    set_env(&mut content, "REDIS_DB", &redis_db.to_string())?;
    set_env(
        &mut content,
        "STORAGE_CACHE_REDIS_DB",
        &storage_cache_redis_db.to_string(),
    )?;
    set_env(
        &mut content,
        "BOX_DATABASE_POOL_SIZE",
        &(if database_mode == "managed" {
            10
        } else {
            config.database_pool_size
        })
        .to_string(),
    )?;
    set_env(
        &mut content,
        "STORAGE_CACHE_REDIS_TTL",
        &storage_cache_redis_ttl.to_string(),
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
    // Do not compile CARGO_MANIFEST_DIR into release binaries: it exposes the
    // builder's username and checkout path. These working-directory fallbacks
    // retain source-development discovery without embedding an absolute path.
    if let Ok(current_dir) = std::env::current_dir() {
        roots.push(current_dir.join("payload"));
        roots.push(current_dir.join("src-tauri").join("payload"));
        roots.push(
            current_dir
                .join("apps")
                .join("deployment-manager")
                .join("src-tauri")
                .join("payload"),
        );
    }
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

fn offline_image_digest_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join(format!(".offline-image-{IMAGE_TAG}.sha256")))
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
    let archive_digest = verify_offline_image_archive(app, &archive)?;
    let digest_path = offline_image_digest_path(app)?;
    let imported_digest = fs::read_to_string(&digest_path)
        .ok()
        .map(|value| value.trim().to_string());
    // A corrected test build can retain the same release tag. Re-import when
    // the verified archive digest changes so Docker cannot keep serving an
    // older layer merely because that tag already exists locally.
    if !missing && imported_digest.as_deref() == Some(archive_digest.as_str()) {
        return Ok(());
    }
    let archive_string = archive.to_string_lossy().to_string();
    docker_output(&["load", "-i", &archive_string])?;
    write_private_file(
        &digest_path,
        format!("{archive_digest}\n"),
        "离线镜像导入记录",
    )?;
    Ok(())
}

fn managed_database_image(app: &AppHandle) -> String {
    load_existing_env(app)
        .get("BOX_POSTGRES_IMAGE")
        .cloned()
        .filter(|image| !image.trim().is_empty())
        .unwrap_or_else(|| MANAGED_DATABASE_IMAGE.into())
}

fn managed_database_enabled(app: &AppHandle) -> bool {
    load_existing_env(app)
        .get("BOX_DATABASE_MODE")
        .is_some_and(|mode| mode == "managed")
}

#[tauri::command]
fn has_managed_database_image(app: AppHandle) -> Result<bool, String> {
    docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
    let image = managed_database_image(&app);
    Ok(docker_output(&["image", "inspect", &image]).is_ok())
}

#[tauri::command]
async fn prepare_managed_database(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(
            &app,
            "database-check",
            "正在检查 Docker 和 PostgreSQL 镜像…",
            10,
        );
        docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
        let image = managed_database_image(&app);
        if docker_output(&["image", "inspect", &image]).is_ok() {
            emit_progress(&app, "database-image-ready", "PostgreSQL 镜像已就绪", 60);
            return Ok(());
        }
        emit_progress(
            &app,
            "database-image",
            "正在从国内镜像源下载 PostgreSQL 16…",
            20,
        );
        docker_output(&["pull", &image])?;
        emit_progress(&app, "database-image-ready", "PostgreSQL 下载完成", 60);
        Ok(())
    })
    .await
    .map_err(|error| format!("数据库镜像下载任务异常结束：{error}"))?
}

fn managed_redis_image(app: &AppHandle) -> String {
    load_existing_env(app)
        .get("BOX_REDIS_IMAGE")
        .cloned()
        .filter(|image| !image.trim().is_empty())
        .unwrap_or_else(|| MANAGED_REDIS_IMAGE.into())
}

fn managed_redis_enabled(app: &AppHandle) -> bool {
    load_existing_env(app)
        .get("BOX_REDIS_MODE")
        .is_some_and(|mode| mode == "managed")
}

fn managed_service_installed(app: &AppHandle, service: &str) -> bool {
    let image = match service {
        "managed-postgres" => managed_database_image(app),
        "managed-redis" => managed_redis_image(app),
        _ => return false,
    };
    docker_output(&["image", "inspect", &image]).is_ok()
}

fn managed_service_configured(values: &BTreeMap<String, String>, service: &str) -> bool {
    match service {
        "managed-postgres" => {
            values
                .get("BOX_DATABASE_MODE")
                .is_some_and(|mode| mode == "managed")
                && managed_database_password(values).is_some()
        }
        "managed-redis" => {
            values
                .get("BOX_REDIS_MODE")
                .is_some_and(|mode| mode == "managed")
                && managed_redis_password(values).is_some()
        }
        _ => false,
    }
}

fn managed_database_volume_exists() -> bool {
    docker_output(&[
        "volume",
        "inspect",
        &format!("{PROJECT_NAME}_box-managed-postgres-data"),
    ])
    .is_ok()
}

fn managed_redis_volume_exists() -> bool {
    docker_output(&[
        "volume",
        "inspect",
        &format!("{PROJECT_NAME}_box-managed-redis-data"),
    ])
    .is_ok()
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
    (existing
        .get("BOX_DATABASE_MODE")
        .is_some_and(|mode| mode == "managed"))
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
        (existing
            .get("BOX_DATABASE_MODE")
            .is_some_and(|mode| mode == "managed"))
        .then(|| managed_value(existing, "BOX_DATABASE_PASSWORD"))
        .flatten()
    })
}

fn managed_redis_password(existing: &BTreeMap<String, String>) -> Option<String> {
    managed_value(existing, "BOX_MANAGED_REDIS_PASSWORD").or_else(|| {
        (existing
            .get("BOX_REDIS_MODE")
            .is_some_and(|mode| mode == "managed"))
        .then(|| managed_value(existing, "REDIS_PASSWORD"))
        .flatten()
    })
}

#[tauri::command]
fn has_managed_redis_image(app: AppHandle) -> Result<bool, String> {
    docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
    let image = managed_redis_image(&app);
    Ok(docker_output(&["image", "inspect", &image]).is_ok())
}

#[tauri::command]
async fn prepare_managed_redis(app: AppHandle) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        emit_progress(&app, "redis-check", "正在检查 Docker 和 Redis 镜像…", 10);
        docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
        let image = managed_redis_image(&app);
        if docker_output(&["image", "inspect", &image]).is_ok() {
            emit_progress(&app, "redis-image-ready", "Redis 镜像已就绪", 60);
            return Ok(());
        }
        emit_progress(&app, "redis-image", "正在从国内镜像源下载 Redis 7…", 20);
        docker_output(&["pull", &image])?;
        emit_progress(&app, "redis-image-ready", "Redis 下载完成", 60);
        Ok(())
    })
    .await
    .map_err(|error| format!("Redis 镜像下载任务异常结束：{error}"))?
}

fn managed_container_connectable(service: &str, host_port: &str) -> bool {
    docker_output(&[
        "ps",
        "--filter",
        &format!("label=com.docker.compose.project={PROJECT_NAME}"),
        "--filter",
        &format!("label=com.docker.compose.service={service}"),
        "--filter",
        "status=running",
        "--format",
        "{{.Ports}}",
    ])
    .is_ok_and(|output| {
        output
            .lines()
            .any(|line| line.contains(&format!("127.0.0.1:{host_port}->")))
    })
}

#[tauri::command]
fn get_managed_service_info(app: AppHandle, service: String) -> Result<ManagedServiceInfo, String> {
    let values = load_existing_env(&app);
    let host = "127.0.0.1".to_string();
    match service.as_str() {
        "postgresql" => {
            let image_available =
                docker_output(&["image", "inspect", &managed_database_image(&app)]).is_ok();
            let configured =
                image_available && managed_service_configured(&values, "managed-postgres");
            let port = values
                .get("BOX_MANAGED_POSTGRES_HOST_PORT")
                .cloned()
                .unwrap_or_else(|| "5432".into());
            let (database, user) =
                managed_database_identity(&values).unwrap_or_else(|| ("box".into(), "box".into()));
            let password = configured
                .then(|| managed_database_password(&values))
                .flatten()
                .unwrap_or_default();
            let connection_url = if configured {
                format!(
                    "postgresql://{}:{}@{}:{}/{}",
                    urlencoding::encode(&user),
                    urlencoding::encode(&password),
                    host,
                    port,
                    urlencoding::encode(&database)
                )
            } else {
                String::new()
            };
            Ok(ManagedServiceInfo {
                image_available,
                configured,
                running: managed_container_connectable("managed-postgres", &port),
                host,
                port,
                database,
                user,
                password,
                connection_url,
            })
        }
        "redis" => {
            let image_available =
                docker_output(&["image", "inspect", &managed_redis_image(&app)]).is_ok();
            let configured =
                image_available && managed_service_configured(&values, "managed-redis");
            let port = values
                .get("BOX_MANAGED_REDIS_HOST_PORT")
                .cloned()
                .unwrap_or_else(|| "6379".into());
            let database = values
                .get("REDIS_DB")
                .cloned()
                .unwrap_or_else(|| "0".into());
            let password = configured
                .then(|| managed_redis_password(&values))
                .flatten()
                .unwrap_or_default();
            let connection_url = if configured {
                format!(
                    "redis://:{}@{}:{}/{}",
                    urlencoding::encode(&password),
                    host,
                    port,
                    database
                )
            } else {
                String::new()
            };
            Ok(ManagedServiceInfo {
                image_available,
                configured,
                running: managed_container_connectable("managed-redis", &port),
                host,
                port,
                database,
                user: String::new(),
                password,
                connection_url,
            })
        }
        _ => Err("只支持读取内置 PostgreSQL 或 Redis 信息".into()),
    }
}

#[tauri::command]
async fn start_managed_service(app: AppHandle, service: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (mode_key, compose_service, label) = match service.as_str() {
            "postgresql" => ("BOX_DATABASE_MODE", "managed-postgres", "PostgreSQL"),
            "redis" => ("BOX_REDIS_MODE", "managed-redis", "Redis"),
            _ => return Err("只支持启动内置 PostgreSQL 或 Redis".into()),
        };
        let values = load_existing_env(&app);
        if !values.get(mode_key).is_some_and(|mode| mode == "managed") {
            return Err(format!("请先保存内置 {label} 配置"));
        }
        emit_progress(
            &app,
            "managed-service",
            &format!("正在启动内置 {label}…"),
            85,
        );
        compose_output(&app, &["up", "-d", "--wait", compose_service])?;
        emit_progress(
            &app,
            "managed-service",
            &format!("内置 {label} 已可连接"),
            100,
        );
        Ok(())
    })
    .await
    .map_err(|error| format!("内置服务启动任务异常结束：{error}"))?
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
    let number_f64 = |name: &str, fallback| {
        values
            .get(name)
            .and_then(|value| value.parse().ok())
            .unwrap_or(fallback)
    };
    let enabled = |name: &str, fallback| {
        values
            .get(name)
            .map(|value| matches!(value.as_str(), "1" | "true" | "yes" | "on"))
            .unwrap_or(fallback)
    };
    let milliseconds_as_minutes = |name: &str, fallback_minutes: u32| {
        values
            .get(name)
            .and_then(|value| value.parse::<u64>().ok())
            .and_then(|milliseconds| {
                let rounded_up = milliseconds.saturating_add(59_999) / 60_000;
                u32::try_from(rounded_up).ok()
            })
            .filter(|minutes| *minutes > 0)
            .unwrap_or(fallback_minutes)
    };
    InstallConfigView {
        database_mode: values
            .get("BOX_DATABASE_MODE")
            .cloned()
            .filter(|mode| matches!(mode.as_str(), "managed" | "external"))
            .unwrap_or_else(|| {
                if values
                    .get("BOX_DATABASE_HOST")
                    .is_some_and(|host| !host.trim().is_empty())
                {
                    "external".into()
                } else {
                    default_database_mode()
                }
            }),
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
        redis_mode: values
            .get("BOX_REDIS_MODE")
            .cloned()
            .filter(|mode| matches!(mode.as_str(), "disabled" | "managed" | "external"))
            .unwrap_or_else(|| {
                if values
                    .get("REDIS_HOST")
                    .is_some_and(|host| !host.trim().is_empty())
                {
                    "external".into()
                } else {
                    default_redis_mode()
                }
            }),
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
        database_pool_size: number_u32("BOX_DATABASE_POOL_SIZE", 4),
        storage_cache_redis_ttl: number_u8("STORAGE_CACHE_REDIS_TTL", 240),
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
        play_network_mode: values
            .get("BOX_PLAY_NETWORK_MODE")
            .cloned()
            .unwrap_or_else(default_play_network_mode),
        creator_network_mode: values
            .get("BOX_CREATOR_NETWORK_MODE")
            .cloned()
            .unwrap_or_else(default_creator_network_mode),
        creator_host: values
            .get("BOX_CREATOR_HOST")
            .cloned()
            .unwrap_or_else(default_creator_host),
        lan_ip: detect_lan_ip().unwrap_or_default(),
        play_port: number_u32("BOX_PLAY_PORT", 3121).try_into().unwrap_or(3121),
        voxa_port: number_u32("BOX_VOXA_PORT", 3123).try_into().unwrap_or(3123),
        creator_port: number_u32("BOX_CREATOR_PORT", 3127)
            .try_into()
            .unwrap_or(3127),
        player_service_port: number_u32("BOX_PLAYER_SERVICE_PORT", 3124)
            .try_into()
            .unwrap_or(3124),
        auth_portal_port: number_u32("BOX_AUTH_PORTAL_PORT", 3125)
            .try_into()
            .unwrap_or(3125),
        play_runtimes: number_u32("BOX_PLAY_MAX_RUNTIMES", 8),
        creator_edit_runtimes: number_u32("BOX_CREATOR_EDIT_MAX_RUNTIMES", 6),
        creator_play_runtimes: number_u32("BOX_CREATOR_PLAY_MAX_RUNTIMES", 4),
        creator_edit_prewarm_runtimes: number_u32("BOX_CREATOR_EDIT_PREWARM_RUNTIMES", 2),
        play_prewarm_runtimes: number_u32("BOX_PLAY_PREWARM_RUNTIMES", 2),
        player_limit: number_u32("BOX_LOCAL_PLAYER_LIMIT", 8),
        script_memory_mb: number_u32("BOX_SCRIPT_MEMORY_MB", 512),
        runtime_idle_minutes: milliseconds_as_minutes("BOX_RUNTIME_IDLE_TIMEOUT_MS", 15),
        runtime_start_timeout_minutes: milliseconds_as_minutes("BOX_RUNTIME_START_TIMEOUT_MS", 30),
        teleport_max_rooms: number_u32("BOX_TELEPORT_MAX_ROOMS", 64),
        teleport_room_idle_minutes: milliseconds_as_minutes(
            "BOX_TELEPORT_ROOM_IDLE_TIMEOUT_MS",
            15,
        ),
        registration_enabled: enabled("BOX_PLAYER_REGISTRATION_ENABLED", true),
        library_management_enabled: !enabled("BOX_PLAY_LIBRARY_READ_ONLY", false),
        player_service_memory_mb: memory_mebibytes(
            values.get("BOX_PLAYER_SERVICE_MEMORY_LIMIT"),
            1024,
        ),
        player_service_cpu_limit: number_f64("BOX_PLAYER_SERVICE_CPU_LIMIT", 1.0),
        auth_portal_memory_mb: memory_mebibytes(values.get("BOX_AUTH_PORTAL_MEMORY_LIMIT"), 128),
        auth_portal_cpu_limit: number_f64("BOX_AUTH_PORTAL_CPU_LIMIT", 0.5),
        creator_memory_mb: memory_mebibytes(values.get("BOX_CREATOR_MEMORY_LIMIT"), 6144),
        creator_cpu_limit: number_f64("BOX_CREATOR_CPU_LIMIT", 4.0),
        play_memory_mb: memory_mebibytes(values.get("BOX_PLAY_MEMORY_LIMIT"), 4096),
        play_cpu_limit: number_f64("BOX_PLAY_CPU_LIMIT", 4.0),
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
    let docker = docker_check();
    let docker_ready = docker.engine_ready;
    let docker_cli_available = docker.cli_available;
    let docker_cli_version = docker.cli_version;
    let docker_message = docker.message;
    let configured = env_path(&app).is_ok_and(|path| path.exists());
    let onboarding_completed = runtime_root(&app)
        .map(|root| root.join(ONBOARDING_LOCK_FILE).is_file())
        .unwrap_or(false);
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
        services.extend(
            MANAGED_SERVICE_NAMES
                .iter()
                .filter(|name| {
                    managed_service_configured(&environment, name)
                        && managed_service_installed(&app, name)
                })
                .map(|name| ServiceStatus {
                    name: (*name).into(),
                    enabled: true,
                    running: false,
                    state: "stopped".into(),
                }),
        );
    }
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
        docker_cli_available,
        docker_cli_version,
        docker_message,
        configured,
        onboarding_completed,
        all_healthy,
        services,
        data_directory,
    }
}

#[tauri::command]
fn complete_onboarding(app: AppHandle) -> Result<(), String> {
    let path = runtime_root(&app)?.join(ONBOARDING_LOCK_FILE);
    write_private_file(&path, "initialized\n", "初始化锁文件")
}

fn docker_check() -> DockerCheck {
    let cli = match docker_output(&["--version"]) {
        Ok(version) => version,
        Err(error) => {
            return DockerCheck {
                cli_available: false,
                cli_version: String::new(),
                engine_ready: false,
                message: docker_message(error),
            }
        }
    };
    match docker_output(&["info", "--format", "{{.ServerVersion}}"]) {
        Ok(_) => DockerCheck {
            cli_available: true,
            cli_version: cli,
            engine_ready: true,
            message: "Docker Desktop 已连接。".into(),
        },
        Err(error) => DockerCheck {
            cli_available: true,
            cli_version: cli,
            engine_ready: false,
            message: docker_message(error),
        },
    }
}

#[tauri::command]
fn get_docker_check() -> DockerCheck {
    docker_check()
}

fn unavailable_runtime_status() -> RuntimeEndpointStatus {
    RuntimeEndpointStatus {
        phase: "unavailable".into(),
        percent: 0,
        message: "运行时未启动".into(),
        updated_at: String::new(),
        cpu_percent: None,
        memory_bytes: None,
        uptime_ms: None,
    }
}

fn decode_chunked_http_body(bytes: &[u8]) -> Option<Vec<u8>> {
    let mut cursor = 0;
    let mut body = Vec::new();
    loop {
        let line_end = bytes[cursor..]
            .windows(2)
            .position(|window| window == b"\r\n")?
            + cursor;
        let size = std::str::from_utf8(&bytes[cursor..line_end])
            .ok()?
            .split(';')
            .next()?
            .trim();
        let size = usize::from_str_radix(size, 16).ok()?;
        cursor = line_end + 2;
        if bytes.len() < cursor + size + 2 || &bytes[cursor + size..cursor + size + 2] != b"\r\n" {
            return None;
        }
        body.extend_from_slice(&bytes[cursor..cursor + size]);
        cursor += size + 2;
        if size == 0 {
            return Some(body);
        }
    }
}

fn try_read_http_response(response: &[u8]) -> Option<(String, String)> {
    let header_end = response
        .windows(4)
        .position(|window| window == b"\r\n\r\n")?;
    let headers = std::str::from_utf8(&response[..header_end])
        .ok()?
        .to_string();
    let payload = &response[header_end + 4..];
    let body = if headers.lines().any(|line| {
        line.split_once(':').is_some_and(|(name, value)| {
            name.eq_ignore_ascii_case("transfer-encoding")
                && value.trim().eq_ignore_ascii_case("chunked")
        })
    }) {
        decode_chunked_http_body(payload)?
    } else if let Some(length) = headers.lines().find_map(|line| {
        line.split_once(':').and_then(|(name, value)| {
            name.eq_ignore_ascii_case("content-length")
                .then(|| value.trim().parse::<usize>().ok())
                .flatten()
        })
    }) {
        (payload.len() >= length).then(|| payload[..length].to_vec())?
    } else {
        payload.to_vec()
    };
    String::from_utf8(body).ok().map(|body| (headers, body))
}

fn read_http_response(stream: &mut TcpStream) -> Option<(String, String)> {
    let mut response = Vec::new();
    let mut buffer = [0_u8; 4096];
    loop {
        match stream.read(&mut buffer) {
            Ok(0) => return try_read_http_response(&response),
            Ok(read) => {
                response.extend_from_slice(&buffer[..read]);
                if let Some(parsed) = try_read_http_response(&response) {
                    return Some(parsed);
                }
                if response.len() > 128 * 1024 {
                    return None;
                }
            }
            Err(_) => return None,
        }
    }
}

fn runtime_endpoint_status_at(
    project_id: &str,
    address: SocketAddr,
    route_prefix: &str,
) -> RuntimeEndpointStatus {
    let Ok(mut stream) = TcpStream::connect_timeout(&address, Duration::from_millis(800)) else {
        return unavailable_runtime_status();
    };
    let _ = stream.set_read_timeout(Some(Duration::from_millis(1200)));
    let _ = stream.set_write_timeout(Some(Duration::from_millis(800)));
    let route_prefix = route_prefix.trim_matches('/');
    let path = if route_prefix.is_empty() {
        format!("/{project_id}/__local_runtime/status")
    } else {
        format!("/{route_prefix}/{project_id}/__local_runtime/status")
    };
    let request = format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n");
    if stream.write_all(request.as_bytes()).is_err() {
        return unavailable_runtime_status();
    }
    let Some((headers, body)) = read_http_response(&mut stream) else {
        return unavailable_runtime_status();
    };
    if !headers.starts_with("HTTP/1.1 200") && !headers.starts_with("HTTP/1.0 200") {
        return unavailable_runtime_status();
    }
    let Ok(value) = serde_json::from_str::<Value>(&body) else {
        return unavailable_runtime_status();
    };
    let percent = value
        .get("percent")
        .and_then(Value::as_u64)
        .unwrap_or(0)
        .min(100) as u8;
    RuntimeEndpointStatus {
        phase: value
            .get("phase")
            .and_then(Value::as_str)
            .unwrap_or("idle")
            .into(),
        percent,
        message: value
            .get("message")
            .and_then(Value::as_str)
            .unwrap_or("")
            .into(),
        updated_at: value
            .get("updatedAt")
            .and_then(Value::as_str)
            .unwrap_or("")
            .into(),
        cpu_percent: value.get("cpuPercent").and_then(Value::as_f64),
        memory_bytes: value.get("memoryBytes").and_then(Value::as_u64),
        uptime_ms: value.get("uptimeMs").and_then(Value::as_u64),
    }
}

fn runtime_endpoint_status(project_id: &str, port: u16) -> RuntimeEndpointStatus {
    let address = format!("127.0.0.1:{port}");
    let Some(address) = address
        .to_socket_addrs()
        .ok()
        .and_then(|mut values| values.next())
    else {
        return unavailable_runtime_status();
    };
    runtime_endpoint_status_at(project_id, address, "")
}

fn play_runtime_status(project_id: &str, port: u16) -> RuntimeEndpointStatus {
    let address = format!("127.0.0.1:{port}");
    let Some(address) = address
        .to_socket_addrs()
        .ok()
        .and_then(|mut values| values.next())
    else {
        return unavailable_runtime_status();
    };
    runtime_endpoint_status_at(project_id, address, "p")
}

#[tauri::command]
fn get_project_runtime_status(app: AppHandle) -> Result<ProjectRuntimeCatalog, String> {
    let runtime = runtime_root(&app)?;
    let play_port = fs::read_to_string(env_path(&app)?)
        .ok()
        .map(|content| env_port(&parse_env(&content), "BOX_PLAY_PORT", default_play_port()))
        .unwrap_or_else(default_play_port);
    let mut creator = fs::read_dir(runtime.join("apps/local-engine/projects"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .filter_map(|entry| {
            let project_id = entry.file_name().to_string_lossy().to_string();
            let metadata = fs::read_to_string(entry.path().join("project.json")).ok()?;
            let project = serde_json::from_str::<Value>(&metadata).ok()?;
            Some(ProjectRuntimeStatus {
                name: project
                    .get("name")
                    .and_then(Value::as_str)
                    .unwrap_or(&project_id)
                    .into(),
                permanent_map_id: project
                    .get("permanentMapId")
                    .and_then(Value::as_str)
                    .unwrap_or(&project_id)
                    .into(),
                map_role: project
                    .get("mapRole")
                    .and_then(Value::as_str)
                    .unwrap_or("main")
                    .into(),
                main_project_id: project
                    .get("mainProjectId")
                    .and_then(Value::as_str)
                    .unwrap_or(&project_id)
                    .into(),
                edit: runtime_endpoint_status(&project_id, 9967),
                play: unavailable_runtime_status(),
                project_id,
            })
        })
        .collect::<Vec<_>>();
    let mut play = fs::read_dir(runtime.join("apps/local-engine/play-worlds"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .filter_map(|entry| {
            let project_id = entry.file_name().to_string_lossy().to_string();
            let metadata = fs::read_to_string(entry.path().join("manifest.json")).ok()?;
            let world = serde_json::from_str::<Value>(&metadata).ok()?;
            (world.get("id").and_then(Value::as_str) == Some(project_id.as_str())).then(|| {
                ProjectRuntimeStatus {
                    name: world
                        .get("projectName")
                        .and_then(Value::as_str)
                        .unwrap_or(&project_id)
                        .into(),
                    permanent_map_id: world
                        .get("permanentMapId")
                        .and_then(Value::as_str)
                        .unwrap_or(&project_id)
                        .into(),
                    map_role: world
                        .get("mapRole")
                        .and_then(Value::as_str)
                        .unwrap_or("main")
                        .into(),
                    main_project_id: world
                        .get("mainProjectId")
                        .and_then(Value::as_str)
                        .unwrap_or(&project_id)
                        .into(),
                    edit: unavailable_runtime_status(),
                    play: play_runtime_status(&project_id, play_port),
                    project_id,
                }
            })
        })
        .collect::<Vec<_>>();
    creator.sort_by(|left, right| left.name.cmp(&right.name));
    play.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(ProjectRuntimeCatalog { creator, play })
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
        license: "本地部署用户许可协议（非开源、非商业）".into(),
        service_images,
    }
}

#[tauri::command]
fn get_legal_notices() -> LegalNotices {
    LegalNotices {
        license_name: "BOX3 Engine 本地部署用户许可协议".into(),
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

fn validate_service_name(app: &AppHandle, service: &str) -> Result<bool, String> {
    if SERVICE_NAMES.contains(&service) {
        return Ok(false);
    }
    if !MANAGED_SERVICE_NAMES.contains(&service) {
        return Err("未知的 BOX 服务".into());
    }
    let values = load_existing_env(app);
    if !managed_service_configured(&values, service) {
        return Err("该内置基础服务尚未启用".into());
    }
    if !managed_service_installed(app, service) {
        return Err("该内置基础服务尚未安装".into());
    }
    Ok(true)
}

#[tauri::command]
async fn control_service(app: AppHandle, service: String, action: String) -> Result<(), String> {
    let managed = validate_service_name(&app, &service)?;
    if !["start", "stop", "restart"].contains(&action.as_str()) {
        return Err("不支持的服务操作".into());
    }
    if !managed && action != "stop" {
        license::require(&app)?;
    }
    tauri::async_runtime::spawn_blocking(move || {
        if managed && action == "start" {
            compose_output(&app, &["up", "-d", "--wait", &service])?;
        } else if action == "start" {
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

#[cfg(target_os = "macos")]
fn choose_diagnostic_export(name: &str) -> Result<Option<PathBuf>, String> {
    let safe_name = name.replace('\\', "\\\\").replace('"', "\\\"");
    let mut command = Command::new("/usr/bin/osascript");
    command.args([
        "-e",
        &format!(
            "POSIX path of (choose file name with prompt \"导出 BOX3 Engine 脱敏诊断包\" default name \"{safe_name}\")"
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

#[cfg(target_os = "windows")]
fn choose_diagnostic_export(name: &str) -> Result<Option<PathBuf>, String> {
    let safe_name = name.replace('\'', "''");
    let mut command = Command::new("powershell");
    command.args(["-NoProfile", "-Command", &format!("Add-Type -AssemblyName System.Windows.Forms; $d=New-Object System.Windows.Forms.SaveFileDialog; $d.Filter='BOX3 Engine diagnostics (*.zip)|*.zip'; $d.FileName='{safe_name}'; if($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK){{Write-Output $d.FileName}}")]);
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

#[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
fn choose_diagnostic_export(name: &str) -> Result<Option<PathBuf>, String> {
    let mut command = Command::new("zenity");
    command.args([
        "--file-selection",
        "--save",
        "--confirm-overwrite",
        "--title=导出 BOX3 Engine 脱敏诊断包",
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
async fn export_diagnostics(app: AppHandle) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let suggested_name = format!("BOX-diagnostic-{timestamp}.zip");
        let Some(destination) = choose_diagnostic_export(&suggested_name)? else {
            return Ok(None);
        };
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
        create_diagnostic_zip(&staging, &destination)?;
        fs::remove_dir_all(staging).map_err(|error| format!("无法清理诊断临时目录：{error}"))?;
        Ok(Some(destination.to_string_lossy().to_string()))
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
        let database_mode = validate_database_mode(&config.database_mode)?;
        let redis_mode = validate_redis_mode(&config.redis_mode)?;
        if database_mode == "external" {
            emit_progress(&app, "preflight", "正在检查 PostgreSQL 数据库…", 20);
            let database_host = validate_host(&config.database_host, "数据库地址")?;
            let database_port = validate_port(&config.database_port)?;
            check_remote_endpoint(" PostgreSQL", &database_host, database_port)?;
        }
        if redis_mode == "external" {
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
        license::require(&app)?;
        docker_output(&["info", "--format", "{{.ServerVersion}}"])?;
        emit_progress(&app, "images", "正在检查离线镜像…", 20);
        ensure_images(&app)?;
        if managed_database_enabled(&app) {
            let image = managed_database_image(&app);
            if docker_output(&["image", "inspect", &image]).is_err() {
                return Err("尚未下载内置 PostgreSQL，请先在数据配置中保存并确认下载".into());
            }
            emit_progress(&app, "database", "正在启动内置 PostgreSQL…", 45);
            compose_output(&app, &["up", "-d", "--wait", "managed-postgres"])?;
        }
        if managed_redis_enabled(&app) {
            let image = managed_redis_image(&app);
            if docker_output(&["image", "inspect", &image]).is_err() {
                return Err("尚未下载内置 Redis，请先在数据配置中保存并确认下载".into());
            }
            emit_progress(&app, "redis", "正在启动内置 Redis…", 52);
            compose_output(&app, &["up", "-d", "--wait", "managed-redis"])?;
        }
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
fn get_license_status(app: AppHandle) -> Result<LicenseStatus, String> {
    license::status(&app)
}

#[tauri::command]
fn install_license(app: AppHandle, token: String) -> Result<LicenseStatus, String> {
    license::install(&app, &token)
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
            configured_url("BOX_CREATOR_PUBLIC_URL", "http://127.0.0.1:3127")
        ),
        format!(
            "{}/",
            configured_url("BOX_PLAY_PUBLIC_URL", "http://127.0.0.1:3121")
        ),
        format!(
            "{}/players",
            configured_url("BOX_PLAYER_SERVICE_PUBLIC_URL", "http://127.0.0.1:3124")
        ),
        format!(
            "{}/",
            configured_url("BOX_AUTH_PORTAL_PUBLIC_URL", "http://127.0.0.1:3125")
        ),
        format!(
            "{}/",
            configured_url("BOX_VOXA_PUBLIC_URL", "http://127.0.0.1:3123")
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

#[tauri::command]
fn open_community_group() -> Result<(), String> {
    let url = "https://qm.qq.com/q/oMdzAAN49a";
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(url);
        command
    };
    hide_window(&mut command);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开交流群：{error}"))
}

#[tauri::command]
fn open_docker_desktop_download() -> Result<(), String> {
    let url = "https://www.docker.com/products/docker-desktop/";
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", url]);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(url);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(url);
        command
    };
    hide_window(&mut command);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开 Docker Desktop 下载页面：{error}"))
}

#[tauri::command]
fn start_docker_desktop() -> Result<(), String> {
    let mut command = if docker_output(&["desktop", "version"]).is_ok() {
        let mut command = docker_command();
        command.args(["desktop", "start"]);
        command
    } else {
        #[cfg(target_os = "windows")]
        {
            let path = r"C:\Program Files\Docker\Docker\Docker Desktop.exe";
            if !Path::new(path).is_file() {
                return Err(
                    "Docker CLI 已安装，但未找到 Docker Desktop 程序。请手动启动 Docker Desktop。"
                        .into(),
                );
            }
            let mut command = Command::new("cmd");
            command.args(["/C", "start", "", path]);
            command
        }
        #[cfg(target_os = "macos")]
        {
            let mut command = Command::new("open");
            command.args(["-a", "Docker"]);
            command
        }
        #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
        return Err("请手动启动 Docker Desktop，然后重新检测。".into());
    };
    hide_window(&mut command);
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法启动 Docker Desktop：{error}"))
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
    use std::net::TcpListener;

    fn test_install_config() -> InstallConfigInput {
        InstallConfigInput {
            database_mode: default_database_mode(),
            database_host: String::new(),
            database_port: default_database_port(),
            database_name: default_database_name(),
            database_user: default_database_user(),
            database_password: String::new(),
            database_ssl: false,
            permission_token_secret: String::new(),
            player_auth_api_key: String::new(),
            play_admin_token: String::new(),
            redis_mode: default_redis_mode(),
            redis_host: String::new(),
            redis_port: default_redis_port(),
            redis_password: String::new(),
            redis_db: 0,
            storage_cache_redis_db: 1,
            database_pool_size: default_database_pool_size(),
            storage_cache_redis_ttl: default_storage_cache_redis_ttl(),
            auto_backup_enabled: false,
            auto_backup_interval_minutes: 60,
            auto_backup_retention_count: 24,
            auto_backup_retention_days: 30,
            public_host: default_public_host(),
            play_network_mode: default_play_network_mode(),
            creator_host: default_creator_host(),
            creator_network_mode: default_creator_network_mode(),
            play_port: 3121,
            voxa_port: 3123,
            creator_port: 3127,
            player_service_port: 3124,
            auth_portal_port: 3125,
            play_runtimes: default_play_runtimes(),
            creator_edit_runtimes: default_creator_edit_runtimes(),
            creator_play_runtimes: default_creator_play_runtimes(),
            creator_edit_prewarm_runtimes: default_creator_edit_prewarm_runtimes(),
            play_prewarm_runtimes: default_play_prewarm_runtimes(),
            player_limit: default_player_limit(),
            script_memory_mb: default_script_memory_mb(),
            runtime_idle_minutes: default_runtime_idle_minutes(),
            runtime_start_timeout_minutes: default_runtime_start_timeout_minutes(),
            teleport_max_rooms: default_teleport_max_rooms(),
            teleport_room_idle_minutes: default_teleport_room_idle_minutes(),
            registration_enabled: true,
            library_management_enabled: true,
            player_service_memory_mb: default_player_service_memory_mb(),
            player_service_cpu_limit: default_player_service_cpu_limit(),
            auth_portal_memory_mb: default_auth_portal_memory_mb(),
            auth_portal_cpu_limit: default_auth_portal_cpu_limit(),
            creator_memory_mb: default_creator_memory_mb(),
            creator_cpu_limit: default_creator_cpu_limit(),
            play_memory_mb: default_play_memory_mb(),
            play_cpu_limit: default_play_cpu_limit(),
        }
    }

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
            .contains("Docker CLI 已安装"));
    }

    #[test]
    fn distinguishes_an_installed_cli_from_a_missing_docker_socket() {
        assert!(docker_message(
            "Cannot connect to the Docker daemon at unix:///Users/test/.docker/run/docker.sock. Is the docker daemon running? no such file or directory".into()
        )
        .contains("Docker CLI 已安装"));
    }

    #[test]
    fn rejects_duplicate_service_ports() {
        let mut config = test_install_config();
        config.voxa_port = config.play_port;
        assert!(validate_service_ports(&config)
            .unwrap_err()
            .contains("不能使用同一个端口"));
    }

    #[test]
    fn rejects_invalid_automatic_backup_retention() {
        let mut config = test_install_config();
        config.auto_backup_enabled = true;
        config.auto_backup_interval_minutes = 0;
        assert!(validate_auto_backup_config(&config)
            .unwrap_err()
            .contains("自动备份间隔"));
    }

    #[test]
    fn validates_runtime_capacity_and_converts_minutes() {
        let mut config = test_install_config();
        assert!(validate_runtime_capacity(&config).is_ok());
        assert_eq!(minutes_to_milliseconds(15), 900_000);

        config.teleport_max_rooms = 1_025;
        assert!(validate_runtime_capacity(&config)
            .unwrap_err()
            .contains("私有房间上限"));
    }

    #[test]
    fn rejects_prewarm_above_runtime_limit() {
        let mut config = test_install_config();
        config.play_prewarm_runtimes = config.play_runtimes + 1;
        assert!(validate_runtime_capacity(&config)
            .unwrap_err()
            .contains("Play 预热数量"));
    }

    #[test]
    fn validates_operator_resources_and_parses_memory_units() {
        let mut config = test_install_config();
        assert!(validate_operator_performance(&config).is_ok());
        assert_eq!(memory_mebibytes(Some(&"1g".to_string()), 128), 1024);
        assert_eq!(memory_mebibytes(Some(&"512m".to_string()), 128), 512);

        config.auth_portal_cpu_limit = 0.0;
        assert!(validate_operator_performance(&config)
            .unwrap_err()
            .contains("登录门户 CPU"));
    }

    #[test]
    fn external_database_requires_a_host() {
        assert!(database_url(&BTreeMap::new())
            .unwrap_err()
            .contains("外部 PostgreSQL"));
    }

    #[test]
    fn managed_database_uses_the_internal_compose_host() {
        let values = BTreeMap::from([
            ("BOX_DATABASE_MODE".into(), "managed".into()),
            ("BOX_DATABASE_NAME".into(), "box".into()),
            ("BOX_DATABASE_USER".into(), "box".into()),
            ("BOX_DATABASE_PASSWORD".into(), "managed-secret".into()),
        ]);
        assert_eq!(
            database_url(&values).unwrap(),
            "postgresql://box:managed-secret@managed-postgres:5432/box"
        );
    }

    #[test]
    fn runtime_status_reads_a_complete_chunked_response_without_waiting_for_close() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let body = r#"{"phase":"ready","percent":100,"message":"运行时已就绪"}"#;
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let response = format!(
                "HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\nConnection: keep-alive\r\n\r\n{:X}\r\n{}\r\n0\r\n\r\n",
                body.len(),
                body
            );
            stream.write_all(response.as_bytes()).unwrap();
            std::thread::sleep(Duration::from_millis(1500));
        });

        let status = runtime_endpoint_status_at("project-id", address, "");
        server.join().unwrap();

        assert_eq!(status.phase, "ready");
        assert_eq!(status.percent, 100);
    }

    #[test]
    fn play_runtime_status_uses_the_public_play_route() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let address = listener.local_addr().unwrap();
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut request = [0_u8; 1024];
            let read = stream.read(&mut request).unwrap();
            let body = r#"{"phase":"ready","percent":100}"#;
            let response = format!(
                "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            stream.write_all(response.as_bytes()).unwrap();
            String::from_utf8_lossy(&request[..read]).into_owned()
        });

        let status = runtime_endpoint_status_at("project-id", address, "p");
        let request = server.join().unwrap();

        assert_eq!(status.phase, "ready");
        assert!(request.starts_with("GET /p/project-id/__local_runtime/status HTTP/1.1"));
    }

    #[test]
    fn managed_database_identity_keeps_internal_credentials_when_active_mode_changes() {
        let existing = BTreeMap::from([
            ("BOX_DATABASE_MODE".into(), "external".into()),
            ("BOX_DATABASE_NAME".into(), "external_database".into()),
            ("BOX_DATABASE_USER".into(), "external_user".into()),
            (
                "BOX_MANAGED_POSTGRES_DATABASE".into(),
                "managed_database".into(),
            ),
            ("BOX_MANAGED_POSTGRES_USER".into(), "managed_user".into()),
            (
                "BOX_MANAGED_POSTGRES_PASSWORD".into(),
                "managed-password".into(),
            ),
            ("REDIS_PASSWORD".into(), "external-redis-password".into()),
            (
                "BOX_MANAGED_REDIS_PASSWORD".into(),
                "managed-redis-password".into(),
            ),
        ]);
        assert_eq!(
            managed_database_identity(&existing),
            Some(("managed_database".into(), "managed_user".into()))
        );
        assert_eq!(
            managed_database_password(&existing).as_deref(),
            Some("managed-password")
        );
        assert_eq!(
            managed_redis_password(&existing).as_deref(),
            Some("managed-redis-password")
        );
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
    fn creator_network_policy_accepts_valid_public_hosts() {
        assert!(validate_creator_host("127.0.0.1").is_ok());
        assert!(validate_creator_host("192.168.1.10").is_ok());
        assert!(validate_creator_host("10.0.0.10").is_ok());
        assert!(validate_creator_host("0.0.0.0").is_err());
        assert!(validate_creator_host("203.0.113.20").is_ok());
        assert!(validate_creator_host("arena.example.com").is_ok());
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
        assert_eq!(values.get("BOX_DATABASE_MODE"), Some(&"external".into()));
        assert!(!values.contains_key("BOX_DATABASE_URL"));
        assert!(!values.contains_key("BOX_TRUST_PROXY"));
        assert!(!values.contains_key("BOX_RUNTIME_IDLE_TIMEOUT_MS"));
    }

    #[test]
    fn defaults_an_unconfigured_desktop_database_to_managed_mode() {
        let normalized = normalize_owner_environment(
            "BOX_DATABASE_HOST=\nBOX_DATABASE_PORT=5432\nBOX_DATABASE_NAME=box\nBOX_DATABASE_USER=box\n",
        )
        .unwrap();
        let values = parse_env(&normalized);
        assert_eq!(values.get("BOX_DATABASE_MODE"), Some(&"managed".into()));
        assert_eq!(values.get("BOX_REDIS_MODE"), Some(&"disabled".into()));
    }

    #[test]
    fn migrates_an_existing_redis_host_to_external_mode() {
        let normalized = normalize_owner_environment(
            "BOX_DATABASE_MODE=managed\nBOX_DATABASE_HOST=managed-postgres\nREDIS_HOST=cache.example.test\nREDIS_PORT=6379\n",
        )
        .unwrap();
        let values = parse_env(&normalized);
        assert_eq!(values.get("BOX_REDIS_MODE"), Some(&"external".into()));
        assert_eq!(values.get("REDIS_HOST"), Some(&"cache.example.test".into()));
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
            get_project_runtime_status,
            get_about_info,
            get_legal_notices,
            get_license_status,
            install_license,
            get_performance_status,
            list_backups,
            create_backup,
            restore_backup,
            delete_backup,
            export_backup,
            import_backup,
            test_remote_connection,
            has_managed_database_image,
            prepare_managed_database,
            has_managed_redis_image,
            prepare_managed_redis,
            get_managed_service_info,
            start_managed_service,
            save_configuration_command,
            start_services,
            stop_services,
            control_service,
            export_diagnostics,
            open_service,
            open_community_group,
            open_docker_desktop_download,
            start_docker_desktop,
            get_docker_check,
            complete_onboarding,
            verify_archive,
        ])
        .run(tauri::generate_context!())
        .expect("error while running BOX Local Engine manager");
}
