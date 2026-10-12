// <stemma-filter-chips>: a set of chips, each turned on or off, to filter
// what a view shows.
//
//     <stemma-filter-chips label="Show">
//         <button class="chip chip--success" value="done" aria-pressed="true">Done</button>
//         <button class="chip chip--warning" value="open">Open</button>
//     </stemma-filter-chips>
//
// Each chip is a toggle button. `value` is the list of chips turned on; a
// `change` event follows every change. With `single`, at most one chip is
// on at a time.

import { define } from "./internal.js";

export class StemmaFilterChips extends HTMLElement {
    #bound = false;

    connectedCallback() {
        if (this.#bound) return;
        this.#bound = true;
        this.setAttribute("role", "group");
        if (this.hasAttribute("label")) this.setAttribute("aria-label", this.getAttribute("label"));
        for (const chip of this.#chips()) {
            if (!chip.hasAttribute("aria-pressed")) chip.setAttribute("aria-pressed", "false");
            chip.type = "button";
        }
        this.addEventListener("click", (event) => {
            const chip = event.target.closest("button.chip");
            if (!chip || !this.contains(chip) || chip.disabled) return;
            const on = chip.getAttribute("aria-pressed") !== "true";
            if (on && this.hasAttribute("single")) {
                for (const other of this.#chips()) other.setAttribute("aria-pressed", "false");
            }
            chip.setAttribute("aria-pressed", String(on));
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }

    #chips() {
        return [...this.querySelectorAll("button.chip")];
    }

    #valueOf(chip) {
        return chip.value || chip.dataset.value || chip.textContent.trim();
    }

    /** The values of the chips turned on, in order. */
    get value() {
        return this.#chips()
            .filter((chip) => chip.getAttribute("aria-pressed") === "true")
            .map((chip) => this.#valueOf(chip));
    }

    set value(values) {
        const on = new Set(values);
        for (const chip of this.#chips()) {
            chip.setAttribute("aria-pressed", String(on.has(this.#valueOf(chip))));
        }
    }
}

define("stemma-filter-chips", StemmaFilterChips);
