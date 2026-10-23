# DESIGN.md — Brand design system (Round 2 · Pointillism)

> **For Claude Code:** this file is the source of truth for the look and feel of this app.
> Read it fully before changing any UI. When something here conflicts with existing styles,
> this file wins. Do not invent colours, fonts, radii or shadows that are not in `tokens.css`.

---

## 1. What's in this folder

| File | What it is | How to use it |
|---|---|---|
| `tokens.css` | All design tokens as CSS variables: colours, fonts, type scale, spacing, radii, motion, dot settings. Six themes, each with a light and dark variant. | Load first, on every page. |
| `ui.css` | Base styles + component classes (`.btn`, `.field`, `.card`, `.nav`, `.empty`, `.skeleton`, `.dot-loader`, `.toast`, `.table`…). Uses only tokens. | Load second, before app CSS. |
| `stipple.js` | Dependency-free ES module that draws dot artwork (stipple, halftone, multi-colour pointillism) into SVG using the active theme's colours. | Import and call `autoInit()` or `stipple(el, opts)`. |
| `components.html` | Living reference: every component, every state, with a theme/mode switcher. | Open in a browser. Match it. |

## 2. Choosing the theme

The theme is one attribute on `<html>`:

```html
<html data-theme="kraft-matinee">                 <!-- native mode -->
<html data-theme="kraft-matinee" data-mode="dark"> <!-- forced dark -->
```

| Theme | Native | Feel | Heading / Body | Dot style | Hero preset |
|---|---|---|---|---|---|
| `sugar-grain` | light | warm, soft, festival poster | Young Serif / IBM Plex Sans | ink stipple | `sphere` |
| `afterglow` | dark | warm, sharp, cinematic | Alfa Slab One / Courier Prime | halftone | `planet` |
| `dust-sparks` | dark | cool, sharp, mysterious | Syne / Manrope | white stipple | `smoke` |
| `kraft-matinee` | light | warm, nostalgic, filmic | Archivo (lowercase) / Newsreader | ink stipple | `landscape` |
| `optical-garden` | light | cool, airy, artistic | Fraunces / Karla | colour pointillism | `garden` |
| `riso-orbit` | light | cool, sharp, zine | Bricolage Grotesque / DM Mono | blue stipple + pink overprint | `galaxy` |

**ACTIVE THEME FOR THIS APP: `optical-garden`** (the other themes and their
`@import` lines have been removed from `tokens.css`).

To support the user's OS setting, set `data-mode` from `prefers-color-scheme` in a small script, and
let users override it with a toggle (store the choice in `localStorage`).

## 3. Installing into the existing frontend

1. Copy this folder to `src/design/` (or `public/design/` for a plain static site).
2. Load the CSS once, globally, in this order: `tokens.css` → `ui.css` → existing app CSS.
   - Plain HTML: `<link rel="stylesheet">` in `<head>`.
   - Vite/React/Vue/Svelte: `import "./design/tokens.css"; import "./design/ui.css";` in the entry file.
   - Next.js: import both in `app/layout.tsx` (or `pages/_app.tsx`).
   - Tailwind: keep Tailwind, but map its theme to the tokens, e.g. `colors: { bg: "var(--bg)", ink: "var(--ink)", accent: "var(--accent)" }`, `fontFamily: { head: "var(--font-head)", body: "var(--font-body)" }`, `borderRadius: { md: "var(--radius-md)" }`.
3. Add `data-theme="…"` to `<html>`.
4. Dot artwork:
   - Plain HTML: `<script type="module">import { autoInit } from "/design/stipple.js"; autoInit();</script>`
   - React:
     ```jsx
     import { useEffect, useRef } from "react";
     import { stipple } from "../design/stipple.js";
     export function Stipple({ preset = "blob", seed = 1, className, ...opts }) {
       const ref = useRef(null);
       useEffect(() => {
         const el = ref.current; if (!el) return;
         const api = stipple(el, { preset, seed, ...opts });
         const ro = new ResizeObserver(() => api.redraw({ animate: false }));
         ro.observe(el);
         const mo = new MutationObserver(() => api.redraw({ animate: false }));
         mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });
         return () => { ro.disconnect(); mo.disconnect(); };
       }, [preset, seed]);
       return <div ref={ref} className={className} aria-hidden="true" />;
     }
     ```
   - Vue/Svelte: same idea — call `stipple(el, …)` in `onMounted` / `onMount`, disconnect observers on unmount.
   - SSR (Next, Nuxt, SvelteKit): only call it on the client.
5. Replace hard-coded colours, fonts and radii in existing CSS with tokens (see §9).

## 4. Colour rules

- Use **only** variables: `--bg`, `--surface`, `--surface-2`, `--ink`, `--ink-muted`, `--line`, `--line-soft`, `--accent`, `--accent-ink`, `--accent-2`, `--danger`, `--success`, `--focus`, `--dot`, `--dot-2`, `--dot-palette`.
- Page = `--bg`. Panels, cards, inputs, modals = `--surface`. Hover fills, wells, skeletons = `--surface-2`.
- Text = `--ink`; secondary text = `--ink-muted`. Never put `--ink-muted` text on `--accent`.
- `--accent` is for the **one** primary action per view, active nav, links and key numbers. Text on it is always `--accent-ink`.
- `--accent-2` is decorative (fills, highlights, swatches). Never use it for body text.
- Status: errors use `--danger` + a written message; success uses `--success`. Never colour alone.
- Contrast: body text ≥ 4.5:1, large text (24px+) and UI borders ≥ 3:1. The token pairs above already pass; re-check any new pairing.

## 5. Typography

- Headings: `var(--font-head)` with `--head-weight`, `--head-transform`, `--head-tracking`. The `h1`, `h2`, `h3`, `.display` classes in `ui.css` already apply these.
- Body, UI, labels, buttons: `var(--font-body)`.
- Scale: `--text-xs` 12 · `--text-sm` 14 · `--text-md` 16 · `--text-lg` 18 · `--text-xl` 24 · `--text-2xl` 32 · `--text-3xl` 48 · `--text-display` (hero only, fluid).
- One `.display` per page at most. One `h1` per page.
- Body text never below 16px; helper text never below 14px; labels 12px uppercase with 0.12em tracking.
- Keep line length ≤ ~70 characters (`max-width: 60ch` on paragraphs).
- `kraft-matinee` headings are lowercase by design; `riso-orbit` headings carry a pink offset shadow (`--head-shadow`). Don't apply these to body text.

## 6. Spacing, shape, motion

- Spacing only from `--space-1 … --space-9` (4, 8, 12, 16, 24, 32, 48, 64, 96 px).
- Section padding: `--space-8` desktop, `--space-7` mobile. Card padding `--space-5`. Gaps between related items `--space-3`/`--space-4`.
- Radii: `--radius-sm` inputs, `--radius-md` small panels, `--radius-lg` cards/modals, `--radius-pill` buttons/badges. Some themes set these to 0 on purpose — don't "fix" that.
- Borders: `var(--border-w) solid var(--line)` for strong edges, `--line-soft` for quiet dividers.
- No drop shadows, no gradients. Depth comes from surfaces, borders and dot texture.
- Motion: `--dur-fast` (press), `--dur` (hover/focus), `--dur-slow` (stipple fade-in). Easing `--ease`. Respect `prefers-reduced-motion` (ui.css and stipple.js already do).

## 7. Dot artwork (stipple.js)

**Where dots belong**

| Use | Preset | Size |
|---|---|---|
| Landing / home hero (one per page) | theme's hero preset (§2) | 320–520px square; `landscape` is a wide banner ≈ 3:1 |
| Empty states | `blob` (or `sphere`) | 140–200px |
| Onboarding / success screens | hero preset or `sphere` | 200–320px |
| Card header art | `fade`, `blob`, `sphere`, `disc` | full card width × 120–180px |
| Section divider / texture strip | `ramp` | full width × 24–48px |
| Avatar / brand mark fallback | `sphere`, `disc`, `blob` | 32–64px |

**Rules**

- Dots are decoration: always `aria-hidden` (stipple.js sets this). Never put text, buttons or forms on top of dot art.
- Max **one large** illustration per screen, plus small accents. Dense data screens (tables, settings, forms) get no large art — a `ramp` strip at most.
- Use a fixed `seed` per placement so the drawing doesn't change on every render.
- Performance: default density is fine. For areas above ~600×600px, lower it (`fill: 0.1`). Don't draw art inside long lists — draw once, or use the CSS `.skeleton` texture.
- Colours always come from the theme. Pass `colors: [...]` only for a deliberate exception.
- Halftone themes (`afterglow`) look best with `planet`, `sphere`, `fade`, `ramp`. Colour mode (`optical-garden`) looks best with `garden`, `blob`, `ramp`.
- Overprint effect (`riso-orbit`): stack two absolutely-positioned layers in one box — first `stipple(a, { preset: "disc", colors: [pink] })` where `pink = getComputedStyle(document.documentElement).getPropertyValue("--dot-2").trim()`, then `stipple(b, { preset: "galaxy", blend: "multiply" })` on top.

**API**

```js
import { stipple, autoInit, PRESETS } from "./stipple.js";

autoInit();                         // draws every [data-stipple] element, redraws on resize/theme change
const art = stipple(el, {
  preset: "sphere",                 // or density: (x, y, w, h) => 0..1
  seed: 4,                          // same seed = same drawing
  fill: 0.16,                       // dot density (stipple mode)
  mode: "halftone",                 // override theme: stipple | halftone | color
  lit: 1,                           // light dots on dark ground
  colors: ["#2346C8"],              // override theme colours
  animate: true,                    // fade-in (auto-off for reduced motion)
  blend: "multiply",                // for overprint layers
});
art.redraw({ seed: 5 });
```

HTML shortcut: `<div class="stipple" data-stipple="blob" data-seed="3" style="height:180px"></div>`

## 8. Components and UX patterns

Use the classes in `ui.css`; match `components.html` exactly.

- **Buttons:** `.btn` + `.btn-primary | .btn-secondary | .btn-ghost`, `.btn-sm`, `.btn-icon` (needs `aria-label`). One primary per view, placed last in a button row. Verb-first labels ("Save changes", not "OK"). While busy: keep the width, show `.dot-loader`, set `aria-busy="true"`, disable repeat clicks.
- **Forms:** `.field` wraps `label` + `.input | .select | .textarea` + `.help`. Label always visible (never placeholder-only). Errors: add `.is-error`, `aria-invalid="true"`, and say how to fix it in `.help`. Validate on blur, not on every keystroke.
- **Cards:** `.card`, optional `.card-art` with a small stipple. Whole card clickable = make the card the `<a>`.
- **Navigation:** `.nav`, `.nav-brand`, `.nav-links`; mark the current page with `aria-current="page"`. Wraps on mobile; no hidden hover-only menus.
- **Empty states:** `.empty` = art + one-line title + one sentence of why + one primary action.
- **Loading:** layout-shaped `.skeleton` blocks for content you're fetching (> 300ms); `.dot-loader` for inline/button actions. Never a full-page spinner for partial loads.
- **Feedback:** `.toast` with `role="status"` for confirmations, with Undo where possible. Errors that block the user go inline, next to the cause.
- **Tables:** `.table` inside `.table-wrap` (scrolls horizontally on small screens).
- **Touch targets:** ≥ `--tap` (44px). **Focus:** never remove `:focus-visible` outlines.
- **Responsive:** design for 360px first; multi-column layouts collapse with `flex-wrap`/`auto-fit` grids. No horizontal page scroll.

## 9. Applying this to an EXISTING frontend (migration checklist)

Work screen by screen, smallest risk first. After each step the app must still build and run.

1. Install (§3). Add `data-theme` to `<html>`. Verify fonts load.
2. Global sweep: replace hard-coded hex/rgb colours with the nearest token; replace font-family declarations with `var(--font-head)` / `var(--font-body)`; replace border-radius values with radius tokens; replace ad-hoc spacing with `--space-*`.
3. Remove shadows and gradients unless they're functional (e.g. a scroll fade).
4. Swap buttons, inputs, cards, nav to the `ui.css` classes (or map existing component props to them). Keep existing behaviour, handlers and props intact.
5. Add dot artwork where §7 allows: hero, empty states, onboarding, card headers. Nowhere else.
6. Add loading (skeleton/dot-loader) and empty states wherever data is fetched and they're missing.
7. Accessibility pass: labels, focus, contrast, touch targets, `aria-*` from §8.
8. Check every screen at 360px, 768px, 1280px, in light and dark mode.

**Don't:** change business logic, routes, API calls or state management; rename components without need;
introduce new UI libraries; add new colours "just for this one place".

## 10. Do / Don't

| Do | Don't |
|---|---|
| Let one dot illustration carry each key screen | Scatter dot art everywhere or behind text |
| Keep headlines short and type small and tidy | Mix in other fonts or weights |
| Use `--accent` sparingly for the main action | Make every button an accent button |
| Use surfaces and borders for structure | Add drop shadows, glows or gradients |
| Write placeholders as `[Like this]` when content is unknown | Invent fake stats, names or testimonials |
| Respect reduced motion and keyboard users | Animate dots on loop or on scroll |

---

## 11. Prompt to paste into Claude Code

```
Read design/DESIGN.md completely, then open design/components.html to see the target.
Apply this design system to the existing frontend:

1. Install tokens.css and ui.css globally (tokens first) and set
   <html data-theme="THEME-NAME"> — use the active theme named in DESIGN.md §2.
2. Follow the migration checklist in DESIGN.md §9, one screen at a time.
   Start with the main layout/nav and the home screen, then show me the diff
   before continuing to the rest.
3. Use only the tokens and ui.css classes for colours, fonts, spacing and radii.
   Do not invent new values.
4. Add stipple.js artwork only where DESIGN.md §7 allows (hero, empty states,
   onboarding, card headers, dividers), with fixed seeds.
5. Add missing loading and empty states, and fix accessibility per §8.
6. Do not change business logic, routes, API calls or state.

When done, list every screen you changed and anything you couldn't map cleanly.
```
