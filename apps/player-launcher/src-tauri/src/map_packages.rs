use crate::{
    api_download::{stream_api_to_file, stream_api_to_file_inner},
    api_transport::ApiRequest,
    package_descriptor::{validate_descriptor, verify_hash_file, PackageAsset, PackageDescriptor},
    package_ownership::server_storage_key,
};
use fs2::FileExt;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    fs::{self, OpenOptions},
    path::{Path, PathBuf},
};
use tauri::{AppHandle, Manager};
use url::Url;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallPlan {
    permanent_map_id: String,
    manifest_digest: String,
    required_count: usize,
    missing_hashes: Vec<String>,
    missing_bytes: u64,
    available_bytes: u64,
    insufficient_storage: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstalledAsset {
    hash: String,
    already_present: bool,
    bytes_written: u64,
}

pub(crate) fn store_root(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位启动器数据目录：{error}"))?
        .join("map-packages");
    fs::create_dir_all(&root).map_err(|_| "无法创建本地地图资源库".to_string())?;
    Ok(root)
}

pub(crate) fn package_blob_root(root: &Path) -> PathBuf {
    root.join("blobs")
}

fn partial_blob_path(
    root: &Path,
    server_key: &str,
    descriptor: &PackageDescriptor,
    hash: &str,
) -> PathBuf {
    root.join("downloads")
        .join(server_key)
        .join(&descriptor.manifest_digest)
        .join(format!("{hash}.partial"))
}

fn partial_blob_size(path: &Path, expected_size: u64) -> Result<u64, String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_file() && metadata.len() <= expected_size => {
            Ok(metadata.len())
        }
        Ok(_) => {
            fs::remove_file(path).map_err(|_| "无法清理无效的地图下载临时文件".to_string())?;
            Ok(0)
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(0),
        Err(_) => Err("无法检查地图下载临时文件".into()),
    }
}

fn adopt_complete_partial(
    root: &Path,
    server_key: &str,
    descriptor: &PackageDescriptor,
    asset: &crate::package_descriptor::PackageAsset,
) -> Result<bool, String> {
    let partial = partial_blob_path(root, server_key, descriptor, &asset.hash);
    let target = package_blob_root(root).join(&asset.hash);
    let partial_size = partial_blob_size(&partial, asset.size)?;
    if partial_size != asset.size || !verify_hash_file(&asset.hash, &partial, asset.size)? {
        if partial_size == asset.size {
            let _ = fs::remove_file(partial);
        }
        return Ok(false);
    }
    if fs::symlink_metadata(&target).is_ok() {
        fs::remove_file(&target).map_err(|_| "无法替换损坏的本地地图资源".to_string())?;
    }
    fs::rename(&partial, &target).map_err(|_| "无法提交已完成的地图资源".to_string())?;
    Ok(true)
}

fn plan_map_package_install(
    root: &Path,
    server_key: &str,
    descriptor: &PackageDescriptor,
) -> Result<InstallPlan, String> {
    let blob_root = package_blob_root(root);
    fs::create_dir_all(&blob_root).map_err(|_| "无法创建地图资源内容库".to_string())?;
    let mut missing_hashes = Vec::new();
    let mut missing_bytes = 0u64;
    for asset in &descriptor.required {
        if verify_hash_file(&asset.hash, &blob_root.join(&asset.hash), asset.size)?
            || adopt_complete_partial(root, server_key, descriptor, asset)?
        {
            continue;
        }
        missing_hashes.push(asset.hash.clone());
        let partial_size = partial_blob_size(
            &partial_blob_path(root, server_key, descriptor, &asset.hash),
            asset.size,
        )?;
        missing_bytes = missing_bytes.saturating_add(asset.size.saturating_sub(partial_size));
    }
    let available_bytes =
        fs2::available_space(root).map_err(|_| "无法检查设备可用磁盘空间".to_string())?;
    Ok(InstallPlan {
        permanent_map_id: descriptor.permanent_map_id.clone(),
        manifest_digest: descriptor.manifest_digest.clone(),
        required_count: descriptor.required.len(),
        missing_hashes,
        missing_bytes,
        available_bytes,
        insufficient_storage: missing_bytes > available_bytes,
    })
}

#[tauri::command]
pub(crate) fn prepare_map_package(
    app: AppHandle,
    server_id: String,
    descriptor: String,
    trusted_signing_key: String,
) -> Result<InstallPlan, String> {
    crate::server_endpoint_for_id(&app, &server_id)?;
    let descriptor = validate_descriptor(&descriptor, &trusted_signing_key)?;
    let server_key = server_storage_key(&server_id);
    let root = store_root(&app)?;
    plan_map_package_install(&root, &server_key, &descriptor)
}

#[tauri::command]
pub(crate) fn get_map_asset_resume_offset(
    app: AppHandle,
    server_id: String,
    descriptor: String,
    trusted_signing_key: String,
    hash: String,
) -> Result<u64, String> {
    crate::server_endpoint_for_id(&app, &server_id)?;
    let descriptor = validate_descriptor(&descriptor, &trusted_signing_key)?;
    let server_key = server_storage_key(&server_id);
    let asset = descriptor
        .required
        .iter()
        .find(|asset| asset.hash == hash)
        .ok_or_else(|| "资源不在签名描述符的必需资源清单中".to_string())?;
    let root = store_root(&app)?;
    if adopt_complete_partial(&root, &server_key, &descriptor, asset)? {
        return Ok(0);
    }
    partial_blob_size(
        &partial_blob_path(&root, &server_key, &descriptor, &asset.hash),
        asset.size,
    )
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallAssetRequest {
    request: ApiRequest,
    server_id: String,
    descriptor: String,
    trusted_signing_key: String,
    hash: String,
}

fn validate_blob_request(
    request: &ApiRequest,
    descriptor: &PackageDescriptor,
    hash: &str,
) -> Result<(), String> {
    if request.method != "GET" || request.body.is_some() {
        return Err("地图资源下载必须使用无请求体的 GET 请求".into());
    }
    let url = Url::parse(&request.url).map_err(|_| "地图资源下载地址无效".to_string())?;
    let suffix = format!(
        "/api/player-launcher/maps/{}/blobs/{}",
        descriptor.access_id, hash
    );
    if !url.path().ends_with(&suffix) {
        return Err("地图资源下载地址与签名描述符不匹配".into());
    }
    let query = url
        .query_pairs()
        .collect::<std::collections::HashMap<_, _>>();
    if query.get("digest").map(|value| value.as_ref()) != Some(descriptor.manifest_digest.as_str())
        || query
            .get("ticket")
            .is_none_or(|ticket| ticket.is_empty() || ticket.len() > 2_048)
    {
        return Err("地图下载授权缺失或与当前版本不匹配".into());
    }
    Ok(())
}

fn api_error_message(body: &str, status: u16) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("message")
                .and_then(Value::as_str)
                .map(str::to_owned)
        })
        .unwrap_or_else(|| format!("地图资源下载失败（HTTP {status}）"))
}

async fn install_blob_from_api(
    app: Option<&AppHandle>,
    root: &Path,
    server_key: &str,
    descriptor: &PackageDescriptor,
    asset: &PackageAsset,
    request: ApiRequest,
) -> Result<InstalledAsset, String> {
    let blob_root = package_blob_root(root);
    let lock_root = root.join("locks");
    let download_root = root
        .join("downloads")
        .join(server_key)
        .join(&descriptor.manifest_digest);
    fs::create_dir_all(&blob_root).map_err(|_| "无法创建地图资源内容库".to_string())?;
    fs::create_dir_all(&lock_root).map_err(|_| "无法创建地图资源锁目录".to_string())?;
    fs::create_dir_all(&download_root).map_err(|_| "无法创建地图下载临时目录".to_string())?;

    let target = blob_root.join(&asset.hash);
    let lock = OpenOptions::new()
        .create(true)
        .truncate(false)
        .read(true)
        .write(true)
        .open(lock_root.join(format!("{}.lock", asset.hash)))
        .map_err(|_| "无法锁定地图资源".to_string())?;
    lock.lock_exclusive()
        .map_err(|_| "地图资源正在由另一个任务安装".to_string())?;
    if verify_hash_file(&asset.hash, &target, asset.size)? {
        return Ok(InstalledAsset {
            hash: asset.hash.clone(),
            already_present: true,
            bytes_written: 0,
        });
    }
    if adopt_complete_partial(root, server_key, descriptor, asset)? {
        return Ok(InstalledAsset {
            hash: asset.hash.clone(),
            already_present: true,
            bytes_written: 0,
        });
    }
    let temporary = partial_blob_path(root, server_key, descriptor, &asset.hash);
    let partial_size = partial_blob_size(&temporary, asset.size)?;
    let available_bytes =
        fs2::available_space(root).map_err(|_| "无法检查设备可用磁盘空间".to_string())?;
    if available_bytes < asset.size.saturating_sub(partial_size) {
        return Err("设备可用空间不足，无法安全准备该地图".into());
    }

    let range = request
        .headers
        .iter()
        .find(|(name, _)| name.eq_ignore_ascii_case("range"))
        .map(|(_, value)| value.as_str());
    if partial_size == 0 && range.is_some() {
        return Err("地图资源续传位置与本地临时文件不一致".into());
    }
    if partial_size > 0 {
        let expected_range = format!("bytes={partial_size}-");
        if range != Some(expected_range.as_str()) {
            return Err("地图资源续传位置与本地临时文件不一致".into());
        }
    }
    let response = match app {
        Some(app) => {
            stream_api_to_file(
                app,
                request,
                &temporary,
                asset.size,
                partial_size,
                &asset.hash,
                &asset.content_type,
            )
            .await?
        }
        None => {
            stream_api_to_file_inner(
                None,
                request,
                &temporary,
                asset.size,
                partial_size,
                &asset.hash,
                &asset.content_type,
            )
            .await?
        }
    };
    if !matches!(response.status, 200 | 206) {
        return Err(api_error_message(&response.body, response.status));
    }
    let bytes_written = response.downloaded_bytes.unwrap_or(0);
    if !verify_hash_file(&asset.hash, &temporary, asset.size)? {
        let _ = fs::remove_file(&temporary);
        return Err("下载的地图资源完整性校验失败".into());
    }
    if fs::symlink_metadata(&target).is_ok() {
        fs::remove_file(&target).map_err(|_| "无法替换损坏的本地地图资源".to_string())?;
    }
    fs::rename(&temporary, &target).map_err(|_| "无法原子提交地图资源".to_string())?;
    Ok(InstalledAsset {
        hash: asset.hash.clone(),
        already_present: false,
        bytes_written,
    })
}

#[tauri::command]
pub(crate) async fn install_map_asset(
    app: AppHandle,
    payload: InstallAssetRequest,
) -> Result<InstalledAsset, String> {
    let server_endpoint = crate::server_endpoint_for_id(&app, &payload.server_id)?;
    if crate::normalize_endpoint(&payload.request.endpoint)? != server_endpoint {
        return Err("地图资源下载服务器与已选择的服务器不匹配".into());
    }
    let descriptor = validate_descriptor(&payload.descriptor, &payload.trusted_signing_key)?;
    let server_key = server_storage_key(&payload.server_id);
    validate_blob_request(&payload.request, &descriptor, &payload.hash)?;
    let asset = descriptor
        .required
        .iter()
        .find(|asset| asset.hash == payload.hash)
        .ok_or_else(|| "资源不在签名描述符的必需资源清单中".to_string())?;
    let root = store_root(&app)?;
    install_blob_from_api(
        Some(&app),
        &root,
        &server_key,
        &descriptor,
        asset,
        payload.request,
    )
    .await
}

#[cfg(test)]
#[path = "map_packages_tests.rs"]
mod tests;
