// What every catalog page shares: the frame around it (the sidebar, with
// the appearance and the density, and "On this page"), and reading the
// tokens.
//
// A page is a `main`. Its sections with an `id` and an `h2` are listed
// beside it, under the `.catalog-group` heading before them.

import "../targets/elements/index.js";
import { bindSegmented } from "../targets/elements/segmented.js";
import { applyStoredTheme, applyTheme } from "../targets/elements/theme-switch.js";

const NAV = [
    { pages: [["index.html", "Overview"]] },
    {
        title: "Foundations",
        pages: [
            ["colour.html", "Colour"],
            ["typography.html", "Typography"],
            ["scales.html", "Scales"],
            ["glyphs.html", "Glyphs"],
        ],
    },
    {
        title: "Components",
        pages: [
            ["controls.html", "Controls"],
            ["content.html", "Content"],
            ["feedback.html", "Feedback"],
            ["navigation.html", "Navigation and overlays"],
        ],
    },
    {
        title: "Brand",
        pages: [
            ["brand.html", "Marks and icons"],
            ["light.html", "The light"],
        ],
    },
];

const THEME_KEY = "stemma-catalog-theme";
const DENSITY_KEY = "stemma-catalog-density";

// `?theme=light` or `?theme=dark`, and `?density=compact`, show one
// appearance or density without storing it.
const query = new URLSearchParams(location.search);

const stored = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const store = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Storage may be unavailable; the choice still holds for this page.
    }
};

function applyDensity(density) {
    document.documentElement.dataset.density = density;
}

if (query.get("theme")) applyTheme(query.get("theme"));
else applyStoredTheme(THEME_KEY);
applyDensity(query.get("density") ?? stored(DENSITY_KEY) ?? "comfortable");

function sidebar() {
    const here = location.pathname.split("/").at(-1) || "index.html";
    const aside = document.createElement("aside");
    aside.className = "catalog-sidebar";
    aside.innerHTML = `
        <a class="catalog-brand" href="index.html">
            <stemma-mark style="width: 1.9em"></stemma-mark>
            <span class="wordmark" style="font-size: 22px">stemma</span>
            <span class="label">design</span>
        </a>
        <nav class="catalog-nav" aria-label="Catalog">${NAV.map(
            ({ title, pages }) => `
            <div>${title ? `<h2 class="label">${title}</h2>` : ""}<ul>${pages
                .map(
                    ([href, name]) =>
                        `<li><a href="${href}"${href === here ? ' aria-current="page"' : ""}>${name}</a></li>`,
                )
                .join("")}</ul></div>`,
        ).join("")}
        </nav>
        <div class="catalog-settings">
            <div><span class="label">Appearance</span>
                <stemma-theme-switch fill storage-key="${THEME_KEY}"></stemma-theme-switch></div>
            <div><span class="label">Density</span>
                <div class="segmented segmented--fill" id="density" aria-label="Density">
                    <button value="comfortable">Comfortable</button
                    ><button value="compact">Compact</button>
                </div></div>
        </div>`;

    const choose = bindSegmented(aside.querySelector("#density"), (density) => {
        applyDensity(density);
        store(DENSITY_KEY, density);
    });
    choose(document.documentElement.dataset.density);
    return aside;
}

/** "On this page", from the page's sections, kept on the one in view. */
function contents(main) {
    const nav = document.createElement("nav");
    nav.className = "catalog-toc";
    nav.setAttribute("aria-label", "On this page");
    const sections = [...main.querySelectorAll("section[id]")].filter((s) =>
        s.querySelector(":scope > h2"),
    );
    if (sections.length < 3) return nav;

    const list = document.createElement("ul");
    const links = new Map();
    for (const node of main.querySelectorAll(".catalog-group, section[id]")) {
        const item = document.createElement("li");
        if (node.classList.contains("catalog-group")) {
            item.className = "catalog-toc__group";
            item.textContent = node.textContent;
        } else if (sections.includes(node)) {
            const link = document.createElement("a");
            link.href = `#${node.id}`;
            link.textContent = node.querySelector(":scope > h2").textContent;
            item.append(link);
            links.set(node, link);
        } else {
            continue;
        }
        list.append(item);
    }
    nav.innerHTML = '<span class="label">On this page</span>';
    nav.append(list);

    const visible = new Set();
    const observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) visible.add(entry.target);
                else visible.delete(entry.target);
            }
            const first = sections.find((s) => visible.has(s));
            for (const [section, link] of links)
                link.setAttribute("aria-current", String(section === first));
        },
        { rootMargin: "0px 0px -60% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return nav;
}

const main = document.querySelector("main");
const frame = document.createElement("div");
frame.className = "catalog";
const page = document.createElement("div");
page.className = "catalog-page";
main.replaceWith(frame);
page.append(main, contents(main));
frame.append(sidebar(), page);
// The switch reads the stored choice as it connects; an asked one wins.
if (query.get("theme")) frame.querySelector("stemma-theme-switch").value = query.get("theme");

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

/** An element from HTML. */
export function html(text) {
    const template = document.createElement("template");
    template.innerHTML = text.trim();
    return template.content.firstElementChild;
}
