use stemma_design::{assets, get, serve};

#[test]
fn the_web_target_is_here() {
    for path in [
        "web/index.css",
        "web/fonts.css",
        "web/tokens.css",
        "web/base.css",
        "web/document.css",
        "web/components.css",
        "web/glyphs.svg",
        "web/noise.svg",
        "web/LICENSE",
    ] {
        let asset = get(path).unwrap_or_else(|| panic!("{path} is missing"));
        assert!(!asset.bytes.is_empty());
    }
    assert_eq!(
        get("/web/tokens.css").unwrap().content_type,
        "text/css; charset=utf-8"
    );
}

#[test]
fn every_face_fonts_css_names_is_here() {
    let css = get("web/fonts.css").unwrap().text().unwrap();
    for part in css.split("url(\"").skip(1) {
        let url = &part[..part.find('"').unwrap()];
        let asset = get(&format!("web/{url}")).unwrap_or_else(|| panic!("{url} is missing"));
        assert_eq!(asset.content_type, "font/woff2");
    }
}

#[test]
fn every_asset_has_a_type_and_a_unique_path() {
    let mut paths: Vec<&str> = assets().map(|asset| asset.path).collect();
    let count = paths.len();
    paths.sort_unstable();
    paths.dedup();
    assert_eq!(paths.len(), count);
    assert!(assets().all(|asset| !asset.content_type.is_empty()));
}

#[test]
fn serving_under_a_prefix() {
    assert_eq!(
        serve("/design/", "/design/web/base.css").unwrap().path,
        "web/base.css"
    );
    assert!(serve("/design", "/design").is_none());
    assert!(serve("/design", "/designer/web/base.css").is_none());
}

#[cfg(feature = "elements")]
#[test]
fn the_elements_are_here() {
    let index = get("elements/index.js").unwrap();
    assert_eq!(index.content_type, "text/javascript; charset=utf-8");
    assert!(get("elements/LICENSE-mark").is_some());
}

#[cfg(feature = "brand-kit")]
#[test]
fn the_icons_are_here() {
    assert_eq!(
        get("brand-kit/web/favicon.svg").unwrap().content_type,
        "image/svg+xml"
    );
    assert_eq!(
        get("brand-kit/app/icon.icns").unwrap().content_type,
        "image/icns"
    );
}
