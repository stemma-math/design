// <stemma-stepper>: a number taken down and up by buttons.
//
//     <stemma-stepper>
//         <input type="number" name="copies" value="1" min="1" max="9" aria-label="Copies" />
//     </stemma-stepper>
//
// It wraps the `input` in a `.stepper` between a button that takes the
// value down by its `step` and one that takes it up, labelled
// `decrease-label` ("Decrease") and `increase-label` ("Increase"). A
// `.stepper` already inside, with its two `.stepper__button`s, is used as
// it is. Holding a button down repeats it. Each step sends `input`, and
// `change` when the button is let go, from the `input`. A button is
// disabled at the end of its range. The `input` keeps its own keys: the
// arrow keys step it, and it can be typed into.

import { glyph } from "./glyphs.js";
import { define } from "./internal.js";

const DELAY = 400;
const REPEAT = 70;

export class StemmaStepper extends HTMLElement {
    #input = null;
    #down = null;
    #up = null;
    #timer = 0;
    #changed = false;

    connectedCallback() {
        if (this.#input) return;
        this.#input = this.querySelector('input[type="number"]');
        if (!this.#input) return;

        let group = this.querySelector(".stepper");
        if (!group) {
            group = document.createElement("div");
            group.className = "stepper";
            if (this.hasAttribute("small")) group.classList.add("stepper--small");
            this.#input.replaceWith(group);
            group.append(this.#button("minus", "decrease-label", "Decrease"));
            group.append(this.#input);
            group.append(this.#button("add", "increase-label", "Increase"));
        }
        group.setAttribute("role", "group");
        [this.#down, this.#up] = group.querySelectorAll(".stepper__button");
        if (!this.#down || !this.#up) return;
        if (this.#input.id) {
            this.#down.setAttribute("aria-controls", this.#input.id);
            this.#up.setAttribute("aria-controls", this.#input.id);
        }

        this.#bind(this.#down, -1);
        this.#bind(this.#up, 1);
        this.#input.addEventListener("input", () => this.#limits());
        this.#input.addEventListener("change", () => this.#limits());
        this.#limits();
    }

    #button(name, attribute, fallback) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "stepper__button";
        button.tabIndex = -1;
        button.setAttribute("aria-label", this.getAttribute(attribute) || fallback);
        button.innerHTML = glyph(name);
        return button;
    }

    #bind(button, direction) {
        const stop = () => {
            clearTimeout(this.#timer);
            this.#timer = 0;
            if (this.#changed) {
                this.#changed = false;
                this.#input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        };
        button.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 || button.disabled) return;
            event.preventDefault();
            this.#input.focus({ preventScroll: true });
            this.step(direction, false);
            const repeat = (wait) => {
                this.#timer = setTimeout(() => {
                    if (!this.step(direction, false)) return stop();
                    repeat(REPEAT);
                }, wait);
            };
            repeat(DELAY);
            button.setPointerCapture?.(event.pointerId);
        });
        button.addEventListener("pointerup", stop);
        button.addEventListener("pointercancel", stop);
        button.addEventListener("lostpointercapture", stop);
        // A click from the keyboard or assistive technology, not a pointer.
        button.addEventListener("click", (event) => {
            if (event.detail === 0) this.step(direction);
        });
    }

    /** Steps the value `direction` steps (negative to go down); sends
     * `input`, and `change` unless told not to. Returns whether it moved. */
    step(direction = 1, change = true) {
        const input = this.#input;
        if (!input || input.disabled || input.readOnly) return false;
        const before = input.value;
        try {
            if (direction > 0) input.stepUp(direction);
            else input.stepDown(-direction);
        } catch {
            return false;
        }
        if (input.value === before) return false;
        input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
        if (change) input.dispatchEvent(new Event("change", { bubbles: true }));
        else this.#changed = true;
        this.#limits();
        return true;
    }

    /** The value, as a number. */
    get value() {
        return this.#input?.valueAsNumber ?? NaN;
    }

    set value(value) {
        if (!this.#input) return;
        this.#input.valueAsNumber = value;
        this.#limits();
    }

    #limits() {
        const input = this.#input;
        const value = input.valueAsNumber;
        const min = input.min === "" ? -Infinity : Number(input.min);
        const max = input.max === "" ? Infinity : Number(input.max);
        const off = input.disabled || input.readOnly;
        this.#down.disabled = off || value <= min;
        this.#up.disabled = off || value >= max;
    }
}

define("stemma-stepper", StemmaStepper);
