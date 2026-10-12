// <stemma-light>: the brand light. A dome of dark with the light rising
// under it, mist and grain, drawn with WebGL.
//
//     <stemma-light preset="hero"></stemma-light>
//     <stemma-light preset="still"></stemma-light>
//
// Presets: `hero` moves, for a page that opens on the light; `still` is
// one quiet frame with no motion, for side menus and panels.
//
// `progress`, from 0 to 1, withdraws the light towards `edge` (`top`,
// `bottom`, `left` or `right`; `bottom` by default), leaving the page's own
// surface behind. Set it directly, or call `withdraw()` and `restore()`,
// which move it over `--dur-long` along `--ease-in-out`.
//
// Its colours are the tokens', read again whenever the appearance changes.
// It pauses while the page is hidden or it is out of view. With reduced
// motion it draws still frames, and `withdraw()` takes `--dur-ui`.
// Without WebGL it shows the `.brand-light` class instead: the brand
// gradient and grain, which fade as `progress` grows. Pages without script
// can use that class directly.

import {
    define,
    durationToken,
    easingToken,
    onAppearanceChange,
    onReducedMotionChange,
    reducedMotion,
    tokenColor,
} from "./internal.js";

const PRESETS = {
    hero: { int: 0.95, size: 1.5, cy: -0.08, haze: 1, grain: 1, speed: 0.35, wob: 1, rim: 1 },
    still: { int: 0.62, size: 1.75, cy: -0.1, haze: 0.8, grain: 0.7, speed: 0, wob: 0.6, rim: 0.6 },
};

const EDGES = { top: 0, bottom: 1, left: 2, right: 3 };

// The colours the light is made of, from darkest to brightest, then the
// halo and rim where it withdraws, then the page it leaves behind.
const COLOURS = {
    uTop: "var(--navy-950)",
    uMid: "var(--navy-800)",
    uStep1: "var(--blue-600)",
    uStep2: "var(--blue-400)",
    uStep3: "var(--sky-200)",
    uStep4: "var(--ice-50)",
    uHalo: "var(--sky-200)",
    uRimColour: "var(--ice-100)",
    uPaper: "var(--surface-page)",
    uTint: "color-mix(in srgb, var(--accent) var(--mix-soft), var(--surface-page))",
};

const FRAGMENT = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uSeed, uInt, uSize, uCY, uHaze, uGrain, uProg, uWob, uRim;
uniform int uEdge;
uniform vec3 uTop, uMid, uStep1, uStep2, uStep3, uStep4, uHalo, uRimColour, uPaper, uTint;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; mat2 m=mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<5;i++){ v+=a*vnoise(p); p=m*p+3.1; a*=.5; } return v; }
void main(){
  // y runs down the page: the dome of dark above, the light below it.
  vec2 uv = vec2(gl_FragCoord.x/uRes.x, 1. - gl_FragCoord.y/uRes.y);
  float aspect = uRes.x/uRes.y;
  vec2 p = vec2((uv.x-.5)*aspect, uv.y);
  float t = uTime;
  vec2 q = p*1.8;
  vec2 w = vec2(fbm(q + vec2(0., t*.045)), fbm(q + vec2(4.7,1.3) - vec2(t*.035, 0.)));
  float n = fbm(q*1.35 + 1.7*w + vec2(t*.018, -t*.022));
  float fine = fbm(p*7.5 + 2.2*w + vec2(0., t*.05));
  float rx = max(.56*aspect, .34)*uSize, ry = .47*uSize;
  float d = length((p - vec2(0., uCY)) / vec2(rx, ry));
  d += (n-.5)*.38*uHaze + .018*sin(t*.42) + .01*sin(t*.23 + p.x*3.);
  float g = smoothstep(.8, 1.62, d);
  g *= mix(1., .72 + .56*fine, .55*min(uHaze,1.5));
  g = clamp(g*uInt, 0., 1.);
  vec3 blue = mix(uMid, uTop, smoothstep(.35, 1., 1. - uv.y));
  vec2 b = (p - vec2(0., uCY+.04))/vec2(.38,.32);
  blue += (uMid - uTop)*.6*exp(-dot(b,b));
  blue = mix(blue, uStep1, smoothstep(.00,.36,g));
  blue = mix(blue, uStep2, smoothstep(.30,.64,g));
  blue = mix(blue, uStep3, smoothstep(.58,.86,g));
  blue = mix(blue, uStep4, smoothstep(.82,1.0,g));
  vec2 a = vec2(-.5*aspect - .15, -.2);
  float tint = exp(-pow(length(p - a)/1.05, 2.));
  vec3 L = mix(uPaper, uTint, .8*tint);
  // Distance from the edge the light withdraws towards, and across it.
  float along, across, span;
  if (uEdge == 0) { along = uv.y; across = p.x; span = .5*aspect; }
  else if (uEdge == 1) { along = 1. - uv.y; across = p.x; span = .5*aspect; }
  else if (uEdge == 2) { along = uv.x; across = uv.y - .5; span = .5; }
  else { along = 1. - uv.x; across = uv.y - .5; span = .5; }
  float pr = uProg, bell = sin(3.14159*pr);
  float wob = fbm(vec2(across*2.4, along*1.6 - t*.35) + 1.2*w + vec2(t*.25, 0.));
  float lobes = fbm(vec2(across*1.1 - t*.15, t*.12 + pr*1.5));
  float bx = across/(span + .001); float bow = bx*bx;
  float edge = along + ((wob-.5)*.5 + (lobes-.5)*.7 + .12*bow)*bell*uWob;
  float R = mix(1.02, -.4, pr);
  float soft = mix(.02, .2, pr*pr);
  float m = 1. - smoothstep(R - soft, R + soft, edge);
  float halo = exp(-max(edge - R, 0.)/.17) * (1.-m) * bell;
  vec3 Lh = mix(L, uHalo, .5*halo*uRim);
  float rim = exp(-max(R - edge, 0.)/.045) * m * bell;
  vec3 Bc = mix(blue, uRimColour, .65*rim*uRim);
  vec3 col = mix(Lh, Bc, m);
  float gr = hash(gl_FragCoord.xy + uSeed*vec2(113.1, 71.7)) - .5;
  col += gr*uGrain*mix(.012, .03 + .075*g, m);
  gl_FragColor = vec4(col, 1.);
}`;

/** The light drawn on `canvas`; null where WebGL is not available. */
function drawing(canvas) {
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) return null;
    const shader = (type, source) => {
        const made = gl.createShader(type);
        gl.shaderSource(made, source);
        gl.compileShader(made);
        return gl.getShaderParameter(made, gl.COMPILE_STATUS) ? made : null;
    };
    const vertex = shader(
        gl.VERTEX_SHADER,
        "attribute vec2 a; void main(){ gl_Position = vec4(a,0.,1.); }",
    );
    const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const at = gl.getAttribLocation(program, "a");
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name) => gl.getUniformLocation(program, name);

    // Resolution drops while frames run slow, down to half.
    let quality = 1;
    let spent = 0;
    let frames = 0;
    let time = 7;
    let seed = 0;
    let grain = 0;
    let colours = {};

    return {
        recolour(element) {
            colours = Object.fromEntries(
                Object.entries(COLOURS).map(([name, css]) => [name, tokenColor(css, element)]),
            );
        },
        draw(settings, progress, edge) {
            const ratio = Math.min(devicePixelRatio || 1, 1.5) * quality;
            const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
            const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
                gl.viewport(0, 0, width, height);
            }
            gl.uniform2f(uniform("uRes"), width, height);
            gl.uniform1f(uniform("uTime"), time);
            gl.uniform1f(uniform("uSeed"), seed);
            for (const [name, key] of [
                ["uInt", "int"],
                ["uSize", "size"],
                ["uCY", "cy"],
                ["uHaze", "haze"],
                ["uGrain", "grain"],
                ["uWob", "wob"],
                ["uRim", "rim"],
            ]) {
                gl.uniform1f(uniform(name), settings[key]);
            }
            gl.uniform1f(uniform("uProg"), progress);
            gl.uniform1i(uniform("uEdge"), edge);
            for (const [name, value] of Object.entries(colours))
                gl.uniform3f(uniform(name), ...value);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        },
        advance(settings, seconds, moving) {
            spent += seconds;
            frames += 1;
            if (frames >= 30) {
                if (spent / frames > 0.022 && quality > 0.5) quality *= 0.8;
                spent = 0;
                frames = 0;
            }
            time += seconds * (settings.speed + (moving ? 0.6 : 0));
            grain += seconds;
            if (settings.speed > 0 && grain > 1 / 18) {
                seed = (seed + 1) % 97;
                grain = 0;
            }
        },
    };
}

export class StemmaLight extends HTMLElement {
    static observedAttributes = ["preset", "progress", "edge"];

    #canvas = null;
    #drawing = null;
    #progress = 0;
    #frame = 0;
    #last = 0;
    #visible = true;
    #transition = null;
    #cleanup = [];

    connectedCallback() {
        this.classList.add("brand-light");
        this.setAttribute("aria-hidden", "true");
        this.#progress = this.#attributeProgress();
        this.#updateFallback();
        if (!this.#canvas) {
            this.#canvas = document.createElement("canvas");
            this.#drawing = drawing(this.#canvas);
            if (!this.#drawing) {
                this.#canvas = null;
                return;
            }
            this.append(this.#canvas);
        }
        this.#drawing.recolour(this);
        const resize = new ResizeObserver(() => this.#request());
        resize.observe(this);
        const view = new IntersectionObserver(([entry]) => {
            this.#visible = entry.isIntersecting;
            this.#request();
        });
        view.observe(this);
        const visibility = () => this.#request();
        document.addEventListener("visibilitychange", visibility);
        this.#cleanup = [
            () => resize.disconnect(),
            () => view.disconnect(),
            () => document.removeEventListener("visibilitychange", visibility),
            onAppearanceChange(() => {
                // Custom properties settle after the attribute changes.
                requestAnimationFrame(() => {
                    this.#drawing.recolour(this);
                    this.#request();
                });
            }),
            onReducedMotionChange(() => this.#request()),
        ];
        this.dataset.drawn = "";
        this.#request();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
        for (const stop of this.#cleanup) stop();
        this.#cleanup = [];
    }

    attributeChangedCallback(name) {
        if (name === "progress") {
            this.#progress = this.#attributeProgress();
            this.#updateFallback();
        }
        this.#request();
    }

    /** How far the light has withdrawn, from 0 to 1. */
    get progress() {
        return this.#progress;
    }

    set progress(value) {
        this.#progress = Math.min(Math.max(Number(value) || 0, 0), 1);
        this.#updateFallback();
        this.#request();
    }

    /** Withdraws the light towards its edge; resolves when it is gone. */
    withdraw() {
        return this.#animate(1);
    }

    /** Brings the light back; resolves when it is whole. */
    restore() {
        return this.#animate(0);
    }

    get #settings() {
        return PRESETS[this.getAttribute("preset")] ?? PRESETS.hero;
    }

    get #moves() {
        return this.#settings.speed > 0 && !reducedMotion();
    }

    #attributeProgress() {
        const value = parseFloat(this.getAttribute("progress") ?? "0");
        return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1) : 0;
    }

    #updateFallback() {
        this.style.setProperty("--light-progress", String(this.#progress));
    }

    #animate(to) {
        const from = this.#progress;
        const duration = reducedMotion()
            ? durationToken("--dur-ui", 180)
            : durationToken("--dur-long", 1600);
        const ease = easingToken("--ease-in-out");
        return new Promise((resolve) => {
            this.#transition?.resolve();
            this.#transition = { start: performance.now(), from, to, duration, ease, resolve };
            this.#request();
        });
    }

    #request() {
        if (!this.#drawing || this.#frame) return;
        this.#last = performance.now();
        this.#frame = requestAnimationFrame((now) => this.#tick(now));
    }

    #tick(now) {
        this.#frame = 0;
        if (!this.isConnected || document.hidden || !this.#visible) return;
        const seconds = Math.min((now - this.#last) / 1000, 0.1);
        this.#last = now;
        let moving = false;
        const transition = this.#transition;
        if (transition) {
            const t = Math.min((now - transition.start) / transition.duration, 1);
            this.#progress =
                transition.from + (transition.to - transition.from) * transition.ease(t);
            this.#updateFallback();
            moving = !reducedMotion();
            if (t >= 1) {
                this.#transition = null;
                transition.resolve();
            }
        }
        const settings = this.#settings;
        const still = reducedMotion() ? { ...settings, wob: 0, speed: 0 } : settings;
        if (this.#moves || moving) this.#drawing.advance(still, seconds, moving);
        this.#drawing.draw(still, this.#progress, EDGES[this.getAttribute("edge")] ?? EDGES.bottom);
        if (this.#moves || this.#transition) this.#request();
    }
}

define("stemma-light", StemmaLight);
