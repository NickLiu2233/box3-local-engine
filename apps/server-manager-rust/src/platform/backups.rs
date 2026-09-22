//! Backup archive storage and restore orchestration.

use crate::*;

pub(crate) fn backup_dir(app: &App) -> PathBuf {
    app.root.join("apps/local-engine/backups")
}

pub(crate) fn backup_file(app: &App, value: &str) -> Result<PathBuf, String> {
    backup_store::resolve(&backup_dir(app), value)
}

pub(crate) fn list_backups(app: &App) -> Result<Value, String> {
    serde_json::to_value(backup_store::list(&backup_dir(app))?).map_err(|error| error.to_string())
}

pub(crate) fn create_backup(app: &App) -> Result<String, String> {
    app.progress("backup", "正在创建数据备份…", 20);
    backup_store::create(&app.root, &backup_dir(app))
}

pub(crate) fn restore_backup(app: &App, value: &str) -> Result<Option<String>, String> {
    let archive = backup_file(app, value)?;
    app.progress("restore-validate", "正在校验备份…", 10);
    let report = backup::restore_archive(&app.root, &archive, backup::Limits::default(), |_| {
        services::stop(&WebRuntime(app))?;
        app.progress("restore", "正在恢复数据…", 50);
        Ok(())
    })?;
    Ok(report.cleanup_warning)
}
