"""Writes an inline bundle: everything a page kept in a single HTML file
needs from the design system, as one HTML fragment for its `head`: the
stylesheets, the faces as base64 WOFF2, the glyph sprite and the elements'
behaviour.

    python -m tools bundle --out page-head.html [options]

Options:
    --faces ui,prose,mono   families to embed: `ui` (Instrument Sans and
                            Libertinus Sans), `prose` (New Computer
                            Modern), `mono` (JuliaMono); `ui` by default
    --math                  also embed New Computer Modern Math, whole
    --subsets latin,…       ranges of the split faces to embed: latin,
                            latin-ext, greek, cyrillic, symbols;
                            `latin,latin-ext` by default. JuliaMono ships
                            whole, or, when only `latin` is asked for, as
                            upstream's Latin files alone
    --weights 400,700       weights to embed; every weight by default
    --elements all|a,b      elements to include, by module name
                            (`theme-switch`, `copy-button`, …); none by
                            default
    --no-sprite             leave the glyph sprite out

The Rust crate `stemma-design` builds the same bundles; its tests compare
them with the ones built here.
"""

import base64
import json
import re
import sys
from dataclasses import dataclass, field

from .common import ROOT

WEB = ROOT / "targets" / "web"
ELEMENTS = ROOT / "targets" / "elements"

FAMILIES = {
    "ui": ["Instrument Sans", "Libertinus Sans"],
    "prose": ["New Computer Modern"],
    "mono": ["JuliaMono"],
    "math": ["New Computer Modern Math"],
}

SUBSETS = ["latin", "latin-ext", "greek", "cyrillic", "symbols"]

# Every element module, by name; each defines one element.
MODULES = sorted(
    path.stem
    for path in ELEMENTS.glob("*.js")
    if path.stem not in ("index", "internal", "glyphs", "mark-data")
)

FONT_FACE = re.compile(r"@font-face \{[^}]+\}")
SUBSET = re.compile(r"-(latin-ext|latin|greek|cyrillic|symbols)\.woff2$")
IMPORT = re.compile(r'^import\s*\{([^}]*)\}\s*from\s*"(\./[^"]+)";\s*$', re.M)


@dataclass
class Options:
    faces: list = field(default_factory=lambda: ["ui"])
    math: bool = False
    subsets: list = field(default_factory=lambda: ["latin", "latin-ext"])
    weights: list = field(default_factory=list)
    elements: list = field(default_factory=list)
    sprite: bool = True


def parse(argv):
    options = Options()
    out = None
    args = iter(argv)

    def listed():
        return [item for item in next(args, "").split(",") if item]

    for arg in args:
        if arg == "--out":
            out = next(args, "")
        elif arg == "--faces":
            options.faces = listed()
        elif arg == "--weights":
            options.weights = [int(w) for w in listed()]
        elif arg == "--math":
            options.math = True
        elif arg == "--subsets":
            options.subsets = listed()
        elif arg == "--elements":
            asked = listed()
            options.elements = MODULES if "all" in asked else asked
        elif arg == "--no-sprite":
            options.sprite = False
        else:
            sys.exit(f"Unknown option: {arg}")
    for face in options.faces:
        if face not in FAMILIES or face == "math":
            sys.exit(f"Unknown faces: {face}")
    for subset in options.subsets:
        if subset not in SUBSETS:
            sys.exit(f"Unknown subset: {subset}")
    for name in options.elements:
        if name not in MODULES:
            sys.exit(f"Unknown element module: {name}")
    return options, out


# ── Faces ──────────────────────────────────────────────────────────────────


def faces(options):
    """The `@font-face` rules of `fonts.css` that the options ask for, with
    their files inlined."""
    css = (WEB / "fonts.css").read_text()
    asked = [*options.faces, *(["math"] if options.math else [])]
    families = {family for face in asked for family in FAMILIES[face]}
    only_latin = options.subsets == ["latin"]
    rules = []
    for rule in FONT_FACE.findall(css):
        family = re.search(r'font-family: "([^"]+)"', rule).group(1)
        if family not in families:
            continue
        url = re.search(r'url\("([^"]+)"\)', rule).group(1)
        match = SUBSET.search(url)
        subset = match.group(1) if match else None
        if subset and subset not in options.subsets:
            continue
        # Libertinus Sans only stands in for what Instrument Sans lacks.
        if family == "Libertinus Sans" and subset in ("latin", "latin-ext"):
            continue
        weight = int(re.search(r"font-weight: (\d+)", rule).group(1))
        if (
            options.weights
            and family != "New Computer Modern Math"
            and weight not in options.weights
        ):
            continue
        if family == "JuliaMono":
            # Only upstream's Latin files, when only Latin is asked for: a
            # style without one is left to the browser to synthesise.
            latin = url.endswith("Latin.woff2")
            if latin != only_latin:
                continue
        data = base64.b64encode((WEB / url).read_bytes()).decode()
        rules.append(rule.replace(url, f"data:font/woff2;base64,{data}", 1))
    return "\n\n".join(rules)


# ── Stylesheets and sprite ─────────────────────────────────────────────────


def stylesheets():
    noise = base64.b64encode((WEB / "noise.svg").read_bytes()).decode()
    parts = []
    for name in ("tokens.css", "base.css", "document.css", "components.css"):
        css = (WEB / name).read_text()
        css = css.replace(
            'url("noise.svg")', f'url("data:image/svg+xml;base64,{noise}")', 1
        )
        parts.append(css)
    return "\n".join(parts)


def sprite():
    svg = (WEB / "glyphs.svg").read_text()
    # Inline, a glyph is drawn with <use href="#name"/>.
    svg = re.sub(r"<!--.*?-->\s*", "", svg, count=1, flags=re.S)
    return svg.replace(
        "<svg ",
        '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" ',
        1,
    )


# ── Behaviour ──────────────────────────────────────────────────────────────


def collect(entries):
    """The modules `entries` need, each once, dependencies first, as
    (file name, source)."""
    order = []
    seen = set()

    def visit(path):
        if path in seen:
            return
        seen.add(path)
        source = (ELEMENTS / path).read_text()
        for match in IMPORT.finditer(source):
            visit(match.group(2)[2:])
        order.append((path, source))

    for entry in entries:
        visit(f"{entry}.js")
    return order


def wrap(path, source):
    """One module as a function scope that returns its exports."""

    def inline(match):
        bindings = [
            re.sub(r"\s+as\s+", ": ", name.strip())
            for name in match.group(1).split(",")
            if name.strip()
        ]
        dependency = json.dumps(match.group(2)[2:])
        return f"const {{ {', '.join(bindings)} }} = modules[{dependency}];"

    body = IMPORT.sub(inline, source)
    names = []

    def unexport(match):
        names.append(match.group(2))
        return f"{match.group(1)} {match.group(2)}"

    body = re.sub(
        r"^export (async function|function|class|const|let)\s+([A-Za-z_$][\w$]*)",
        unexport,
        body,
        flags=re.M,
    )
    if re.search(r"^export\b", body, re.M):
        sys.exit(f"{path}: an export the bundler cannot inline")
    return (
        f"modules[{json.dumps(path)}] = (() => {{\n{body}\n"
        f"return {{ {', '.join(names)} }};\n}})();"
    )


def behaviour(entries):
    if not entries:
        return ""
    return "\n\n".join(
        [
            "const modules = {};",
            *(wrap(path, source) for path, source in collect(entries)),
        ]
    )


# ── The bundle ─────────────────────────────────────────────────────────────


def bundle(options):
    """The bundle's HTML, and its script alone."""
    asked = [*options.faces, *(["math"] if options.math else [])]
    parts = [
        f"<!-- Stemma design, inline bundle. Faces: {', '.join(asked) or 'none'}; "
        f"subsets: {', '.join(options.subsets)}; "
        f"elements: {', '.join(options.elements) or 'none'}. -->",
        f"<style>\n{faces(options)}\n\n{stylesheets()}</style>",
    ]
    if options.sprite:
        parts.append(sprite())
    script = behaviour(options.elements)
    if script:
        parts.append(f'<script type="module">\n{script}\n</script>')
    return "\n".join(parts) + "\n", script


def check():
    """Builds the largest bundle and checks that it holds together: nothing
    refers to a file beside it, and no module is left importing or
    exporting. Returns whether it does."""
    html, script = bundle(
        Options(
            faces=["ui", "prose", "mono"],
            math=True,
            subsets=SUBSETS,
            elements=MODULES,
        )
    )
    problems = []
    if 'url("fonts/' in html or 'url("noise.svg")' in html:
        problems.append("The bundle still refers to files beside it.")
    if re.search(r"^\s*(import|export)\b", script, re.M):
        problems.append("The bundle's script still imports or exports.")
    for problem in problems:
        print(problem, file=sys.stderr)
    return not problems


def main(argv):
    options, out = parse(argv)
    if not out:
        sys.exit("Say where to write the bundle with --out.")
    html, _ = bundle(options)
    with open(out, "w", encoding="utf-8") as file:
        file.write(html)
    print(f"Wrote {out} ({round(len(html) / 1024)} KiB)")
