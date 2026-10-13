// <stemma-theme-switch>: chooses the appearance: the system's, light or
// dark. It sets `data-theme` on the root element, which `tokens.css`
// follows, and remembers the choice in local storage.
//
//     <stemma-theme-switch></stemma-theme-switch>
//
// Attributes: `label` names the control for assistive technology
// ("Appearance"); `label-system`, `label-light` and `label-dark` name the
// options; `storage-key` is where the choice is kept ("stemma-theme"). A
// `change` event says what was chosen, in `value`.
//
// To avoid a flash of the wrong appearance, call `applyStoredTheme()` as
// early as possible, before the page paints.

import { bindSegmented } from "./segmented.js";
import { define } from "./internal.js";

const THEMES = ["system", "light", "dark"];
const DEFAULT_KEY = "stemma-theme";

/** The stored choice: `system`, `light` or `dark`. Anything else stored
 * under the key, as an older page's `auto`, counts as `system`. */
export function storedTheme(key = DEFAULT_KEY) {
    try {
        const value = localStorage.getItem(key);
        return THEMES.includes(value) ? value : "system";
    } catch {
        return "system";
    }
}

/** Applies a choice to the root element. */
export function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
}

/** Applies the stored choice. */
export function applyStoredTheme(key = DEFAULT_KEY) {
    applyTheme(storedTheme(key));
}

export class StemmaThemeSwitch extends HTMLElement {
    #value = "system";
    #choose = null;

    connectedCallback() {
        if (this.#choose) return;
        const key = this.getAttribute("storage-key") || DEFAULT_KEY;
        const group = document.createElement("div");
        group.className = "segmented";
        group.setAttribute("role", "group");
        group.setAttribute("aria-label", this.getAttribute("label") || "Appearance");
        const names = { system: "System", light: "Light", dark: "Dark" };
        for (const theme of THEMES) {
            const button = document.createElement("button");
            button.type = "button";
            button.value = theme;
            button.textContent = this.getAttribute(`label-${theme}`) || names[theme];
            group.append(button);
        }
        this.replaceChildren(group);
        this.#value = storedTheme(key);
        this.#choose = bindSegmented(group, (theme) => {
            this.#value = theme;
            applyTheme(theme);
            try {
                localStorage.setItem(key, theme);
            } catch {
                // Storage may be unavailable; the choice still holds for this page.
            }
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });
        this.#choose(this.#value);
        applyTheme(this.#value);
    }

    /** The choice: `system`, `light` or `dark`. */
    get value() {
        return this.#value;
    }

    set value(theme) {
        if (!THEMES.includes(theme)) return;
        this.#value = theme;
        applyTheme(theme);
        this.#choose?.(theme);
    }
}

define("stemma-theme-switch", StemmaThemeSwitch);
