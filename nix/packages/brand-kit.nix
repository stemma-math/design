# The `targets/brand-kit` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-brand-kit" {} ''
  cp -r ${perSystem.self.generated}/targets/brand-kit $out
''
