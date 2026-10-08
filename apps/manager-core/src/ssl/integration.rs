//! Opt-in Docker acceptance: a private test network and synthetic certificates.
use super::*;
use std::{fs, path::PathBuf, process::Command};
fn docker(args: &[String]) -> Result<String, String> {
    let output = Command::new("docker")
        .args(args)
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().into())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().into())
    }
}
fn run(program: &str, args: &[&str]) -> String {
    let output = Command::new(program).args(args).output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout).trim().into()
}
struct Cleanup {
    root: PathBuf,
    network: String,
    upstream: String,
    creator: String,
}
impl Drop for Cleanup {
    fn drop(&mut self) {
        let _ = stop(&self.root, &mut docker);
        let _ = run_cleanup(&["rm", "-f", &self.upstream]);
        let _ = run_cleanup(&["rm", "-f", &self.creator]);
        let _ = run_cleanup(&["network", "rm", &self.network]);
        let _ = fs::remove_dir_all(&self.root);
    }
}
fn run_cleanup(args: &[&str]) -> Result<String, String> {
    docker(&args.iter().map(|s| s.to_string()).collect::<Vec<_>>())
}
#[test]
#[ignore = "requires Docker, OpenSSL, curl and a locally built Creator image"]
fn real_nginx_https_wss_import_and_rollback() {
    let root = std::env::temp_dir().join(format!("box-ssl-live-{}", std::process::id()));
    fs::create_dir(&root).unwrap();
    let network = format!("box-ssl-live-{}", std::process::id());
    let cleanup = Cleanup {
        root: root.clone(),
        network: network.clone(),
        upstream: format!("{network}-upstream"),
        creator: format!("{network}-creator"),
    };
    fs::write(root.join("openssl.cnf"),"[req]\ndistinguished_name=dn\nx509_extensions=ext\nprompt=no\n[dn]\nCN=play.example.com\n[ext]\nsubjectAltName=DNS:play.example.com,DNS:creator.example.com\nbasicConstraints=critical,CA:TRUE\n").unwrap();
    run(
        "openssl",
        &[
            "req",
            "-x509",
            "-newkey",
            "rsa:2048",
            "-nodes",
            "-days",
            "3",
            "-config",
            root.join("openssl.cnf").to_str().unwrap(),
            "-keyout",
            root.join("test.key").to_str().unwrap(),
            "-out",
            root.join("test.pem").to_str().unwrap(),
        ],
    );
    run("docker", &["network", "create", &network]);
    let upstream="const http=require('http'),WS=require('/app/services/game-server/node_modules/ws');const server=http.createServer((req,res)=>res.end(JSON.stringify({proto:req.headers['x-forwarded-proto'],host:req.headers.host,service:'play'})));const wss=new WS.Server({server});wss.on('connection',socket=>socket.on('message',data=>socket.send(data)));server.listen(3000,'0.0.0.0');";
    run(
        "docker",
        &[
            "run",
            "-d",
            "--name",
            &cleanup.upstream,
            "--network",
            &network,
            "--network-alias",
            "play",
            "--entrypoint",
            "node",
            "box-local-engine-creator:v0.3.0-linux-arm64",
            "-e",
            upstream,
        ],
    );
    let creator_server = "require('http').createServer((req,res)=>res.end(JSON.stringify({proto:req.headers['x-forwarded-proto'],service:'creator'}))).listen(3000,'0.0.0.0');";
    run("docker", &["run", "-d", "--name", &cleanup.creator, "--network", &network, "--network-alias", "creator", "--entrypoint", "node", "box-local-engine-creator:v0.3.0-linux-arm64", "-e", creator_server]);
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let port = listener.local_addr().unwrap().port();
    drop(listener);
    let certificate = fs::read_to_string(root.join("test.pem")).unwrap();
    let key = fs::read_to_string(root.join("test.key")).unwrap();
    let settings = Settings {
        mode: "managed".into(),
        https_port: port,
        routes: vec![Route {
            service: "play".into(),
            domain: "play.example.com".into(),
            port: None,
        }, Route {
            service: "creator".into(),
            domain: "creator.example.com".into(),
            port: None,
        }],
    };
    let result = apply(
        &root,
        &root,
        &network,
        "",
        Import {
        external_local: false,
            settings: settings.clone(),
            certificate: certificate.clone(),
            private_key: key.clone(),
            certificates: Default::default(),
        },
        &mut docker,
    )
    .unwrap();
    assert!(result["running"].as_bool().unwrap());
    assert!(!fs::read_to_string(root.join("https/settings.json"))
        .unwrap()
        .contains("PRIVATE KEY"));
    let check_http = || {
        let text = run(
            "curl",
            &[
                "--noproxy",
                "*",
                "--retry",
                "4",
                "--retry-connrefused",
                "--retry-delay",
                "1",
                "-fsS",
                "--cacert",
                root.join("test.pem").to_str().unwrap(),
                "--resolve",
                &format!("play.example.com:{port}:127.0.0.1"),
                &format!("https://play.example.com:{port}/"),
            ],
        );
        let data: serde_json::Value = serde_json::from_str(&text).unwrap();
        assert_eq!(data["proto"], "https");
        assert_eq!(data["host"], format!("play.example.com:{port}"));
    };
    check_http();
    let creator = run("curl", &["--noproxy", "*", "--retry", "4", "--retry-connrefused", "--cacert", root.join("test.pem").to_str().unwrap(), "--resolve", &format!("creator.example.com:{port}:127.0.0.1"), &format!("https://creator.example.com:{port}/")]);
    assert!(creator.contains("https") && creator.contains("\"service\":\"creator\""), "{creator}");
    let owner = fs::read_to_string(root.join("https/owner")).unwrap();
    let proxy = format!("box-https-{owner}");
    run(
        "docker",
        &[
            "cp",
            root.join("test.pem").to_str().unwrap(),
            &format!("{}:/tmp/test.pem", cleanup.upstream),
        ],
    );
    let client=format!("const WS=require('/app/services/game-server/node_modules/ws'),fs=require('fs');const ws=new WS('wss://{proxy}:443/echo',{{ca:fs.readFileSync('/tmp/test.pem'),servername:'play.example.com',headers:{{Host:'play.example.com'}}}});const timer=setTimeout(()=>process.exit(2),10000);ws.on('open',()=>ws.send('wss-fixture'));ws.on('message',data=>{{if(String(data)!=='wss-fixture')process.exit(3);clearTimeout(timer);ws.close();console.log('WSS echo verified')}});ws.on('error',()=>process.exit(4));");
    assert!(run(
        "docker",
        &["exec", &cleanup.upstream, "node", "-e", &client]
    )
    .contains("WSS echo verified"));
    // Nginx must reject a private key mismatch before touching the active config.
    let old = fs::read_to_string(root.join("https/nginx.conf")).unwrap();
    assert!(apply(
        &root,
        &root,
        &network,
        "",
        Import {
        external_local: false,
            settings: settings.clone(),
            certificate: certificate.clone(),
            private_key: "-----BEGIN PRIVATE KEY-----\ninvalid".into(),
            certificates: Default::default(),
        },
        &mut docker
    )
    .is_err());
    assert_eq!(
        fs::read_to_string(root.join("https/nginx.conf")).unwrap(),
        old
    );
    check_http();
    // A valid replacement exercises nginx -t and graceful reload.
    apply(
        &root,
        &root,
        &network,
        "",
        Import {
        external_local: false,
            settings: settings.clone(),
            certificate: String::new(),
            private_key: String::new(),
            certificates: [(
                "play".into(),
                Certificate {
                    source: "independent".into(),
                    certificate: certificate.clone(),
                    private_key: key.clone(),
                },
            )]
            .into_iter()
            .collect(),
        },
        &mut docker,
    )
    .unwrap();
    check_http();
    let deleted = delete_certificate(&root, &root, &network, "", "creator", &mut docker).unwrap();
    assert_eq!(deleted["config"]["settings"]["routes"].as_array().unwrap().len(), 1);
    check_http();
    let actual = run("docker", &["exec", &proxy, "nginx", "-T", "-c", "/etc/box-https/nginx.conf"]);
    assert!(!actual.contains("server_name creator.example.com;"));
    stop(&root, &mut docker).unwrap();
    let mut settings = settings;
    settings.routes.retain(|route| route.service == "play");
    settings.mode = "external".into();
    let external = apply(
        &root,
        &root,
        &network,
        "BOX_PLAY_PORT=4121",
        Import {
        external_local: false,
            settings,
            certificate,
            private_key: key,
            certificates: Default::default(),
        },
        &mut docker,
    )
    .unwrap();
    assert!(external["config"]["externalConfig"]
        .as_str()
        .unwrap()
        .contains("127.0.0.1:4121"));
    assert_eq!(external["running"], false);
    println!("HTTPS, trusted fixture TLS, WSS echo, bad key preservation, reload and external export passed");
}
