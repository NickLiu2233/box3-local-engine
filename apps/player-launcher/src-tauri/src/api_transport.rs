use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::{Mutex, OnceLock},
    time::Duration,
};
use url::Url;

use crate::normalize_endpoint;

const MAX_API_RESPONSE_BYTES: usize = 16 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApiRequest {
    pub(crate) endpoint: String,
    pub(crate) url: String,
    pub(crate) method: String,
    pub(crate) headers: Vec<(String, String)>,
    pub(crate) body: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ApiResponse {
    pub(crate) status: u16,
    pub(crate) headers: Vec<(String, String)>,
    pub(crate) body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) downloaded_bytes: Option<u64>,
}

pub(crate) type SentApiRequest = (String, String, String, reqwest::Response);

static PLAYER_COOKIES: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();
static AUTH_PORTAL_ORIGINS: OnceLock<Mutex<HashMap<String, String>>> = OnceLock::new();

fn player_cookies() -> &'static Mutex<HashMap<String, String>> {
    PLAYER_COOKIES.get_or_init(|| Mutex::new(HashMap::new()))
}

fn auth_portal_origins() -> &'static Mutex<HashMap<String, String>> {
    AUTH_PORTAL_ORIGINS.get_or_init(|| Mutex::new(HashMap::new()))
}

pub(crate) fn clear_player_cookie(endpoint: &str) -> Result<(), String> {
    player_cookies()
        .lock()
        .map_err(|_| "启动器登录状态暂时不可用".to_string())?
        .remove(endpoint);
    Ok(())
}

pub(crate) fn player_auth_cookies(endpoint: &str) -> Result<Vec<(String, String)>, String> {
    let cookies = player_cookies()
        .lock()
        .map_err(|_| "启动器登录状态暂时不可用".to_string())?;
    let Some(value) = cookies.get(endpoint) else {
        return Ok(Vec::new());
    };
    Ok(value
        .split(';')
        .filter_map(|part| part.trim().split_once('='))
        .filter(|(name, _)| {
            matches!(
                name.trim(),
                "box_local_player_session" | "box_local_player_device"
            )
        })
        .map(|(name, value)| (name.trim().to_owned(), value.trim().to_owned()))
        .collect())
}

pub(crate) fn clear_server_auth(endpoint: &str) {
    if let Ok(mut cookies) = player_cookies().lock() {
        cookies.remove(endpoint);
    }
    if let Ok(mut origins) = auth_portal_origins().lock() {
        origins.remove(endpoint);
    }
}

fn is_loopback_host(host: &str) -> bool {
    host.eq_ignore_ascii_case("localhost")
        || host.to_ascii_lowercase().ends_with(".localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false)
}

pub(crate) fn validate_api_url(
    endpoint: &str,
    request_url: &str,
    auth_portal_origin: Option<&str>,
) -> Result<Url, String> {
    let base =
        Url::parse(&normalize_endpoint(endpoint)?).map_err(|_| "服务器地址无效".to_string())?;
    let url = Url::parse(request_url).map_err(|_| "API 请求地址无效".to_string())?;
    let base_path = base.path().trim_end_matches('/');
    let allowed_path = format!("{base_path}/api/");
    let is_server_api = url.origin() == base.origin() && url.path().starts_with(&allowed_path);
    let is_auth_portal_api = auth_portal_origin.is_some_and(|origin| {
        url.origin().ascii_serialization() == origin
            && matches!(
                url.path(),
                "/api/auth/login" | "/api/auth/logout" | "/api/auth/session"
            )
    });
    if (!is_server_api && !is_auth_portal_api)
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
    {
        return Err("API 请求必须指向当前游玩服务器的 /api/ 接口".into());
    }
    Ok(url)
}

fn cookie_pair(set_cookie: &str) -> Option<(String, String, bool)> {
    let first = set_cookie.split(';').next()?.trim();
    let (name, value) = first.split_once('=')?;
    let name = name.trim();
    if name.is_empty() {
        return None;
    }
    let expires = set_cookie.split(';').any(|attribute| {
        let attribute = attribute.trim().to_ascii_lowercase();
        attribute == "max-age=0" || attribute.starts_with("max-age=-")
    });
    Some((
        name.to_owned(),
        value.trim().to_owned(),
        expires || value.trim().is_empty(),
    ))
}

pub(crate) fn merge_cookies(existing: &str, set_cookies: impl Iterator<Item = String>) -> String {
    let mut cookies = HashMap::<String, String>::new();
    for part in existing.split(';') {
        if let Some((name, value)) = part.trim().split_once('=') {
            if !name.trim().is_empty() {
                cookies.insert(name.trim().to_owned(), value.trim().to_owned());
            }
        }
    }
    for set_cookie in set_cookies {
        if let Some((name, value, remove)) = cookie_pair(&set_cookie) {
            if remove {
                cookies.remove(&name);
            } else {
                cookies.insert(name, value);
            }
        }
    }
    let mut entries = cookies.into_iter().collect::<Vec<_>>();
    entries.sort_by(|left, right| left.0.cmp(&right.0));
    entries
        .into_iter()
        .map(|(name, value)| format!("{name}={value}"))
        .collect::<Vec<_>>()
        .join("; ")
}

fn remember_auth_portal_origin(server: &str, body: &str) {
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct BootstrapAuthUrl {
        login_api_url: String,
    }
    if let Ok(mut origins) = auth_portal_origins().lock() {
        origins.remove(server);
    }
    let Ok(bootstrap) = serde_json::from_str::<BootstrapAuthUrl>(body) else {
        return;
    };
    let Ok(login_url) = Url::parse(&bootstrap.login_api_url) else {
        return;
    };
    let secure = login_url.scheme() == "https"
        || (login_url.scheme() == "http"
            && login_url
                .host_str()
                .is_some_and(|host| is_loopback_host(host)));
    if secure
        && login_url.path() == "/api/auth/login"
        && login_url.username().is_empty()
        && login_url.password().is_none()
        && login_url.query().is_none()
        && login_url.fragment().is_none()
    {
        if let Ok(mut origins) = auth_portal_origins().lock() {
            origins.insert(server.to_owned(), login_url.origin().ascii_serialization());
        }
    }
}

pub(crate) async fn send_api_request(
    request: ApiRequest,
    timeout: Duration,
) -> Result<SentApiRequest, String> {
    let endpoint = normalize_endpoint(&request.endpoint)?;
    let auth_origin = auth_portal_origins()
        .lock()
        .map_err(|_| "启动器登录状态暂时不可用".to_string())?
        .get(&endpoint)
        .cloned();
    let url = validate_api_url(&endpoint, &request.url, auth_origin.as_deref())?;
    let method = reqwest::Method::from_bytes(request.method.as_bytes())
        .map_err(|_| "API 请求方法无效".to_string())?;
    if !matches!(
        method,
        reqwest::Method::GET
            | reqwest::Method::POST
            | reqwest::Method::PUT
            | reqwest::Method::PATCH
            | reqwest::Method::DELETE
            | reqwest::Method::HEAD
    ) {
        return Err("不支持的 API 请求方法".into());
    }
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| "启动器无法初始化网络连接".to_string())?;
    let mut outgoing = client.request(method, url);
    let current_cookies = player_cookies()
        .lock()
        .map_err(|_| "启动器登录状态暂时不可用".to_string())?
        .get(&endpoint)
        .cloned()
        .unwrap_or_default();
    for (name, value) in request.headers {
        let name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
            .map_err(|_| "API 请求头无效".to_string())?;
        if matches!(
            name,
            reqwest::header::HOST
                | reqwest::header::ORIGIN
                | reqwest::header::REFERER
                | reqwest::header::CONTENT_LENGTH
                | reqwest::header::COOKIE
        ) {
            continue;
        }
        if name
            .as_str()
            .eq_ignore_ascii_case("x-box-local-map-install")
        {
            continue;
        }
        let value = reqwest::header::HeaderValue::from_str(&value)
            .map_err(|_| "API 请求头无效".to_string())?;
        outgoing = outgoing.header(name, value);
    }
    if !current_cookies.is_empty() {
        outgoing = outgoing.header(reqwest::header::COOKIE, current_cookies.clone());
    }
    if let Some(body) = request.body {
        outgoing = outgoing.body(body);
    }
    let url_string = request.url;
    let response = outgoing.send().await.map_err(|error| {
        if error.is_timeout() {
            "API 请求超时，请稍后重试".to_string()
        } else {
            "无法连接到游玩端服务器，请检查地址和网络".to_string()
        }
    })?;
    Ok((endpoint, current_cookies, url_string, response))
}

pub(crate) fn response_headers(headers: &reqwest::header::HeaderMap) -> Vec<(String, String)> {
    headers
        .iter()
        .filter(|(name, _)| *name != reqwest::header::SET_COOKIE)
        .filter_map(|(name, value)| {
            value
                .to_str()
                .ok()
                .map(|value| (name.to_string(), value.to_owned()))
        })
        .collect()
}

pub(crate) fn update_player_cookies(
    endpoint: &str,
    existing: &str,
    headers: &reqwest::header::HeaderMap,
) -> Result<(), String> {
    let set_cookies = headers
        .get_all(reqwest::header::SET_COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok().map(str::to_owned))
        .collect::<Vec<_>>();
    if set_cookies.is_empty() {
        return Ok(());
    }
    let merged = merge_cookies(existing, set_cookies.into_iter());
    let mut cookies = player_cookies()
        .lock()
        .map_err(|_| "启动器登录状态暂时不可用".to_string())?;
    if merged.is_empty() {
        cookies.remove(endpoint);
    } else {
        cookies.insert(endpoint.to_owned(), merged);
    }
    Ok(())
}

pub(crate) async fn read_api_text(mut response: reqwest::Response) -> Result<String, String> {
    if response
        .content_length()
        .is_some_and(|length| length > MAX_API_RESPONSE_BYTES as u64)
    {
        return Err("服务器 API 响应超过启动器安全上限".into());
    }
    let mut bytes = Vec::new();
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| "读取服务器 API 响应失败".to_string())?
    {
        if bytes.len().saturating_add(chunk.len()) > MAX_API_RESPONSE_BYTES {
            return Err("服务器 API 响应超过启动器安全上限".into());
        }
        bytes.extend_from_slice(&chunk);
    }
    String::from_utf8(bytes).map_err(|_| "服务器 API 响应不是有效文本".into())
}

#[tauri::command]
pub(crate) async fn api_request(request: ApiRequest) -> Result<ApiResponse, String> {
    let (endpoint, current_cookies, url, response) =
        send_api_request(request, Duration::from_secs(8)).await?;
    let status = response.status().as_u16();
    let headers = response.headers().clone();
    let body = read_api_text(response).await?;
    update_player_cookies(&endpoint, &current_cookies, &headers)?;
    if url.contains("/api/player-launcher/bootstrap") {
        remember_auth_portal_origin(&endpoint, &body);
    }
    Ok(ApiResponse {
        status,
        headers: response_headers(&headers),
        body,
        downloaded_bytes: None,
    })
}

#[cfg(test)]
#[path = "api_transport_tests.rs"]
mod tests;
