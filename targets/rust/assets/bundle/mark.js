modules["mark.js"] = (() => {
// <stemma-mark>: the Stemma symbol, still or live.
//
//     <stemma-mark></stemma-mark>
//     <stemma-mark animated mode="both" appearance="dark"></stemma-mark>
//
// `appearance` is `dark` (for dark surfaces), `light`, `mono` (in the
// colour of the text) or `auto`, the default, which follows the page.
// The element is as wide as its `width` in CSS, 4em by default.
//
// With `animated`, the symbol for dark surfaces comes alive in WebGL: a
// breathing glow (`mode="pulse"`), a sheen crossing it (`sheen`), or both
// (`both`, the default), at `intensity` and `speed` (1 by default). It
// stays the still SVG on light surfaces, in one colour, with reduced
// motion, without WebGL, and while the page is hidden it pauses.
//
// `label` names it for assistive technology ("Stemma").

const { define, onAppearanceChange, onReducedMotionChange, reducedMotion } = modules["internal.js"];
const { liveMark, stillMarks } = modules["mark-data.js"];
const [VX, VY, VW, VH] = liveMark.view;
// Room around the symbol for the glow, in the master's units.
const MARGIN = 56;
const FRAME = [VX - MARGIN, VY - MARGIN, VW + 2 * MARGIN, VH + 2 * MARGIN];
const CENTRE = [286, 216];
const MODES = { pulse: 0, sheen: 1, both: 2 };

const VS = "attribute vec2 pos; void main(){ gl_Position = vec4(pos, 0.0, 1.0); }";

// The smooth colour field of one face: its grid of colour cells blended by
// a Gaussian, clipped by the face's outline.
const FS_FIELD = `
precision highp float;
uniform vec2 uView; uniform sampler2D uCells; uniform vec2 uN; uniform vec2 uOrig; uniform float uH, uS; uniform sampler2D uMask;
uniform vec4 uFrame;
float erf_(float x){ float s = sign(x); x = abs(x); float t = 1.0/(1.0 + 0.3275911*x);
  float y = 1.0 - (((((1.061405429*t - 1.453152027)*t) + 1.421413741)*t - 0.284496736)*t + 0.254829592)*t*exp(-x*x); return s*y; }
void main(){
  vec2 uvm = vec2(gl_FragCoord.x/uView.x, 1.0 - gl_FragCoord.y/uView.y);
  float m = texture2D(uMask, uvm).a; if (m <= 0.0) discard;
  vec2 p = uFrame.xy + uvm*uFrame.zw; float k = 1.0/(uS*1.41421356); vec2 ij = floor((p - uOrig)/uH);
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int dj = -3; dj <= 3; dj++) { for (int di = -3; di <= 3; di++) {
    vec2 c = ij + vec2(float(di), float(dj));
    if (c.x < 0.0 || c.y < 0.0 || c.x >= uN.x || c.y >= uN.y) continue;
    vec2 lo = uOrig + c*uH;
    float bx = 0.5*(erf_((lo.x + uH - p.x)*k) - erf_((lo.x - p.x)*k));
    float by = 0.5*(erf_((lo.y + uH - p.y)*k) - erf_((lo.y - p.y)*k));
    float w = bx*by; acc += w*texture2D(uCells, (c + 0.5)/uN).rgb; wsum += w; } }
  gl_FragColor = vec4(acc/max(wsum, 1e-6)*m, m);
}`;

const FS_DOT = `
precision highp float;
uniform vec2 uView; uniform vec3 uDot; uniform vec3 uDotCol; uniform vec4 uFrame;
void main(){ vec2 p = uFrame.xy + vec2(gl_FragCoord.x/uView.x, 1.0 - gl_FragCoord.y/uView.y)*uFrame.zw; float px = uFrame.z/uView.x;
  float a = clamp(0.5 - (length(p - uDot.xy) - uDot.z)/px, 0.0, 1.0); gl_FragColor = vec4(uDotCol*a, a); }`;

const FS_BLUR = `
precision highp float;
uniform sampler2D uSrc; uniform vec2 uView; uniform vec2 uDir; uniform float uSigma;
void main(){ vec2 uv = gl_FragCoord.xy/uView; vec4 acc = vec4(0.0); float ws = 0.0;
  for (int i = -48; i <= 48; i++) { float x = float(i); if (abs(x) > 3.0*uSigma + 1.0) continue;
    float w = exp(-0.5*x*x/(uSigma*uSigma)); acc += w*texture2D(uSrc, uv + uDir*x/uView); ws += w; }
  gl_FragColor = acc/ws; }`;

// The mark, its breathing halo and the sheen, as premultiplied alpha over
// no background.
const FS_MAIN = `
precision highp float;
uniform vec2 uRes; uniform float uTime, uIntensity, uMode;
uniform sampler2D uLogo, uB0, uB1, uB2; uniform vec3 uK; uniform vec3 uDot; uniform vec4 uFrame; uniform vec2 uCentre;
float luma(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
void main(){
  vec2 uvT = gl_FragCoord.xy/uRes; vec2 p = uFrame.xy + vec2(uvT.x, 1.0 - uvT.y)*uFrame.zw;
  float t = uTime, I = uIntensity; int mode = int(uMode + 0.5);
  bool pulseOn = (mode == 0 || mode == 2), sheenOn = (mode == 1 || mode == 2);
  float breath = pulseOn ? 0.5 - 0.5*cos(t*1.7) : 0.3;
  vec4 logo = texture2D(uLogo, uvT);
  vec3 glow = (uK.x*texture2D(uB0, uvT).rgb + uK.y*texture2D(uB1, uvT).rgb)*(1.0 + 2.2*breath*I)
            + uK.z*texture2D(uB2, uvT).rgb*(1.0 + 2.6*breath*I);
  vec3 mark = logo.rgb*(1.0 + 0.10*breath*I);
  if (sheenOn) {
    float ph = fract(t/4.6); vec2 dir = normalize(vec2(1.0, -0.62));
    float x = dot(p - uCentre, dir) - mix(-230.0, 230.0, ph);
    float s = exp(-x*x/(2.0*18.0*18.0))*smoothstep(0.0, 0.1, ph)*(1.0 - smoothstep(0.9, 1.0, ph));
    mark += vec3(0.80, 0.88, 1.0)*s*smoothstep(0.10, 0.75, luma(logo.rgb))*0.40*min(I, 1.6)*logo.a;
  }
  float db = pulseOn ? 0.5 - 0.5*cos(t*1.7 - 0.9) : 0.3;
  float dD = length(p - uDot.xy) - uDot.z;
  glow += vec3(0.30, 0.55, 1.0)*exp(-max(dD, 0.0)/(3.0 + 7.0*db))*0.30*db*I*step(0.0, dD);
  vec2 q = p - uFrame.xy;
  float edge = smoothstep(0.0, 24.0, q.x)*smoothstep(0.0, 24.0, uFrame.z - q.x)*smoothstep(0.0, 24.0, q.y)*smoothstep(0.0, 24.0, uFrame.w - q.y);
  float gA = clamp(max(glow.r, max(glow.g, glow.b)), 0.0, 1.0);
  float a = (logo.a + (1.0 - logo.a)*gA)*edge;
  vec3 rgb = (mark + glow*(1.0 - logo.a))*edge;
  gl_FragColor = vec4(min(rgb, vec3(a)), a);
}`;

/** The live mark drawn on `canvas`; null where WebGL is not available. */
function live(canvas) {
    const gl = canvas.getContext("webgl", {
        antialias: false,
        alpha: true,
        premultipliedAlpha: true,
    });
    if (!gl) return null;
    const program = (fs) => {
        const make = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
                throw new Error(gl.getShaderInfoLog(shader));
            return shader;
        };
        const p = gl.createProgram();
        gl.attachShader(p, make(gl.VERTEX_SHADER, VS));
        gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
        gl.bindAttribLocation(p, 0, "pos");
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        const u = {};
        const count = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < count; i++) {
            const info = gl.getActiveUniform(p, i);
            u[info.name] = gl.getUniformLocation(p, info.name);
        }
        return { p, u };
    };
    let P;
    try {
        P = {
            field: program(FS_FIELD),
            dot: program(FS_DOT),
            blur: program(FS_BLUR),
            main: program(FS_MAIN),
        };
    } catch {
        return null;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const texture = (filter) => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return t;
    };
    const target = (w, h) => {
        const t = texture(gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        const fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
        return { t, fb, w, h };
    };
    const free = (tg) => {
        if (!tg) return;
        gl.deleteTexture(tg.t);
        gl.deleteFramebuffer(tg.fb);
    };
    const quad = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const frame = (u) => gl.uniform4f(u.uFrame, ...FRAME);

    const faces = liveMark.faces.map((face) => {
        const raw = atob(face.cells);
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
        const cellTexture = texture(gl.NEAREST);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            face.nx,
            face.ny,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            bytes,
        );
        return { ...face, cellTexture, path: new Path2D(face.d) };
    });
    const maskTexture = texture(gl.NEAREST);
    const maskCanvas = document.createElement("canvas");

    const renderMark = (tg) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, tg.fb);
        gl.viewport(0, 0, tg.w, tg.h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        maskCanvas.width = tg.w;
        maskCanvas.height = tg.h;
        const context = maskCanvas.getContext("2d");
        const sx = tg.w / FRAME[2];
        const sy = tg.h / FRAME[3];
        const u = P.field.u;
        gl.useProgram(P.field.p);
        gl.uniform2f(u.uView, tg.w, tg.h);
        frame(u);
        for (const face of faces) {
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.clearRect(0, 0, tg.w, tg.h);
            context.setTransform(sx, 0, 0, sy, -FRAME[0] * sx, -FRAME[1] * sy);
            context.fillStyle = "#fff";
            context.fill(face.path);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, face.cellTexture);
            gl.uniform1i(u.uCells, 0);
            gl.uniform1i(u.uMask, 1);
            gl.uniform2f(u.uN, face.nx, face.ny);
            gl.uniform2f(u.uOrig, face.x0, face.y0);
            gl.uniform1f(u.uH, face.h);
            gl.uniform1f(u.uS, face.s);
            quad();
        }
        gl.useProgram(P.dot.p);
        gl.uniform2f(P.dot.u.uView, tg.w, tg.h);
        frame(P.dot.u);
        gl.uniform3f(P.dot.u.uDot, ...liveMark.dot);
        gl.uniform3f(P.dot.u.uDotCol, ...liveMark.dotColor);
        quad();
        gl.disable(gl.BLEND);
    };
    const blur = (src, tmp, dst, sigma) => {
        const u = P.blur.u;
        gl.useProgram(P.blur.p);
        gl.uniform1f(u.uSigma, (sigma * src.w) / FRAME[2]);
        gl.uniform1i(u.uSrc, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, tmp.fb);
        gl.viewport(0, 0, tmp.w, tmp.h);
        gl.bindTexture(gl.TEXTURE_2D, src.t);
        gl.uniform2f(u.uView, tmp.w, tmp.h);
        gl.uniform2f(u.uDir, 1, 0);
        quad();
        gl.bindFramebuffer(gl.FRAMEBUFFER, dst.fb);
        gl.viewport(0, 0, dst.w, dst.h);
        gl.bindTexture(gl.TEXTURE_2D, tmp.t);
        gl.uniform2f(u.uView, dst.w, dst.h);
        gl.uniform2f(u.uDir, 0, 1);
        quad();
    };

    let T = {};
    let ready = false;
    const W = Math.round(FRAME[2]);
    const H = Math.round(FRAME[3]);
    return {
        rebuild() {
            const ratio = Math.min(devicePixelRatio || 1, 2);
            const w = Math.round(canvas.clientWidth * ratio);
            const h = Math.round(canvas.clientHeight * ratio);
            if (w < 2 || h < 2) return false;
            for (const tg of Object.values(T)) free(tg);
            T = {
                logo: target(w, h),
                small: target(W, H),
                tmp: target(W, H),
                b0: target(W, H),
                b1: target(W, H),
                tiny: target(W >> 1, H >> 1),
                tmp2: target(W >> 1, H >> 1),
                b2: target(W >> 1, H >> 1),
            };
            renderMark(T.logo);
            renderMark(T.small);
            renderMark(T.tiny);
            blur(T.small, T.tmp, T.b0, liveMark.sigma[0]);
            blur(T.small, T.tmp, T.b1, liveMark.sigma[1]);
            blur(T.tiny, T.tmp2, T.b2, liveMark.sigma[2]);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            canvas.width = w;
            canvas.height = h;
            ready = true;
            return true;
        },
        draw(time, mode, intensity) {
            if (!ready) return;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            const m = P.main;
            gl.useProgram(m.p);
            [T.logo, T.b0, T.b1, T.b2].forEach((tg, i) => {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, tg.t);
            });
            gl.uniform1i(m.u.uLogo, 0);
            gl.uniform1i(m.u.uB0, 1);
            gl.uniform1i(m.u.uB1, 2);
            gl.uniform1i(m.u.uB2, 3);
            gl.uniform3f(m.u.uK, ...liveMark.weights);
            gl.uniform3f(m.u.uDot, ...liveMark.dot);
            frame(m.u);
            gl.uniform2f(m.u.uCentre, ...CENTRE);
            gl.uniform2f(m.u.uRes, canvas.width, canvas.height);
            gl.uniform1f(m.u.uTime, time);
            gl.uniform1f(m.u.uIntensity, intensity);
            gl.uniform1f(m.u.uMode, mode);
            quad();
        },
        destroy() {
            for (const tg of Object.values(T)) free(tg);
            T = {};
        },
    };
}

class StemmaMark extends HTMLElement {
    static observedAttributes = ["animated", "appearance", "label"];

    #canvas = null;
    #live = null;
    #frame = 0;
    #last = 0;
    #time = 0;
    #cleanup = [];

    connectedCallback() {
        this.setAttribute("role", "img");
        this.#render();
        this.#cleanup = [
            onAppearanceChange(() => this.#render()),
            onReducedMotionChange(() => this.#render()),
        ];
        const visibility = () => this.#loop();
        document.addEventListener("visibilitychange", visibility);
        this.#cleanup.push(() => document.removeEventListener("visibilitychange", visibility));
    }

    disconnectedCallback() {
        for (const stop of this.#cleanup) stop();
        this.#cleanup = [];
        this.#stop();
    }

    attributeChangedCallback() {
        if (this.isConnected) this.#render();
    }

    /** The appearance drawn: `dark`, `light` or `mono`. */
    get resolvedAppearance() {
        const asked = this.getAttribute("appearance") ?? "auto";
        if (asked === "dark" || asked === "light" || asked === "mono") return asked;
        const root = document.documentElement.dataset.theme;
        if (root === "dark" || root === "light") return root;
        return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    #render() {
        this.setAttribute("aria-label", this.getAttribute("label") || "Stemma");
        const appearance = this.resolvedAppearance;
        const key = { dark: "on-dark", light: "on-light", mono: "mono" }[appearance];
        let still = this.querySelector(":scope > svg");
        if (!still || still.dataset.appearance !== key) {
            const holder = document.createElement("template");
            holder.innerHTML = stillMarks[key];
            const fresh = holder.content.firstElementChild;
            fresh.dataset.appearance = key;
            fresh.setAttribute("aria-hidden", "true");
            fresh.querySelector("title")?.remove();
            if (still) still.replaceWith(fresh);
            else this.prepend(fresh);
            still = fresh;
        }
        const wantsLive =
            this.hasAttribute("animated") && appearance === "dark" && !reducedMotion();
        if (wantsLive && !this.#live) this.#start(still);
        else if (!wantsLive && this.#live) this.#stop();
    }

    #start(still) {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("aria-hidden", "true");
        // The canvas reaches past the symbol, for the glow.
        Object.assign(canvas.style, {
            left: `${(-MARGIN / VW) * 100}%`,
            top: `${(-MARGIN / VH) * 100}%`,
            width: `${(FRAME[2] / VW) * 100}%`,
            height: `${(FRAME[3] / VH) * 100}%`,
        });
        this.append(canvas);
        const drawing = live(canvas);
        if (!drawing) {
            canvas.remove();
            return;
        }
        this.#canvas = canvas;
        this.#live = drawing;
        const resize = new ResizeObserver(() => {
            if (drawing.rebuild()) {
                still.style.visibility = "hidden";
                this.#draw();
            }
        });
        resize.observe(canvas);
        this.#cleanupLive = () => {
            resize.disconnect();
            still.style.visibility = "";
        };
        this.#loop();
    }

    #cleanupLive = () => {};

    #stop() {
        cancelAnimationFrame(this.#frame);
        this.#frame = 0;
        this.#cleanupLive();
        this.#cleanupLive = () => {};
        this.#live?.destroy();
        this.#live = null;
        this.#canvas?.remove();
        this.#canvas = null;
    }

    #draw() {
        const mode = MODES[this.getAttribute("mode")] ?? MODES.both;
        const intensity = parseFloat(this.getAttribute("intensity") ?? "1") || 1;
        this.#live?.draw(this.#time, mode, intensity);
    }

    #loop() {
        if (!this.#live || this.#frame) return;
        this.#last = performance.now();
        const tick = (now) => {
            this.#frame = 0;
            if (!this.#live || document.hidden) return;
            const speed = parseFloat(this.getAttribute("speed") ?? "1") || 1;
            this.#time += Math.min((now - this.#last) / 1000, 0.1) * speed;
            this.#last = now;
            this.#draw();
            this.#frame = requestAnimationFrame(tick);
        };
        this.#frame = requestAnimationFrame(tick);
    }
}

define("stemma-mark", StemmaMark);

return { StemmaMark };
})();