modules["copy-button.js"] = (() => {
// <stemma-copy-button>: copies text to the clipboard, and says so.
//
//     <stemma-copy-button value="thm:fermat"></stemma-copy-button>
//     <stemma-copy-button for="snippet" label="Copy the code"></stemma-copy-button>
//
// It copies `value`, or the text of the element whose id is `for`. Without
// children it draws a small icon button labelled `label` ("Copy"); with a
// `button` inside, it uses that one. After copying, the glyph turns to a
// check for a moment and a live region says `copied-label` ("Copied").
// A `copied` event follows a successful copy.

const { glyph, glyphs } = modules["glyphs.js"];
const { define } = modules["internal.js"];
class StemmaCopyButton extends HTMLElement {
    #button = null;
    #status = null;
    #timer = 0;
    #glyph = null;

    connectedCallback() {
        if (this.#button) return;
        this.#button = this.querySelector("button");
        if (!this.#button) {
            this.#button = document.createElement("button");
            this.#button.type = "button";
            this.#button.className = "button button--icon button--small";
            this.#button.setAttribute("aria-label", this.getAttribute("label") || "Copy");
            this.#button.innerHTML = glyph("copy");
            this.append(this.#button);
        }
        const icon = this.#button.querySelector("svg.glyph");
        this.#glyph = icon ? { icon, markup: icon.innerHTML } : null;
        this.#status = document.createElement("span");
        this.#status.className = "visually-hidden";
        this.#status.setAttribute("role", "status");
        this.append(this.#status);
        this.#button.addEventListener("click", () => this.copy());
    }

    /** The text that will be copied. */
    get text() {
        if (this.hasAttribute("value")) return this.getAttribute("value");
        const source = document.getElementById(this.getAttribute("for") ?? "");
        return source ? source.textContent : "";
    }

    /** Copies the text; resolves to whether it worked. */
    async copy() {
        try {
            await navigator.clipboard.writeText(this.text);
        } catch {
            return false;
        }
        this.#acknowledge();
        this.dispatchEvent(new Event("copied", { bubbles: true }));
        return true;
    }

    #acknowledge() {
        if (this.#glyph) this.#glyph.icon.innerHTML = glyphs.check;
        this.#status.textContent = this.getAttribute("copied-label") || "Copied";
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => {
            if (this.#glyph) this.#glyph.icon.innerHTML = this.#glyph.markup;
            this.#status.textContent = "";
        }, 1600);
    }
}

define("stemma-copy-button", StemmaCopyButton);

return { StemmaCopyButton };
})();