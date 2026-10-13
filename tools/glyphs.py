"""Generates the glyph sprite and the glyphs the elements draw, from
`source/glyphs/`, one SVG per glyph on a 24-unit box.

It writes targets/web/glyphs.svg and targets/elements/glyphs.js.
"""

import json
import re
import sys

from .common import ROOT, Outputs, header

SOURCE = ROOT / "source" / "glyphs"
HEADER = header("source/glyphs", "glyphs")


def glyphs():
    """Each glyph's name and inner markup, in name order."""
    found = {}
    for path in sorted(SOURCE.glob("*.svg")):
        text = path.read_text()
        match = re.fullmatch(
            r'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">(.*)</svg>\s*',
            text,
            re.S,
        )
        if not match:
            sys.exit(f"{path}: not a glyph on a 24-unit box")
        found[path.stem] = match.group(1).strip()
    return found


def sprite(found):
    symbols = [
        f'  <symbol id="{name}" viewBox="0 0 24 24">{body}</symbol>'
        for name, body in found.items()
    ]
    return "\n".join(
        [
            '<svg xmlns="http://www.w3.org/2000/svg">',
            f"  <!-- {HEADER}",
            "       Line glyphs on a 24-unit box, stroked in the colour of their text.",
            '       Draw one with <svg class="glyph"><use href="glyphs.svg#name"/></svg>. -->',
            *symbols,
            "</svg>",
            "",
        ]
    )


def module(found):
    return "\n".join(
        [
            f"// {HEADER}",
            "",
            "/** Each glyph's inner SVG markup, on a 24-unit box. */",
            f"export const glyphs = {json.dumps(found, indent=4)};",
            "",
            "/** A glyph as an inline `svg.glyph`, hidden from assistive technology. */",
            "export function glyph(name, small = false) {",
            '    const extra = small ? " glyph--small" : "";',
            '    return `<svg class="glyph${extra}" viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>`;',
            "}",
            "",
        ]
    )


def generate():
    found = glyphs()
    out = Outputs()
    out.add("targets/web/glyphs.svg", sprite(found))
    out.add("targets/elements/glyphs.js", module(found))
    return out
