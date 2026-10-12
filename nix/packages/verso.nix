# The `targets/verso` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-verso" {} ''
  cp -r ${perSystem.self.generated}/targets/verso $out
''
