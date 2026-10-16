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

`catalog/` is a living gallery of all of it, drawn with the targets
themselves. The latest release's is at <https://stemma-math.github.io/design/>;
to see the working copy's, run `just catalog` and open
<http://localhost:8000/>.

## Targets

| Target              | Package                              | What it provides                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targets/web`       | `@stemma-math/design` (npm)          | Plain CSS: the faces with `fonts.css`, every token as a custom property in light and dark, base styles, document typography, components, the glyph sprite, the brand light without script, and the favicon and home-screen icons. See its [README](targets/web). |
| `targets/elements`  | `@stemma-math/design-elements` (npm) | Custom elements as plain ES modules: theme switch, copy button, dialog, toasts, tooltip, menu, select, stepper, range, tabs, segmented control, filter chips, the brand light and the live mark. See its [README](targets/elements).                             |
| `targets/rust`      | `stemma-design` (crate)              | The web target's files as constants, to serve under any prefix, and the inline bundle for single-file pages, built from Rust. See its [README](targets/rust).                                                                                                    |
| `targets/terminal`  | `stemma-design-terminal` (crate)     | Roles on the 16 ANSI colours, shared symbols with ASCII alternatives, one colour policy, and themes for clap, cliclack and indicatif. See its [README](targets/terminal).                                                                                        |
| `targets/verso`     | `StemmaDesign` (Lake)                | A Verso theme in plain CSS, and a Lake package that exposes it and its face files as data, without importing Verso. See its [README](targets/verso).                                                                                                             |
| `targets/brand-kit` | files                                | Every mark (symbol, wordmark, lockups) for dark and light surfaces and in one colour, as SVG and PNG; favicons, home-screen and application icons (ICO, ICNS). See its [README](targets/brand-kit).                                                              |

For a page kept in a single HTML file, `just bundle` writes one inline
fragment with the stylesheets, the faces as base64 WOFF2 (the whole math
face with `--math`), the glyph sprite and the chosen elements. The Rust
crate builds the same fragment.

## Using a target

Nothing here needs Nix, or any generator, to be used. Generated files are
committed inside each target, and each target refers only to files inside
its own folder. Take a tagged version with the ecosystem's own tools:

- **Rust.** Cargo finds each crate by name in the repository:
  ```toml
  stemma-design = { git = "https://github.com/stemma-math/design", tag = "vX.Y.Z" }
  stemma-design-terminal = { git = "https://github.com/stemma-math/design", tag = "vX.Y.Z" }
  ```
- **Lean.** Require `StemmaDesign` from the repository, with
  `subDir = "targets/verso"`.
- **npm.** Install the package tarballs attached to the GitHub release,
  since npm cannot install a subdirectory of a git repository:
  ```sh
  npm install https://github.com/stemma-math/design/releases/download/vX.Y.Z/stemma-math-design-X.Y.Z.tgz
  npm install https://github.com/stemma-math/design/releases/download/vX.Y.Z/stemma-math-design-elements-X.Y.Z.tgz
  ```
- **Files.** Copy `targets/web`, `targets/elements` or `targets/brand-kit`
  from a tagged version and use it as it is.

### Through Nix

The flake builds every target from `source/` with the same generators:
`packages.<system>.{web, elements, rust, verso, terminal, brand-kit, fonts,
catalog}`. A repository that takes this one as a flake input can use them
directly:

```nix
inputs.design.url = "github:stemma-math/design/vX.Y.Z";
# …
inputs.design.packages.${system}.web
```

`nix flake check` builds each one and fails unless it is identical to what
is committed in `targets/` and `catalog/`.

## Source

| Folder           | What it holds                                                                                                                                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/tokens/` | Tokens in the Design Tokens Community Group format, by tier: `brand.json` (primitives), `semantic.json` (light), `themes/dark.json` and `density.json`.                                                                                                   |
| `source/fonts/`  | Each face as published upstream, with its licence and an `ORIGIN` note; `faces.json` lists the faces every target ships.                                                                                                                                  |
| `source/brand/`  | The drawn masters of the mark, the live mark's data, the grain texture, and `brand.json`, how the wordmark, lockups and icons are built.                                                                                                                  |
| `source/glyphs/` | One SVG per line glyph.                                                                                                                                                                                                                                   |
| `tools/`         | The generators, as one Python package: `tokens` (and the contrast checks), `fonts` (fontTools), `glyphs`, `brand` (HarfBuzz, fontTools, resvg, Pillow), `targets` (the Rust crate's and the Verso theme's copies) and `bundle`; and the catalog's server. |

## Development

The tools are Python, `resvg`, Rust, `elan` and `just`. The Python
packages are declared in `pyproject.toml` and pinned in `uv.lock`, which
both ways of working install from:

- With Nix, `nix develop` provides every tool, the Python built from
  `uv.lock`.
- Without Nix, `uv sync` makes the Python environment, and `uv run just …`
  runs a recipe in it; install `resvg`, Rust, `elan` and `just` by hand.

```sh
nix develop     # enter the development shell
just generate   # regenerate every target from source/
just check      # generated files, contrast, the bundle, Rust, Lean, formatting, the flake
just catalog    # serve the catalog
just format     # format every file
```

`just check` fails while a generated file is out of date, or while a
colour falls below its contrast requirement in either appearance.

## Versions

Every target shares one version, written in `VERSION`. `just generate`
copies it everywhere else it appears (the crates, the npm packages, the
Lake package), and `just check` fails while any of them differs.

Releasing is changing `VERSION` in a pull request. When it reaches `main`,
the release workflow tags it `vX.Y.Z`, which is what Cargo, Lake and Nix
take, publishes a GitHub release with the npm tarballs, and publishes
that version's catalog on GitHub Pages. While the
version is 0.0.0, nothing is released.

## Licences

- Code and stylesheets: MIT, in `LICENSE`.
- Faces: each under its own licence, beside it in `source/fonts/` and in
  every target that ships it.
- The mark: a usage policy of its own, in `source/brand/LICENSE`, copied
  into every target that carries the mark.
