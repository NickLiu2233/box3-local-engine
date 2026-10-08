use super::*;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::Path,
    time::{SystemTime, UNIX_EPOCH},
};
type Docker<'a> = dyn FnMut(&[String]) -> Result<String, String> + 'a;

fn call(docker: &mut Docker<'_>, args: &[&str]) -> Result<String, String> {
    docker(&args.iter().map(|s| s.to_string()).collect::<Vec<_>>())
}
fn identity(root: &Path) -> String {
    if let Ok(owner) = fs::read_to_string(root.join("https/owner")) {
        if owner.len() == 16 && owner.bytes().all(|b| b.is_ascii_hexdigit()) {
            return owner;
        }
    }
    format!("{:x}", Sha256::digest(root.to_string_lossy().as_bytes()))[..16].to_string()
}
fn name(root: &Path) -> String {
    format!("box-https-{}", identity(root))
}
fn owned(root: &Path, docker: &mut Docker<'_>) -> Result<Option<bool>, String> {
    // `container ls` distinguishes a missing container from an unavailable daemon.
    let id = call(
        docker,
        &[
            "container",
            "ls",
            "-a",
            "--filter",
            &format!("name=^/{}$", name(root)),
            "--format",
            "{{.ID}}",
        ],
    )?;
    if id.trim().is_empty() {
        return Ok(None);
    }
    let owner = call(
        docker,
        &[
            "inspect",
            "--format",
            "{{index .Config.Labels \"box.https.owner\"}}",
            &name(root),
        ],
    )?;
    if owner.trim() != identity(root) {
        return Err("HTTPS 容器名称已被其他程序使用，未修改该容器".into());
    }
    Ok(Some(
        call(
            docker,
            &["inspect", "--format", "{{.State.Running}}", &name(root)],
        )?
        .trim()
            == "true",
    ))
}
fn private(path: &Path, data: &str) -> Result<(), String> {
    use std::io::Write;
    let mut options = fs::OpenOptions::new();
    options.write(true).create_new(true);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt;
        options.mode(0o600);
    }
    let mut file = options.open(path).map_err(|e| e.to_string())?;
    file.write_all(data.as_bytes()).map_err(|e| e.to_string())
}
fn replace(path: &Path, data: &str) -> Result<(), String> {
    let temporary = path.with_extension("pending");
    if temporary.exists() {
        fs::remove_file(&temporary).map_err(|e| e.to_string())?;
    }
    private(&temporary, data)?;
    // Windows cannot rename over an existing file; retain a rollback copy.
    let backup = path.with_extension("previous");
    if backup.exists() {
        fs::remove_file(&backup).map_err(|e| e.to_string())?;
    }
    if path.exists() {
        fs::rename(path, &backup).map_err(|e| e.to_string())?;
    }
    if let Err(e) = fs::rename(&temporary, path) {
        if backup.exists() {
            let _ = fs::rename(&backup, path);
        }
        return Err(e.to_string());
    }
    Ok(())
}
fn saved(root: &Path) -> Result<Option<Saved>, String> {
    let path = root.join("https/settings.json");
    if !path.exists() {
        return Ok(None);
    }
    serde_json::from_str(&fs::read_to_string(path).map_err(|e| e.to_string())?)
        .map(Some)
        .map_err(|e| e.to_string())
}
pub fn install_image(docker: &mut Docker<'_>) -> Result<(), String> {
    if call(docker, &["image", "inspect", IMAGE]).is_err() {
        call(docker, &["pull", IMAGE])?;
    }
    Ok(())
}
/// Keep generated application links and CORS origins aligned with saved managed HTTPS listeners.
/// Engine host ports remain HTTP upstream ports and must never be replaced by TLS ports.
pub fn apply_runtime_urls(
    root: &Path,
    values: &BTreeMap<String, String>,
    derived: &mut BTreeMap<String, String>,
) -> Result<(), String> {
    let Some(config) = saved(root)? else { return Ok(()); };
    let provider = fs::read_to_string(root.join("https/provider")).unwrap_or_else(|_| config.settings.mode.clone());
    if provider.trim() != "managed" || config.settings.mode != "managed" { return Ok(()); }
    let mut overrides = values.clone();
    for route in &config.settings.routes {
        let Some(service) = SERVICES.iter().find(|service| service.0 == route.service) else { continue; };
        let mode = if matches!(route.service.as_str(), "creator" | "voxa") { "BOX_CREATOR_NETWORK_MODE" } else { "BOX_PLAY_NETWORK_MODE" };
        if values.get(mode).map(String::as_str) != Some("public") { continue; }
        let key = service.3.trim_end_matches("_PORT").to_owned() + "_PUBLIC_URL";
        let host = derived.get(&key).and_then(|url| url.strip_prefix("https://")).and_then(|authority| authority.split([':', '/']).next());
        if host != Some(route.domain.as_str()) { continue; }
        let port = route.port.unwrap_or(config.settings.https_port);
        let endpoint = if port == 443 { format!("https://{}", route.domain) } else { format!("https://{}:{port}", route.domain) };
        overrides.insert(format!("{key}_OVERRIDE"), endpoint);
    }
    crate::configuration_migration::apply_url_overrides(&overrides, derived)
}
pub fn set_provider(root: &Path, mode: &str) -> Result<(), String> {
    if !matches!(mode, "managed" | "external" | "disabled") {
        return Err("Nginx 来源无效".into());
    }
    fs::create_dir_all(root.join("https")).map_err(|e| e.to_string())?;
    replace(&root.join("https/provider"), mode)
}
pub fn status(root: &Path, docker: &mut Docker<'_>) -> Result<Value, String> {
    let config = saved(root)?;
    let days = config
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s.expires_at).ok())
        .map(|expiry| (expiry.with_timezone(&chrono::Utc) - chrono::Utc::now()).num_days());
    let running = owned(root, docker).unwrap_or(None).unwrap_or(false);
    let provider = fs::read_to_string(root.join("https/provider"))
        .ok()
        .unwrap_or_else(|| {
            config
                .as_ref()
                .map(|c| c.settings.mode.clone())
                .unwrap_or_else(|| "external".into())
        });
    let provider = if provider.trim() == "managed" { "managed" } else { "external" };
    let image = call(docker, &["image", "inspect", IMAGE]);
    let image_available = image.is_ok();
    let metadata = if running { call(docker, &["inspect", &name(root)]).ok() } else { image.ok() };
    let image_version = metadata
        .and_then(|text| serde_json::from_str::<Value>(&text).ok())
        .and_then(|value| value[0]["Config"]["Env"].as_array().cloned())
        .and_then(|env| env.iter().filter_map(Value::as_str).find_map(|entry| entry.strip_prefix("NGINX_VERSION=").map(str::to_owned)));
    Ok(
        json!({"config":config,"running":running,"daysRemaining":days,"provider":provider,"imageAvailable":image_available,"imageVersion":image_version,"externalNginx":super::local::status()}),
    )
}
pub(super) fn openssl_command() -> std::process::Command {
    #[cfg(target_os = "macos")]
    for path in [
        "/opt/homebrew/opt/openssl@3/bin/openssl",
        "/usr/local/opt/openssl@3/bin/openssl",
    ] {
        if Path::new(path).is_file() {
            return std::process::Command::new(path);
        }
    }
    std::process::Command::new("openssl")
}
fn check_local_key(staging: &Path, certificate: &str, key: &str) -> Result<(), String> {
    let public = |args: &[&str], file: &str| -> Result<Vec<u8>, String> {
        let output = openssl_command()
            .args(args)
            .arg(staging.join(file))
            .output()
            .map_err(|e| e.to_string())?;
        if !output.status.success() {
            return Err("证书或私钥无法读取".into());
        }
        Ok(output.stdout)
    };
    if public(&["x509", "-pubkey", "-noout", "-in"], certificate)?
        != public(&["pkey", "-pubout", "-in"], key)?
    {
        return Err("证书与私钥不匹配".into());
    }
    Ok(())
}
fn mount(host_root: &Path) -> Result<String, String> {
    let value = host_root.join("https").to_string_lossy().to_string();
    if value.contains(',') || value.contains('\n') {
        return Err("数据目录不能包含逗号或换行".into());
    }
    Ok(format!("type=bind,src={value},dst=/etc/box-https,readonly"))
}
fn check_cert(
    docker: &mut Docker<'_>,
    bind: &str,
    revision: &str,
    settings: &Settings,
    certificate_file: &str,
    staging: &Path,
) -> Result<String, String> {
    let cert = format!("/etc/box-https/revisions/{revision}/{certificate_file}");
    let mut check = |args: &[&str]| {
        if settings.mode == "external" {
            let output = openssl_command()
                .args(["x509", "-in"])
                .arg(staging.join(certificate_file))
                .args(args)
                .output()
                .map_err(|_| {
                    "外部 Nginx 模式需在管理端安装支持 -checkhost 的 OpenSSL".to_string()
                })?;
            if !output.status.success() {
                return Err("OpenSSL 证书校验失败".into());
            }
            return Ok(String::from_utf8_lossy(&output.stdout).into());
        }
        let mut command = vec![
            "run",
            "--rm",
            "--network",
            "none",
            "--mount",
            bind,
            IMAGE,
            "openssl",
            "x509",
            "-in",
            &cert,
        ];
        command.extend(args);
        call(docker, &command)
    };
    check(&["-noout", "-checkend", "0"]).map_err(|_| "证书已过期或无法读取".to_string())?;
    for route in &settings.routes {
        let output = check(&["-noout", "-checkhost", &route.domain])
            .map_err(|_| format!("证书未覆盖域名 {}", route.domain))?;
        if !output.contains("does match certificate") {
            return Err(format!("证书未覆盖域名 {}", route.domain));
        }
    }
    let dates = check(&["-noout", "-startdate", "-enddate"])?;
    let parse = |prefix: &str| -> Result<chrono::DateTime<chrono::Utc>, String> {
        let value = dates
            .lines()
            .find_map(|l| l.strip_prefix(prefix))
            .ok_or("无法读取证书有效期")?;
        let date = chrono::NaiveDateTime::parse_from_str(value.trim(), "%b %e %H:%M:%S %Y GMT")
            .map_err(|_| "证书有效期格式无效")?;
        Ok(date.and_utc())
    };
    if parse("notBefore=")? > chrono::Utc::now() {
        return Err("证书尚未生效".into());
    }
    Ok(parse("notAfter=")?.to_rfc3339())
}
pub fn apply(
    root: &Path,
    host_root: &Path,
    network: &str,
    environment: &str,
    input: Import,
    docker: &mut Docker<'_>,
) -> Result<Value, String> {
    apply_with_local(root, host_root, network, environment, input, docker, &mut super::local::deploy)
}

pub(super) fn apply_with_local(
    root: &Path,
    host_root: &Path,
    network: &str,
    environment: &str,
    mut input: Import,
    docker: &mut Docker<'_>,
    local_deploy: &mut dyn FnMut(&Path, &str) -> Result<Option<super::local::Transaction>, String>,
) -> Result<Value, String> {
    validate(&mut input)?;
    let directory = root.join("https");
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?;
    }
    if !directory.join("owner").exists() {
        private(&directory.join("owner"), &identity(host_root))?;
    }
    let existing = if input.settings.mode == "external" {
        owned(root, docker).unwrap_or(None)
    } else {
        owned(root, docker)?
    };
    if input.settings.mode == "external" && existing.is_some() {
        return Err("请先停用托管 HTTPS 入口，再切换到已有 Nginx 模式".into());
    }
    let old = saved(root)?;
    let removing_routes = input.certificates.is_empty() && input.certificate.is_empty() && input.private_key.is_empty()
        && old.as_ref().is_some_and(|previous| previous.settings.mode == input.settings.mode
            && previous.settings.routes.len() > input.settings.routes.len()
            && input.settings.routes.iter().all(|route| previous.settings.routes.iter().any(|saved| saved.service == route.service && saved.domain == route.domain && saved.port == route.port)));
    if input.settings.mode == "managed" {
        let values = crate::environment::parse_env(environment);
        for route in &input.settings.routes {
            let port = route.port.unwrap_or(input.settings.https_port);
            if SERVICES.iter().any(|s| {
                values
                    .get(s.3)
                    .and_then(|v| v.parse::<u16>().ok())
                    .unwrap_or(s.4)
                    == port
            }) {
                return Err("Nginx 端口与引擎服务端口冲突；请填写独立 HTTPS 域名使用 443，或在外部 Nginx 配置独立入口端口".into());
            }
        }
    }
    let ports = |settings: &Settings| {
        settings
            .routes
            .iter()
            .map(|r| r.port.unwrap_or(settings.https_port))
            .collect::<std::collections::BTreeSet<_>>()
    };
    if existing.is_some()
        && old
            .as_ref()
            .is_some_and(|s| ports(&s.settings) != ports(&input.settings))
    {
        return Err("修改入口监听端口前请先停止 Nginx 入口".into());
    }
    if existing.is_some()
        && old.as_ref().map(|s| s.settings.https_port) != Some(input.settings.https_port)
    {
        return Err("修改 HTTPS 端口前请先停用入口".into());
    }
    let directory = root.join("https");
    fs::create_dir_all(directory.join("revisions")).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))
            .map_err(|e| e.to_string())?;
    }
    let revision = format!(
        "{}-{}",
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos(),
        std::process::id()
    );
    let staging = directory.join("revisions").join(&revision);
    fs::create_dir(&staging).map_err(|e| e.to_string())?;
    let active = directory.join("nginx.conf");
    let previous = fs::read_to_string(&active).ok();
    let mut changed = false;
    let mut local_transaction = None;
    let mut pending_local = false;
    let result: Result<Value, String> = (|| {
        let multiple = !input.certificates.is_empty() || input.certificate.is_empty();
        if input.settings.mode == "managed" {
            install_image(docker)?;
        }
        let bind = mount(host_root)?;
        let mut expiries = std::collections::BTreeMap::new();
        let mut sources = std::collections::BTreeMap::new();
        if multiple {
            for route in &input.settings.routes {
                let cert_name = format!("{}-cert.pem", route.service);
                let key_name = format!("{}-key.pem", route.service);
                let material = if let Some(cert) = input.certificates.get(&route.service) {
                    cert.clone()
                } else {
                    let old = old.as_ref().ok_or("请为每个 HTTPS 地址选择证书和私钥")?;
                    let previous = directory.join("revisions").join(&old.revision);
                    let per_service = previous.join(&cert_name).exists();
                    Certificate {
                        source: old
                            .certificate_sources
                            .get(&route.service)
                            .cloned()
                            .unwrap_or_else(|| {
                                if per_service {
                                    "independent".into()
                                } else {
                                    "shared".into()
                                }
                            }),
                        certificate: fs::read_to_string(previous.join(if per_service {
                            cert_name.as_str()
                        } else {
                            "cert.pem"
                        }))
                        .map_err(|_| "缺少已保存证书")?,
                        private_key: fs::read_to_string(previous.join(if per_service {
                            key_name.as_str()
                        } else {
                            "key.pem"
                        }))
                        .map_err(|_| "缺少已保存私钥")?,
                    }
                };
                private(&staging.join(&cert_name), &material.certificate)?;
                private(&staging.join(&key_name), &material.private_key)?;
                let settings = Settings {
                    routes: vec![route.clone()],
                    ..input.settings.clone()
                };
                let expiry = if removing_routes {
                    let previous = old.as_ref().ok_or("缺少已保存的证书记录")?;
                    previous.certificate_expiries.get(&route.service).cloned().unwrap_or_else(|| previous.expires_at.clone())
                } else { check_cert(docker, &bind, &revision, &settings, &cert_name, &staging)? };
                if input.settings.mode == "external" {
                    check_local_key(&staging, &cert_name, &key_name)?;
                }
                sources.insert(route.service.clone(), material.source);
                expiries.insert(route.service.clone(), expiry);
            }
        } else {
            private(&staging.join("cert.pem"), &input.certificate)?;
            private(&staging.join("key.pem"), &input.private_key)?;
            let expiry = check_cert(
                docker,
                &bind,
                &revision,
                &input.settings,
                "cert.pem",
                &staging,
            )?;
            if input.settings.mode == "external" {
                check_local_key(&staging, "cert.pem", "key.pem")?;
            }
            for route in &input.settings.routes {
                sources.insert(route.service.clone(), "shared".into());
                expiries.insert(route.service.clone(), expiry.clone());
            }
        }
        let expiry = expiries.values().min().cloned().ok_or("未配置证书")?;
        let fragment = configuration_multiple(&input.settings, &revision, environment, multiple);
        let config = format!("events {{}}\nhttp {{\n{fragment}\n}}\n");
        private(&staging.join("nginx.conf"), &config)?;
        let candidate = format!("/etc/box-https/revisions/{revision}/nginx.conf");
        if input.settings.mode == "managed" {
            call(
                docker,
                &[
                    "run",
                    "--rm",
                    "--network",
                    "none",
                    "--mount",
                    &bind,
                    IMAGE,
                    "nginx",
                    "-t",
                    "-c",
                    &candidate,
                ],
            )
            .map_err(|e| format!("Nginx 配置或证书私钥校验失败：{e}"))?;
        }
        if input.settings.mode == "managed" {
            replace(&active, &config)?;
            changed = true;
            let activate = (|| {
                if existing.is_some() {
                    if existing == Some(false) {
                        call(docker, &["start", &name(root)])?;
                    }
                    call(
                        docker,
                        &[
                            "exec",
                            &name(root),
                            "nginx",
                            "-t",
                            "-c",
                            "/etc/box-https/nginx.conf",
                        ],
                    )?;
                    call(
                        docker,
                        &[
                            "exec",
                            &name(root),
                            "nginx",
                            "-s",
                            "reload",
                            "-c",
                            "/etc/box-https/nginx.conf",
                        ],
                    )?;
                } else {
                    let mut ports = Vec::<String>::new();
                    let mut seen = std::collections::BTreeSet::new();
                    for route in &input.settings.routes {
                        let internal = route.port.unwrap_or(443);
                        let public = route.port.unwrap_or(input.settings.https_port);
                        if seen.insert(public) {
                            ports.extend(["-p".into(), format!("{public}:{internal}")]);
                        }
                    }
                    let mut args = vec![
                        "run",
                        "-d",
                        "--name",
                        &name(root),
                        "--label",
                        &format!("box.https.owner={}", identity(root)),
                        "--restart",
                        "unless-stopped",
                        "--network",
                        network,
                        "--mount",
                        &bind,
                        IMAGE,
                        "nginx",
                        "-g",
                        "daemon off;",
                        "-c",
                        "/etc/box-https/nginx.conf",
                    ]
                    .into_iter()
                    .map(|value| value.to_string())
                    .collect::<Vec<_>>();
                    args.extend(ports);
                    // Publish options must precede the image.
                    let image_index = args.iter().position(|value| value == IMAGE).unwrap();
                    let port_args = args.split_off(args.len() - seen.len() * 2);
                    args.splice(image_index..image_index, port_args);
                    docker(&args)?;
                    call(
                        docker,
                        &[
                            "exec",
                            &name(root),
                            "nginx",
                            "-t",
                            "-c",
                            "/etc/box-https/nginx.conf",
                        ],
                    )?;
                }
                Ok::<(), String>(())
            })();
            activate?;
        }
        if input.settings.mode == "external" && input.external_local {
            if root != host_root {
                return Err("本机 Nginx 自动更新需要管理端直接运行在 Nginx 所在机器，容器内管理端无法访问宿主机配置".into());
            }
            let local_fragment = super::local::configuration(&fragment, host_root, &identity(root))?;
            local_transaction = local_deploy(root, &local_fragment)?;
            pending_local = local_transaction.is_none();
        }
        let saved = Saved {
            settings: input.settings.clone(),
            external_local: input.external_local,
            pending_local,
            expires_at: expiry,
            revision: revision.clone(),
            certificate_expiries: expiries,
            certificate_sources: sources,
            external_config: configuration_multiple(
                &Settings {
                    mode: "external".into(),
                    ..input.settings.clone()
                },
                &revision,
                environment,
                multiple,
            ),
        };
        replace(
            &directory.join("settings.json"),
            &serde_json::to_string_pretty(&saved).map_err(|e| e.to_string())?,
        )?;
        Ok(
            json!({"config":saved,"running":existing.is_some() || input_mode_managed(&saved),"externalLocalApplied":local_transaction.is_some(),"sslWarning":if pending_local { "地址和证书已保存；需要安装并启动本机 Nginx 才能启用 SSL，安装后再次点击保存配置即可应用。" } else { "" },"daysRemaining":null}),
        )
    })();
    match result {
        Ok(value) => Ok(value),
        Err(error) => {
            let rollback = if let Some(transaction) = &local_transaction {
                transaction.rollback()
            } else if error.contains("回退失败") {
                Err(error.clone())
            } else if changed {
                if let Some(previous) = previous {
                    replace(&active, &previous).and_then(|_| {
                        call(
                            docker,
                            &[
                                "exec",
                                &name(root),
                                "nginx",
                                "-s",
                                "reload",
                                "-c",
                                "/etc/box-https/nginx.conf",
                            ],
                        )
                        .map(|_| ())
                    })
                } else {
                    let _ = fs::remove_file(&active);
                    match owned(root, docker) {
                        Ok(Some(_)) => call(docker, &["rm", "-f", &name(root)]).map(|_| ()),
                        Ok(None) => Ok(()),
                        Err(e) => Err(e),
                    }
                }
            } else {
                Ok(())
            };
            // Retain the new revision if rollback failed: a live process may still need it.
            if rollback.is_ok() {
                let _ = fs::remove_dir_all(&staging);
            }
            Err(format!(
                "{error}；{}",
                if rollback.is_ok() {
                    "原配置已保留或恢复"
                } else {
                    "回退失败，请检查 HTTPS 入口"
                }
            ))
        }
    }
}
fn input_mode_managed(saved: &Saved) -> bool {
    saved.settings.mode == "managed"
}
pub fn delete_certificate(root: &Path, host_root: &Path, network: &str, environment: &str, service: &str, docker: &mut Docker<'_>) -> Result<Value, String> {
    if !SERVICES.iter().any(|entry| entry.0 == service) { return Err("证书服务无效".into()); }
    let mut config = saved(root)?.ok_or("没有已保存的 SSL 证书")?;
    let metadata: Value = serde_json::from_str(&fs::read_to_string(root.join("https/settings.json")).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    if metadata.get("externalLocal").is_none() && config.settings.mode == "external" {
        config.external_local = fs::read_to_string(root.join("https/local-nginx.conf")).is_ok_and(|fragment| fragment.starts_with("# BOX3 managed local HTTPS\n"));
    }
    let count = config.settings.routes.len();
    config.settings.routes.retain(|route| route.service != service);
    if config.settings.routes.len() == count { return Err("该服务没有已保存的 SSL 证书".into()); }
    if config.settings.routes.is_empty() {
        if config.settings.mode == "managed" { stop(root, docker)?; }
        else if config.external_local && !config.pending_local {
            let transaction = super::local::deploy(root, "")?.ok_or("未找到本机 Nginx，无法停用现有 HTTPS 入口，证书尚未删除")?;
            if let Err(error) = fs::remove_file(root.join("https/settings.json")) {
                let rollback = transaction.rollback();
                return Err(format!("无法删除证书记录：{error}；回退结果：{rollback:?}"));
            }
        }
        if root.join("https/settings.json").exists() { fs::remove_file(root.join("https/settings.json")).map_err(|error| error.to_string())?; }
    } else {
        apply(root, host_root, network, environment, Import {settings:config.settings, external_local:config.external_local, certificate:String::new(), private_key:String::new(), certificates:Default::default()}, docker)?;
    }
    let directory = root.join("https/revisions");
    if directory.exists() {
        for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            if !entry.file_type().map_err(|error| error.to_string())?.is_dir() { continue; }
            for filename in [format!("{service}-cert.pem"),format!("{service}-key.pem"),"cert.pem".into(),"key.pem".into()] {
                let file = entry.path().join(filename);
                if file.exists() { fs::remove_file(file).map_err(|error| format!("HTTPS 路由已停用，但证书文件清理失败：{error}"))?; }
            }
        }
    }
    let backup = root.join("https/settings.previous");
    if backup.exists() { fs::remove_file(backup).map_err(|error| error.to_string())?; }
    status(root, docker)
}
pub fn stop(root: &Path, docker: &mut Docker<'_>) -> Result<Value, String> {
    if owned(root, docker)?.is_some() {
        call(docker, &["rm", "-f", &name(root)])?;
    }
    status(root, docker)
}
pub fn verify_endpoint(root: &Path, docker: &mut Docker<'_>) -> Result<Value, String> {
    let saved = saved(root)?.ok_or("请先导入并校验证书")?;
    let mut checks = Vec::new();
    for route in saved.settings.routes {
        let target = format!(
            "{}:{}",
            route.domain,
            route.port.unwrap_or(saved.settings.https_port)
        );
        let result = call(
            docker,
            &[
                "run",
                "--rm",
                "-i",
                IMAGE,
                "timeout",
                "10",
                "openssl",
                "s_client",
                "-connect",
                &target,
                "-servername",
                &route.domain,
                "-verify_hostname",
                &route.domain,
                "-verify_return_error",
                "-brief",
            ],
        );
        checks.push(json!({"domain":route.domain,"ok":result.is_ok(),"message":if result.is_ok() { "公网 TLS 证书链与域名验证通过".to_string() } else { "公网 TLS 验证失败，请检查 DNS、端口、证书链及信任根".to_string() }}));
    }
    Ok(json!({"checks":checks}))
}
