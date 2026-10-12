# Every target, generated from `source/` by the same generators `just
# generate` runs, from a copy of the repository. Not hermetic in spirit (it
# starts from the committed targets, whose hand-written files it keeps), but
# it builds in the sandbox, with the tools pinned by this flake.
{
  pkgs,
  flake,
  ...
}: let
  inherit (pkgs) lib;
  root = ../..;
  python = pkgs.python3.withPackages (ps: [
    ps.fonttools
    ps.brotli
    ps.uharfbuzz
    ps.pillow
  ]);
  # The generators' Node dependencies, from the lock file.
  nodeModules = pkgs.importNpmLock.buildNodeModules {
    inherit (pkgs) nodejs;
    npmRoot = lib.fileset.toSource {
      inherit root;
      fileset = lib.fileset.unions [
        (root + "/package.json")
        (root + "/package-lock.json")
      ];
    };
  };
in
  pkgs.stdenvNoCC.mkDerivation {
    name = "design-generated";
    src = flake;

    nativeBuildInputs = [pkgs.nodejs python pkgs.resvg];

    # The outputs are data; nothing to patch.
    dontFixup = true;

    buildPhase = ''
      runHook preBuild
      ln -s ${nodeModules}/node_modules node_modules
      node scripts/tokens.mjs
      python3 scripts/fonts.py
      python3 scripts/glyphs.py
      python3 scripts/brand.py
      node scripts/targets.mjs
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
