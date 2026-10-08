//! Certificate import and Nginx configuration shared by both manager transports.
mod runtime;
mod local;
pub use runtime::{apply, install_image, set_provider, status, stop, verify_endpoint};
pub use runtime::apply_runtime_urls;
pub use runtime::delete_certificate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

pub const IMAGE: &str = "docker.m.daocloud.io/library/nginx:stable-bookworm";
pub const SERVICES: [(&str, &str, u16, &str, u16); 6] = [
    ("play", "play", 3000, "BOX_PLAY_PORT", 3121),
    ("creator", "creator", 3000, "BOX_CREATOR_PORT", 3127),
    ("voxa", "voxa", 3001, "BOX_VOXA_PORT", 3123),
    (
        "player-service",
        "player-service",
        3213,
        "BOX_PLAYER_SERVICE_PORT",
        3124,
    ),
    (
        "player-auth-portal",
        "player-auth-portal",
        3214,
        "BOX_AUTH_PORTAL_PORT",
        3125,
    ),
    (
        "server-manager",
        "server-manager",
        3130,
        "BOX_SERVER_MANAGER_PORT",
        3130,
    ),
];

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Route {
    pub service: String,
    pub domain: String,
    #[serde(default)]
    pub port: Option<u16>,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub mode: String,
    pub https_port: u16,
    pub routes: Vec<Route>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Import {
    pub settings: Settings,
    #[serde(default)]
    pub external_local: bool,
    #[serde(default)]
    pub certificate: String,
    #[serde(default)]
    pub private_key: String,
    #[serde(default)]
    pub certificates: BTreeMap<String, Certificate>,
}

fn independent_certificate() -> String {
    "independent".into()
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Certificate {
    #[serde(default = "independent_certificate")]
    pub source: String,
    pub certificate: String,
    pub private_key: String,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved {
    pub settings: Settings,
    #[serde(default)]
    pub external_local: bool,
    #[serde(default)]
    pub pending_local: bool,
    pub expires_at: String,
    pub revision: String,
    pub external_config: String,
    #[serde(default)]
    pub certificate_sources: BTreeMap<String, String>,
    #[serde(default)]
    pub certificate_expiries: BTreeMap<String, String>,
}

pub fn domain(value: &str) -> Result<String, String> {
    let value = value.trim().to_ascii_lowercase();
    if value.len() > 253
        || !value.contains('.')
        || value.parse::<std::net::IpAddr>().is_ok()
        || value.split('.').any(|p| {
            p.is_empty()
                || p.len() > 63
                || p.starts_with('-')
                || p.ends_with('-')
                || !p.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
        })
    {
        return Err("请填写证书覆盖的域名，不包含协议、端口、通配符或路径".into());
    }
    Ok(value)
}

pub fn validate(input: &mut Import) -> Result<(), String> {
    if !matches!(input.settings.mode.as_str(), "managed" | "external")
        || input.settings.https_port == 0
    {
        return Err("HTTPS 模式或端口无效".into());
    }
    if input.settings.routes.is_empty() || input.settings.routes.len() > SERVICES.len() {
        return Err("请至少为一个服务配置 HTTPS 域名".into());
    }
    let mut domains = BTreeSet::new();
    let mut services = BTreeSet::new();
    for route in &mut input.settings.routes {
        route.domain = domain(&route.domain)?;
        if route.port == Some(0)
            || !SERVICES.iter().any(|s| s.0 == route.service)
            || !services.insert(route.service.clone())
            || !domains.insert((
                route.domain.clone(),
                route.port.unwrap_or(input.settings.https_port),
            ))
        {
            return Err("每个服务与域名只能配置一次；不同服务请使用独立域名".into());
        }
    }
    if input.certificates.len() > SERVICES.len()
        || input.certificates.keys().any(|key| !services.contains(key))
    {
        return Err("证书服务配置无效".into());
    }
    if !input.certificate.is_empty() || !input.private_key.is_empty() {
        validate_pem(&input.certificate, &input.private_key)?;
    }
    for cert in input.certificates.values() {
        if !matches!(cert.source.as_str(), "shared" | "independent") {
            return Err("证书来源无效".into());
        }
        validate_pem(&cert.certificate, &cert.private_key)?;
    }

    Ok(())
}

fn validate_pem(certificate: &str, private_key: &str) -> Result<(), String> {
    if certificate.len() > 256 * 1024
        || private_key.len() > 64 * 1024
        || !certificate.starts_with("-----BEGIN CERTIFICATE-----")
        || !(private_key.starts_with("-----BEGIN PRIVATE KEY-----")
            || private_key.starts_with("-----BEGIN RSA PRIVATE KEY-----")
            || private_key.starts_with("-----BEGIN EC PRIVATE KEY-----"))
    {
        return Err(
            "请导入 PEM 格式完整证书链和未加密私钥，证书不超过 256 KB、私钥不超过 64 KB".into(),
        );
    }
    Ok(())
}

/// A conf.d fragment for an existing Nginx; managed mode wraps it in http {}.
pub fn configuration(settings: &Settings, revision: &str, environment: &str) -> String {
    configuration_multiple(settings, revision, environment, false)
}

fn configuration_multiple(
    settings: &Settings,
    revision: &str,
    environment: &str,
    multiple: bool,
) -> String {
    let values = crate::environment::parse_env(environment);
    let mut config =
        "map $http_upgrade $box_ssl_connection { default upgrade; '' close; }\n".to_string();
    for route in &settings.routes {
        let service = SERVICES.iter().find(|s| s.0 == route.service).unwrap();
        let upstream = if settings.mode == "managed" {
            format!("{}:{}", service.1, service.2)
        } else {
            format!(
                "127.0.0.1:{}",
                values
                    .get(service.3)
                    .and_then(|s| s.parse::<u16>().ok())
                    .unwrap_or(service.4)
            )
        };
        let certificate_file = if multiple {
            format!("{}-cert.pem", route.service)
        } else {
            "cert.pem".into()
        };
        let key_file = if multiple {
            format!("{}-key.pem", route.service)
        } else {
            "key.pem".into()
        };
        config.push_str(&format!("server {{\n listen {} ssl;\n server_name {};\n ssl_certificate /etc/box-https/revisions/{revision}/{certificate_file};\n ssl_certificate_key /etc/box-https/revisions/{revision}/{key_file};\n ssl_protocols TLSv1.2 TLSv1.3;\n client_max_body_size 256m;\n location / {{\n  resolver 127.0.0.11 valid=30s ipv6=off;\n  set $box_upstream http://{upstream};\n  proxy_pass $box_upstream;\n  proxy_http_version 1.1;\n  proxy_set_header Host $http_host;\n  proxy_set_header X-Forwarded-Proto https;\n  proxy_set_header X-Forwarded-Host $http_host;\n  proxy_set_header X-Forwarded-For $remote_addr;\n  proxy_set_header Upgrade $http_upgrade;\n  proxy_set_header Connection $box_ssl_connection;\n  proxy_read_timeout 3600s;\n }}\n}}\n", route.port.unwrap_or(if settings.mode == "managed" { 443 } else { settings.https_port }), route.domain));
    }
    config
}

#[cfg(test)]
mod integration;
#[cfg(test)]
mod tests;
