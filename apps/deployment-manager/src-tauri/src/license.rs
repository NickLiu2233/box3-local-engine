//! Local license installation and verification.
//!
//! The interface is intentionally small: callers can inspect, install, or
//! require a license. Shared rules live in manager-core; hardware identity,
//! installation secrets, paths and private file handling stay in this adapter.

use chrono::{DateTime, Utc};
#[cfg(any(target_os = "macos", target_os = "windows"))]
use std::process::Command;
use std::{fs, path::PathBuf};
use tauri::AppHandle;

use super::config::{random_hex, runtime_root, write_private_file};

pub(crate) use box_manager_core::license::LicenseStatus;
use box_manager_core::license::{self as shared, derive_device_id, LICENSE_FILE_NAME};

const PUBLIC_KEY: &str = include_str!("../../../../distribution/license-public-key.pem");

fn license_directory(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(runtime_root(app)?.join("license"))
}

pub(crate) fn license_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(license_directory(app)?.join(LICENSE_FILE_NAME))
}

pub(crate) fn device_id_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(license_directory(app)?.join("device-id"))
}

fn install_secret_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(license_directory(app)?.join("install-secret"))
}

fn time_checkpoint_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(license_directory(app)?.join("trusted-time.json"))
}

fn is_hex_secret(value: &str) -> bool {
    value.len() == 64 && value.bytes().all(|byte| byte.is_ascii_hexdigit())
}

#[cfg(target_os = "macos")]
fn keychain_install_secret() -> Result<Option<String>, String> {
    const SERVICE: &str = "com.box3.engine.local.license";
    const ACCOUNT: &str = "installation-secret";
    let output = Command::new("/usr/bin/security")
        .args(["find-generic-password", "-s", SERVICE, "-a", ACCOUNT, "-w"])
        .output()
        .map_err(|error| format!("无法读取 macOS Keychain：{error}"))?;
    if output.status.success() {
        let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return if is_hex_secret(&value) {
            Ok(Some(value.to_ascii_lowercase()))
        } else {
            Err("macOS Keychain 中的设备密钥无效".into())
        };
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    if stderr.contains("could not be found")
        || stderr.contains("The specified item could not be found")
    {
        Ok(None)
    } else {
        Err("无法访问 macOS Keychain 中的设备密钥".into())
    }
}

#[cfg(target_os = "macos")]
fn save_keychain_install_secret(secret: &str) -> Result<(), String> {
    const SERVICE: &str = "com.box3.engine.local.license";
    const ACCOUNT: &str = "installation-secret";
    let status = Command::new("/usr/bin/security")
        .args([
            "add-generic-password",
            "-U",
            "-s",
            SERVICE,
            "-a",
            ACCOUNT,
            "-w",
            secret,
        ])
        .status()
        .map_err(|error| format!("无法写入 macOS Keychain：{error}"))?;
    if status.success() {
        Ok(())
    } else {
        Err("无法将设备密钥写入 macOS Keychain".into())
    }
}

fn legacy_or_new_install_secret(app: &AppHandle) -> Result<String, String> {
    let path = install_secret_path(app)?;
    if let Ok(value) = fs::read_to_string(&path) {
        let value = value.trim();
        if is_hex_secret(value) {
            return Ok(value.to_ascii_lowercase());
        }
    }

    // Reuse the random portion of a legacy installation ID when upgrading.
    // The public device ID is replaced with a hardware-bound digest below.
    let legacy = fs::read_to_string(device_id_path(app)?)
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| value.starts_with("dev_") && is_hex_secret(&value[4..]));
    let value = legacy
        .map(|value| value[4..].to_ascii_lowercase())
        .unwrap_or_else(|| random_hex(32));
    Ok(value)
}

fn install_secret(app: &AppHandle) -> Result<String, String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(value) = keychain_install_secret()? {
            return Ok(value);
        }
        let value = legacy_or_new_install_secret(app)?;
        save_keychain_install_secret(&value)?;
        // The Keychain is now authoritative. Delete the legacy plaintext
        // after a successful migration so the install key is not part of a
        // copied runtime directory.
        let _ = fs::remove_file(install_secret_path(app)?);
        return Ok(value);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let path = install_secret_path(app)?;
        if let Ok(value) = fs::read_to_string(&path) {
            let value = value.trim();
            if is_hex_secret(value) {
                return Ok(value.to_ascii_lowercase());
            }
        }
        let value = legacy_or_new_install_secret(app)?;
        write_private_file(&path, format!("{value}\n"), "设备安装密钥")?;
        Ok(value)
    }
}

#[cfg(target_os = "macos")]
fn hardware_identity() -> Result<String, String> {
    let output = Command::new("/usr/sbin/ioreg")
        .args(["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .map_err(|error| format!("无法读取 macOS 设备标识：{error}"))?;
    if !output.status.success() {
        return Err("无法读取 macOS 设备标识".into());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    text.lines()
        .find(|line| line.contains("IOPlatformUUID"))
        .and_then(|line| line.split('"').nth(3))
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "macOS 未返回有效设备标识".into())
}

#[cfg(target_os = "windows")]
fn windows_tpm_public_identity() -> Result<String, String> {
    // Microsoft Platform Crypto Provider stores the private portion in TPM.
    // We retain only its public blob as part of the device identity; copying
    // the runtime directory cannot recreate this key on another computer.
    let script = r#"
$ErrorActionPreference = 'Stop'
$name = 'BOX3.Engine.DeviceKey.v1'
$provider = New-Object System.Security.Cryptography.CngProvider('Microsoft Platform Crypto Provider')
if ([System.Security.Cryptography.CngKey]::Exists($name, $provider)) {
  $key = [System.Security.Cryptography.CngKey]::Open($name, $provider)
} else {
  $parameters = New-Object System.Security.Cryptography.CngKeyCreationParameters
  $parameters.Provider = $provider
  $parameters.KeyUsage = [System.Security.Cryptography.CngKeyUsages]::Signing
  $parameters.ExportPolicy = [System.Security.Cryptography.CngExportPolicies]::None
  $key = [System.Security.Cryptography.CngKey]::Create([System.Security.Cryptography.CngAlgorithm]::EcdsaP256, $name, $parameters)
}
[Convert]::ToBase64String($key.Export([System.Security.Cryptography.CngKeyBlobFormat]::EccPublicBlob))
"#;
    let output = Command::new("powershell")
        .args([
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            script,
        ])
        .output()
        .map_err(|error| format!("无法访问 Windows TPM：{error}"))?;
    if !output.status.success() {
        return Err("Windows TPM 不可用，无法创建不可导出设备密钥".into());
    }
    let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if value.len() < 32
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || b"+/=".contains(&byte))
    {
        return Err("Windows TPM 未返回有效设备公钥".into());
    }
    Ok(value)
}

#[cfg(target_os = "windows")]
fn hardware_identity() -> Result<String, String> {
    let output = Command::new("reg")
        .args([
            "query",
            r"HKLM\SOFTWARE\Microsoft\Cryptography",
            "/v",
            "MachineGuid",
        ])
        .output()
        .map_err(|error| format!("无法读取 Windows 设备标识：{error}"))?;
    if !output.status.success() {
        return Err("无法读取 Windows 设备标识".into());
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let machine_guid = text
        .lines()
        .find(|line| line.contains("MachineGuid"))
        .and_then(|line| line.split_whitespace().last())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
        .ok_or_else(|| "Windows 未返回有效设备标识".to_string())?;
    Ok(format!("{machine_guid}:{}", windows_tpm_public_identity()?))
}

#[cfg(target_os = "linux")]
fn hardware_identity() -> Result<String, String> {
    ["/etc/machine-id", "/var/lib/dbus/machine-id"]
        .iter()
        .find_map(|path| fs::read_to_string(path).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "无法读取 Linux 设备标识".into())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn hardware_identity() -> Result<String, String> {
    Err("当前操作系统不支持设备绑定".into())
}

fn trusted_now(app: &AppHandle) -> Result<DateTime<Utc>, String> {
    shared::trusted_now(
        &time_checkpoint_path(app)?,
        &install_secret(app)?,
        Utc::now(),
        |path, content| write_private_file(path, content, "可信时间缓存"),
    )
}

pub(crate) fn device_id(app: &AppHandle) -> Result<String, String> {
    let value = derive_device_id(&hardware_identity()?, &install_secret(app)?);
    let path = device_id_path(app)?;
    if let Ok(current) = fs::read_to_string(&path) {
        let current = current.trim();
        if current == value {
            return Ok(current.to_string());
        }
    }
    write_private_file(&path, format!("{value}\n"), "设备身份")?;
    Ok(value)
}

pub(crate) fn status(app: &AppHandle) -> Result<LicenseStatus, String> {
    let device = device_id(app)?;
    let token = match fs::read_to_string(license_path(app)?) {
        Ok(token) => Some(token),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => None,
        Err(error) => return Err(format!("无法读取许可证：{error}")),
    };
    let now = if token.is_some() {
        trusted_now(app)?
    } else {
        Utc::now()
    };
    Ok(shared::status_from_token(
        token.as_deref(),
        PUBLIC_KEY,
        &device,
        now,
    ))
}

pub(crate) fn install(app: &AppHandle, token: &str) -> Result<LicenseStatus, String> {
    if token.len() > 16 * 1024 {
        return Err("许可证内容过大".into());
    }
    let device = device_id(app)?;
    shared::verify_token(token, PUBLIC_KEY, &device, trusted_now(app)?)?;
    write_private_file(
        &license_path(app)?,
        format!("{}\n", token.trim()),
        "个人学习许可证",
    )?;
    status(app)
}

pub(crate) fn require(app: &AppHandle) -> Result<(), String> {
    let current = status(app)?;
    if current.valid {
        Ok(())
    } else {
        Err(format!("{}；请先前往许可证管理安装或续期", current.message))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn boxlic_can_be_written_when_a_legacy_lic_path_is_a_directory() {
        let root = std::env::temp_dir().join(format!("box-license-test-{}", random_hex(8)));
        let directory = root.join("license");
        fs::create_dir_all(directory.join("box3-license.lic")).unwrap();
        let target = directory.join(LICENSE_FILE_NAME);

        write_private_file(&target, "box3l1.test\n", "个人学习许可证").unwrap();

        assert_eq!(fs::read_to_string(&target).unwrap(), "box3l1.test\n");
        fs::remove_dir_all(root).unwrap();
    }
}
