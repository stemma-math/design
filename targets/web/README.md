# @stemma-math/design

Stemma's design system for the web, as plain CSS: faces, tokens, base
styles, document typography and components. There is no JavaScript and
no build step; link the stylesheets, or import them through a bundler.

## What it provides

| File             | What it holds                                                                                                                                                                                                                                                                                                                                                                       | Generated |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `index.css`      | Every file below, imported in order.                                                                                                                                                                                                                                                                                                                                                | No        |
| `fonts.css`      | `@font-face` rules for New Computer Modern, New Computer Modern Math, Instrument Sans, Libertinus Sans and JuliaMono. Text faces are split by `unicode-range`; the math face and JuliaMono are whole.                                                                                                                                                                               | Yes       |
| `fonts/`         | The WOFF2 files `fonts.css` refers to, one folder per family, each with its licence.                                                                                                                                                                                                                                                                                                | Yes       |
| `tokens.css`     | Every token as a custom property on `:root`: colour ramps, ink, surfaces, the six intents, the categorical tones, faces, type, space, radius, shadow, motion and density. Light and dark.                                                                                                                                                                                           | Yes       |
| `base.css`       | The order of the cascade layers, the page's defaults, focus, reduced motion, and the modifiers that choose a component's tone.                                                                                                                                                                                                                                                      | No        |
| `document.css`   | Typography for documents inside `.document`: headings, prose, lists, tables, quotations, code, figures, references and MathML formulas.                                                                                                                                                                                                                                             | No        |
| `components.css` | Button, field, input, choice, switch, range, stepper, select, fieldset, key, chip, count, avatar, card, table, menu, disclosure, dialog, message, toast, tooltip, segmented control, tabs, breadcrumbs, skeleton, spinner, progress, highlight and the wordmark. The brand light without script (`.brand-light`), and the layout of the elements in `@stemma-math/design-elements`. | No        |
| `glyphs.svg`     | The line glyphs, one `symbol` each, on a 24-unit box.                                                                                                                                                                                                                                                                                                                               | Yes       |
| `noise.svg`      | The grain `.brand-light` lays over the brand gradient.                                                                                                                                                                                                                                                                                                                              | Yes       |

Generated files are produced from the repository's `source/` and must not
be edited here.

## Using it

```html
<link rel="stylesheet" href="…/@stemma-math/design/index.css" />
```

or, file by file, in this order:

```css
@import "@stemma-math/design/fonts.css";
@import "@stemma-math/design/tokens.css";
@import "@stemma-math/design/base.css";
@import "@stemma-math/design/document.css";
@import "@stemma-math/design/components.css";
```

`fonts.css` refers to `fonts/` beside it, so serve the package's folder as
it is. Nothing in it refers outside the folder.

### Appearance and density

The dark appearance follows the system. Set `data-theme="light"` or
`data-theme="dark"` on the root element to force one. Controls are
comfortable by default; `data-density="compact"` on any element makes the
controls inside it compact.

### Intents and tones

Components that carry a tone take it as a modifier: an intent
(`neutral`, `accent`, `success`, `warning`, `danger`, `info`) or a
categorical tone with no meaning (`indigo`, `teal`, `violet`, `ochre`,
`magenta`, `olive`, `cerulean`, `rust`).

```html
<span class="chip chip--success">Done</span>
<button class="button button--primary button--danger">Delete</button>
<p class="message message--warning">…</p>
```

Each tone is three tokens, `--{tone}`, `--{tone}-text` and `--{tone}-on`.
A component derives its borders, soft fills and hover states from them
with `color-mix()`, and every combination is checked for contrast in both
appearances.

### Glyphs

Each glyph in `glyphs.svg` is drawn in the colour of its text, at 18px, or
14px with `.glyph--small`. Give it a label when it stands alone, or hide it
when words go with it:

```html
<svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#settings" /></svg>
<button class="button button--icon" aria-label="Settings">
  <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#settings" /></svg>
</button>
```

The names are the files in the repository's `source/glyphs/`: `add`,
`alert`, `check`, `chevron-down`, `close`, `copy`, `done`, `info`,
`settings`, `warning` and so on.

### The brand light

`.brand-light` on any element puts the brand light behind its content,
as a gradient with grain: the form without script of the WebGL light that
`<stemma-light>` draws. Text inside it takes the colours for dark
surfaces. `--light-progress`, from 0 to 1, fades it.

### Cascade layers

Every rule sits in the layers `stemma.base`, `stemma.document`,
`stemma.components` and `stemma.tones`, so a consumer's own unlayered
rules always win.

## Licences

The stylesheets are MIT (`LICENSE`). Each face in `fonts/` keeps its own
licence beside it: the SIL Open Font License for Instrument Sans,
Libertinus Sans and JuliaMono, and the GUST Font License (LPPL 1.3c) for
New Computer Modern. JuliaMono ships as upstream publishes its WOFF2
files, unchanged, since its licence reserves its name. The other faces are
converted to WOFF2, and text faces are split by Unicode range; beyond that,
only Instrument Sans is changed, to add the Catalan ŀ and Ŀ.
