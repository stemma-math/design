//! The inline bundle is the same, byte for byte, as `tools/bundle.py`
//! gives for the same options. `bundles.tsv` holds that script's results:
//! the length and the FNV-1a hash of each.

use stemma_design::bundle::{Bundle, Faces, Subset};

fn fnv1a64(text: &str) -> String {
    let mut hash: u64 = 0xcbf2_9ce4_8422_2325;
    for byte in text.bytes() {
        hash ^= u64::from(byte);
        hash = hash.wrapping_mul(0x0100_0000_01b3);
    }
    format!("{hash:016x}")
}

fn list(field: &str) -> Vec<&str> {
    field.split(',').filter(|item| !item.is_empty()).collect()
}

fn faces(field: &str) -> Vec<Faces> {
    list(field)
        .into_iter()
        .map(|name| match name {
            "ui" => Faces::Ui,
            "prose" => Faces::Prose,
            "mono" => Faces::Mono,
            other => panic!("unknown faces {other}"),
        })
        .collect()
}

fn subsets(field: &str) -> Vec<Subset> {
    list(field)
        .into_iter()
        .map(|name| match name {
            "latin" => Subset::Latin,
            "latin-ext" => Subset::LatinExt,
            "greek" => Subset::Greek,
            "cyrillic" => Subset::Cyrillic,
            "symbols" => Subset::Symbols,
            other => panic!("unknown subset {other}"),
        })
        .collect()
}

#[cfg(feature = "elements")]
fn with_elements(bundle: Bundle, field: &str) -> Option<Bundle> {
    use stemma_design::bundle::Element;
    let elements: Vec<Element> = list(field)
        .into_iter()
        .map(|name| {
            *Element::ALL
                .iter()
                .find(|element| element.module() == name)
                .unwrap_or_else(|| panic!("unknown element {name}"))
        })
        .collect();
    Some(bundle.elements(&elements))
}

#[cfg(not(feature = "elements"))]
fn with_elements(bundle: Bundle, field: &str) -> Option<Bundle> {
    // Without the feature, only the bundles without elements can be built.
    list(field).is_empty().then_some(bundle)
}

#[test]
fn bundles_match_the_script() {
    let mut compared = 0;
    for line in include_str!("bundles.tsv").lines() {
        if line.starts_with('#') {
            continue;
        }
        let fields: Vec<&str> = line.split('\t').collect();
        let [
            faces_f,
            math,
            subsets_f,
            weights,
            elements,
            sprite,
            length,
            hash,
        ] = fields[..]
        else {
            panic!("a malformed line: {line}");
        };
        let weights: Vec<u16> = list(weights).iter().map(|w| w.parse().unwrap()).collect();
        let bundle = Bundle::default()
            .faces(&faces(faces_f))
            .math(math == "true")
            .subsets(&subsets(subsets_f))
            .weights(&weights)
            .sprite(sprite == "true");
        let Some(bundle) = with_elements(bundle, elements) else {
            continue;
        };
        let html = bundle.render();
        assert_eq!(html.len().to_string(), length, "length of {line}");
        assert_eq!(fnv1a64(&html), hash, "hash of {line}");
        compared += 1;
    }
    assert!(compared >= 2);
}

#[test]
fn the_bundle_needs_no_other_file() {
    let html = Bundle::default()
        .faces(&[Faces::Ui, Faces::Prose, Faces::Mono])
        .math(true)
        .render();
    assert!(!html.contains("url(\"fonts/"));
    assert!(!html.contains("url(\"noise.svg\")"));
    assert!(html.contains("New Computer Modern Math"));
}
