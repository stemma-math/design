// <stemma-range>: a range that fills up to its value, and shows it.
//
//     <stemma-range>
//         <label class="range">
//             Opacity
//             <input type="range" min="0" max="100" value="40" />
//             <output></output>
//         </label>
//     </stemma-range>
//
// WebKit and Blink cannot fill a range's track up to its thumb by
// themselves; this keeps `--range-fill` on the `input` in step with its
// value, which the stylesheet draws. An `output` inside shows the value,
// formatted by the `format` property when one is set.

import { define } from "./internal.js";

export class StemmaRange extends HTMLElement {
    #input = null;
    #output = null;

    /** Turns the value into the text the `output` shows. */
    format = (value) => String(value);

    connectedCallback() {
        if (this.#input) return;
        this.#input = this.querySelector('input[type="range"]');
        if (!this.#input) return;
        this.#output = this.querySelector("output");
        if (this.#output && this.#input.id) this.#output.htmlFor = this.#input.id;
        this.#input.addEventListener("input", () => this.refresh());
        this.#input.addEventListener("change", () => this.refresh());
        this.refresh();
    }

    /** The value, as a number. */
    get value() {
        return this.#input?.valueAsNumber ?? NaN;
    }

    set value(value) {
        if (!this.#input) return;
        this.#input.valueAsNumber = value;
        this.refresh();
    }

    /** Draws the fill and the value again, after a change from script. */
    refresh() {
        const input = this.#input;
        if (!input) return;
        const min = input.min === "" ? 0 : Number(input.min);
        const max = input.max === "" ? 100 : Number(input.max);
        const share = max > min ? (input.valueAsNumber - min) / (max - min) : 0;
        input.style.setProperty("--range-fill", `${(share * 100).toFixed(2)}%`);
        if (this.#output) this.#output.value = this.format(input.valueAsNumber);
    }
}

define("stemma-range", StemmaRange);
