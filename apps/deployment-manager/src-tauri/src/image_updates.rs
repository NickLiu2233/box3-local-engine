//! Per-service acquisition and conservative cleanup of replaced images.
use crate::image_download::{ImageCatalog, ImageRelease};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PendingImage {
    pub service: String,
    pub old_id: String,
    pub new_id: String,
}

pub(crate) trait Runtime {
    fn docker(&self, args: &[&str]) -> Result<String, String>;
    fn acquire(&self, image: &ImageRelease) -> Result<PathBuf, String>;
    fn discard(&self, archive: PathBuf);
    fn pending(&self) -> Result<Vec<PendingImage>, String>;
    fn save(&self, pending: &[PendingImage]) -> Result<(), String>;
    fn previous(&self, service: &str) -> Result<Vec<String>, String>;
    fn ready(&self, service: &str, image: &ImageRelease) -> Result<bool, String>;
}

fn image_id(runtime: &impl Runtime, reference: &str) -> Option<String> {
    runtime
        .docker(&["image", "inspect", reference, "--format", "{{.Id}}"])
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|id| valid_id(id))
}

fn valid_id(id: &str) -> bool {
    id.strip_prefix("sha256:")
        .is_some_and(|digest| digest.len() == 64 && digest.bytes().all(|b| b.is_ascii_hexdigit()))
}

fn installed(runtime: &impl Runtime, image: &ImageRelease) -> Option<String> {
    image_id(runtime, &image.content_reference())
        .filter(|id| image.accepts(id))
        .or_else(|| {
            image
                .references()
                .into_iter()
                .find_map(|reference| image_id(runtime, reference).filter(|id| image.accepts(id)))
        })
}

pub(crate) fn prepare(
    catalog: &ImageCatalog,
    tag: &str,
    runtime: &impl Runtime,
) -> Result<(), String> {
    let mut pending = runtime.pending()?;
    for image in &catalog.images {
        let service = image
            .image
            .strip_prefix("box-local-engine-")
            .ok_or("镜像名称无效")?;
        if service == "server-manager" {
            continue;
        }
        let reference = format!("{}:{tag}", image.image);
        let previous = image_id(runtime, &reference);
        let mut old_ids = runtime.previous(service)?;
        if let Some(id) = &previous {
            old_ids.push(id.clone());
        }
        old_ids.sort();
        old_ids.dedup();
        for old_id in old_ids {
            if image.accepts(&old_id) || !valid_id(&old_id) {
                continue;
            }
            // Keep the old bytes addressable even when the release reuses a tag.
            let rollback = format!("{}:launcher-rollback-{}", image.image, &old_id[7..]);
            runtime.docker(&["image", "tag", &old_id, &rollback])?;
            if let Some(record) = pending
                .iter_mut()
                .find(|p| p.service == service && p.old_id == old_id)
            {
                record.new_id = image.image_id.clone();
            } else {
                pending.push(PendingImage {
                    service: service.into(),
                    old_id,
                    new_id: image.image_id.clone(),
                });
            }
            runtime.save(&pending)?;
        }
        if previous.as_deref().is_some_and(|id| image.accepts(id)) {
            continue;
        }
        let mut actual = installed(runtime, image);
        let archive = if actual.is_none() {
            let archive = runtime.acquire(image)?;
            runtime.docker(&["load", "-i", &archive.to_string_lossy()])?;
            actual = installed(runtime, image);
            if actual.is_none() {
                return Err(format!("导入的镜像摘要不匹配：{service}"));
            }
            Some(archive)
        } else {
            None
        };
        let actual = actual.ok_or("导入镜像未找到")?;
        for record in pending
            .iter_mut()
            .filter(|record| record.service == service)
        {
            record.new_id = actual.clone();
        }
        runtime.save(&pending)?;
        runtime.docker(&["image", "tag", &actual, &reference])?;
        if let Some(archive) = archive {
            runtime.discard(archive);
        }
    }
    Ok(())
}

pub(crate) fn finalize(catalog: &ImageCatalog, runtime: &impl Runtime) -> Result<(), String> {
    let mut remaining = Vec::new();
    for record in runtime.pending()? {
        let wanted = catalog
            .images
            .iter()
            .find(|i| i.image == format!("box-local-engine-{}", record.service));
        let Some(wanted) = wanted else {
            remaining.push(record);
            continue;
        };
        // Reverting to a prior release must never delete the image it now wants.
        if catalog.images.iter().any(|i| i.accepts(&record.old_id)) {
            remaining.push(record);
            continue;
        }
        if !valid_id(&record.old_id)
            || !wanted.accepts(&record.new_id)
            || !runtime.ready(&record.service, wanted)?
        {
            remaining.push(record);
            continue;
        }
        if image_id(runtime, &record.old_id).is_none() {
            continue;
        }
        // Include stopped containers and containers outside our Compose project.
        let users = runtime.docker(&[
            "ps",
            "--all",
            "--quiet",
            "--filter",
            &format!("ancestor={}", record.old_id),
        ])?;
        if !users.trim().is_empty() {
            remaining.push(record);
            continue;
        }
        let tags = runtime.docker(&[
            "image",
            "inspect",
            &record.old_id,
            "--format",
            "{{json .RepoTags}}",
        ])?;
        let tags: Option<Vec<String>> = serde_json::from_str(&tags).map_err(|e| e.to_string())?;
        let tags = tags.unwrap_or_default();
        if tags.iter().any(|tag| {
            !catalog
                .images
                .iter()
                .any(|i| tag.starts_with(&format!("{}:", i.image)))
        }) {
            remaining.push(record);
            continue;
        }
        let mut args = vec!["image", "rm"];
        if tags.is_empty() {
            args.push(&record.old_id);
        } else {
            args.extend(tags.iter().map(String::as_str));
        }
        // Never force deletion. A concurrent Docker user can still prevent it.
        if runtime.docker(&args).is_err() {
            remaining.push(record);
        }
    }
    runtime.save(&remaining)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        cell::RefCell,
        collections::{BTreeMap, BTreeSet},
    };
    fn id(character: char) -> String {
        format!("sha256:{}", character.to_string().repeat(64))
    }
    fn catalog() -> ImageCatalog {
        ImageCatalog {
            format_version: 2,
            image_tag: "new".into(),
            platform: "linux/arm64".into(),
            images: vec![ImageRelease {
                format_version: 1,
                image: "box-local-engine-play".into(),
                image_id: id('b'),
                image_ids: vec![id('b')],
                archive: "image.tar.gz".into(),
                sha256: "b".repeat(64),
                image_tag: "same-version".into(),
                platform: "linux/arm64".into(),
                size: 1,
            }],
        }
    }
    struct Fake {
        ids: RefCell<BTreeSet<String>>,
        tags: RefCell<BTreeMap<String, String>>,
        records: RefCell<Vec<PendingImage>>,
        downloads: RefCell<usize>,
        commands: RefCell<Vec<Vec<String>>>,
        ready: bool,
        used: bool,
        load_fails: bool,
        previous: Vec<String>,
    }
    impl Fake {
        fn new() -> Self {
            Self {
                ids: RefCell::new(BTreeSet::from([id('a')])),
                tags: RefCell::new(BTreeMap::from([(
                    "box-local-engine-play:same-version".into(),
                    id('a'),
                )])),
                records: RefCell::new(vec![]),
                downloads: RefCell::new(0),
                commands: RefCell::new(vec![]),
                ready: true,
                used: false,
                load_fails: false,
                previous: vec![id('a')],
            }
        }
    }
    impl Runtime for Fake {
        fn docker(&self, args: &[&str]) -> Result<String, String> {
            self.commands
                .borrow_mut()
                .push(args.iter().map(|s| s.to_string()).collect());
            match args {
                ["image", "inspect", reference, "--format", "{{.Id}}"] => {
                    if self.ids.borrow().contains(*reference) {
                        Ok(reference.to_string())
                    } else {
                        self.tags
                            .borrow()
                            .get(*reference)
                            .cloned()
                            .ok_or("missing".into())
                    }
                }
                ["image", "inspect", image, "--format", "{{json .RepoTags}}"] => {
                    Ok(serde_json::to_string(
                        &self
                            .tags
                            .borrow()
                            .iter()
                            .filter(|(_, value)| *value == image)
                            .map(|(tag, _)| tag)
                            .collect::<Vec<_>>(),
                    )
                    .unwrap())
                }
                ["image", "tag", image, reference] => {
                    self.tags
                        .borrow_mut()
                        .insert(reference.to_string(), image.to_string());
                    Ok(String::new())
                }
                ["load", "-i", _] => {
                    if self.load_fails {
                        Err("load failed".into())
                    } else {
                        self.ids.borrow_mut().insert(id('b'));
                        Ok(String::new())
                    }
                }
                ["ps", ..] => Ok(if self.used {
                    "stopped-foreign-container".into()
                } else {
                    String::new()
                }),
                ["image", "rm", refs @ ..] => {
                    for reference in refs {
                        self.tags.borrow_mut().remove(*reference);
                    }
                    if !self.tags.borrow().values().any(|value| value == &id('a')) {
                        self.ids.borrow_mut().remove(&id('a'));
                    }
                    Ok(String::new())
                }
                _ => panic!("Unexpected command: {args:?}"),
            }
        }
        fn acquire(&self, _: &ImageRelease) -> Result<PathBuf, String> {
            *self.downloads.borrow_mut() += 1;
            Ok("cache.tar.gz".into())
        }
        fn discard(&self, _: PathBuf) {}
        fn pending(&self) -> Result<Vec<PendingImage>, String> {
            Ok(self.records.borrow().clone())
        }
        fn save(&self, records: &[PendingImage]) -> Result<(), String> {
            *self.records.borrow_mut() = records.to_vec();
            Ok(())
        }
        fn previous(&self, _: &str) -> Result<Vec<String>, String> {
            Ok(self.previous.clone())
        }
        fn ready(&self, _: &str, _: &ImageRelease) -> Result<bool, String> {
            Ok(self.ready)
        }
    }
    #[test]
    fn unchanged_content_is_reused_across_launcher_versions_without_download() {
        let mut fake = Fake::new();
        fake.previous.clear();
        fake.ids.borrow_mut().insert(id('b'));
        fake.tags
            .borrow_mut()
            .insert("box-local-engine-play:same-version".into(), id('b'));
        prepare(&catalog(), "next-launcher", &fake).unwrap();
        assert_eq!(*fake.downloads.borrow(), 0);
        assert_eq!(
            fake.tags.borrow()["box-local-engine-play:next-launcher"],
            id('b')
        );
    }
    #[test]
    fn alternate_classic_docker_id_reuses_content_and_records_actual_id() {
        let fake = Fake::new();
        fake.ids.borrow_mut().insert(id('c'));
        let mut catalog = catalog();
        catalog.images[0].image_ids.push(id('c'));
        prepare(&catalog, "next-launcher", &fake).unwrap();
        assert_eq!(*fake.downloads.borrow(), 0);
        assert_eq!(
            fake.tags.borrow()["box-local-engine-play:next-launcher"],
            id('c')
        );
        assert_eq!(fake.records.borrow()[0].new_id, id('c'));
        finalize(&catalog, &fake).unwrap();
        assert!(!fake.ids.borrow().contains(&id('a')));
    }
    #[test]
    fn changed_content_with_unchanged_version_downloads_once_then_cleans_old_image() {
        let fake = Fake::new();
        prepare(&catalog(), "same-version", &fake).unwrap();
        assert_eq!(*fake.downloads.borrow(), 1);
        assert!(fake.ids.borrow().contains(&id('a')));
        assert_eq!(fake.records.borrow().len(), 1);
        finalize(&catalog(), &fake).unwrap();
        assert!(!fake.ids.borrow().contains(&id('a')));
        assert!(fake.records.borrow().is_empty());
        assert!(!fake
            .commands
            .borrow()
            .iter()
            .flatten()
            .any(|arg| arg == "--force"));
    }
    #[test]
    fn failed_import_preserves_old_tag_and_rollback_record() {
        let mut fake = Fake::new();
        fake.load_fails = true;
        assert!(prepare(&catalog(), "same-version", &fake).is_err());
        assert_eq!(
            fake.tags.borrow()["box-local-engine-play:same-version"],
            id('a')
        );
        assert_eq!(fake.records.borrow().len(), 1);
    }
    #[test]
    fn unhealthy_new_service_or_any_container_using_old_image_prevents_deletion() {
        for (ready, used) in [(false, false), (true, true)] {
            let mut fake = Fake::new();
            fake.ready = ready;
            fake.used = used;
            prepare(&catalog(), "same-version", &fake).unwrap();
            finalize(&catalog(), &fake).unwrap();
            assert!(fake.ids.borrow().contains(&id('a')));
            assert_eq!(fake.records.borrow().len(), 1);
        }
    }
    #[test]
    fn foreign_tags_are_not_deleted() {
        let fake = Fake::new();
        fake.tags
            .borrow_mut()
            .insert("another-project:stable".into(), id('a'));
        prepare(&catalog(), "new-launcher", &fake).unwrap();
        finalize(&catalog(), &fake).unwrap();
        assert!(fake.ids.borrow().contains(&id('a')));
        assert_eq!(fake.records.borrow().len(), 1);
    }
}
