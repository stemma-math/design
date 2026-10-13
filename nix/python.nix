# The Python the tools in `tools/` run with: the versions `uv.lock` pins,
# built by uv2nix, so `uv sync` and Nix install the same set.
{
  pkgs,
  inputs,
}: let
  inherit (pkgs) lib;
  # Only the project's metadata and lock, so editing the tools rebuilds
  # nothing.
  workspace = inputs.uv2nix.lib.workspace.loadWorkspace {
    workspaceRoot = lib.fileset.toSource {
      root = ../.;
      fileset = lib.fileset.unions [
        ../pyproject.toml
        ../uv.lock
      ];
    };
  };
  pythonSet =
    (pkgs.callPackage inputs.pyproject-nix.build.packages {
      python = pkgs.python3;
    }).overrideScope
    (lib.composeManyExtensions [
      inputs.pyproject-build-systems.overlays.wheel
      (workspace.mkPyprojectOverlay {sourcePreference = "wheel";})
    ]);
in
  pythonSet.mkVirtualEnv "design-tools" workspace.deps.default
