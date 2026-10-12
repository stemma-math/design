# Development shell: the tools the generators call. None of them is needed
# to consume a target, only to regenerate one after changing `source/`.
{pkgs, ...}: let
  inherit (pkgs) lib stdenv;
in
  pkgs.devshell.mkShell {
    devshell = {
      name = "design";

      packages = [
        # Faces are subset and converted with fontTools, and WOFF2 needs
        # Brotli. The wordmark is shaped with HarfBuzz and outlined with
        # fontTools. Pillow writes the ICO and ICNS icons and compares
        # rendered images.
        (pkgs.python3.withPackages (ps: [
          ps.fonttools
          ps.brotli
          ps.uharfbuzz
          ps.pillow
        ]))
        # The Rust targets.
        pkgs.rustc
        pkgs.clippy
        pkgs.rustfmt
      ];
    };

    env = lib.optionals stdenv.hostPlatform.isDarwin [
      {
        # Link against the nixpkgs SDK, and for the macOS version the
        # nixpkgs Rust standard library is built for.
        name = "SDKROOT";
        value = "${pkgs.apple-sdk.sdkroot}";
      }
      {
        name = "MACOSX_DEPLOYMENT_TARGET";
        value = stdenv.hostPlatform.darwinMinVersion;
      }
      {
        # Rust's standard library links against libiconv on macOS.
        name = "LIBRARY_PATH";
        value = "${pkgs.libiconv}/lib";
      }
    ];

    commands = [
      {
        package = pkgs.git;
        help = "Version control";
      }
      {
        package = pkgs.just;
        help = "Run the repository's recipes; type 'just' to list them";
      }
      {
        package = pkgs.nodejs;
        help = "Runs Style Dictionary, which generates the tokens";
      }
      {
        package = pkgs.resvg;
        help = "Renders raster assets from the SVG masters";
      }
      {
        package = pkgs.cargo;
        help = "Builds and tests the Rust targets";
      }
      {
        package = pkgs.elan;
        help = "Lean toolchain manager, for the Verso target; its toolchain is pinned in targets/verso/lean-toolchain";
      }
    ];
  }
