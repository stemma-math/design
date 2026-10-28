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
// or above where there is no room, and stays beside it as the page
// scrolls. The arrow keys move among the items,
// Home and End go to the first and last, Escape or a click elsewhere
// closes it and returns focus to the button. Choosing an item sends a
// `select` event whose `detail.value` is the item's `data-value`, then
// closes the menu.
// A `.menu__row` can hold an item and a trailing `.menu__action`, each a
// separate menu item. Arrow keys visit both; disabled targets are skipped.
// `match-width` makes the menu as wide as its button, within the viewport,
// and follows changes to the button's size while open. The boolean
// `matchWidth` property reflects the attribute.

import { define, follow, place, popovers, uid } from "./internal.js";

const ITEMS = ".menu__item, .menu__action";

export class StemmaMenu extends HTMLElement {
    static observedAttributes = ["match-width"];

    #trigger = null;
    #menu = null;
    #resize = null;
    #unfollow = null;

    connectedCallback() {
        if (this.#menu) {
            this.#observe();
            return;
        }
        this.#menu = this.querySelector(".menu");
        this.#trigger = [...this.querySelectorAll("button")].find(
            (button) => !this.#menu?.contains(button),
        );
        if (!this.#menu || !this.#trigger) return;

        this.#menu.id ||= uid("stemma-menu");
        this.#menu.setAttribute("role", "menu");
        this.#menu.tabIndex = -1;
        this.#trigger.setAttribute("aria-haspopup", "menu");
        this.#trigger.setAttribute("aria-controls", this.#menu.id);
        this.#trigger.setAttribute("aria-expanded", "false");
        for (const item of this.#menu.querySelectorAll(ITEMS)) {
            item.setAttribute("role", "menuitem");
            item.tabIndex = -1;
        }
        for (const separator of this.#menu.querySelectorAll(".menu__separator")) {
            separator.setAttribute("role", "separator");
        }
        for (const row of this.#menu.querySelectorAll(".menu__row")) {
            row.setAttribute("role", "none");
        }

        if (popovers) {
            this.#menu.popover = "auto";
            this.#menu.addEventListener("toggle", (event) => {
                this.#expanded(event.newState === "open");
                if (event.newState === "closed") this.#stopFollowing();
            });
        } else {
            this.#menu.hidden = true;
            document.addEventListener("pointerdown", (event) => {
                if (this.isOpen && !this.contains(event.target)) this.close(false);
            });
        }

        // A press on the button closes an open popover before its click
        // arrives, so whether it was open is read as the press begins.
        let wasOpen = false;
        this.#trigger.addEventListener("pointerdown", () => {
            wasOpen = this.isOpen;
        });
        this.#trigger.addEventListener("click", (event) => {
            const open = event.detail === 0 ? this.isOpen : wasOpen;
            wasOpen = false;
            if (open) this.close();
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
            const item = event.target.closest(ITEMS);
            if (!item) {
                // The identity is not an item, but clicking it must keep
                // arrow keys and Escape inside the open menu.
                if (event.target.closest(".menu__header")) this.#menu.focus();
                return;
            }
            if (item.disabled || item.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }
            this.dispatchEvent(
                new CustomEvent("select", {
                    bubbles: true,
                    detail: { value: item.dataset.value ?? "", item },
                }),
            );
            this.close();
        });
        this.#observe();
    }

    disconnectedCallback() {
        this.#resize?.disconnect();
        this.#stopFollowing();
    }

    attributeChangedCallback() {
        this.#observe();
        if (this.isOpen) this.#place();
    }

    #observe() {
        this.#resize?.disconnect();
        if (!this.matchWidth || !this.#trigger || !this.isConnected) return;
        this.#resize ??= new ResizeObserver(() => {
            if (this.isOpen) this.#place();
        });
        this.#resize.observe(this.#trigger, { box: "border-box" });
    }

    #place() {
        if (this.matchWidth) {
            this.style.setProperty(
                "--menu-anchor-width",
                `${this.#trigger.getBoundingClientRect().width}px`,
            );
        }
        place(this.#menu, this.#trigger, "below", 4);
    }

    #stopFollowing() {
        this.#unfollow?.();
        this.#unfollow = null;
    }

    #items() {
        return [...this.#menu.querySelectorAll(ITEMS)].filter(
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

    /** Whether the menu matches the button's width. Reflects `match-width`. */
    get matchWidth() {
        return this.hasAttribute("match-width");
    }

    set matchWidth(value) {
        this.toggleAttribute("match-width", Boolean(value));
    }

    /** Opens the menu, focusing its `first` or `last` item. */
    open(focus = "first") {
        if (!this.#menu) return;
        if (popovers) this.#menu.showPopover();
        else this.#menu.hidden = false;
        this.#expanded(true);
        this.#place();
        this.#unfollow ??= follow(() => this.#place());
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
        this.#stopFollowing();
        this.#expanded(false);
        if (refocus) this.#trigger.focus();
    }

    #key(event) {
        const items = this.#items();
        const index = items.indexOf(document.activeElement);
        const next = {
            ArrowDown: index + 1,
            ArrowUp: index < 0 ? items.length - 1 : index - 1,
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
