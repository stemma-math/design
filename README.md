# Stemma design

How everything Stemma makes looks: design tokens, faces, the mark, icons
and components. The source of truth, in `source/`, is independent of any
language. Each ecosystem gets a thin entrypoint, a target, in `targets/`,
generated from that source wherever possible.

The design system knows nothing about what Stemma does. It offers intents
(`neutral`, `accent`, `success`, `warning`, `danger`, `info`), a
categorical palette with no meaning, scales, components and document
typography; a product decides when something is `danger` and what its
label says.

## Targets

| Target              | Package                        | What it provides                                                                                                                                                                                                             |
| ------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targets/web`       | `@stemma-math/design`          | Plain CSS: the faces with `fonts.css`, every token as a custom property in light and dark, base styles, document typography, components, the glyph sprite and the brand light without script. See its [README](targets/web). |
| `targets/elements`  | `@stemma-math/design-elements` | Custom elements as plain ES modules: theme switch, copy button, dialog, toasts, tooltip, menu, segmented control, filter chips, the brand light and the live mark. See its [README](targets/elements).                       |
| `targets/brand-kit` | files                          | Every mark (symbol, wordmark, lockups) for dark and light surfaces and in one colour, as SVG and PNG; favicons, home-screen and application icons (ICO, ICNS). See its [README](targets/brand-kit).                          |

For a page kept in a single HTML file, `just bundle` writes one inline
fragment with the stylesheets, the faces as base64 WOFF2 (the whole math
face with `--math`), the glyph sprite and the chosen elements.

## Using a target

Nothing here needs Nix, or any generator, to be used. Generated files are
committed inside each target, and each target refers only to files inside
its own folder.

- **npm.** Install the package tarball attached to a GitHub release, since
  npm cannot install a subdirectory of a git repository.
- **Files.** Copy `targets/web`, `targets/elements` or
  `targets/brand-kit` from a tagged version and use it as it is.

## Source

| Folder           | What it holds                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/tokens/` | Tokens in the Design Tokens Community Group format, by tier: `brand.json` (primitives), `semantic.json` (light), `themes/dark.json` and `density.json`. |
| `source/fonts/`  | Each face as published upstream, with its licence and an `ORIGIN` note; `faces.json` lists the faces every target ships.                                |
| `source/brand/`  | The drawn masters of the mark, the live mark's data, the grain texture, and `brand.json`, how the wordmark, lockups and icons are built.                |
| `source/glyphs/` | One SVG per line glyph.                                                                                                                                 |
| `scripts/`       | The generators: `tokens.mjs` (Style Dictionary), `fonts.py` (fontTools), `glyphs.py`, `brand.py` (HarfBuzz, fontTools, resvg, Pillow) and `bundle.mjs`. |

## Development

The tools are Node, Python with `fontTools`, Brotli, `uharfbuzz` and
Pillow, `resvg` and `just`. The Nix flake's development shell provides them. Without Nix,
install Node 24, `resvg` and `just` by hand, the Python packages with
`python3 -m pip install -r scripts/requirements.txt`, and the Node ones
with `npm ci`.

```sh
nix develop     # enter the development shell
just generate   # regenerate every target from source/
just check      # generated files up to date, contrast, formatting
just format     # format every file
```

`just check` fails while a generated file is out of date, or while a
colour falls below its contrast requirement in either appearance.

## Licences

- Code and stylesheets: MIT, in `LICENSE`.
- Faces: each under its own licence, beside it in `source/fonts/` and in
  every target that ships it.
- The mark: a usage policy of its own, in `source/brand/LICENSE`.
