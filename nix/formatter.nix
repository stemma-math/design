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
      "package-lock.json"
      "targets/web/tokens.css"
      "targets/web/fonts.css"
    ];

    # Nix.
    programs.alejandra.enable = true;

    # CSS, JavaScript, JSON and Markdown. Stylesheets and scripts are
    # indented by four spaces; data and prose by two.
    programs.prettier = {
      enable = true;
      settings = {
        tabWidth = 4;
        printWidth = 100;
        overrides = [
          {
            files = ["*.json" "*.md"];
            options.tabWidth = 2;
          }
        ];
      };
    };

    # Python.
    programs.ruff-format.enable = true;

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
