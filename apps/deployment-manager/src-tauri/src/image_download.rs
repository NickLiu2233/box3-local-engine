//! Release-pinned image downloads. Only verified complete files reach Docker.
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImageRelease {
    pub format_version: u8,
    #[serde(default)]
    pub image: String,
    #[serde(default)]
    pub image_id: String,
    #[serde(default)]
    pub image_ids: Vec<String>,
    pub archive: String,
    pub sha256: String,
    pub image_tag: String,
    pub platform: String,
    pub size: u64,
}

impl ImageRelease {
    pub fn accepts(&self, id: &str) -> bool {
        self.image_id == id || self.image_ids.iter().any(|value| value == id)
    }
    pub fn references(&self) -> Vec<&str> {
        std::iter::once(self.image_id.as_str())
            .chain(self.image_ids.iter().map(String::as_str))
            .collect()
    }
    pub fn content_reference(&self) -> String {
        format!("{}:launcher-content-{}", self.image, &self.image_id[7..])
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ImageCatalog {
    pub format_version: u8,
    pub image_tag: String,
    pub platform: String,
    pub images: Vec<ImageRelease>,
}

impl ImageCatalog {
    pub fn validate(&self, architecture: &str) -> Result<(), String> {
        let names = [
            "creator",
            "voxa",
            "play",
            "player-service",
            "player-auth-portal",
            "server-manager",
        ];
        if self.format_version != 2
            || self.platform != format!("linux/{architecture}")
            || self.images.len() != names.len()
            || self.image_tag.is_empty()
        {
            return Err("镜像更新清单格式或架构无效".into());
        }
        for service in names {
            let matching: Vec<_> = self
                .images
                .iter()
                .filter(|i| i.image == format!("box-local-engine-{service}"))
                .collect();
            if matching.len() != 1 {
                return Err(format!("镜像更新清单缺少或重复服务：{service}"));
            }
            let image = matching[0];
            let digest = image
                .image_id
                .strip_prefix("sha256:")
                .ok_or("镜像摘要格式无效")?;
            if digest.len() != 64
                || !digest.bytes().all(|b| b.is_ascii_hexdigit())
                || image.archive
                    != format!(
                        "box-local-engine-image-{service}-{architecture}-{}.tar.gz",
                        image.sha256
                    )
                || image.platform != self.platform
                || image.format_version != 1
                || image.image_ids.is_empty()
                || image.image_ids.len() > 2
                || !image.image_ids.contains(&image.image_id)
                || image.image_ids.iter().any(|id| {
                    !id.strip_prefix("sha256:").is_some_and(|digest| {
                        digest.len() == 64 && digest.bytes().all(|b| b.is_ascii_hexdigit())
                    })
                })
                || image.image_tag.is_empty()
                || image.size == 0
                || image.sha256.len() != 64
                || !image.sha256.bytes().all(|b| b.is_ascii_hexdigit())
            {
                return Err(format!("镜像更新清单无效：{service}"));
            }
        }
        Ok(())
    }
}

pub(crate) fn embedded_release() -> Result<Option<ImageCatalog>, String> {
    option_env!("BOX_MANAGER_REMOTE_IMAGE")
        .map(|value| {
            serde_json::from_str(value).map_err(|error| format!("镜像下载信息无效：{error}"))
        })
        .transpose()
}

fn verified(path: &Path, release: &ImageRelease) -> bool {
    let Ok(mut file) = fs::File::open(path) else {
        return false;
    };
    if file.metadata().map(|meta| meta.len()).ok() != Some(release.size) {
        return false;
    }
    let mut digest = Sha256::new();
    let mut buffer = [0; 128 * 1024];
    loop {
        match file.read(&mut buffer) {
            Ok(0) => break,
            Ok(length) => digest.update(&buffer[..length]),
            Err(_) => return false,
        }
    }
    format!("{:x}", digest.finalize()).eq_ignore_ascii_case(&release.sha256)
}

fn write_download(
    mut source: impl Read,
    path: &Path,
    release: &ImageRelease,
    mut progress: impl FnMut(u64),
) -> Result<(), String> {
    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    let mut digest = Sha256::new();
    let mut total = 0u64;
    let mut buffer = [0; 128 * 1024];
    loop {
        let length = source
            .read(&mut buffer)
            .map_err(|e| format!("镜像下载中断，请重试：{e}"))?;
        if length == 0 {
            break;
        }
        total = total.checked_add(length as u64).ok_or("镜像大小无效")?;
        if total > release.size {
            return Err("镜像下载大小超过发行清单，请重试".into());
        }
        file.write_all(&buffer[..length])
            .map_err(|e| format!("无法保存镜像：{e}"))?;
        digest.update(&buffer[..length]);
        progress(total);
    }
    if total != release.size
        || !format!("{:x}", digest.finalize()).eq_ignore_ascii_case(&release.sha256)
    {
        return Err("镜像完整性校验失败，请重试下载".into());
    }
    file.sync_all().map_err(|e| e.to_string())
}

pub(crate) fn download(
    release: &ImageRelease,
    cache: &Path,
    progress: impl FnMut(u64),
) -> Result<PathBuf, String> {
    download_from_url(
        release,
        cache,
        &format!("https://assets.box3.fun/local-engine/{}", release.archive),
        progress,
    )
}

fn download_from_url(
    release: &ImageRelease,
    cache: &Path,
    url: &str,
    mut progress: impl FnMut(u64),
) -> Result<PathBuf, String> {
    fs::create_dir_all(cache).map_err(|e| format!("无法创建镜像下载目录：{e}"))?;
    let destination = cache.join(&release.archive);
    if verified(&destination, release) {
        return Ok(destination);
    }
    let partial = destination.with_extension("part");
    let result = (|| {
        let client = reqwest::blocking::Client::builder()
            .redirect(reqwest::redirect::Policy::none())
            .connect_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(3600))
            .build()
            .map_err(|e| e.to_string())?;
        let response = client
            .get(url)
            .send()
            .map_err(|e| format!("无法下载镜像：{e}"))?;
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().unwrap_or_default();
            return Err(format!("镜像下载失败（HTTP {status}）：{}", body.trim()));
        }
        write_download(response, &partial, release, &mut progress)?;
        if destination.exists() {
            fs::remove_file(&destination).map_err(|e| e.to_string())?;
        }
        fs::rename(&partial, &destination).map_err(|e| e.to_string())?;
        Ok(destination)
    })();
    if result.is_err() {
        let _ = fs::remove_file(partial);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    fn release() -> ImageRelease {
        ImageRelease {
            format_version: 1,
            image: "box-local-engine-play".into(),
            image_id: format!("sha256:{}", "a".repeat(64)),
            image_ids: vec![format!("sha256:{}", "a".repeat(64))],
            archive: "box-local-engine-images-v0.3.0-linux-arm64.tar.gz".into(),
            sha256: format!("{:x}", Sha256::digest(b"image")),
            image_tag: "v0.3.0-linux-arm64".into(),
            platform: "linux/arm64".into(),
            size: 5,
        }
    }
    #[test]
    fn catalog_rejects_duplicate_missing_images_wrong_architecture_and_archive_paths() {
        let names = [
            "creator",
            "voxa",
            "play",
            "player-service",
            "player-auth-portal",
            "server-manager",
        ];
        let mut catalog = ImageCatalog {
            format_version: 2,
            image_tag: "release".into(),
            platform: "linux/arm64".into(),
            images: names
                .iter()
                .map(|name| ImageRelease {
                    image: format!("box-local-engine-{name}"),
                    archive: format!(
                        "box-local-engine-image-{name}-arm64-{}.tar.gz",
                        release().sha256
                    ),
                    ..release()
                })
                .collect(),
        };
        assert!(catalog.validate("arm64").is_ok());
        assert!(catalog.validate("amd64").is_err());
        catalog.images[0].archive = "../outside.tar.gz".into();
        assert!(catalog.validate("arm64").is_err());
        catalog.images[0] = ImageRelease {
            image: "box-local-engine-play".into(),
            ..release()
        };
        assert!(catalog.validate("arm64").is_err());
        catalog.images.pop();
        assert!(catalog.validate("arm64").is_err());
    }
    #[test]
    fn verifies_stream_and_rejects_truncation_corruption_and_oversize() {
        let dir = std::env::temp_dir().join(format!("box-image-download-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("test.part");
        let r = release();
        for data in [b"imag".as_slice(), b"wrong", b"images"] {
            assert!(write_download(data, &path, &r, |_| {}).is_err());
            assert!(!verified(&path, &r));
        }
        write_download(b"image".as_slice(), &path, &r, |_| {}).unwrap();
        assert!(verified(&path, &r));
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn http_download_cleans_failures_retries_and_reuses_verified_cache() {
        use std::net::TcpListener;
        let dir = std::env::temp_dir().join(format!("box-image-http-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let r = release();
        let destination = dir.join(&r.archive);
        let partial = destination.with_extension("part");
        fs::write(&destination, b"old").unwrap();
        for (status, body, expected_ok) in [
            ("200 OK", "wrong", false),
            ("200 OK", "imag", false),
            ("503 Unavailable", "error", false),
            ("302 Found", "image", false),
            ("200 OK", "image", true),
        ] {
            let listener = TcpListener::bind("127.0.0.1:0").unwrap();
            let url = format!("http://{}", listener.local_addr().unwrap());
            let server = std::thread::spawn(move || {
                let (mut socket, _) = listener.accept().unwrap();
                socket
                    .set_read_timeout(Some(Duration::from_secs(5)))
                    .unwrap();
                let mut request = [0; 4096];
                socket.read(&mut request).unwrap();
                write!(
                    socket,
                    "HTTP/1.1 {status}\r\nContent-Length: 5\r\nConnection: close\r\n\r\n{body}"
                )
                .unwrap();
            });
            let result = download_from_url(&r, &dir, &url, |_| {});
            server.join().unwrap();
            assert_eq!(result.is_ok(), expected_ok);
            assert!(!partial.exists());
            if !expected_ok {
                assert_eq!(fs::read(&destination).unwrap(), b"old");
            }
        }
        // A dead endpoint proves that retrying Docker import reuses verified bytes.
        assert!(download_from_url(&r, &dir, "http://127.0.0.1:1", |_| {}).is_ok());
        fs::remove_dir_all(dir).unwrap();
    }
}
