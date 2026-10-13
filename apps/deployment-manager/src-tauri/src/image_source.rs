//! Download sources are pinned by the installer; invalid test sources never fall back to production.
pub(crate) const STABLE_BASE: &str = "https://assets.box3.fun/local-engine";

pub(crate) fn download_url(base: Option<&str>, archive: &str) -> Result<String, String> {
    let base = base.unwrap_or(STABLE_BASE);
    if base != STABLE_BASE {
        let version = base
            .strip_prefix("https://assets.box3.fun/local-engine-testing/v")
            .ok_or("镜像下载来源无效")?;
        if version.is_empty()
            || version.contains("..")
            || !version
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-'))
        {
            return Err("测试镜像下载来源无效".into());
        }
    }
    if archive.is_empty()
        || archive.contains("..")
        || !archive
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'-' | b'_'))
    {
        return Err("镜像归档名称无效".into());
    }
    Ok(format!("{base}/{archive}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stable_and_testing_sources_are_distinct_and_pinned() {
        let archive = "box-local-engine-image-play-arm64-example.tar.gz";
        assert_eq!(
            download_url(None, archive).unwrap(),
            format!("{STABLE_BASE}/{archive}")
        );
        let testing = "https://assets.box3.fun/local-engine-testing/v0.3.0";
        assert_eq!(
            download_url(Some(testing), archive).unwrap(),
            format!("{testing}/{archive}")
        );
        for base in [
            "http://assets.box3.fun/local-engine-testing/v0.3.0",
            "https://evil.test/local-engine-testing/v0.3.0",
            "https://assets.box3.fun/local-engine-testing/v../local-engine",
            "https://assets.box3.fun/local-engine-testing/v0.3.0?next=stable",
        ] {
            assert!(download_url(Some(base), archive).is_err());
        }
        assert!(download_url(Some(testing), "../outside.tar.gz").is_err());
    }
}
