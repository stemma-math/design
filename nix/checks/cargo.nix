# The Rust targets' tests, with every feature.
{
  pkgs,
  flake,
  ...
}: let
  manifest = pkgs.lib.importTOML (flake + "/Cargo.toml");
in
  pkgs.rustPlatform.buildRustPackage {
    pname = "design-cargo-tests";
    inherit (manifest.workspace.package) version;
    src = flake;
    cargoLock.lockFile = flake + "/Cargo.lock";
    cargoBuildFlags = ["--workspace" "--all-features"];
    cargoTestFlags = ["--workspace" "--all-features"];
    # Nothing to install: the libraries are consumed from source.
    installPhase = "touch $out";
  }
