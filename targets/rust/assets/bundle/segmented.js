modules["segmented.js"] = (() => {
// <stemma-segmented>: a segmented control over the `.segmented` class.
//
//     <stemma-segmented label="View">
//         <div class="segmented">
//             <button value="list" aria-pressed="true">List</button>
//             <button value="graph">Graph</button>
//         </div>
//     </stemma-segmented>
//
// One option is chosen at a time. The options are one stop in the tab
// order; the arrow keys, Home and End move among them and choose. A
// `change` event says which was chosen, in `value`.

const { define } = modules["internal.js"];
/** Makes the buttons inside `group` a single choice. `onChoose(value)` runs
 * when the person chooses one. Returns a function that chooses a value. */
function bindSegmented(group, onChoose) {
    const options = () => [...group.querySelectorAll("button")];
    const valueOf = (button) => button.value || button.dataset.value || button.textContent.trim();

    const choose = (value, focus = false) => {
        for (const button of options()) {
            const chosen = valueOf(button) === value;
            button.setAttribute("aria-pressed", String(chosen));
            button.tabIndex = chosen ? 0 : -1;
            if (chosen && focus) button.focus();
        }
    };

    group.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button || !group.contains(button) || button.disabled) return;
        const value = valueOf(button);
        choose(value);
        onChoose(value);
    });

    group.addEventListener("keydown", (event) => {
        const all = options().filter((button) => !button.disabled);
        const index = all.indexOf(document.activeElement);
        if (index < 0) return;
        const next = {
            ArrowRight: index + 1,
            ArrowDown: index + 1,
            ArrowLeft: index - 1,
            ArrowUp: index - 1,
            Home: 0,
            End: all.length - 1,
        }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        const button = all[(next + all.length) % all.length];
        const value = valueOf(button);
        choose(value, true);
        onChoose(value);
    });

    const pressed = options().find((button) => button.getAttribute("aria-pressed") === "true");
    choose(pressed ? valueOf(pressed) : valueOf(options()[0]));
    return choose;
}

class StemmaSegmented extends HTMLElement {
    #choose = null;
    #value = "";

    connectedCallback() {
        if (this.#choose) return;
        const group = this.querySelector(".segmented") ?? this;
        group.setAttribute("role", "group");
        if (this.hasAttribute("label"))
            group.setAttribute("aria-label", this.getAttribute("label"));
        this.#choose = bindSegmented(group, (value) => {
            this.#value = value;
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });
        const pressed = group.querySelector('button[aria-pressed="true"]');
        this.#value = pressed
            ? pressed.value || pressed.dataset.value || pressed.textContent.trim()
            : "";
    }

    /** The chosen option's value. */
    get value() {
        return this.#value;
    }

    set value(value) {
        this.#value = value;
        this.#choose?.(value);
    }
}

define("stemma-segmented", StemmaSegmented);

return { bindSegmented, StemmaSegmented };
})();