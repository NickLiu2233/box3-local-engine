use super::*;

#[test]
fn nginx_defaults_to_managed_and_preserves_explicit_external_selection() {
    let root = fixture_root();
    let mut docker = |args: &[String]| -> Result<String, String> {
        if args.starts_with(&["image".into(), "inspect".into()]) {
            assert_eq!(args[2], IMAGE);
            return Ok(r#"[{"Config":{"Env":["NGINX_VERSION=1.30.2"]}}]"#.into());
        }
        Ok(String::new())
    };
    let result = status(&root, &mut docker).unwrap();
    assert_eq!(result["provider"], "managed");
    assert_eq!(result["imageVersion"], "1.30.2");
    set_provider(&root, "disabled").unwrap();
    assert_eq!(status(&root, &mut docker).unwrap()["provider"], "managed");
    set_provider(&root, "external").unwrap();
    assert_eq!(status(&root, &mut docker).unwrap()["provider"], "external");
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn draft_routing_uses_the_same_provider_default_as_status() {
    let root = fixture_root();
    std::fs::write(root.join(".env"), "BOX_PLAY_NETWORK_MODE=public\nBOX_PLAY_PUBLIC_ADDRESS_OVERRIDE=http://play.example.test:3121\n").unwrap();
    let source = "services:\n  play:\n    ports:\n      - \"3121:3000\"\n    environment:\n      ROLE: play\n";
    for mode in [None, Some("disabled"), Some("external")] {
        if let Some(mode) = mode { set_provider(&root, mode).unwrap(); }
        let mut docker = |_: &[String]| Ok(String::new());
        let selected = status(&root, &mut docker).unwrap();
        let composed = compose_source(&root, source).unwrap();
        if selected["provider"] == "managed" {
            assert!(!composed.contains("ports:"));
        } else {
            assert!(composed.contains("127.0.0.1:13121:3000"));
        }
        assert!(composed.contains("ROLE: play"));
    }
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn missing_nginx_image_downloads_the_same_registry_mirror_as_redis() {
    let mut calls = Vec::new();
    install_image(&mut |args: &[String]| {
        calls.push(args.to_vec());
        if args[0] == "image" { Err("not found".into()) } else { Ok(String::new()) }
    }).unwrap();
    assert_eq!(calls[1], vec!["pull", IMAGE]);
}
fn input() -> Import {
    Import {
        delete_services: Vec::new(),
        external_local: false,
        settings: Settings {upstream_ports:Default::default(),
            mode: "managed".into(),
            https_port: 443,
            routes: vec![Route {path:String::new(),secure:true,
                service: "play".into(),
                domain: "play.example.com".into(),
                port: None,
            }],
        },
        certificate: "-----BEGIN CERTIFICATE-----\nfixture".into(),
        private_key: "-----BEGIN PRIVATE KEY-----\nfixture".into(),
        certificates: Default::default(),
    }
}
#[test]
fn refuses_configuration_injection_and_duplicate_hosts() {
    for host in [
        "x.example.com;return 200",
        "x.example.com\n}",
        "*.example.com",
        "http://x.example.com",
    ] {
        assert!(domain(host).is_err());
    }
    let mut draft = input();
    draft.settings.routes.push(Route {path:String::new(),secure:true,
        service: "creator".into(),
        domain: "play.example.com".into(),
        port: None,
    });
    assert!(validate(&mut draft).is_err());
    assert_eq!(domain("PLAY.Example.com").unwrap(), "play.example.com");
}
#[test]
fn nginx_preserves_websocket_and_original_http_host() {
    let config = configuration(&input().settings, "revision", "");
    for expected in [
        "proxy_http_version 1.1",
        "Upgrade $http_upgrade",
        "Connection $box_ssl_connection",
        "Host $http_host",
        "X-Forwarded-Proto https",
        "http://play:3000",
    ] {
        assert!(config.contains(expected));
    }
    let mut settings = input().settings;
    settings.mode = "external".into();
    settings.https_port = 8443;
    let config = configuration(&settings, "revision", "BOX_PLAY_PORT=4121\n");
    assert!(config.contains("127.0.0.1:4121"));
    assert!(config.contains("listen 8443 ssl"));
}

fn fixture_root() -> std::path::PathBuf {
    let root = std::env::temp_dir().join(format!(
        "box-ssl-test-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    std::fs::create_dir_all(&root).unwrap();
    root
}
#[test]
fn mismatched_domain_never_activates_or_persists_the_private_key() {
    let root = fixture_root();
    let mut calls = Vec::new();
    let mut docker = |args: &[String]| {
        calls.push(args.join(" "));
        Ok(if args.contains(&"-checkhost".into()) {
            "Hostname play.example.com does NOT match certificate".into()
        } else {
            String::new()
        })
    };
    assert!(apply(&root, &root, "fixture", "", input(), &mut docker).is_err());
    assert!(!root.join("https/nginx.conf").exists());
    assert!(!root.join("https/settings.json").exists());
    assert!(!calls.iter().any(|s| s.contains(" run -d ")));
    assert_eq!(
        std::fs::read_dir(root.join("https/revisions"))
            .unwrap()
            .count(),
        0
    );
    std::fs::remove_dir_all(root).unwrap();
}
#[test]
fn failed_reload_restores_previous_config_and_keeps_old_metadata() {
    use sha2::{Digest, Sha256};
    use std::fs;
    let root = fixture_root();
    fs::create_dir(root.join("https")).unwrap();
    fs::write(root.join("https/nginx.conf"), "old configuration").unwrap();
    let saved = Saved {
        settings: input().settings,
        pending_local: false,
        external_local: false,
        expires_at: "2099-01-01T00:00:00Z".into(),
        revision: "old".into(),
        external_config: "old".into(),
        certificate_expiries: Default::default(),
        certificate_sources: Default::default(),
    };
    let metadata = serde_json::to_string(&saved).unwrap();
    fs::write(root.join("https/settings.json"), &metadata).unwrap();
    let owner =
        format!("{:x}", Sha256::digest(root.to_string_lossy().as_bytes()))[..16].to_string();
    let mut reloads = 0;
    let mut docker = |args: &[String]| {
        if args.contains(&"container".into()) && args.contains(&"ls".into()) {
            return Ok("owned".into());
        }
        if args.iter().any(|s| s.contains("box.https.owner")) {
            return Ok(owner.clone());
        }
        if args.iter().any(|s| s.contains("State.Running")) {
            return Ok("true".into());
        }
        if args.contains(&"-checkhost".into()) {
            return Ok("Hostname play.example.com does match certificate".into());
        }
        if args.contains(&"-startdate".into()) {
            return Ok(
                "notBefore=Oct  1 00:00:00 2020 GMT\nnotAfter=Oct 10 00:00:00 2099 GMT".into(),
            );
        }
        if args.contains(&"reload".into()) {
            reloads += 1;
            if reloads == 1 {
                return Err("reload failed".into());
            }
        }
        Ok(String::new())
    };
    assert!(apply(&root, &root, "fixture", "", input(), &mut docker)
        .unwrap_err()
        .contains("原配置已保留或恢复"));
    assert_eq!(reloads, 2);
    assert_eq!(
        fs::read_to_string(root.join("https/nginx.conf")).unwrap(),
        "old configuration"
    );
    assert_eq!(
        fs::read_to_string(root.join("https/settings.json")).unwrap(),
        metadata
    );
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn per_service_certificates_use_distinct_files_and_support_same_host_on_distinct_ports() {
    let mut input = input();
    input.settings.routes[0].port = Some(8443);
    input.settings.routes.push(Route {path:String::new(),secure:true,
        service: "creator".into(),
        domain: "play.example.com".into(),
        port: Some(9443),
    });
    validate(&mut input).unwrap();
    let config = configuration_multiple(&input.settings, "candidate", "", true);
    assert!(config.contains("play-cert.pem"));
    assert!(config.contains("creator-key.pem"));
    assert!(config.contains("listen 8443 ssl"));
    assert!(config.contains("listen 9443 ssl"));
}

#[test]
fn external_import_uses_openssl_and_preserves_saved_keys_without_nginx_image() {
    use std::fs;
    let root = fixture_root();
    for host in ["play", "creator"] {
        let result = runtime::openssl_command()
            .args([
                "req",
                "-x509",
                "-newkey",
                "rsa:2048",
                "-nodes",
                "-days",
                "2",
                "-subj",
                &format!("/CN={host}.example.com"),
                "-addext",
                &format!("subjectAltName=DNS:{host}.example.com"),
                "-keyout",
            ])
            .arg(root.join(format!("{host}.key")))
            .arg("-out")
            .arg(root.join(format!("{host}.pem")))
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
    }
    let mut input = input();
    input.settings.mode = "external".into();
    input.settings.routes.push(Route {path:String::new(),secure:true,
        service: "creator".into(),
        domain: "creator.example.com".into(),
        port: Some(8443),
    });
    input.certificate.clear();
    input.private_key.clear();
    for service in ["play", "creator"] {
        input.certificates.insert(
            service.into(),
            Certificate {
                source: "independent".into(),
                certificate: fs::read_to_string(root.join(format!("{service}.pem"))).unwrap(),
                private_key: fs::read_to_string(root.join(format!("{service}.key"))).unwrap(),
            },
        );
    }
    let mut unavailable = |_: &[String]| Err("Docker unavailable".into());
    let settings = input.settings.clone();
    let value = apply(&root, &root, "unused", "", input, &mut unavailable).unwrap();
    assert!(value["config"]["certificateExpiries"]["creator"].is_string());
    assert!(!fs::read_to_string(root.join("https/settings.json"))
        .unwrap()
        .contains("PRIVATE KEY"));
    let deferred = runtime::apply_with_local(
        &root, &root, "unused", "",
        Import {delete_services:Vec::new(), settings: settings.clone(), external_local: true, certificate: String::new(), private_key: String::new(), certificates: Default::default() },
        &mut unavailable, &mut |_, _| Ok(None),
    ).unwrap();
    assert_eq!(deferred["config"]["pendingLocal"], true);
    assert_eq!(deferred["externalLocalApplied"], false);
    assert!(deferred["sslWarning"].as_str().unwrap().contains("需要安装"));
    let persisted: Saved = serde_json::from_str(&fs::read_to_string(root.join("https/settings.json")).unwrap()).unwrap();
    assert!(persisted.pending_local);
    assert!(root.join("https/revisions").join(&persisted.revision).join("play-key.pem").is_file());
    assert_eq!(status(&root, &mut unavailable).unwrap()["config"]["pendingLocal"], true);
    apply(
        &root,
        &root,
        "unused",
        "",
        Import {
        delete_services: Vec::new(),
        external_local: false,
            settings,
            certificate: String::new(),
            private_key: String::new(),
            certificates: Default::default(),
        },
        &mut unavailable,
    )
    .unwrap();
    let metadata = fs::read_to_string(root.join("https/settings.json")).unwrap();
    let mut bad = Import {
        delete_services: Vec::new(),
        external_local: false,
        settings: Settings {upstream_ports:Default::default(),
            mode: "external".into(),
            https_port: 443,
            routes: vec![Route {path:String::new(),secure:true,
                service: "play".into(),
                domain: "play.example.com".into(),
                port: None,
            }],
        },
        certificate: String::new(),
        private_key: String::new(),
        certificates: Default::default(),
    };
    bad.settings.mode = "external".into();
    bad.private_key = fs::read_to_string(root.join("creator.key")).unwrap();
    bad.certificate = fs::read_to_string(root.join("play.pem")).unwrap();
    assert!(apply(&root, &root, "unused", "", bad, &mut unavailable)
        .unwrap_err()
        .contains("不匹配"));
    assert_eq!(fs::read_to_string(root.join("https/settings.json")).unwrap(), metadata);
    let remaining = delete_certificate(&root, &root, "unused", "", "creator", &mut unavailable).unwrap();
    assert_eq!(remaining["config"]["settings"]["routes"].as_array().unwrap().len(), 1);
    assert!(!remaining["config"]["certificateExpiries"].as_object().unwrap().contains_key("creator"));
    for entry in fs::read_dir(root.join("https/revisions")).unwrap() {
        assert!(!entry.unwrap().path().join("creator-key.pem").exists());
    }
    assert!(delete_certificate(&root, &root, "unused", "", "../invalid", &mut unavailable).is_err());
    let empty = delete_certificate(&root, &root, "unused", "", "play", &mut unavailable).unwrap();
    assert!(empty["config"].is_null());
    assert!(!root.join("https/settings.json").exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn managed_https_runtime_links_use_listener_ports_without_changing_engine_ports() {
    let root = fixture_root();
    std::fs::create_dir(root.join("https")).unwrap();
    let saved = Saved {settings:Settings {upstream_ports:Default::default(),mode:"managed".into(),https_port:443,routes:vec![Route {path:String::new(),secure:true,service:"play".into(),domain:"play.example.test".into(),port:Some(443)},Route {path:String::new(),secure:true,service:"player-auth-portal".into(),domain:"auth.example.test".into(),port:Some(443)}]},pending_local:false,external_local:false,expires_at:"2099-01-01T00:00:00Z".into(),revision:"fixture".into(),external_config:String::new(),certificate_sources:Default::default(),certificate_expiries:Default::default()};
    std::fs::write(root.join("https/settings.json"), serde_json::to_string(&saved).unwrap()).unwrap();
    let values = [("BOX_PLAY_NETWORK_MODE","public"),("BOX_CREATOR_NETWORK_MODE","local")].into_iter().map(|(key,value)|(key.to_string(),value.to_string())).collect();
    let mut derived: BTreeMap<String,String> = [("BOX_PLAY_PUBLIC_URL","https://play.example.test:3121"),("BOX_CREATOR_PUBLIC_URL","http://127.0.0.1:3127"),("BOX_VOXA_PUBLIC_URL","http://127.0.0.1:3123"),("BOX_PLAYER_SERVICE_PUBLIC_URL","https://shared.example.test:3124"),("BOX_AUTH_PORTAL_PUBLIC_URL","https://auth.example.test:3125"),("BOX_PLAY_PORT","3121")].into_iter().map(|(key,value)|(key.to_string(),value.to_string())).collect();
    apply_runtime_urls(&root, &values, &mut derived).unwrap();
    assert_eq!(derived["BOX_PLAY_PUBLIC_URL"], "https://play.example.test");
    assert_eq!(derived["BOX_PLAYER_LOGIN_URL"], "https://auth.example.test");
    assert_eq!(derived["BOX_PLAY_PORT"], "3121");
    assert!(derived["BOX_PLAYER_AUTH_ALLOWED_ORIGINS"].contains("https://play.example.test"));
    assert_eq!(derived["BOX_CREATOR_PUBLIC_URL"], "http://127.0.0.1:3127");
    std::fs::write(root.join("https/provider"), "external").unwrap();
    let original = derived.clone();
    apply_runtime_urls(&root, &values, &mut derived).unwrap();
    assert_eq!(derived, original);
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn failed_route_reload_preserves_the_certificate_being_deleted() {
    let root = fixture_root();
    std::fs::create_dir_all(root.join("https/revisions/old")).unwrap();
    let settings = Settings {upstream_ports:Default::default(),mode:"managed".into(), https_port:443, routes:vec![Route {path:String::new(),secure:true,service:"play".into(),domain:"play.example.test".into(),port:Some(443)},Route {path:String::new(),secure:true,service:"creator".into(),domain:"creator.example.test".into(),port:Some(443)}]};
    let saved = Saved {settings,external_local:false,pending_local:false,expires_at:"2099-01-01T00:00:00Z".into(),revision:"old".into(),external_config:String::new(),certificate_sources:Default::default(),certificate_expiries:Default::default()};
    let metadata = serde_json::to_string(&saved).unwrap();
    std::fs::write(root.join("https/settings.json"), &metadata).unwrap();
    for service in ["play", "creator"] {
        std::fs::write(root.join(format!("https/revisions/old/{service}-cert.pem")), "-----BEGIN CERTIFICATE-----\nfixture").unwrap();
        std::fs::write(root.join(format!("https/revisions/old/{service}-key.pem")), "-----BEGIN PRIVATE KEY-----\nfixture").unwrap();
    }
    let mut docker = |args: &[String]| {
        if args.contains(&"-t".into()) { return Err("fixture reload refused".into()); }
        if args.contains(&"-checkhost".into()) { return Ok("does match certificate".into()); }
        if args.contains(&"-startdate".into()) { return Ok("notBefore=Jan  1 00:00:00 2025 GMT\nnotAfter=Jan  1 00:00:00 2099 GMT".into()); }
        Ok(String::new())
    };
    assert!(delete_certificate(&root, &root, "fixture", "", "creator", &mut docker).is_err());
    assert_eq!(std::fs::read_to_string(root.join("https/settings.json")).unwrap(), metadata);
    assert!(root.join("https/revisions/old/creator-key.pem").exists());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn certificate_removal_is_not_blocked_by_another_expired_certificate() {
    let root = fixture_root();
    std::fs::create_dir_all(root.join("https/revisions/old")).unwrap();
    let saved = Saved {settings:Settings {upstream_ports:Default::default(),mode:"managed".into(),https_port:443,routes:vec![Route {path:String::new(),secure:true,service:"play".into(),domain:"play.example.test".into(),port:Some(443)},Route {path:String::new(),secure:true,service:"creator".into(),domain:"creator.example.test".into(),port:Some(443)}]},external_local:false,pending_local:false,expires_at:"2020-01-01T00:00:00Z".into(),revision:"old".into(),external_config:String::new(),certificate_sources:Default::default(),certificate_expiries:Default::default()};
    std::fs::write(root.join("https/settings.json"), serde_json::to_string(&saved).unwrap()).unwrap();
    for service in ["play", "creator"] {
        std::fs::write(root.join(format!("https/revisions/old/{service}-cert.pem")), "-----BEGIN CERTIFICATE-----\nfixture").unwrap();
        std::fs::write(root.join(format!("https/revisions/old/{service}-key.pem")), "-----BEGIN PRIVATE KEY-----\nfixture").unwrap();
    }
    let result = delete_certificate(&root, &root, "fixture", "", "creator", &mut |args| {
        if args.contains(&"-checkend".into()) { return Err("certificate expired".into()); }
        Ok(String::new())
    }).unwrap();
    assert_eq!(result["config"]["settings"]["routes"].as_array().unwrap().len(), 1);
    assert_eq!(result["config"]["certificateExpiries"]["play"], "2020-01-01T00:00:00Z");
    assert!(!root.join("https/revisions/old/creator-key.pem").exists());
    std::fs::remove_dir_all(root).unwrap();
}

#[test]
fn shared_certificate_deletion_clears_tls_flags_and_keeps_http_and_other_certificates() {
    let root=fixture_root();
    std::fs::create_dir_all(root.join("https/revisions/old")).unwrap();
    let settings=Settings {mode:"managed".into(),https_port:443,upstream_ports:Default::default(),routes:vec![
        Route {service:"play".into(),domain:"play.example.test".into(),port:Some(8080),secure:false,path:String::new()},
        Route {service:"creator".into(),domain:"creator.example.test".into(),port:Some(443),secure:true,path:String::new()},
        Route {service:"voxa".into(),domain:"voxa.example.test".into(),port:Some(443),secure:true,path:String::new()},
    ]};
    let saved=Saved {settings,external_local:false,pending_local:false,expires_at:"2099-01-01T00:00:00Z".into(),revision:"old".into(),external_config:String::new(),certificate_sources:[("play".into(),"shared".into()),("creator".into(),"shared".into()),("voxa".into(),"independent".into())].into_iter().collect(),certificate_expiries:["play","creator","voxa"].into_iter().map(|service|(service.into(),"2099-01-01T00:00:00Z".into())).collect()};
    std::fs::write(root.join("https/settings.json"),serde_json::to_string(&saved).unwrap()).unwrap();
    for service in ["play","creator","voxa"] {
        std::fs::write(root.join(format!("https/revisions/old/{service}-cert.pem")),"-----BEGIN CERTIFICATE-----\nfixture").unwrap();
        std::fs::write(root.join(format!("https/revisions/old/{service}-key.pem")),"-----BEGIN PRIVATE KEY-----\nfixture").unwrap();
    }
    assert!(crate::public_access::certificate_flags(&root)["shared"]);
    let result=delete_certificate(&root,&root,"fixture","","shared",&mut |_|Ok(String::new())).unwrap();
    let routes=result["config"]["settings"]["routes"].as_array().unwrap();
    assert_eq!(routes.len(),2);
    assert!(routes.iter().any(|route|route["service"]=="play" && route["secure"]==false));
    let flags=crate::public_access::certificate_flags(&root);
    assert!(!flags["shared"]);assert!(!flags["play"]);assert!(!flags["creator"]);assert!(flags["voxa"]);
    assert!(!root.join("https/revisions/old/play-key.pem").exists());
    assert!(!root.join("https/revisions/old/creator-key.pem").exists());
    assert!(root.join("https/revisions/old/voxa-key.pem").exists());
    std::fs::remove_dir_all(root).unwrap();
}
