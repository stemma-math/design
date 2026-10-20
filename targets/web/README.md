# @stemma-math/design

Stemma's design system for the web, as plain CSS: faces, tokens, base
styles, document typography and components. There is no JavaScript and
no build step; link the stylesheets, or import them through a bundler.

## What it provides

| File             | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                           | Generated |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `index.css`      | Every file below, imported in order.                                                                                                                                                                                                                                                                                                                                                                                                                    | No        |
| `fonts.css`      | `@font-face` rules for New Computer Modern, New Computer Modern Math, Instrument Sans, Libertinus Sans and JuliaMono. Text faces are split by `unicode-range`; the math face and JuliaMono are whole.                                                                                                                                                                                                                                                   | Yes       |
| `fonts/`         | The WOFF2 files `fonts.css` refers to, one folder per family, each with its licence.                                                                                                                                                                                                                                                                                                                                                                    | Yes       |
| `tokens.css`     | Every token as a custom property on `:root`: colour ramps, ink, surfaces, the six intents, the categorical tones, faces, type, space, radius, shadow, motion and density. Light and dark.                                                                                                                                                                                                                                                               | Yes       |
| `base.css`       | The order of the cascade layers, the page's defaults, links in interface text, focus, reduced motion, and the modifiers that choose a component's tone.                                                                                                                                                                                                                                                                                                 | No        |
| `document.css`   | Typography for documents inside `.document`: headings, prose, lists, tables, quotations, code, figures, references, resolved or not, and MathML formulas.                                                                                                                                                                                                                                                                                               | No        |
| `code.css`       | Colours for highlighted code, from the `--code-*` tokens: the variables of Shiki's CSS variables theme, and the classes of highlight.js.                                                                                                                                                                                                                                                                                                                | No        |
| `components.css` | Link, button, field, input, choice, switch, range, stepper, select, fieldset, key, chip, count, avatar, card, table, post, copy block, navigation list and folding section, menu, disclosure, scrim, dialog, message, toast, tooltip, segmented control, tabs, breadcrumbs, skeleton, spinner, progress, highlight and the wordmark. The brand light without script (`.brand-light`), and the layout of the elements in `@stemma-math/design-elements`. | No        |
| `glyphs.svg`     | The line glyphs, one `symbol` each, on a 24-unit box.                                                                                                                                                                                                                                                                                                                                                                                                   | Yes       |
| `noise.svg`      | The grain `.brand-light` lays over the brand gradient.                                                                                                                                                                                                                                                                                                                                                                                                  | Yes       |
| `icons/`         | The favicon (SVG, following the appearance; PNG and ICO where SVG is not taken), the home-screen icons and, in `icons/app/`, the application icons for a desktop app, made from the mark.                                                                                                                                                                                                                                                               | Yes       |
| `LICENSE-mark`   | The mark's usage policy, which `icons/` is under.                                                                                                                                                                                                                                                                                                                                                                                                       | Yes       |

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
@import "@stemma-math/design/code.css";
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

### Links and references

A link in interface text without a class of its own is in the link
colour, underlined faintly until hovered, as in a document; `.link` gives
the same look to a link that has a class. In a document, `.ref` is a
reference, and `.ref--unresolved` one that resolves to nothing.

### Navigation lists and avatars

Use `.nav-list` for a list of destinations and `.nav-item` on each link
or button. Wrap the label in `.nav-item__label` so it truncates without
losing the end padding. An optional leading `.avatar` or `.glyph` keeps
its size; a trailing `.count` stays visible. `aria-current="page"` marks
the current destination; omit it or set it to `false` elsewhere.

```html
<nav aria-label="Places">
  <details class="nav-section" open>
    <summary class="nav-section__heading">
      <span class="nav-item__label">Library</span>
    </summary>
    <ul class="nav-list">
      <li>
        <a class="nav-item" href="/library" aria-current="page">
          <span class="avatar avatar--small avatar--square" aria-hidden="true">NT</span>
          <span class="nav-item__label">Number theory</span>
        </a>
      </li>
    </ul>
  </details>
</nav>
```

The native `details` and `summary` fold the section by keyboard as well
as pointer. Lists keep ordinary link navigation and need no menu roles
or JavaScript. Item and heading padding follows the density, leaving
space above and below a full-size avatar too.

`.avatar--small` is 24px in either density, so it fits within
`--control-small-height`. It combines with `--square`, `--brand`, every
tone and a child `img`; the other avatar sizes stay 34px and 42px.

### Scrims

`--scrim` is the translucent fill behind modal overlays, with a value
for each appearance. `.scrim` applies it as a background, and
`.dialog::backdrop` uses the same token. Place a scrim over the page and
behind the drawer or panel; the product owns its positioning, stacking,
dismissal and focus management.

### Icons

`icons/` holds the favicon and home-screen icons, made from the mark.
Link them from the page's `head`:

```html
<link rel="icon" href="…/@stemma-math/design/icons/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="…/@stemma-math/design/icons/favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="…/@stemma-math/design/icons/apple-touch-icon.png" />
```

A web app manifest lists `icon-192.png` and `icon-512.png`:

```json
"icons": [
  { "src": "…/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
  { "src": "…/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
]
```

`icons/app/` holds the application icon, a rounded square with room
around it as macOS draws them: `icon.icns` for macOS, `icon.ico` for
Windows, and PNG from 16 to 1024 pixels, which a desktop app's bundle
takes as they are.

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

The stylesheets are MIT (`LICENSE`). The icons in `icons/` are the Stemma
mark, whose use is governed by `LICENSE-mark`, not by the MIT licence. Each face in `fonts/` keeps its own
licence beside it: the SIL Open Font License for Instrument Sans,
Libertinus Sans and JuliaMono, and the GUST Font License (LPPL 1.3c) for
New Computer Modern. JuliaMono ships as upstream publishes its WOFF2
files, unchanged, since its licence reserves its name. The other faces are
converted to WOFF2, and text faces are split by Unicode range; beyond that,
only Instrument Sans is changed, to add the Catalan ŀ and Ŀ.
