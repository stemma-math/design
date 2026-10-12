# The catalog, with the targets it is drawn with, at the same relative
# paths: serve this directory and open `catalog/`.
{
  pkgs,
  perSystem,
  ...
}: let
  generated = perSystem.self.generated;
in
  pkgs.runCommand "design-catalog" {} ''
    mkdir -p $out/targets
    cp -r ${generated}/catalog $out/catalog
    for target in web elements brand-kit; do
      cp -r ${generated}/targets/$target $out/targets/$target
    done
  ''
