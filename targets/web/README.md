# @stemma-math/design

Stemma's design system for the web, as plain CSS: faces, tokens, base
styles, document typography and components. There is no JavaScript and
no build step; link the stylesheets, or import them through a bundler.

## What it provides

| File             | What it holds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Generated |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| `index.css`      | Every file below, imported in order.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | No        |
| `fonts.css`      | `@font-face` rules for New Computer Modern, New Computer Modern Math, Instrument Sans, Libertinus Sans and JuliaMono. Text faces are split by `unicode-range`; the math face and JuliaMono are whole.                                                                                                                                                                                                                                                                                           | Yes       |
| `fonts/`         | The WOFF2 files `fonts.css` refers to, one folder per family, each with its licence.                                                                                                                                                                                                                                                                                                                                                                                                            | Yes       |
| `tokens.css`     | Every token as a custom property on `:root`: colour ramps, ink, surfaces, the six intents, the categorical tones, faces, type, space, radius, shadow, motion and density. Light and dark.                                                                                                                                                                                                                                                                                                       | Yes       |
| `base.css`       | The order of the cascade layers, the page's defaults, links in interface text, focus, reduced motion, and the modifiers that choose a component's tone.                                                                                                                                                                                                                                                                                                                                         | No        |
| `document.css`   | Typography for documents inside `.document`: headings, prose, lists, tables, quotations, code, figures, references, resolved or not, and MathML formulas.                                                                                                                                                                                                                                                                                                                                       | No        |
| `code.css`       | Colours for highlighted code, from the `--code-*` tokens: the variables of Shiki's CSS variables theme, and the classes of highlight.js.                                                                                                                                                                                                                                                                                                                                                        | No        |
| `components.css` | Link, button, field, input, choice, switch, range, stepper, select, fieldset, key, chip, indicator, count, avatar, account row, card, row list, table, post, copy block, navigation list and folding section, menu, disclosure, scrim, dialog, message, toast, tooltip, segmented control, tabs, breadcrumbs, skeleton, spinner, progress, highlight, mark and the wordmark. The brand light without script (`.brand-light`), and the layout of the elements in `@stemma-math/design-elements`. | No        |
| `glyphs.svg`     | The line glyphs, one `symbol` each, on a 24-unit box.                                                                                                                                                                                                                                                                                                                                                                                                                                           | Yes       |
| `noise.svg`      | The grain `.brand-light` lays over the brand gradient.                                                                                                                                                                                                                                                                                                                                                                                                                                          | Yes       |
| `icons/`         | The favicon (SVG, following the appearance; PNG and ICO where SVG is not taken), the home-screen icons and, in `icons/app/`, the application icons for a desktop app, made from the mark.                                                                                                                                                                                                                                                                                                       | Yes       |
| `LICENSE-mark`   | The mark's usage policy, which `icons/` is under.                                                                                                                                                                                                                                                                                                                                                                                                                                               | Yes       |

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

Add `.brand-surface` to a navy region to use dark control surfaces, on-dark
ink, and readable intent and categorical text colours within it. This is
local: it does not change the page's selected appearance. It works on its
own or over the navy region of `.brand-light`. Keep menus and popovers
inside that context in the DOM so they inherit its tokens. Avoid applying
it over the pale end of the light. These pairings are contrast-checked
alongside the light and dark appearances.

`.brand-light` has a gentle CSS grain by default. Set `--grain` on it from
`0` to `1` to adjust the grain's opacity, independently of the gradient or
`--light-progress`. The live `<stemma-light>` drawing uses its preset's
grain instead; this token controls the CSS fallback.

The page and every scrolling element have thin scrollbars, transparent
tracks and no arrow buttons, where the platform allows styling. The thumb
uses `--scrollbar-thumb` and becomes `--scrollbar-thumb-hover` on hover.
Both follow the local appearance, including brand surfaces. Standard
scrollbar properties are used with WebKit pseudo-elements as a fallback;
forced colours retain the system palette.

### Native selects

`select.input` keeps the browser's native picker. Its chevron stays at
the inline end during focus, invalid states and blur; surface changes
transition only `background-color`, leaving the image and its position
unchanged. Use a label and `aria-describedby` for any hint or error, just
as with the other `.input` fields.

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

### Live indicators

`.indicator` pairs an 8px dot with a short label, without a background.
The default dot uses quiet ink for an inactive state. Add `--active` for
success and a slow, soft pulse, or an intent or categorical tone modifier
to choose its colour. Motion stops with reduced motion; the dot stays visible.
The label keeps the normal text colour.

```html
<span class="indicator indicator--active">
  <span class="indicator__dot" aria-hidden="true"></span>Connected
</span>
<span class="indicator"> <span class="indicator__dot" aria-hidden="true"></span>Offline </span>
<span class="indicator indicator--warning">
  <span class="indicator__dot" aria-hidden="true"></span>Reconnecting
</span>
<span class="indicator indicator--active" role="img" aria-label="Connected">
  <span class="indicator__dot" aria-hidden="true"></span>
</span>
```

Always hide the decorative dot from assistive technology. An indicator
without visible text needs `role="img"` and an accessible name on the
wrapper. Use `role="status"` on a labelled indicator when its changes
should be announced. The indicator fits beside text in rows, navigation
and menu items; it has no interaction or tab stop of its own.

### Full-width segmented controls

`.segmented--fill` fills the container and gives every button the same
width, even when labels differ. With the theme-switch element, use
`<stemma-theme-switch fill>` instead.

```html
<stemma-segmented label="View">
  <div class="segmented segmented--fill">
    <button value="list" aria-pressed="true">List</button>
    <button value="graph">Graph view</button>
  </div>
</stemma-segmented>
```

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

`person` marks a single person's profile, matching the head and shoulders
of `add-person`. Use `group` when the destination represents several people.
`appearance`, a crescent moon, marks where one chooses the appearance: light,
dark or the system's.
`reset` is a counter-clockwise circular arrow with its head at the top,
for returning a value to its default; `undo` undoes an action, and `sync`
refreshes. Name an icon-only reset button and give it a tooltip.

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

Items directly inside a section's `.nav-list` use `--control-small-height`
and `--control-small-font`. A decorative guide sits under the heading's
chevron, with a tick at each item and an end at the last one. The guide
uses the local border colour and mirrors in RTL. These are ordinary
links and disclosures, not an ARIA tree; native Tab, Enter and Space
behaviour stays the same.

For a trailing heading action, wrap the details and a sibling icon button
in `.nav-section__head`. Add `.nav-section__action` to the button. The
heading's hover and focus cover the whole row, while the action keeps its
own target and remains available when closed. Keep the button outside the
summary, and give it an accessible name:

```html
<div class="nav-section__head">
  <details class="nav-section" open>
    <summary class="nav-section__heading">
      <span class="nav-item__label">Places</span>
    </summary>
    <ul class="nav-list">
      <li><a class="nav-item" href="…">Library</a></li>
    </ul>
  </details>
  <button
    type="button"
    class="button button--icon button--quiet nav-section__action"
    aria-label="Add a place"
  >
    <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#add" /></svg>
  </button>
</div>
```

For several actions, replace the single trailing button with a
`.nav-section__actions` wrapper holding the `.nav-section__action` links
or buttons. The heading reserves their actual combined width, including
the gap, while the section's items still fill the width below. Actions
remain outside the summary and available when the section is closed.
The existing single-action markup works as before. This layout uses
CSS subgrid and `::details-content` to share the available columns.

```html
<div class="nav-section__actions">
  <button type="button" class="button button--icon nav-section__action" aria-label="Add a place">
    <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#add" /></svg>
  </button>
  <a class="button button--icon nav-section__action" href="/places" aria-label="All places">
    <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#arrow-right" /></svg>
  </a>
</div>
```

`.avatar--small` is 24px in either density, so it fits within
`--control-small-height`. It combines with `--square`, `--brand`, every
tone and a child `img`; the other avatar sizes stay 34px and 42px.

### Account rows

`.account` holds an `.account__person` link and a separate icon button
with `.account__action`. The link contains an `.avatar` and an
`.account__details` stack, with `.account__name` and `.account__meta`.
The secondary line can hold quiet text or a non-interactive `.chip`.
Names and secondary lines truncate without shrinking the avatar or action.
The person link's hover and focus cover only its own evenly padded box.
Both targets follow the local card or `.brand-surface` tokens and density.

```html
<div class="account">
  <a class="account__person" href="/account">
    <span class="avatar" aria-hidden="true">E</span>
    <span class="account__details">
      <span class="account__name">Emmy Noether</span>
      <span class="account__meta"><span class="chip chip--neutral">Maintainer</span></span>
    </span>
  </a>
  <button
    type="button"
    class="button button--icon button--quiet account__action"
    aria-label="Sign out"
  >
    <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#log-out" /></svg>
  </button>
</div>
```

To make the whole account row open a menu, use an
`.account.account--menu` button as the trigger inside `<stemma-menu>`.
It has the same padding and avatar/text spacing as the person link, with
one hover surface. A trailing `.account__chevron` rotates with
`aria-expanded`. Names still truncate, and the secondary line is optional.
Add `match-width` to the element when the menu should follow the row's
width in a narrow panel; it stays inside the viewport and resizes with
the row while open. This works on cards and `.brand-surface`.

```html
<stemma-menu match-width>
  <button type="button" class="account account--menu">
    <span class="avatar" aria-hidden="true">E</span>
    <span class="account__details">
      <span class="account__name">Emmy Noether</span>
    </span>
    <svg class="glyph account__chevron" aria-hidden="true">
      <use href="…/glyphs.svg#chevron-down" />
    </svg>
  </button>
  <div class="menu">
    <a class="menu__item" href="/profile">Profile</a>
    <button type="button" class="menu__item" data-value="sign-out">Sign out</button>
  </div>
</stemma-menu>
```

### Person menu headers

`.menu__header` presents a person's identity before the menu items. Place
an `.avatar` beside a `.menu__identity` stack containing `.menu__name`
and `.menu__meta`. Both text lines truncate; the secondary line can show
a handle and a short role. Follow it with `.menu__separator`.

```html
<div class="menu" aria-labelledby="person-name">
  <div class="menu__header">
    <span class="avatar" aria-hidden="true">E</span>
    <div class="menu__identity">
      <span class="menu__name" id="person-name">Emmy Noether</span>
      <span class="menu__meta">@emmy · Maintainer</span>
    </div>
  </div>
  <hr class="menu__separator" />
  <a class="menu__item" href="/profile">Profile</a>
</div>
```

The header is ordinary, non-interactive content: do not give it a
`menuitem` role or a tab stop. `<stemma-menu>` skips it during keyboard
navigation. Its colours follow the current appearance or `.brand-surface`.

### Menu rows with an action

Place a `.menu__item` and a `.menu__action` beside each other in a
`.menu__row`. The item fills the width; the icon action keeps a square
target. Hovering either shades the whole row, and the action's glyph
brightens; each keeps its own focus style. Use `.menu__label`
around text that should truncate, and give an icon-only action an
accessible name. The same classes work inside `.brand-surface`.

```html
<div class="menu__row">
  <a class="menu__item" href="/places"><span class="menu__label">All places</span></a>
  <button type="button" class="menu__action" aria-label="Add a place" data-value="add">
    <svg class="glyph" aria-hidden="true"><use href="…/glyphs.svg#add" /></svg>
  </button>
</div>
```

Inside `<stemma-menu>`, both targets are menu items: Up, Down, Home and
End visit them in document order, skipping disabled targets. Choosing
either emits `select` with its `data-value` and closes the menu. Outside
the element, they keep native link and button behaviour.

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
