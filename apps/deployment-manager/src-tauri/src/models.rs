//! Data contracts shared by the Tauri command implementations.
//!
//! These types intentionally contain no filesystem, Docker, or configuration
//! behavior. Keeping the serialization contract here lets `commands` focus on
//! orchestration while the frontend-facing shape remains explicit and stable.

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct OfflineImageManifest {
    pub(crate) format_version: u8,
    pub(crate) archive: String,
    pub(crate) sha256: String,
    pub(crate) image_tag: String,
    pub(crate) platform: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct AboutInfo {
    pub(crate) application_version: String,
    pub(crate) image_tag: String,
    pub(crate) source_revision: String,
    pub(crate) build_created_at: String,
    pub(crate) build_source: String,
    pub(crate) platform: String,
    pub(crate) architecture: String,
    pub(crate) license: String,
    pub(crate) service_images: Vec<ServiceImageInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ServiceImageInfo {
    pub(crate) name: String,
    pub(crate) image: String,
    pub(crate) tag: String,
    pub(crate) platform: String,
    pub(crate) image_id: String,
    pub(crate) created_at: String,
    pub(crate) source_revision: String,
    pub(crate) build_source: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EmbeddedImageInfo {
    pub(crate) images: Vec<EmbeddedServiceImageInfo>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EmbeddedServiceImageInfo {
    pub(crate) image: String,
    pub(crate) tag: String,
    pub(crate) image_id: String,
    pub(crate) created_at: String,
    pub(crate) platform: String,
    pub(crate) source_revision: String,
    pub(crate) build_source: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LegalNotices {
    pub(crate) license_name: String,
    pub(crate) license_text: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ServiceStatus {
    pub(crate) name: String,
    pub(crate) enabled: bool,
    pub(crate) running: bool,
    pub(crate) state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SystemStatus {
    pub(crate) docker_ready: bool,
    pub(crate) docker_message: String,
    pub(crate) configured: bool,
    pub(crate) all_healthy: bool,
    pub(crate) services: Vec<ServiceStatus>,
    pub(crate) data_directory: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ServicePerformance {
    pub(crate) name: String,
    pub(crate) enabled: bool,
    pub(crate) running: bool,
    pub(crate) cpu_percent: f64,
    pub(crate) memory_usage: String,
    pub(crate) memory_limit: String,
    pub(crate) memory_percent: f64,
    pub(crate) pids: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PerformanceStatus {
    pub(crate) sampled_at: u128,
    pub(crate) services: Vec<ServicePerformance>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BackupInfo {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) size_bytes: u64,
    pub(crate) modified_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct EnvironmentCheck {
    pub(crate) id: String,
    pub(crate) label: String,
    pub(crate) level: String,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ConnectionTest {
    pub(crate) ok: bool,
    pub(crate) message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InstallProgress {
    pub(crate) stage: String,
    pub(crate) message: String,
    pub(crate) percent: u8,
}
