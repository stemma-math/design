"""Generates the brand kit, and the marks the other targets carry, from the
drawn masters in `source/brand/`.

    python3 scripts/brand.py          write targets/brand-kit/ and the marks in other targets
    python3 scripts/brand.py --check  fail if any differs from what would be written

The wordmark is "stemma" in Instrument Sans, shaped with HarfBuzz and
outlined with fontTools, so no font is needed to show it. Lockups place it
beside or below the symbol. Rasters are rendered with `resvg`; Pillow
writes the ICO and ICNS files. Raster outputs are compared by their pixels,
so a different encoder does not make them stale.
"""

import io
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / "source" / "brand"
FONTS = ROOT / "source" / "fonts"
TOKENS = ROOT / "source" / "tokens"
KIT = ROOT / "targets" / "brand-kit"

APPEARANCES = ("on-dark", "on-light", "mono")
CONFIG = json.loads((BRAND / "brand.json").read_text())
HEADER = "Generated from source/brand by scripts/brand.py. Do not edit."


# ── Values ───────────────────────────────────────────────────────────────


def token_values():
    """Every colour token's light value, by name, references resolved."""
    values = {}
    for file in ("brand.json", "semantic.json"):
        data = json.loads((TOKENS / file).read_text())
        for name, token in data.get("color", {}).items():
            if isinstance(token, dict) and "$value" in token:
                values[name] = token["$value"]

    def resolve(value):
        match = re.fullmatch(r"\{color\.([^}]+)\}", value)
        return resolve(values[match.group(1)]) if match else value

    return {name: resolve(value) for name, value in values.items()}


TOKEN_VALUES = token_values()


def color(value):
    """A colour from the configuration: a literal, or a token reference."""
    match = re.fullmatch(r"\{color\.([^}]+)\}", value)
    return TOKEN_VALUES[match.group(1)] if match else value


def number(x):
    """A length for SVG, without needless digits."""
    text = f"{x:.3f}".rstrip("0").rstrip(".")
    return "0" if text == "-0" else text


# ── Marks as SVG ─────────────────────────────────────────────────────────

VIEW = CONFIG["symbol"]["viewBox"]
VX, VY, VW, VH = VIEW


def symbol_body(appearance, prefix=""):
    """The master's content, without its `svg` element and title. Its ids
    take `prefix`, so two symbols can share a document."""
    text = (BRAND / CONFIG["symbol"]["masters"][appearance]).read_text()
    body = re.search(r"<svg[^>]*>(.*)</svg>", text, re.S).group(1)
    body = re.sub(r"\s*<title>.*?</title>", "", body)
    if prefix:
        body = re.sub(r'id="([^"]+)"', rf'id="{prefix}\1"', body)
        body = re.sub(r"url\(#([^)]+)\)", rf"url(#{prefix}\1)", body)
    return body.strip()


def svg(view, body, title="Stemma"):
    x, y, w, h = view
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{number(x)} {number(y)} '
        f'{number(w)} {number(h)}">\n  <title>{title}</title>\n  {body}\n</svg>\n'
    )


def wordmark_path():
    """The wordmark as one path, in font units with y down and the
    baseline at 0, with its advance, x-height and ink bounds."""
    settings = CONFIG["wordmark"]
    path = FONTS / settings["face"]
    blob = hb.Blob.from_file_path(str(path))
    face = hb.Face(blob)
    font = hb.Font(face)
    buffer = hb.Buffer()
    buffer.add_str(settings["text"])
    buffer.guess_segment_properties()
    hb.shape(font, buffer, {"kern": True, "liga": True})

    tt = TTFont(path)
    glyphs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upem = tt["head"].unitsPerEm
    tracking = settings["tracking"] * upem
    pen = SVGPathPen(glyphs, ntos=number)
    bounds = BoundsPen(glyphs)
    x = 0.0
    infos, positions = buffer.glyph_infos, buffer.glyph_positions
    for index, (info, position) in enumerate(zip(infos, positions)):
        name = order[info.codepoint]
        transform = (1, 0, 0, -1, x + position.x_offset, -position.y_offset)
        glyphs[name].draw(TransformPen(pen, transform))
        glyphs[name].draw(TransformPen(bounds, transform))
        x += position.x_advance + (tracking if index < len(infos) - 1 else 0)
    return {
        "d": pen.getCommands(),
        "advance": x,
        "x_height": tt["OS/2"].sxHeight,
        "upem": upem,
        "bounds": bounds.bounds,
    }


WORDMARK = wordmark_path()


def wordmark_svg(appearance):
    x0, y0, x1, y1 = WORDMARK["bounds"]
    view = (x0, y0, x1 - x0, y1 - y0)
    fill = color(CONFIG["wordmark"]["color"][appearance])
    return svg(view, f'<path fill="{fill}" d="{WORDMARK["d"]}"/>')


def placed(body, view, x, y, scale):
    """`body`, drawn in `view`, moved so the view's corner sits at (x, y)
    and scaled."""
    vx, vy = view[0], view[1]
    return (
        f'<g transform="translate({number(x)} {number(y)}) scale({number(scale)}) '
        f'translate({number(-vx)} {number(-vy)})">{body}</g>'
    )


def lockup_svg(kind, appearance):
    """The symbol and the wordmark, beside (`horizontal`) or below
    (`stacked`), in units of the symbol's master."""
    settings = CONFIG["lockups"][kind]
    fill = color(CONFIG["wordmark"]["color"][appearance])
    # The wordmark's font size, as a fraction of the symbol's height.
    scale = settings["size"] * VH / WORDMARK["upem"]
    x0, y0, x1, y1 = WORDMARK["bounds"]
    width = (x1 - x0) * scale
    word = f'<path fill="{fill}" d="{WORDMARK["d"]}"/>'
    symbol = symbol_body(appearance)
    if kind == "horizontal":
        # The x-height band is centred on the symbol's height.
        baseline = VH / 2 + WORDMARK["x_height"] * scale / 2
        word_x = VW + settings["gap"] * VH
        body = placed(symbol, VIEW, 0, 0, 1) + placed(
            word, (x0, 0), word_x, baseline, scale
        )
        top = min(0, baseline + y0 * scale)
        bottom = max(VH, baseline + y1 * scale)
        view = (0, top, word_x + width, bottom - top)
    else:
        total = max(VW, width)
        word_top = VH + settings["gap"] * VH
        baseline = word_top - y0 * scale
        body = placed(symbol, VIEW, (total - VW) / 2, 0, 1) + placed(
            word, (x0, 0), (total - width) / 2, baseline, scale
        )
        view = (0, 0, total, baseline + y1 * scale)
    return svg(view, body)


def simple_on_navy():
    """The simple symbol in the favicon's light blues, for small icons on
    the navy field."""
    colours = CONFIG["favicon"]["dark"]
    x1, y1, x2, y2 = CONFIG["favicon"]["gradient"]
    body = symbol_body("mono")
    body = body.replace('<path fill="currentColor"', '<path fill="url(#small)"', 1)
    body = body.replace(
        '<circle fill="currentColor"', f'<circle fill="{colours["dot"]}"', 1
    )
    return (
        f'<defs><linearGradient id="small" gradientUnits="userSpaceOnUse" x1="{x1}" '
        f'y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{colours["from"]}"/>'
        f'<stop offset="1" stop-color="{colours["to"]}"/></linearGradient></defs>{body}'
    )


def icon_svg(kind, size=1024, small=False):
    """An application (`app`) or home-screen (`web`) icon: the symbol for
    dark surfaces glowing on a navy field. App icons are a rounded square
    inside the canvas; home-screen icons fill it, and the platform masks
    them. `small` icons, drawn a few pixels wide, take the simple symbol
    instead, larger and without the glow."""
    settings = CONFIG["icon"]
    shape = settings[kind]
    inset = shape.get("inset", 0) * size
    side = size - 2 * inset
    radius = shape.get("radius", 0) * side
    width = (shape["small"] if small else shape["symbol"]) * side
    scale = width / VW
    x = (size - width) / 2
    y = (size - VH * scale) / 2
    stops = settings["background"]
    gradient = "".join(
        f'<stop offset="{number(i / (len(stops) - 1))}" stop-color="{c}"/>'
        for i, c in enumerate(stops)
    )
    symbol = simple_on_navy() if small else symbol_body("on-dark", "s-")
    glow = symbol_body("on-dark", "g-")
    blur = width * 0.07
    glowing = (
        ""
        if small
        else f'<g opacity="{settings["glow"]}" filter="url(#glow)">'
        f"{placed(glow, VIEW, x, y, scale)}</g>"
    )
    body = (
        f'<defs><radialGradient id="field" cx="0.5" cy="0.48" r="0.62">{gradient}'
        f'</radialGradient><filter id="glow" x="-50%" y="-50%" width="200%" height="200%">'
        f'<feGaussianBlur stdDeviation="{number(blur / scale)}"/></filter>'
        f'<clipPath id="shape"><rect x="{number(inset)}" y="{number(inset)}" '
        f'width="{number(side)}" height="{number(side)}" rx="{number(radius)}"/></clipPath></defs>'
        f'<g clip-path="url(#shape)"><rect width="{size}" height="{size}" fill="url(#field)"/>'
        f"{glowing}{placed(symbol, VIEW, x, y, scale)}</g>"
    )
    return svg((0, 0, size, size), body)


def favicon_svg():
    settings = CONFIG["favicon"]
    light, dark = settings["light"], settings["dark"]
    x1, y1, x2, y2 = settings["gradient"]
    body = symbol_body("mono").replace('fill="currentColor"', "", 1)
    body = body.replace("<path ", '<path fill="url(#fill)" ', 1)
    body = body.replace('<circle fill="currentColor"', '<circle class="dot"', 1)
    style = (
        f"<style>.from{{stop-color:{light['from']}}}.to{{stop-color:{light['to']}}}"
        f".dot{{fill:{light['dot']}}}@media (prefers-color-scheme:dark){{"
        f".from{{stop-color:{dark['from']}}}.to{{stop-color:{dark['to']}}}"
        f".dot{{fill:{dark['dot']}}}}}</style>"
    )
    defs = (
        f'<defs><linearGradient id="fill" gradientUnits="userSpaceOnUse" x1="{x1}" '
        f'y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" class="from"/>'
        f'<stop offset="1" class="to"/></linearGradient></defs>'
    )
    # Square, so it sits centred in a tab.
    side = max(VW, VH) + 8
    view = (VX + VW / 2 - side / 2, VY + VH / 2 - side / 2, side, side)
    return svg(view, style + defs + body)


# ── Rendering ────────────────────────────────────────────────────────────


def render(svg_text, width=None, height=None):
    """The SVG rendered by `resvg`, as a Pillow image."""
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / "in.svg"
        target = Path(directory) / "out.png"
        source.write_text(svg_text)
        size = ["-w", str(width)] if width else ["-h", str(height)]
        subprocess.run(["resvg", *size, str(source), str(target)], check=True)
        image = Image.open(target)
        image.load()
        return image.convert("RGBA")


def png(image):
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


def ico(images):
    buffer = io.BytesIO()
    largest = images[-1]
    largest.save(
        buffer,
        "ICO",
        sizes=[im.size for im in images],
        append_images=images[:-1],
    )
    return buffer.getvalue()


def icns(image, smaller):
    buffer = io.BytesIO()
    image.save(buffer, "ICNS", append_images=smaller)
    return buffer.getvalue()


# ── Outputs ──────────────────────────────────────────────────────────────


def generate():
    """Returns {path relative to the repository: (bytes, description)}."""
    out = {}

    def kit(path, data, what):
        out[f"targets/brand-kit/{path}"] = (data, what)

    marks = {}
    for appearance in APPEARANCES:
        mono = appearance == "mono"
        marks[f"symbol-{appearance}"] = svg(VIEW, symbol_body(appearance))
        marks[f"wordmark-{appearance}"] = wordmark_svg(appearance)
        for kind in CONFIG["lockups"]:
            marks[f"lockup-{kind}-{appearance}"] = lockup_svg(kind, appearance)
    surfaces = {
        "on-dark": "for dark surfaces",
        "on-light": "for light surfaces",
        "mono": "in one colour (`currentColor`; black as an image)",
    }
    what = {
        "symbol": "The symbol",
        "wordmark": "The wordmark",
        "lockup-horizontal": "The symbol with the wordmark beside it",
        "lockup-stacked": "The symbol with the wordmark below it",
    }
    for name, text in marks.items():
        kind, appearance = re.fullmatch(r"(.*)-(on-dark|on-light|mono)", name).groups()
        kit(f"svg/{name}.svg", text.encode(), f"{what[kind]}, {surfaces[appearance]}.")
        for height in CONFIG["png"][kind]:
            image = render(text, height=height)
            kit(
                f"png/{name}-{height}.png",
                png(image),
                f"{what[kind]}, {surfaces[appearance]}, {height}px high.",
            )

    # Application icons.
    app = icon_svg("app")
    small = icon_svg("app", small=True)
    limit = CONFIG["icon"]["small"]
    kit("app/icon.svg", app.encode(), "The application icon, as SVG.")
    kit(
        "app/icon-small.svg",
        small.encode(),
        f"The application icon for {limit}px and below, as SVG: the simple symbol.",
    )
    sizes = CONFIG["icon"]["app"]["png"]
    rendered = {
        size: render(small if size <= limit else app, width=size) for size in sizes
    }
    for size, image in rendered.items():
        kit(f"app/icon-{size}.png", png(image), f"The application icon, {size}px.")
    ico_sizes = CONFIG["icon"]["app"]["ico"]
    kit(
        "app/icon.ico",
        ico([rendered[s] for s in ico_sizes]),
        "The application icon for Windows, at "
        + ", ".join(f"{s}" for s in ico_sizes)
        + " px.",
    )
    kit(
        "app/icon.icns",
        icns(rendered[1024], [rendered[s] for s in sizes if s != 1024]),
        "The application icon for macOS.",
    )

    # Web icons.
    web = icon_svg("web")
    for size in CONFIG["icon"]["web"]["png"]:
        name = "apple-touch-icon.png" if size == 180 else f"icon-{size}.png"
        kit(
            f"web/{name}",
            png(render(web, width=size)),
            f"The home-screen icon, {size}px, full bleed.",
        )
    favicon = favicon_svg()
    kit(
        "web/favicon.svg",
        favicon.encode(),
        "The favicon, lighter where the browser's chrome is dark.",
    )
    favicon_sizes = CONFIG["favicon"]["ico"]
    kit(
        "web/favicon.ico",
        ico([render(small, width=s) for s in favicon_sizes]),
        "The favicon, the small application icon, at "
        + ", ".join(map(str, favicon_sizes))
        + " px.",
    )

    kit(
        "LICENSE",
        (BRAND / "LICENSE").read_bytes(),
        "The mark's usage policy. It is not MIT.",
    )
    kit("README.md", readme(out).encode(), None)

    # The marks other targets carry.
    noise = (BRAND / "noise.svg").read_bytes()
    out["targets/web/noise.svg"] = (noise, None)
    out["targets/elements/mark-data.js"] = (mark_module().encode(), None)
    out["targets/elements/LICENSE-mark"] = ((BRAND / "LICENSE").read_bytes(), None)
    return out


def readme(out):
    rows = [
        f"| `{path.removeprefix('targets/brand-kit/')}` | {what} |"
        for path, (_, what) in sorted(out.items())
        if what
    ]
    return "\n".join(
        [
            "# Stemma brand kit",
            "",
            f"<!-- {HEADER} -->",
            "",
            "Every mark, in each appearance, size and format, generated from the",
            "drawn masters in the repository's `source/brand/`. Use the SVG files",
            "wherever they are accepted; the PNG files are for everything else.",
            "",
            "- `on-dark` marks are for dark surfaces, `on-light` for light ones,",
            "  and `mono` for a single colour.",
            "- The wordmark is outlined, so no font is needed to show it.",
            "- Application icons are a rounded square with room around it, as",
            "  macOS draws them; home-screen icons fill their canvas, since the",
            "  platform masks them.",
            "",
            "The mark is not covered by the MIT licence of the repository's code.",
            "Its use is governed by `LICENSE` in this folder.",
            "",
            "## Files",
            "",
            "| File | What it is |",
            "| --- | --- |",
            *rows,
            "",
        ]
    )


def mark_module():
    """The marks `targets/elements` draws: the still symbol in each
    appearance, and the live mark's data."""
    live = json.loads((BRAND / "live-mark.json").read_text())
    master = (BRAND / CONFIG["symbol"]["masters"]["on-dark"]).read_text()
    paths = re.findall(r'<path d="([^"]+)"', master)
    cx, cy, r, fill = re.search(
        r'<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)" fill="(#[0-9a-f]{6})"', master
    ).groups()
    dot_color = [round(int(fill[i : i + 2], 16) / 255, 4) for i in (1, 3, 5)]
    faces = [
        {"d": d, **{k: face[k] for k in ("x0", "y0", "h", "s", "nx", "ny", "cells")}}
        for d, face in zip(paths, live["faces"])
    ]
    still = {
        appearance: svg(VIEW, symbol_body(appearance)).strip()
        for appearance in APPEARANCES
    }
    data = {
        "view": VIEW,
        "faces": faces,
        "dot": [float(cx), float(cy), float(r)],
        "dotColor": dot_color,
        "weights": live["weights"],
        "sigma": live["sigma"],
    }
    return "\n".join(
        [
            f"// {HEADER}",
            "",
            "/** The symbol as SVG, for each appearance. */",
            f"export const stillMarks = {json.dumps(still, indent=4)};",
            "",
            "/** The live mark: each face's colour field, the dot and the halo. */",
            f"export const liveMark = {json.dumps(data)};",
            "",
        ]
    )


# ── Checking ─────────────────────────────────────────────────────────────


def pixels(data):
    """Every image in a raster file, as RGBA pixel data, for comparing."""
    image = Image.open(io.BytesIO(data))
    if image.format == "ICO":
        frames = [image.ico.getimage(size) for size in sorted(image.ico.sizes())]
    elif image.format == "ICNS":
        frames = [image.icns.getimage(size) for size in sorted(image.icns.itersizes())]
    else:
        frames = [image]
    return [(frame.size, frame.convert("RGBA").tobytes()) for frame in frames]


def same(path, data):
    if not path.exists():
        return False
    current = path.read_bytes()
    if current == data:
        return True
    if path.suffix in (".png", ".ico", ".icns"):
        return pixels(current) == pixels(data)
    return False


def main():
    outputs = generate()
    existing = {str(p.relative_to(ROOT)) for p in KIT.rglob("*") if p.is_file()}
    extra = sorted(existing - set(outputs))
    if "--check" in sys.argv:
        stale = [
            name for name, (data, _) in outputs.items() if not same(ROOT / name, data)
        ]
        for name in stale:
            print(f"Out of date: {name}", file=sys.stderr)
        for name in extra:
            print(f"Not generated: {name}", file=sys.stderr)
        if stale or extra:
            print("Run `just generate`.", file=sys.stderr)
            sys.exit(1)
        return
    for name in extra:
        (ROOT / name).unlink()
    for name, (data, _) in outputs.items():
        path = ROOT / name
        path.parent.mkdir(parents=True, exist_ok=True)
        if not same(path, data):
            path.write_bytes(data)
    print(f"Wrote {len(outputs)} files")


if __name__ == "__main__":
    main()
