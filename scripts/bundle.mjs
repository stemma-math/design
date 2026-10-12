// Writes an inline bundle: everything a page kept in a single HTML file
// needs from the design system, as one HTML fragment for its `head`: the
// stylesheets, the faces as base64 WOFF2, the glyph sprite and the
// elements' behaviour.
//
//     node scripts/bundle.mjs --out page-head.html [options]
//
// Options:
//     --faces ui,prose,mono   families to embed: `ui` (Instrument Sans and
//                             Libertinus Sans), `prose` (New Computer
//                             Modern), `mono` (JuliaMono); `ui` by default
//     --math                  also embed New Computer Modern Math, whole
//     --subsets latin,…       ranges of the split faces to embed: latin,
//                             latin-ext, greek, cyrillic, symbols;
//                             `latin,latin-ext` by default. JuliaMono ships
//                             whole, or, when only `latin` is asked
//                             for, as upstream's Latin files alone
//     --weights 400,700       weights to embed; every weight by default
//     --elements all|a,b      elements to include, by module name
//                             (`theme-switch`, `copy-button`, …); none by
//                             default
//     --no-sprite             leave the glyph sprite out
//
//     node scripts/bundle.mjs --check
//
// builds every option in memory and checks that the result holds together.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

// Paths are relative to the repository's root, wherever this runs from.
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const WEB = `${ROOT}targets/web`;
const ELEMENTS = `${ROOT}targets/elements`;

export const FAMILIES = {
    ui: ["Instrument Sans", "Libertinus Sans"],
    prose: ["New Computer Modern"],
    mono: ["JuliaMono"],
    math: ["New Computer Modern Math"],
};

export const SUBSETS = ["latin", "latin-ext", "greek", "cyrillic", "symbols"];

export const MODULES = [
    "copy-button",
    "dialog",
    "filter-chips",
    "light",
    "mark",
    "menu",
    "segmented",
    "theme-switch",
    "toast-region",
    "tooltip",
];

function parse(argv) {
    const options = {
        faces: ["ui"],
        math: false,
        subsets: ["latin", "latin-ext"],
        weights: [],
        elements: [],
        sprite: true,
    };
    for (let i = 0; i < argv.length; i++) {
        const value = () => argv[++i] ?? "";
        const list = () => value().split(",").filter(Boolean);
        switch (argv[i]) {
            case "--out":
                options.out = value();
                break;
            case "--faces":
                options.faces = list();
                break;
            case "--weights":
                options.weights = list().map(Number);
                break;
            case "--math":
                options.math = true;
                break;
            case "--subsets":
                options.subsets = list();
                break;
            case "--elements": {
                const asked = list();
                options.elements = asked.includes("all") ? MODULES : asked;
                break;
            }
            case "--no-sprite":
                options.sprite = false;
                break;
            case "--check":
                options.check = true;
                break;
            default:
                throw new Error(`Unknown option: ${argv[i]}`);
        }
    }
    for (const face of options.faces) {
        if (!FAMILIES[face] || face === "math") throw new Error(`Unknown faces: ${face}`);
    }
    for (const subset of options.subsets) {
        if (!SUBSETS.includes(subset)) throw new Error(`Unknown subset: ${subset}`);
    }
    for (const name of options.elements) {
        if (!MODULES.includes(name)) throw new Error(`Unknown element module: ${name}`);
    }
    return options;
}

// ── Faces ──────────────────────────────────────────────────────────────────

/** The `@font-face` rules of `fonts.css` that the options ask for, with
 * their files inlined. */
async function faces(options) {
    const css = await readFile(`${WEB}/fonts.css`, "utf8");
    const families = new Set(
        [...options.faces, ...(options.math ? ["math"] : [])].flatMap((f) => FAMILIES[f]),
    );
    const onlyLatin = options.subsets.length === 1 && options.subsets[0] === "latin";
    const rules = [];
    for (const rule of css.match(/@font-face \{[^}]+\}/g)) {
        const family = /font-family: "([^"]+)"/.exec(rule)[1];
        if (!families.has(family)) continue;
        const url = /url\("([^"]+)"\)/.exec(rule)[1];
        const subset = /-(latin-ext|latin|greek|cyrillic|symbols)\.woff2$/.exec(url)?.[1];
        if (subset && !options.subsets.includes(subset)) continue;
        // Libertinus Sans only stands in for what Instrument Sans lacks.
        if (family === "Libertinus Sans" && ["latin", "latin-ext"].includes(subset)) continue;
        const weight = Number(/font-weight: (\d+)/.exec(rule)[1]);
        if (
            options.weights.length &&
            family !== "New Computer Modern Math" &&
            !options.weights.includes(weight)
        ) {
            continue;
        }
        if (family === "JuliaMono") {
            // Only upstream's Latin files, when only Latin is asked for: a
            // style without one is left to the browser to synthesise.
            const latin = url.endsWith("Latin.woff2");
            if (onlyLatin ? !latin : latin) continue;
        }
        const data = (await readFile(`${WEB}/${url}`)).toString("base64");
        rules.push(rule.replace(url, `data:font/woff2;base64,${data}`));
    }
    return rules.join("\n\n");
}

// ── Stylesheets ────────────────────────────────────────────────────────────

async function stylesheets() {
    const noise = (await readFile(`${WEB}/noise.svg`)).toString("base64");
    const parts = [];
    for (const name of ["tokens.css", "base.css", "document.css", "components.css"]) {
        let css = await readFile(`${WEB}/${name}`, "utf8");
        css = css.replace('url("noise.svg")', `url("data:image/svg+xml;base64,${noise}")`);
        parts.push(css);
    }
    return parts.join("\n");
}

// ── Sprite ─────────────────────────────────────────────────────────────────

async function sprite() {
    const svg = await readFile(`${WEB}/glyphs.svg`, "utf8");
    // Inline, a glyph is drawn with <use href="#name"/>.
    return svg
        .replace(/<!--[\s\S]*?-->\s*/, "")
        .replace(
            "<svg ",
            '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden" ',
        );
}

// ── Behaviour ──────────────────────────────────────────────────────────────

export const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*"(\.\/[^"]+)";\s*$/gm;

/** The modules `entries` need, each once, dependencies first. */
export async function collect(entries) {
    const order = [];
    const seen = new Set();
    const visit = async (path) => {
        if (seen.has(path)) return;
        seen.add(path);
        const source = await readFile(`${ELEMENTS}/${path}`, "utf8");
        for (const [, , dependency] of source.matchAll(IMPORT)) await visit(dependency.slice(2));
        order.push({ path, source });
    };
    for (const entry of entries) await visit(`${entry}.js`);
    return order;
}

/** One module as a function scope that returns its exports. */
export function wrap({ path, source }) {
    const names = [];
    let body = source.replace(IMPORT, (_, imported, dependency) => {
        const bindings = imported
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean)
            .map((name) => name.replace(/\s+as\s+/, ": "));
        return `const { ${bindings.join(", ")} } = modules[${JSON.stringify(dependency.slice(2))}];`;
    });
    body = body.replace(
        /^export (async function|function|class|const|let)\s+([A-Za-z_$][\w$]*)/gm,
        (_, kind, name) => {
            names.push(name);
            return `${kind} ${name}`;
        },
    );
    if (/^export\b/m.test(body)) throw new Error(`${path}: an export the bundler cannot inline`);
    return `modules[${JSON.stringify(path)}] = (() => {\n${body}\nreturn { ${names.join(", ")} };\n})();`;
}

async function behaviour(entries) {
    if (!entries.length) return "";
    const modules = await collect(entries);
    return ["const modules = {};", ...modules.map(wrap)].join("\n\n");
}

// ── The bundle ─────────────────────────────────────────────────────────────

export async function bundle(options) {
    const parts = [
        `<!-- Stemma design, inline bundle. Faces: ${[...options.faces, ...(options.math ? ["math"] : [])].join(", ") || "none"}; ` +
            `subsets: ${options.subsets.join(", ")}; elements: ${options.elements.join(", ") || "none"}. -->`,
        `<style>\n${await faces(options)}\n\n${await stylesheets()}</style>`,
    ];
    if (options.sprite) parts.push(await sprite());
    const script = await behaviour(options.elements);
    if (script) parts.push(`<script type="module">\n${script}\n</script>`);
    return { html: parts.join("\n") + "\n", script };
}

async function main() {
    const options = parse(process.argv.slice(2));
    if (options.check) {
        await check();
        return;
    }
    if (!options.out) throw new Error("Say where to write the bundle with --out.");
    const { html } = await bundle(options);
    await writeFile(options.out, html);
    console.log(`Wrote ${options.out} (${Math.round(html.length / 1024)} KiB)`);
}

async function check() {
    const { html, script } = await bundle({
        faces: ["ui", "prose", "mono"],
        math: true,
        subsets: SUBSETS,
        weights: [],
        elements: MODULES,
        sprite: true,
    });
    // The behaviour must parse as a script once its imports are inlined.
    new vm.Script(script);
    if (html.includes('url("fonts/') || html.includes('url("noise.svg")')) {
        console.error("The bundle still refers to files beside it.");
        process.exit(1);
    }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
