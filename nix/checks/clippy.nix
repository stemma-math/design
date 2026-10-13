# Clippy over every Rust target, with every feature, denying warnings.
{
  pkgs,
  flake,
  ...
}: let
  manifest = pkgs.lib.importTOML (flake + "/Cargo.toml");
in
  pkgs.rustPlatform.buildRustPackage {
    pname = "design-clippy";
    inherit (manifest.workspace.package) version;
    src = flake;
    cargoLock.lockFile = flake + "/Cargo.lock";
    nativeBuildInputs = [pkgs.clippy];
    buildPhase = ''
      runHook preBuild
      cargo clippy --workspace --all-targets --all-features --offline -- --deny warnings
      runHook postBuild
    '';
    doCheck = false;
    installPhase = "touch $out";
  }
