/* =====================================================================
   stipple.js — dot-drawing engine (ES module, no dependencies)
   ---------------------------------------------------------------------
   Draws stipple, halftone or multi-colour (pointillist) artwork into an
   SVG, using the colours of the active theme in tokens.css.

   Quick use (HTML):
     <div class="stipple" data-stipple="sphere" style="height:240px"></div>
     <script type="module">
       import { autoInit } from "./stipple.js";
       autoInit();                 // draws every [data-stipple] element
     </script>

   Programmatic use:
     import { stipple } from "./stipple.js";
     stipple(el, { preset: "galaxy", seed: 7, fill: 0.2 });
     stipple(el, { density: (x, y, w, h) => x / w });  // your own shape

   data-* attributes read by autoInit:
     data-stipple   preset name (see PRESETS below)
     data-seed      integer, same seed = same drawing      (default 1)
     data-fill      dots per px² for stipple mode          (default 0.16)
     data-mode      stipple | halftone | color             (default: theme)
     data-animate   "false" to skip the fade-in            (default true)
     data-lit       "1" light dots on dark ground          (default: theme)

   Every drawing is aria-hidden (decorative). Put meaning in real text.
   ===================================================================== */

const NS = "http://www.w3.org/2000/svg";

/* ---- helpers ------------------------------------------------------ */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
/** Lambert shading of a sphere. Returns brightness 0..1, or -1 outside. */
export function ball(x, y, cx, cy, r) {
  const nx = (x - cx) / r, ny = (y - cy) / r, q = nx * nx + ny * ny;
  if (q > 1) return -1;
  const nz = Math.sqrt(1 - q);
  return Math.max(0, -0.55 * nx - 0.6 * ny + 0.58 * nz);
}

/* ---- presets -------------------------------------------------------
   A preset is a factory: (opts) => { density(x,y,w,h) -> 0..1, pick? }.
   density = how much ink at that point. `lit` flips shading for light
   dots on a dark ground. `pick` (colour mode) returns a palette index.
   ------------------------------------------------------------------- */
export const PRESETS = {
  /** left→right grain ramp — texture strips, dividers */
  ramp: () => ({ density: (x, y, w) => Math.pow(x / w, 1.2) }),

  /** top→bottom fade — card headers, section transitions */
  fade: () => ({ density: (x, y, w, h) => Math.pow(1 - y / h, 1.3) }),

  /** soft round cloud — empty states, avatars, loaders */
  blob: () => ({
    density: (x, y, w, h) => {
      const r = Math.min(w, h) / 2;
      return 0.85 * (1 - smooth(r * 0.45, r * 0.98, Math.hypot(x - w / 2, y - h / 2)));
    },
  }),

  /** shaded sphere with cast shadow — hero, logo-mark, onboarding */
  sphere: ({ lit } = {}) => ({
    density: (x, y, w, h) => {
      const r = Math.min(w, h) * 0.4, cx = w / 2, cy = h * 0.46;
      const l = ball(x, y, cx, cy, r);
      if (l >= 0) return lit ? 0.04 + 0.95 * Math.pow(l, 0.9) : 0.03 + 0.95 * Math.pow(1 - l, 1.6);
      const sx = (x - cx) / (r * 1.05), sy = (y - (cy + r * 1.05)) / (r * 0.14), e = sx * sx + sy * sy;
      return e < 1 ? (lit ? 0.12 : 0.55) * (1 - e) : 0;
    },
  }),

  /** ringed planet — best in halftone mode */
  planet: ({ lit = true } = {}) => ({
    density: (x0, y0, w, h) => {
      const x = (x0 / w) * 420, y = (y0 / h) * 300;
      const dx = x - 210, dy = y - 150, c = Math.cos(0.22), s = Math.sin(0.22);
      const px = dx * c + dy * s, py = -dx * s + dy * c;
      const t = (px * px) / (185 * 185) + (py * py) / (38 * 38);
      const inRing = t > 0.6 && t < 1;
      const ring = 0.32 + 0.28 * Math.sin(t * 30) + 0.25 * (px < 0 ? 1 : 0.4);
      if (inRing && py > 0) return ring;
      const l = ball(x, y, 210, 150, 100);
      if (l >= 0) return lit ? 0.04 + 0.95 * Math.pow(l, 0.9) : 0.04 + 0.95 * Math.pow(1 - l, 1.4);
      return inRing ? ring * 0.8 : 0;
    },
  }),

  /** drifting smoke swirl — dark heroes, backgrounds behind NO text */
  smoke: () => ({
    density: (x, y, w, h) => {
      const u = x / w, v = y / h, dx = (u - 0.55) * 1.1, dy = v - 0.5;
      const rad = Math.sqrt(dx * dx + dy * dy), th = Math.atan2(dy, dx);
      const warp = Math.sin(u * 8 + 2 * Math.sin(v * 6)) * Math.cos(v * 7 + 1.5 * Math.sin(u * 5));
      const val = 0.5 + 0.38 * Math.sin(th * 2 - rad * 17 + warp * 1.5) + 0.22 * warp;
      const base = smooth(0.4, 0.98, val) * 0.85;
      const rim = 0.55 * Math.exp(-((val - 0.62) ** 2) / 0.003);
      return Math.max(base, rim) * (1 - smooth(0.3, 0.62, rad)) + 0.012;
    },
  }),

  /** layered hills + sun + road — wide banners (≈ 3:1) */
  landscape: () => {
    const L = [
      { b: 205, a: 20, f: 0.006, p: 1.2, t: 0.18 },
      { b: 245, a: 28, f: 0.0045, p: 3.1, t: 0.34 },
      { b: 286, a: 24, f: 0.008, p: 0.4, t: 0.55 },
      { b: 330, a: 16, f: 0.005, p: 2.2, t: 0.8 },
    ];
    const ridge = (l, x) => l.b + l.a * Math.sin(l.f * x + l.p) + l.a * 0.4 * Math.sin(l.f * 2.7 * x + l.p * 1.7);
    const r0 = ridge(L[3], 560);
    return {
      density: (x0, y0, w, h) => {
        const x = (x0 / w) * 1072, y = (y0 / h) * 372;
        for (let k = 3; k >= 0; k--) {
          const r = ridge(L[k], x);
          if (y > r) {
            const e = y - r;
            if (e < 2.2) return 0.95;
            if (k === 3 && y > r0) {
              const ey = y - r0, cx = 560 - ey * 1.4, half = 1 + ey * 0.9, d = Math.abs(x - cx);
              if (d < half) return d > half - 1.6 ? 0.85 : 0.04;
            }
            return L[k].t * (0.78 + 0.22 * smooth(0, 70, e));
          }
        }
        const ds = Math.hypot(x - 720, y - 140), sr = 56;
        if (ds < sr) return ds > sr - 2.2 ? 0.9 : 0.02;
        const sky = 0.06 + 0.34 * Math.pow(Math.max(0, 1 - y / 220), 1.4);
        return sky * (0.2 + 0.8 * smooth(sr, sr * 3.4, ds));
      },
    };
  },

  /** tilted spiral galaxy — riso heroes, "space" sections */
  galaxy: () => ({
    density: (x0, y0, w, h) => {
      const x = (x0 / w) * 440, y = (y0 / h) * 440;
      const dx = (x - 225) / 215, dy = ((y - 210) / 215) * 1.7, rad = Math.sqrt(dx * dx + dy * dy);
      if (rad > 1) return 0;
      const arm = Math.cos(2 * (Math.atan2(dy, dx) - 3.2 * Math.log(rad + 0.05)));
      const body = (0.1 + 0.62 * smooth(0.15, 1, arm)) * Math.exp(-rad * 2.4) * (1 - smooth(0.72, 1, rad));
      return Math.min(1, Math.exp(-rad * 9) * 1.2 + body);
    },
  }),

  /** gradient disc — overprint layer, avatars, badges */
  disc: () => ({
    density: (x, y, w, h) => {
      const r = Math.min(w, h) * 0.46;
      if (Math.hypot(x - w / 2, y - h / 2) > r) return 0;
      return 0.22 + 0.6 * Math.max(0, Math.min(1, (x + y) / (w + h)));
    },
  }),

  /** pointillist lake scene in a soft circle — needs colour mode, 5 colours */
  garden: () => ({
    density: (x0, y0, w, h) => {
      const x = (x0 / w) * 470, y = (y0 / h) * 470;
      return 0.88 * (1 - smooth(160, 228, Math.hypot(x - 235, y - 235)));
    },
    // palette order: 0 blue, 1 lilac, 2 mint, 3 peach, 4 butter
    pick: (x0, y0, w, h, R) => {
      const x = (x0 / w) * 470, y = (y0 / h) * 470, r = R();
      const sund = Math.hypot(x - 300, y - 165);
      if (sund < 46) return r < 0.6 ? 4 : r < 0.9 ? 3 : 1;
      const hill = 248 + 26 * Math.sin(x * 0.022 + 0.8) + 10 * Math.sin(x * 0.061), W = 312;
      if (y < hill) {
        const t = Math.max(0, y / hill);
        if (r < 0.6 * t * t) return sund < 130 ? 4 : 3;
        return R() < 0.6 ? 0 : 1;
      }
      if (y < W) return r < 0.55 ? 2 : r < 0.85 ? 0 : 4;
      if (Math.abs(x - 300) < 44 - (y - W) * 0.18 && Math.sin(y * 0.45) > -0.2) return r < 0.5 ? 4 : r < 0.82 ? 3 : 0;
      return r < 0.55 ? 0 : r < 0.85 ? 1 : 2;
    },
  }),
};

/* ---- theme reading ------------------------------------------------- */
function cssVar(el, name) {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
function cssList(el, name) {
  return cssVar(el, name).split(",").map((s) => s.trim()).filter(Boolean);
}

/* ---- core ----------------------------------------------------------
   stipple(target, opts) → { svg, redraw(newOpts) }
   target: an <svg> or any element (an <svg> is created inside it).
   ------------------------------------------------------------------- */
export function stipple(target, opts = {}) {
  let svg = target instanceof SVGSVGElement ? target : target.querySelector(":scope > svg[data-stipple-svg]");
  if (!svg) {
    svg = document.createElementNS(NS, "svg");
    svg.setAttribute("data-stipple-svg", "");
    target.appendChild(svg);
  }
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.display = "block";

  const draw = (o) => {
    const host = target instanceof SVGSVGElement ? target.parentElement || target : target;
    const box = host.getBoundingClientRect();
    const w = Math.max(8, Math.round(o.width || box.width || 300));
    const h = Math.max(8, Math.round(o.height || box.height || 150));
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.style.width = "100%";
    svg.style.height = "100%";

    const mode = o.mode || cssVar(svg, "--stipple-mode") || "stipple";
    const litVar = cssVar(svg, "--stipple-lit");
    const lit = o.lit !== undefined ? !!Number(o.lit) : litVar === "1";
    const preset = typeof o.preset === "string" && PRESETS[o.preset] ? PRESETS[o.preset]({ ...o, lit }) : null;
    const density = o.density || (preset && preset.density) || PRESETS.ramp().density;
    const pick = o.pick || (preset && preset.pick) || null;

    let colors = o.colors;
    if (!colors) {
      colors = mode === "color" ? cssList(svg, "--dot-palette") : [cssVar(svg, "--dot") || "currentColor"];
      if (!colors.length) colors = ["currentColor"];
    }
    const size = Number(o.dotSize) || parseFloat(cssVar(svg, "--dot-size")) || 2;
    const R = rng(Number(o.seed) || 1);
    const animate = o.animate !== false && o.animate !== "false" &&
      !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const batches = animate ? 6 : 1;

    // buckets[batch][color][sizeIdx] = path data array
    const widths = [];
    const buckets = Array.from({ length: batches }, () => colors.map(() => []));
    const push = (b, c, s, x, y) => {
      const row = buckets[b][c];
      (row[s] || (row[s] = [])).push("M" + x.toFixed(1) + " " + y.toFixed(1) + "h.01");
    };

    if (mode === "halftone") {
      const sp = Number(o.spacing) || parseFloat(cssVar(svg, "--halftone-spacing")) || 8;
      const ang = o.angle !== undefined ? Number(o.angle) : 0.26;
      for (let k = 0; k < 5; k++) widths[k] = sp * Math.sqrt((k + 0.5) / 5) * 1.1;
      const ca = Math.cos(ang), sa = Math.sin(ang), m = Math.ceil(Math.hypot(w, h) / sp);
      for (let i = -m; i <= m; i++) {
        for (let j = -m; j <= m; j++) {
          const x = w / 2 + (i * ca - j * sa) * sp, y = h / 2 + (i * sa + j * ca) * sp;
          if (x < 2 || y < 2 || x > w - 2 || y > h - 2) continue;
          const d = density(x, y, w, h);
          if (d < 0.06) continue;
          push(Math.floor(R() * batches), 0, Math.min(4, Math.floor(d * 5)), x, y);
        }
      }
    } else {
      const isColor = mode === "color";
      widths[0] = size * (isColor ? 1 : 0.85);
      widths[1] = size * (isColor ? 1 : 1.25);
      const fill = Number(o.fill) || (isColor ? 0.06 : 0.16);
      const n = Math.round(o.count || w * h * fill);
      for (let i = 0; i < n; i++) {
        const x = R() * w, y = R() * h, d = density(x, y, w, h);
        if (d > 0 && R() < d) {
          let c = 0;
          if (colors.length > 1) c = pick ? pick(x, y, w, h, R) % colors.length : Math.floor(R() * colors.length);
          push(Math.floor(R() * batches), c, isColor ? 0 : (R() < 0.5 ? 0 : 1), x, y);
        }
      }
    }

    // render
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const groups = [];
    buckets.forEach((byColor, b) => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("fill", "none");
      g.setAttribute("stroke-linecap", "round");
      byColor.forEach((bySize, c) => {
        bySize.forEach((list, s) => {
          if (!list || !list.length) return;
          const p = document.createElementNS(NS, "path");
          p.setAttribute("d", list.join(""));
          p.setAttribute("stroke", colors[c]);
          p.setAttribute("stroke-width", widths[s].toFixed(2));
          g.appendChild(p);
        });
      });
      if (o.blend) g.style.mixBlendMode = o.blend;
      if (animate) {
        g.style.opacity = "0";
        g.style.transition = `opacity 600ms cubic-bezier(.2,.7,.2,1) ${b * 90}ms`;
      }
      svg.appendChild(g);
      groups.push(g);
    });
    if (animate) requestAnimationFrame(() => requestAnimationFrame(() => groups.forEach((g) => (g.style.opacity = "1"))));
  };

  let current = { ...opts };
  draw(current);
  return {
    svg,
    redraw(next = {}) { current = { ...current, ...next }; draw(current); },
  };
}

/* ---- auto init ------------------------------------------------------
   Draws every [data-stipple] under root, redraws on resize (debounced)
   and when <html data-theme / data-mode> changes. Returns a cleanup fn.
   ------------------------------------------------------------------- */
const registry = new Map();

function optsFromEl(el) {
  const d = el.dataset;
  const o = { preset: d.stipple };
  if (d.seed) o.seed = Number(d.seed);
  if (d.fill) o.fill = Number(d.fill);
  if (d.mode) o.mode = d.mode;
  if (d.lit) o.lit = d.lit;
  if (d.blend) o.blend = d.blend;
  if (d.animate) o.animate = d.animate !== "false";
  return o;
}

export function autoInit(root = document) {
  const els = root.querySelectorAll("[data-stipple]");
  const ro = new ResizeObserver((entries) => {
    entries.forEach((e) => {
      const rec = registry.get(e.target);
      if (!rec) return;
      const { width, height } = e.contentRect;
      if (Math.abs(width - rec.w) < 2 && Math.abs(height - rec.h) < 2) return;
      rec.w = width; rec.h = height;
      clearTimeout(rec.t);
      rec.t = setTimeout(() => rec.api.redraw({ animate: false }), 150);
    });
  });
  els.forEach((el) => {
    if (registry.has(el)) return;
    const api = stipple(el, optsFromEl(el));
    const r = el.getBoundingClientRect();
    registry.set(el, { api, w: r.width, h: r.height, t: 0 });
    ro.observe(el);
  });
  const mo = new MutationObserver(() => {
    registry.forEach((rec) => rec.api.redraw({ animate: false }));
  });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
  return () => { ro.disconnect(); mo.disconnect(); registry.clear(); };
}

/* Optional global for non-module code: window.Stipple.stipple(...) */
if (typeof window !== "undefined") window.Stipple = { stipple, autoInit, PRESETS, rng, smooth, ball };
