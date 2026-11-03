# Motion and surfaces 2026 (owner follow-up 2, M0)

Session AK, research lane M0. Read on **1 November 2026**. Support data is MDN's browser-compat-data (BCD, `main`,
fetched today) unless a row says otherwise; current stable versions today: **Chrome 156** (157 on 3 Nov), **Firefox 159**
(27 Oct 2026), **Safari 27.2** [M1][M2][M3]. Sources are in §5 by number. Text on web pages was read as data only (one
page, Linear's, carried text addressed to AI agents; it was ignored).

Ground rules that frame everything below (owner brief M, ADR-036): inside the PROTECTED list; deep navy, white → nebula
headings, planets and orbits; liquid-glass hover **without pointer tracking**; readable text; every motion silent under
reduced motion and Motion Off; Calm = entrances only; nothing loops on content except the NOVA orb's slow breathing; no
new dependency; route budgets held. Existing hooks to build on (code, read today): `html[data-app-motion=off]` and the
`zigoals:motion:v1` key (`components/use-entrance.ts`: one shared IntersectionObserver, one-shot `data-entrance="once"`);
`lib/ui-prefs/theme.ts` already wraps theme switches in `document.startViewTransition`; `components/shell/sidebar-sky.css`
already uses `@property` + `animation-timeline: scroll()` behind `@supports`; ADR-036 Q26 recorded a page-transition
design (React `<ViewTransition>` in `app/app/template.tsx`, 120/180 ms fade with a 6 px rise) that M1 now switches on.
Repo versions: **React 19.3.0, Next 16.4.2** (code).

---

## 1. What the admired products are doing (2025–2026)

| Product | What they do | Source | Lesson for ZIGoals |
|---|---|---|---|
| **Apple, Liquid Glass** (iOS/macOS 26, June 2025) | "This translucent material reflects and refracts its surroundings"; it "dynamically reacts to movement with specular highlights"; it "intelligently adapts between light and dark environments"; tab bars shrink while scrolling and expand when scrolling back | [M4] | glass belongs to the **control layer** (dock, command bar, sheets, chips), not to long reading text; scroll-driven compaction of chrome |
| **Linear** (refresh, 12 Mar 2026) | "A calmer interface for a product in motion": navigation "a few notches dimmer", "Structure should be felt not seen" (softer borders, fewer separators), "Don't compete for attention you haven't earned", warmer, less saturated greys tuned in hue/chroma/lightness | [M5] | restraint: content leads, chrome recedes; motion is not the point |
| **Raycast** (new app, 14 May 2026) | "Liquid Glass is used in tasteful ways to enhance the functional nature of a launcher"; rebuilt "to make sure the app is faster on every aspect"; launcher and AI chat share one composer | [M6] | glass in moderation + speed; one command bar |
| **Vercel (Geist)** | design system with "Presets for radii, fills, strokes, and shadows" (materials as tokens) | [M7] | glass/material as a small set of tokens, not per-component CSS |
| **Awwwards Sites of the Year** | Site of the Year: **Lando Norris**; Developer SOTY: **Messenger**; Agency: Immersive Garden (page shows the latest winners, year not printed) | [M8] | the award end of the web is WebGL/Three.js-heavy (secondary analysis: most Q1-2026 Sites of the Day used Three.js [M9]); that is the landing's inspiration ceiling, not the app's |
| **Stripe, Framer sites** | animated gradient backgrounds (Stripe's homepage mesh gradient) and scroll/appear effects (Framer) | general knowledge, **UNVERIFIED today** | gradients and scroll reveals are now achievable in CSS alone (§2.3, §2.2) |

Conclusion: the 2026 consensus is **calm chrome, glass on controls, content first, motion that explains (continuity,
cause → effect), fast**. Web-native CSS now covers almost all of it in all three engines.

---

## 2. Techniques: support, recipe, accessibility rule, performance rule

### 2.1 View Transitions (same-document, React `<ViewTransition>`, cross-document)
| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| `document.startViewTransition()`, `view-transition-name` | 111 | **144** | 18 |
| `view-transition-class` | 125 | 144 | 18.2 |
| transition **types** | 125 | 147 | 18.2 |
| cross-document `@view-transition { navigation: auto }` | 126 | **no** | 18.2 |
BCD [M10]. Same-document view transitions are therefore in every current engine. ZIGoals is a single-page App Router app:
same-document is what it needs; cross-document matters only for the static landing.

React/Next (repo docs, `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` [M11]): "React 19.3 includes the
`<ViewTransition>` component and `addTransitionType` API"; "View transitions work in the App Router with no
configuration"; animations activate from Transitions, `<Suspense>` and `useDeferredValue` ("Regular `setState` calls do
not trigger them"); route navigations are transitions; `<Link transitionTypes={[...]}>` and `router.push(..., {transitionTypes})`.
"Without browser support, your application works normally; the transitions do not animate."

Recipe — shared element (widget → page):
```tsx
import {ViewTransition} from 'react';
// on the NOVA widget and on the destination page's hero, same name:
<ViewTransition name={`nova-widget-${id}`} share="zg-morph" default="none">{children}</ViewTransition>
```
```css
::view-transition { pointer-events: none; }            /* the overlay otherwise swallows clicks (Next guide) */
::view-transition-group(.zg-morph) { animation-duration: 280ms; animation-timing-function: var(--zg-spring); }
html[data-app-motion=off]::view-transition-group(*),
html[data-app-motion=off]::view-transition-old(*),
html[data-app-motion=off]::view-transition-new(*) { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  ::view-transition-group(*), ::view-transition-old(*), ::view-transition-new(*) { animation-duration: 0s !important; animation-delay: 0s !important; }
}
```
Guide notes to keep: `default="none"` on named pairs (otherwise each named element animates on every transition) and
keep an explicit `share` with it ("With `default="none"` and no `share` prop, the pair silently stops morphing") [M11];
`view-transition-name` must be unique on the page at capture time (one widget id each).
- **Accessibility rule:** none under reduced motion / Motion Off (instant swap); Calm keeps only a ≤ 150 ms opacity
  crossfade (no movement). Focus moves to the new page's heading as today; never block input (the pointer-events rule).
- **Performance rule:** only `transform`/`opacity` in the keyframes; ≤ 300 ms; never name hundreds of elements (each
  name is a captured layer); skip the transition when `document.visibilityState !== 'visible'`.

### 2.2 Scroll-driven animations (`animation-timeline: scroll() / view()`)
| Feature | Chrome | Firefox | Safari |
|---|---|---|---|
| `animation-timeline`, `scroll()`, `view()`, `animation-range` | 115 | **159** (27 Oct 2026: "Firefox now supports scroll-driven animations") | 26 |
BCD [M12]; Firefox 159 notes [M2]. All three engines now; older browsers keep a static page through `@supports`.

Recipe — gentle reveal on long pages and the landing:
```css
@supports (animation-timeline: view()) {
  :root:not([data-app-motion=off]) .reveal {
    animation: zg-reveal linear both;
    animation-timeline: view(block);
    animation-range: entry 0% cover 30%;
  }
}
@keyframes zg-reveal { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .reveal { animation: none; } }
```
Chrome's docs: scroll-driven animations can run "off the main thread"; animate transforms, not `width` [M13].
- **Accessibility rule:** content is fully visible without the animation (the `from` state never hides content where
  the timeline is missing; reveals must not delay reading); no parallax under reduced motion/Off/Calm; never scroll-jack.
- **Performance rule:** `transform`/`opacity` only (compositor); no layout-affecting properties; one timeline per
  section, not per list row.

### 2.3 `@property` animated gradients (nebula headings and borders)
Support: Chrome 85, Firefox 128, Safari 16.4 (BCD [M14]).
```css
@property --zg-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.nebula-heading {
  background: linear-gradient(var(--zg-angle), #fff 10%, var(--nebula-violet) 55%, var(--nebula-cyan) 90%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
:root:not([data-app-motion=off]) .nebula-heading[data-entrance=once] { animation: zg-sweep 1.6s var(--zg-ease-out) 1 both; }
@keyframes zg-sweep { from { --zg-angle: 60deg; } to { --zg-angle: 100deg; } }
```
- **Accessibility rule:** gradient text must meet 4.5:1 (3:1 for large) at its **lowest-contrast stop** against the
  real background in all three themes (the contrast scanner on every new surface); plays once; static under reduced
  motion/Off; a solid `color` fallback for forced-colors (`@media (forced-colors: active) { color: CanvasText; background: none; }`).
- **Performance rule:** animating a registered custom property repaints the element each frame (not compositor-only):
  keep it to headings/borders, short, once; never on large surfaces or infinite.

### 2.4 Spring easing with CSS `linear()`
Support: Chrome 113, Firefox 112, Safari 17.2 (BCD [M15]). MDN: "A typical use of the `linear()` function is to provide
many points to approximate any curve" [M16]. Generated today from a damped spring (x(t) = 1 − e^(−ζωt)(cos ω_d t +
ζω/ω_d sin ω_d t)):
```css
:root {
  /* ζ = 0.75: 2.8 % overshoot — UI default (buttons, sheets, widgets) */
  --zg-spring: linear(0, 0.132, 0.386, 0.631, 0.815, 0.933, 0.996, 1.023, 1.028, 1.024, 1.017, 1.01, 1.005, 1.002, 1, 0.999, 1);
  /* ζ = 0.55: 12 % overshoot — playful, only for the once-only completion burst */
  --zg-spring-bouncy: linear(0, 0.103, 0.331, 0.589, 0.815, 0.98, 1.079, 1.122, 1.123, 1.101, 1.069, 1.038, 1.012, 0.996, 0.987, 0.984, 0.986, 0.989, 0.993, 0.997, 1, 1.001, 1.002, 1.002, 1);
  --zg-ease-out: cubic-bezier(.2, .8, .2, 1);
}
@supports not (transition-timing-function: linear(0, 1)) { :root { --zg-spring: var(--zg-ease-out); --zg-spring-bouncy: var(--zg-ease-out); } }
```
- **Accessibility rule:** overshoot is movement: under Calm use `--zg-ease-out` (no overshoot); under reduced motion/Off
  no transition at all.
- **Performance rule:** easing costs nothing extra; durations 200–400 ms (the spring's tail needs the length).

### 2.5 Once-only entrances (`@starting-style`) and staggering
Support: `@starting-style` Chrome 117, Firefox 129, Safari 17.5 (BCD [M17]). ZIGoals already has `useEntrance` (one
shared IntersectionObserver, one play per mount). Stagger with a custom property, capped:
```css
:root:not([data-app-motion=off]) [data-entrance=once] {
  animation: zg-rise 360ms var(--zg-spring) both; animation-delay: calc(min(var(--i, 0), 6) * 40ms);
}
@keyframes zg-rise { from { opacity: 0; transform: translateY(8px) scale(.985); } }
```
- **Accessibility rule:** plays once per mount, never on re-render; ≤ 7 staggered items (≤ 240 ms total delay); content
  is interactive immediately (no `pointer-events: none` during entrance).
- **Performance rule:** `transform`/`opacity`; `content-visibility: auto` (Chrome 85, Firefox 125, Safari 18 [M17]) on
  long off-screen sections with `contain-intrinsic-size` to avoid jumps.

### 2.6 Starfield / nebula canvas (NOVA, landing hero)
| Signal / API | Chrome | Firefox | Safari | Use |
|---|---|---|---|---|
| `OffscreenCanvas`, `transferControlToOffscreen` | 69 | 105 | 16.4 | draw in a worker |
| `visibilitychange` | 62 | 56 | 14.1 | pause when hidden |
| `prefers-reduced-motion` | 74 | 63 | 10.1 | static frame |
| `prefers-reduced-transparency` | 118 | flag | no | solid surfaces |
| `navigator.getBattery()` | 38 | removed (52) | no | proxy for "low battery" |
| `navigator.connection.saveData` | 65 | no | no | data saver |
| `navigator.deviceMemory` | 63 | no | no | low-end |
| `navigator.hardwareConcurrency` | 37 | 48 | 15.4 | low-end |
| `prefers-reduced-data` | flag | no | no | do not rely on it |
BCD [M17][M18]. No browser exposes the operating system's battery-saver mode to pages (none found; **UNVERIFIED** that
any API does): use "battery < 20 % and not charging" where `getBattery` exists.

Recipe:
```js
const lowEnd = (navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4 || navigator.connection?.saveData === true;
const still = () => document.documentElement.dataset.appMotion === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches || lowEnd;
// 1. Pre-render 2–3 star layers once (ImageBitmap / OffscreenCanvas), DPR capped at 2 (1.5 when lowEnd).
// 2. Each frame only translates the layers by a few px/second (drift), no per-star math.
// 3. Run the loop only while visible: stop on visibilitychange 'hidden' and when an IntersectionObserver says off-screen.
// 4. Battery: if ('getBattery' in navigator) (await navigator.getBattery()) → still when !charging && level < 0.2.
// 5. still() → draw one static frame and never start the loop (reduced motion, Motion Off, Calm, low end).
```
Where available, `canvas.transferControlToOffscreen()` moves drawing to a worker so the main thread stays free for input.
- **Accessibility rule:** decorative (`aria-hidden`, `role="presentation"`); drifting backgrounds that start automatically
  and last > 5 s need "a mechanism for the user to pause, stop, or hide" (WCAG 2.2.2 Pause, Stop, Hide [M19]) → the
  Motion setting (Full/Calm/Off) is that mechanism, plus a visible pause in NOVA's View controls; no flashing (2.3.1).
- **Performance rule:** ≤ 1 rAF loop per page; < 2 ms per frame; 30 fps is enough for a drift; zero work while hidden or
  off-screen; INP and long tasks measured before/after (M5).

### 2.7 Liquid-glass CSS (no pointer tracking)
Support: `backdrop-filter` Chrome 76, Firefox 103, Safari 18 (9 with `-webkit-`) (BCD [M17]). MDN: "to see the effect the
element or its background needs to be transparent or partially transparent"; a parent with `opacity < 1` becomes a
**backdrop root** and limits what is blurred [M20].
```css
.zg-glass {
  position: relative; isolation: isolate;
  background: color-mix(in oklab, var(--surface-1) 72%, transparent);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid color-mix(in oklab, white 12%, transparent);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / .16), inset 0 -1px 0 rgb(0 0 0 / .22), 0 10px 30px rgb(2 6 23 / .35);
}
.zg-glass::before { /* specular edge: a 1 px gradient ring */
  content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none;
  background: linear-gradient(var(--zg-sheen, 135deg), rgb(255 255 255 / .38), transparent 38% 62%, rgb(255 255 255 / .10));
  mask: linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0);
}
.zg-glass::after { /* grain against banding */
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: .05; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
/* hover without pointer tracking: the sheen turns a little, time-based */
@property --zg-sheen { syntax: '<angle>'; inherits: false; initial-value: 135deg; }
:root:not([data-app-motion=off]) .zg-glass:is(:hover, :focus-visible) { --zg-sheen: 165deg; transition: --zg-sheen 400ms var(--zg-ease-out); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .zg-glass { background: var(--surface-1); } }
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active) {
  .zg-glass { background: var(--surface-1); backdrop-filter: none; -webkit-backdrop-filter: none; }
  .zg-glass::after { display: none; }
}
```
SVG displacement "refraction" (backdrop-filter with an SVG filter URL) is not portable across engines (**UNVERIFIED**
support outside Chromium) — do not use it.
- **Accessibility rule:** text on glass must pass 4.5:1 against the **worst** backdrop it can sit on (starfield, nebula,
  Light's dark islands); the 72 % tint is the floor, raise it if the scanner fails; glass on controls, sheets, the dock and
  the command bar — not on long reading text; Light theme keeps its dark islands.
- **Performance rule:** `backdrop-filter` re-blurs whatever moves behind it every frame: never stack glass on glass,
  keep blurred areas small (dock, bar, sheet), no glass over the animating starfield on low-end (solid tint instead),
  and no animated blur radius.

### 2.8 Number tickers (count up once)
`@property` with `<integer>` and `counter()` can tick in pure CSS, but cannot format locales, decimals or currency and its
pseudo-element text is read inconsistently by screen readers. Use a one-shot rAF ticker:
```ts
export function tick(el: HTMLElement, to: number, fmt: Intl.NumberFormat, ms = 900) {
  el.textContent = fmt.format(to);                      // the real value is in the DOM first (and for assistive tech)
  if (!entranceAllowed() || calm()) return;              // reduced motion, Motion Off, Calm: final value only
  const shown = document.createElement('span'); shown.setAttribute('aria-hidden', 'true');
  /* animate `shown` from 0 to `to` with --zg-ease-out over ms, then remove it */
}
```
- **Accessibility rule:** the final number is in the accessible text from the first paint; the ticker is `aria-hidden`;
  once per mount; never for money that is an estimate without its label; unknown values never tick from 0 (unknown ≠ zero).
- **Performance rule:** one rAF per visible ticker, stopped at the end; tabular numerals (`font-variant-numeric:
  tabular-nums`) so width does not jitter.

### 2.9 SVG stroke animation (charts, orbit paths, ring fills)
Universal (SVG `stroke-dasharray`/`stroke-dashoffset`; `pathLength="1"` normalises any path).
```css
:root:not([data-app-motion=off]) .orbit-path[data-entrance=once] { stroke-dasharray: 1; stroke-dashoffset: 1; animation: zg-draw 900ms var(--zg-ease-out) forwards; }
@keyframes zg-draw { to { stroke-dashoffset: 0; } }
```
- **Accessibility rule:** the chart's data is in text/table form regardless; draw once; static under reduced motion/Off.
- **Performance rule:** dashoffset repaints the path, cheap for a few paths; avoid on 200-point series — fade those.

### 2.10 Haptics (Vibration API)
| | Chrome Android | Chrome desktop | Firefox Android | Firefox desktop | Safari / iOS |
|---|---|---|---|---|---|
| `navigator.vibrate` | 32 | API present, no motor | partial (79) | **removed in 129** | **no** |
BCD [M18]. Calls need **sticky user activation** (W3C spec; Chrome since 60 blocks it before a tap) [M21][M22]; "does
nothing if the device doesn't support it" [M23].
```ts
const haptic = (ms = 10) => { if (motionOffOrReduced() || hapticsOff()) return; navigator.vibrate?.(ms); };
// call only inside a click/tap handler: confirm card accepted, habit ticked (outside the protected Checklist pattern), timer done
```
- **Accessibility rule:** never the only feedback; an in-app switch (default on where supported); off under Motion Off.
  A web page cannot read the phone's silent/mute switch (**UNVERIFIED** that any API exposes it) — say so in Help and tie
  haptics to the app's own Sound setting.
- **Performance rule:** ≤ 15 ms pulses, no patterns longer than 50 ms.

---

## 3. WCAG rules that bind every technique
- 2.2.2 Pause, Stop, Hide (A): moving content that "starts automatically, lasts more than five seconds, and is presented
  in parallel with other content" needs "a mechanism for the user to pause, stop, or hide it" [M19] → the NOVA orb's
  breathing and the starfield drift are covered by Motion (Full/Calm/Off) + NOVA's View controls pause, and both stop
  under reduced motion.
- 2.3.3 Animation from Interactions (AAA): "Motion animation triggered by interaction can be disabled, unless the
  animation is essential" [M24] → Motion Off disables all of it; we meet AAA here.
- 2.3.1 Three Flashes (A): no flashing anywhere (bursts are soft scale/opacity, never strobing).
- `prefers-reduced-motion` honoured everywhere (Chrome 74, Firefox 63, Safari 10.1 [M17]); in ZIGoals the device setting
  always wins over the app's Full.

---

## 4. Plan for ZIGoals

Motion levels (M4): **Full** (default), **Calm** = entrances only (opacity fades ≤ 150 ms, no movement, no loops, no
parallax, no overshoot), **Off** = `html[data-app-motion=off]` (nothing moves). Device reduced motion = Off, whatever the
app says. Proposed implementation: `zigoals:motion:v1` gains the value `calm` (additive), mirrored as
`html[data-app-motion=calm]`; `entranceAllowed()` stays true for Calm, a new `movementAllowed()` is false for Calm.

| Technique | Where | Full | Calm | Off / reduced motion |
|---|---|---|---|---|
| Page transitions (React `<ViewTransition>`, Q26 design) | `app/app/template.tsx`; protected chrome pinned with fixed names, no animation | 120 ms out / 180 ms in, 6 px rise | 150 ms opacity crossfade | instant |
| Shared element widget/card → page | NOVA widgets → their pages; Today's non-protected cards → detail; Goals list → goal | 280 ms morph, `--zg-spring` | crossfade | instant |
| Theme switch crossfade (exists) | `lib/ui-prefs/theme.ts`, scoped to a `theme` type | as today | as today | instant (exists) |
| Scroll-driven reveals | landing chapters; Help, Review, Insights long pages | `view()` reveal 12 px | opacity only | none, content static |
| Scroll-driven chrome | landing header compacts; NOVA dock compacts on phones (Liquid-Glass style) | yes | no | no |
| `@property` gradients | nebula headings (`section-heading.tsx` NebulaFlow exists), glass sheen, focus rings | one sweep on first view | static gradient | static gradient |
| Spring `linear()` | sheets, dock, widget resize, confirm cards | `--zg-spring` | `--zg-ease-out` | none |
| Once-only staggered entrances | Today non-protected bento, NOVA widgets settling on orbits, pillar overviews | ≤ 7 items, 40 ms | fade, no stagger | none |
| NOVA opening "system online" (~2 s, once, skippable) | `/app/nova` first visit | full sequence | finished dashboard + 300 ms fade | finished dashboard |
| NOVA orb | NOVA (and the landing chapter) | breathes idle (the only loop), ripples/swirls/pulses by state | state shown by colour/ring only, no loop | still; state in text ("Listening…") |
| Starfield/nebula canvas | NOVA backdrop, landing hero | drift ≤ 30 fps, paused when hidden/off-screen, low battery, low end | static frame | static frame |
| Aurora/mesh gradient drift | NOVA + landing backgrounds only | very slow (≥ 60 s cycle), pausable | static | static |
| Liquid glass | dock, command bar, sheets, NOVA panels, chips (control layer) | blur + specular + grain, sheen turn on hover/focus | same, no sheen transition | same, no transition; solid under reduced transparency / more contrast |
| Number tickers | Today stats (non-protected), Wealth totals, NOVA widgets, Wrapped | count up once | final value | final value |
| SVG strokes | charts (one chart look), orbit paths, goal rings | draw once | fade | static |
| Completion micro-interactions (reverses Q27) | goal finished, workflow finished, NOVA setup finished, focus done; **not** the habit tick (PROTECTED Checklist pattern) | soft burst + ring fill once, `--zg-spring-bouncy` | ring fill only, no burst | static "Done" state |
| Skeleton sheen (exists) | loading states | sheen | static skeleton | static skeleton |
| Haptics | confirm accepted, focus done, capture saved (Android Chrome) | 10 ms | 10 ms (not motion) | off under Motion Off |
| Parallax | sidebar sky (exists), landing hero | scroll-driven only, never pointer | none | none |

Guardrails to test (M4/M5/M7): a spec per level (Full/Calm/Off + emulated reduced motion) asserting no running
animations except the orb in Full (`document.getAnimations()`), the starfield loop stopped on `visibilitychange`, glass
text contrast in Nebula/Light/Dark, `::view-transition` pointer-events none, and INP/long tasks on Today, NOVA, Wealth
and Earn before vs after (F8 numbers must not get worse).

---

## 5. Sources (read 1 November 2026)
- [M1] Chromium milestone schedule — https://chromiumdash.appspot.com/fetch_milestone_schedule?offset=-1&n=4
- [M2] Firefox 159.0 release notes (27 Oct 2026) — https://www.firefox.com/en-US/firefox/159.0/releasenotes/ ; versions — https://product-details.mozilla.org/1.0/firefox_versions.json
- [M3] WebKit blog (WebKit Features for Safari 27.2) — https://webkit.org/blog/
- [M4] Apple Newsroom, new software design (June 2025) — https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- [M5] Linear, "A calmer interface for a product in motion" (12 Mar 2026) — https://linear.app/now/behind-the-latest-design-refresh
- [M6] Raycast, The New Raycast (14 May 2026) — https://www.raycast.com/blog/the-new-raycast ; blog index https://www.raycast.com/blog
- [M7] Vercel Geist — https://vercel.com/geist/introduction
- [M8] Awwwards annual award winners — https://www.awwwards.com/annual-awards/winners
- [M9] Secondary analysis of 2026 Awwwards (unverified figures) — https://digitalstrategyforce.com/journal/why-are-immersive-experiences-dominating-the-2026-awwwards/
- [M10] BCD: api/Document.json (startViewTransition), api/ViewTransition.json (types), css/at-rules/view-transition.json, css/properties/view-transition-name.json, view-transition-class.json — https://github.com/mdn/browser-compat-data
- [M11] Next.js 16.4.2 guide "Designing view transitions" and Link `transitionTypes` (repo: apps/web/node_modules/next/dist/docs/01-app/02-guides/view-transitions.md, 03-api-reference/02-components/link.md); React reference https://react.dev/reference/react/ViewTransition
- [M12] BCD: css/properties/animation-timeline.json, animation-range.json
- [M13] Chrome for Developers, scroll-driven animations — https://developer.chrome.com/docs/css-ui/scroll-driven-animations
- [M14] BCD: css/at-rules/property.json
- [M15] BCD: css/types/easing-function.json (linear-function)
- [M16] MDN, linear() — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/easing-function/linear
- [M17] BCD: css/at-rules/starting-style.json, css/properties/content-visibility.json, css/properties/backdrop-filter.json, css/at-rules/media.json (prefers-reduced-motion, prefers-reduced-transparency, prefers-reduced-data), api/OffscreenCanvas.json, api/HTMLCanvasElement.json, api/Document.json (visibilitychange)
- [M18] BCD: api/Navigator.json (vibrate, getBattery, deviceMemory, hardwareConcurrency, connection), api/NetworkInformation.json (saveData)
- [M19] W3C, Understanding SC 2.2.2 Pause, Stop, Hide — https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html
- [M20] MDN, backdrop-filter — https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter
- [M21] W3C Vibration API — https://www.w3.org/TR/vibration/ ; implementation report https://w3c.github.io/vibration/reports/implementation.html
- [M22] MDN, Navigator.vibrate() — https://developer.mozilla.org/en-US/docs/Web/API/Navigator/vibrate
- [M23] MDN, Vibration API — https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
- [M24] W3C, Understanding SC 2.3.3 Animation from Interactions — https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- Repo code read today: apps/web/components/use-entrance.ts, lib/ui-prefs/theme.ts, components/shell/sidebar-sky.css, components/zigi/motion.ts, docs/architecture/ADR-036-session-ak.md (Q26, Q27, M1).
