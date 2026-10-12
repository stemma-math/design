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
    an `ORIGIN` note;
  - `source/brand/`: the mark, under its own usage policy.
- `targets/` holds one thin entrypoint per ecosystem. Each target keeps its
  generated files inside its own directory and never refers outside it.
  `targets/web` is the npm package `@stemma-math/design`.
- `scripts/` holds the generators. Generated files are committed, and are
  never edited by hand: change `source/` and run `just generate`.
- `just check` fails while a generated file is out of date, while a colour
  falls below its contrast requirement, or while a file is not formatted.
- Nothing here knows a product's concepts. Tokens and components speak of
  intents (`neutral`, `accent`, `success`, `warning`, `danger`, `info`),
  categorical tones, scales and document typography. Product layout and
  labels belong to the products.
- Font stacks name only the decided faces, then the generic family.
- The tools are Node (Style Dictionary), Python with `fontTools` and
  Brotli, `resvg` and `just`. `nix develop` provides them; without Nix,
  install them by hand and run `npm ci` once.
- Code is MIT (`LICENSE`). Each face keeps its own licence beside it, and
  the mark has its own usage policy in `source/brand/LICENSE`.
