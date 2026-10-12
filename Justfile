# Recipes for working on Stemma's design system. Run `just` to list them.

[private]
default:
    @just --list --unsorted

# Regenerate every generated file from `source/`.
[group('generate')]
generate: tokens fonts glyphs brand

alias build := generate

# Generate the tokens of every target, and check their contrast.
[group('generate')]
tokens: _node-modules
    node scripts/tokens.mjs

# Generate the web faces: WOFF2 split by Unicode range, and fonts.css.
[group('generate')]
fonts:
    python3 scripts/fonts.py

# Generate the glyph sprite and the glyphs the elements draw.
[group('generate')]
glyphs:
    python3 scripts/glyphs.py

# Generate the brand kit, and the marks the other targets carry.
[group('generate')]
brand:
    python3 scripts/brand.py

# Write an inline bundle for a single-file page; see scripts/bundle.mjs for the options.
[group('generate')]
bundle *ARGS:
    node scripts/bundle.mjs {{ ARGS }}

# Format every file in the repository.
[group('development')]
format:
    nix fmt

alias fmt := format

# Run every check: generated files up to date, contrast, the bundle, formatting.
[group('development')]
check: _node-modules
    node scripts/tokens.mjs --check
    python3 scripts/fonts.py --check
    python3 scripts/glyphs.py --check
    python3 scripts/brand.py --check
    node scripts/bundle.mjs --check
    nix flake check

# Install the generators' Node dependencies, once.
[private]
_node-modules:
    @test -d node_modules || npm ci --no-audit --no-fund
