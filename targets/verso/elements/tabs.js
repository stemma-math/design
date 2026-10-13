// <stemma-tabs>: tabs over the `.tabs` class, each showing its panel.
//
//     <stemma-tabs label="Sections">
//         <div class="tabs">
//             <button class="tabs__tab" value="overview" aria-selected="true">Overview</button>
//             <button class="tabs__tab" value="history">History</button>
//         </div>
//         <section data-tab="overview">…</section>
//         <section data-tab="history">…</section>
//     </stemma-tabs>
//
// Each tab shows the panel whose `data-tab` is its value and hides the
// others. The tabs are one stop in the tab order; the arrow keys, Home
// and End move among them and choose. A `change` event says which was
// chosen, in `value`. Tabs that go to other pages are links with
// `aria-current`, and need no element.

import { define, uid } from "./internal.js";

export class StemmaTabs extends HTMLElement {
    #list = null;
    #value = "";

    connectedCallback() {
        if (this.#list) return;
        this.#list = this.querySelector(".tabs");
        if (!this.#list) return;
        this.#list.setAttribute("role", "tablist");
        if (this.hasAttribute("label"))
            this.#list.setAttribute("aria-label", this.getAttribute("label"));

        for (const tab of this.#tabs()) {
            tab.setAttribute("role", "tab");
            tab.id ||= uid("stemma-tab");
            const panel = this.#panel(this.#valueOf(tab));
            if (!panel) continue;
            panel.id ||= uid("stemma-tab-panel");
            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("aria-labelledby", tab.id);
            tab.setAttribute("aria-controls", panel.id);
        }

        this.#list.addEventListener("click", (event) => {
            const tab = event.target.closest(".tabs__tab");
            if (!tab || tab.disabled) return;
            this.#choose(this.#valueOf(tab), false, true);
        });
        this.#list.addEventListener("keydown", (event) => {
            const tabs = this.#tabs().filter((tab) => !tab.disabled);
            const index = tabs.indexOf(document.activeElement);
            if (index < 0) return;
            const next = {
                ArrowRight: index + 1,
                ArrowLeft: index - 1,
                Home: 0,
                End: tabs.length - 1,
            }[event.key];
            if (next === undefined) return;
            event.preventDefault();
            this.#choose(this.#valueOf(tabs[(next + tabs.length) % tabs.length]), true, true);
        });

        const selected = this.#tabs().find((tab) => tab.getAttribute("aria-selected") === "true");
        const first = selected ?? this.#tabs()[0];
        if (first) this.#choose(this.#valueOf(first));
    }

    #tabs() {
        return [...this.#list.querySelectorAll(".tabs__tab")];
    }

    #valueOf(tab) {
        return tab.value || tab.dataset.value || tab.textContent.trim();
    }

    #panel(value) {
        return [...this.querySelectorAll("[data-tab]")].find(
            (panel) => panel.dataset.tab === value,
        );
    }

    #choose(value, focus = false, announce = false) {
        const changed = value !== this.#value;
        this.#value = value;
        for (const tab of this.#tabs()) {
            const chosen = this.#valueOf(tab) === value;
            tab.setAttribute("aria-selected", String(chosen));
            tab.tabIndex = chosen ? 0 : -1;
            if (chosen && focus) tab.focus();
            const panel = this.#panel(this.#valueOf(tab));
            if (panel) panel.hidden = !chosen;
        }
        if (announce && changed) this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    /** The chosen tab's value. */
    get value() {
        return this.#value;
    }

    set value(value) {
        if (this.#list) this.#choose(value);
        else this.#value = value;
    }
}

define("stemma-tabs", StemmaTabs);
