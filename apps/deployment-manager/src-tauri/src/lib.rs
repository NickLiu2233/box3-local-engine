//! Thin crate entry point. Tauri command implementations live in `commands`.

mod commands;
mod updates;

pub use commands::run;
