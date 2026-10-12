import Lean

/-! Where this package's files are, found when it is compiled. -/

namespace StemmaDesign

open Lean Elab Term in
/-- The absolute path of the directory of the module it is written in, as a string. -/
elab "stemma_design_dir%" : term => do
  let file ← IO.FS.realPath (← getFileName)
  let some dir := file.parent
    | throwError "cannot find the directory of {file}"
  return mkStrLit dir.toString

end StemmaDesign
