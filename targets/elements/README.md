# @stemma-math/design-elements

Behaviour for Stemma's design system: custom elements that work in any
page, with any framework or none. They are plain ES modules, with no build
step and no dependencies, and they draw with the classes of
[`@stemma-math/design`](../web), which a page loads beside them.

Importing a module defines its element. Import `index.js` for all of them,
or one module for one element.

```html
<link rel="stylesheet" href="…/@stemma-math/design/index.css" />
<script type="module" src="…/@stemma-math/design-elements/index.js"></script>
```

## What it provides

| Module            | Element                 | What it does                                                                                                                                                     |
| ----------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme-switch.js` | `<stemma-theme-switch>` | Chooses the appearance (system, light, dark), sets `data-theme` on the root and remembers it. Also exports `applyStoredTheme()`, to call before the page paints. |
| `copy-button.js`  | `<stemma-copy-button>`  | Copies `value`, or the text of the element `for` names, and says so.                                                                                             |
| `dialog.js`       | `<stemma-dialog>`       | Opens a native modal `dialog.dialog` from `data-opens`, closes it from `data-closes` or the backdrop, and returns focus.                                         |
| `toast-region.js` | `<stemma-toast-region>` | Shows toasts in an intent, with an action, a close button and a time that stops under the pointer or focus.                                                      |
| `tooltip.js`      | `<stemma-tooltip>`      | Describes an icon-only control, on rest of the pointer or keyboard focus.                                                                                        |
| `menu.js`         | `<stemma-menu>`         | Opens a `.menu` from its button, with arrow keys, Home, End and Escape, and sends `select`.                                                                      |
| `segmented.js`    | `<stemma-segmented>`    | A single choice among the buttons of a `.segmented` control, with arrow keys.                                                                                    |
| `filter-chips.js` | `<stemma-filter-chips>` | Chips turned on and off to filter a view; `single` allows one at a time.                                                                                         |
| `light.js`        | `<stemma-light>`        | The brand light in WebGL: `preset="hero"` moves, `preset="still"` is one quiet frame. `progress` and `withdraw()` take it away towards an `edge`.                |
| `mark.js`         | `<stemma-mark>`         | The symbol, in the page's appearance or a chosen one; `animated` brings it alive in WebGL on dark surfaces.                                                      |
| `index.js`        | all of the above        | Every element, and the theme helpers.                                                                                                                            |

Each module has its `.d.ts` types, and `index.d.ts` maps every tag in
`HTMLElementTagNameMap`. Each module's opening comment documents its
attributes, properties and events.

`glyphs.js` and `mark-data.js` are generated from the repository's
`source/`, and must not be edited here. `internal.js` holds helpers the
elements share; it is not part of the interface.

## Accessibility and motion

- Every control is a native `button`, reachable by keyboard, with ARIA
  state (`aria-pressed`, `aria-expanded`, `aria-describedby`) kept in step.
- Focus returns where it was when a dialog or menu closes.
- With reduced motion, the light and the mark draw still frames, the
  light's withdrawal takes `--dur-ui` instead of `--dur-long`, and the
  stylesheets shorten every transition.
- The light and the live mark pause while the page is hidden, and the
  light while it is out of view.

## The live mark

`<stemma-mark animated>` comes alive only on dark surfaces: its colour
fields are drawn for the symbol on dark. On light surfaces, in one colour,
with reduced motion or without WebGL it is the still SVG.

## Without script, or without WebGL

`<stemma-light>` carries the `.brand-light` class, a CSS gradient with
grain from `@stemma-math/design`, and draws over it only once WebGL works.
A page without script uses `.brand-light` directly. `<stemma-mark>` shows
the still SVG until, and unless, the live mark can be drawn.

## Licences

The code is MIT (`LICENSE`). `mark-data.js` holds the Stemma mark, whose
use is governed by `LICENSE-mark`, not by the MIT licence.
