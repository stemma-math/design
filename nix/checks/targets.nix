# Each target the flake builds is the one committed in `targets/`, and the
# catalog is the one committed in `catalog/`.
{
  pkgs,
  flake,
  perSystem,
  ...
}: let
  generated = perSystem.self.generated;
in
  pkgs.runCommand "design-targets-match" {} ''
    for target in web elements rust verso terminal brand-kit; do
      diff -r ${generated}/targets/$target ${flake}/targets/$target
    done
    diff -r ${generated}/catalog ${flake}/catalog
    touch $out
  ''
