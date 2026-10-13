//! An inline bundle: everything a page kept in a single HTML file needs,
//! as one fragment for its `head`. The stylesheets, the faces as base64
//! WOFF2, the glyph sprite and, with the `elements` feature, the elements'
//! behaviour.
//!
//! It is built here, from the files this crate carries, rather than chosen
//! from bundles prepared in advance: a page asks for a few faces, ranges,
//! weights and elements, and every combination would not fit in the crate.
//! The result is the same, byte for byte, as `tools/bundle.py` gives for
//! the same options, which the tests check.
//!
//! ```
//! use stemma_design::bundle::{Bundle, Faces, Subset};
//!
//! let head = Bundle::default()
//!     .faces(&[Faces::Ui, Faces::Prose])
//!     .math(true)
//!     .subsets(&[Subset::Latin])
//!     .weights(&[400, 700])
//!     .render();
//! assert!(head.starts_with("<!-- Stemma design, inline bundle."));
//! ```

use crate::bundle_data::FONT_RULES;

/// A group of faces.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Faces {
    /// Instrument Sans, with Libertinus Sans for its Greek and symbols.
    Ui,
    /// New Computer Modern.
    Prose,
    /// JuliaMono.
    Mono,
}

impl Faces {
    fn name(self) -> &'static str {
        match self {
            Faces::Ui => "ui",
            Faces::Prose => "prose",
            Faces::Mono => "mono",
        }
    }

    fn families(self) -> &'static [&'static str] {
        match self {
            Faces::Ui => &["Instrument Sans", "Libertinus Sans"],
            Faces::Prose => &["New Computer Modern"],
            Faces::Mono => &["JuliaMono"],
        }
    }
}

/// A range of a split face.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Subset {
    Latin,
    LatinExt,
    Greek,
    Cyrillic,
    Symbols,
}

impl Subset {
    fn name(self) -> &'static str {
        match self {
            Subset::Latin => "latin",
            Subset::LatinExt => "latin-ext",
            Subset::Greek => "greek",
            Subset::Cyrillic => "cyrillic",
            Subset::Symbols => "symbols",
        }
    }
}

/// A custom element.
#[cfg(feature = "elements")]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Element {
    CopyButton,
    Dialog,
    FilterChips,
    Light,
    Mark,
    Menu,
    Range,
    Segmented,
    Select,
    Stepper,
    Tabs,
    ThemeSwitch,
    ToastRegion,
    Tooltip,
}

#[cfg(feature = "elements")]
impl Element {
    /// Every element.
    pub const ALL: [Element; 14] = [
        Element::CopyButton,
        Element::Dialog,
        Element::FilterChips,
        Element::Light,
        Element::Mark,
        Element::Menu,
        Element::Range,
        Element::Segmented,
        Element::Select,
        Element::Stepper,
        Element::Tabs,
        Element::ThemeSwitch,
        Element::ToastRegion,
        Element::Tooltip,
    ];

    /// The element's module, as `theme-switch`.
    pub fn module(self) -> &'static str {
        match self {
            Element::CopyButton => "copy-button",
            Element::Dialog => "dialog",
            Element::FilterChips => "filter-chips",
            Element::Light => "light",
            Element::Mark => "mark",
            Element::Menu => "menu",
            Element::Range => "range",
            Element::Segmented => "segmented",
            Element::Select => "select",
            Element::Stepper => "stepper",
            Element::Tabs => "tabs",
            Element::ThemeSwitch => "theme-switch",
            Element::ToastRegion => "toast-region",
            Element::Tooltip => "tooltip",
        }
    }
}

/// One `@font-face` rule of `fonts.css`, and what it is for.
pub(crate) struct FontRule {
    pub family: &'static str,
    pub weight: u16,
    pub subset: Option<&'static str>,
    pub url: &'static str,
    pub rule: &'static str,
}

/// One element module, wrapped so it can share a script with others.
#[cfg(feature = "elements")]
pub(crate) struct Module {
    pub name: &'static str,
    pub imports: &'static [&'static str],
    pub code: &'static str,
}

/// What a bundle holds. By default: the interface faces in Latin and
/// Latin Extended, every weight, the glyph sprite, and no elements.
#[derive(Clone, Debug)]
pub struct Bundle {
    faces: Vec<Faces>,
    math: bool,
    subsets: Vec<Subset>,
    weights: Vec<u16>,
    #[cfg(feature = "elements")]
    elements: Vec<Element>,
    sprite: bool,
}

impl Default for Bundle {
    fn default() -> Self {
        Bundle {
            faces: vec![Faces::Ui],
            math: false,
            subsets: vec![Subset::Latin, Subset::LatinExt],
            weights: Vec::new(),
            #[cfg(feature = "elements")]
            elements: Vec::new(),
            sprite: true,
        }
    }
}

impl Bundle {
    /// The groups of faces to embed.
    pub fn faces(mut self, faces: &[Faces]) -> Self {
        self.faces = faces.to_vec();
        self
    }

    /// Whether to embed New Computer Modern Math, whole.
    pub fn math(mut self, math: bool) -> Self {
        self.math = math;
        self
    }

    /// The ranges of the split faces to embed. JuliaMono ships whole, or,
    /// when only Latin is asked for, as upstream's Latin files alone.
    pub fn subsets(mut self, subsets: &[Subset]) -> Self {
        self.subsets = subsets.to_vec();
        self
    }

    /// The weights to embed; every weight when empty.
    pub fn weights(mut self, weights: &[u16]) -> Self {
        self.weights = weights.to_vec();
        self
    }

    /// The elements to include.
    #[cfg(feature = "elements")]
    pub fn elements(mut self, elements: &[Element]) -> Self {
        self.elements = elements.to_vec();
        self
    }

    /// Whether to include the glyph sprite.
    pub fn sprite(mut self, sprite: bool) -> Self {
        self.sprite = sprite;
        self
    }

    /// The bundle, as an HTML fragment for the page's `head`.
    pub fn render(&self) -> String {
        let mut faces: Vec<&str> = self.faces.iter().map(|f| f.name()).collect();
        if self.math {
            faces.push("math");
        }
        let subsets: Vec<&str> = self.subsets.iter().map(|s| s.name()).collect();
        let elements = self.element_names();
        let mut parts = vec![
            format!(
                "<!-- Stemma design, inline bundle. Faces: {}; subsets: {}; elements: {}. -->",
                or_none(&faces.join(", ")),
                subsets.join(", "),
                or_none(&elements.join(", ")),
            ),
            format!(
                "<style>\n{}\n\n{}</style>",
                self.font_faces(),
                stylesheets()
            ),
        ];
        if self.sprite {
            parts.push(sprite());
        }
        let script = self.behaviour();
        if !script.is_empty() {
            parts.push(format!("<script type=\"module\">\n{script}\n</script>"));
        }
        parts.join("\n") + "\n"
    }

    fn element_names(&self) -> Vec<&'static str> {
        #[cfg(feature = "elements")]
        return self.elements.iter().map(|e| e.module()).collect();
        #[cfg(not(feature = "elements"))]
        Vec::new()
    }

    fn font_faces(&self) -> String {
        let mut families: Vec<&str> = self
            .faces
            .iter()
            .flat_map(|f| f.families())
            .copied()
            .collect();
        if self.math {
            families.push("New Computer Modern Math");
        }
        let only_latin = self.subsets == [Subset::Latin];
        let subsets: Vec<&str> = self.subsets.iter().map(|s| s.name()).collect();
        let mut rules = Vec::new();
        for rule in FONT_RULES {
            if !families.contains(&rule.family) {
                continue;
            }
            if let Some(subset) = rule.subset {
                if !subsets.contains(&subset) {
                    continue;
                }
                // Libertinus Sans only stands in for what Instrument Sans lacks.
                if rule.family == "Libertinus Sans" && (subset == "latin" || subset == "latin-ext")
                {
                    continue;
                }
            }
            if !self.weights.is_empty()
                && rule.family != "New Computer Modern Math"
                && !self.weights.contains(&rule.weight)
            {
                continue;
            }
            if rule.family == "JuliaMono" && only_latin != rule.url.ends_with("Latin.woff2") {
                continue;
            }
            let bytes = asset(&format!("web/{}", rule.url));
            let data = format!("data:font/woff2;base64,{}", base64(bytes));
            rules.push(rule.rule.replacen(rule.url, &data, 1));
        }
        rules.join("\n\n")
    }

    #[cfg(feature = "elements")]
    fn behaviour(&self) -> String {
        use crate::bundle_data::MODULES;

        if self.elements.is_empty() {
            return String::new();
        }
        let module = |name: &str| {
            MODULES
                .iter()
                .find(|m| m.name == name)
                .expect("a known module")
        };
        // Dependencies first, each once, in the order the entries ask.
        fn visit(
            name: &'static str,
            module: &dyn Fn(&str) -> &'static Module,
            seen: &mut Vec<&'static str>,
            order: &mut Vec<&'static str>,
        ) {
            if seen.contains(&name) {
                return;
            }
            seen.push(name);
            let found = module(name);
            for import in found.imports {
                visit(import, module, seen, order);
            }
            order.push(found.code);
        }
        let (mut seen, mut order) = (Vec::new(), Vec::new());
        for element in &self.elements {
            visit(element.module(), &module, &mut seen, &mut order);
        }
        let mut parts = vec!["const modules = {};"];
        parts.extend(order);
        parts.join("\n\n")
    }

    #[cfg(not(feature = "elements"))]
    fn behaviour(&self) -> String {
        String::new()
    }
}

fn or_none(text: &str) -> &str {
    if text.is_empty() { "none" } else { text }
}

fn asset(path: &str) -> &'static [u8] {
    crate::get(path)
        .expect("the web target's files are all here")
        .bytes
}

fn text(path: &str) -> &'static str {
    std::str::from_utf8(asset(path)).expect("a text file")
}

fn stylesheets() -> String {
    let noise = format!(
        "url(\"data:image/svg+xml;base64,{}\")",
        base64(asset("web/noise.svg"))
    );
    [
        "tokens.css",
        "base.css",
        "document.css",
        "code.css",
        "components.css",
    ]
    .iter()
    .map(|name| text(&format!("web/{name}")).replacen("url(\"noise.svg\")", &noise, 1))
    .collect::<Vec<_>>()
    .join("\n")
}

fn sprite() -> String {
    let mut svg = text("web/glyphs.svg").to_owned();
    // The comment goes, with the space after it.
    if let (Some(start), Some(end)) = (svg.find("<!--"), svg.find("-->")) {
        let rest = &svg[end + 3..];
        let after = end + 3 + (rest.len() - rest.trim_start().len());
        svg.replace_range(start..after, "");
    }
    // Inline, a glyph is drawn with <use href="#name"/>.
    svg.replacen(
        "<svg ",
        "<svg aria-hidden=\"true\" style=\"position:absolute;width:0;height:0;overflow:hidden\" ",
        1,
    )
}

/// Standard base64, with padding.
fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let n = (u32::from(chunk[0]) << 16)
            | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8)
            | u32::from(*chunk.get(2).unwrap_or(&0));
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(ALPHABET[(n >> (18 - 6 * i) & 63) as usize] as char);
            } else {
                out.push('=');
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::base64;

    #[test]
    fn base64_pads() {
        assert_eq!(base64(b""), "");
        assert_eq!(base64(b"f"), "Zg==");
        assert_eq!(base64(b"fo"), "Zm8=");
        assert_eq!(base64(b"foo"), "Zm9v");
        assert_eq!(base64(b"foob"), "Zm9vYg==");
    }
}
