"""Generates the targets that carry other targets' files: the Rust crate
`stemma-design` (targets/rust) and the Verso theme (targets/verso). It
copies what the other steps write, so it runs after them.
"""

import json
import re

from . import bundle
from .common import ROOT, Outputs

HEADER = (
    "Generated from targets/web, targets/elements and targets/brand-kit "
    "by tools/targets.py. Do not edit."
)


def files(directory):
    """Every file under `directory`, as paths relative to it, sorted."""
    base = ROOT / directory
    return sorted(str(p.relative_to(base)) for p in base.rglob("*") if p.is_file())


def read(path):
    return (ROOT / path).read_bytes()


# ── Rust ───────────────────────────────────────────────────────────────────

# The files each group of the crate serves, from the target they come from.
GROUPS = [
    {
        "name": "WEB",
        "feature": None,
        "target": "targets/web",
        "prefix": "web",
        "keep": lambda p: (
            re.search(r"\.(css|svg)$", p) or p.startswith("fonts/") or p == "LICENSE"
        ),
    },
    {
        "name": "ELEMENTS",
        "feature": "elements",
        "target": "targets/elements",
        "prefix": "elements",
        "keep": lambda p: p.endswith(".js") or p.startswith("LICENSE"),
    },
    {
        "name": "BRAND_KIT",
        "feature": "brand-kit",
        "target": "targets/brand-kit",
        "prefix": "brand-kit",
        "keep": lambda p: re.match(r"(app|web|svg)/", p) or p == "LICENSE",
    },
]

TYPES = {
    "css": "text/css; charset=utf-8",
    "js": "text/javascript; charset=utf-8",
    "svg": "image/svg+xml",
    "woff2": "font/woff2",
    "png": "image/png",
    "ico": "image/vnd.microsoft.icon",
    "icns": "image/icns",
    "txt": "text/plain; charset=utf-8",
}


def content_type(path):
    match = re.search(r"\.([a-z0-9]+)$", path)
    return TYPES.get(match.group(1) if match else "", "text/plain; charset=utf-8")


def rust_string(text):
    """A Rust string literal."""
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def fnv(text):
    """FNV-1a, 64 bits, over UTF-8: what the crate's tests compare bundles by."""
    value = 0xCBF29CE484222325
    for byte in text.encode():
        value = ((value ^ byte) * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return f"{value:016x}"


# The bundles the crate's tests rebuild and compare with `tools/bundle.py`.
VARIANTS = [
    bundle.Options(faces=[], subsets=["latin"]),
    bundle.Options(
        faces=["ui"], subsets=["latin", "latin-ext"], weights=[400], sprite=False
    ),
    bundle.Options(
        faces=["prose", "mono"],
        math=True,
        subsets=["latin"],
        weights=[400, 700],
        elements=["theme-switch", "copy-button", "mark"],
    ),
    bundle.Options(
        faces=["ui", "prose", "mono"],
        math=True,
        subsets=bundle.SUBSETS,
        elements=bundle.MODULES,
    ),
    bundle.Options(
        faces=["ui", "prose", "mono"],
        subsets=["latin", "latin-ext"],
        face_subsets={"mono": ["latin"], "ui": ["latin"]},
        weights=[400, 600],
        elements=["theme-switch"],
    ),
]


def rust(out):
    crate = "targets/rust"
    tables = [f"// {HEADER}", "", "use crate::Asset;", ""]
    for group in GROUPS:
        entries = []
        for path in filter(group["keep"], files(group["target"])):
            copy = f"assets/{group['prefix']}/{path}"
            out.add(f"{crate}/{copy}", read(f"{group['target']}/{path}"))
            entries.append(
                f"    Asset {{\n        path: {rust_string(f'{group["prefix"]}/{path}')},\n"
                f"        content_type: {rust_string(content_type(path))},\n"
                f"        bytes: include_bytes!({rust_string(f'../{copy}')}),\n    }},"
            )
        if group["feature"]:
            tables.append(f"#[cfg(feature = {rust_string(group['feature'])})]")
        tables += [
            f"pub(crate) static {group['name']}: &[Asset] = &[",
            *entries,
            "];",
            "",
        ]
    out.add(f"{crate}/src/assets.rs", "\n".join(tables))

    # The inline bundle: each `@font-face` rule with what it is for, and each
    # element module, already wrapped, with what it imports.
    fonts = (ROOT / "targets/web/fonts.css").read_text()
    data = [
        f"// {HEADER}",
        "",
        "use crate::bundle::FontRule;",
        "",
        "pub(crate) static FONT_RULES: &[FontRule] = &[",
    ]
    for rule in bundle.FONT_FACE.findall(fonts):
        family = re.search(r'font-family: "([^"]+)"', rule).group(1)
        weight = re.search(r"font-weight: (\d+)", rule).group(1)
        url = re.search(r'url\("([^"]+)"\)', rule).group(1)
        match = bundle.SUBSET.search(url)
        subset = f"Some({rust_string(match.group(1))})" if match else "None"
        data.append(
            f"    FontRule {{\n        family: {rust_string(family)},\n        weight: {weight},\n"
            f"        subset: {subset},\n"
            f"        url: {rust_string(url)},\n        rule: {rust_string(rule)},\n    }},"
        )
    data += [
        "];",
        "",
        '#[cfg(feature = "elements")]',
        "pub(crate) static MODULES: &[crate::bundle::Module] = &[",
    ]
    for path, source in bundle.collect(bundle.MODULES):
        name = path.removesuffix(".js")
        out.add(f"{crate}/assets/bundle/{path}", bundle.wrap(path, source))
        imports = ", ".join(
            rust_string(m.group(2)[2:].removesuffix(".js"))
            for m in bundle.IMPORT.finditer(source)
        )
        data.append(
            f"    crate::bundle::Module {{\n        name: {rust_string(name)},\n"
            f"        imports: &[{imports}],\n"
            f"        code: include_str!({rust_string(f'../assets/bundle/{path}')}),\n    }},"
        )
    data += ["];", ""]
    out.add(f"{crate}/src/bundle_data.rs", "\n".join(data))

    lines = [
        f"# {HEADER}",
        "# faces\tmath\tsubsets\tface subsets\tweights\telements\tsprite\tlength\tfnv1a64",
    ]
    for variant in VARIANTS:
        html, _ = bundle.bundle(variant)
        lines.append(
            "\t".join(
                [
                    ",".join(variant.faces),
                    str(variant.math).lower(),
                    ",".join(variant.subsets),
                    ";".join(
                        f"{face}={','.join(variant.face_subsets[face])}"
                        for face in ("ui", "prose", "mono")
                        if face in variant.face_subsets
                    ),
                    ",".join(str(w) for w in variant.weights),
                    ",".join(variant.elements),
                    str(variant.sprite).lower(),
                    str(len(html.encode())),
                    fnv(html),
                ]
            )
        )
    out.add(f"{crate}/tests/bundles.tsv", "\n".join(lines) + "\n")
    out.add(f"{crate}/LICENSE", read("LICENSE"))
    out.add(f"{crate}/LICENSE-mark", read("source/brand/LICENSE"))


# ── Verso ──────────────────────────────────────────────────────────────────


# Verso puts a page's content in this; the theme sets it as a document.
VERSO_CONTENT = "main > .content-wrapper > section"


def verso_document(css):
    """Document typography for Verso's content as well as for `.document`.
    Verso's own rules sit outside the cascade layers and win, so this only
    fills in what Verso leaves unstyled: references, tables, quotations."""
    # Selectors only, not the comments that name the class in backticks.
    return re.sub(r"(?<!`)\.document\b", f":is(.document, {VERSO_CONTENT})", css)


def verso(out):
    target = "targets/verso"
    copied = []
    for path in files("targets/web/fonts"):
        out.add(f"{target}/fonts/{path}", read(f"targets/web/fonts/{path}"))
        copied.append(f"fonts/{path}")
    out.add(f"{target}/noise.svg", read("targets/web/noise.svg"))
    copied.append("noise.svg")
    out.add(f"{target}/glyphs.svg", read("targets/web/glyphs.svg"))
    copied.append("glyphs.svg")
    # The elements, for a site that loads `elements/index.js` as a module.
    for path in files("targets/elements"):
        if path.endswith(".js") or path.startswith("LICENSE"):
            out.add(f"{target}/elements/{path}", read(f"targets/elements/{path}"))
            copied.append(f"elements/{path}")

    css = [f"/* {HEADER} */"]
    for path in (
        "targets/web/fonts.css",
        "targets/web/tokens.css",
        "targets/web/base.css",
        "targets/web/document.css",
        "targets/web/code.css",
        "targets/web/components.css",
        "targets/verso/verso-map.css",
    ):
        name = path.split("/")[-1]
        text = (ROOT / path).read_text()
        if name == "document.css":
            text = verso_document(text)
        css += [f"\n/* ── {name} ── */\n", text]
    out.add(f"{target}/verso-theme.css", "\n".join(css))

    listed = ",\n".join(f"  {json.dumps(path)}" for path in copied)
    out.add(
        f"{target}/StemmaDesign/Files.lean",
        "\n".join(
            [
                f"/-! {HEADER} -/",
                "",
                "namespace StemmaDesign",
                "",
                "/-- The files a site copies beside `verso-theme.css`, as paths relative to this package's",
                "directory and to the stylesheet alike: the faces, their licences, the grain texture, the",
                "glyph sprite and the elements. -/",
                "def files : Array String := #[",
                listed,
                "]",
                "",
                "end StemmaDesign",
                "",
            ]
        ),
    )
    out.add(f"{target}/LICENSE", read("LICENSE"))


def generate():
    # Folders wholly generated: anything in them not generated is stale.
    out = Outputs(
        owned=["targets/rust/assets", "targets/verso/fonts", "targets/verso/elements"]
    )
    rust(out)
    verso(out)
    return out
