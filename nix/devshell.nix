# Development shell: the tools the generators call. None of them is needed
# to consume a target, only to regenerate one after changing `source/`.
{pkgs, ...}:
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
    ];
  };

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
  ];
}
