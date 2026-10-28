// Helpers the elements share. Not part of the package's public interface.

/** Defines a custom element once, however many times its module loads. */
export function define(name, constructor) {
    if (!customElements.get(name)) customElements.define(name, constructor);
}

let counter = 0;

/** An id unique in this page. */
export function uid(prefix) {
    counter += 1;
    return `${prefix}-${counter}`;
}

const reduce = matchMedia("(prefers-reduced-motion: reduce)");

/** Whether the person asked for reduced motion. */
export function reducedMotion() {
    return reduce.matches;
}

/** Calls `callback` when the reduced motion preference changes; returns a
 * function that stops listening. */
export function onReducedMotionChange(callback) {
    reduce.addEventListener("change", callback);
    return () => reduce.removeEventListener("change", callback);
}

/** A custom property's value on `element`, trimmed. */
export function token(name, element = document.documentElement) {
    return getComputedStyle(element).getPropertyValue(name).trim();
}

let scratch;

/** A CSS colour, which may use custom properties and `color-mix()`, as it
 * resolves on `element`, as red, green and blue from 0 to 1. */
export function tokenColor(expression, element = document.documentElement) {
    const probe = document.createElement("span");
    probe.style.display = "none";
    probe.style.color = expression;
    element.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();
    // A 2D canvas turns any colour syntax the browser knows into bytes.
    scratch ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
    scratch.clearRect(0, 0, 1, 1);
    scratch.fillStyle = resolved;
    scratch.fillRect(0, 0, 1, 1);
    const [r, g, b] = scratch.getImageData(0, 0, 1, 1).data;
    return [r / 255, g / 255, b / 255];
}

/** A duration token in milliseconds. */
export function durationToken(name, fallback) {
    const value = token(name);
    const match = /^([\d.]+)(ms|s)$/.exec(value);
    if (!match) return fallback;
    return parseFloat(match[1]) * (match[2] === "s" ? 1000 : 1);
}

/** An easing function for `cubic-bezier(x1, y1, x2, y2)`. */
export function cubicBezier(x1, y1, x2, y2) {
    const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
    const slope = (a, b, t) =>
        3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t ** 2;
    return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const error = at(x1, x2, t) - x;
            const d = slope(x1, x2, t);
            if (Math.abs(error) < 1e-6 || d === 0) break;
            t -= error / d;
        }
        return at(y1, y2, Math.min(Math.max(t, 0), 1));
    };
}

/** An easing token, `cubic-bezier(…)`, as a function. */
export function easingToken(name) {
    const match = /cubic-bezier\(([^)]+)\)/.exec(token(name));
    const [x1, y1, x2, y2] = match ? match[1].split(",").map(Number) : [0.42, 0, 0.58, 1];
    return cubicBezier(x1, y1, x2, y2);
}

const dark = matchMedia("(prefers-color-scheme: dark)");

/** The appearance in effect: `data-theme` on the root, or the system's. */
export function appearance() {
    const theme = document.documentElement.dataset.theme;
    if (theme === "light" || theme === "dark") return theme;
    return dark.matches ? "dark" : "light";
}

/** Calls `callback` whenever the appearance may have changed: the
 * system's preference or the root's `data-theme`. Returns a function that
 * stops listening. */
export function onAppearanceChange(callback) {
    const observer = new MutationObserver(callback);
    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"],
    });
    dark.addEventListener("change", callback);
    return () => {
        observer.disconnect();
        dark.removeEventListener("change", callback);
    };
}

/** Whether the browser supports the Popover API. */
export const popovers = typeof HTMLElement.prototype.showPopover === "function";

/** Places a fixed `floating` element beside `anchor`: below it, or above
 * when there is no room below, aligned to its start, kept inside the
 * viewport. `side` prefers `above` or `below`. */
export function place(floating, anchor, side = "below", gap = 6) {
    const a = anchor.getBoundingClientRect();
    const f = floating.getBoundingClientRect();
    const room = { below: innerHeight - a.bottom, above: a.top };
    const other = side === "below" ? "above" : "below";
    const chosen = room[side] >= f.height + gap || room[side] >= room[other] ? side : other;
    const top = chosen === "below" ? a.bottom + gap : a.top - gap - f.height;
    const left = Math.min(Math.max(a.left, 8), Math.max(innerWidth - f.width - 8, 8));
    floating.style.position = "fixed";
    floating.style.top = `${Math.round(top)}px`;
    floating.style.left = `${Math.round(left)}px`;
}

/** Calls `update` once a frame while anything scrolls or the viewport is
 * resized, so a fixed element stays beside its anchor. Returns a function
 * that stops. */
export function follow(update) {
    let frame = 0;
    const later = () => {
        if (!frame)
            frame = requestAnimationFrame(() => {
                frame = 0;
                update();
            });
    };
    addEventListener("resize", later);
    document.addEventListener("scroll", later, { capture: true, passive: true });
    return () => {
        cancelAnimationFrame(frame);
        removeEventListener("resize", later);
        document.removeEventListener("scroll", later, { capture: true });
    };
}
