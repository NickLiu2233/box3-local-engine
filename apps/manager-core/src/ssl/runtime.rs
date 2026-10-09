use super::*;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    fs,
    path::Path,
};
type Docker<'a> = dyn FnMut(&[String]) -> Result<String, String> + 'a;

pub(super) fn call(docker: &mut Docker<'_>, args: &[&str]) -> Result<String, String> {
    docker(&args.iter().map(|s| s.to_string()).collect::<Vec<_>>())
}
pub(super) fn identity(root: &Path) -> String {
    if let Ok(owner) = fs::read_to_string(root.join("https/owner")) {
        if owner.len() == 16 && owner.bytes().all(|b| b.is_ascii_hexdigit()) {
            return owner;
        }
    }
    format!("{:x}", Sha256::digest(root.to_string_lossy().as_bytes()))[..16].to_string()
}
pub(super) fn name(root: &Path) -> String {
    format!("box-https-{}", identity(root))
}
pub(super) fn owned(root: &Path, docker: &mut Docker<'_>) -> Result<Option<bool>, String> {
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
pub(super) fn private(path: &Path, data: &str) -> Result<(), String> {
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
pub(super) fn replace(path: &Path, data: &str) -> Result<(), String> {
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
pub(super) fn saved(root: &Path) -> Result<Option<Saved>, String> {
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
    for service in SERVICES { derived.insert(service.3.trim_end_matches("_PORT").to_owned()+"_BASE_PATH", String::new()); }
    derived.insert("BOX_PUBLIC_SERVICE_PREFIXES_BY_ORIGIN".into(), "{}".into());
    let Some(settings) = super::plan::routing_settings(root)? else { return Ok(()); };
    let provider = fs::read_to_string(root.join("https/provider")).unwrap_or_else(|_|settings.mode.clone());
    if provider.trim()!=settings.mode {return Ok(());}
    let mut overrides = values.clone();
    let mut peers: BTreeMap<String,Vec<String>> = BTreeMap::new();
    for route in &settings.routes {
        let Some(service) = SERVICES.iter().find(|service|service.0==route.service) else {continue;};
        let mode = if matches!(route.service.as_str(),"creator"|"voxa") {"BOX_CREATOR_NETWORK_MODE"} else {"BOX_PLAY_NETWORK_MODE"};
        if values.get(mode).map(String::as_str)!=Some("public") {continue;}
        let key = service.3.trim_end_matches("_PORT");
        let port = route.port.unwrap_or(if route.secure {settings.https_port}else{80});
        let origin = format!("{}://{}{}",if route.secure {"https"}else{"http"},crate::configuration::origin_host(&route.domain)?,if port==if route.secure {443}else{80} {String::new()}else{format!(":{port}")});
        overrides.insert(format!("{key}_PUBLIC_URL_OVERRIDE"),format!("{origin}{}",route.path));
        derived.insert(format!("{key}_BASE_PATH"),route.path.clone());
        if !route.path.is_empty() { peers.entry(origin).or_default().push(route.path.clone()); }
    }
    crate::configuration_migration::apply_url_overrides(&overrides,derived)?;
    derived.insert("BOX_PUBLIC_SERVICE_PREFIXES_BY_ORIGIN".into(),serde_json::to_string(&peers).map_err(|error|error.to_string())?);
    Ok(())
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
                .unwrap_or_else(|| "managed".into())
        });
    let provider = if provider.trim() == "external" { "external" } else { "managed" };
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
pub(super) fn check_local_key(staging: &Path, certificate: &str, key: &str) -> Result<(), String> {
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
pub(super) fn mount(host_root: &Path) -> Result<String, String> {
    let value = host_root.join("https").to_string_lossy().to_string();
    if value.contains(',') || value.contains('\n') {
        return Err("数据目录不能包含逗号或换行".into());
    }
    Ok(format!("type=bind,src={value},dst=/etc/box-https,readonly"))
}
pub(super) fn check_cert(
    docker: &mut Docker<'_>,
    bind: &str,
    revision: &str,
    settings: &Settings,
    certificate_file: &str,
    staging: &Path,
    require_valid: bool,
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
    if require_valid { check(&["-noout", "-checkend", "0"]).map_err(|_| "证书已过期或无法读取".to_string())?;
    for route in &settings.routes {
        let output = check(&["-noout", if route.domain.parse::<std::net::IpAddr>().is_ok() {"-checkip"} else {"-checkhost"}, &route.domain])
            .map_err(|_| format!("证书未覆盖域名 {}", route.domain))?;
        if !output.contains("does match certificate") {
            return Err(format!("证书未覆盖域名 {}", route.domain));
        }
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
    if require_valid && parse("notBefore=")? > chrono::Utc::now() {
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
    input: Import,
    docker: &mut Docker<'_>,
    local_deploy: &mut dyn FnMut(&Path, &str) -> Result<Option<super::local::Transaction>, String>,
) -> Result<Value, String> {
    super::apply::execute(root,host_root,network,environment,input,docker,local_deploy,&mut |_|Ok(()),false)
}
pub fn apply_with_transition(root:&Path,host_root:&Path,network:&str,environment:&str,input:Import,docker:&mut Docker<'_>,transition:&mut dyn FnMut(bool)->Result<(),String>) -> Result<Value,String> {
    super::apply::execute(root,host_root,network,environment,input,docker,&mut super::local::deploy,transition,true)
}

pub fn delete_certificate(root: &Path, host_root: &Path, network: &str, environment: &str, service: &str, docker: &mut Docker<'_>) -> Result<Value, String> {
    if service != "shared" && !SERVICES.iter().any(|entry| entry.0 == service) { return Err("证书服务无效".into()); }
    let mut config = saved(root)?.ok_or("没有已保存的 SSL 证书")?;
    let metadata: Value = serde_json::from_str(&fs::read_to_string(root.join("https/settings.json")).map_err(|error| error.to_string())?).map_err(|error| error.to_string())?;
    if metadata.get("externalLocal").is_none() && config.settings.mode == "external" {
        config.external_local = fs::read_to_string(root.join("https/local-nginx.conf")).is_ok_and(|fragment| fragment.starts_with("# BOX3 managed local HTTPS\n"));
    }
    let targets: Vec<String> = if service == "shared" {
        SERVICES.iter().filter(|entry| config.certificate_sources.get(entry.0).is_some_and(|source|source=="shared") || (config.certificate_sources.is_empty() && config.settings.routes.iter().any(|route|route.service==entry.0 && route.secure))).map(|entry|entry.0.to_string()).collect()
    } else {vec![service.into()]};
    if targets.is_empty() || !targets.iter().any(|service|config.certificate_sources.contains_key(service) || config.settings.routes.iter().any(|route|route.service==*service && route.secure)) {return Err("没有对应的已保存 SSL 证书".into());}
    config.settings.routes.retain(|route| !route.secure || !targets.contains(&route.service));
    let result = apply_with_transition(root, host_root, network, environment, Import {settings:config.settings, external_local:config.external_local, certificate:String::new(), private_key:String::new(), certificates:Default::default(),delete_services:targets.clone()}, docker, &mut |_|Ok(()))?;
    if result["config"]["settings"]["routes"].as_array().is_some_and(|routes|routes.is_empty()) && result["config"]["certificateSources"].as_object().is_some_and(|sources|sources.is_empty()) {
        fs::remove_file(root.join("https/settings.json")).map_err(|error|error.to_string())?;
    }
    let directory = root.join("https/revisions");
    if directory.exists() {
        for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
            let entry = entry.map_err(|error| error.to_string())?;
            if !entry.file_type().map_err(|error| error.to_string())?.is_dir() { continue; }
            let mut filenames=vec!["cert.pem".to_string(),"key.pem".to_string()];
            for service in &targets {filenames.extend([format!("{service}-cert.pem"),format!("{service}-key.pem")]);}
            for filename in filenames {
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
