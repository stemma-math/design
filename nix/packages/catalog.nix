# The catalog, with the targets it is drawn with beside it under
# `targets/`, its `../targets/` made `./targets/` so it can be served from
# any path: serve this directory.
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
    sed -i 's#\.\./targets/#./targets/#g' $out/*.html $out/*.js $out/*.css
  ''
