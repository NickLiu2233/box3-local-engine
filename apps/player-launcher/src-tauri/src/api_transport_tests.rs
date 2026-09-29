use crate::{api_download::stream_api_to_file_inner, api_transport::ApiRequest};
use std::{
    fs,
    io::{Read, Write},
    net::TcpListener,
    path::PathBuf,
    sync::atomic::{AtomicU64, Ordering},
    thread,
    time::{SystemTime, UNIX_EPOCH},
};

static NEXT_TEMP_FILE_ID: AtomicU64 = AtomicU64::new(0);

fn temp_file() -> PathBuf {
    std::env::temp_dir().join(format!(
        "box-player-download-test-{}-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos(),
        NEXT_TEMP_FILE_ID.fetch_add(1, Ordering::Relaxed),
    ))
}

fn serve_once(
    status: u16,
    extra_headers: String,
    body: Vec<u8>,
) -> (String, thread::JoinHandle<Vec<u8>>) {
    serve_once_with_content_type(status, extra_headers, body, "application/octet-stream")
}

fn serve_once_with_content_type(
    status: u16,
    extra_headers: String,
    body: Vec<u8>,
    content_type: &'static str,
) -> (String, thread::JoinHandle<Vec<u8>>) {
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
                "HTTP/1.1 {status} Test\r\nContent-Type: {content_type}\r\nContent-Length: {}\r\nConnection: close\r\n{extra_headers}\r\n",
                body.len(),
            ).unwrap();
        stream.write_all(&body).unwrap();
        request
    });
    (format!("http://{address}"), task)
}

fn request(endpoint: &str, range: Option<String>) -> ApiRequest {
    let mut headers = vec![("accept".into(), "application/octet-stream".into())];
    if let Some(range) = range {
        headers.push(("range".into(), range));
    }
    ApiRequest {
        endpoint: endpoint.into(),
        url: format!("{endpoint}/api/player-launcher/maps/world/blobs/hash?digest=abc&ticket=def"),
        method: "GET".into(),
        headers,
        body: None,
    }
}

#[test]
fn streams_binary_api_assets_to_disk_without_loading_the_body_into_json() {
    let contents = b"a streamed terrain block".to_vec();
    let (endpoint, server) = serve_once(200, String::new(), contents.clone());
    let path = temp_file();
    let response = tauri::async_runtime::block_on(stream_api_to_file_inner(
        None,
        request(&endpoint, None),
        &path,
        contents.len() as u64,
        0,
        "hash",
        "application/octet-stream",
    ))
    .unwrap();
    assert_eq!(response.status, 200);
    assert_eq!(response.downloaded_bytes, Some(contents.len() as u64));
    assert_eq!(fs::read(&path).unwrap(), contents);
    assert!(String::from_utf8(server.join().unwrap())
        .unwrap()
        .contains("GET /api/player-launcher/maps/world/blobs/hash?digest=abc&ticket=def"));
    fs::remove_file(path).unwrap();
}

#[test]
fn resumes_from_an_existing_partial_file_using_range_responses() {
    let contents = b"resume-safe-map-data".to_vec();
    let prefix = &contents[..7];
    let suffix = contents[7..].to_vec();
    let range = format!("bytes=7-{}", contents.len() - 1);
    let content_range = format!(
        "Content-Range: bytes 7-{}/{}\r\n",
        contents.len() - 1,
        contents.len()
    );
    let (endpoint, server) = serve_once(206, content_range, suffix.clone());
    let path = temp_file();
    fs::write(&path, prefix).unwrap();
    let response = tauri::async_runtime::block_on(stream_api_to_file_inner(
        None,
        request(&endpoint, Some(range.clone())),
        &path,
        contents.len() as u64,
        prefix.len() as u64,
        "hash",
        "application/octet-stream",
    ))
    .unwrap();
    assert_eq!(response.status, 206);
    assert_eq!(response.downloaded_bytes, Some(suffix.len() as u64));
    assert_eq!(fs::read(&path).unwrap(), contents);
    let request = String::from_utf8(server.join().unwrap()).unwrap();
    assert!(request
        .to_ascii_lowercase()
        .contains(&format!("range: {range}")));
    fs::remove_file(path).unwrap();
}

#[test]
fn streams_assets_using_their_signed_mime_type_and_rejects_mismatches() {
    let contents = b"png bytes".to_vec();
    let (endpoint, server) =
        serve_once_with_content_type(200, String::new(), contents.clone(), "image/png");
    let path = temp_file();
    let response = tauri::async_runtime::block_on(stream_api_to_file_inner(
        None,
        request(&endpoint, None),
        &path,
        contents.len() as u64,
        0,
        "hash",
        "image/png",
    ))
    .unwrap();
    assert_eq!(response.status, 200);
    assert_eq!(fs::read(&path).unwrap(), contents);
    server.join().unwrap();
    fs::remove_file(&path).unwrap();

    let (endpoint, server) =
        serve_once_with_content_type(200, String::new(), b"png bytes".to_vec(), "image/png");
    let path = temp_file();
    let result = tauri::async_runtime::block_on(stream_api_to_file_inner(
        None,
        request(&endpoint, None),
        &path,
        9,
        0,
        "hash",
        "application/octet-stream",
    ));
    let error = match result {
        Ok(_) => panic!("expected mismatched MIME type to fail"),
        Err(error) => error,
    };
    assert!(error.contains("image/png"));
    server.join().unwrap();
    let _ = fs::remove_file(path);
}
