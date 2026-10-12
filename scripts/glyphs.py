"""Generates the glyph sprite and the glyphs the elements draw, from
`source/glyphs/`, one SVG per glyph on a 24-unit box.

    python3 scripts/glyphs.py          write targets/web/glyphs.svg and targets/elements/glyphs.js
    python3 scripts/glyphs.py --check  fail if either differs from what would be written
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "glyphs"
HEADER = "Generated from source/glyphs by scripts/glyphs.py. Do not edit."


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


def main():
    found = glyphs()
    outputs = {
        ROOT / "targets/web/glyphs.svg": sprite(found),
        ROOT / "targets/elements/glyphs.js": module(found),
    }
    if "--check" in sys.argv:
        stale = [
            p for p, text in outputs.items() if not p.exists() or p.read_text() != text
        ]
        for path in stale:
            print(f"Out of date: {path.relative_to(ROOT)}", file=sys.stderr)
        if stale:
            print("Run `just generate`.", file=sys.stderr)
            sys.exit(1)
        return
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
    print(f"Wrote {len(outputs)} files")


if __name__ == "__main__":
    main()
