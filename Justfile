# Recipes for working on Stemma's design system. Run `just` to list them.

[private]
default:
    @just --list --unsorted

# Regenerate every generated file from `source/`.
[group('generate')]
generate: tokens fonts glyphs brand targets

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

# Copy the web target's files into the Rust crate and the Verso theme. Runs last.
[group('generate')]
targets:
    node scripts/targets.mjs

# Write an inline bundle for a single-file page; see scripts/bundle.mjs for the options.
[group('generate')]
bundle *ARGS:
    node scripts/bundle.mjs {{ ARGS }}

# Serve the catalog at http://localhost:8000/catalog/.
[group('development')]
catalog port="8000":
    @echo "The catalog is at http://localhost:{{ port }}/catalog/"
    python3 -m http.server {{ port }} --bind 127.0.0.1

# Run the Rust tests, with and without the optional features.
[group('development')]
test:
    cargo test --workspace --all-features
    cargo test --workspace
    cd targets/verso && lake build

# Format every file in the repository.
[group('development')]
format:
    nix fmt

alias fmt := format

# Run every check: generated files up to date, contrast, the bundle, the
# Rust and Lean targets, formatting and the flake's checks.
[group('development')]
check: _node-modules
    node scripts/tokens.mjs --check
    python3 scripts/fonts.py --check
    python3 scripts/glyphs.py --check
    python3 scripts/brand.py --check
    node scripts/targets.mjs --check
    node scripts/bundle.mjs --check
    cargo clippy --workspace --all-targets --all-features -- --deny warnings
    just test
    nix flake check

# Install the generators' Node dependencies, once.
[private]
_node-modules:
    @test -d node_modules || npm ci --no-audit --no-fund
