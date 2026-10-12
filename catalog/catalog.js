// What every catalog page shares: the header, and reading the tokens.

import "../targets/elements/index.js";
import { applyStoredTheme, applyTheme } from "../targets/elements/theme-switch.js";

// `?theme=light` or `?theme=dark` shows one appearance without storing it.
const asked = new URLSearchParams(location.search).get("theme");

const PAGES = [
    ["index.html", "Overview"],
    ["tokens.html", "Tokens"],
    ["typography.html", "Typography"],
    ["components.html", "Components"],
    ["elements.html", "Elements"],
    ["brand.html", "Brand"],
];

const here = location.pathname.split("/").at(-1) || "index.html";
const header = document.createElement("header");
header.className = "catalog-header";
header.innerHTML = `
    <a class="brand" href="index.html"><stemma-mark style="width:2em"></stemma-mark>
        <span class="wordmark" style="font-size:22px">stemma</span>
        <span class="label">design</span></a>
    <nav aria-label="Catalog">${PAGES.map(
        ([href, name]) =>
            `<a class="button button--quiet button--small" href="${href}"${href === here ? ' aria-current="page"' : ""}>${name}</a>`,
    ).join("")}</nav>
    <stemma-theme-switch storage-key="stemma-catalog-theme"></stemma-theme-switch>`;
document.body.prepend(header);
if (asked) {
    header.querySelector("stemma-theme-switch").value = asked;
    applyTheme(asked);
} else {
    applyStoredTheme("stemma-catalog-theme");
}

/** The custom properties of `tokens.css`: the light values, the dark ones
 * and the two densities', each as a Map from name to value. */
export async function tokens() {
    const css = await (await fetch("../targets/web/tokens.css")).text();
    const block = (selector) => {
        const start = css.indexOf(selector);
        const open = css.indexOf("{", start);
        let depth = 0;
        for (let i = open; i < css.length; i++) {
            if (css[i] === "{") depth++;
            if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
        }
        return "";
    };
    const read = (text) =>
        new Map(
            [...text.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [
                name,
                value.trim(),
            ]),
        );
    return {
        light: read(block(":root {")),
        dark: read(block(':root[data-theme="dark"] {')),
        comfortable: read(block('[data-density="comfortable"] {')),
        compact: read(block('[data-density="compact"] {')),
    };
}

/** A token's value in an appearance, references followed. */
export function resolve(all, name, appearance) {
    let value = (appearance === "dark" && all.dark.get(name)) || all.light.get(name);
    for (let i = 0; i < 10 && value; i++) {
        const match = /^var\(--([\w-]+)\)$/.exec(value);
        if (!match) break;
        value = (appearance === "dark" && all.dark.get(match[1])) || all.light.get(match[1]);
    }
    return value;
}
