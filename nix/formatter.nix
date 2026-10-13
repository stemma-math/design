# Code formatter for the repository: `nix fmt` formats every file, and
# `nix flake check` checks that every file is formatted.
{
  pkgs,
  inputs,
  flake,
  ...
}: let
  treefmt = inputs.treefmt-nix.lib.evalModule pkgs {
    projectRootFile = "flake.nix";

    # Generated files are checked against their generators instead.
    settings.global.excludes = [
      "uv.lock"
      "targets/web/tokens.css"
      "targets/web/fonts.css"
      "targets/elements/glyphs.js"
      "targets/elements/mark-data.js"
      "targets/brand-kit/README.md"
      "targets/rust/src/assets.rs"
      "targets/rust/src/bundle_data.rs"
      "targets/rust/assets/**"
      "targets/terminal/src/tokens.rs"
      "targets/verso/verso-theme.css"
      "targets/verso/StemmaDesign/Files.lean"
    ];

    # Nix.
    programs.alejandra.enable = true;

    # CSS, JavaScript, JSON, Markdown and YAML. Stylesheets and scripts are
    # indented by four spaces; data, prose and workflows by two.
    programs.prettier = {
      enable = true;
      settings = {
        tabWidth = 4;
        printWidth = 100;
        overrides = [
          {
            files = ["*.json" "*.md" "*.yml" "*.yaml"];
            options.tabWidth = 2;
          }
        ];
      };
    };

    # Python.
    programs.ruff-format.enable = true;

    # Rust, for the edition the workspace uses.
    programs.rustfmt = {
      enable = true;
      edition = "2024";
    };

    # TOML, ordered and validated with the JSON Schemas that tombi ships
    # (Cargo.toml, lakefile.toml, …). Offline, so that it also runs in the
    # build sandbox.
    settings.formatter.tombi = {
      command = pkgs.lib.getExe pkgs.tombi;
      options = ["format" "--offline"];
      includes = ["*.toml"];
    };

    # The Justfile.
    programs.just.enable = true;
  };
in
  treefmt.config.build.wrapper.overrideAttrs (old: {
    passthru =
      old.passthru
      // {
        tests.check = treefmt.config.build.check flake;
      };
  })
