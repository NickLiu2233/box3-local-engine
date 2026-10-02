//! Local login image selection and validation, shared by desktop and Web.
use std::collections::BTreeMap;

pub fn validate_image(value: &str) -> Result<String, String> {
    let value = value.trim();
    if value.is_empty() {
        return Ok(String::new());
    }
    let invalid = || "登录页面镜像格式无效，例如 my-login:1.0".to_string();
    if value.len() > 512 || value.contains("://") || value.chars().any(char::is_whitespace) {
        return Err(invalid());
    }
    let (name, digest) = match value.split_once('@') {
        Some((name, digest)) => (name, Some(digest)),
        None => (value, None),
    };
    if let Some(digest) = digest {
        let hash = digest.strip_prefix("sha256:").ok_or_else(invalid)?;
        if hash.len() != 64 || !hash.bytes().all(|byte| byte.is_ascii_hexdigit()) {
            return Err(invalid());
        }
    }
    let last_slash = name.rfind('/');
    let (repository, tag) = match name.rfind(':') {
        Some(index) if last_slash.is_none_or(|slash| index > slash) => {
            (&name[..index], Some(&name[index + 1..]))
        }
        _ => (name, None),
    };
    if let Some(tag) = tag {
        if tag.is_empty()
            || tag.len() > 128
            || !tag.as_bytes()[0].is_ascii_alphanumeric() && tag.as_bytes()[0] != b'_'
            || !tag
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"_.-".contains(&byte))
        {
            return Err(invalid());
        }
    }
    let mut parts = repository.split('/').peekable();
    if let Some(first) = parts.peek().copied() {
        if repository.contains('/')
            && (first.contains('.') || first.contains(':') || first == "localhost")
        {
            let (host, port) = first
                .split_once(':')
                .map_or((first, None), |(host, port)| (host, Some(port)));
            crate::configuration::validate_host(host, "镜像仓库地址").map_err(|_| invalid())?;
            if let Some(port) = port {
                crate::configuration::validate_port(port).map_err(|_| invalid())?;
            }
            parts.next();
        }
    }
    let repository_parts = parts.collect::<Vec<_>>();
    if repository_parts.is_empty()
        || repository_parts.iter().any(|part| {
            part.is_empty()
                || !part.as_bytes()[0].is_ascii_alphanumeric()
                || !part.as_bytes()[part.len() - 1].is_ascii_alphanumeric()
                || !part.bytes().all(|byte| {
                    byte.is_ascii_lowercase() || byte.is_ascii_digit() || b"._-".contains(&byte)
                })
        })
    {
        return Err(invalid());
    }
    Ok(value.into())
}

pub fn image(values: &BTreeMap<String, String>, tag: &str) -> Result<String, String> {
    let custom = validate_image(
        values
            .get("BOX_AUTH_PORTAL_IMAGE")
            .map(String::as_str)
            .unwrap_or(""),
    )?;
    Ok(if custom.is_empty() {
        format!("box-local-engine-player-auth-portal:{tag}")
    } else {
        custom
    })
}

pub fn prepare_custom_image(
    values: &BTreeMap<String, String>,
    platform: &str,
    mut docker: impl FnMut(&[&str]) -> Result<String, String>,
    _progress: impl FnMut(&str, &str, u8),
) -> Result<(), String> {
    let custom = validate_image(
        values
            .get("BOX_AUTH_PORTAL_IMAGE")
            .map(String::as_str)
            .unwrap_or(""),
    )?;
    if custom.is_empty() {
        return Ok(());
    }
    if !matches!(platform, "linux/amd64" | "linux/arm64") {
        return Err("登录页面镜像的平台无效".into());
    }
    let inspect = [
        "image",
        "inspect",
        "--format",
        "{{.Os}}/{{.Architecture}}",
        &custom,
    ];
    let architecture = docker(&inspect).map_err(|error| {
        format!("无法读取本机登录页面镜像 {custom}，请确认已构建或导入 Docker：{error}")
    })?;
    if architecture.trim() != platform {
        return Err(format!(
            "登录页面镜像需要支持 {platform}，当前为 {}",
            architecture.trim()
        ));
    }
    require_health_check(&custom, &mut docker)
}

fn require_health_check(
    image: &str,
    docker: &mut impl FnMut(&[&str]) -> Result<String, String>,
) -> Result<(), String> {
    let test = docker(&[
        "image",
        "inspect",
        "--format",
        "{{if .Config.Healthcheck}}{{json .Config.Healthcheck.Test}}{{end}}",
        image,
    ])?;
    let command = serde_json::from_str::<Vec<String>>(test.trim()).unwrap_or_default();
    if command.len() < 2 || !matches!(command[0].as_str(), "CMD" | "CMD-SHELL") {
        return Err("登录页面镜像缺少健康检查，请按自定义登录镜像模板添加 HEALTHCHECK".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_registry_tags_digests_and_default_selection() {
        for reference in [
            "",
            "my-login",
            "my-login:1.0",
            "localhost:5000/team/login:v2",
            "ghcr.io/team/login:1.0",
        ] {
            assert!(validate_image(reference).is_ok(), "{reference}");
        }
        assert!(validate_image(&format!("registry.test/login@sha256:{}", "a".repeat(64))).is_ok());
        for reference in [
            "https://registry.test/image",
            "--privileged",
            "a b",
            "a\nb",
            "repo/",
            "repo/:tag",
            "repo:bad;tag",
            "image@sha256:bad",
            "image@sha256:abc@other",
            "name:tag$()",
        ] {
            assert!(validate_image(reference).is_err(), "{reference}");
        }
        assert_eq!(
            image(&BTreeMap::new(), "0.2.0").unwrap(),
            "box-local-engine-player-auth-portal:0.2.0"
        );
        let owner = BTreeMap::from([(
            "BOX_AUTH_PORTAL_IMAGE".into(),
            "registry.test/login:1.0".into(),
        )]);
        assert_eq!(
            image(&owner, "0.2.0").unwrap(),
            image(&owner, "0.3.0").unwrap()
        );
    }

    #[test]
    fn only_uses_local_images_and_never_pulls_missing_or_wrong_platform_images() {
        let values = BTreeMap::from([(
            "BOX_AUTH_PORTAL_IMAGE".into(),
            "registry.test/login:1.0".into(),
        )]);
        let mut calls = vec![];
        let missing = prepare_custom_image(
            &values,
            "linux/arm64",
            |args| {
                calls.push(args.iter().map(|arg| arg.to_string()).collect::<Vec<_>>());
                Err("missing".into())
            },
            |_, _, _| panic!("local image validation must not start a download"),
        )
        .unwrap_err();
        assert!(missing.contains("无法读取本机登录页面镜像"));
        assert_eq!(calls.len(), 1);
        assert_eq!(calls[0][0..2], ["image", "inspect"]);
        let mut inspections = 0;
        prepare_custom_image(
            &values,
            "linux/arm64",
            |args| {
                inspections += 1;
                Ok(if args[3].contains("Healthcheck") {
                    "[\"CMD\",\"health\"]"
                } else {
                    "linux/arm64"
                }
                .into())
            },
            |_, _, _| {},
        )
        .unwrap();
        assert_eq!(inspections, 2);
        let mut mismatched_calls = 0;
        assert!(prepare_custom_image(
            &values,
            "linux/amd64",
            |args| {
                mismatched_calls += 1;
                assert_eq!(args[0..2], ["image", "inspect"]);
                Ok("linux/arm64".into())
            },
            |_, _, _| {}
        )
        .unwrap_err()
        .contains("需要支持 linux/amd64"));
        assert_eq!(mismatched_calls, 1);
        assert!(prepare_custom_image(
            &values,
            "linux/arm64",
            |args| {
                Ok(if args[3].contains("Healthcheck") {
                    ""
                } else {
                    "linux/arm64"
                }
                .into())
            },
            |_, _, _| {}
        )
        .unwrap_err()
        .contains("缺少健康检查"));
    }

    #[test]
    fn runtime_derives_custom_image_without_overwriting_the_owner_selection() {
        let values = BTreeMap::from([(
            "BOX_AUTH_PORTAL_IMAGE".into(),
            "registry.test/login:1.0".into(),
        )]);
        let runtime = crate::configuration::runtime_environment(
            &values,
            &crate::configuration::RuntimeInputs {
                lan_ip: None,
                image_tag: "0.3.0",
                platform: "linux/arm64",
                license_file: "fixture",
                license_device_file: "fixture-device",
                database_required: false,
                web_manager: false,
            },
        )
        .unwrap();
        assert_eq!(runtime["BOX_AUTH_PORTAL_IMAGE"], "registry.test/login:1.0");
        assert_eq!(values["BOX_AUTH_PORTAL_IMAGE"], "registry.test/login:1.0");
        prepare_custom_image(
            &BTreeMap::new(),
            "linux/arm64",
            |_| panic!("default images are handled by the existing offline workflow"),
            |_, _, _| {},
        )
        .unwrap();
    }
}
