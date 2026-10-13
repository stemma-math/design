// <stemma-dialog>: behaviour for a native modal `dialog` with the `.dialog`
// class.
//
//     <stemma-dialog id="delete">
//         <dialog class="dialog" aria-labelledby="delete-title">
//             <form class="dialog__body" method="dialog">
//                 <h2 class="dialog__title" id="delete-title">Delete this draft?</h2>
//                 <p class="dialog__text">It cannot be recovered.</p>
//                 <div class="dialog__actions">
//                     <button class="button" value="cancel">Cancel</button>
//                     <button class="button button--primary button--danger" value="delete">Delete</button>
//                 </div>
//             </form>
//         </dialog>
//     </stemma-dialog>
//     <button data-opens="delete">Delete…</button>
//
// The browser's own dialog traps focus and closes on Escape. This element
// adds: opening from any button with `data-opens` set to its id, closing
// on a click on the backdrop (unless `persistent`), closing from any
// element with `data-closes` inside, and returning focus to where it was.
// `open()` resolves to the dialog's return value once it closes; a `close`
// event carries it in `returnValue`.

import { define } from "./internal.js";

export class StemmaDialog extends HTMLElement {
    #dialog = null;
    #opener = null;
    #settle = null;

    connectedCallback() {
        if (this.#dialog) return;
        this.#dialog = this.querySelector("dialog");
        if (!this.#dialog) return;
        this.#dialog.addEventListener("click", (event) => {
            const closer = event.target.closest("[data-closes]");
            if (closer && this.#dialog.contains(closer)) {
                this.close(closer.dataset.closes || closer.value || "");
                return;
            }
            // A click on the dialog element itself, outside its content, is
            // on the backdrop.
            if (event.target === this.#dialog && !this.hasAttribute("persistent")) {
                const box = this.#dialog.getBoundingClientRect();
                const inside =
                    event.clientX >= box.left &&
                    event.clientX <= box.right &&
                    event.clientY >= box.top &&
                    event.clientY <= box.bottom;
                if (!inside) this.close("");
            }
        });
        this.#dialog.addEventListener("cancel", (event) => {
            if (this.hasAttribute("persistent")) event.preventDefault();
        });
        this.#dialog.addEventListener("close", () => {
            const value = this.#dialog.returnValue;
            this.#opener?.focus?.();
            this.#opener = null;
            this.#settle?.(value);
            this.#settle = null;
            this.dispatchEvent(new Event("close"));
        });
    }

    /** Whether the dialog is open. */
    get isOpen() {
        return Boolean(this.#dialog?.open);
    }

    /** The value the dialog last closed with. */
    get returnValue() {
        return this.#dialog?.returnValue ?? "";
    }

    /** Opens the dialog as a modal; resolves to its return value. */
    open() {
        if (!this.#dialog) return Promise.resolve("");
        if (!this.#dialog.open) {
            this.#opener = document.activeElement;
            this.#dialog.returnValue = "";
            this.#dialog.showModal();
        }
        return new Promise((resolve) => {
            this.#settle = resolve;
        });
    }

    /** Closes the dialog with `value`. */
    close(value = "") {
        if (this.#dialog?.open) this.#dialog.close(value);
    }
}

define("stemma-dialog", StemmaDialog);

// A button anywhere opens the dialog its `data-opens` names.
document.addEventListener("click", (event) => {
    const opener = event.target.closest?.("[data-opens]");
    if (!opener) return;
    const target = document.getElementById(opener.dataset.opens);
    if (target instanceof StemmaDialog) target.open();
});
