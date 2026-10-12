# Recipes for working on Stemma's design system. Run `just` to list them.

[private]
default:
    @just --list --unsorted

# Regenerate every generated file from `source/`.
[group('generate')]
generate: tokens

alias build := generate

# Generate the tokens of every target, and check their contrast.
[group('generate')]
tokens: _node-modules
    node scripts/tokens.mjs

# Format every file in the repository.
[group('development')]
format:
    nix fmt

alias fmt := format

# Run every check: generated files up to date, contrast, formatting.
[group('development')]
check: _node-modules
    node scripts/tokens.mjs --check
    nix flake check

# Install the generators' Node dependencies, once.
[private]
_node-modules:
    @test -d node_modules || npm ci --no-audit --no-fund
