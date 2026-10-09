//! Thin crate entry point. Tauri command implementations live in `commands`.

mod commands;
mod image_download;
mod image_updates;
mod updates;

pub use commands::run;
