use crate::{
    map_packages::{package_blob_root, store_root},
    package_descriptor::PackageDescriptor,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ring::rand::{SecureRandom, SystemRandom};
use std::{
    collections::HashMap,
    fs::{self, File},
    io::{Read, Seek, SeekFrom},
    path::PathBuf,
    sync::{mpsc, Arc, Mutex, RwLock},
    thread,
    time::{Duration, Instant},
};
use tauri::http::{header, Method, Request, Response, StatusCode};

const LOCAL_ASSET_SESSION_LIFETIME: Duration = Duration::from_secs(24 * 60 * 60);
const PROTOCOL_WORKERS: usize = 2;

type ProtocolJob = Box<dyn FnOnce() + Send + 'static>;

#[derive(Clone)]
struct AllowedAsset {
    size: u64,
    content_type: String,
}

#[derive(Clone)]
struct ActiveSession {
    id: String,
    blob_root: PathBuf,
    assets: HashMap<String, AllowedAsset>,
    expires_at: Instant,
}

#[derive(Clone)]
pub(crate) struct LocalResourceProtocolState {
    active: Arc<RwLock<Option<ActiveSession>>>,
    jobs: mpsc::Sender<ProtocolJob>,
}

impl Default for LocalResourceProtocolState {
    fn default() -> Self {
        let (jobs, receiver) = mpsc::channel::<ProtocolJob>();
        let receiver = Arc::new(Mutex::new(receiver));
        for _ in 0..PROTOCOL_WORKERS {
            let receiver = Arc::clone(&receiver);
            thread::spawn(move || loop {
                let job = {
                    let Ok(receiver) = receiver.lock() else {
                        return;
                    };
                    receiver.recv()
                };
                match job {
                    Ok(job) => job(),
                    Err(_) => return,
                }
            });
        }
        Self {
            active: Arc::new(RwLock::new(None)),
            jobs,
        }
    }
}

impl LocalResourceProtocolState {
    pub(crate) fn activate(
        &self,
        app: &tauri::AppHandle,
        descriptor: &PackageDescriptor,
    ) -> Result<String, String> {
        let mut random = [0u8; 32];
        SystemRandom::new()
            .fill(&mut random)
            .map_err(|_| "无法创建本地地图资源会话".to_string())?;
        let id = URL_SAFE_NO_PAD.encode(random);
        let assets = descriptor
            .required
            .iter()
            .map(|asset| {
                (
                    asset.hash.clone(),
                    AllowedAsset {
                        size: asset.size,
                        content_type: asset.content_type.clone(),
                    },
                )
            })
            .collect();
        let root = store_root(app)?;
        let session = ActiveSession {
            id: id.clone(),
            blob_root: package_blob_root(&root),
            assets,
            expires_at: Instant::now() + LOCAL_ASSET_SESSION_LIFETIME,
        };
        *self
            .active
            .write()
            .map_err(|_| "本地地图资源会话不可用".to_string())? = Some(session);
        Ok(id)
    }

    pub(crate) fn clear(&self) {
        if let Ok(mut active) = self.active.write() {
            *active = None;
        }
    }

    pub(crate) fn dispatch(
        &self,
        webview_label: String,
        request: Request<Vec<u8>>,
        responder: tauri::UriSchemeResponder,
    ) {
        let state = self.clone();
        let job = Box::new(move || {
            responder.respond(state.respond(&webview_label, request));
        });
        let _ = self.jobs.send(job);
    }

    fn respond(&self, webview_label: &str, request: Request<Vec<u8>>) -> Response<Vec<u8>> {
        if webview_label != "player-game" {
            return error_response(StatusCode::FORBIDDEN, "resource session unavailable");
        }
        if !request
            .uri()
            .host()
            .is_some_and(|host| host.eq_ignore_ascii_case("localhost"))
        {
            return error_response(StatusCode::NOT_FOUND, "resource not found");
        }
        let segments = request
            .uri()
            .path()
            .split('/')
            .filter(|part| !part.is_empty())
            .collect::<Vec<_>>();
        let Some((session_id, hash)) = resource_route(&segments) else {
            return error_response(StatusCode::NOT_FOUND, "resource not found");
        };
        let allowed = {
            let Ok(active) = self.active.read() else {
                return error_response(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "resource session unavailable",
                );
            };
            let Some(session) = active.as_ref() else {
                return error_response(StatusCode::NOT_FOUND, "resource not found");
            };
            if session.expires_at <= Instant::now() || session.id != session_id {
                return error_response(StatusCode::NOT_FOUND, "resource not found");
            }
            let Some(asset) = session.assets.get(hash) else {
                return error_response(StatusCode::NOT_FOUND, "resource not found");
            };
            (session.blob_root.join(hash), asset.clone())
        };
        let (path, asset) = allowed;
        if request.method() == Method::OPTIONS {
            return response(
                StatusCode::NO_CONTENT,
                "application/octet-stream",
                0,
                None,
                Vec::new(),
            );
        }
        if request.method() != Method::GET && request.method() != Method::HEAD {
            return error_response(StatusCode::METHOD_NOT_ALLOWED, "method not allowed");
        }

        let metadata = match fs::symlink_metadata(&path) {
            Ok(metadata) if metadata.file_type().is_file() && metadata.len() == asset.size => {
                metadata
            }
            _ => return error_response(StatusCode::NOT_FOUND, "resource not found"),
        };
        let total_size = metadata.len();
        let range = match request.headers().get(header::RANGE) {
            Some(value) => match value
                .to_str()
                .ok()
                .and_then(|value| parse_range(value, total_size).ok())
            {
                Some(range) => Some(range),
                None => return range_error(total_size),
            },
            None => None,
        };
        let (start, end, status) = match range {
            Some((start, end)) => (start, end, StatusCode::PARTIAL_CONTENT),
            None => (0, total_size.saturating_sub(1), StatusCode::OK),
        };
        let length = end.saturating_sub(start).saturating_add(1);
        let content_range = (status == StatusCode::PARTIAL_CONTENT)
            .then(|| format!("bytes {start}-{end}/{total_size}"));
        if request.method() == Method::HEAD {
            return response(
                status,
                &asset.content_type,
                length,
                content_range.as_deref(),
                Vec::new(),
            );
        }

        let Ok(mut file) = File::open(path) else {
            return error_response(StatusCode::NOT_FOUND, "resource not found");
        };
        if file.seek(SeekFrom::Start(start)).is_err() {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "resource read failed");
        }
        let Ok(capacity) = usize::try_from(length) else {
            return error_response(StatusCode::RANGE_NOT_SATISFIABLE, "range not satisfiable");
        };
        let mut body = Vec::with_capacity(capacity);
        if file.take(length).read_to_end(&mut body).is_err() || body.len() != capacity {
            return error_response(StatusCode::INTERNAL_SERVER_ERROR, "resource read failed");
        }
        response(
            status,
            &asset.content_type,
            length,
            content_range.as_deref(),
            body,
        )
    }
}

fn resource_route<'a>(segments: &[&'a str]) -> Option<(&'a str, &'a str)> {
    match segments {
        [session, "block", hash] | [session, "engine", "m", hash] => Some((session, hash)),
        _ => None,
    }
}

fn parse_range(value: &str, total_size: u64) -> Result<(u64, u64), ()> {
    let value = value.strip_prefix("bytes=").ok_or(())?;
    if value.contains(',') || total_size == 0 {
        return Err(());
    }
    let (start, end) = value.split_once('-').ok_or(())?;
    if start.is_empty() {
        let suffix = end.parse::<u64>().map_err(|_| ())?;
        if suffix == 0 {
            return Err(());
        }
        return Ok((total_size.saturating_sub(suffix), total_size - 1));
    }
    let start = start.parse::<u64>().map_err(|_| ())?;
    if start >= total_size {
        return Err(());
    }
    let end = if end.is_empty() {
        total_size - 1
    } else {
        end.parse::<u64>().map_err(|_| ())?.min(total_size - 1)
    };
    if end < start {
        return Err(());
    }
    Ok((start, end))
}

fn response(
    status: StatusCode,
    content_type: &str,
    content_length: u64,
    content_range: Option<&str>,
    body: Vec<u8>,
) -> Response<Vec<u8>> {
    let mut builder = Response::builder()
        .status(status)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
        .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "Range, Content-Type")
        .header(
            header::ACCESS_CONTROL_EXPOSE_HEADERS,
            "Accept-Ranges, Content-Length, Content-Range",
        )
        .header("Cross-Origin-Resource-Policy", "cross-origin")
        .header(header::ACCEPT_RANGES, "bytes")
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_LENGTH, content_length.to_string());
    if let Some(content_range) = content_range {
        builder = builder.header(header::CONTENT_RANGE, content_range);
    }
    builder
        .body(body)
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

fn error_response(status: StatusCode, message: &str) -> Response<Vec<u8>> {
    let body = message.as_bytes().to_vec();
    response(
        status,
        "text/plain; charset=utf-8",
        body.len() as u64,
        None,
        body,
    )
}

fn range_error(total_size: u64) -> Response<Vec<u8>> {
    Response::builder()
        .status(StatusCode::RANGE_NOT_SATISFIABLE)
        .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
        .header(header::ACCESS_CONTROL_ALLOW_METHODS, "GET, HEAD, OPTIONS")
        .header(header::ACCESS_CONTROL_ALLOW_HEADERS, "Range, Content-Type")
        .header(header::CONTENT_RANGE, format!("bytes */{total_size}"))
        .body(Vec::new())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

#[cfg(test)]
mod tests {
    use super::{parse_range, resource_route};

    #[test]
    fn resource_routes_are_limited_to_allowed_asset_namespaces() {
        assert_eq!(
            resource_route(&["session", "block", "hash"]),
            Some(("session", "hash"))
        );
        assert_eq!(
            resource_route(&["session", "engine", "m", "hash"]),
            Some(("session", "hash"))
        );
        assert_eq!(resource_route(&["session", "file", "etc-passwd"]), None);
        assert_eq!(
            resource_route(&["session", "block", ".."]),
            Some(("session", ".."))
        );
    }

    #[test]
    fn supports_single_and_suffix_byte_ranges() {
        assert_eq!(parse_range("bytes=2-4", 10), Ok((2, 4)));
        assert_eq!(parse_range("bytes=7-", 10), Ok((7, 9)));
        assert_eq!(parse_range("bytes=-3", 10), Ok((7, 9)));
        assert!(parse_range("bytes=10-", 10).is_err());
        assert!(parse_range("bytes=0-1,4-5", 10).is_err());
    }

    #[test]
    fn protocol_serves_only_active_session_assets_and_supports_range_reads() {
        use super::{ActiveSession, AllowedAsset, LocalResourceProtocolState};
        use std::{
            collections::HashMap,
            fs,
            path::PathBuf,
            sync::{Arc, RwLock},
            time::Instant,
        };
        use tauri::http::{Request, StatusCode};

        let root = std::env::temp_dir().join(format!("boxplay-protocol-{}", std::process::id()));
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(root.join("public-hash"), b"abcdefghij").unwrap();
        let (jobs, _receiver) = std::sync::mpsc::channel();
        let state = LocalResourceProtocolState {
            active: Arc::new(RwLock::new(Some(ActiveSession {
                id: "launch-session".into(),
                blob_root: PathBuf::from(&root),
                assets: HashMap::from([(
                    "public-hash".into(),
                    AllowedAsset {
                        size: 10,
                        content_type: "application/octet-stream".into(),
                    },
                )]),
                expires_at: Instant::now() + super::LOCAL_ASSET_SESSION_LIFETIME,
            }))),
            jobs,
        };
        let request = Request::builder()
            .method("GET")
            .uri("boxplay://localhost/launch-session/block/public-hash")
            .header("Range", "bytes=2-5")
            .body(Vec::new())
            .unwrap();
        let response = state.respond("player-game", request);
        assert_eq!(response.status(), StatusCode::PARTIAL_CONTENT);
        assert_eq!(response.body(), b"cdef");

        let forbidden = Request::builder()
            .uri("boxplay://localhost/launch-session/block/private-hash")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            state.respond("player-game", forbidden).status(),
            StatusCode::NOT_FOUND
        );
        let wrong_window = Request::builder()
            .uri("boxplay://localhost/launch-session/block/public-hash")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            state.respond("main", wrong_window).status(),
            StatusCode::FORBIDDEN
        );
        let wrong_host = Request::builder()
            .uri("boxplay://remote.example/launch-session/block/public-hash")
            .body(Vec::new())
            .unwrap();
        assert_eq!(
            state.respond("player-game", wrong_host).status(),
            StatusCode::NOT_FOUND
        );
        fs::remove_dir_all(root).unwrap();
    }
}
