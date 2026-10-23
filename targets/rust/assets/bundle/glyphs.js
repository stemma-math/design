modules["glyphs.js"] = (() => {
// Generated from source/glyphs by tools/glyphs.py. Do not edit.

/** Each glyph's inner SVG markup, on a 24-unit box. */
const glyphs = {
    "add-person": "<circle cx=\"10\" cy=\"8\" r=\"4\"/><path d=\"M3 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5M19 8v6M16 11h6\"/>",
    "add": "<path d=\"M12 5v14M5 12h14\"/>",
    "alert": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7.5v5.5M12 16.5v.5\"/>",
    "anvil": "<path d=\"M8 5h14v4h-2c-2 0-4 2-4 5v3l2 2v1h-7v-1l2-2v-3c0-2-1-3-3-3H8C5 11 3 10 2 8l6-1Z\"/>",
    "appearance": "<path d=\"M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z\"/>",
    "arrow-left": "<path d=\"M19 12H5M11 6l-6 6 6 6\"/>",
    "arrow-right": "<path d=\"M5 12h14M13 6l6 6-6 6\"/>",
    "arrow-up-right": "<path d=\"m6 18 12-12M8 6h10v10\"/>",
    "attach": "<path d=\"M9.5 7.5V15a2 2 0 0 0 4 0V6.75a3.75 3.75 0 0 0-7.5 0v8.75a5.5 5.5 0 0 0 11 0V8\"/>",
    "bell": "<path d=\"M6 10a6 6 0 0 1 12 0c0 4.5 1.5 6 2 7H4c.5-1 2-2.5 2-7\"/><path d=\"M10 20a2 2 0 0 0 4 0\"/>",
    "blocks": "<rect x=\"4\" y=\"4\" width=\"16\" height=\"6\" rx=\"1.5\"/><rect x=\"4\" y=\"14\" width=\"16\" height=\"6\" rx=\"1.5\"/>",
    "book": "<path d=\"M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z\"/><path d=\"M5 17a3 3 0 0 1 3-3h11\"/>",
    "check": "<path d=\"m5 12 5 5 9-10\"/>",
    "chevron-down": "<path d=\"m7 10 5 5 5-5\"/>",
    "chevron-right": "<path d=\"m9 6 6 6-6 6\"/>",
    "chevron-up-down": "<path d=\"m8 9 4-4 4 4M8 15l4 4 4-4\"/>",
    "close": "<path d=\"M6 6l12 12M18 6 6 18\"/>",
    "copy": "<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"2\"/><path d=\"M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2\"/>",
    "document": "<path d=\"M7 3h7l5 5v13H7z\"/><path d=\"M14 3v5h5\"/>",
    "done": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12.5 2.8 2.8L16.2 9.5\"/>",
    "download": "<path d=\"M12 4v11M7 10l5 5 5-5M5 20h14\"/>",
    "edit": "<path d=\"M4 20h4L18.5 9.5a2.83 2.83 0 0 0-4-4L4 16v4ZM13 7l4 4\"/>",
    "grip": "<circle cx=\"9\" cy=\"6\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"6\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"9\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"9\" cy=\"18\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"18\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>",
    "group": "<circle cx=\"9\" cy=\"8\" r=\"3.5\"/><path d=\"M2.5 20c.7-3.3 3.3-5.3 6.5-5.3s5.8 2 6.5 5.3\"/><path d=\"M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.9c1.9.7 3.2 2.5 3.5 5.1\"/>",
    "home": "<path d=\"M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z\"/>",
    "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v5.5M12 7.5v.5\"/>",
    "link": "<path d=\"M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1\"/><path d=\"M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1\"/>",
    "lock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/>",
    "log-out": "<path d=\"M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3\"/><path d=\"M10 17l5-5-5-5M15 12H4\"/>",
    "machine": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>",
    "mail": "<rect x=\"3\" y=\"5\" width=\"18\" height=\"14\" rx=\"2\"/><path d=\"m4 7 8 6 8-6\"/>",
    "menu": "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
    "minus": "<path d=\"M5 12h14\"/>",
    "more": "<circle cx=\"5\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>",
    "person": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5\"/>",
    "redo": "<path d=\"m15 14 5-5-5-5\"/><path d=\"M20 9H10a6 6 0 0 0 0 12h3\"/>",
    "reply": "<path d=\"M9 17 4 12l5-5\"/><path d=\"M4 12h9a7 7 0 0 1 7 7\"/>",
    "reset": "<path d=\"M12 4a8 8 0 1 1-7.5 5.2\"/><path d=\"m16 1-4 3 4 3\"/>",
    "search": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m20 20-4.2-4.2\"/>",
    "send": "<path d=\"M21 3 3 10l7 4 4 7 7-18Z\"/><path d=\"m10 14 11-11\"/>",
    "settings": "<path d=\"M10.3 5.0 10.6 2.5 13.4 2.5 13.7 5.0 15.7 5.8 17.7 4.3 19.7 6.3 18.2 8.3 19.0 10.3 21.5 10.6 21.5 13.4 19.0 13.7 18.2 15.7 19.7 17.7 17.7 19.7 15.7 18.2 13.7 19.0 13.4 21.5 10.6 21.5 10.3 19.0 8.3 18.2 6.3 19.7 4.3 17.7 5.8 15.7 5.0 13.7 2.5 13.4 2.5 10.6 5.0 10.3 5.8 8.3 4.3 6.3 6.3 4.3 8.3 5.8Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.8\"/>",
    "shield": "<path d=\"M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z\"/>",
    "sparkle": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/>",
    "sparkles": "<path d=\"M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z\"/><path d=\"M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z\"/>",
    "star": "<path d=\"m12 4 2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z\"/>",
    "sync": "<path d=\"M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1\"/><path d=\"M17.5 3v4h-4M6.5 21v-4h4\"/>",
    "undo": "<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10a6 6 0 0 1 0 12h-3\"/>",
    "unlock": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"10\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 7.5-2\"/>",
    "warning": "<path d=\"M12 4 2.8 19.5h18.4z\"/><path d=\"M12 10v4.5M12 17v.3\"/>"
};

/** A glyph as an inline `svg.glyph`, hidden from assistive technology. */
function glyph(name, small = false) {
    const extra = small ? " glyph--small" : "";
    return `<svg class="glyph${extra}" viewBox="0 0 24 24" aria-hidden="true">${glyphs[name]}</svg>`;
}

return { glyphs, glyph };
})();