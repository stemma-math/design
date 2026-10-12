// Generates the tokens of every target from `source/tokens/`, and checks the
// contrast requirements recorded in them, in both appearances.
//
//     node scripts/tokens.mjs          write the generated files
//     node scripts/tokens.mjs --check  fail if any differs from what would be written
//
// Either way, it fails if a colour falls below its contrast requirement.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import StyleDictionary from "style-dictionary";

// Paths below are relative to the repository's root, wherever this runs from.
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const SOURCE = "source/tokens";
const BRAND = `${SOURCE}/brand.json`;
const SEMANTIC = `${SOURCE}/semantic.json`;
const DARK = `${SOURCE}/themes/dark.json`;
const DENSITY = `${SOURCE}/density.json`;

const HEADER = "Generated from source/tokens by scripts/tokens.mjs. Do not edit.";

// The first level of a path is the token's category (or, for density, the
// density), not part of its name.
const nameOf = (path) => path.slice(1).join("-");

const hooks = {
    transforms: {
        "name/stemma": { type: "name", transform: (token) => nameOf(token.path) },
    },
};

const cssTransforms = ["name/stemma", "fontFamily/css", "cubicBezier/css", "shadow/css/shorthand"];

// One dictionary per appearance. In the dark one, `themes/dark.json` comes
// last, so its values win over the semantic tier's.
const dictionary = async (sources) => {
    const sd = new StyleDictionary({
        source: sources,
        usesDtcg: true,
        log: { verbosity: "silent", warnings: "disabled" },
        hooks,
        platforms: { css: { transforms: cssTransforms } },
    });
    return sd.getPlatformTokens("css");
};

const light = await dictionary([BRAND, SEMANTIC, DENSITY]);
const dark = await dictionary([BRAND, SEMANTIC, DARK]);

const fromFile = (tokens, file) => tokens.allTokens.filter((token) => token.filePath === file);

// ── CSS ────────────────────────────────────────────────────────────────────

// A reference, as `{size.step-3}`, becomes the custom property it refers
// to, alone or inside a longer value, so the output keeps the relation and
// a value redefined for the dark appearance carries through.
const reference = /\{([^}]+)\}/g;
const cssValue = (token) => {
    const original = token.original.$value;
    return typeof original === "string" && original.match(reference)
        ? original.replace(reference, (_, path) => `var(--${nameOf(path.split("."))})`)
        : token.$value;
};

const declarations = (tokens, indent = "    ") =>
    tokens.flatMap((token) => [
        ...(token.$description ? [`${indent}/* ${token.$description} */`] : []),
        `${indent}--${token.name}: ${cssValue(token)};`,
    ]);

const density = (which) => fromFile(light, DENSITY).filter((token) => token.path[0] === which);

// The dark appearance follows the system unless the page says otherwise
// with `data-theme` on its root, which either appearance can force.
const css = [
    `/* ${HEADER} */`,
    "",
    ":root {",
    "    color-scheme: light;",
    ...declarations([...fromFile(light, BRAND), ...fromFile(light, SEMANTIC)]),
    "}",
    "",
    "@media (prefers-color-scheme: dark) {",
    '    :root:not([data-theme="light"]) {',
    "        color-scheme: dark;",
    ...declarations(fromFile(dark, DARK), "        "),
    "    }",
    "}",
    "",
    ':root[data-theme="dark"] {',
    "    color-scheme: dark;",
    ...declarations(fromFile(dark, DARK)),
    "}",
    "",
    ":root,",
    '[data-density="comfortable"] {',
    ...declarations(density("comfortable")),
    "}",
    "",
    '[data-density="compact"] {',
    ...declarations(density("compact")),
    "}",
    "",
].join("\n");

// ── Terminal ───────────────────────────────────────────────────────────────

// Truecolour values for the terminal's roles: the text colour of each
// intent, for terminals with a light background and with a dark one. Roles
// map mainly to the 16 named ANSI colours; these are for the occasional
// accent where a terminal supports more.
const ROLES = {
    accent: "accent-text",
    success: "success-text",
    warning: "warning-text",
    danger: "danger-text",
    info: "info-text",
    muted: "ink-3",
    identifier: "tone-magenta-text",
};

const palette = (tokens, appearance) => {
    const value = new Map(tokens.allTokens.map((token) => [token.name, token.$value]));
    const fields = Object.entries(ROLES).map(([role, name]) => {
        const [r, g, b] = [1, 3, 5].map((i) => `0x${value.get(name).slice(i, i + 2)}`);
        return `    ${role}: Rgb(${r}, ${g}, ${b}),`;
    });
    return [
        `/// The roles' colours for a terminal with a ${appearance} background.`,
        `pub const ${appearance.toUpperCase()}: Palette = Palette {`,
        ...fields,
        "};",
    ];
};

const rust = [
    `// ${HEADER}`,
    "",
    "use crate::{Palette, Rgb};",
    "",
    ...palette(light, "light"),
    "",
    ...palette(dark, "dark"),
    "",
].join("\n");

const outputs = [
    { destination: "targets/web/tokens.css", output: css },
    { destination: "targets/terminal/src/tokens.rs", output: rust },
];

// ── Contrast ───────────────────────────────────────────────────────────────

const rgb = (hex) => {
    const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
    if (!match) return null;
    const digits = match[1].length === 3 ? [...match[1]].map((d) => d + d).join("") : match[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16));
};

const hex = (channels) =>
    "#" + channels.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");

// `color-mix(in srgb, a p, b)`: mixed channel by channel, gamma-encoded. A
// tone over transparent, composited on a surface, gives the same colour.
const mix = (a, p, b) => hex(rgb(a).map((c, i) => c * p + rgb(b)[i] * (1 - p)));

const luminance = (hex) => {
    const [r, g, b] = rgb(hex).map((c) => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (a, b) => {
    const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (high + 0.05) / (low + 0.05);
};

// What must reach what, as [foreground, background, minimum, what], with
// the token names behind each colour so a failure says where to look.
const requirements = (tokens) => {
    const value = new Map(tokens.allTokens.map((token) => [token.name, token.$value]));
    const color = (name) => {
        const v = value.get(name);
        if (!rgb(v)) throw new Error(`${name} is ${v}, not an opaque colour to check`);
        return v;
    };
    const percent = (name) => parseFloat(value.get(name)) / 100;
    const surfaces = ["surface-card", "surface-page"];
    const pairs = [];

    for (const token of tokens.allTokens) {
        const stemma = token.$extensions?.stemma ?? {};
        for (const { on, min } of stemma.contrast ?? []) {
            for (const background of on) {
                pairs.push([
                    color(token.name),
                    color(background),
                    min,
                    `${token.name} on ${background}`,
                ]);
            }
        }
        if (stemma.tone) {
            const tone = token.name;
            const [text, on] = [`${tone}-text`, `${tone}-on`];
            const hover = mix(color(tone), percent("mix-hover"), "#000000");
            pairs.push([color(on), color(tone), 4.5, `${on} on ${tone}`]);
            pairs.push([color(on), hover, 4.5, `${on} on ${tone}, hovered`]);
            for (const surface of surfaces) {
                const soft = mix(color(tone), percent("mix-soft"), color(surface));
                pairs.push([color(tone), color(surface), 3, `${tone} on ${surface}`]);
                pairs.push([color(text), color(surface), 4.5, `${text} on ${surface}`]);
                pairs.push([
                    color(text),
                    soft,
                    4.5,
                    `${text} on ${tone}'s soft fill on ${surface}`,
                ]);
            }
        }
    }
    return pairs;
};

const failures = [];
for (const [appearance, tokens] of [
    ["light", light],
    ["dark", dark],
]) {
    for (const [fg, bg, min, what] of requirements(tokens)) {
        const r = ratio(fg, bg);
        if (r < min) failures.push(`${appearance}: ${what} is ${r.toFixed(2)}:1, under ${min}:1`);
    }
}
if (failures.length) {
    console.error(`Contrast below requirement:\n  ${failures.join("\n  ")}`);
    process.exit(1);
}

// ── Output ─────────────────────────────────────────────────────────────────

if (process.argv.includes("--check")) {
    const stale = [];
    for (const { destination, output } of outputs) {
        const current = await readFile(destination, "utf8").catch(() => null);
        if (current !== output) stale.push(destination);
    }
    if (stale.length) {
        console.error(`Out of date: ${stale.join(", ")}. Run \`just generate\`.`);
        process.exit(1);
    }
} else {
    for (const { destination, output } of outputs) {
        await writeFile(destination, output);
        console.log(`Wrote ${destination}`);
    }
}
