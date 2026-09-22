#![recursion_limit = "256"]

use axum::{
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::Utc;
use rand::{rngs::OsRng, RngCore};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::{
    collections::BTreeMap,
    env, fs,
    io::{Read, Write},
    net::{SocketAddr, TcpStream, ToSocketAddrs},
    path::{Path as FsPath, PathBuf},
    process::Command,
    sync::Arc,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tower_http::services::ServeDir;

mod http {
    pub(crate) mod commands;
    pub(crate) mod web;
}
mod operations;
mod platform {
    pub(crate) mod backups;
    pub(crate) mod configuration;
    pub(crate) mod monitoring;
    pub(crate) mod security_data;
}
mod runtime {
    pub(crate) mod catalog;
    pub(crate) mod map_runtimes;
    pub(crate) mod runtime;
}
#[cfg(test)]
mod tests;
use box_manager_core::configuration as shared_config;
use box_manager_core::configuration_migration::{
    clear_overrides_on_configuration_change, migrate_document,
};
use box_manager_core::environment::parse_env;
use box_manager_core::map_runtime_profiles::{
    valid_permanent_map_id, validate_map_runtime_profile, MapRuntimeProfile, MapRuntimeProfilesFile,
};
use box_manager_core::services::{
    self, Runtime as ServiceRuntime, APPLICATION_SERVICES as SERVICES,
};
use box_manager_core::{backup, backup_store};
use http::web::*;
use operations::Operations;
use platform::backups::{backup_dir, backup_file, create_backup, list_backups, restore_backup};
use platform::configuration::*;
use platform::monitoring::*;
use platform::security_data::*;
use runtime::map_runtimes::*;
use shared_config::{
    database_url, validate_configuration, validate_host, validate_raw_environment,
};

const KEY: &str = include_str!("../../../distribution/license-public-key.pem");
const LEGAL_NOTICE: &str = include_str!("../../../distribution/LICENSE.txt");
#[derive(Clone)]
/// Immutable dependencies for one management request.
///
/// `operation_id` is populated only after the HTTP layer accepts a client
/// supplied operation key, so synchronous modules can report progress without
/// knowing anything about HTTP headers.
struct App {
    root: PathBuf,
    token: String,
    runtime_token: String,
    compose_file: PathBuf,
    environment_file: PathBuf,
    operations: Arc<Operations>,
    operation_id: Option<String>,
}
impl App {
    /// Publishes a non-terminal progress update when this invocation belongs
    /// to a long-running, browser-polled operation.
    fn progress(&self, stage: &str, message: &str, percent: u8) {
        if let Some(id) = &self.operation_id {
            self.operations.update(id, stage, message, percent, false);
        }
    }
}
struct WebRuntime<'a>(&'a App);
/// Adapter from the shared service-control module to this manager's local
/// configuration, Compose runner and progress store.
impl ServiceRuntime for WebRuntime<'_> {
    fn require_license(&self) -> Result<(), String> {
        if license(self.0, None)?
            .get("valid")
            .and_then(Value::as_bool)
            .unwrap_or(false)
        {
            Ok(())
        } else {
            Err("请先安装有效许可证".into())
        }
    }
    fn prepare_images(&self) -> Result<(), String> {
        generate_runtime_environment(self.0)?;
        database_url(&parse_env(
            &fs::read_to_string(env_path(self.0)).map_err(|e| e.to_string())?,
        ))?;
        docker(&["info", "--format", "{{.ServerVersion}}"])?;
        Ok(())
    }
    fn managed_enabled(&self, service: &str) -> bool {
        let key = match service {
            "managed-postgres" => "BOX_DATABASE_MODE",
            "managed-redis" => "BOX_REDIS_MODE",
            _ => return false,
        };
        parse_env(&fs::read_to_string(env_path(self.0)).unwrap_or_default())
            .get(key)
            .is_some_and(|mode| mode == "managed")
    }
    fn check_managed(&self, service: &str) -> Result<(), String> {
        if !self.managed_enabled(service) {
            return Err("该内置基础服务尚未启用".into());
        }
        let values = parse_env(&fs::read_to_string(env_path(self.0)).map_err(|e| e.to_string())?);
        let image = managed_image(
            &values,
            if service == "managed-postgres" {
                "postgresql"
            } else {
                "redis"
            },
        )?;
        docker(&["image", "inspect", &image])
            .map_err(|_| "该内置基础服务尚未安装，请先在数据配置中下载镜像".to_string())?;
        Ok(())
    }
    fn compose(&self, args: &[&str]) -> Result<(), String> {
        compose(self.0, args).map(|_| ())
    }
    fn progress(&self, stage: &str, message: &str, percent: u8) {
        self.0.progress(stage, message, percent);
    }
}

#[derive(Deserialize)]
struct Request {
    #[serde(flatten)]
    body: BTreeMap<String, Value>,
}
use box_manager_core::license as shared_license;
#[cfg(test)]
use shared_license::LicensePayload;
#[derive(Serialize)]
struct Error {
    message: String,
}

fn fail(message: impl Into<String>) -> Response {
    (
        StatusCode::BAD_REQUEST,
        Json(Error {
            message: message.into(),
        }),
    )
        .into_response()
}
#[tokio::main(flavor = "current_thread")]
async fn main() {
    if env::args().nth(1).as_deref() == Some("--healthcheck") {
        if let Err(error) = run_healthcheck() {
            eprintln!("{error}");
            std::process::exit(1);
        }
        return;
    }
    let root = env::var("BOX_SERVER_MANAGER_ROOT").unwrap_or_else(|_| "/workspace".into());
    let root_path = PathBuf::from(&root);
    let token = env::var("BOX_SERVER_MANAGER_TOKEN").expect("BOX_SERVER_MANAGER_TOKEN is required");
    let runtime_token =
        env::var("BOX_RUNTIME_MANAGER_TOKEN").expect("BOX_RUNTIME_MANAGER_TOKEN is required");
    assert!(
        token.len() >= 32,
        "BOX_SERVER_MANAGER_TOKEN must be at least 32 characters"
    );
    assert!(
        runtime_token.len() >= 32,
        "BOX_RUNTIME_MANAGER_TOKEN must be at least 32 characters"
    );
    let app = Arc::new(App {
        root: root_path.clone(),
        token,
        runtime_token,
        compose_file: env::var("BOX_SERVER_MANAGER_COMPOSE_FILE")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_path.join("compose.yml")),
        operations: Arc::new(Operations::default()),
        operation_id: None,
        environment_file: env::var("BOX_SERVER_MANAGER_ENV_FILE")
            .map(PathBuf::from)
            .unwrap_or_else(|_| root_path.join(".env")),
    });
    initialize_license_storage(&app)
        .expect("unable to initialize the license device file before serving requests");
    let router = Router::new()
        .route("/", get(index))
        .route("/api/health", get(health))
        .route(
            "/api/runtime/ensure",
            post(runtime::runtime::ensure_runtime_container),
        )
        .route(
            "/api/runtime/{container_id}",
            delete(runtime::runtime::delete_runtime_container),
        )
        .route(
            "/api/runtime/{container_id}/stats",
            get(runtime::runtime::get_runtime_container_stats),
        )
        .route("/api/backups/upload", post(upload_backup))
        .route("/api/backups/{archive}/download", get(download_backup))
        .route(
            "/api/diagnostics/{archive}/download",
            get(download_diagnostics),
        )
        .route("/api/commands/{name}", post(http::commands::command))
        .route("/api/operations/{id}", get(operation_progress))
        .layer(DefaultBodyLimit::max(512 * 1024 * 1024))
        .fallback_service(ServeDir::new(public_directory()).append_index_html_on_directories(true))
        .layer(middleware::from_fn(security))
        .with_state(app);
    let host = env::var("BOX_SERVER_MANAGER_HOST")
        .unwrap_or_else(|_| "0.0.0.0".into())
        .parse()
        .expect("BOX_SERVER_MANAGER_HOST must be an IP address");
    let port = manager_port();
    let addr = SocketAddr::new(host, port);
    println!("BOX3 Rust server manager listening on {addr}");
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), router)
        .await
        .unwrap()
}
