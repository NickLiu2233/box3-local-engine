//! Operator configuration and generated Docker runtime files.
//!
//! The public interface deliberately stays small: commands ask for paths,
//! parse or update environment values, and persist private files. Everything
//! about atomic writes and configuration syntax remains local to this module.

use rand::{rngs::OsRng, RngCore};
use std::{
    collections::BTreeMap,
    fs,
    net::UdpSocket,
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

const COMPOSE_TEMPLATE: &str = include_str!("../../../../docker-compose.yml");
pub(crate) const IMAGE_TAG: &str = match option_env!("BOX_MANAGER_IMAGE_TAG") {
    Some(value) => value,
    None => "0.1.0",
};
pub(crate) const SERVICE_NAMES: [&str; 5] = [
    "creator",
    "play",
    "player-service",
    "player-auth-portal",
    "voxa",
];

pub(crate) fn detect_lan_ip() -> Option<String> {
    // UDP connect only asks the OS to choose an outbound interface; it does
    // not send traffic to the documentation-only probe address.
    let socket = UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("192.0.2.1:80").ok()?;
    let address = socket.local_addr().ok()?.ip();
    (!address.is_loopback() && !address.is_unspecified()).then(|| address.to_string())
}

pub(crate) fn runtime_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法确定应用数据目录：{error}"))?
        .join("runtime");
    fs::create_dir_all(&root).map_err(|error| format!("无法创建应用数据目录：{error}"))?;
    Ok(root)
}

pub(crate) fn env_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join(".env"))
}

pub(crate) fn runtime_env_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join(".runtime.env"))
}

pub(crate) fn compose_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join("docker-compose.yml"))
}

pub(crate) fn ensure_runtime_files(app: &AppHandle) -> Result<(), String> {
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

pub(crate) fn parse_env(content: &str) -> BTreeMap<String, String> {
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

pub(crate) fn set_env(content: &mut String, key: &str, value: &str) -> Result<(), String> {
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

pub(crate) fn remove_env(content: &mut String, key: &str) {
    *content = format!(
        "{}\n",
        content
            .lines()
            .filter(|line| !line.trim_start().starts_with(&format!("{key}=")))
            .collect::<Vec<_>>()
            .join("\n")
    );
}

pub(crate) fn write_private_file(
    path: &Path,
    content: impl AsRef<[u8]>,
    label: &str,
) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| format!("无法确定 {label} 的保存目录"))?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建 {label} 目录：{error}"))?;
    let temporary = parent.join(format!(
        ".{}.{}.tmp",
        path.file_name().unwrap_or_default().to_string_lossy(),
        random_hex(8)
    ));
    fs::write(&temporary, content).map_err(|error| format!("无法写入 {label}：{error}"))?;
    #[cfg(unix)]
    fs::set_permissions(&temporary, fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("无法保护 {label} 权限：{error}"))?;
    if let Err(error) = fs::rename(&temporary, path) {
        #[cfg(windows)]
        {
            fs::remove_file(path).map_err(|remove_error| {
                let _ = fs::remove_file(&temporary);
                format!("无法替换 {label}：{error}；无法移除旧文件：{remove_error}")
            })?;
            fs::rename(&temporary, path).map_err(|rename_error| {
                let _ = fs::remove_file(&temporary);
                format!("无法替换 {label}：{rename_error}")
            })?;
        }
        #[cfg(not(windows))]
        {
            let _ = fs::remove_file(&temporary);
            return Err(format!("无法替换 {label}：{error}"));
        }
    }
    #[cfg(unix)]
    fs::set_permissions(path, fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("无法保护 {label} 权限：{error}"))?;
    Ok(())
}

pub(crate) fn random_hex(bytes: usize) -> String {
    let mut data = vec![0_u8; bytes];
    OsRng.fill_bytes(&mut data);
    data.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(crate) fn resolve_secret(
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

pub(crate) fn validate_raw_environment(content: &str) -> Result<(), String> {
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
