//! Docker command adapter used by the deployment manager.
//!
//! Commands elsewhere never need to know executable discovery rules, Windows
//! process flags, or how command failures are rendered.

use std::{
    ffi::OsStr,
    path::{Path, PathBuf},
    process::{Command, Output},
};

#[cfg(target_os = "windows")]
pub(crate) fn hide_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

#[cfg(not(target_os = "windows"))]
pub(crate) fn hide_window(_command: &mut Command) {}

pub(crate) fn run_command(mut command: Command) -> Result<Output, String> {
    hide_window(&mut command);
    let rendered = format!("{command:?}");
    let output = command
        .output()
        .map_err(|error| format!("无法执行 {rendered}：{error}"))?;
    if output.status.success() {
        Ok(output)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}

fn command_with_tool_path(executable: impl AsRef<OsStr>) -> Command {
    let executable = executable.as_ref();
    let mut command = Command::new(executable);
    let mut paths = Vec::<PathBuf>::new();
    if let Some(parent) = Path::new(executable)
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
    {
        paths.push(parent.to_path_buf());
    }
    #[cfg(target_os = "macos")]
    paths.extend([
        PathBuf::from("/Applications/Docker.app/Contents/Resources/bin"),
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/opt/homebrew/bin"),
        PathBuf::from("/usr/bin"),
        PathBuf::from("/bin"),
    ]);
    if let Some(existing) = std::env::var_os("PATH") {
        paths.extend(std::env::split_paths(&existing));
    }
    paths.dedup();
    if let Ok(path) = std::env::join_paths(paths) {
        command.env("PATH", path);
    }
    command
}

pub(crate) fn command() -> Command {
    if let Some(configured) = std::env::var_os("BOX_DOCKER_CLI") {
        if !configured.is_empty() {
            return command_with_tool_path(configured);
        }
    }
    #[cfg(target_os = "macos")]
    let candidates = [
        "/Applications/Docker.app/Contents/Resources/bin/docker",
        "/usr/local/bin/docker",
        "/opt/homebrew/bin/docker",
    ];
    #[cfg(target_os = "windows")]
    let candidates = [
        r"C:\Program Files\Docker\Docker\resources\bin\docker.exe",
        r"C:\Program Files\Docker\Docker\resources\docker.exe",
    ];
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let candidates = [
        "/usr/bin/docker",
        "/usr/local/bin/docker",
        "/snap/bin/docker",
    ];
    if let Some(path) = candidates.iter().find(|path| Path::new(path).is_file()) {
        return command_with_tool_path(path);
    }
    command_with_tool_path("docker")
}

pub(crate) fn output(args: &[&str]) -> Result<String, String> {
    let mut command = command();
    command.args(args);
    let output = run_command(command)?;
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

pub(crate) fn unavailable_message(error: String) -> String {
    let normalized = error.to_lowercase();
    if normalized.contains("no such file")
        || normalized.contains("not found")
        || normalized.contains("找不到")
    {
        "未找到 Docker。请先安装并启动 Docker，然后重新打开本程序。".into()
    } else if normalized.contains("cannot connect")
        || normalized.contains("docker daemon")
        || normalized.contains("dockerdesktoplinuxengine")
        || normalized.contains("_ping")
    {
        "Docker 已安装但尚未就绪。请启动 Docker，等待状态变为 Running 后刷新。".into()
    } else {
        format!("Docker 不可用：{error}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(target_os = "macos")]
    #[test]
    fn docker_desktop_command_can_resolve_its_credential_helper() {
        let command = command();
        let path = command
            .get_envs()
            .find(|(key, _)| *key == "PATH")
            .and_then(|(_, value)| value)
            .expect("Docker command must set an explicit PATH inside the desktop app");
        assert!(path
            .to_string_lossy()
            .split(':')
            .any(|entry| entry == "/Applications/Docker.app/Contents/Resources/bin"));
    }
}
