# The `targets/elements` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-elements" {} ''
  cp -r ${perSystem.self.generated}/targets/elements $out
''
