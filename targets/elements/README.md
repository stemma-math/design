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
| `select.js`       | `<stemma-select>`       | Draws a native `select` with its own list, keyboard and typeahead; the `select` stays, hidden, for forms and events.                                             |
| `date-picker.js`  | `<stemma-date-picker>`  | A calendar over a native date or datetime-local input, with month navigation, time fields, keyboard, typeahead and native form constraints.                      |
| `stepper.js`      | `<stemma-stepper>`      | Buttons that take a number input down and up by its step, repeating while held.                                                                                  |
| `range.js`        | `<stemma-range>`        | Fills a range's track up to its value in every engine, and shows the value in an `output`.                                                                       |
| `tabs.js`         | `<stemma-tabs>`         | Tabs over a `.tabs` list, each showing its panel, with arrow keys.                                                                                               |
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

`<stemma-menu>` treats `.menu__action` as a separate item alongside
`.menu__item`. A `.menu__row` groups a destination and its trailing action
visually, while both have `menuitem` roles, arrow-key navigation and the
same `select` event. Native disabled controls and `aria-disabled="true"`
targets are skipped and cannot select or navigate.

A `.menu__header` can precede the items to show a person's identity.
It stays non-interactive and is skipped by the menu's arrow keys. Use
`aria-labelledby` on the menu to name it with the header's `.menu__name`.

`<stemma-menu match-width>` matches its menu to the trigger's width,
limited by the viewport, and follows trigger resizes while open. The
boolean `matchWidth` property reflects the attribute and can change after
connection. An `.account.account--menu` button can serve as its trigger;
the element keeps `aria-expanded` in step with its rotating chevron.

`<stemma-theme-switch fill>` fills its container with equal-width options.
The boolean `fill` property reflects the attribute and can change after
connection. Other segmented controls use `.segmented.segmented--fill` on
their group. Both variants keep the same arrow-key selection and ARIA state.

- Every control is a native `button`, reachable by keyboard, with ARIA
  state (`aria-pressed`, `aria-expanded`, `aria-describedby`) kept in step.
- Focus returns where it was when a dialog or menu closes.
- With reduced motion, the light and the mark draw still frames, the
  light's withdrawal takes `--dur-ui` instead of `--dur-long`, and the
  stylesheets shorten every transition.
- The light and the live mark pause while the page is hidden, and the
  light while it is out of view.

## Date and time pickers

```html
<label for="ends">Ends</label>
<stemma-date-picker placeholder="Choose a date and time">
  <input
    class="input"
    type="datetime-local"
    id="ends"
    name="ends"
    min="2026-10-22T09:00"
    max="2026-12-31T18:00"
    step="900"
  />
</stemma-date-picker>
```

Use `type="date"` for a date alone. The native input remains the source of
truth: its `name`, form association, `required`, `disabled`, `readonly`,
`min`, `max`, `step`, value, validation and reset continue to work. Labels,
`aria-labelledby`, `aria-label`, `aria-describedby` and `aria-invalid`
name or describe the trigger. Invalid form submission focuses it and
announces the native validation message. A date outside the bounds, or
with no permitted step, cannot be selected. Time is rounded to the nearest
permitted step within that day, including partial minimum/maximum days.
Date-time values are local calendar fields with no timezone conversion.
The supported years are 1–9999.

The calendar opens at the selection, or today within the bounds. Today
has an outline and `aria-current="date"`; the chosen cell has
`aria-selected`. Month and day names follow the page's `lang`. The week
starts on Monday. Only one day is a tab stop. Unavailable days can be
explored by arrows and are announced as disabled; they cannot be chosen.

- Arrow keys move one day or week; Home/End move to the week's edges.
- Page Up/Down moves a month; Shift moves a year, preserving the day when
  possible (January 31 becomes February 28 or 29).
- Type a day number or a month name to move focus. Enter/Space chooses.
- Escape or Done closes and restores trigger focus. Tab visits the month,
  grid, time and footer controls; moving outside closes the calendar.
- Today chooses today if permitted; Clear removes an optional or required
  value (a required native input remains invalid until a date is chosen).

Date selection closes a date-only picker. For a date and time, it moves
focus to Hour and leaves the panel open for editing; Done completes it.
Each changed choice sends bubbling `input` and `change` from the native
input. Changes to time are committed on field change. The `value`
property sets the native ISO value without events. `open()`, `close()` and
`isOpen` control the panel; `refresh()` reflects script assignments to
`input.value` or `setCustomValidity()`. Native events, attribute changes
and form reset refresh automatically. Without script the input is shown.

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
