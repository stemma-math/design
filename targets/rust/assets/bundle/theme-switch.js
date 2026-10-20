modules["theme-switch.js"] = (() => {
// <stemma-theme-switch>: chooses the appearance: the system's, light or
// dark. It sets `data-theme` on the root element, which `tokens.css`
// follows, and remembers the choice in local storage.
//
//     <stemma-theme-switch></stemma-theme-switch>
//     <stemma-theme-switch fill></stemma-theme-switch>
//
// Attributes: `label` names the control for assistive technology
// ("Appearance"); `label-system`, `label-light` and `label-dark` name the
// options; `storage-key` is where the choice is kept ("stemma-theme"). A
// `change` event says what was chosen, in `value`. `fill` makes the control
// fill its container, with equal-width options.
//
// To avoid a flash of the wrong appearance, call `applyStoredTheme()` as
// early as possible, before the page paints.

const { bindSegmented } = modules["segmented.js"];
const { define } = modules["internal.js"];
const THEMES = ["system", "light", "dark"];
const DEFAULT_KEY = "stemma-theme";

/** The stored choice: `system`, `light` or `dark`. Anything else stored
 * under the key, as an older page's `auto`, counts as `system`. */
function storedTheme(key = DEFAULT_KEY) {
    try {
        const value = localStorage.getItem(key);
        return THEMES.includes(value) ? value : "system";
    } catch {
        return "system";
    }
}

/** Applies a choice to the root element. */
function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.dataset.theme = theme;
    else delete root.dataset.theme;
}

/** Applies the stored choice. */
function applyStoredTheme(key = DEFAULT_KEY) {
    applyTheme(storedTheme(key));
}

class StemmaThemeSwitch extends HTMLElement {
    static observedAttributes = ["fill"];

    #value = "system";
    #choose = null;

    connectedCallback() {
        if (this.#choose) return;
        const key = this.getAttribute("storage-key") || DEFAULT_KEY;
        const group = document.createElement("div");
        group.className = "segmented";
        group.classList.toggle("segmented--fill", this.fill);
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

    attributeChangedCallback() {
        this.querySelector(".segmented")?.classList.toggle("segmented--fill", this.fill);
    }

    /** Whether the control fills its container. Reflects the `fill` attribute. */
    get fill() {
        return this.hasAttribute("fill");
    }

    set fill(value) {
        this.toggleAttribute("fill", Boolean(value));
    }
}

define("stemma-theme-switch", StemmaThemeSwitch);

return { storedTheme, applyTheme, applyStoredTheme, StemmaThemeSwitch };
})();