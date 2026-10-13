{
  description = "Stemma's design system: tokens, faces, the mark, icons and components, with an entrypoint for each ecosystem";

  inputs = {
    # nixpkgs, the Nix packages collection.
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

    # blueprint, a library for Nix flakes.
    blueprint = {
      url = "github:numtide/blueprint";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # treefmt-nix, treefmt configured with Nix.
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # devshell, a per-project development environment.
    devshell = {
      url = "github:numtide/devshell";
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # pyproject.nix, uv2nix and their build systems: the tools' Python,
    # built from `uv.lock`.
    pyproject-nix = {
      url = "github:pyproject-nix/pyproject.nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    uv2nix = {
      url = "github:pyproject-nix/uv2nix";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    pyproject-build-systems = {
      url = "github:pyproject-nix/build-system-pkgs";
      inputs.pyproject-nix.follows = "pyproject-nix";
      inputs.uv2nix.follows = "uv2nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs:
    inputs.blueprint {
      inherit inputs;
      prefix = "nix/";

      # nix-systems/default, without x86_64-darwin: nixpkgs dropped it in 26.11.
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      # Overlays applied to nixpkgs.
      nixpkgs.overlays = [
        inputs.devshell.overlays.default
      ];
    };
}
