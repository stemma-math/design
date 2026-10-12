"""Generates the web faces from `source/fonts/`.

    python3 scripts/fonts.py          write targets/web/fonts/ and targets/web/fonts.css
    python3 scripts/fonts.py --check  fail if any differs from what would be written

Text faces are split by `unicode-range`, so a browser downloads only the
ranges a page uses and nothing is cut away. Math faces ship whole. A family
marked `copy` ships its upstream WOFF2 files exactly as published, since its
licence reserves its name for unmodified files. Each family's folder in the
target carries its licences.

Brotli may compress the same font to different bytes from one version to
the next, so the check compares generated fonts after decompressing them.
Copied files must be byte for byte identical to their source.
"""

import io
import json
import logging
import shutil
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont, woff2
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "source" / "fonts"
TARGET = ROOT / "targets" / "web"
FONTS = TARGET / "fonts"

HEADER = "Generated from source/fonts by scripts/fonts.py. Do not edit."


def ranges(spec):
    """Parses `U+0000-00FF, U+0131` into a set of code points."""
    points = set()
    for part in spec.split(","):
        part = part.strip().removeprefix("U+")
        first, _, last = part.partition("-")
        points.update(range(int(first, 16), int(last or first, 16) + 1))
    return points


# The ranges a text face is split into, as Google Fonts splits them. A face
# gets a file for each range it covers. Whatever it covers outside them goes
# into `symbols`, whose `unicode-range` is computed from the face.
SUBSETS = {
    "latin": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, "
    "U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, "
    "U+2215, U+FEFF, U+FFFD",
    "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, "
    "U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, "
    "U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    "greek": "U+0370-0377, U+037A-037F, U+0384-038A, U+038C, U+038E-03A1, U+03A3-03FF, "
    "U+1F00-1FFF",
    "cyrillic": "U+0400-052F, U+1C80-1C8A, U+2116, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
}
NAMED = {name: ranges(spec) for name, spec in SUBSETS.items()}
CLAIMED = set().union(*NAMED.values())


def unicode_range(points, join=True):
    """Writes code points as a `unicode-range`. With `join`, runs are joined
    across code points that no named subset claims: no other file would
    serve them."""
    runs = []
    for point in sorted(points):
        if runs and all(
            p in points or (join and p not in CLAIMED)
            for p in range(runs[-1][1] + 1, point)
        ):
            runs[-1][1] = point
        else:
            runs.append([point, point])
    return ", ".join(f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}" for a, b in runs)


def add_ldot(font):
    """Adds Catalan ŀ (U+0140) and Ŀ (U+013F) as composites of l and L with
    the middle dot (U+00B7), to a TrueType font that lacks them."""
    cmap = font.getBestCmap()
    if 0x0140 in cmap and 0x013F in cmap:
        return
    glyf, hmtx = font["glyf"], font["hmtx"]
    dot = cmap[0x00B7]
    dot_advance, dot_lsb = hmtx[dot]
    dot_glyph = glyf[dot]
    dot_glyph.recalcBounds(glyf)

    def add(name, base, code_point, dot_x, advance):
        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for component_name, x in ((base, 0), (dot, dot_x)):
            component = GlyphComponent()
            component.glyphName = component_name
            component.x, component.y, component.flags = x, 0, 0
            glyph.components.append(component)
        order = font.getGlyphOrder()
        font.setGlyphOrder(order + [name])
        glyf.glyphOrder = font.getGlyphOrder()
        glyf[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx[name] = (advance, glyph.xMin)
        for table in font["cmap"].tables:
            if table.isUnicode():
                table.cmap[code_point] = name

    l, L = cmap[0x6C], cmap[0x4C]
    l_advance, L_advance = hmtx[l][0], hmtx[L][0]
    # ŀ: the dot's ink starts where the l ends, without the dot's left side
    # bearing, so it sets a little tighter than l followed by ·.
    ldot_x = l_advance - dot_glyph.xMin
    add("ldot", l, 0x0140, ldot_x, l_advance + dot_advance - dot_lsb)
    # Ŀ: the dot is centred in the L's open counter.
    dot_width = dot_glyph.xMax - dot_glyph.xMin
    Ldot_x = round(L_advance * 0.55) - dot_glyph.xMin - dot_width // 2
    add("Ldot", L, 0x013F, Ldot_x, L_advance)
    # Tables indexed by glyph that would no longer match.
    for tag in ("hdmx", "LTSH"):
        if tag in font:
            del font[tag]


def load(path, ldot):
    font = TTFont(path, recalcTimestamp=False)
    if ldot:
        add_ldot(font)
        # Round-trip, so the new glyphs are compiled before subsetting.
        buffer = io.BytesIO()
        font.save(buffer)
        buffer.seek(0)
        font = TTFont(buffer, recalcTimestamp=False)
    return font


def woff2_bytes(font, unicodes=None):
    """The font, subset to `unicodes` when given, as WOFF2."""
    font = TTFont(_sfnt(font), recalcTimestamp=False)
    if unicodes is not None:
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        options.glyph_names = False
        options.recalc_timestamp = False
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=unicodes)
        subsetter.subset(font)
    font.flavor = "woff2"
    buffer = io.BytesIO()
    font.save(buffer)
    return buffer.getvalue()


def _sfnt(font):
    buffer = io.BytesIO()
    font.save(buffer)
    buffer.seek(0)
    return buffer


def font_face(family, face, url, unicode_range=None):
    lines = [
        "@font-face {",
        f'    font-family: "{family}";',
        f"    font-style: {face['style']};",
        f"    font-weight: {face['weight']};",
        "    font-display: swap;",
        f'    src: url("{url}") format("woff2");',
    ]
    if unicode_range:
        lines.append(f"    unicode-range: {unicode_range};")
    lines.append("}")
    return "\n".join(lines)


def copy_face(family, face):
    """Returns the files and the `@font-face` rules of a face shipped as
    published: the whole file, and, where upstream offers one, its Latin
    subset. The subset is declared last, so a browser tries it first for the
    code points it covers, and fetches the whole file only for the rest."""
    directory = SOURCE / family["directory"]
    slug = family.get("slug", family["directory"])
    url = f"fonts/{slug}/{face['file']}"
    files = {url: (directory / face["file"]).read_bytes()}
    rules = [font_face(family["family"], face, url)]
    if "latin" in face:
        latin = directory / face["latin"]
        covered = set(TTFont(latin, lazy=True).getBestCmap())
        url = f"fonts/{slug}/{face['latin']}"
        files[url] = latin.read_bytes()
        rules.append(
            font_face(family["family"], face, url, unicode_range(covered, False))
        )
    return files, rules


def build_face(family, face):
    """Returns the files and the `@font-face` rules of one face."""
    # fontTools reports every table it drops while subsetting.
    logging.getLogger("fontTools").setLevel(logging.ERROR)
    directory = SOURCE / family["directory"]
    slug = family.get("slug", family["directory"])
    if family.get("copy"):
        return copy_face(family, face)
    font = load(directory / face["file"], family.get("ldot", False))
    stem = f"{slug}-{face['weight']}" + ("-italic" if face["style"] == "italic" else "")
    if not family["split"]:
        url = f"fonts/{slug}/{stem}.woff2"
        return {url: woff2_bytes(font)}, [font_face(family["family"], face, url)]
    covered = set(font.getBestCmap())
    parts = [(name, covered & points) for name, points in NAMED.items()]
    parts.append(("symbols", covered - CLAIMED))
    files, rules = {}, []
    for name, points in parts:
        if not points:
            continue
        url = f"fonts/{slug}/{stem}-{name}.woff2"
        files[url] = woff2_bytes(font, points)
        declared = SUBSETS[name] if name in SUBSETS else unicode_range(points)
        rules.append(font_face(family["family"], face, url, declared))
    return files, rules


def generate():
    """Returns {path relative to the target: bytes} for every output, and
    the paths that must match their source byte for byte."""
    config = json.loads((SOURCE / "faces.json").read_text())
    outputs = {}
    exact = set()
    css = [
        f"/* {HEADER}",
        " *",
        " * Text faces are split by `unicode-range`; the math face is whole, and",
        " * JuliaMono is upstream's own WOFF2. Each family's licences sit beside",
        " * its files in `fonts/`. `swap`, because text is worth reading in a",
        " * fallback face while the real one arrives.",
        " */",
    ]
    for family in config["families"]:
        slug = family.get("slug", family["directory"])
        for license in family["licenses"]:
            outputs[f"fonts/{slug}/{license}"] = (
                SOURCE / family["directory"] / license
            ).read_bytes()
            exact.add(f"fonts/{slug}/{license}")
    faces = [
        (family, face) for family in config["families"] for face in family["faces"]
    ]
    with ProcessPoolExecutor() as pool:
        for (family, _), (files, rules) in zip(
            faces, pool.map(build_face, *zip(*faces))
        ):
            outputs.update(files)
            if family.get("copy"):
                exact.update(files)
            css.extend(rules)
    outputs["fonts.css"] = ("\n\n".join(css) + "\n").encode()
    return outputs, exact


def same(path, data, exact):
    """Whether the file at `path` holds `data`, comparing WOFF2 decompressed
    unless it must be `exact`."""
    if not path.exists():
        return False
    current = path.read_bytes()
    if current == data or exact or path.suffix != ".woff2":
        return current == data

    def decompressed(raw):
        out = io.BytesIO()
        woff2.decompress(io.BytesIO(raw), out)
        return out.getvalue()

    return decompressed(current) == decompressed(data)


def main():
    outputs, exact = generate()
    existing = {str(p.relative_to(TARGET)) for p in FONTS.rglob("*") if p.is_file()}
    extra = sorted(existing - set(outputs))
    if "--check" in sys.argv:
        stale = [
            name
            for name, data in outputs.items()
            if not same(TARGET / name, data, name in exact)
        ]
        if stale or extra:
            for name in stale:
                print(f"Out of date: targets/web/{name}", file=sys.stderr)
            for name in extra:
                print(f"Not generated: targets/web/{name}", file=sys.stderr)
            print("Run `just generate`.", file=sys.stderr)
            sys.exit(1)
        return
    if FONTS.exists():
        shutil.rmtree(FONTS)
    for name, data in outputs.items():
        path = TARGET / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    print(f"Wrote {len(outputs)} files in targets/web")


if __name__ == "__main__":
    main()
