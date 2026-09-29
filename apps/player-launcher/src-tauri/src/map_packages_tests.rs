use super::{
    install_blob_from_api, package_blob_root, partial_blob_path, plan_map_package_install,
    validate_blob_request,
};
use crate::{api_transport::ApiRequest, package_descriptor::PackageDescriptor};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use std::{
    fs,
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::SystemTime,
};

static NEXT_TEMP_ROOT_ID: AtomicU64 = AtomicU64::new(0);

fn descriptor() -> PackageDescriptor {
    serde_json::from_value(serde_json::json!({
        "formatVersion": 1,
        "permanentMapId": "permanent-map-1",
        "accessId": "world-one",
        "releaseVersion": "v1",
        "required": [],
        "optional": [],
        "manifestDigest": "digest-1",
        "signature": { "algorithm": "ES256", "keyId": "key", "publicKey": {}, "value": "sig" }
    }))
    .unwrap()
}

fn request(url: &str) -> ApiRequest {
    ApiRequest {
        endpoint: "https://play.example.test".into(),
        url: url.into(),
        method: "GET".into(),
        headers: Vec::new(),
        body: None,
    }
}

fn test_root() -> PathBuf {
    std::env::temp_dir().join(format!(
        "box-player-map-plan-{}-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        NEXT_TEMP_ROOT_ID.fetch_add(1, Ordering::Relaxed),
    ))
}

fn content_hash(bytes: &[u8]) -> String {
    URL_SAFE_NO_PAD.encode(ring::digest::digest(&ring::digest::SHA256, bytes).as_ref())
}

fn serve_once(
    status: u16,
    extra_headers: String,
    body: Vec<u8>,
) -> (String, thread::JoinHandle<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let address = listener.local_addr().unwrap();
    let task = thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut request = Vec::new();
        let mut buffer = [0u8; 2048];
        loop {
            let count = stream.read(&mut buffer).unwrap();
            if count == 0 {
                break;
            }
            request.extend_from_slice(&buffer[..count]);
            if request.windows(4).any(|window| window == b"\r\n\r\n") {
                break;
            }
        }
        write!(
            stream,
            "HTTP/1.1 {status} Test\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\nConnection: close\r\n{extra_headers}\r\n",
            body.len()
        )
        .unwrap();
        stream.write_all(&body).unwrap();
        String::from_utf8(request).unwrap()
    });
    (format!("http://{address}"), task)
}

fn blob_request(endpoint: &str, hash: &str, digest: &str, range: Option<&str>) -> ApiRequest {
    let mut headers = vec![("accept".into(), "application/octet-stream".into())];
    if let Some(range) = range {
        headers.push(("range".into(), range.into()));
    }
    ApiRequest {
        endpoint: endpoint.into(),
        url: format!(
            "{endpoint}/api/player-launcher/maps/world-one/blobs/{hash}?digest={digest}&ticket=short-test-ticket"
        ),
        method: "GET".into(),
        headers,
        body: None,
    }
}

fn asset_descriptor(hash: &str, size: usize) -> PackageDescriptor {
    serde_json::from_value(serde_json::json!({
        "formatVersion": 1,
        "permanentMapId": "permanent-map-1",
        "accessId": "world-one",
        "releaseVersion": "v1",
        "required": [{
            "hash": hash,
            "size": size,
            "kind": "static",
            "contentType": "application/octet-stream"
        }],
        "optional": [],
        "manifestDigest": "test-manifest",
        "signature": { "algorithm": "ES256", "keyId": "key", "publicKey": {}, "value": "sig" }
    }))
    .unwrap()
}

#[test]
fn install_plan_repairs_missing_and_corrupt_assets_and_adopts_complete_partial_blobs() {
    let root = test_root();
    let server_key = "test-server";
    let manifest_digest = "manifest-digest";
    let present = b"present asset";
    let repair = b"partial repair asset";
    let corrupt = b"correct bytes";
    let missing = b"new asset";
    let completed = b"completed partial asset";
    let contents: [&[u8]; 5] = [present, repair, corrupt, missing, completed];
    let hashes = contents.map(content_hash);
    let sizes = contents.map(|bytes| bytes.len() as u64);
    let descriptor: PackageDescriptor = serde_json::from_value(serde_json::json!({
        "formatVersion": 1,
        "permanentMapId": "permanent-map-1",
        "accessId": "world-one",
        "releaseVersion": "v1",
        "required": hashes.iter().zip(sizes).map(|(hash, size)| serde_json::json!({
            "hash": hash,
            "size": size,
            "kind": "static",
            "contentType": "application/octet-stream"
        })).collect::<Vec<_>>(),
        "optional": [],
        "manifestDigest": manifest_digest,
        "signature": { "algorithm": "ES256", "keyId": "key", "publicKey": {}, "value": "sig" }
    }))
    .unwrap();
    let blobs = package_blob_root(&root);
    fs::create_dir_all(&blobs).unwrap();
    fs::write(blobs.join(&hashes[0]), present).unwrap();
    fs::write(blobs.join(&hashes[2]), b"wrong bytes!!").unwrap();
    let repair_partial = partial_blob_path(&root, server_key, &descriptor, &hashes[1]);
    let complete_partial = partial_blob_path(&root, server_key, &descriptor, &hashes[4]);
    fs::create_dir_all(repair_partial.parent().unwrap()).unwrap();
    fs::write(&repair_partial, &repair[..6]).unwrap();
    fs::create_dir_all(complete_partial.parent().unwrap()).unwrap();
    fs::write(&complete_partial, completed).unwrap();

    let plan = plan_map_package_install(&root, server_key, &descriptor).unwrap();
    assert_eq!(
        plan.missing_hashes,
        vec![hashes[1].clone(), hashes[2].clone(), hashes[3].clone()]
    );
    assert_eq!(
        plan.missing_bytes,
        (repair.len() - 6 + corrupt.len() + missing.len()) as u64
    );
    assert!(blobs.join(&hashes[4]).is_file());
    assert!(!complete_partial.exists());
    assert_eq!(fs::read(repair_partial).unwrap(), &repair[..6]);
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn streamed_http_download_repairs_corrupt_blob_and_hash_checks_before_commit() {
    let root = test_root();
    let contents = b"verified map block".to_vec();
    let hash = content_hash(&contents);
    let descriptor = asset_descriptor(&hash, contents.len());
    let asset = descriptor.required.first().unwrap();
    let blobs = package_blob_root(&root);
    fs::create_dir_all(&blobs).unwrap();
    fs::write(blobs.join(&hash), b"tamper map block!!").unwrap();
    let (endpoint, server) = serve_once(200, String::new(), contents.clone());
    let request = blob_request(&endpoint, &hash, &descriptor.manifest_digest, None);
    assert!(validate_blob_request(&request, &descriptor, &hash).is_ok());

    let installed = tauri::async_runtime::block_on(install_blob_from_api(
        None,
        &root,
        "test-server",
        &descriptor,
        asset,
        request,
    ))
    .unwrap();
    assert!(!installed.already_present);
    assert_eq!(installed.bytes_written, contents.len() as u64);
    assert_eq!(fs::read(blobs.join(hash)).unwrap(), contents);
    assert!(server
        .join()
        .unwrap()
        .starts_with("GET /api/player-launcher/maps/world-one/blobs/"));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn streamed_http_range_resumes_partial_blob_and_rejects_tampered_body() {
    let root = test_root();
    let contents = b"resume this verified static map block".to_vec();
    let hash = content_hash(&contents);
    let descriptor = asset_descriptor(&hash, contents.len());
    let asset = descriptor.required.first().unwrap();
    let blobs = package_blob_root(&root);
    fs::create_dir_all(&blobs).unwrap();
    let partial = partial_blob_path(&root, "test-server", &descriptor, &hash);
    let prefix_size = 9;
    fs::create_dir_all(partial.parent().unwrap()).unwrap();
    fs::write(&partial, &contents[..prefix_size]).unwrap();
    let range = format!("bytes={prefix_size}-");
    let content_range = format!(
        "Content-Range: bytes {prefix_size}-{}/{}\r\n",
        contents.len() - 1,
        contents.len()
    );
    let (endpoint, server) = serve_once(206, content_range, contents[prefix_size..].to_vec());
    let request = blob_request(&endpoint, &hash, &descriptor.manifest_digest, Some(&range));
    let installed = tauri::async_runtime::block_on(install_blob_from_api(
        None,
        &root,
        "test-server",
        &descriptor,
        asset,
        request,
    ))
    .unwrap();
    assert_eq!(
        installed.bytes_written,
        (contents.len() - prefix_size) as u64
    );
    assert_eq!(fs::read(blobs.join(&hash)).unwrap(), contents);
    assert!(server
        .join()
        .unwrap()
        .to_ascii_lowercase()
        .contains(&format!("range: {range}")));

    let bad_root = test_root();
    let bad_blobs = package_blob_root(&bad_root);
    fs::create_dir_all(&bad_blobs).unwrap();
    let bad_body = vec![b'x'; contents.len()];
    let (bad_endpoint, bad_server) = serve_once(200, String::new(), bad_body);
    let bad_request = blob_request(&bad_endpoint, &hash, &descriptor.manifest_digest, None);
    let error = match tauri::async_runtime::block_on(install_blob_from_api(
        None,
        &bad_root,
        "test-server",
        &descriptor,
        asset,
        bad_request,
    )) {
        Ok(_) => panic!("corrupt API content should fail the content hash check"),
        Err(error) => error,
    };
    assert!(
        error.contains("完整性校验失败"),
        "unexpected download error: {error}"
    );
    assert!(!bad_blobs.join(&hash).exists());
    assert!(bad_server.join().unwrap().starts_with("GET "));
    fs::remove_dir_all(root).unwrap();
    fs::remove_dir_all(bad_root).unwrap();
}

#[test]
fn blob_download_url_must_bind_map_hash_digest_and_ticket() {
    let descriptor = descriptor();
    assert!(validate_blob_request(
        &request("https://play.example.test/api/player-launcher/maps/world-one/blobs/abc?digest=digest-1&ticket=short-ticket"),
        &descriptor,
        "abc",
    ).is_ok());
    assert!(validate_blob_request(
        &request("https://play.example.test/api/player-launcher/maps/other-map/blobs/abc?digest=digest-1&ticket=short-ticket"),
        &descriptor,
        "abc",
    ).is_err());
    assert!(validate_blob_request(
        &request("https://play.example.test/api/player-launcher/maps/world-one/blobs/abc?digest=other&ticket=short-ticket"),
        &descriptor,
        "abc",
    ).is_err());
}
