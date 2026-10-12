// Generates the targets that carry other targets' files: the Rust crate
// `stemma-design` (targets/rust) and the Verso theme (targets/verso).
//
//     node scripts/targets.mjs          write the generated files
//     node scripts/targets.mjs --check  fail if any differs from what would be written
//
// Run it after the other generators: it copies their outputs.

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle, collect, MODULES, SUBSETS, wrap } from "./bundle.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const HEADER =
    "Generated from targets/web, targets/elements and targets/brand-kit by scripts/targets.mjs. Do not edit.";

/** Every file under `directory`, as paths relative to it, sorted. */
async function files(directory) {
    const found = [];
    const walk = async (dir) => {
        for (const entry of await readdir(join(ROOT, dir), { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) await walk(path);
            else found.push(relative(directory, path));
        }
    };
    await walk(directory);
    return found.sort();
}

const read = (path) => readFile(join(ROOT, path));

// ── Rust ───────────────────────────────────────────────────────────────────

/** The files each group of the crate serves, from the target they come from. */
const GROUPS = [
    {
        name: "WEB",
        feature: null,
        target: "targets/web",
        prefix: "web",
        keep: (path) =>
            /\.(css|svg)$/.test(path) || path.startsWith("fonts/") || path === "LICENSE",
    },
    {
        name: "ELEMENTS",
        feature: "elements",
        target: "targets/elements",
        prefix: "elements",
        keep: (path) => path.endsWith(".js") || path.startsWith("LICENSE"),
    },
    {
        name: "BRAND_KIT",
        feature: "brand-kit",
        target: "targets/brand-kit",
        prefix: "brand-kit",
        keep: (path) => /^(app|web|svg)\//.test(path) || path === "LICENSE",
    },
];

const TYPES = {
    css: "text/css; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    svg: "image/svg+xml",
    woff2: "font/woff2",
    png: "image/png",
    ico: "image/vnd.microsoft.icon",
    icns: "image/icns",
    txt: "text/plain; charset=utf-8",
};

const contentType = (path) => {
    const extension = /\.([a-z0-9]+)$/.exec(path)?.[1];
    return TYPES[extension] ?? "text/plain; charset=utf-8";
};

/** A Rust string literal. */
const rustString = (text) => `"${text.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;

/** FNV-1a, 64 bits, over UTF-8: what the crate's tests compare bundles by. */
function fnv(text) {
    let hash = 0xcbf29ce484222325n;
    for (const byte of Buffer.from(text, "utf8")) {
        hash ^= BigInt(byte);
        hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
    }
    return hash.toString(16).padStart(16, "0");
}

// The bundles the crate's tests rebuild and compare with `bundle.mjs`.
const VARIANTS = [
    { faces: [], math: false, subsets: ["latin"], weights: [], elements: [], sprite: true },
    {
        faces: ["ui"],
        math: false,
        subsets: ["latin", "latin-ext"],
        weights: [400],
        elements: [],
        sprite: false,
    },
    {
        faces: ["prose", "mono"],
        math: true,
        subsets: ["latin"],
        weights: [400, 700],
        elements: ["theme-switch", "copy-button", "mark"],
        sprite: true,
    },
    {
        faces: ["ui", "prose", "mono"],
        math: true,
        subsets: SUBSETS,
        weights: [],
        elements: MODULES,
        sprite: true,
    },
];

async function rust(out) {
    const crate = "targets/rust";
    const tables = [`// ${HEADER}`, "", "use crate::Asset;", ""];
    for (const group of GROUPS) {
        const entries = [];
        for (const path of (await files(group.target)).filter(group.keep)) {
            const copy = `assets/${group.prefix}/${path}`;
            out.set(`${crate}/${copy}`, await read(join(group.target, path)));
            entries.push(
                `    Asset {\n        path: ${rustString(`${group.prefix}/${path}`)},\n` +
                    `        content_type: ${rustString(contentType(path))},\n` +
                    `        bytes: include_bytes!(${rustString(`../${copy}`)}),\n    },`,
            );
        }
        if (group.feature) tables.push(`#[cfg(feature = ${rustString(group.feature)})]`);
        tables.push(`pub(crate) static ${group.name}: &[Asset] = &[`, ...entries, "];", "");
    }
    out.set(`${crate}/src/assets.rs`, tables.join("\n"));

    // The inline bundle: each `@font-face` rule with what it is for, and each
    // element module, already wrapped, with what it imports.
    const fonts = await readFile(join(ROOT, "targets/web/fonts.css"), "utf8");
    const rules = fonts.match(/@font-face \{[^}]+\}/g).map((rule) => {
        const family = /font-family: "([^"]+)"/.exec(rule)[1];
        const weight = /font-weight: (\d+)/.exec(rule)[1];
        const url = /url\("([^"]+)"\)/.exec(rule)[1];
        const subset = /-(latin-ext|latin|greek|cyrillic|symbols)\.woff2$/.exec(url)?.[1];
        return (
            `    FontRule {\n        family: ${rustString(family)},\n        weight: ${weight},\n` +
            `        subset: ${subset ? `Some(${rustString(subset)})` : "None"},\n` +
            `        url: ${rustString(url)},\n        rule: ${rustString(rule)},\n    },`
        );
    });
    const data = [
        `// ${HEADER}`,
        "",
        "use crate::bundle::FontRule;",
        "",
        "pub(crate) static FONT_RULES: &[FontRule] = &[",
        ...rules,
        "];",
        "",
    ];
    const modules = await collect(MODULES);
    data.push(
        '#[cfg(feature = "elements")]',
        "pub(crate) static MODULES: &[crate::bundle::Module] = &[",
    );
    for (const module of modules) {
        const name = module.path.replace(/\.js$/, "");
        out.set(`${crate}/assets/bundle/${module.path}`, wrap(module));
        const imports = [
            ...module.source.matchAll(/^import\s*\{[^}]*\}\s*from\s*"\.\/([^"]+)";\s*$/gm),
        ].map(([, path]) => rustString(path.replace(/\.js$/, "")));
        data.push(
            `    crate::bundle::Module {\n        name: ${rustString(name)},\n` +
                `        imports: &[${imports.join(", ")}],\n` +
                `        code: include_str!(${rustString(`../assets/bundle/${module.path}`)}),\n    },`,
        );
    }
    data.push("];", "");
    out.set(`${crate}/src/bundle_data.rs`, data.join("\n"));

    const lines = [
        `# ${HEADER}`,
        "# faces\tmath\tsubsets\tweights\telements\tsprite\tlength\tfnv1a64",
    ];
    for (const variant of VARIANTS) {
        const { html } = await bundle(variant);
        lines.push(
            [
                variant.faces.join(","),
                variant.math,
                variant.subsets.join(","),
                variant.weights.join(","),
                variant.elements.join(","),
                variant.sprite,
                Buffer.byteLength(html, "utf8"),
                fnv(html),
            ].join("\t"),
        );
    }
    out.set(`${crate}/tests/bundles.tsv`, lines.join("\n") + "\n");
    out.set(`${crate}/LICENSE`, await read("LICENSE"));
    out.set(`${crate}/LICENSE-mark`, await read("source/brand/LICENSE"));
}

// ── Verso ──────────────────────────────────────────────────────────────────

async function verso(out) {
    const target = "targets/verso";
    const copied = [];
    for (const path of await files("targets/web/fonts")) {
        out.set(`${target}/fonts/${path}`, await read(join("targets/web/fonts", path)));
        copied.push(`fonts/${path}`);
    }
    out.set(`${target}/noise.svg`, await read("targets/web/noise.svg"));
    copied.push("noise.svg");

    const css = [`/* ${HEADER} */`];
    for (const path of [
        "targets/web/fonts.css",
        "targets/web/tokens.css",
        "targets/web/base.css",
        "targets/web/document.css",
        "targets/web/components.css",
        "targets/verso/verso-map.css",
    ]) {
        css.push(
            `\n/* ── ${path.split("/").at(-1)} ── */\n`,
            await readFile(join(ROOT, path), "utf8"),
        );
    }
    out.set(`${target}/verso-theme.css`, css.join("\n"));

    out.set(
        `${target}/StemmaDesign/Files.lean`,
        [
            `/-! ${HEADER} -/`,
            "",
            "namespace StemmaDesign",
            "",
            "/-- The files a site copies beside `verso-theme.css`, as paths relative to this package's",
            "directory and to the stylesheet alike: the faces, their licences and the grain texture. -/",
            "def files : Array String := #[",
            copied.map((path) => `  ${JSON.stringify(path)}`).join(",\n"),
            "]",
            "",
            "end StemmaDesign",
            "",
        ].join("\n"),
    );
    out.set(`${target}/LICENSE`, await read("LICENSE"));
}

// ── Output ─────────────────────────────────────────────────────────────────

const out = new Map();
await rust(out);
await verso(out);

// Directories wholly generated: anything in them that is not generated is stale.
const OWNED = ["targets/rust/assets", "targets/verso/fonts"];
const existing = new Set();
for (const dir of OWNED) {
    for (const path of await files(dir).catch(() => [])) existing.add(join(dir, path));
}
const extra = [...existing].filter((path) => !out.has(path));

const same = async (path, data) => {
    const current = await readFile(join(ROOT, path)).catch(() => null);
    return current !== null && Buffer.compare(current, Buffer.from(data)) === 0;
};

if (process.argv.includes("--check")) {
    const stale = [];
    for (const [path, data] of out) if (!(await same(path, data))) stale.push(path);
    for (const path of stale) console.error(`Out of date: ${path}`);
    for (const path of extra) console.error(`Not generated: ${path}`);
    if (stale.length || extra.length) {
        console.error("Run `just generate`.");
        process.exit(1);
    }
} else {
    for (const path of extra) await rm(join(ROOT, path));
    for (const [path, data] of out) {
        if (await same(path, data)) continue;
        await mkdir(join(ROOT, dirname(path)), { recursive: true });
        await writeFile(join(ROOT, path), data);
    }
    console.log(`Wrote ${out.size} files`);
}
