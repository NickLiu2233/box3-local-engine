use crate::{
    map_packages::{package_blob_root, store_root},
    package_descriptor::{validate_descriptor, verify_hash_file, PackageDescriptor},
};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::AppHandle;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct VerifiedPackage {
    format_version: u32,
    permanent_map_id: String,
    release_version: String,
    manifest_digest: String,
    required: Vec<String>,
    verified_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstalledPackage {
    pub(crate) permanent_map_id: String,
    pub(crate) release_version: String,
    pub(crate) manifest_digest: String,
    pub(crate) required_count: usize,
}

fn package_path(root: &Path, descriptor: &PackageDescriptor) -> PathBuf {
    root.join("packages")
        .join(&descriptor.permanent_map_id)
        .join(&descriptor.manifest_digest)
}

fn installed_package(descriptor: &PackageDescriptor) -> InstalledPackage {
    InstalledPackage {
        permanent_map_id: descriptor.permanent_map_id.clone(),
        release_version: descriptor.release_version.clone(),
        manifest_digest: descriptor.manifest_digest.clone(),
        required_count: descriptor.required.len(),
    }
}

fn verify_package_record(
    package_path: &Path,
    descriptor: &PackageDescriptor,
    trusted_signing_key: &str,
) -> bool {
    let Ok(stored_descriptor_json) = fs::read_to_string(package_path.join("descriptor.json"))
    else {
        return false;
    };
    let Ok(stored_descriptor) = validate_descriptor(&stored_descriptor_json, trusted_signing_key)
    else {
        return false;
    };
    if stored_descriptor.manifest_digest != descriptor.manifest_digest {
        return false;
    }
    let Ok(verified_bytes) = fs::read(package_path.join("verified.json")) else {
        return false;
    };
    let Ok(verified) = serde_json::from_slice::<VerifiedPackage>(&verified_bytes) else {
        return false;
    };
    verified.format_version == 1
        && verified.permanent_map_id == descriptor.permanent_map_id
        && verified.release_version == descriptor.release_version
        && verified.manifest_digest == descriptor.manifest_digest
        && verified.required
            == descriptor
                .required
                .iter()
                .map(|asset| asset.hash.clone())
                .collect::<Vec<_>>()
}

pub(crate) fn verify_installed_map_package(
    app: &AppHandle,
    descriptor_json: &str,
    trusted_signing_key: &str,
) -> Result<InstalledPackage, String> {
    let descriptor = validate_descriptor(descriptor_json, trusted_signing_key)?;
    let root = store_root(app)?;
    let installed_path = package_path(&root, &descriptor);
    let metadata = fs::symlink_metadata(&installed_path)
        .map_err(|_| "本地地图资源包尚未准备完成".to_string())?;
    if !metadata.file_type().is_dir()
        || !verify_package_record(&installed_path, &descriptor, trusted_signing_key)
    {
        return Err("本地地图包状态损坏，请重新准备地图".into());
    }
    let blobs = package_blob_root(&root);
    for asset in &descriptor.required {
        if !verify_hash_file(&asset.hash, &blobs.join(&asset.hash), asset.size)? {
            return Err("本地地图资源缺失或损坏，请重新准备地图".into());
        }
    }
    Ok(installed_package(&descriptor))
}

#[tauri::command]
pub(crate) fn commit_map_package(
    app: AppHandle,
    descriptor: String,
    trusted_signing_key: String,
) -> Result<InstalledPackage, String> {
    let descriptor = validate_descriptor(&descriptor, &trusted_signing_key)?;
    let root = store_root(&app)?;
    let blobs = package_blob_root(&root);
    for asset in &descriptor.required {
        if !verify_hash_file(&asset.hash, &blobs.join(&asset.hash), asset.size)? {
            return Err("地图资源尚未完整校验，暂不能标记为已准备".into());
        }
    }
    let final_path = package_path(&root, &descriptor);
    if fs::symlink_metadata(&final_path).is_ok() {
        if verify_package_record(&final_path, &descriptor, &trusted_signing_key) {
            return Ok(installed_package(&descriptor));
        }
        let metadata =
            fs::symlink_metadata(&final_path).map_err(|_| "无法检查本地地图包记录".to_string())?;
        if metadata.file_type().is_symlink() || !metadata.file_type().is_dir() {
            fs::remove_file(&final_path).map_err(|_| "无法替换损坏的地图包记录".to_string())?;
        } else {
            fs::remove_dir_all(&final_path).map_err(|_| "无法修复损坏的地图包记录".to_string())?;
        }
    }
    let parent = final_path
        .parent()
        .ok_or_else(|| "本地地图包路径无效".to_string())?;
    fs::create_dir_all(parent).map_err(|_| "无法创建本地地图包目录".to_string())?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let temporary = parent.join(format!(
        ".{}.{}.{}.tmp",
        descriptor.manifest_digest,
        std::process::id(),
        nonce
    ));
    fs::create_dir(&temporary).map_err(|_| "无法创建地图包临时目录".to_string())?;
    let result = write_package_metadata(&temporary, &descriptor).and_then(|()| {
        fs::rename(&temporary, &final_path).map_err(|_| "无法原子提交地图包".to_string())
    });
    if result.is_err() {
        let _ = fs::remove_dir_all(&temporary);
    }
    result?;
    Ok(installed_package(&descriptor))
}

fn write_package_metadata(path: &Path, descriptor: &PackageDescriptor) -> Result<(), String> {
    let descriptor_path = path.join("descriptor.json");
    let descriptor_bytes =
        serde_json::to_vec_pretty(descriptor).map_err(|_| "无法序列化地图包描述符".to_string())?;
    fs::write(&descriptor_path, descriptor_bytes)
        .map_err(|_| "无法保存地图包描述符".to_string())?;
    File::open(&descriptor_path)
        .and_then(|file| file.sync_all())
        .map_err(|_| "无法提交地图包描述符".to_string())?;
    let verified = VerifiedPackage {
        format_version: 1,
        permanent_map_id: descriptor.permanent_map_id.clone(),
        release_version: descriptor.release_version.clone(),
        manifest_digest: descriptor.manifest_digest.clone(),
        required: descriptor
            .required
            .iter()
            .map(|asset| asset.hash.clone())
            .collect(),
        verified_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
    };
    let verified_bytes =
        serde_json::to_vec_pretty(&verified).map_err(|_| "无法序列化地图包校验记录".to_string())?;
    let verified_path = path.join("verified.json");
    fs::write(&verified_path, verified_bytes).map_err(|_| "无法保存地图包校验记录".to_string())?;
    File::open(&verified_path)
        .and_then(|file| file.sync_all())
        .map_err(|_| "无法提交地图包校验记录".to_string())
}
