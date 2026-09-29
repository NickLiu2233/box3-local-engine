use crate::{
    map_packages::{package_blob_root, store_root},
    package_descriptor::{valid_content_hash, validate_descriptor},
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use fs2::FileExt;
use ring::digest::{digest, SHA256};
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File, OpenOptions},
    path::{Path, PathBuf},
};
use tauri::AppHandle;

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct VerifiedPackage {
    pub(crate) format_version: u32,
    pub(crate) permanent_map_id: String,
    pub(crate) release_version: String,
    pub(crate) manifest_digest: String,
    pub(crate) required: Vec<String>,
    #[serde(default)]
    pub(crate) servers: Vec<String>,
    pub(crate) verified_at: u64,
}

pub(crate) fn server_storage_key(server_id: &str) -> String {
    URL_SAFE_NO_PAD.encode(digest(&SHA256, server_id.as_bytes()).as_ref())
}

pub(crate) fn add_package_server(package_path: &Path, server_key: &str) -> Result<(), String> {
    let verified_path = package_path.join("verified.json");
    let contents =
        fs::read(&verified_path).map_err(|_| "无法读取地图包服务器关联信息".to_string())?;
    let mut verified: VerifiedPackage =
        serde_json::from_slice(&contents).map_err(|_| "地图包服务器关联信息损坏".to_string())?;
    if verified
        .servers
        .iter()
        .any(|existing| existing == server_key)
    {
        return Ok(());
    }
    verified.servers.push(server_key.to_owned());
    let contents = serde_json::to_vec_pretty(&verified)
        .map_err(|_| "无法序列化地图包服务器关联信息".to_string())?;
    fs::write(&verified_path, contents).map_err(|_| "无法保存地图包服务器关联信息".to_string())?;
    File::open(&verified_path)
        .and_then(|file| file.sync_all())
        .map_err(|_| "无法提交地图包服务器关联信息".to_string())
}

#[tauri::command]
pub(crate) fn associate_map_packages_with_server(
    app: AppHandle,
    server_id: String,
    access_ids: Vec<String>,
    trusted_signing_key: String,
) -> Result<usize, String> {
    crate::server_endpoint_for_id(&app, &server_id)?;
    if access_ids.len() > 20_000 {
        return Err("服务器地图目录超出本地登记上限".into());
    }
    let server_key = server_storage_key(&server_id);
    let root = store_root(&app)?;
    let packages = package_directories(&root.join("packages"))?;
    let allowed_access_ids = access_ids
        .into_iter()
        .collect::<std::collections::HashSet<_>>();
    let blobs = package_blob_root(&root);
    let mut associated = 0;
    for package_path in packages {
        let descriptor_path = package_path.join("descriptor.json");
        let Ok(descriptor_json) = fs::read_to_string(&descriptor_path) else {
            continue;
        };
        let Ok(descriptor) = validate_descriptor(&descriptor_json, &trusted_signing_key) else {
            continue;
        };
        if !allowed_access_ids.contains(&descriptor.access_id) {
            continue;
        }
        let verified_path = package_path.join("verified.json");
        let Ok(contents) = fs::read(&verified_path) else {
            continue;
        };
        let Ok(verified) = serde_json::from_slice::<VerifiedPackage>(&contents) else {
            continue;
        };
        if verified.format_version != 1
            || verified.permanent_map_id != descriptor.permanent_map_id
            || verified.release_version != descriptor.release_version
            || verified.manifest_digest != descriptor.manifest_digest
            || verified.required
                != descriptor
                    .required
                    .iter()
                    .map(|asset| asset.hash.clone())
                    .collect::<Vec<_>>()
        {
            continue;
        }
        let required_files_exist = descriptor.required.iter().all(|asset| {
            fs::symlink_metadata(blobs.join(&asset.hash))
                .map(|metadata| metadata.file_type().is_file() && metadata.len() == asset.size)
                .unwrap_or(false)
        });
        if !required_files_exist || verified.servers.contains(&server_key) {
            continue;
        }
        add_package_server(&package_path, &server_key)?;
        associated += 1;
    }
    Ok(associated)
}

fn package_directories(root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut packages = Vec::new();
    match fs::symlink_metadata(root) {
        Ok(metadata) if metadata.file_type().is_dir() => {}
        Ok(_) => return Err("本地地图包索引目录无效".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(packages),
        Err(_) => return Err("无法检查本地地图包索引".into()),
    }
    for map_entry in fs::read_dir(root).map_err(|_| "无法读取本地地图包索引".to_string())?
    {
        let map_path = map_entry
            .map_err(|_| "无法读取本地地图包索引".to_string())?
            .path();
        if !fs::symlink_metadata(&map_path)
            .map(|metadata| metadata.file_type().is_dir())
            .unwrap_or(false)
        {
            continue;
        }
        for package_entry in
            fs::read_dir(&map_path).map_err(|_| "无法读取本地地图包索引".to_string())?
        {
            let package_path = package_entry
                .map_err(|_| "无法读取本地地图包索引".to_string())?
                .path();
            if !fs::symlink_metadata(&package_path)
                .map(|metadata| metadata.file_type().is_dir())
                .unwrap_or(false)
            {
                continue;
            }
            match fs::symlink_metadata(package_path.join("verified.json")) {
                Ok(metadata) if metadata.file_type().is_file() => packages.push(package_path),
                Ok(_) => return Err("地图包校验记录不是普通文件，已停止清理".into()),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                    // Incomplete commit directories aren't installed packages.
                }
                Err(_) => return Err("无法检查地图包校验记录，已停止清理".into()),
            }
        }
    }
    Ok(packages)
}

fn referenced_hashes(packages: &[PathBuf]) -> Result<std::collections::HashSet<String>, String> {
    let mut referenced = std::collections::HashSet::new();
    for path in packages {
        let contents = fs::read(path.join("verified.json"))
            .map_err(|_| "无法读取地图包引用索引，已停止清理".to_string())?;
        let verified: VerifiedPackage = serde_json::from_slice(&contents)
            .map_err(|_| "地图包引用索引损坏，已停止清理".to_string())?;
        if verified
            .required
            .iter()
            .any(|hash| !valid_content_hash(hash))
        {
            return Err("地图包资源引用无效，已停止清理".into());
        }
        referenced.extend(verified.required);
    }
    Ok(referenced)
}

fn remove_server_packages_from_root(root: &Path, server_key: &str) -> Result<usize, String> {
    let packages_root = root.join("packages");
    let packages = package_directories(&packages_root)?;
    let mut removed_packages = 0;
    for package_path in packages {
        let verified_path = package_path.join("verified.json");
        let Ok(contents) = fs::read(&verified_path) else {
            continue;
        };
        let Ok(mut verified) = serde_json::from_slice::<VerifiedPackage>(&contents) else {
            continue;
        };
        if !verified.servers.iter().any(|owner| owner == server_key) {
            continue;
        }
        verified.servers.retain(|owner| owner != server_key);
        if verified.servers.is_empty() {
            let metadata = fs::symlink_metadata(&package_path)
                .map_err(|_| "无法检查待删除的本地地图包".to_string())?;
            if metadata.file_type().is_symlink() || !metadata.file_type().is_dir() {
                return Err("本地地图包目录状态异常，已停止删除以保护数据".into());
            }
            fs::remove_dir_all(&package_path).map_err(|_| "无法删除本地地图包记录".to_string())?;
            removed_packages += 1;
        } else {
            let contents = serde_json::to_vec_pretty(&verified)
                .map_err(|_| "无法序列化地图包服务器关联信息".to_string())?;
            fs::write(&verified_path, contents)
                .map_err(|_| "无法更新地图包服务器关联信息".to_string())?;
            File::open(&verified_path)
                .and_then(|file| file.sync_all())
                .map_err(|_| "无法提交地图包服务器关联信息".to_string())?;
        }
    }

    let remaining_packages = package_directories(&packages_root)?;
    let referenced = referenced_hashes(&remaining_packages)?;
    let blobs_root = root.join("blobs");
    match fs::symlink_metadata(&blobs_root) {
        Ok(metadata) if metadata.file_type().is_dir() => {
            for entry in
                fs::read_dir(&blobs_root).map_err(|_| "无法读取本地地图资源".to_string())?
            {
                let path = entry
                    .map_err(|_| "无法读取本地地图资源".to_string())?
                    .path();
                let Some(hash) = path.file_name().and_then(|name| name.to_str()) else {
                    continue;
                };
                if !valid_content_hash(hash) || referenced.contains(hash) {
                    continue;
                }
                if !fs::symlink_metadata(&path)
                    .map(|metadata| metadata.file_type().is_file())
                    .unwrap_or(false)
                {
                    continue;
                }
                let locks_root = root.join("locks");
                if let Ok(metadata) = fs::symlink_metadata(&locks_root) {
                    if metadata.file_type().is_symlink() || !metadata.file_type().is_dir() {
                        return Err("本地地图资源锁目录状态异常，已停止清理".into());
                    }
                } else {
                    fs::create_dir_all(&locks_root)
                        .map_err(|_| "无法创建本地地图资源锁目录".to_string())?;
                }
                let lock_path = locks_root.join(format!("{hash}.lock"));
                if fs::symlink_metadata(&lock_path)
                    .map(|metadata| metadata.file_type().is_symlink())
                    .unwrap_or(false)
                {
                    return Err("本地地图资源锁文件状态异常，已停止清理".into());
                }
                let lock = OpenOptions::new()
                    .create(true)
                    .truncate(false)
                    .read(true)
                    .write(true)
                    .open(lock_path)
                    .map_err(|_| "无法锁定待清理的地图资源".to_string())?;
                if lock.try_lock_exclusive().is_err() {
                    continue;
                }
                fs::remove_file(&path).map_err(|_| "无法清理未引用的本地地图资源".to_string())?;
                let _ = lock.unlock();
            }
        }
        Ok(_) => return Err("本地地图资源目录状态异常，已停止清理".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return Err("无法检查本地地图资源目录".into()),
    }

    let downloads_root = root.join("downloads");
    let server_downloads = downloads_root.join(server_key);
    match fs::symlink_metadata(&downloads_root) {
        Ok(metadata) if metadata.file_type().is_dir() => {
            match fs::symlink_metadata(&server_downloads) {
                Ok(metadata) if metadata.file_type().is_dir() => {
                    fs::remove_dir_all(server_downloads)
                        .map_err(|_| "无法删除该服务器未完成的地图下载".to_string())?
                }
                Ok(_) => return Err("该服务器的地图下载目录状态异常，已停止删除".into()),
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
                Err(_) => return Err("无法检查该服务器未完成的地图下载".into()),
            }
        }
        Ok(_) => return Err("本地地图下载目录状态异常，已停止删除".into()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(_) => return Err("无法检查本地地图下载目录".into()),
    }
    Ok(removed_packages)
}

pub(crate) fn remove_server_map_data(app: &AppHandle, server_id: &str) -> Result<usize, String> {
    let root = store_root(app)?;
    remove_server_packages_from_root(&root, &server_storage_key(server_id))
}

#[cfg(test)]
mod tests {
    use super::{add_package_server, remove_server_packages_from_root, server_storage_key};
    use serde_json::json;
    use std::{
        fs,
        path::PathBuf,
        sync::atomic::{AtomicU64, Ordering},
        time::SystemTime,
    };

    static NEXT_TEMP_ROOT_ID: AtomicU64 = AtomicU64::new(0);

    fn test_root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "box-player-package-cleanup-{}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_nanos(),
            NEXT_TEMP_ROOT_ID.fetch_add(1, Ordering::Relaxed),
        ))
    }

    fn write_package(
        root: &PathBuf,
        map: &str,
        digest: &str,
        servers: &[String],
        hashes: &[String],
    ) {
        let package = root.join("packages").join(map).join(digest);
        fs::create_dir_all(&package).unwrap();
        fs::write(
            package.join("verified.json"),
            serde_json::to_vec(&json!({
                "formatVersion": 1,
                "permanentMapId": map,
                "releaseVersion": "v1",
                "manifestDigest": digest,
                "required": hashes,
                "servers": servers,
                "verifiedAt": 1
            }))
            .unwrap(),
        )
        .unwrap();
    }

    #[test]
    fn commits_legacy_packages_to_the_current_server_without_replacing_shared_owners() {
        let root = test_root();
        let package = root.join("packages/map/digest");
        fs::create_dir_all(&package).unwrap();
        fs::write(
            package.join("verified.json"),
            serde_json::to_vec(&json!({
                "formatVersion": 1,
                "permanentMapId": "map",
                "releaseVersion": "v1",
                "manifestDigest": "digest",
                "required": [],
                "verifiedAt": 1
            }))
            .unwrap(),
        )
        .unwrap();
        let server_a = server_storage_key("http://one.example");
        let server_b = server_storage_key("http://two.example");

        add_package_server(&package, &server_a).unwrap();
        add_package_server(&package, &server_a).unwrap();
        add_package_server(&package, &server_b).unwrap();

        let record: serde_json::Value =
            serde_json::from_slice(&fs::read(package.join("verified.json")).unwrap()).unwrap();
        assert_eq!(record["servers"], json!([server_a, server_b]));
        fs::remove_dir_all(root).unwrap();
    }

    #[test]
    fn removing_server_drops_only_its_packages_and_unreferenced_blobs() {
        let root = test_root();
        let owner_a = server_storage_key("http://one.example");
        let owner_b = server_storage_key("http://two.example");
        let unique_hash = "A".repeat(43);
        let shared_hash = "B".repeat(43);
        let legacy_hash = "C".repeat(43);
        let orphan_hash = "D".repeat(43);

        write_package(
            &root,
            "map-one",
            "digest-one",
            std::slice::from_ref(&owner_a),
            std::slice::from_ref(&unique_hash),
        );
        write_package(
            &root,
            "map-shared",
            "digest-shared",
            &[owner_a.clone(), owner_b.clone()],
            std::slice::from_ref(&shared_hash),
        );
        write_package(
            &root,
            "map-legacy",
            "digest-legacy",
            &[],
            std::slice::from_ref(&legacy_hash),
        );
        let blobs = root.join("blobs");
        fs::create_dir_all(&blobs).unwrap();
        for hash in [&unique_hash, &shared_hash, &legacy_hash, &orphan_hash] {
            fs::write(blobs.join(hash), b"test").unwrap();
        }
        let old_partial = root.join("downloads").join(&owner_a).join("digest");
        let other_partial = root.join("downloads").join(&owner_b).join("digest");
        fs::create_dir_all(&old_partial).unwrap();
        fs::create_dir_all(&other_partial).unwrap();
        fs::write(old_partial.join("unfinished.partial"), b"partial").unwrap();
        fs::write(other_partial.join("unfinished.partial"), b"partial").unwrap();

        assert_eq!(
            remove_server_packages_from_root(&root, &owner_a).unwrap(),
            1
        );
        assert!(!root.join("packages/map-one/digest-one").exists());
        assert!(root.join("packages/map-shared/digest-shared").exists());
        assert!(root.join("packages/map-legacy/digest-legacy").exists());
        assert!(!blobs.join(&unique_hash).exists());
        assert!(blobs.join(&shared_hash).exists());
        assert!(blobs.join(&legacy_hash).exists());
        assert!(!blobs.join(&orphan_hash).exists());
        assert!(!root.join("downloads").join(owner_a).exists());
        assert!(root.join("downloads").join(owner_b).exists());
        fs::remove_dir_all(root).unwrap();
    }
}
