modules["tooltip.js"] = (() => {
// <stemma-tooltip>: a short description of a control, shown while the
// pointer rests on it or it has focus. Meant for icon-only buttons.
//
//     <button class="button button--icon" aria-label="Settings" id="settings">…</button>
//     <stemma-tooltip for="settings">Settings <kbd>⌘,</kbd></stemma-tooltip>
//
// It describes the control whose id is `for`, or the element just before
// it. It appears after a short rest of the pointer, at once on keyboard
// focus, and goes on Escape, blur or when the pointer leaves. It sits
// above the control, or below where there is no room, and stays beside it
// as the page scrolls.

const { define, follow, place, popovers, uid } = modules["internal.js"];
const DELAY = 450;

class StemmaTooltip extends HTMLElement {
    #target = null;
    #timer = 0;
    #listeners = [];
    #unfollow = null;

    connectedCallback() {
        this.classList.add("tooltip");
        this.setAttribute("role", "tooltip");
        this.id ||= uid("stemma-tooltip");
        if (popovers) this.popover = "manual";
        else this.hidden = true;
        queueMicrotask(() => this.#attach());
    }

    disconnectedCallback() {
        this.#detach();
        this.hide();
    }

    #attach() {
        this.#detach();
        const id = this.getAttribute("for");
        this.#target = id ? document.getElementById(id) : this.previousElementSibling;
        if (!this.#target) return;
        const described = (this.#target.getAttribute("aria-describedby") ?? "").split(/\s+/);
        if (!described.includes(this.id)) {
            this.#target.setAttribute("aria-describedby", [...described, this.id].join(" ").trim());
        }
        const on = (type, handler) => {
            this.#target.addEventListener(type, handler);
            this.#listeners.push([type, handler]);
        };
        on("pointerenter", () => {
            clearTimeout(this.#timer);
            this.#timer = setTimeout(() => this.show(), DELAY);
        });
        on("pointerleave", () => this.hide());
        on("focus", () => {
            if (this.#target.matches(":focus-visible")) this.show();
        });
        on("blur", () => this.hide());
        on("keydown", (event) => {
            if (event.key === "Escape") this.hide();
        });
    }

    #detach() {
        clearTimeout(this.#timer);
        for (const [type, handler] of this.#listeners)
            this.#target?.removeEventListener(type, handler);
        this.#listeners = [];
    }

    /** Shows the tooltip beside its control. */
    show() {
        clearTimeout(this.#timer);
        if (!this.#target) return;
        if (popovers) {
            if (!this.matches(":popover-open")) this.showPopover();
        } else {
            this.hidden = false;
        }
        place(this, this.#target, "above");
        this.#unfollow ??= follow(() => place(this, this.#target, "above"));
    }

    /** Hides the tooltip. */
    hide() {
        clearTimeout(this.#timer);
        if (popovers) {
            if (this.matches(":popover-open")) this.hidePopover();
        } else {
            this.hidden = true;
        }
        this.#unfollow?.();
        this.#unfollow = null;
    }
}

define("stemma-tooltip", StemmaTooltip);

return { StemmaTooltip };
})();