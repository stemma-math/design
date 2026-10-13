# AGENTS.md

This repository belongs to the Stemma organization (`stemma-math`).

## Language

- Write everything in this repository in English: code, identifiers,
  comments, documentation and commit messages. Conversations with the
  people you work with may be in any language.

## Git conventions

- Use Conventional Commits for commit messages. Avoid long descriptions in
  commit bodies, unless necessary.

## Organization defaults

- The organization's `.github` repository provides default issue and pull
  request templates. They are useful, but following them is not required
  unless this repository says otherwise.

## Design

- How Stemma looks is defined here, in `stemma-math/design`: tokens, faces,
  the mark, icons and components, with entrypoints for each ecosystem.
- Other repositories use the intents, scales and components defined here,
  and request what is missing with an issue in this repository.

## This repository

- `source/` is the source of truth, and no consumer imports it directly:
  - `source/tokens/`: design tokens in the Design Tokens Community Group
    format, by tier (`brand.json`, `semantic.json`, `themes/dark.json`,
    `density.json`);
  - `source/fonts/`: each face as published upstream, with its licence and
    an `ORIGIN` note, and `faces.json`, the faces every target ships;
  - `source/brand/`: the drawn masters of the mark (`symbol-*.svg`), the
    live mark's data, the grain texture and `brand.json`, which says how
    the wordmark, lockups and icons are built from them; under the mark's
    own usage policy;
  - `source/glyphs/`: one SVG per line glyph, on a 24-unit box.
- `targets/` holds one thin entrypoint per ecosystem. Each target keeps its
  generated files inside its own directory and never refers outside it:
  - `targets/web`: the npm package `@stemma-math/design`, plain CSS;
  - `targets/elements`: the npm package `@stemma-math/design-elements`,
    custom elements as plain ES modules with `.d.ts` types;
  - `targets/rust`: the crate `stemma-design`, the web target's files as
    constants and the inline bundle;
  - `targets/terminal`: the crate `stemma-design-terminal`, roles,
    symbols, the colour policy and themes for clap, cliclack and indicatif;
  - `targets/verso`: the Lake package `StemmaDesign` and its Verso theme;
    it never imports Verso;
  - `targets/brand-kit`: every mark and icon, as files.
- `catalog/` is a static gallery drawn only with the targets, with no
  framework: foundations, components by group (controls, content,
  feedback, navigation and overlays) and the brand. `catalog.js` draws the
  frame around each page. Add every new token, component or element to
  its page, as a `.specimen`: its name, what it is for, the classes and
  elements it is made with, and a stage showing it. Code in it is
  highlighted with the `hljs-*` classes `code.css` maps.
- `tools/` is one Python package with every generator, run in this order
  by `just generate`: `tokens`, `fonts`, `glyphs`, `brand`, then
  `targets`, which copies the other targets' outputs into the Rust crate
  and the Verso theme. `bundle` writes an inline bundle for a single-file
  page on request, and `catalog` serves the catalog. `common.py` holds how
  a generator writes its files or checks them. Generated files are
  committed, and are never edited by hand: change `source/` and run
  `just generate`.
- `VERSION` is the one version of every target. Change it there and run
  `just generate`; never edit a version in a manifest by hand. Releasing
  is a pull request that changes `VERSION`.
- `just check` fails while a generated file is out of date, while a colour
  falls below its contrast requirement, while the inline bundle does not
  hold together or differs from the Rust crate's, while Clippy warns, a
  test fails or the Lean package does not build, or while a file is not
  formatted. `nix flake check` also builds every target from `source/` and
  compares it with what is committed.
- The Rust crates use the edition of the `stemma` repository (2024), and
  the dependency versions of its command line; the Lean package uses the
  toolchain of its Lean library.
- Nothing here knows a product's concepts. Tokens and components speak of
  intents (`neutral`, `accent`, `success`, `warning`, `danger`, `info`),
  categorical tones, scales and document typography. Product layout,
  choreography and labels belong to the products.
- Font stacks name only the decided faces, then the generic family.
  JuliaMono ships exactly as upstream publishes it: its licence reserves
  its name, so it is never subset or converted.
- Elements have no build step and no framework. They draw with the classes
  of `targets/web`, are usable by keyboard, keep ARIA state in step and
  respect reduced motion.
- The tools are Python, with the packages `uv.lock` pins, `resvg`, Rust,
  `elan` and `just`. `nix develop` provides them, building the Python from
  `uv.lock`; without Nix, run `uv sync` and install the rest by hand. A
  new Python package goes in `pyproject.toml`, then `uv lock`.
- Code is MIT (`LICENSE`). Each face keeps its own licence beside it, and
  the mark has its own usage policy in `source/brand/LICENSE`, copied into
  every target that carries the mark.
