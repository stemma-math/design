# The `targets/web` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-web" {} ''
  cp -r ${perSystem.self.generated}/targets/web $out
''
