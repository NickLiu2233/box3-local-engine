//! Production and staging share behavior while keeping download scopes separate.
pub const PRODUCTION_BASE: &str = "https://assets.box3.fun/local-engine";
pub const STAGING_BASE: &str = "https://assets.box3.fun/local-engine-staging";

pub fn is_staging(version: &str) -> bool {
    version.ends_with("-staging") || version.ends_with(".staging")
}

pub fn release_base(version: &str) -> &'static str {
    if is_staging(version) {
        STAGING_BASE
    } else {
        PRODUCTION_BASE
    }
}

fn valid_version(version: &str) -> bool {
    let base = version.strip_suffix("-staging").unwrap_or(version);
    let parts: Vec<_> = base.split('.').collect();
    parts.len() == 3
        && parts.iter().all(|part| {
            !part.is_empty()
                && part.len() <= 9
                && (part.len() == 1 || !part.starts_with('0'))
                && part.bytes().all(|b| b.is_ascii_digit())
        })
}

pub fn image_download_url(base: Option<&str>, archive: &str) -> Result<String, String> {
    let base = base.unwrap_or(PRODUCTION_BASE);
    if base != PRODUCTION_BASE {
        let pinned = base
            .strip_prefix(&format!("{STAGING_BASE}/v"))
            .ok_or("镜像下载来源无效")?;
        let (version, commit) = pinned.split_once('/').ok_or("预发布镜像来源缺少提交号")?;
        if !is_staging(version)
            || !valid_version(version)
            || commit.len() != 40
            || !commit.bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err("预发布镜像下载来源无效".into());
        }
    }
    if archive.is_empty()
        || archive.contains("..")
        || !archive
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'-' | b'_'))
    {
        return Err("镜像归档名称无效".into());
    }
    Ok(format!("{base}/{archive}"))
}

pub fn valid_installer_url(url: &str, current_version: &str) -> bool {
    let Some(name) = url.strip_prefix(&format!(
        "{}/BOX-Local-Engine-",
        release_base(current_version)
    )) else {
        return false;
    };
    [
        "windows-amd64",
        "windows-arm64",
        "macos-arm64",
        "linux-amd64",
        "linux-arm64",
    ]
    .iter()
    .any(|target| {
        let Some(version) = name.strip_suffix(&format!("-{target}.zip")) else {
            return false;
        };
        valid_version(version) && is_staging(version) == is_staging(current_version)
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn channels_cannot_download_each_others_installers() {
        let stable = format!("{PRODUCTION_BASE}/BOX-Local-Engine-0.4.0-macos-arm64.zip");
        let staging = format!("{STAGING_BASE}/BOX-Local-Engine-0.4.0-staging-macos-arm64.zip");
        assert!(valid_installer_url(&stable, "0.3.0"));
        assert!(!valid_installer_url(&staging, "0.3.0"));
        assert!(valid_installer_url(&staging, "0.3.0-staging"));
        assert!(!valid_installer_url(&stable, "0.3.0-staging"));
        assert!(!valid_installer_url(
            &(staging + "?next=production"),
            "0.3.0-staging"
        ));
    }
    #[test]
    fn staging_image_sources_are_pinned_without_fallback() {
        let base = format!("{STAGING_BASE}/v0.3.0-staging/{}", "a".repeat(40));
        assert_eq!(
            image_download_url(Some(&base), "image.tar.gz").unwrap(),
            format!("{base}/image.tar.gz")
        );
        for invalid in [
            STAGING_BASE,
            "https://evil.test/local-engine",
            "https://assets.box3.fun/local-engine-staging/v0.3.0-staging/../production",
        ] {
            assert!(image_download_url(Some(invalid), "image.tar.gz").is_err());
        }
        assert!(image_download_url(Some(&base), "../image.tar.gz").is_err());
    }
}
