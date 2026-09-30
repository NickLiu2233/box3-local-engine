mod api_download;
mod api_transport;
mod map_packages;
mod package_descriptor;
mod package_index;
mod package_ownership;
mod webview_session;
mod window_title;

use api_transport::{api_request, clear_player_cookie, clear_server_auth};
use map_packages::{get_map_asset_resume_offset, install_map_asset, prepare_map_package};
use package_descriptor::validate_descriptor;
use package_index::{commit_map_package, verify_installed_map_package};
use package_ownership::{associate_map_packages_with_server, remove_server_map_data};
use serde::{Deserialize, Serialize};
use std::{fs, net::IpAddr, path::PathBuf};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use url::Url;
use webview_session::{
    clear_player_cookies as clear_webview_player_cookies,
    sync_player_cookies as sync_webview_player_cookies,
};

const ROOT_VERSION: &str = match option_env!("BOX_ROOT_VERSION") {
    Some(version) if !version.is_empty() => version,
    _ => env!("CARGO_PKG_VERSION"),
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PlayerServer {
    id: String,
    endpoint: String,
    name: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct LauncherState {
    servers: Vec<PlayerServer>,
    selected_server_id: Option<String>,
}

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("无法定位玩家启动器数据目录：{error}"))?;
    fs::create_dir_all(&directory)
        .map_err(|error| format!("无法创建玩家启动器数据目录：{error}"))?;
    Ok(directory.join("servers.json"))
}

fn load_state(app: &AppHandle) -> Result<LauncherState, String> {
    let path = state_path(app)?;
    if !path.exists() {
        return Ok(LauncherState::default());
    }
    let contents =
        fs::read_to_string(path).map_err(|error| format!("无法读取服务器列表：{error}"))?;
    serde_json::from_str(&contents).map_err(|error| format!("服务器列表格式无效：{error}"))
}

pub(crate) fn server_endpoint_for_id(app: &AppHandle, server_id: &str) -> Result<String, String> {
    load_state(app)?
        .servers
        .into_iter()
        .find(|server| server.id == server_id)
        .map(|server| server.endpoint)
        .ok_or_else(|| "这个服务器已不在列表中".to_string())
}

fn save_state(app: &AppHandle, state: &LauncherState) -> Result<(), String> {
    let path = state_path(app)?;
    let temporary = path.with_extension("json.tmp");
    let contents = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(&temporary, format!("{contents}\n"))
        .map_err(|error| format!("无法保存服务器列表：{error}"))?;
    fs::rename(temporary, path).map_err(|error| format!("无法提交服务器列表：{error}"))
}

fn is_loopback_host(host: &str) -> bool {
    host.eq_ignore_ascii_case("localhost")
        || host.to_ascii_lowercase().ends_with(".localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false)
}

pub(crate) fn normalize_endpoint(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    let endpoint = if trimmed.contains("://") {
        trimmed.to_owned()
    } else {
        format!("https://{trimmed}")
    };
    if endpoint.chars().any(char::is_whitespace) {
        return Err("请输入有效的游玩端服务器 IP 或域名".into());
    }
    let mut parsed =
        Url::parse(&endpoint).map_err(|_| "请输入有效的游玩端服务器 IP 或域名".to_string())?;
    if !matches!(parsed.scheme(), "http" | "https")
        || parsed.host_str().is_none()
        || !parsed.username().is_empty()
        || parsed.password().is_some()
    {
        return Err("请输入有效的游玩端服务器 IP 或域名（支持 HTTP/HTTPS）".into());
    }
    if !trimmed.contains("://") && parsed.host_str().is_some_and(is_loopback_host) {
        parsed
            .set_scheme("http")
            .map_err(|_| "本机游玩端地址无效".to_string())?;
    }
    Ok(parsed.to_string().trim_end_matches('/').to_owned())
}

fn normalize_server_name(value: &str) -> Result<String, String> {
    let name = value.trim();
    if name.is_empty() {
        return Err("服务器昵称不能为空".into());
    }
    if name.chars().count() > 40 {
        return Err("服务器昵称不能超过 40 个字符".into());
    }
    if name.chars().any(char::is_control) {
        return Err("服务器昵称不能包含控制字符".into());
    }
    Ok(name.to_owned())
}

#[tauri::command]
fn launcher_state(app: AppHandle) -> Result<LauncherState, String> {
    load_state(&app)
}

#[tauri::command]
async fn clear_player_session(app: AppHandle, server_id: String) -> Result<(), String> {
    let state = load_state(&app)?;
    let server = state
        .servers
        .iter()
        .find(|server| server.id == server_id)
        .ok_or_else(|| "这个服务器已不在列表中".to_string())?;
    clear_player_cookie(&server.endpoint)?;
    clear_webview_player_cookies(&app, &server.endpoint)
}

#[tauri::command]
fn add_server(app: AppHandle, endpoint: String) -> Result<PlayerServer, String> {
    let endpoint = normalize_endpoint(&endpoint)?;
    let id = endpoint.to_ascii_lowercase();
    let name = endpoint
        .split_once("://")
        .map(|(_, host)| host.split('/').next().unwrap_or(host).to_owned())
        .unwrap_or_else(|| endpoint.clone());
    let server = PlayerServer { id, endpoint, name };
    let mut state = load_state(&app)?;
    state.servers.retain(|item| item.id != server.id);
    state.servers.insert(0, server.clone());
    state.selected_server_id = Some(server.id.clone());
    save_state(&app, &state)?;
    Ok(server)
}

#[tauri::command]
fn select_server(app: AppHandle, server_id: String) -> Result<LauncherState, String> {
    let mut state = load_state(&app)?;
    if !state.servers.iter().any(|server| server.id == server_id) {
        return Err("这个服务器已不在列表中".into());
    }
    state.selected_server_id = Some(server_id);
    save_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
async fn remove_server(app: AppHandle, server_id: String) -> Result<LauncherState, String> {
    let mut state = load_state(&app)?;
    if let Some(server) = state.servers.iter().find(|server| server.id == server_id) {
        if state.selected_server_id.as_deref() == Some(server_id.as_str()) {
            if let Some(game_window) = app.get_webview_window("player-game") {
                game_window
                    .close()
                    .map_err(|_| "无法关闭当前游玩窗口".to_string())?;
            }
        }
        remove_server_map_data(&app, &server_id)?;
        clear_server_auth(&server.endpoint);
        clear_webview_player_cookies(&app, &server.endpoint)?;
    }
    state.servers.retain(|server| server.id != server_id);
    if state.selected_server_id.as_deref() == Some(server_id.as_str()) {
        state.selected_server_id = state.servers.first().map(|server| server.id.clone());
    }
    save_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
async fn launch_map(
    app: AppHandle,
    server_id: String,
    descriptor: String,
    trusted_signing_key: String,
    map_name: String,
    launch_ticket: String,
) -> Result<(), String> {
    let state = load_state(&app)?;
    if state.selected_server_id.as_deref() != Some(server_id.as_str()) {
        return Err("请先选择要启动地图的服务器".into());
    }
    let server = state
        .servers
        .iter()
        .find(|server| server.id == server_id)
        .ok_or_else(|| "这个服务器已不在列表中".to_string())?;
    let package =
        verify_installed_map_package(&app, &descriptor, &trusted_signing_key, &server_id)?;
    let verified_descriptor = validate_descriptor(&descriptor, &trusted_signing_key)?;
    if launch_ticket.len() > 2048
        || !launch_ticket.bytes().all(|byte| {
            byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-' || byte == b'.'
        })
        || launch_ticket
            .split_once('.')
            .map_or(true, |(payload, signature)| {
                payload.is_empty() || signature.is_empty() || signature.contains('.')
            })
    {
        return Err("服务器启动授权无效，请重新点击开始游玩。".into());
    }
    let window_title = window_title::map_window_title(&map_name, &package.release_version);
    let descriptor: serde_json::Value =
        serde_json::from_str(&descriptor).map_err(|_| "地图资源描述符格式无效".to_string())?;
    let access_id = descriptor
        .get("accessId")
        .and_then(serde_json::Value::as_str)
        .ok_or_else(|| "地图访问地址无效".to_string())?;
    if !access_id
        .bytes()
        .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
    {
        return Err("地图访问地址无效".into());
    }
    let mut game_url = Url::parse(&normalize_endpoint(&server.endpoint)?)
        .map_err(|_| "游玩服务器地址无效".to_string())?;
    let base_path = game_url.path().trim_end_matches('/');
    game_url.set_path(&format!("{base_path}/p/{access_id}"));
    game_url.set_query(None);
    game_url
        .query_pairs_mut()
        .append_pair("box3ServiceWorkerCache", "1")
        .append_pair("box3PermanentMapId", &verified_descriptor.permanent_map_id)
        .append_pair("box3ReleaseVersion", &verified_descriptor.release_version)
        .append_pair("box3ManifestDigest", &verified_descriptor.manifest_digest);
    game_url.set_fragment(Some(&format!("box3LaunchTicket={launch_ticket}")));

    if let Some(main_window) = app.get_webview_window("main") {
        sync_webview_player_cookies(&main_window, &server.endpoint)?;
    }
    if let Some(game_window) = app.get_webview_window("player-game") {
        sync_webview_player_cookies(&game_window, &server.endpoint)?;
        game_window
            .set_title(&window_title)
            .map_err(|_| "无法更新游玩窗口标题".to_string())?;
        if game_window.navigate(game_url).is_err() {
            return Err("无法打开游玩地图".into());
        }
        return game_window
            .set_focus()
            .map_err(|_| "无法切换到游玩窗口".to_string());
    }
    let game_window =
        WebviewWindowBuilder::new(&app, "player-game", WebviewUrl::External(game_url.clone()))
            .title(&window_title)
            .inner_size(1280.0, 800.0)
            .min_inner_size(900.0, 620.0)
            .resizable(true)
            .build()
            .map_err(|_| {
                local_protocol.clear();
                "无法创建游玩窗口".to_string()
            })?;
    sync_webview_player_cookies(&game_window, &server.endpoint)?;
    game_window
        .navigate(game_url)
        .map_err(|_| "无法打开游玩地图".to_string())?;
    game_window
        .set_focus()
        .map_err(|_| "无法切换到游玩窗口".to_string())
}

#[tauri::command]
fn rename_server(app: AppHandle, server_id: String, name: String) -> Result<PlayerServer, String> {
    let name = normalize_server_name(&name)?;
    let mut state = load_state(&app)?;
    let server = state
        .servers
        .iter_mut()
        .find(|server| server.id == server_id)
        .ok_or_else(|| "这个服务器已不在列表中".to_string())?;
    server.name = name;
    let renamed = server.clone();
    save_state(&app, &state)?;
    Ok(renamed)
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(&format!("BOX3 Player Launcher v{ROOT_VERSION}"))?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            launcher_state,
            clear_player_session,
            api_request,
            prepare_map_package,
            get_map_asset_resume_offset,
            install_map_asset,
            commit_map_package,
            associate_map_packages_with_server,
            launch_map,
            add_server,
            select_server,
            remove_server,
            rename_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running BOX3 Player Launcher");
}

#[cfg(test)]
mod tests {
    use super::{normalize_endpoint, normalize_server_name};
    use crate::api_transport::{merge_cookies, validate_api_url};

    #[test]
    fn normalizes_player_server_addresses() {
        assert_eq!(
            normalize_endpoint("play.example.com/").unwrap(),
            "https://play.example.com"
        );
        assert_eq!(
            normalize_endpoint("127.0.0.1:3492").unwrap(),
            "http://127.0.0.1:3492"
        );
        assert_eq!(
            normalize_endpoint("localhost:3492").unwrap(),
            "http://localhost:3492"
        );
        assert!(normalize_endpoint("https://bad host").is_err());
        assert!(normalize_endpoint("ftp://play.example.com").is_err());
        assert!(normalize_endpoint("https://user:pass@play.example.com").is_err());
    }

    #[test]
    fn api_transport_is_limited_to_the_server_api_origin_and_path() {
        assert!(validate_api_url(
            "https://play.example.com/base",
            "https://play.example.com/base/api/health-check",
            None,
        )
        .is_ok());
        assert!(validate_api_url(
            "https://play.example.com/base",
            "https://other.example.com/base/api/health-check",
            None,
        )
        .is_err());
        assert!(validate_api_url(
            "https://play.example.com/base",
            "https://play.example.com/elsewhere",
            None,
        )
        .is_err());
    }

    #[test]
    fn external_auth_portal_is_limited_to_known_login_routes() {
        assert!(validate_api_url(
            "https://play.example.com",
            "https://accounts.example.com/api/auth/login",
            Some("https://accounts.example.com"),
        )
        .is_ok());
        assert!(validate_api_url(
            "https://play.example.com",
            "https://accounts.example.com/api/anything",
            Some("https://accounts.example.com"),
        )
        .is_err());
    }

    #[test]
    fn session_cookies_merge_and_expire_by_cookie_name() {
        let merged = merge_cookies(
            "box_local_player_device=device; box_local_player_session=old",
            [
                "box_local_player_session=new; Path=/; HttpOnly".to_owned(),
                "box_local_player_device=; Path=/; Max-Age=0".to_owned(),
            ]
            .into_iter(),
        );
        assert_eq!(merged, "box_local_player_session=new");
    }

    #[test]
    fn validates_server_nicknames() {
        assert_eq!(
            normalize_server_name("  我的服务器  ").unwrap(),
            "我的服务器"
        );
        assert!(normalize_server_name("  ").is_err());
        assert!(normalize_server_name(&"a".repeat(41)).is_err());
        assert!(normalize_server_name("name\nwith newline").is_err());
    }
}
