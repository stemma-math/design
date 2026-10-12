# The faces: each as published upstream, with its licence and origin, for
# targets that take whole faces (Typst, desktop, Swift), and the web faces.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-fonts" {} ''
  mkdir -p $out
  cp -r ${perSystem.self.generated}/source/fonts $out/source
  cp -r ${perSystem.self.generated}/targets/web/fonts $out/web
''
