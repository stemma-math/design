# The `targets/terminal` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-terminal" {} ''
  cp -r ${perSystem.self.generated}/targets/terminal $out
''
