//! Local license installation and verification.
//!
//! The interface is intentionally small: callers can inspect, install, or
//! require a license. Token parsing, signature checks, dates, device binding,
//! and private file handling remain inside this module.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Utc};
use ed25519_dalek::{pkcs8::DecodePublicKey, Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, path::PathBuf, process::Command};
use tauri::AppHandle;

use super::config::{random_hex, runtime_root, write_private_file};

const TOKEN_PREFIX: &str = "box3l1";
const LICENSE_FILE_NAME: &str = "box3-license.boxlic";
const PUBLIC_KEY: &str = include_str!("../../../../distribution/license-public-key.pem");
const FEATURES: [&str; 5] = [
    "creator",
    "play",
    "voxa",
    "player-service",
    "player-auth-portal",
];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
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

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TimeCheckpoint {
    last_seen_ms: i64,
    signature: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LicenseStatus {
    pub(crate) installed: bool,
    pub(crate) valid: bool,
    pub(crate) device_id: String,
    pub(crate) license_id: String,
    pub(crate) license_type: String,
    pub(crate) holder_id: String,
    pub(crate) expires_at: String,
    pub(crate) message: String,
}

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

fn derive_device_id(hardware: &str, secret: &str) -> String {
    let mut digest = Sha256::new();
    digest.update(b"box3-engine-device-v2\0");
    digest.update(hardware.trim().to_ascii_lowercase().as_bytes());
    digest.update(b"\0");
    digest.update(secret.as_bytes());
    format!("dev_{:x}", digest.finalize())
}

fn checkpoint_signature(secret: &str, timestamp_ms: i64) -> String {
    let mut digest = Sha256::new();
    digest.update(b"box3-engine-trusted-time-v1\0");
    digest.update(secret.as_bytes());
    digest.update(b"\0");
    digest.update(timestamp_ms.to_le_bytes());
    format!("{:x}", digest.finalize())
}

fn trusted_now(app: &AppHandle) -> Result<DateTime<Utc>, String> {
    const ROLLBACK_TOLERANCE_MS: i64 = 5 * 60 * 1000;
    let secret = install_secret(app)?;
    let now = Utc::now();
    let now_ms = now.timestamp_millis();
    let path = time_checkpoint_path(app)?;
    let previous = fs::read_to_string(&path)
        .ok()
        .map(|value| serde_json::from_str::<TimeCheckpoint>(&value))
        .transpose()
        .map_err(|_| "可信时间缓存无效".to_string())?;
    if let Some(previous) = previous {
        if previous.signature != checkpoint_signature(&secret, previous.last_seen_ms) {
            return Err("可信时间缓存完整性校验失败".into());
        }
        if now_ms + ROLLBACK_TOLERANCE_MS < previous.last_seen_ms {
            return Err("检测到系统时间回拨，请恢复正确时间后重试".into());
        }
        if now_ms <= previous.last_seen_ms {
            return Ok(DateTime::from_timestamp_millis(previous.last_seen_ms).unwrap_or(now));
        }
    }
    let checkpoint = TimeCheckpoint {
        last_seen_ms: now_ms,
        signature: checkpoint_signature(&secret, now_ms),
    };
    let content = serde_json::to_string(&checkpoint)
        .map_err(|error| format!("无法序列化可信时间缓存：{error}"))?;
    write_private_file(&path, format!("{content}\n"), "可信时间缓存")?;
    Ok(now)
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

fn decode(value: &str, label: &str) -> Result<Vec<u8>, String> {
    URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|_| format!("许可证{label}编码无效"))
}

fn verify_token(
    token: &str,
    expected_device: &str,
    current_time: DateTime<Utc>,
) -> Result<LicensePayload, String> {
    let parts = token.trim().split('.').collect::<Vec<_>>();
    if parts.len() != 3 || parts[0] != TOKEN_PREFIX {
        return Err("许可证格式无效".into());
    }
    let key = VerifyingKey::from_public_key_pem(PUBLIC_KEY)
        .map_err(|_| "内置许可证公钥无效".to_string())?;
    let signature = Signature::from_slice(&decode(parts[2], "签名")?)
        .map_err(|_| "许可证签名格式无效".to_string())?;
    key.verify_strict(parts[1].as_bytes(), &signature)
        .map_err(|_| "许可证签名无效".to_string())?;
    let payload: LicensePayload = serde_json::from_slice(&decode(parts[1], "内容")?)
        .map_err(|_| "许可证内容无法解析".to_string())?;
    if payload.format_version != 1
        || payload.license_type != "personal-learning"
        || payload.commercial_use
        || payload.license_id.is_empty()
        || payload.holder_id.is_empty()
    {
        return Err("许可证类型或内容无效".into());
    }
    if payload.device_id != expected_device {
        return Err("许可证与当前设备不匹配".into());
    }
    if FEATURES
        .iter()
        .any(|required| !payload.features.iter().any(|feature| feature == required))
    {
        return Err("许可证未包含完整的个人学习功能".into());
    }
    let issued_at = DateTime::parse_from_rfc3339(&payload.issued_at)
        .map_err(|_| "许可证生效时间无效".to_string())?;
    let expires_at = DateTime::parse_from_rfc3339(&payload.expires_at)
        .map_err(|_| "许可证到期时间无效".to_string())?;
    if issued_at > current_time + chrono::Duration::minutes(5) {
        return Err("许可证尚未生效".into());
    }
    if expires_at <= current_time {
        return Err("许可证已到期，请续期后再使用".into());
    }
    Ok(payload)
}

pub(crate) fn status(app: &AppHandle) -> Result<LicenseStatus, String> {
    let device = device_id(app)?;
    let path = license_path(app)?;
    let Ok(token) = fs::read_to_string(&path) else {
        return Ok(LicenseStatus {
            installed: false,
            valid: false,
            device_id: device,
            license_id: String::new(),
            license_type: String::new(),
            holder_id: String::new(),
            expires_at: String::new(),
            message: "尚未安装个人学习许可证".into(),
        });
    };
    let current_time = trusted_now(app)?;
    match verify_token(&token, &device, current_time) {
        Ok(payload) => Ok(LicenseStatus {
            installed: true,
            valid: true,
            device_id: device,
            license_id: payload.license_id,
            license_type: payload.license_type,
            holder_id: payload.holder_id,
            expires_at: payload.expires_at,
            message: "许可证有效".into(),
        }),
        Err(message) => Ok(LicenseStatus {
            installed: true,
            valid: false,
            device_id: device,
            license_id: String::new(),
            license_type: String::new(),
            holder_id: String::new(),
            expires_at: String::new(),
            message,
        }),
    }
}

pub(crate) fn install(app: &AppHandle, token: &str) -> Result<LicenseStatus, String> {
    if token.len() > 16 * 1024 {
        return Err("许可证内容过大".into());
    }
    let device = device_id(app)?;
    verify_token(token, &device, trusted_now(app)?)?;
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
    fn malformed_token_is_rejected_before_parsing() {
        assert_eq!(
            verify_token("not-a-license", "dev_test", Utc::now()).unwrap_err(),
            "许可证格式无效"
        );
    }

    #[test]
    fn device_id_changes_with_hardware_or_installation_secret() {
        let original = derive_device_id("machine-a", &"a".repeat(64));
        assert_eq!(original.len(), 68);
        assert!(original.starts_with("dev_"));
        assert_ne!(original, derive_device_id("machine-b", &"a".repeat(64)));
        assert_ne!(original, derive_device_id("machine-a", &"b".repeat(64)));
    }

    #[test]
    fn time_checkpoint_signature_is_bound_to_the_installation_secret() {
        assert_ne!(
            checkpoint_signature("a", 1_000),
            checkpoint_signature("b", 1_000)
        );
        assert_ne!(
            checkpoint_signature("a", 1_000),
            checkpoint_signature("a", 1_001)
        );
    }

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
