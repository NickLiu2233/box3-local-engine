use serde::{Deserialize, Serialize};
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Manager};

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
    fs::create_dir_all(&directory).map_err(|error| format!("无法创建玩家启动器数据目录：{error}"))?;
    Ok(directory.join("servers.json"))
}

fn load_state(app: &AppHandle) -> Result<LauncherState, String> {
    let path = state_path(app)?;
    if !path.exists() {
        return Ok(LauncherState::default());
    }
    let contents = fs::read_to_string(path).map_err(|error| format!("无法读取服务器列表：{error}"))?;
    serde_json::from_str(&contents).map_err(|error| format!("服务器列表格式无效：{error}"))
}

fn save_state(app: &AppHandle, state: &LauncherState) -> Result<(), String> {
    let path = state_path(app)?;
    let temporary = path.with_extension("json.tmp");
    let contents = serde_json::to_string_pretty(state).map_err(|error| error.to_string())?;
    fs::write(&temporary, format!("{contents}\n")).map_err(|error| format!("无法保存服务器列表：{error}"))?;
    fs::rename(temporary, path).map_err(|error| format!("无法提交服务器列表：{error}"))
}

fn normalize_endpoint(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    let endpoint = if trimmed.contains("://") {
        trimmed.to_owned()
    } else {
        format!("https://{trimmed}")
    };
    let valid_scheme = endpoint.starts_with("https://") || endpoint.starts_with("http://");
    let authority = endpoint.split_once("://").map(|(_, rest)| rest.split('/').next().unwrap_or(""));
    if !valid_scheme
        || authority.map_or(true, str::is_empty)
        || endpoint.chars().any(char::is_whitespace)
    {
        return Err("请输入有效的游玩服务器地址，例如 https://play.example.com".into());
    }
    Ok(endpoint)
}

#[tauri::command]
fn launcher_state(app: AppHandle) -> Result<LauncherState, String> {
    load_state(&app)
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
fn remove_server(app: AppHandle, server_id: String) -> Result<LauncherState, String> {
    let mut state = load_state(&app)?;
    state.servers.retain(|server| server.id != server_id);
    if state.selected_server_id.as_deref() == Some(server_id.as_str()) {
        state.selected_server_id = state.servers.first().map(|server| server.id.clone());
    }
    save_state(&app, &state)?;
    Ok(state)
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![launcher_state, add_server, select_server, remove_server])
        .run(tauri::generate_context!())
        .expect("error while running BOX3 Player Launcher");
}

#[cfg(test)]
mod tests {
    use super::normalize_endpoint;

    #[test]
    fn normalizes_player_server_addresses() {
        assert_eq!(
            normalize_endpoint("play.example.com/").unwrap(),
            "https://play.example.com"
        );
        assert_eq!(
            normalize_endpoint("http://127.0.0.1:3492/").unwrap(),
            "http://127.0.0.1:3492"
        );
        assert!(normalize_endpoint("https://bad host").is_err());
        assert!(normalize_endpoint("ftp://play.example.com").is_err());
    }
}
