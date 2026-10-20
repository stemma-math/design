"""Generates the tokens of every target from `source/tokens/`, and checks
the contrast requirements recorded in them, in both appearances and the
brand-surface context.

The sources are in the Design Tokens Community Group format. A token's name
is its path without the first level, which is its category (or, for
density, the density): `color.ink-1` is `--ink-1`. A reference, as
`{size.step-3}`, stays a reference in CSS, as `var(--step-3)`, so a value
redefined for the dark appearance carries through; elsewhere it is resolved.

Either way, generating or checking fails if a colour falls below its
contrast requirement.
"""

import json
import re
import sys

from .common import ROOT, Outputs, header

SOURCE = ROOT / "source" / "tokens"
HEADER = header("source/tokens", "tokens")

REFERENCE = re.compile(r"\{([^}]+)\}")


class Token:
    def __init__(self, path, data, kind, origin):
        self.path = path
        self.name = "-".join(path[1:])
        self.original = data["$value"]
        self.kind = data.get("$type", kind)
        self.description = data.get("$description")
        self.extensions = data.get("$extensions", {})
        self.origin = origin


def read(file):
    """The tokens of one source file, in the order they are written."""
    found = []

    def walk(group, path, kind):
        kind = group.get("$type", kind)
        for key, value in group.items():
            if key.startswith("$") or not isinstance(value, dict):
                continue
            if "$value" in value:
                found.append(Token((*path, key), value, kind, file))
            else:
                walk(value, (*path, key), kind)

    walk(json.loads((SOURCE / file).read_text()), (), None)
    return found


def number(value):
    return str(value)


def css_literal(token, value):
    """A value as CSS, where its type is written differently in JSON."""
    if token.kind == "fontFamily" and isinstance(value, list):
        return ", ".join(
            f"'{name}'" if re.search(r"\s", name) else name for name in value
        )
    if token.kind == "cubicBezier" and isinstance(value, list):
        return f"cubic-bezier({', '.join(number(v) for v in value)})"
    return value


class Appearance:
    """Every token of an appearance, by name. Later files win, so the dark
    appearance lists `themes/dark.json` last."""

    def __init__(self, files):
        self.tokens = [token for file in files for token in read(file)]
        self.by_path = {token.path: token for token in self.tokens}
        self.by_name = {token.name: token for token in self.tokens}

    def of(self, file):
        return [token for token in self.tokens if token.origin == file]

    def resolved(self, name, token=None):
        """A token's value with every reference followed, as CSS. `token`
        picks one of several with the same name, as the densities have."""
        token = token or self.by_name[name]
        value = token.original
        if isinstance(value, str):
            whole = REFERENCE.fullmatch(value)
            if whole:
                return self.resolved("-".join(whole.group(1).split(".")[1:]))
            value = REFERENCE.sub(
                lambda m: self.resolved("-".join(m.group(1).split(".")[1:])), value
            )
        return css_literal(token, value)


def css_value(appearance, token):
    original = token.original
    if isinstance(original, str) and REFERENCE.search(original):
        return REFERENCE.sub(
            lambda m: f"var(--{'-'.join(m.group(1).split('.')[1:])})", original
        )
    return appearance.resolved(token.name, token)


def declarations(appearance, tokens, indent="    "):
    lines = []
    for token in tokens:
        if token.description:
            lines.append(f"{indent}/* {token.description} */")
        lines.append(f"{indent}--{token.name}: {css_value(appearance, token)};")
    return lines


def css(light, dark, brand):
    def density(which):
        return [t for t in light.of("density.json") if t.path[0] == which]

    # The dark appearance follows the system unless the page says otherwise
    # with `data-theme` on its root, which either appearance can force.
    return "\n".join(
        [
            f"/* {HEADER} */",
            "",
            ":root {",
            "    color-scheme: light;",
            *declarations(light, [*light.of("brand.json"), *light.of("semantic.json")]),
            "}",
            "",
            "@media (prefers-color-scheme: dark) {",
            '    :root:not([data-theme="light"]) {',
            "        color-scheme: dark;",
            *declarations(dark, dark.of("themes/dark.json"), "        "),
            "    }",
            "}",
            "",
            ':root[data-theme="dark"] {',
            "    color-scheme: dark;",
            *declarations(dark, dark.of("themes/dark.json")),
            "}",
            "",
            "/* A navy surface inside either page appearance. */",
            ".brand-surface {",
            "    color-scheme: dark;",
            *declarations(
                brand,
                list(
                    {
                        token.name: token
                        for file in ("themes/dark.json", "contexts/brand.json")
                        for token in brand.of(file)
                    }.values()
                ),
            ),
            "}",
            "",
            ":root,",
            '[data-density="comfortable"] {',
            *declarations(light, density("comfortable")),
            "}",
            "",
            '[data-density="compact"] {',
            *declarations(light, density("compact")),
            "}",
            "",
        ]
    )


# ── Terminal ───────────────────────────────────────────────────────────────

# Truecolour values for the terminal's roles: the text colour of each
# intent, for terminals with a light background and with a dark one. Roles
# map mainly to the 16 named ANSI colours; these are for the occasional
# accent where a terminal supports more.
ROLES = {
    "accent": "accent-text",
    "success": "success-text",
    "warning": "warning-text",
    "danger": "danger-text",
    "info": "info-text",
    "muted": "ink-3",
    "identifier": "tone-magenta-text",
}


def palette(appearance, which):
    fields = []
    for role, name in ROLES.items():
        value = appearance.resolved(name)
        r, g, b = (f"0x{value[i : i + 2]}" for i in (1, 3, 5))
        fields.append(f"    {role}: Rgb({r}, {g}, {b}),")
    return [
        f"/// The roles' colours for a terminal with a {which} background.",
        f"pub const {which.upper()}: Palette = Palette {{",
        *fields,
        "};",
    ]


def rust(light, dark):
    return "\n".join(
        [
            f"// {HEADER}",
            "",
            "use crate::{Palette, Rgb};",
            "",
            *palette(light, "light"),
            "",
            *palette(dark, "dark"),
            "",
        ]
    )


# ── Contrast ───────────────────────────────────────────────────────────────


def rgb(value):
    match = re.fullmatch(r"#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})", value)
    if not match:
        return None
    digits = match.group(1)
    if len(digits) == 3:
        digits = "".join(d + d for d in digits)
    return [int(digits[i : i + 2], 16) for i in (0, 2, 4)]


def mix(a, p, b):
    """`color-mix(in srgb, a p, b)`: mixed channel by channel, gamma-encoded.
    A tone over transparent, composited on a surface, gives the same colour."""
    return "#" + "".join(
        f"{round(x * p + y * (1 - p)):02x}" for x, y in zip(rgb(a), rgb(b))
    )


def luminance(value):
    def linear(c):
        s = c / 255
        return s / 12.92 if s <= 0.04045 else ((s + 0.055) / 1.055) ** 2.4

    r, g, b = (linear(c) for c in rgb(value))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    high, low = sorted((luminance(a), luminance(b)), reverse=True)
    return (high + 0.05) / (low + 0.05)


def requirements(appearance):
    """What must reach what, as (foreground, background, minimum, what),
    with the token names behind each colour so a failure says where to look."""

    def color(name):
        value = appearance.resolved(name)
        if not rgb(value):
            raise ValueError(f"{name} is {value}, not an opaque colour to check")
        return value

    def percent(name):
        return float(appearance.resolved(name).rstrip("%")) / 100

    # Every token, the redefined ones too: a requirement is written once,
    # in the semantic tier, and holds for the value in effect.
    pairs = []
    for token in appearance.tokens:
        stemma = token.extensions.get("stemma", {})
        for requirement in stemma.get("contrast", []):
            for background in requirement["on"]:
                pairs.append(
                    (
                        color(token.name),
                        color(background),
                        requirement["min"],
                        f"{token.name} on {background}",
                    )
                )
        if stemma.get("tone"):
            tone = token.name
            text, on = f"{tone}-text", f"{tone}-on"
            hover = mix(color(tone), percent("mix-hover"), "#000000")
            pairs.append((color(on), color(tone), 4.5, f"{on} on {tone}"))
            pairs.append((color(on), hover, 4.5, f"{on} on {tone}, hovered"))
            for surface in ("surface-card", "surface-page"):
                soft = mix(color(tone), percent("mix-soft"), color(surface))
                pairs.append((color(tone), color(surface), 3, f"{tone} on {surface}"))
                pairs.append((color(text), color(surface), 4.5, f"{text} on {surface}"))
                pairs.append(
                    (
                        color(text),
                        soft,
                        4.5,
                        f"{text} on {tone}'s soft fill on {surface}",
                    )
                )
    return pairs


def contrast_failures(light, dark, brand):
    failures = []
    for which, appearance in (("light", light), ("dark", dark), ("brand", brand)):
        for foreground, background, minimum, what in requirements(appearance):
            r = ratio(foreground, background)
            if r < minimum:
                failures.append(f"{which}: {what} is {r:.2f}:1, under {minimum}:1")
    return failures


# ── Output ─────────────────────────────────────────────────────────────────


def generate():
    light = Appearance(["brand.json", "semantic.json", "density.json"])
    dark = Appearance(["brand.json", "semantic.json", "themes/dark.json"])
    brand = Appearance(
        ["brand.json", "semantic.json", "themes/dark.json", "contexts/brand.json"]
    )
    failures = contrast_failures(light, dark, brand)
    if failures:
        sys.exit("Contrast below requirement:\n  " + "\n  ".join(failures))
    out = Outputs()
    out.add("targets/web/tokens.css", css(light, dark, brand))
    out.add("targets/terminal/src/tokens.rs", rust(light, dark))
    return out
