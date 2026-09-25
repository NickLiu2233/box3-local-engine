//! Sensitive configuration redaction, diagnostics and license persistence.

use crate::*;

pub(crate) fn is_sensitive_env_key(key: &str) -> bool {
    let key = key.to_ascii_uppercase();
    key.contains("PASSWORD")
        || key.contains("SECRET")
        || key.contains("TOKEN")
        || key.contains("API_KEY")
        || key == "BOX_DATABASE_URL"
}
pub(crate) fn redact_text(text: String, values: &BTreeMap<String, String>) -> String {
    let mut redacted = text;
    for (key, value) in values {
        if !is_sensitive_env_key(key) || value.len() < 4 {
            continue;
        }
        redacted = redacted.replace(value.as_str(), "[REDACTED]");
    }
    redacted
}
/// Writes a support diagnostic with secrets redacted before it reaches disk.
/// Both the source and derived environment are included because deployment
/// problems often result from differences between those two documents.
pub(crate) fn export_diagnostics(app: &App) -> Result<String, String> {
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
pub(crate) fn database_fields(value: Option<&String>) -> (String, String, String, String, String) {
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
pub(crate) fn url_host(value: Option<&String>, fallback: &str) -> String {
    value
        .and_then(|url| shared_config::host_from_http_url(url))
        .unwrap_or_else(|| fallback.into())
}
pub(crate) fn is_hex_secret(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}
pub(crate) fn is_device_id(value: &str) -> bool {
    value.len() == 68
        && value.starts_with("dev_")
        && value[4..].bytes().all(|byte| byte.is_ascii_hexdigit())
}
/// The installation secret must survive a package upgrade. Keeping it in the
/// unpacked directory meant that replacing the ZIP silently produced a new
/// device identity and invalidated an installed license, so the operator's
/// `.env` is now authoritative and the old file is only a migration fallback.
/// Returns the stable installation secret used to derive the license device
/// ID. It survives package upgrades and is protected by a process-local lock
/// to avoid two first-run requests writing different values.
pub(crate) fn install_secret(app: &App) -> Result<String, String> {
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
pub(crate) fn device(app: &App) -> Result<String, String> {
    let dir = app.root.join("license");
    let path = dir.join("device-id");
    remove_empty_file_placeholder(&path)?;
    // The device file is shared with every licensed service and may have been
    // created by the native desktop launcher. A manager running in Docker sees
    // the Docker VM machine-id, not the host machine-id, so recalculating here
    // would overwrite a valid host identity and immediately invalidate the
    // installed license. Existing valid identities are therefore authoritative;
    // derivation is only the first-install fallback.
    if let Ok(existing) = fs::read_to_string(&path) {
        let existing = existing.trim();
        if is_device_id(existing) {
            grant_runtime_read(&path)?;
            return Ok(existing.to_string());
        }
    }
    let value = install_secret(app)?;
    let hw_path =
        env::var("BOX_LICENSE_HARDWARE_ID_FILE").unwrap_or_else(|_| "/run/host-machine-id".into());
    let hw = fs::read_to_string(&hw_path)
        .or_else(|_| fs::read_to_string("/run/host-machine-id"))
        .or_else(|_| fs::read_to_string("/etc/machine-id"))
        .map_err(|_| "无法读取 Linux 设备标识")?;
    let id = shared_license::derive_web_device_id(&hw, &value);
    private(&path, &id)?;
    grant_runtime_read(&path)?;
    Ok(id)
}

/// Licensed services run as the unprivileged `node` user, while the Web
/// manager writes bind-mounted files as root. Keep the owner private but grant
/// that fixed runtime group read-only access. On a local non-root test/desktop
/// process the file owner cannot be changed, so only the restrictive mode is
/// applied; Linux server manager containers always run as root.
fn grant_runtime_read(path: &FsPath) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::{MetadataExt, PermissionsExt};
        fs::set_permissions(path, fs::Permissions::from_mode(0o640))
            .map_err(|error| error.to_string())?;
        if fs::metadata(path).map_err(|error| error.to_string())?.uid() == 0 {
            std::os::unix::fs::chown(path, None, Some(1000)).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}
/// Create the bind-mounted device file before any Compose operation can create
/// a business container. Docker preserves a missing-file bind mount as a
/// directory/inode in an already-created container, so creating it later is
/// too late for that container.
pub(crate) fn initialize_license_storage(app: &App) -> Result<(), String> {
    device(app).map(|_| ())
}
pub(crate) fn license(app: &App, install: Option<&str>) -> Result<Value, String> {
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
        grant_runtime_read(&path)?;
    } else if token.is_some() {
        grant_runtime_read(&path)?;
    }
    serde_json::to_value(shared_license::status_from_token(
        token.as_deref(),
        KEY,
        &id,
        now,
    ))
    .map_err(|error| error.to_string())
}
