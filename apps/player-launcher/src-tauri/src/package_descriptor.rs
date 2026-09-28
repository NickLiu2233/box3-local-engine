use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ring::signature::{UnparsedPublicKey, ECDSA_P256_SHA256_FIXED};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::{self, File},
    io::Read,
    path::Path,
};

const MAX_ASSET_COUNT: usize = 20_000;
const MAX_ASSET_BYTES: u64 = 512 * 1024 * 1024;
const MAX_PACKAGE_BYTES: u64 = 20 * 1024 * 1024 * 1024;
const BASE58_ALPHABET: &str = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageAsset {
    pub(crate) hash: String,
    pub(crate) size: u64,
    kind: String,
    content_type: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PackageSignature {
    algorithm: String,
    key_id: String,
    public_key: Value,
    value: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PackageDescriptor {
    pub(crate) format_version: u32,
    pub(crate) permanent_map_id: String,
    pub(crate) access_id: String,
    pub(crate) release_version: String,
    pub(crate) required: Vec<PackageAsset>,
    optional: Vec<PackageAsset>,
    pub(crate) manifest_digest: String,
    signature: PackageSignature,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct TrustedSigningKey {
    key_id: String,
    public_key: Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DescriptorDigestPayload<'a> {
    format_version: u32,
    permanent_map_id: &'a str,
    access_id: &'a str,
    release_version: &'a str,
    required: &'a [PackageAsset],
    optional: &'a [PackageAsset],
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DescriptorSignaturePayload<'a> {
    format_version: u32,
    permanent_map_id: &'a str,
    access_id: &'a str,
    release_version: &'a str,
    required: &'a [PackageAsset],
    optional: &'a [PackageAsset],
    manifest_digest: &'a str,
}

fn valid_content_hash(hash: &str) -> bool {
    (hash.len() == 43
        && hash
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-'))
        || (hash.len() == 46
            && hash.starts_with("Qm")
            && hash
                .bytes()
                .all(|byte| BASE58_ALPHABET.as_bytes().contains(&byte)))
}

fn valid_path_component(value: &str, max_length: usize) -> bool {
    !value.is_empty()
        && value.len() <= max_length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
}

fn json_bytes<T: Serialize>(value: &T) -> Result<Vec<u8>, String> {
    serde_json::to_vec(value).map_err(|_| "地图资源描述符无法序列化".to_string())
}

fn sha256(bytes: &[u8]) -> Vec<u8> {
    ring::digest::digest(&ring::digest::SHA256, bytes)
        .as_ref()
        .to_vec()
}

fn base58_multihash(hash: &str) -> Option<Vec<u8>> {
    let mut decoded = Vec::new();
    for character in hash.bytes() {
        let mut carry = BASE58_ALPHABET
            .bytes()
            .position(|candidate| candidate == character)?;
        for byte in &mut decoded {
            carry += (*byte as usize) * 58;
            *byte = (carry & 0xff) as u8;
            carry >>= 8;
        }
        while carry > 0 {
            decoded.push((carry & 0xff) as u8);
            carry >>= 8;
        }
    }
    let leading_zeroes = hash.bytes().take_while(|byte| *byte == b'1').count();
    let mut multihash = vec![0; leading_zeroes];
    multihash.extend(decoded.iter().rev());
    Some(multihash)
}

fn verify_hash_digest(hash: &str, digest: &[u8]) -> bool {
    if hash.len() == 43 {
        return URL_SAFE_NO_PAD.encode(digest) == hash;
    }
    base58_multihash(hash).is_some_and(|multihash| {
        multihash.len() == 34
            && multihash[0] == 0x12
            && multihash[1] == 0x20
            && &multihash[2..] == digest
    })
}

#[cfg(test)]
fn verify_hash_bytes(hash: &str, bytes: &[u8]) -> bool {
    verify_hash_digest(hash, &sha256(bytes))
}

pub(crate) fn verify_hash_file(
    hash: &str,
    path: &Path,
    expected_size: u64,
) -> Result<bool, String> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(metadata) => metadata,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(_) => return Err("无法检查本地地图资源".into()),
    };
    if !metadata.file_type().is_file() || metadata.len() != expected_size {
        return Ok(false);
    }
    let mut file = File::open(path).map_err(|_| "无法读取本地地图资源".to_string())?;
    let mut context = ring::digest::Context::new(&ring::digest::SHA256);
    let mut buffer = [0u8; 128 * 1024];
    loop {
        let bytes = file
            .read(&mut buffer)
            .map_err(|_| "读取本地地图资源失败".to_string())?;
        if bytes == 0 {
            break;
        }
        context.update(&buffer[..bytes]);
    }
    Ok(verify_hash_digest(hash, context.finish().as_ref()))
}

fn validate_asset(asset: &PackageAsset) -> Result<(), String> {
    if !valid_content_hash(&asset.hash)
        || asset.size == 0
        || asset.size > MAX_ASSET_BYTES
        || asset.kind != "static"
        || asset.content_type != "application/octet-stream"
    {
        return Err("签名资源清单中包含无效或不受支持的资源".into());
    }
    Ok(())
}

pub(crate) fn validate_descriptor(
    descriptor_json: &str,
    trusted_key_json: &str,
) -> Result<PackageDescriptor, String> {
    let descriptor: PackageDescriptor =
        serde_json::from_str(descriptor_json).map_err(|_| "地图资源描述符格式无效".to_string())?;
    let trusted: TrustedSigningKey =
        serde_json::from_str(trusted_key_json).map_err(|_| "服务器签名公钥格式无效".to_string())?;
    if descriptor.format_version != 1
        || descriptor.signature.algorithm != "ES256"
        || descriptor.signature.key_id != trusted.key_id
        || !valid_path_component(&descriptor.permanent_map_id, 128)
        || !valid_path_component(&descriptor.access_id, 63)
        || descriptor.release_version.is_empty()
        || descriptor.release_version.len() > 128
        || descriptor.release_version.chars().any(char::is_control)
        || descriptor.manifest_digest.len() != 43
        || descriptor.required.len() > MAX_ASSET_COUNT
        || descriptor.optional.len() > MAX_ASSET_COUNT
    {
        return Err("地图资源描述符与服务器信任信息不匹配".into());
    }
    for field in ["kty", "crv", "x", "y"] {
        if descriptor.signature.public_key.get(field) != trusted.public_key.get(field) {
            return Err("地图资源描述符签名公钥与服务器引导公钥不匹配".into());
        }
    }
    let mut hashes = std::collections::HashSet::new();
    let mut total_size = 0u64;
    for asset in descriptor.required.iter().chain(&descriptor.optional) {
        validate_asset(asset)?;
        if !hashes.insert(asset.hash.as_str()) {
            return Err("地图资源描述符包含重复资源".into());
        }
        total_size = total_size.saturating_add(asset.size);
        if total_size > MAX_PACKAGE_BYTES {
            return Err("地图资源包超出启动器总大小上限".into());
        }
    }
    let digest_payload = DescriptorDigestPayload {
        format_version: descriptor.format_version,
        permanent_map_id: &descriptor.permanent_map_id,
        access_id: &descriptor.access_id,
        release_version: &descriptor.release_version,
        required: &descriptor.required,
        optional: &descriptor.optional,
    };
    if URL_SAFE_NO_PAD.encode(sha256(&json_bytes(&digest_payload)?)) != descriptor.manifest_digest {
        return Err("地图资源描述符摘要校验失败".into());
    }
    let payload = DescriptorSignaturePayload {
        format_version: descriptor.format_version,
        permanent_map_id: &descriptor.permanent_map_id,
        access_id: &descriptor.access_id,
        release_version: &descriptor.release_version,
        required: &descriptor.required,
        optional: &descriptor.optional,
        manifest_digest: &descriptor.manifest_digest,
    };
    let payload_bytes = json_bytes(&payload)?;
    let signature = URL_SAFE_NO_PAD
        .decode(&descriptor.signature.value)
        .map_err(|_| "地图资源描述符签名格式无效".to_string())?;
    let x = descriptor.signature.public_key["x"]
        .as_str()
        .and_then(|value| URL_SAFE_NO_PAD.decode(value).ok())
        .ok_or_else(|| "服务器签名公钥无效".to_string())?;
    let y = descriptor.signature.public_key["y"]
        .as_str()
        .and_then(|value| URL_SAFE_NO_PAD.decode(value).ok())
        .ok_or_else(|| "服务器签名公钥无效".to_string())?;
    if x.len() != 32 || y.len() != 32 {
        return Err("服务器签名公钥无效".into());
    }
    let mut public_point = Vec::with_capacity(65);
    public_point.push(4);
    public_point.extend(x);
    public_point.extend(y);
    UnparsedPublicKey::new(&ECDSA_P256_SHA256_FIXED, public_point)
        .verify(&payload_bytes, &signature)
        .map_err(|_| "地图资源描述符签名验证失败".to_string())?;
    Ok(descriptor)
}

#[cfg(test)]
mod tests {
    use super::BASE58_ALPHABET;
    use super::{
        sha256, valid_content_hash, validate_descriptor, verify_hash_bytes, verify_hash_file,
        DescriptorDigestPayload, DescriptorSignaturePayload, PackageAsset,
    };
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    use ring::{
        rand::SystemRandom,
        signature::{EcdsaKeyPair, KeyPair, ECDSA_P256_SHA256_FIXED_SIGNING},
    };
    use serde_json::json;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn encode_base58(bytes: &[u8]) -> String {
        let zeroes = bytes.iter().take_while(|byte| **byte == 0).count();
        let mut digits = Vec::<u8>::new();
        for byte in bytes.iter().skip(zeroes) {
            let mut carry = *byte as usize;
            for digit in &mut digits {
                carry += (*digit as usize) << 8;
                *digit = (carry % 58) as u8;
                carry /= 58;
            }
            while carry > 0 {
                digits.push((carry % 58) as u8);
                carry /= 58;
            }
        }
        let mut result = "1".repeat(zeroes);
        result.extend(
            digits
                .iter()
                .rev()
                .map(|digit| BASE58_ALPHABET.as_bytes()[*digit as usize] as char),
        );
        result
    }

    #[test]
    fn verifies_sha256_content_address_hashes() {
        let content = b"verified map asset";
        let hash = URL_SAFE_NO_PAD.encode(sha256(content));
        assert!(valid_content_hash(&hash));
        assert!(verify_hash_bytes(&hash, content));
        assert!(!verify_hash_bytes(&hash, b"tampered"));

        let digest = sha256(content);
        let mut multihash = vec![0x12, 0x20];
        multihash.extend(digest);
        let cid = encode_base58(&multihash);
        assert!(valid_content_hash(&cid));
        assert!(verify_hash_bytes(&cid, content));
        assert!(!verify_hash_bytes(&cid, b"tampered"));

        let file = std::env::temp_dir().join(format!(
            "box-player-blob-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
        ));
        fs::write(&file, content).unwrap();
        assert!(verify_hash_file(&hash, &file, content.len() as u64).unwrap());
        assert!(!verify_hash_file(&hash, &file, 1).unwrap());
        fs::remove_file(file).unwrap();
    }

    #[test]
    fn verifies_descriptor_signature_against_bootstrap_key_and_digest() {
        let rng = SystemRandom::new();
        let pkcs8 = EcdsaKeyPair::generate_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, &rng).unwrap();
        let key = EcdsaKeyPair::from_pkcs8(&ECDSA_P256_SHA256_FIXED_SIGNING, pkcs8.as_ref(), &rng)
            .unwrap();
        let public = key.public_key().as_ref();
        let public_jwk = json!({
            "kty": "EC",
            "crv": "P-256",
            "x": URL_SAFE_NO_PAD.encode(&public[1..33]),
            "y": URL_SAFE_NO_PAD.encode(&public[33..65]),
        });
        let content_hash = URL_SAFE_NO_PAD.encode(sha256(b"map block"));
        let required = vec![PackageAsset {
            hash: content_hash,
            size: 9,
            kind: "static".into(),
            content_type: "application/octet-stream".into(),
        }];
        let digest_payload = DescriptorDigestPayload {
            format_version: 1,
            permanent_map_id: "permanent-map",
            access_id: "world-one",
            release_version: "v1",
            required: &required,
            optional: &[],
        };
        let manifest_digest =
            URL_SAFE_NO_PAD.encode(sha256(&serde_json::to_vec(&digest_payload).unwrap()));
        let signed_payload = DescriptorSignaturePayload {
            format_version: 1,
            permanent_map_id: "permanent-map",
            access_id: "world-one",
            release_version: "v1",
            required: &required,
            optional: &[],
            manifest_digest: &manifest_digest,
        };
        let signature = key
            .sign(&rng, &serde_json::to_vec(&signed_payload).unwrap())
            .unwrap();
        let descriptor = json!({
            "formatVersion": 1,
            "permanentMapId": "permanent-map",
            "accessId": "world-one",
            "releaseVersion": "v1",
            "required": required,
            "optional": [],
            "manifestDigest": manifest_digest,
            "signature": {
                "algorithm": "ES256",
                "keyId": "test-key-id",
                "publicKey": public_jwk,
                "value": URL_SAFE_NO_PAD.encode(signature.as_ref()),
            },
        });
        let trust = json!({ "keyId": "test-key-id", "publicKey": public_jwk });
        let descriptor_json = serde_json::to_string(&descriptor).unwrap();
        let trust_json = serde_json::to_string(&trust).unwrap();
        assert!(validate_descriptor(&descriptor_json, &trust_json).is_ok());

        let mut tampered = descriptor;
        tampered["releaseVersion"] = json!("v2");
        assert!(validate_descriptor(&tampered.to_string(), &trust_json).is_err());
        let wrong_trust = json!({ "keyId": "other-key-id", "publicKey": public_jwk });
        assert!(validate_descriptor(&descriptor_json, &wrong_trust.to_string()).is_err());
    }

    #[test]
    fn accepts_es256_descriptor_signed_by_the_node_play_server() {
        let trust = json!({
            "keyId": "8g5sfhLM-SWGqaf0xXA9Io9n2VxxVCe6gyGDf8VpHJg",
            "publicKey": {
                "kty": "EC",
                "x": "iQt7wpGM98h5Seed7hTlTQ5KZI9W0u5w80y-QuMFBBE",
                "y": "vhLFGPZhH2SRc2Nghx_b02HXeZO7DD9UQPvK4osH1sg",
                "crv": "P-256"
            }
        });
        let descriptor = json!({
            "formatVersion": 1,
            "permanentMapId": "fixture-map",
            "accessId": "fixture-world",
            "releaseVersion": "v1",
            "required": [{
                "hash": "hAiIBeFFtVXzScFkp8_c8TmB4K_8ukOTqqeK5A8yD04",
                "size": 7,
                "kind": "static",
                "contentType": "application/octet-stream"
            }],
            "optional": [],
            "manifestDigest": "rMNzpK27TB1ugQWhgibmI8pR3FPGV4QjYorzO2SH1-Q",
            "signature": {
                "algorithm": "ES256",
                "keyId": "8g5sfhLM-SWGqaf0xXA9Io9n2VxxVCe6gyGDf8VpHJg",
                "publicKey": trust["publicKey"].clone(),
                "value": "BmJph3giXPYU1VMmKVZEgkJLd37vAMU3oyrKDUM1R5n3qMInWzt5nZGaHlomAT2bvMhjHEwDtq1LnE9XEX61lQ"
            }
        });
        assert!(validate_descriptor(&descriptor.to_string(), &trust.to_string()).is_ok());
    }
}
