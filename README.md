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

| Target        | Package               | What it provides                                                                                                                                                                          |
| ------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `targets/web` | `@stemma-math/design` | Plain CSS: the faces as split WOFF2 with `fonts.css`, every token as a custom property in light and dark, base styles, document typography and components. See its [README](targets/web). |

## Using a target

Nothing here needs Nix, or any generator, to be used. Generated files are
committed inside each target, and each target refers only to files inside
its own folder.

- **npm.** Install the package tarball attached to a GitHub release, since
  npm cannot install a subdirectory of a git repository.
- **Files.** Copy `targets/web` from a tagged version and serve it as it
  is.

## Source

| Folder           | What it holds                                                                                                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source/tokens/` | Tokens in the Design Tokens Community Group format, by tier: `brand.json` (primitives), `semantic.json` (light), `themes/dark.json` and `density.json`. |
| `source/fonts/`  | Each face as published upstream, with its licence and an `ORIGIN` note; `faces.json` lists the faces every target ships.                                |
| `source/brand/`  | The mark, under its own usage policy.                                                                                                                   |
| `scripts/`       | The generators: `tokens.mjs` (Style Dictionary) and `fonts.py` (fontTools).                                                                             |

## Development

The tools are Node, Python with `fontTools` and Brotli, `resvg` and
`just`. The Nix flake's development shell provides them; without Nix,
install them by hand.

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
