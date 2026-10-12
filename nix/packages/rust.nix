# The `targets/rust` target, generated from `source/`.
{
  pkgs,
  perSystem,
  ...
}:
pkgs.runCommand "design-rust" {} ''
  cp -r ${perSystem.self.generated}/targets/rust $out
''
