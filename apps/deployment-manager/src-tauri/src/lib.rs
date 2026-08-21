use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs,
    io::Read,
    net::{TcpListener, TcpStream, ToSocketAddrs, UdpSocket},
    path::{Path, PathBuf},
    process::{Command, Output},
    time::{Duration, SystemTime, UNIX_EPOCH},
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
    public_host: String,
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
            public_host: "127.0.0.1".into(),
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
    #[serde(default = "default_public_host")]
    public_host: String,
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
fn default_public_host() -> String {
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

fn detect_lan_ip() -> Option<String> {
    // Connecting a UDP socket only asks the OS which local interface it would
    // use; it does not send traffic to the probe address.
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:80").ok()?;
    let address = socket.local_addr().ok()?.ip();
    (!address.is_loopback() && !address.is_unspecified()).then(|| address.to_string())
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

fn resolve_secret(
    name: &str,
    submitted: &str,
    existing: &BTreeMap<String, String>,
) -> Result<String, String> {
    let submitted = submitted.trim();
    if !submitted.is_empty() {
        if submitted.len() < 16 {
            return Err(format!("{name} 至少需要 16 个字符"));
        }
        return Ok(submitted.to_string());
    }
    Ok(existing
        .get(name)
        .filter(|value| value.len() >= 16)
        .cloned()
        .unwrap_or_else(|| random_hex(32)))
}

fn validate_raw_environment(content: &str) -> Result<(), String> {
    if content.len() > 512 * 1024 {
        return Err(".env 内容不能超过 512 KB".into());
    }
    if content.contains('\0') {
        return Err(".env 不能包含空字符".into());
    }
    for (index, line) in content.lines().enumerate() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, _)) = line.split_once('=') else {
            return Err(format!(".env 第 {} 行必须使用 KEY=VALUE 格式", index + 1));
        };
        let valid_key = key.chars().enumerate().all(|(index, character)| {
            character == '_'
                || character.is_ascii_uppercase()
                || (index > 0 && character.is_ascii_digit())
        });
        if key.is_empty() || !valid_key {
            return Err(format!(".env 第 {} 行的变量名无效", index + 1));
        }
    }
    Ok(())
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

fn docker_command() -> Command {
    if let Some(configured) = std::env::var_os("BOX_DOCKER_CLI") {
        if !configured.is_empty() {
            return Command::new(configured);
        }
    }
    #[cfg(target_os = "macos")]
    let candidates = [
        "/Applications/Docker.app/Contents/Resources/bin/docker",
        "/usr/local/bin/docker",
        "/opt/homebrew/bin/docker",
    ];
    #[cfg(target_os = "windows")]
    let candidates = [
        r"C:\Program Files\Docker\Docker\resources\bin\docker.exe",
        r"C:\Program Files\Docker\Docker\resources\docker.exe",
    ];
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let candidates = [
        "/usr/bin/docker",
        "/usr/local/bin/docker",
        "/snap/bin/docker",
    ];
    if let Some(path) = candidates.iter().find(|path| Path::new(path).is_file()) {
        return Command::new(path);
    }
    Command::new("docker")
}

fn docker_message(error: String) -> String {
    let normalized = error.to_lowercase();
    if normalized.contains("no such file")
        || normalized.contains("not found")
        || normalized.contains("找不到")
    {
        "未找到 Docker Desktop。请先安装 Docker Desktop，然后重新打开本程序。".into()
    } else if normalized.contains("cannot connect")
        || normalized.contains("docker daemon")
        || normalized.contains("dockerdesktoplinuxengine")
        || normalized.contains("_ping")
    {
        "Docker Desktop 已安装但尚未就绪。请启动 Docker Desktop，等待状态变为 Running 后刷新。"
            .into()
    } else {
        format!("Docker Desktop 不可用：{error}")
    }
}

fn docker_output(args: &[&str]) -> Result<String, String> {
    let mut command = docker_command();
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
    validate_service_ports(config)?;
    let bind_ip = if public_host == "127.0.0.1" || public_host == "localhost" {
        "127.0.0.1"
    } else {
        "0.0.0.0"
    };
    let existing = load_existing_env(app);
    let existing_file = env_path(app)?;
    let mut content = if existing_file.exists() {
        fs::read_to_string(&existing_file).map_err(|error| format!("无法读取现有配置：{error}"))?
    } else {
        ENV_TEMPLATE.to_string()
    };

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
    set_env(&mut content, "BOX_IMAGE_TAG", IMAGE_TAG)?;
    set_env(&mut content, "BOX_BIND_IP", bind_ip)?;
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
        "BOX_PLAY_PUBLIC_URL",
        &format!("http://{public_host}:{}", config.play_port),
    )?;
    set_env(
        &mut content,
        "BOX_VOXA_PUBLIC_URL",
        &format!("http://{public_host}:{}", config.voxa_port),
    )?;
    set_env(
        &mut content,
        "BOX_VOXA_ALLOWED_ORIGINS",
        &format!(
            "http://{public_host}:{},http://{public_host}:{}",
            config.voxa_port, config.creator_port
        ),
    )?;
    set_env(
        &mut content,
        "BOX_CREATOR_PUBLIC_URL",
        &format!("http://{public_host}:{}", config.creator_port),
    )?;
    // Creator APIs mutate source projects. Keep the browser Host allow-list
    // aligned with the one public address selected by the owner instead of
    // accepting arbitrary LAN hosts.
    set_env(&mut content, "BOX_CREATOR_ALLOWED_HOSTS", &public_host)?;
    set_env(
        &mut content,
        "BOX_PLAYER_SERVICE_PUBLIC_URL",
        &format!("http://{public_host}:{}", config.player_service_port),
    )?;
    set_env(
        &mut content,
        "BOX_AUTH_PORTAL_PUBLIC_URL",
        &format!("http://{public_host}:{}", config.auth_portal_port),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_LOGIN_URL",
        &format!("http://{public_host}:{}", config.auth_portal_port),
    )?;
    set_env(
        &mut content,
        "BOX_PLAYER_AUTH_ALLOWED_ORIGINS",
        &format!(
            "http://{public_host}:{},http://{public_host}:{},http://{public_host}:{}",
            config.play_port, config.creator_port, config.auth_portal_port
        ),
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

fn synchronize_runtime_image_tag(app: &AppHandle) -> Result<(), String> {
    ensure_runtime_files(app)?;
    let path = env_path(app)?;
    let mut content = if path.exists() {
        fs::read_to_string(&path).map_err(|error| format!("无法读取部署配置：{error}"))?
    } else {
        ENV_TEMPLATE.to_string()
    };
    // The app owns the offline image archive and its tag. A configuration
    // created by an older app version must not make Compose pull or build an
    // obsolete tag from source after the user upgrades the application.
    set_env(&mut content, "BOX_IMAGE_TAG", IMAGE_TAG)?;
    set_env(
        &mut content,
        "BOX_PLAY_PLATFORM",
        if cfg!(target_arch = "aarch64") {
            "linux/arm64"
        } else {
            "linux/amd64"
        },
    )?;
    fs::write(path, content).map_err(|error| format!("无法更新镜像运行配置：{error}"))
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
        public_host: values
            .get("BOX_PLAY_PUBLIC_URL")
            .and_then(|url| url.strip_prefix("http://"))
            .and_then(|value| value.rsplit_once(':').map(|(host, _)| host.to_string()))
            .unwrap_or_else(default_public_host),
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
fn get_raw_environment(app: AppHandle) -> Result<String, String> {
    ensure_runtime_files(&app)?;
    let path = env_path(&app)?;
    if path.exists() {
        fs::read_to_string(path).map_err(|error| format!("无法读取 .env：{error}"))
    } else {
        Ok(ENV_TEMPLATE.to_string())
    }
}

#[tauri::command]
fn save_raw_environment(app: AppHandle, content: String) -> Result<(), String> {
    validate_raw_environment(&content)?;
    ensure_runtime_files(&app)?;
    fs::write(env_path(&app)?, format!("{}\n", content.trim_end()))
        .map_err(|error| format!("无法保存 .env：{error}"))
}

#[tauri::command]
fn get_system_status(app: AppHandle) -> SystemStatus {
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
                    level: "neutral".into(),
                    message: "未配置（选填）".into(),
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
            compose_output(&app, &["up", "-d", &service])?;
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
            fs::copy(&from, &to)
                .map_err(|error| format!("无法备份 {}：{error}", from.display()))?;
        }
    }
    Ok(())
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
        let compose_state = compose_output(&app, &["ps", "--format", "json"])
            .unwrap_or_else(|error| format!("Compose state unavailable: {error}"));
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
        fs::write(staging.join("logs.txt"), redact_text(logs, &environment))
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
        emit_progress(&app, "preflight", "正在检查可选远程数据服务…", 20);
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
        let database_enabled = load_existing_env(&app)
            .get("BOX_DATABASE_URL")
            .is_some_and(|url| !url.trim().is_empty());
        let label = match scope.as_str() {
            "all" => {
                emit_progress(&app, "start", "正在启动全部服务…", 65);
                compose_output(&app, &["up", "-d", "--remove-orphans"])?;
                "全部服务"
            }
            "creator" => {
                emit_progress(&app, "start", "正在启动创作端…", 65);
                let mut args = vec!["up", "-d", "creator", "voxa"];
                if database_enabled {
                    args.extend(["player-service", "player-auth-portal"]);
                }
                compose_output(&app, &args)?;
                "创作端"
            }
            "play" => {
                emit_progress(&app, "start", "正在启动游玩端…", 65);
                let mut args = vec!["up", "-d", "play"];
                if database_enabled {
                    args.extend(["player-service", "player-auth-portal"]);
                }
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
    let values = load_existing_env(&app);
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
    file_sha256(&archive)
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
            public_host: default_public_host(),
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
    fn backup_archive_round_trip_preserves_file_tree() {
        let root = std::env::temp_dir().join(format!("box-manager-backup-{}", random_hex(8)));
        let source = root.join("source");
        let nested = source.join("apps/local-engine/projects");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("world.json"), "world-data").unwrap();
        let archive = root.join(
            if cfg!(target_os = "windows") || cfg!(target_os = "macos") {
                "snapshot.zip"
            } else {
                "snapshot.tar.gz"
            },
        );
        create_backup_archive(&source, &archive).unwrap();
        let restored = root.join("restored");
        fs::create_dir_all(&restored).unwrap();
        extract_backup_archive(&archive, &restored).unwrap();
        assert_eq!(
            fs::read_to_string(restored.join("apps/local-engine/projects/world.json")).unwrap(),
            "world-data"
        );
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_install_config,
            get_raw_environment,
            save_raw_environment,
            get_system_status,
            get_performance_status,
            list_backups,
            create_backup,
            restore_backup,
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
