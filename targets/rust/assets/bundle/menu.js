modules["menu.js"] = (() => {
// <stemma-menu>: a button that opens a `.menu` of actions or destinations.
//
//     <stemma-menu>
//         <button class="button">Options</button>
//         <div class="menu">
//             <button class="menu__item" data-value="rename">Rename</button>
//             <a class="menu__item" href="/settings">Settings</a>
//             <hr class="menu__separator" />
//             <button class="menu__item menu__item--danger" data-value="delete">Delete</button>
//         </div>
//     </stemma-menu>
//
// The first button outside the menu opens it; the menu appears below it,
// or above where there is no room. The arrow keys move among the items,
// Home and End go to the first and last, Escape or a click elsewhere
// closes it and returns focus to the button. Choosing an item sends a
// `select` event whose `detail.value` is the item's `data-value`, then
// closes the menu.

const { define, place, popovers, uid } = modules["internal.js"];
class StemmaMenu extends HTMLElement {
    #trigger = null;
    #menu = null;

    connectedCallback() {
        if (this.#menu) return;
        this.#menu = this.querySelector(".menu");
        this.#trigger = [...this.querySelectorAll("button")].find(
            (button) => !this.#menu?.contains(button),
        );
        if (!this.#menu || !this.#trigger) return;

        this.#menu.id ||= uid("stemma-menu");
        this.#menu.setAttribute("role", "menu");
        this.#trigger.setAttribute("aria-haspopup", "menu");
        this.#trigger.setAttribute("aria-controls", this.#menu.id);
        this.#trigger.setAttribute("aria-expanded", "false");
        for (const item of this.#items()) {
            item.setAttribute("role", "menuitem");
            item.tabIndex = -1;
        }
        for (const separator of this.#menu.querySelectorAll(".menu__separator")) {
            separator.setAttribute("role", "separator");
        }

        if (popovers) {
            this.#menu.popover = "auto";
            this.#menu.addEventListener("toggle", (event) => {
                this.#expanded(event.newState === "open");
            });
        } else {
            this.#menu.hidden = true;
            document.addEventListener("pointerdown", (event) => {
                if (this.isOpen && !this.contains(event.target)) this.close(false);
            });
        }

        this.#trigger.addEventListener("click", () => {
            if (this.isOpen) this.close();
            else this.open();
        });
        this.#trigger.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                this.open(event.key === "ArrowUp" ? "last" : "first");
            }
        });
        this.#menu.addEventListener("keydown", (event) => this.#key(event));
        this.#menu.addEventListener("click", (event) => {
            const item = event.target.closest(".menu__item");
            if (!item || item.disabled || item.getAttribute("aria-disabled") === "true") return;
            this.dispatchEvent(
                new CustomEvent("select", {
                    bubbles: true,
                    detail: { value: item.dataset.value ?? "", item },
                }),
            );
            this.close();
        });
    }

    #items() {
        return [...this.#menu.querySelectorAll(".menu__item")].filter(
            (item) => !item.disabled && item.getAttribute("aria-disabled") !== "true",
        );
    }

    #expanded(open) {
        this.#trigger.setAttribute("aria-expanded", String(open));
    }

    /** Whether the menu is open. */
    get isOpen() {
        return popovers ? this.#menu?.matches(":popover-open") : this.#menu && !this.#menu.hidden;
    }

    /** Opens the menu, focusing its `first` or `last` item. */
    open(focus = "first") {
        if (!this.#menu) return;
        if (popovers) this.#menu.showPopover();
        else this.#menu.hidden = false;
        this.#expanded(true);
        place(this.#menu, this.#trigger, "below", 4);
        const items = this.#items();
        (focus === "last" ? items.at(-1) : items[0])?.focus();
    }

    /** Closes the menu, returning focus to its button unless told not to. */
    close(refocus = true) {
        if (!this.#menu) return;
        if (popovers) {
            if (this.isOpen) this.#menu.hidePopover();
        } else {
            this.#menu.hidden = true;
        }
        this.#expanded(false);
        if (refocus) this.#trigger.focus();
    }

    #key(event) {
        const items = this.#items();
        const index = items.indexOf(document.activeElement);
        const next = {
            ArrowDown: index + 1,
            ArrowUp: index - 1,
            Home: 0,
            End: items.length - 1,
        }[event.key];
        if (next !== undefined) {
            event.preventDefault();
            items[(next + items.length) % items.length]?.focus();
        } else if (event.key === "Escape") {
            event.preventDefault();
            this.close();
        } else if (event.key === "Tab") {
            this.close(false);
        }
    }
}

define("stemma-menu", StemmaMenu);

return { StemmaMenu };
})();