use std::{env, fs, path::PathBuf};

fn main() {
    let manifest =
        PathBuf::from(env::var("CARGO_MANIFEST_DIR").expect("missing manifest directory"));
    let root_manifest = manifest.join("../../../package.json");
    println!("cargo:rerun-if-changed={}", root_manifest.display());
    let contents = fs::read_to_string(&root_manifest).expect("unable to read root package.json");
    let version = contents
        .lines()
        .find_map(|line| line.trim().strip_prefix("\"version\": ").map(str::to_owned))
        .and_then(|value| {
            value
                .trim_matches(',')
                .trim_matches('"')
                .split_whitespace()
                .next()
                .map(str::to_owned)
        })
        .filter(|value| !value.is_empty())
        .expect("root package.json has no version");
    println!("cargo:rustc-env=BOX_ROOT_VERSION={version}");
    tauri_build::build()
}
