# The catalog, with the targets it is drawn with under `targets/`, where
# its `../targets/` reaches them from a server's root: serve this
# directory.
{
  pkgs,
  perSystem,
  ...
}: let
  generated = perSystem.self.generated;
in
  pkgs.runCommand "design-catalog" {} ''
    cp -r ${generated}/catalog $out
    chmod -R u+w $out
    mkdir -p $out/targets
    for target in web elements brand-kit; do
      cp -r ${generated}/targets/$target $out/targets/$target
    done
  ''
