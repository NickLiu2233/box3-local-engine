//! Shared license rules. Hosts supply hardware identity, installation secret,
//! public key, clock and private-file writer; this module never loads keys.
//! Checkpoint updates are serialized within this process. Hosts sharing a path
//! across processes must provide external serialization. Writers must not reenter.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use chrono::{DateTime, Utc};
use ed25519_dalek::{pkcs8::DecodePublicKey, Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{fs, io::ErrorKind, path::Path};

const TOKEN_PREFIX: &str = "box3l1";
pub const LICENSE_FILE_NAME: &str = "box3-license.boxlic";
use crate::services::APPLICATION_SERVICES as FEATURES;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicensePayload {
    pub format_version: u8,
    pub license_id: String,
    #[serde(rename = "type")]
    pub license_type: String,
    pub holder_id: String,
    pub device_id: String,
    pub issued_at: String,
    pub expires_at: String,
    pub features: Vec<String>,
    pub commercial_use: bool,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct TimeCheckpoint {
    last_seen_ms: i64,
    signature: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub installed: bool,
    pub valid: bool,
    pub device_id: String,
    pub license_id: String,
    pub license_type: String,
    pub holder_id: String,
    pub issued_at: String,
    pub expires_at: String,
    pub message: String,
}

pub fn derive_device_id(hardware: &str, secret: &str) -> String {
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

/// Preserve the Web host's historical Unicode lowercase and secret trimming.
/// Desktop hosts must keep using `derive_device_id` (ASCII lowercase).
pub fn derive_web_device_id(hardware: &str, secret: &str) -> String {
    derive_device_id(&hardware.trim().to_lowercase(), secret.trim())
}

/// Validate the legacy checkpoint and advance its high-water mark. Only a
/// missing file initializes a checkpoint. The writer must persist privately
/// before returning success; errors propagate and never permit verification.
pub fn trusted_now(
    path: &Path,
    secret: &str,
    now: DateTime<Utc>,
    write_private: impl FnOnce(&Path, &str) -> Result<(), String>,
) -> Result<DateTime<Utc>, String> {
    static CHECKPOINT_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = CHECKPOINT_LOCK
        .lock()
        .map_err(|_| "可信时间缓存锁无效".to_string())?;
    const ROLLBACK_TOLERANCE_MS: i64 = 5 * 60 * 1000;
    let now_ms = now.timestamp_millis();
    let previous = match fs::read_to_string(path) {
        Ok(value) => Some(
            serde_json::from_str::<TimeCheckpoint>(&value)
                .map_err(|_| "可信时间缓存无效".to_string())?,
        ),
        Err(error) if error.kind() == ErrorKind::NotFound => None,
        Err(error) => return Err(format!("无法读取可信时间缓存：{error}")),
    };
    if let Some(previous) = previous {
        if previous.signature != checkpoint_signature(secret, previous.last_seen_ms) {
            return Err("可信时间缓存完整性校验失败".into());
        }
        let previous_time = DateTime::from_timestamp_millis(previous.last_seen_ms)
            .ok_or_else(|| "可信时间缓存时间戳无效".to_string())?;
        if now_ms.saturating_add(ROLLBACK_TOLERANCE_MS) < previous.last_seen_ms {
            return Err("检测到系统时间回拨，请恢复正确时间后重试".into());
        }
        if now_ms <= previous.last_seen_ms {
            return Ok(previous_time);
        }
    }
    let checkpoint = TimeCheckpoint {
        last_seen_ms: now_ms,
        signature: checkpoint_signature(secret, now_ms),
    };
    let content = serde_json::to_string(&checkpoint)
        .map_err(|error| format!("无法序列化可信时间缓存：{error}"))?;
    write_private(path, &format!("{content}\n"))?;
    Ok(now)
}

fn decode(value: &str, label: &str) -> Result<Vec<u8>, String> {
    URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|_| format!("许可证{label}编码无效"))
}

pub fn verify_token(
    token: &str,
    public_key_pem: &str,
    expected_device: &str,
    current_time: DateTime<Utc>,
) -> Result<LicensePayload, String> {
    if token.len() > 16 * 1024 {
        return Err("许可证内容过大".into());
    }
    let parts = token.trim().split('.').collect::<Vec<_>>();
    if parts.len() != 3 || parts[0] != TOKEN_PREFIX {
        return Err("许可证格式无效".into());
    }
    let key = VerifyingKey::from_public_key_pem(public_key_pem)
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
    if issued_at.signed_duration_since(current_time) > chrono::Duration::minutes(5) {
        return Err("许可证尚未生效".into());
    }
    if expires_at <= current_time {
        return Err("许可证已到期，请续期后再使用".into());
    }
    Ok(payload)
}

/// A complete, stable camelCase response for both hosts. Trusted-time errors
/// should propagate from the host before calling this function.
pub fn status_from_token(
    token: Option<&str>,
    public_key_pem: &str,
    device: &str,
    current_time: DateTime<Utc>,
) -> LicenseStatus {
    let device = device.to_string();
    let Some(token) = token else {
        return LicenseStatus {
            installed: false,
            valid: false,
            device_id: device,
            license_id: String::new(),
            license_type: String::new(),
            holder_id: String::new(),
            issued_at: String::new(),
            expires_at: String::new(),
            message: "尚未安装个人学习许可证".into(),
        };
    };
    match verify_token(token, public_key_pem, &device, current_time) {
        Ok(payload) => LicenseStatus {
            installed: true,
            valid: true,
            device_id: device,
            license_id: payload.license_id,
            license_type: payload.license_type,
            holder_id: payload.holder_id,
            issued_at: payload.issued_at,
            expires_at: payload.expires_at,
            message: "许可证有效".into(),
        },
        Err(message) => LicenseStatus {
            installed: true,
            valid: false,
            device_id: device,
            license_id: String::new(),
            license_type: String::new(),
            holder_id: String::new(),
            issued_at: String::new(),
            expires_at: String::new(),
            message,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use ed25519_dalek::{pkcs8::EncodePublicKey, Signer, SigningKey};
    use serde_json::{json, Value};
    use std::{
        path::PathBuf,
        sync::atomic::{AtomicU64, Ordering},
    };

    // Only deterministic test seeds: no production private keys or host secrets.
    fn key() -> SigningKey {
        SigningKey::from_bytes(&[42; 32])
    }
    fn pem() -> String {
        key()
            .verifying_key()
            .to_public_key_pem(Default::default())
            .unwrap()
    }
    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-09-10T12:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }
    fn payload() -> Value {
        json!({"formatVersion":1, "licenseId":"lic_test", "type":"personal-learning",
            "holderId":"holder_test", "deviceId":"dev_test",
            "issuedAt":"2026-09-10T11:00:00Z", "expiresAt":"2026-09-11T12:00:00Z",
            "features":FEATURES, "commercialUse":false})
    }
    fn sign(value: &Value, key: &SigningKey) -> String {
        let encoded = URL_SAFE_NO_PAD.encode(serde_json::to_vec(value).unwrap());
        format!(
            "box3l1.{encoded}.{}",
            URL_SAFE_NO_PAD.encode(key.sign(encoded.as_bytes()).to_bytes())
        )
    }
    fn verify(value: &Value) -> Result<LicensePayload, String> {
        verify_token(&sign(value, &key()), &pem(), "dev_test", now())
    }
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            static NEXT: AtomicU64 = AtomicU64::new(0);
            let path = std::env::temp_dir().join(format!(
                "box-core-license-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir(&path).unwrap();
            Self(path)
        }
        fn path(&self) -> PathBuf {
            self.0.join("trusted-time.json")
        }
        fn advance(&self, time: DateTime<Utc>) -> Result<DateTime<Utc>, String> {
            trusted_now(&self.path(), "fixture-secret", time, |path, content| {
                use std::io::Write;
                let mut options = fs::OpenOptions::new();
                options.write(true).create(true).truncate(true);
                #[cfg(unix)]
                {
                    use std::os::unix::fs::OpenOptionsExt;
                    options.mode(0o600);
                }
                options
                    .open(path)
                    .and_then(|mut file| file.write_all(content.as_bytes()))
                    .map_err(|e| e.to_string())
            })
        }
        fn checkpoint(&self, timestamp: i64) {
            fs::write(
                self.path(),
                serde_json::to_vec(&TimeCheckpoint {
                    last_seen_ms: timestamp,
                    signature: checkpoint_signature("fixture-secret", timestamp),
                })
                .unwrap(),
            )
            .unwrap();
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn valid_signature_and_complete_status_schema() {
        let token = sign(&payload(), &key());
        assert_eq!(
            verify(&payload()).unwrap().license_type,
            "personal-learning"
        );
        let valid = status_from_token(Some(&token), &pem(), "dev_test", now());
        assert!(valid.valid && valid.installed);
        let value = serde_json::to_value(valid).unwrap();
        assert_eq!(value["licenseType"], "personal-learning");
        assert_eq!(value["licenseId"], "lic_test");
        for token in [None, Some("bad")] {
            let status = status_from_token(token, &pem(), "dev_test", now());
            assert!(!status.valid);
            assert_eq!(status.installed, token.is_some());
            let result = serde_json::to_value(status).unwrap();
            assert_eq!(
                result.as_object().unwrap().keys().collect::<Vec<_>>(),
                value.as_object().unwrap().keys().collect::<Vec<_>>()
            );
            assert_eq!(result["licenseId"], "");
            assert_eq!(result["deviceId"], "dev_test");
        }
    }
    #[test]
    fn wrong_signature_and_tampered_payload_rejected() {
        let wrong = sign(&payload(), &SigningKey::from_bytes(&[43; 32]));
        assert_eq!(
            verify_token(&wrong, &pem(), "dev_test", now()).unwrap_err(),
            "许可证签名无效"
        );
        let token = sign(&payload(), &key());
        let mut altered = payload();
        altered["deviceId"] = json!("dev_other");
        let tampered = format!(
            "box3l1.{}.{}",
            URL_SAFE_NO_PAD.encode(serde_json::to_vec(&altered).unwrap()),
            token.split('.').nth(2).unwrap()
        );
        assert_eq!(
            verify_token(&tampered, &pem(), "dev_test", now()).unwrap_err(),
            "许可证签名无效"
        );
    }
    #[test]
    fn device_expiry_and_issue_boundaries() {
        let mut p = payload();
        p["deviceId"] = json!("dev_other");
        assert_eq!(verify(&p).unwrap_err(), "许可证与当前设备不匹配");
        p = payload();
        p["expiresAt"] = json!(now().to_rfc3339());
        assert_eq!(verify(&p).unwrap_err(), "许可证已到期，请续期后再使用");
        p["expiresAt"] = json!((now() - chrono::Duration::seconds(1)).to_rfc3339());
        assert!(verify(&p).is_err());
        p = payload();
        p["issuedAt"] = json!((now() + chrono::Duration::minutes(5)).to_rfc3339());
        assert!(verify(&p).is_ok());
        p["issuedAt"] = json!((now()
            + chrono::Duration::minutes(5)
            + chrono::Duration::milliseconds(1))
        .to_rfc3339());
        assert_eq!(verify(&p).unwrap_err(), "许可证尚未生效");
    }
    #[test]
    fn required_fields_features_type_and_dates_are_enforced() {
        for (field, value) in [
            ("formatVersion", json!(2)),
            ("type", json!("commercial")),
            ("commercialUse", json!(true)),
            ("holderId", json!("")),
            ("licenseId", json!("")),
            ("issuedAt", json!("invalid")),
            ("expiresAt", json!("invalid")),
        ] {
            let mut p = payload();
            p[field] = value;
            assert!(verify(&p).is_err(), "{field}");
        }
        for missing in FEATURES {
            let mut p = payload();
            p["features"] = json!(FEATURES
                .iter()
                .filter(|f| **f != missing)
                .collect::<Vec<_>>());
            assert_eq!(verify(&p).unwrap_err(), "许可证未包含完整的个人学习功能");
        }
        let mut p = payload();
        p.as_object_mut().unwrap().remove("deviceId");
        assert!(verify(&p).is_err());
        assert_eq!(
            verify_token("bad", &pem(), "dev_test", now()).unwrap_err(),
            "许可证格式无效"
        );
        assert_eq!(
            verify_token(&"a".repeat(16 * 1024 + 1), &pem(), "dev_test", now()).unwrap_err(),
            "许可证内容过大"
        );
    }
    #[test]
    fn checkpoint_initialization_advancement_and_rollback_boundaries() {
        let f = Fixture::new();
        assert_eq!(f.advance(now()).unwrap(), now());
        let before = fs::read(f.path()).unwrap();
        assert_eq!(
            f.advance(now() - chrono::Duration::minutes(5)).unwrap(),
            now()
        );
        assert_eq!(fs::read(f.path()).unwrap(), before);
        assert_eq!(
            f.advance(now() - chrono::Duration::minutes(5) - chrono::Duration::milliseconds(1))
                .unwrap_err(),
            "检测到系统时间回拨，请恢复正确时间后重试"
        );
        assert_eq!(fs::read(f.path()).unwrap(), before);
        let later = now() + chrono::Duration::seconds(1);
        assert_eq!(f.advance(later).unwrap(), later);
        assert_ne!(fs::read(f.path()).unwrap(), before);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(f.path()).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
    }
    #[test]
    fn tolerated_rollback_cannot_revive_expired_license() {
        let f = Fixture::new();
        f.advance(now()).unwrap();
        let effective = f.advance(now() - chrono::Duration::minutes(4)).unwrap();
        let mut p = payload();
        p["expiresAt"] = json!(now().to_rfc3339());
        assert_eq!(
            verify_token(&sign(&p, &key()), &pem(), "dev_test", effective).unwrap_err(),
            "许可证已到期，请续期后再使用"
        );
    }
    #[test]
    fn legacy_checkpoint_integrity_and_invalid_timestamp_fail_closed() {
        assert_eq!(
            checkpoint_signature("fixture-secret", 1789041600000),
            "2e8f66d1dd0c1a0941201154f81c49a07d62f3f22f477c000f3b15a4e46efdd9"
        );
        let f = Fixture::new();
        f.checkpoint(now().timestamp_millis());
        assert_eq!(f.advance(now()).unwrap(), now());
        let err = trusted_now(&f.path(), "other-secret", now(), |_, _| {
            panic!("must not write")
        })
        .unwrap_err();
        assert_eq!(err, "可信时间缓存完整性校验失败");
        let mut value: Value = serde_json::from_slice(&fs::read(f.path()).unwrap()).unwrap();
        value["lastSeenMs"] = json!(now().timestamp_millis() + 1);
        fs::write(f.path(), value.to_string()).unwrap();
        assert_eq!(f.advance(now()).unwrap_err(), "可信时间缓存完整性校验失败");
        f.checkpoint(i64::MAX);
        assert_eq!(f.advance(now()).unwrap_err(), "可信时间缓存时间戳无效");
        fs::write(f.path(), "broken").unwrap();
        assert_eq!(f.advance(now()).unwrap_err(), "可信时间缓存无效");
    }
    #[test]
    fn checkpoint_io_failures_are_not_treated_as_missing() {
        let f = Fixture::new();
        fs::create_dir(f.path()).unwrap();
        assert!(f
            .advance(now())
            .unwrap_err()
            .starts_with("无法读取可信时间缓存"));
        fs::remove_dir(f.path()).unwrap();
        assert_eq!(
            trusted_now(&f.path(), "fixture-secret", now(), |_, _| Err(
                "write failed".into()
            ))
            .unwrap_err(),
            "write failed"
        );
        assert!(!f.path().exists());
    }
    #[test]
    fn device_ids_preserve_historical_normalization_and_binding() {
        let secret = "a".repeat(64);
        let original = derive_device_id("machine-a", &secret);
        assert_eq!(original, derive_device_id(" MACHINE-A\n", &secret));
        assert_eq!(original, derive_web_device_id(" MACHINE-A\n", &secret));
        assert_ne!(original, derive_device_id("machine-b", &secret));
        assert_ne!(original, derive_device_id("machine-a", &"b".repeat(64)));
        assert_ne!(
            derive_device_id("Ä", &secret),
            derive_web_device_id("Ä", &secret)
        );
        assert_eq!(
            derive_web_device_id("Ä", " secret "),
            derive_device_id("ä", "secret")
        );
        assert_eq!(
            original,
            "dev_1a1c2cd8d82438f22c58c2dbd6f7914b02a8c3a35e39d3901a62fb6fc9ab08fc"
        );
        assert_eq!(original.len(), 68);
    }
}
