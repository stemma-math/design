modules["toast-region.js"] = (() => {
// <stemma-toast-region>: where toasts appear. Where the region sits on the
// page is the consumer's to say.
//
//     <stemma-toast-region label="Notifications"></stemma-toast-region>
//
//     region.show({ text: "Saved.", intent: "success" });
//     region.show({ text: "Could not save.", intent: "danger", life: 0,
//                   action: { label: "Retry", onClick: retry } });
//
// Each toast is a `.message.toast` in its intent, with its glyph, its
// words, an optional action and a close button. It goes away by itself
// after `life` milliseconds (8000; 0 keeps it), shown by `.toast__time`,
// and the time stops while the pointer is over it or focus is in it.
// Danger toasts are announced at once; others politely.

const { glyph } = modules["glyphs.js"];
const { define } = modules["internal.js"];
const GLYPHS = {
    danger: "alert",
    warning: "warning",
    success: "done",
    info: "info",
    accent: "info",
    neutral: "info",
};

class StemmaToastRegion extends HTMLElement {
    connectedCallback() {
        if (!this.hasAttribute("role")) this.setAttribute("role", "region");
        if (!this.hasAttribute("aria-label")) {
            this.setAttribute("aria-label", this.getAttribute("label") || "Notifications");
        }
    }

    /**
     * Shows a toast. Returns a handle whose `close()` removes it.
     * @param {{ text: string, intent?: string, life?: number,
     *           action?: { label: string, onClick: () => void },
     *           closeLabel?: string }} options
     */
    show({ text, intent = "neutral", life = 8000, action, closeLabel = "Dismiss" }) {
        const toast = document.createElement("div");
        toast.className = `message toast message--${intent}`;
        toast.setAttribute("role", intent === "danger" ? "alert" : "status");
        toast.innerHTML = glyph(GLYPHS[intent] ?? "info");

        const words = document.createElement("p");
        words.className = "message__text";
        words.textContent = text;
        toast.append(words);

        const close = () => {
            if (!toast.isConnected) return;
            toast.remove();
            this.dispatchEvent(new Event("dismiss"));
        };

        if (action) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "button button--link";
            button.textContent = action.label;
            button.addEventListener("click", () => {
                action.onClick?.();
                close();
            });
            toast.append(button);
        }

        const dismiss = document.createElement("button");
        dismiss.type = "button";
        dismiss.className = "message__close";
        dismiss.setAttribute("aria-label", closeLabel);
        dismiss.innerHTML = glyph("close", true);
        dismiss.addEventListener("click", close);
        toast.append(dismiss);

        if (life > 0) {
            const time = document.createElement("span");
            time.className = "toast__time";
            time.style.setProperty("--toast-life", `${life}ms`);
            time.addEventListener("animationend", close);
            toast.append(time);
            // Without the stylesheet there is no animation to end it.
            requestAnimationFrame(() => {
                if (getComputedStyle(time).animationName === "none") setTimeout(close, life);
            });
        }

        this.append(toast);
        return { close };
    }
}

define("stemma-toast-region", StemmaToastRegion);

return { StemmaToastRegion };
})();