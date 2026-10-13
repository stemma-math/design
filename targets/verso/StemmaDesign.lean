import StemmaDesign.Files
import StemmaDesign.Root

/-!
# Stemma's design, for Verso

Data only: this package does not import Verso, so it does not depend on Verso's version.

- `themeCss` is a Verso theme in plain CSS: Stemma's faces and tokens, Verso's own variables
  mapped onto those tokens, and the document typography and components of `@stemma-math/design`.
- `files` lists the files the theme refers to, relative to it, and `copyFiles` copies them
  beside it in a site's output. Among them are the glyph sprite, `glyphs`, and the custom
  elements, whose module is `elements`.
-/

namespace StemmaDesign

/-- The Verso theme: give it to a site as extra CSS, and copy `files` beside it. -/
def themeCss : String := include_str "verso-theme.css"

/-- The glyph sprite, relative to the theme: draw a glyph with
`<svg class="glyph"><use href="…/glyphs.svg#name"/></svg>`. -/
def glyphs : String := "glyphs.svg"

/-- The module that defines every custom element, relative to the theme: load it with
`<script type="module" src="…/elements/index.js">`. -/
def elements : String := "elements/index.js"

/-- The directory this package was compiled in, where `files` are. -/
def directory : System.FilePath := stemma_design_dir%

/-- Copies every file in `files` from this package into `destination`, at the same relative
paths, so that `themeCss` finds them when it is served from `destination`. -/
def copyFiles (destination : System.FilePath) : IO Unit := do
  for file in files do
    let target := destination / file
    if let some parent := target.parent then
      IO.FS.createDirAll parent
    IO.FS.writeBinFile target (← IO.FS.readBinFile (directory / file))

end StemmaDesign
