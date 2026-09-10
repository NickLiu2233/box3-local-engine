//! Bounded progress records for authenticated HTTP commands. No worker or
//! request is held while a client polls. Finished records expire after 5 min.
use box_manager_core::services::InstallProgress;
use std::{
    collections::BTreeMap,
    sync::Mutex,
    time::{Duration, Instant},
};

struct Record {
    progress: InstallProgress,
    updated: Instant,
    finished: bool,
}
#[derive(Default)]
pub struct Operations(Mutex<BTreeMap<String, Record>>);
impl Operations {
    pub fn begin(&self, id: &str) -> Result<(), String> {
        if !(16..=80).contains(&id.len())
            || !id
                .bytes()
                .all(|b| b.is_ascii_alphanumeric() || b"-_".contains(&b))
        {
            return Err("任务标识无效".into());
        }
        let mut records = self.0.lock().map_err(|_| "任务进度不可用")?;
        records.retain(|_, r| !r.finished || r.updated.elapsed() < Duration::from_secs(300));
        if records.contains_key(id) {
            return Err("任务标识已使用，请重新发起操作".into());
        }
        if records.len() >= 256 {
            let oldest = records
                .iter()
                .filter(|(_, r)| r.finished)
                .min_by_key(|(_, r)| r.updated)
                .map(|(id, _)| id.clone());
            if let Some(id) = oldest {
                records.remove(&id);
            } else {
                return Err("正在执行的任务过多，请稍后重试".into());
            }
        }
        records.insert(
            id.into(),
            Record {
                progress: InstallProgress {
                    stage: "queued".into(),
                    message: "正在准备操作…".into(),
                    percent: 0,
                },
                updated: Instant::now(),
                finished: false,
            },
        );
        Ok(())
    }
    pub fn update(&self, id: &str, stage: &str, message: &str, percent: u8, finished: bool) {
        if let Ok(mut records) = self.0.lock() {
            if let Some(record) = records.get_mut(id) {
                if record.finished {
                    return;
                }
                record.progress = InstallProgress {
                    stage: stage.into(),
                    message: message.into(),
                    percent: percent.min(100),
                };
                record.updated = Instant::now();
                record.finished = finished;
            }
        }
    }
    pub fn get(&self, id: &str) -> Option<InstallProgress> {
        let mut records = self.0.lock().ok()?;
        if records
            .get(id)
            .is_some_and(|r| r.finished && r.updated.elapsed() >= Duration::from_secs(300))
        {
            records.remove(id);
        }
        records.get(id).map(|r| r.progress.clone())
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn isolates_operations_and_keeps_final_result() {
        let records = Operations::default();
        let a = "operation-00000001";
        let b = "operation-00000002";
        records.begin(a).unwrap();
        records.begin(b).unwrap();
        records.update(a, "database", "starting", 45, false);
        assert_eq!(records.get(a).unwrap().percent, 45);
        assert_eq!(records.get(b).unwrap().percent, 0);
        records.update(a, "error", "failed", 100, true);
        records.update(a, "start", "late event", 65, false);
        assert_eq!(records.get(a).unwrap().stage, "error");
        assert!(records.begin(a).is_err());
        assert!(records.begin("../invalid").is_err());
    }
    #[test]
    fn expires_completed_operations() {
        let records = Operations::default();
        let id = "operation-00000003";
        records.begin(id).unwrap();
        records.update(id, "complete", "done", 100, true);
        records.0.lock().unwrap().get_mut(id).unwrap().updated =
            Instant::now() - Duration::from_secs(301);
        assert!(records.get(id).is_none());
    }
}
