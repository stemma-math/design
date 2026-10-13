modules["select.js"] = (() => {
// <stemma-select>: a native `select` drawn with Stemma's own list.
//
//     <stemma-select>
//         <select class="input" name="kind">
//             <option value="theorem">Theorem</option>
//             <option value="lemma">Lemma</option>
//             <optgroup label="Others">
//                 <option value="remark">Remark</option>
//             </optgroup>
//         </select>
//     </stemma-select>
//
// The `select` stays in the page, hidden, so it is still what a form sends
// and what the page reads and listens to: choosing an option sets its
// value and sends `input` and `change` from it. In its place a `.select`
// button shows the chosen option, and opens a `.menu` listbox below it, or
// above where there is no room. An `optgroup` becomes a heading. The
// arrow keys, Home and End move among the options, typing a letter goes
// to the next option starting with it, Enter or Space chooses, and Escape,
// Tab or a click elsewhere closes the list. `placeholder` is shown while
// the chosen option has no words, such as a first, `hidden` option with
// an empty value; a `hidden` option is never listed. A change to the `select`'s value or options from
// script shows here after `refresh()`.

const { glyph } = modules["glyphs.js"];
const { define, place, popovers, uid } = modules["internal.js"];
class StemmaSelect extends HTMLElement {
    #select = null;
    #button = null;
    #value = null;
    #chosen = null;
    #list = null;
    #typed = "";
    #typedAt = 0;

    connectedCallback() {
        if (this.#button) return;
        this.#select = this.querySelector("select");
        if (!this.#select) return;

        this.#button = document.createElement("button");
        this.#button.type = "button";
        this.#button.className = `select ${this.#select.className}`.trim();
        this.#button.id = this.#select.id ? `${this.#select.id}-button` : uid("stemma-select");
        this.#button.setAttribute("aria-haspopup", "listbox");
        this.#button.setAttribute("aria-expanded", "false");
        this.#value = document.createElement("span");
        this.#value.className = "select__value";
        this.#chosen = document.createElement("span");
        this.#chosen.dataset.placeholder = this.getAttribute("placeholder") ?? "";
        this.#button.append(this.#value);
        this.#button.insertAdjacentHTML("beforeend", glyph("chevron-up-down"));

        this.#list = document.createElement("div");
        this.#list.className = "menu";
        this.#list.id = uid("stemma-select-list");
        this.#list.setAttribute("role", "listbox");
        this.#list.tabIndex = -1;
        this.#button.setAttribute("aria-controls", this.#list.id);

        // A label that named the select now names the button.
        const labels = this.#select.labels ? [...this.#select.labels] : [];
        for (const label of labels) {
            label.id ||= uid("stemma-select-label");
            label.htmlFor = this.#button.id;
        }
        if (labels.length) {
            const ids = labels.map((label) => label.id).join(" ");
            this.#button.setAttribute("aria-labelledby", `${ids} ${this.#button.id}`);
            this.#list.setAttribute("aria-labelledby", ids);
        } else if (this.#select.hasAttribute("aria-label")) {
            this.#button.setAttribute("aria-label", this.#select.getAttribute("aria-label"));
            this.#list.setAttribute("aria-label", this.#select.getAttribute("aria-label"));
        }
        for (const name of ["aria-describedby", "aria-invalid"]) {
            if (this.#select.hasAttribute(name))
                this.#button.setAttribute(name, this.#select.getAttribute(name));
        }

        this.append(this.#button, this.#list);

        if (popovers) {
            this.#list.popover = "auto";
            this.#list.addEventListener("toggle", (event) => {
                this.#button.setAttribute("aria-expanded", String(event.newState === "open"));
            });
        } else {
            this.#list.hidden = true;
            document.addEventListener("pointerdown", (event) => {
                if (this.isOpen && !this.contains(event.target)) this.close(false);
            });
        }

        // A press on the button closes an open popover before its click
        // arrives, so whether it was open is read as the press begins.
        let wasOpen = false;
        this.#button.addEventListener("pointerdown", () => {
            wasOpen = this.isOpen;
        });
        this.#button.addEventListener("click", (event) => {
            const open = event.detail === 0 ? this.isOpen : wasOpen;
            wasOpen = false;
            if (open) this.close();
            else this.open();
        });
        this.#button.addEventListener("keydown", (event) => {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
                event.preventDefault();
                this.open();
            } else if (event.key.length === 1) {
                this.#typeahead(event.key, true);
            }
        });
        this.#list.addEventListener("keydown", (event) => this.#key(event));
        this.#list.addEventListener("click", (event) => {
            const option = event.target.closest('[role="option"]');
            if (option) this.#choose(option);
        });
        this.#select.addEventListener("change", () => this.refresh());
        this.refresh();
    }

    /** The chosen option's value, as the native `select` has it. */
    get value() {
        return this.#select?.value ?? "";
    }

    set value(value) {
        if (!this.#select) return;
        this.#select.value = value;
        this.refresh();
    }

    /** Whether the list is open. */
    get isOpen() {
        return popovers ? this.#list?.matches(":popover-open") : this.#list && !this.#list.hidden;
    }

    /** Draws the options and the chosen one again from the `select`. */
    refresh() {
        if (!this.#select) return;
        const chosen = this.#select.selectedOptions[0];
        this.#chosen.textContent = chosen?.label ?? "";
        // Every option's words, unseen in the same place, so the button
        // is as wide as the longest and keeps its width as the choice
        // changes, as a native select does.
        const sizers = [
            this.#chosen.dataset.placeholder,
            ...[...this.#select.options].map((o) => o.label),
        ]
            .filter(Boolean)
            .map((words) => {
                const sizer = document.createElement("span");
                sizer.className = "select__sizer";
                sizer.setAttribute("aria-hidden", "true");
                sizer.textContent = words;
                return sizer;
            });
        this.#value.replaceChildren(this.#chosen, ...sizers);
        this.#button.disabled = this.#select.disabled;
        this.#list.replaceChildren();
        for (const child of this.#select.children) {
            if (child instanceof HTMLOptGroupElement) {
                const heading = document.createElement("p");
                heading.className = "menu__heading";
                heading.setAttribute("role", "presentation");
                heading.textContent = child.label;
                this.#list.append(heading);
                for (const option of child.children)
                    if (!option.hidden) this.#list.append(this.#option(option, child));
            } else if (child instanceof HTMLOptionElement && !child.hidden) {
                this.#list.append(this.#option(child));
            } else if (child instanceof HTMLHRElement) {
                const separator = document.createElement("hr");
                separator.className = "menu__separator";
                this.#list.append(separator);
            }
        }
    }

    #option(option, group = null) {
        const item = document.createElement("div");
        item.className = "menu__item";
        item.id = uid("stemma-option");
        item.setAttribute("role", "option");
        item.tabIndex = -1;
        item.dataset.index = String(option.index);
        item.setAttribute("aria-selected", String(option.selected));
        if (option.disabled || group?.disabled) item.setAttribute("aria-disabled", "true");
        const label = document.createElement("span");
        label.textContent = option.label;
        item.append(label);
        item.insertAdjacentHTML("beforeend", glyph("check"));
        item.lastElementChild.classList.add("select__check");
        return item;
    }

    #options() {
        return [...this.#list.querySelectorAll('[role="option"]')].filter(
            (item) => item.getAttribute("aria-disabled") !== "true",
        );
    }

    /** Opens the list, with the chosen option focused. */
    open() {
        if (!this.#list || this.#button.disabled) return;
        this.refresh();
        if (popovers) this.#list.showPopover();
        else this.#list.hidden = false;
        this.#button.setAttribute("aria-expanded", "true");
        this.#list.style.minWidth = `${this.#button.offsetWidth}px`;
        place(this.#list, this.#button, "below", 4);
        const options = this.#options();
        const chosen = options.find((item) => item.getAttribute("aria-selected") === "true");
        this.#focus(chosen ?? options[0]);
    }

    /** Closes the list, returning focus to the button unless told not to. */
    close(refocus = true) {
        if (!this.#list) return;
        if (popovers) {
            if (this.isOpen) this.#list.hidePopover();
        } else {
            this.#list.hidden = true;
        }
        this.#button.setAttribute("aria-expanded", "false");
        if (refocus) this.#button.focus();
    }

    #focus(item) {
        if (!item) return;
        item.focus();
        item.scrollIntoView({ block: "nearest" });
    }

    #choose(item) {
        if (item.getAttribute("aria-disabled") === "true") return;
        const index = Number(item.dataset.index);
        const changed = this.#select.selectedIndex !== index;
        this.#select.selectedIndex = index;
        this.refresh();
        this.close();
        if (changed) {
            this.#select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            this.#select.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    #typeahead(key, choose) {
        const now = performance.now();
        this.#typed = now - this.#typedAt > 700 ? key : this.#typed + key;
        this.#typedAt = now;
        const options = this.#options();
        const current = choose
            ? options.findIndex((item) => item.getAttribute("aria-selected") === "true")
            : options.indexOf(document.activeElement);
        const typed = this.#typed.toLocaleLowerCase();
        const start = this.#typed.length === 1 ? current + 1 : Math.max(current, 0);
        const match = [...options.slice(start), ...options.slice(0, start)].find((item) =>
            item.textContent.trim().toLocaleLowerCase().startsWith(typed),
        );
        if (!match) return;
        if (choose) {
            const index = Number(match.dataset.index);
            if (this.#select.selectedIndex === index) return;
            this.#select.selectedIndex = index;
            this.refresh();
            this.#select.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            this.#select.dispatchEvent(new Event("change", { bubbles: true }));
        } else {
            this.#focus(match);
        }
    }

    #key(event) {
        const options = this.#options();
        const index = options.indexOf(document.activeElement);
        const next = {
            ArrowDown: Math.min(index + 1, options.length - 1),
            ArrowUp: Math.max(index - 1, 0),
            Home: 0,
            End: options.length - 1,
        }[event.key];
        if (next !== undefined) {
            event.preventDefault();
            this.#focus(options[next]);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (index >= 0) this.#choose(options[index]);
        } else if (event.key === "Escape") {
            event.preventDefault();
            this.close();
        } else if (event.key === "Tab") {
            this.close(false);
        } else if (event.key.length === 1) {
            this.#typeahead(event.key, false);
        }
    }
}

define("stemma-select", StemmaSelect);

return { StemmaSelect };
})();