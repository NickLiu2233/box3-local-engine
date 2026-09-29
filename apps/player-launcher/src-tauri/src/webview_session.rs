use crate::{api_transport::player_auth_cookies, normalize_endpoint};
use tauri::webview::cookie::{time::Duration as CookieDuration, Cookie, SameSite};
use tauri::{AppHandle, Manager};
use url::Url;

fn player_cookies_for_webview(
    endpoint: &str,
) -> Result<(String, bool, Vec<(String, String)>), String> {
    let url =
        Url::parse(&normalize_endpoint(endpoint)?).map_err(|_| "游玩服务器地址无效".to_string())?;
    let host = url
        .host_str()
        .ok_or_else(|| "游玩服务器地址无效".to_string())?
        .to_owned();
    let secure = url.scheme() == "https";
    let cookies = player_auth_cookies(endpoint)?;
    if !cookies
        .iter()
        .any(|(name, _)| name == "box_local_player_session")
    {
        return Err("当前服务器尚未登录玩家账号".into());
    }
    Ok((host, secure, cookies))
}

pub(crate) fn sync_player_cookies(
    window: &tauri::WebviewWindow,
    endpoint: &str,
) -> Result<(), String> {
    let (host, secure, cookies) = player_cookies_for_webview(endpoint)?;
    for (name, value) in cookies {
        let lifetime = if name == "box_local_player_session" {
            14
        } else {
            365
        };
        let cookie = Cookie::build((name, value))
            .domain(host.clone())
            .path("/")
            .http_only(true)
            .secure(secure)
            .same_site(SameSite::Lax)
            .max_age(CookieDuration::days(lifetime))
            .build();
        window
            .set_cookie(cookie)
            .map_err(|_| "无法安全地将当前服务器登录态交给游玩窗口".to_string())?;
    }
    Ok(())
}

pub(crate) fn clear_player_cookies(app: &AppHandle, endpoint: &str) -> Result<(), String> {
    let url =
        Url::parse(&normalize_endpoint(endpoint)?).map_err(|_| "游玩服务器地址无效".to_string())?;
    let host = url
        .host_str()
        .ok_or_else(|| "游玩服务器地址无效".to_string())?
        .to_owned();
    let windows = ["main", "player-game"]
        .into_iter()
        .filter_map(|label| app.get_webview_window(label));
    for window in windows {
        for name in ["box_local_player_session", "box_local_player_device"] {
            let cookie = Cookie::build((name, ""))
                .domain(host.clone())
                .path("/")
                .secure(url.scheme() == "https")
                .removal()
                .build();
            window
                .delete_cookie(cookie)
                .map_err(|_| "无法清除当前服务器的游玩登录态".to_string())?;
        }
    }
    Ok(())
}
