use std::process::Command;

pub(crate) fn valid_download_url(url: &str) -> bool {
    let Some(name) = url.strip_prefix("https://assets.box3.fun/local-engine/BOX-Local-Engine-")
    else {
        return false;
    };
    let targets = [
        "windows-amd64",
        "windows-arm64",
        "macos-arm64",
        "linux-amd64",
        "linux-arm64",
    ];
    targets.iter().any(|target| {
        let Some(version) = name.strip_suffix(&format!("-{target}.zip")) else {
            return false;
        };
        let parts: Vec<_> = version.split('.').collect();
        parts.len() == 3
            && parts.iter().all(|part| {
                !part.is_empty()
                    && part.len() <= 9
                    && (part.len() == 1 || !part.starts_with('0'))
                    && part.bytes().all(|byte| byte.is_ascii_digit())
            })
    })
}

#[tauri::command]
pub fn open_release_download(url: String) -> Result<(), String> {
    if !valid_download_url(&url) {
        return Err("安装包下载地址无效".into());
    }
    #[cfg(target_os = "windows")]
    let mut command = {
        let mut command = Command::new("cmd");
        command.args(["/C", "start", "", &url]);
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
        command
    };
    #[cfg(target_os = "macos")]
    let mut command = {
        let mut command = Command::new("open");
        command.arg(&url);
        command
    };
    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let mut command = {
        let mut command = Command::new("xdg-open");
        command.arg(&url);
        command
    };
    command
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("无法打开安装包下载地址：{error}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn download_urls_are_limited_to_official_stable_installers() {
        assert!(valid_download_url(
            "https://assets.box3.fun/local-engine/BOX-Local-Engine-0.4.0-macos-arm64.zip"
        ));
        for url in [
            "https://evil.test/BOX-Local-Engine-0.4.0-macos-arm64.zip",
            "https://assets.box3.fun/local-engine/BOX-Local-Engine-0.4.0-macos-arm64.zip?next=evil",
            "https://assets.box3.fun/local-engine/BOX-Local-Engine-../0.4.0-macos-arm64.zip",
            "https://assets.box3.fun/local-engine/BOX-Local-Engine-0.4.0-beta-macos-arm64.zip",
        ] {
            assert!(!valid_download_url(url));
        }
    }
}
