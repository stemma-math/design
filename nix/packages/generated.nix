# Every target, generated from `source/` by the same generators `just
# generate` runs, from a copy of the repository. Not hermetic in spirit (it
# starts from the committed targets, whose hand-written files it keeps), but
# it builds in the sandbox, with the tools pinned by this flake.
{
  pkgs,
  inputs,
  flake,
  ...
}: let
  python = import ../python.nix {inherit pkgs inputs;};
in
  pkgs.stdenvNoCC.mkDerivation {
    name = "design-generated";
    src = flake;

    nativeBuildInputs = [python pkgs.resvg];

    # The outputs are data; nothing to patch.
    dontFixup = true;

    buildPhase = ''
      runHook preBuild
      python -m tools generate
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      mkdir -p $out
      cp -r targets catalog $out/
      mkdir -p $out/source
      cp -r source/fonts $out/source/fonts
      runHook postInstall
    '';
  }
