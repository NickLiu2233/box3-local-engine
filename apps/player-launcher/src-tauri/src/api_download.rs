use crate::api_transport::{
    read_api_text, response_headers, send_api_request, update_player_cookies, ApiRequest,
    ApiResponse,
};
use std::{
    fs::File,
    io::Write,
    path::Path,
    time::{Duration, Instant},
};
use tauri::{AppHandle, Emitter};

pub(crate) async fn stream_api_to_file(
    app: &AppHandle,
    request: ApiRequest,
    temporary_path: &Path,
    expected_size: u64,
    existing_bytes: u64,
    hash: &str,
) -> Result<ApiResponse, String> {
    stream_api_to_file_inner(
        Some(app),
        request,
        temporary_path,
        expected_size,
        existing_bytes,
        hash,
    )
    .await
}

pub(crate) async fn stream_api_to_file_inner(
    app: Option<&AppHandle>,
    request: ApiRequest,
    temporary_path: &Path,
    expected_size: u64,
    existing_bytes: u64,
    hash: &str,
) -> Result<ApiResponse, String> {
    let (endpoint, current_cookies, _, mut response) =
        send_api_request(request, Duration::from_secs(900)).await?;
    let status = response.status().as_u16();
    let headers = response.headers().clone();
    update_player_cookies(&endpoint, &current_cookies, &headers)?;
    if !response.status().is_success() {
        let body = read_api_text(response).await?;
        return Ok(ApiResponse {
            status,
            headers: response_headers(&headers),
            body,
            downloaded_bytes: None,
        });
    }
    let content_type = headers
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|value| value.to_str().ok())
        .unwrap_or("");
    if !content_type.starts_with("application/octet-stream") {
        return Err("服务器返回的地图资源类型无效".into());
    }
    let append = if status == 206 {
        if existing_bytes == 0 {
            return Err("服务器返回了未请求的部分资源".into());
        }
        let content_range = headers
            .get(reqwest::header::CONTENT_RANGE)
            .and_then(|value| value.to_str().ok())
            .ok_or_else(|| "服务器返回的续传范围无效".to_string())?;
        let expected_prefix = format!("bytes {existing_bytes}-");
        let expected_suffix = format!("/{}", expected_size);
        let end = content_range
            .strip_prefix(&expected_prefix)
            .and_then(|range| range.split_once('/'))
            .and_then(|(end, _)| end.parse::<u64>().ok());
        if !content_range.ends_with(&expected_suffix)
            || end != Some(expected_size.saturating_sub(1))
        {
            return Err("服务器返回的续传范围与本地临时文件不匹配".into());
        }
        true
    } else if status == 200 {
        false
    } else {
        return Err(format!("地图资源下载失败（HTTP {status}）"));
    };

    let mut options = File::options();
    options.create(true).write(true);
    if append {
        options.append(true);
        let current_size = std::fs::metadata(temporary_path)
            .map_err(|_| "续传临时文件已丢失".to_string())?
            .len();
        if current_size != existing_bytes {
            return Err("本地续传文件大小在下载期间发生变化".into());
        }
    } else {
        options.truncate(true);
    }
    let mut file = options
        .open(temporary_path)
        .map_err(|_| "无法创建地图资源临时文件".to_string())?;
    let mut total_bytes = if append { existing_bytes } else { 0 };
    let mut downloaded_bytes = 0u64;
    let mut last_progress_event = Instant::now();
    loop {
        let chunk = response
            .chunk()
            .await
            .map_err(|_| "下载地图资源时连接中断".to_string())?;
        let Some(chunk) = chunk else { break };
        downloaded_bytes = downloaded_bytes.saturating_add(chunk.len() as u64);
        total_bytes = total_bytes.saturating_add(chunk.len() as u64);
        if total_bytes > expected_size {
            return Err("地图资源大小与签名清单不符".into());
        }
        file.write_all(&chunk)
            .map_err(|_| "无法写入地图资源临时文件".to_string())?;
        if downloaded_bytes == chunk.len() as u64
            || last_progress_event.elapsed() >= Duration::from_millis(120)
            || total_bytes == expected_size
        {
            if let Some(app) = app {
                let _ = app.emit(
                    "box-player-map-download-progress",
                    MapDownloadProgress {
                        hash,
                        current_bytes: total_bytes,
                        total_bytes: expected_size,
                    },
                );
            }
            last_progress_event = Instant::now();
        }
    }
    file.sync_all()
        .map_err(|_| "无法提交地图资源临时文件".to_string())?;
    if total_bytes != expected_size {
        return Err("地图资源大小与签名清单不符".into());
    }
    Ok(ApiResponse {
        status,
        headers: response_headers(&headers),
        body: String::new(),
        downloaded_bytes: Some(downloaded_bytes),
    })
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct MapDownloadProgress<'a> {
    hash: &'a str,
    current_bytes: u64,
    total_bytes: u64,
}
