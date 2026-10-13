# Recipes for working on Stemma's design system. Run `just` to list them.
#
# The tools in `tools/` run with the Python of the Nix development shell,
# or, without Nix, of the environment `uv sync` makes: `uv run just …`.

[private]
default:
    @just --list --unsorted

# Regenerate every generated file from `source/`, or only some steps:
# tokens, fonts, glyphs, brand, targets.
[group('generate')]
generate *STEPS:
    python -m tools generate {{ STEPS }}

alias build := generate

# Write an inline bundle for a single-file page; see tools/bundle.py for the options.
[group('generate')]
bundle *ARGS:
    python -m tools bundle {{ ARGS }}

# Serve the catalog at http://localhost:8000/.
[group('development')]
catalog port="8000":
    python -m tools catalog {{ port }}

# Run the Rust tests, with and without the optional features, and build the Lean package.
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
check:
    python -m tools check
    cargo clippy --workspace --all-targets --all-features -- --deny warnings
    just test
    nix flake check
