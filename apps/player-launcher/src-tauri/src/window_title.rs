fn clean_title_part(value: &str, maximum_chars: usize) -> String {
    value
        .chars()
        .filter(|character| !character.is_control())
        .take(maximum_chars)
        .collect::<String>()
        .trim()
        .to_owned()
}

pub(crate) fn map_window_title(map_name: &str, release_version: &str) -> String {
    let map_name = clean_title_part(map_name, 80);
    let map_name = if map_name.is_empty() {
        "BOX3 Player"
    } else {
        &map_name
    };
    let version = clean_title_part(release_version, 48);
    let version = if version.is_empty() {
        "未知版本".to_owned()
    } else if version.starts_with('v') || version.starts_with('V') {
        version
    } else {
        format!("v{version}")
    };
    format!("{map_name} · {version}")
}

#[cfg(test)]
mod tests {
    use super::map_window_title;

    #[test]
    fn includes_map_name_and_version() {
        assert_eq!(
            map_window_title("云端迁移地图", "1.0.0"),
            "云端迁移地图 · v1.0.0"
        );
    }

    #[test]
    fn does_not_duplicate_version_prefix() {
        assert_eq!(map_window_title("测试地图", "v1.2.0"), "测试地图 · v1.2.0");
    }

    #[test]
    fn strips_control_characters_and_uses_a_safe_name_fallback() {
        assert_eq!(map_window_title("\n", "1.0.0"), "BOX3 Player · v1.0.0");
        assert_eq!(map_window_title("Map\nName", "1.0.0"), "MapName · v1.0.0");
    }
}
