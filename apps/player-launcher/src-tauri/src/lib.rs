use serde::{Deserialize, Serialize};
use std::{fs, net::IpAddr, path::PathBuf, time::Duration};
use tauri::{AppHandle, Manager};
use url::Url;

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

fn save_state(app: &AppHandle, state: &LauncherState) -> Result<(), String> {
    let path = state_path(app)?;
    let temporary = path.with_extension("json.tmp");
    let contents = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(&temporary, format!("{contents}\n"))
        .map_err(|error| format!("无法保存服务器列表：{error}"))?;
    fs::rename(temporary, path).map_err(|error| format!("无法提交服务器列表：{error}"))
}

fn normalize_endpoint(value: &str) -> Result<String, String> {
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

fn is_loopback_host(host: &str) -> bool {
    host.eq_ignore_ascii_case("localhost")
        || host.to_ascii_lowercase().ends_with(".localhost")
        || host
            .parse::<IpAddr>()
            .map(|address| address.is_loopback())
            .unwrap_or(false)
}

fn health_check_url(endpoint: &str) -> Result<Url, String> {
    let mut url = Url::parse(endpoint).map_err(|_| "服务器地址无效".to_string())?;
    let base_path = url.path().trim_end_matches('/');
    url.set_path(&format!("{base_path}/api/health-check"));
    url.set_query(None);
    url.set_fragment(None);
    Ok(url)
}

async fn verify_server_endpoint(endpoint: &str) -> Result<(), String> {
    let health_url = health_check_url(endpoint)?;
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(6))
        .build()
        .map_err(|_| "启动器无法初始化网络连接".to_string())?;
    let response = client.get(health_url).send().await.map_err(|error| {
        if error.is_timeout() {
            "连接游玩端超时，请检查服务器地址、端口和网络后重试".to_string()
        } else {
            "无法连接到游玩端服务器，请检查 IP/域名、端口和网络后重试".to_string()
        }
    })?;

    if !response.status().is_success() {
        return Err(format!(
            "服务器已响应（HTTP {}），但没有通过 BOX3 游玩端检查；请确认填写的是游玩端地址",
            response.status().as_u16()
        ));
    }

    #[derive(Deserialize)]
    struct HealthCheckResponse {
        status: String,
        #[serde(default)]
        runtime: Option<String>,
    }

    let health = response.json::<HealthCheckResponse>().await.map_err(|_| {
        "服务器可连接，但未返回 BOX3 游玩端检查信息；请确认地址指向游玩端".to_string()
    })?;
    if health.status != "ok"
        || health
            .runtime
            .as_deref()
            .is_some_and(|runtime| runtime != "ready")
    {
        return Err("游玩端尚未就绪，请稍后重试".into());
    }
    Ok(())
}

#[tauri::command]
fn launcher_state(app: AppHandle) -> Result<LauncherState, String> {
    load_state(&app)
}

#[tauri::command]
async fn add_server(app: AppHandle, endpoint: String) -> Result<PlayerServer, String> {
    let endpoint = normalize_endpoint(&endpoint)?;
    verify_server_endpoint(&endpoint).await?;
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
fn remove_server(app: AppHandle, server_id: String) -> Result<LauncherState, String> {
    let mut state = load_state(&app)?;
    state.servers.retain(|server| server.id != server_id);
    if state.selected_server_id.as_deref() == Some(server_id.as_str()) {
        state.selected_server_id = state.servers.first().map(|server| server.id.clone());
    }
    save_state(&app, &state)?;
    Ok(state)
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
    use super::{health_check_url, normalize_endpoint, normalize_server_name};

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
        assert_eq!(
            normalize_endpoint("https://127.0.0.1:3492").unwrap(),
            "https://127.0.0.1:3492"
        );
        assert_eq!(
            normalize_endpoint("http://127.0.0.1:3492/").unwrap(),
            "http://127.0.0.1:3492"
        );
        assert!(normalize_endpoint("https://bad host").is_err());
        assert!(normalize_endpoint("ftp://play.example.com").is_err());
        assert!(normalize_endpoint("https://user:pass@play.example.com").is_err());
    }

    #[test]
    fn health_check_uses_the_server_base_path() {
        assert_eq!(
            health_check_url("https://play.example.com/base")
                .unwrap()
                .as_str(),
            "https://play.example.com/base/api/health-check"
        );
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
