// Session AD (Part 3, ADR-026 F13): builds the Light and Dark theme stylesheets from the app's own CSS.
//
// Nebula is the app's CSS as it is; it is never changed by a theme. Light and Dark are override sheets: for every rule of
// every source CSS file that sets a colour (text, background, border, shadow, SVG paint, gradient stops, the :root colour
// tokens), the sheet holds the same rule under `:root[data-theme=<theme>]` with each colour mapped once by that theme's
// rule (OKLCH: lightness remapped by the colour's role, hue kept, chroma tempered), in the same @media/@supports blocks,
// with the same !important. Light keeps the cosmic artwork sections dark ("islands": the Today hero, the footer banner,
// the sidebar and the art cards stay in the nebula colours, so their light text stays on dark art). The hand-written art
// layers (starfield sky, the islands' frames) come from apps/web/themes/<theme>.extra.css and are appended, then any
// apps/web/themes/<theme>.<part>.css in name order (Session AE).
//
// Session AF (L5a, Part 10.2, ADR-028 D9, H13, H75): Light is Nebula by day. Only neutral and night colours flip (words to
// ink, the night's panels and lines to their day versions); every colour with a hue keeps Nebula's exact value as a fill,
// line, glow, shade or paint; a coloured word too faint on white takes a deeper shade of its own hue (its `--<name>-ink`
// twin where it has one). Every rule that sets a colour (or a longhand a colour shorthand resets) is carried into the
// sheet, mapped or not, so the sheet's cascade is Nebula's own. Dark deepens only its neutral and night panels.
//
// Usage: node scripts/themes/build-themes.mjs          writes apps/web/public/themes/{light,dark}.css and the hashes
//        node scripts/themes/build-themes.mjs --check  exits 1 when the committed files are not what this builds
// The parser is the postcss that Next already ships (resolved through apps/web's next); nothing is added to the project.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync} from 'node:fs';
import {join, relative, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..'), WEB = join(ROOT, 'apps', 'web');
const require = createRequire(join(WEB, 'package.json'));
const postcss = require(require.resolve('postcss', {paths: [require.resolve('next')]}));

/** The global sheets in the order app/layout.tsx imports them; every other sheet follows in path order. */
const GLOBAL_ORDER = ['app/globals.css', 'app/visual-theme.css', 'app/product-v2.css', 'app/visual-v21.css', 'app/product-beta.css', 'components/motion.css', 'components/design-system.css', 'components/ui/ui.css', 'components/ui/touch-targets.css', 'components/ui/premium.css'];
/** Light keeps these dark: cosmic artwork with light text on it. Session AE (Part 3, ADR-027): the sidebar and the theme bar
 *  take Light's own colours (apps/web/themes/light.sidebar.css draws its dawn sky); only its planet foot stays night.
 *  Session AF (L5a, Part 10.12): the reward-reserve card (.staking-card) follows the theme, so it is no longer one. */
export const ISLANDS = ['.today-hero', '.site-footer', '.sidebar-destination', '.destination-panel', '.account-panel', '.stake-hero', '.phone-more-signature', '.hero-star', '.how-it-works-dialog', '.logo-intro', '.ai-launcher', '.ai-edge-tab', '.music-launcher-stack', '.music-edge-tab', '.zigi-figure-stage', '.goal-card-art',
  // Session AF (L3; P7.18): the Checklist's dots, lines, orbit banners, chests, ZIGi on the path, the jump bubble, the sky,
  // the launcher and its edge tab, the corner timers and the history keep the Nebula colours in every theme.
  '.path-dot', '.path-line', '.path-banner', '.path-chest-art', '.path-zigi', '.path-jump', '.checklist-sky', '.checklist-launcher-stack', '.checklist-edge-tab', '.checklist-history',
  // Session AF (L3b): the corner timers follow the theme now (white glass by day, their rings in their own colours); the
  // full-screen Checklist's day celebration stays the same night moment in every theme, and the next planet's START / NEXT
  // tag (round 4; the bubble before it) stays white with ink words.
  '.checklist-celebration', '.path-label-bubble', '.path-next-tag', '.checklist-timer-ring',
  // Session AF (L5a for L1's Part 5, the lead's request): the Earn dock stays ZIGi's and the music button's twin in every
  // theme (components/earn-dock/earn-dock.css): its button, edge tab, app tiles and fold arrow.
  '.earn-dock-button', '.earn-dock-edge', '.earn-dock-app', '.earn-dock-fold',
  // Session AF (the lead, crit1): the ecosystem apps' logo discs on Earn keep Nebula's navy disc in every theme, so a light
  // logo glyph stays visible by day (the Light sheet had washed them to near-white, 1.4:1).
  '.earn-medallion', '.earn-dock-app-face'];

export function sourceFiles() {
  const out = [];
  const walk = dir => { for (const name of readdirSync(join(WEB, dir))) { const rel = `${dir}/${name}`, full = join(WEB, rel); if (statSync(full).isDirectory()) { if (name !== 'node_modules') walk(rel); } else if (name.endsWith('.css')) out.push(rel); } };
  walk('app'); walk('components');
  const rest = out.filter(f => !GLOBAL_ORDER.includes(f)).sort();
  return [...GLOBAL_ORDER.filter(f => out.includes(f)), ...rest];
}

// ---- colour: parse, OKLab/OKLCH, format ----
const NAMED = {white: [255, 255, 255, 1], black: [0, 0, 0, 1]};
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{4}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)|\b(?:white|black)\b/g;
function parseColor(text) {
  if (text[0] === '#') {
    let h = text.slice(1); if (h.length <= 4) h = [...h].map(c => c + c).join('');
    const n = [0, 2, 4, 6].map(i => parseInt(h.slice(i, i + 2) || 'ff', 16));
    return [n[0], n[1], n[2], n[3] / 255];
  }
  if (NAMED[text]) return NAMED[text];
  const parts = text.replace(/rgba?\(|\)/g, '').split(/[\s,/]+/).filter(Boolean).map(v => v.endsWith('%') ? parseFloat(v) * 2.55 : parseFloat(v));
  return [parts[0], parts[1], parts[2], parts.length > 3 ? (text.includes('%') && parts[3] > 1 ? parts[3] / 255 : parts[3]) : 1];
}
const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = c => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toOklch([r, g, b, a]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B), m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B), s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {L, C: Math.hypot(A, Bb), h: Math.atan2(Bb, A), a};
}
function fromOklch({L, C, h, a}) {
  const A = C * Math.cos(h), B = C * Math.sin(h);
  // Reduce chroma until the colour fits sRGB.
  for (let c = C, i = 0; i < 24; i++, c *= 0.92) {
    const AA = c * Math.cos(h), BB = c * Math.sin(h);
    const l = (L + 0.3963377774 * AA + 0.2158037573 * BB) ** 3, m = (L - 0.1055613458 * AA - 0.0638541728 * BB) ** 3, s = (L - 0.0894841775 * AA - 1.291485548 * BB) ** 3;
    const rgb = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    if (rgb.every(v => v >= -1e-4 && v <= 1.0001) || i === 23) return [...rgb.map(v => Math.round(Math.min(255, Math.max(0, gam(Math.min(1, Math.max(0, v))))))), a];
  }
  return [0, 0, 0, a, A, B];
}
const hex2 = n => n.toString(16).padStart(2, '0');
const formatColor = ([r, g, b, a]) => `#${hex2(r)}${hex2(g)}${hex2(b)}${a >= 0.999 ? '' : hex2(Math.round(Math.min(1, Math.max(0, a)) * 255))}`;

// ---- the themes' mappings, by the colour's role ----
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
/** Session AF (L5a, Part 10.2, ADR-028 H13, H75): a colour is neutral below this OKLCH chroma (greys, the night's navy
 *  panels, white glass); at or above it, it is a colour of the nebula (an accent, a fill, a glow, a pillar's hue). */
export const NEUTRAL_CHROMA = 0.07;
export const isNeutral = c => c.C < NEUTRAL_CHROMA;
/** A night colour: dark (OKLCH L < 0.40) with at most a tint (C < 0.14) — the night's panels, glass, selected-state
 *  backgrounds and lines carry a little indigo or teal (66 such declarations, C 0.07–0.13). As a surface, a line, a shade
 *  or a paint it is the night itself, so by day it flips like a neutral one (a near-white with a breath of its hue);
 *  without this a panel whose two stops straddle C 0.07 would turn half white, half night. Proposed to the lead as the
 *  H75 refinement (docs/handoff/af-lanes/L5a.md); the parity test (tests/parity/collect.ts) uses the same rule. */
export const NIGHT_L = 0.4, NIGHT_CHROMA = 0.14;
export const isNight = c => c.L < NIGHT_L && c.C < NIGHT_CHROMA;
/** What may change by day besides words: neutral and night colours. */
export const flips = c => isNeutral(c) || isNight(c);
/** WCAG 2 contrast of an OKLCH colour (taken as opaque) against white. */
const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const contrastOnWhite = c => 1.05 / (relLum(fromOklch({...c, a: 1})) + 0.05);
/** The text contrast every coloured word reaches by day against white: 6:1 there keeps ≥ 4.5:1 on the day's near-white
 *  panels and on the light tints the nebula's glows leave on them (Session AE's day words sat at OKLCH L 0.47, about the
 *  same). */
export const TEXT_CONTRAST = 6.6;
/** Session AF (the owner's decision of 19 Oct, ADR-028 H130): by day a gradient word keeps its flow in deeper shades of its own
 *  hues, every coloured stop at least this contrast on white, so the whole word reads at least 4.5:1 on the day's
 *  near-white panels and their light mist (the owner's floor; 3:1 would do for large headings, every heading gets 4.5).
 *  Nebula and Dark are unchanged; the night islands keep their own flow. */
export const GRADIENT_TEXT_CONTRAST = 5.2;
/** A brand mark (the ZIGoals wordmark) keeps its own colours in every theme: a logotype is not a gradient word. */
export const BRAND_MARK_RE = /\.logo-wordmark/;
/** A word in a run-time colour by day: the colour mixed with black, this share kept (the same hue, deeper; ≥ 5:1 on white
 *  for every pillar and area colour, so ≥ 4.5:1 on the day's panels). A colour-mix computes to an sRGB colour every tool
 *  reads (a relative oklch() colour does not parse in the layout audit). */
export const RUNTIME_INK_SHARE = 42;
export const runtimeInk = colour => `color-mix(in srgb, ${colour} ${RUNTIME_INK_SHARE}%, #000)`;
/** A deeper shade of the same hue (Session AF, ADR-028 H13: "a deeper shade of the same hue", text only, never fills): the
 *  lightness is lowered in small steps, hue and chroma kept (sRGB may trim the chroma), until the word reaches
 *  TEXT_CONTRAST on white. A colour that already does is left as it is. Session AE's amber() shift (ADR-027 G22: golds to
 *  hue 62°) is retired: a gold word stays a gold hue by day. */
export function deepen(c, target = TEXT_CONTRAST) {
  if (contrastOnWhite(c) >= target) return c;
  let L = c.L; while (L > 0.05 && contrastOnWhite({...c, L}) < target) L -= 0.005;
  return {...c, L};
}
/** Light by its parts (owner's Light, ADR-028 D9, H13): the page's ground is white with a light mist (hand layers), the
 *  words are black, the heavy backgrounds calm (hand layers), and everything else keeps Nebula's exact colours and finish.
 *  So only neutral colours flip: white-family words become ink, the night's neutral panels and lines become their day
 *  versions, white glass and white icon lines become ink glass and ink lines. A colour with a hue is identity in every role
 *  (fills, chips, tools, charts, rings, pillar colours, glows, gradients, borders, shadows), except a word: a coloured word
 *  that fails on white takes a deeper shade of its own hue (deepen). Gradient words: their white-family stops become ink ("its
 *  white part becomes black, the flow to the right stays") and, by the owner's decision of 19 Oct (H130), their coloured
 *  stops take deeper shades of the same hues (GRADIENT_TEXT_CONTRAST). */
const flipText = c => ({...c, L: clamp(1.03 - c.L, 0.17, 0.42), C: Math.min(c.C, 0.03)});
export const MAPS = {
  light: {
    text: c => isNeutral(c) ? (c.L < 0.58 ? c : flipText(c)) : deepen(c),
    gradientText: c => isNeutral(c) ? (c.L >= 0.58 ? flipText(c) : c) : deepen(c, GRADIENT_TEXT_CONTRAST),
    // Neutral and night only: white glass (light, translucent) becomes ink glass; the night's panels become near-white.
    surface: c => !flips(c) ? c : c.L >= 0.62 ? {...c, L: 0.26, C: Math.min(c.C, 0.04)} : {...c, L: 0.99 - c.L * 0.14, C: c.C * 0.2},
    border: c => !flips(c) ? c : c.L >= 0.5 ? {...c, L: 0.32, a: Math.min(1, c.a * 1.5)} : {...c, L: 0.84, C: c.C * 0.5},
    // A night shade (the night's black shadows) softens on white; a coloured glow keeps its colour.
    shadow: c => !flips(c) ? c : c.L < 0.42 ? {...c, L: 0.36, C: Math.min(c.C, 0.05), a: c.a * 0.4} : {...c, L: Math.min(c.L, 0.7), a: c.a * 0.55},
    graphic: c => !flips(c) ? c : c.L >= 0.6 ? {...c, L: 0.32} : c,
    accent: c => c,
  },
  dark: {
    text: c => c,
    gradientText: c => c,
    // Session AF (L5a, ADR-028 H75): only the night's neutral panels deepen; a coloured fill keeps Nebula's colour.
    surface: c => flips(c) && c.L < 0.5 ? {...c, L: c.L * 0.55, C: c.C * 0.7} : c,
    border: c => c,
    shadow: c => c,
    graphic: c => c,
    accent: c => c,
  },
};
const TEXT_PROPS = new Set(['color', '-webkit-text-fill-color', 'caret-color', 'text-decoration-color', '-webkit-text-stroke-color', 'column-rule-color']);
const GRAPHIC_PROPS = new Set(['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'accent-color']);
const SHADOW_PROPS = new Set(['box-shadow', 'text-shadow', 'filter', '-webkit-filter']);
/** Classes whose background is clipped to their text somewhere in the CSS (filled by buildTheme). */
const TEXT_CLIP_CLASSES = new Set();
/** Session AF (H130): gradient tokens that only ever paint gradient words (each of their values a gradient, referenced only
 *  by the background of a clipped-to-text rule: never a fill, a colour, a line or another token), so their own declarations,
 *  at the root and where a page redefines them (a pillar's flow), take the gradient-word role. */
export const GRADIENT_TEXT_TOKENS = new Set();
const subjectClasses = selector => selector.split(/,(?![^(]*\))/).flatMap(part => { const last = part.trim().split(/[\s>+~]+/).pop() ?? ''; return [...last.matchAll(/\.([\w-]+)/g)].map(m => m[1]); });
export function roleOf(prop, rule) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) {
    if (GRADIENT_TEXT_TOKENS.has(p)) return 'gradientText';
    const parts = new Set(p.slice(2).split('-')), has = (...words) => words.some(w => parts.has(w));
    if (has('shadow', 'glow')) return 'shadow';
    if (has('text', 'muted', 'ink', 'meta', 'strong', 'secondary', 'fg', 'label', 'copy')) return 'text';
    if (has('line', 'edge', 'border', 'rule', 'divider', 'stroke', 'outline', 'track')) return 'border';
    if (has('bg', 'panel', 'surface', 'space', 'card', 'glass', 'backdrop', 'scrim', 'sheet', 'field', 'input', 'deep', 'night', 'dark')) return 'surface';
    return 'accent';
  }
  if (TEXT_PROPS.has(p)) return 'text';
  if (GRAPHIC_PROPS.has(p)) return 'graphic';
  if (SHADOW_PROPS.has(p)) return 'shadow';
  if (p.startsWith('border') || p.startsWith('outline')) return 'border';
  if (p.startsWith('background') || p === 'mask' || p === '-webkit-mask') {
    // Gradient text: the background is what the letters show (the clip may be set by another rule for the same class).
    const clipText = rule.nodes?.some(n => n.type === 'decl' && /^(-webkit-)?background-clip$/.test(n.prop) && /text/.test(n.value)) || subjectClasses(rule.selector ?? '').some(c => TEXT_CLIP_CLASSES.has(c));
    return clipText ? 'gradientText' : 'surface';
  }
  return null;
}
/** Session AF (L5a): the properties a theme rule carries — colours only. A colour shorthand is carried as its colour
 *  longhands (background → background-image + background-color, border[-side] → border[-side]-color, outline →
 *  outline-color; see colourLonghands), so a carried rule never sets, nor resets, a width, a style, a position, a size or
 *  a clip that Nebula sets elsewhere (a `background-clip: text` word stays a word). */
const COLOUR_PROPS = /^(color|-webkit-text-fill-color|caret-color|text-decoration-color|-webkit-text-stroke-color|column-rule-color|fill|stroke|stop-color|flood-color|lighting-color|accent-color|box-shadow|text-shadow|filter|-webkit-filter|background|background-color|background-image|border|border-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end)|border(-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end))?-color|outline|outline-color)$/;
const ANY_COLOR = new RegExp(COLOR_RE.source);
export const hasColour = value => ANY_COLOR.test(value);
export const carriedProp = prop => COLOUR_PROPS.test(prop.toLowerCase());
export const carriesColour = (prop, value) => prop.startsWith('--') ? /var\(/.test(value) || hasColour(value) : carriedProp(prop);
const WIDE = /^(inherit|initial|unset|revert|revert-layer)$/i;
const IMAGE = /^(url|image-set|-webkit-image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient|-webkit-(repeating-)?(linear|radial)-gradient|-webkit-gradient)\(/i;
const COLOUR_TOKEN = new RegExp(`^(${COLOR_RE.source}|transparent|currentcolor|(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)\\(.*\\))$`, 'i');
/** Splits a value at its top-level spaces and slashes. */
const words = text => { const out = []; let depth = 0, cur = ''; for (const ch of text.trim()) { if (ch === '(') depth++; else if (ch === ')') depth--; if (!depth && (/\s/.test(ch) || ch === '/')) { if (cur) out.push(cur); cur = ''; continue; } cur += ch; } if (cur) out.push(cur); return out; };
/**
 * A colour shorthand as its colour longhands: [[prop, value], …], or null where the value cannot be read without the page
 * (a var() that is not a known :root colour, gradient or image is left whole). `kind(word)` names a var() word 'colour',
 * 'image' or null.
 */
export function colourLonghands(prop, value, kind = () => null) {
  const p = prop.toLowerCase(), v = value.trim();
  const side = /^border-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end)$/.exec(p)?.[1];
  if (p === 'border' || side || p === 'outline') {
    const target = p === 'outline' ? 'outline-color' : side ? `border-${side}-color` : 'border-color';
    if (WIDE.test(v)) return [[target, v]];
    const colour = words(v).find(w => COLOUR_TOKEN.test(w) || (/^var\(/i.test(w) && kind(w) !== 'image'));
    return [[target, colour ?? 'currentcolor']];
  }
  if (p !== 'background') return [[prop, value]];
  if (WIDE.test(v)) return [['background-image', v], ['background-color', v]];
  const layers = topLevel(v), images = [];
  let colour = 'transparent';
  for (const [i, layer] of layers.entries()) {
    let image = 'none';
    for (const w of words(layer)) {
      if (IMAGE.test(w) || w === 'none') image = w;
      else if (COLOUR_TOKEN.test(w)) { if (i !== layers.length - 1) return null; colour = w; }
      else if (/^var\(/i.test(w)) { const k = kind(w); if (k === 'image') image = w; else if (k === 'colour' && i === layers.length - 1) colour = w; else return null; }
    }
    images.push(image);
  }
  return [['background-image', images.join(', ')], ['background-color', colour]];
}
/** The top-level comma-separated parts of a string (commas inside parentheses kept). */
const topLevel = text => { const out = []; let depth = 0, from = 0; for (let i = 0; i < text.length; i++) { const ch = text[i]; if (ch === '(') depth++; else if (ch === ')') depth--; else if (ch === ',' && !depth) { out.push(text.slice(from, i)); from = i + 1; } } out.push(text.slice(from)); return out; };
/** Each color-mix() in a value, in order: [start, end] (end exclusive). */
const mixesOf = value => { const out = []; for (let i = value.indexOf('color-mix('); i >= 0; i = value.indexOf('color-mix(', i + 1)) { let depth = 0, j = i + 9; for (; j < value.length; j++) { if (value[j] === '(') depth++; else if (value[j] === ')') { depth--; if (!depth) break; } } out.push([i, j + 1]); i = j; } return out; };
/** A colour mixed in at this share or more is the mix's ground: a tint of an accent over the night's panel. */
const MIX_GROUND = 0.65;
/** Maps every colour in a value by the role's rule. Session AF (L5a): inside a color-mix() of a word-less role (a line, a
 *  fill, a shade) only a dark colour that is the mix's ground flips — it makes up at least MIX_GROUND of the mix, or the
 *  other side brings no hue (a night panel at 70 % over transparent) — so a night panel tinted by an accent becomes a day
 *  panel with the same tint; anything else in a mix keeps its value, so a coloured line or fill mixed from an accent stays
 *  Nebula's colour (a violet line mixed with the night's line colour, a pink line with a white sheen). */
export function mapValue(value, role, theme) {
  let changed = false;
  const map = (text, keep) => text.replace(COLOR_RE, m => {
    const rgba = parseColor(m.toLowerCase());
    if (rgba.some(v => Number.isNaN(v))) return m;
    const c = toOklch(rgba);
    if (keep(c)) return m;
    const next = formatColor(fromOklch(MAPS[theme][role](c)));
    if (next !== formatColor(rgba)) changed = true;
    return next;
  });
  const words = role === 'text' || role === 'gradientText';
  const mixed = segment => {
    const inner = segment.slice('color-mix('.length, -1), parts = topLevel(inner); if (parts.length < 3 || words) return map(segment, () => false);
    const pct = part => { const m = /\s(\d+(?:\.\d+)?)%\s*$/.exec(part); return m ? Number(m[1]) / 100 : null; };
    const [p1, p2] = [pct(parts[1]), pct(parts[2])], s1 = p1 ?? (p2 === null ? 0.5 : 1 - p2), s2 = p2 ?? 1 - s1, total = s1 + s2 || 1;
    // Does a side bring a hue of its own (an accent, a run-time colour, a coloured literal)? Transparent and neutrals do not.
    const hueful = part => /var\(/.test(part) || [...part.matchAll(COLOR_RE)].some(m => { const rgba = parseColor(m[0].toLowerCase()); return !rgba.some(v => Number.isNaN(v)) && !isNeutral(toOklch(rgba)); });
    const sides = [parts[1], parts[2]].map((part, i) => map(part, c => !(c.L < NIGHT_L && ((i ? s2 : s1) / total >= MIX_GROUND || !hueful(i ? parts[1] : parts[2])))));
    return `color-mix(${parts[0]},${sides[0]},${sides[1]})`;
  };
  let out = '', i = 0;
  for (const [a, b] of mixesOf(value)) { out += map(value.slice(i, a), () => false) + mixed(value.slice(a, b)); i = b; }
  out += map(value.slice(i), () => false);
  return changed ? out : null;
}

// ---- selectors ----
// Each override keeps its rule's selector and gains the same small weight (`:not(#\\-)`, one id that no element has), so
// every override beats its own original and the overrides keep exactly the order the originals had among themselves.
// Every colour declaration of a rule is carried (mapped or, for a var() or keyword, as it is), so an override never wins
// over a rule that it should lose to. Light's rules sit in `@scope (:root[data-theme=light]) to (<islands>)`: inside an
// island nothing changes.
const BOOST = ':not(#\\-)';
const PSEUDO_ELEMENT = /(::?(?:before|after|first-line|first-letter|placeholder|selection|marker|backdrop|-webkit-[a-z-]+|-moz-[a-z-]+|part\([^)]*\)|file-selector-button)(?:\([^)]*\))?)+$/;
export function boostSelector(selector) {
  return selector.split(/,(?![^(]*\))/).map(part => {
    // Inside @scope a selector is matched below the scope's root (the <html> element), so a selector that starts at the
    // root (`:root`, `html`) names it as `:scope` instead, with the same weight.
    const s = part.trim().replace(/^:root(?![\w-])/, ':scope').replace(/^html(?![\w-])/, ':scope'); if (!s) return s;
    const pe = PSEUDO_ELEMENT.exec(s);
    return pe ? `${s.slice(0, pe.index)}${BOOST}${pe[0]}` : `${s}${BOOST}`;
  }).join(', ');
}
const touchesIsland = selector => ISLANDS.some(c => new RegExp(`${c.replace('.', '\\.')}(?![\\w-])`).test(selector));



/** Replaces each top-level `var(--name[, fallback])` in a value (balanced parentheses) with fn(name, fallback, whole). */
export function replaceVars(value, fn) {
  let out = '', i = 0;
  while (i < value.length) {
    const at = value.indexOf('var(', i); if (at < 0) { out += value.slice(i); break; }
    out += value.slice(i, at); let depth = 0, j = at + 3;
    for (; j < value.length; j++) { if (value[j] === '(') depth++; else if (value[j] === ')') { depth--; if (!depth) break; } }
    const whole = value.slice(at, j + 1), inner = whole.slice(4, -1), comma = inner.indexOf(',');
    const name = (comma < 0 ? inner : inner.slice(0, comma)).trim(), fallback = comma < 0 ? undefined : inner.slice(comma + 1).trim();
    out += fn(name, fallback, whole); i = j + 1;
  }
  return out;
}

// ---- the build ----
export function buildTheme(theme, files = sourceFiles()) {
  const parsed = files.map(file => [file, postcss.parse(readFileSync(join(WEB, file), 'utf8'), {from: file})]);
  TEXT_CLIP_CLASSES.clear();
  for (const [, ast] of parsed) ast.walkDecls(/^(-webkit-)?background-clip$/, d => { if (/text/.test(d.value) && d.parent?.type === 'rule') for (const c of subjectClasses(d.parent.selector)) TEXT_CLIP_CLASSES.add(c); });
  GRADIENT_TEXT_TOKENS.clear();
  { const inClip = new Set(), elsewhere = new Set(), isClip = rule => (rule.nodes ?? []).some(n => n.type === 'decl' && /^(-webkit-)?background-clip$/.test(n.prop) && /text/.test(n.value)) || subjectClasses(rule.selector ?? '').some(c => TEXT_CLIP_CLASSES.has(c));
    const gradientValued = new Map(); // a token's own values: a gradient-word token is a gradient, never a colour
    for (const [, ast] of parsed) ast.walkDecls(d => {
      if (d.prop.startsWith('--')) gradientValued.set(d.prop, (gradientValued.get(d.prop) ?? true) && /gradient\(/.test(d.value));
      const into = /^background(-image)?$/.test(d.prop) && d.parent?.type === 'rule' && isClip(d.parent) ? inClip : elsewhere;
      replaceVars(d.value, (name, _f, whole) => { into.add(name); return whole; });
    });
    for (const name of inClip) if (!elsewhere.has(name) && gradientValued.get(name)) GRADIENT_TEXT_TOKENS.add(name); }
  // The :root colour tokens (last top-level definition wins) and the tokens something redefines outside :root.
  const tokens = new Map(), local = new Set(), localValues = new Map();
  for (const [, ast] of parsed) ast.walkDecls(d => { if (!d.prop.startsWith('--')) return; const rule = d.parent; if (rule?.type === 'rule' && rule.selector.trim() === ':root' && rule.parent?.type === 'root') tokens.set(d.prop, d.value.trim()); else { local.add(d.prop); localValues.set(d.prop, [...(localValues.get(d.prop) ?? []), d.value.trim()]); } });
  // Session AF (L5a, ADR-028 H13): an accent token (brand, pillar…) keeps its nebula value in every role; used for a word
  // it is written as its ink twin (`--<name>-ink`, equal to the token in Nebula and Dark: components/shell/theme-switch.css)
  // where the token has one, else as the deeper shade itself. A neutral accent value (a white) flips like any neutral.
  // Accent tokens (plain colours or gradients built from them) are resolved to their nebula value, then mapped by the role.
  const resolve = (value, depth = 0) => depth > 4 ? value : replaceVars(value, (name, fallback, whole) => { const v = tokens.get(name) ?? fallback; return v && !local.has(name) ? resolve(v, depth + 1) : whole; });
  const substitute = (value, role, self = '') => theme === 'light' ? replaceVars(value, (name, fallback, whole) => {
    if (roleOf(name, {}) !== 'accent') return whole;
    // A colour set at run time (a pillar's, an area's, a tone's: the token is redefined per element) cannot be read here:
    // a word in it takes the same hue, deeper (runtimeInk).
    if (role === 'text' && (local.has(name) || !tokens.has(name) || /var\(/.test(resolve(tokens.get(name))))) return runtimeInk(whole);
    if (local.has(name) || !tokens.has(name)) return whole;
    const full = resolve(tokens.get(name)); if (/var\(/.test(full) || !hasColour(full)) return whole;
    const mapped = mapValue(full, role, theme); if (mapped === null) return whole;
    return role === 'text' && `${name}-ink` !== self && tokens.has(`${name}-ink`) && !local.has(`${name}-ink`) ? `var(${name}-ink)` : mapped;
  }) : value;
  const pinMixTokens = value => { let out = '', i = 0; for (const [a, b] of mixesOf(value)) { out += value.slice(i, a) + replaceVars(value.slice(a, b), (name, fallback, whole) => { if (local.has(name) || !tokens.has(name) || roleOf(name, {}) === 'accent') return whole; const full = resolve(tokens.get(name)).trim(); return new RegExp(`^(${COLOR_RE.source})$`).test(full) ? full : whole; }); i = b; } return out + value.slice(i); };
  /** A rule that paints its own opaque coloured fill (a nebula button, a chosen chip, a pillar badge) keeps its words as
   *  by night: the fill is the same by day, so are the words on it. */
  // (A colour inside a color-mix() counts only where it is the mix's larger part: a tint is not a fill.)
  const fillColours = value => { let out = '', i = 0; for (const [a, b] of mixesOf(value)) { const parts = topLevel(value.slice(a + 'color-mix('.length, b - 1)); out += value.slice(i, a); if (parts.length >= 3) { const pct = part => { const m = /\s(\d+(?:\.\d+)?)%\s*$/.exec(part); return m ? Number(m[1]) / 100 : null; }; const [p1, p2] = [pct(parts[1]), pct(parts[2])], s1 = p1 ?? (p2 === null ? 0.5 : 1 - p2); out += ' ' + (s1 >= 0.5 ? parts[1] : parts[2]) + ' '; } i = b; } return out + value.slice(i); };
  const ownFill = rule => (rule.nodes ?? []).some(d => d.type === 'decl' && /^background(-color|-image)?$/.test(d.prop) && [...fillColours(resolve(d.value)).matchAll(COLOR_RE)].some(m => { const rgba = parseColor(m[0].toLowerCase()); if (rgba.some(v => Number.isNaN(v))) return false; const c = toOklch(rgba); return !flips(c) && c.a >= 0.5; }));
  const scope = theme === 'light' ? `(:root[data-theme=light]) to (${ISLANDS.join(', ')})` : '(:root[data-theme=dark])';
  // What a var() word in a background or border shorthand stands for, read from the :root tokens.
  // (A token redefined per element is read from every value it is given: all images, or all colours.)
  const kindOf = value => { const full = resolve(value).trim(); if (/var\(/.test(full)) return null; return IMAGE.test(full) || topLevel(full).length > 1 || full === 'none' ? 'image' : COLOUR_TOKEN.test(full) ? 'colour' : null; };
  const kind = word => { const direct = kindOf(word); if (direct) return direct; const m = /^var\(\s*(--[\w-]+)\s*(?:,(.*))?\)$/s.exec(word.trim()); if (!m) return null; const kinds = new Set([tokens.get(m[1]), ...(localValues.get(m[1]) ?? []), m[2]].filter(Boolean).map(v => kindOf(v.trim()))); return kinds.size === 1 ? [...kinds][0] : null; };
  /** A rule's colour declarations as the theme writes them, and whether any of them changed. */
  const colourDecls = rule => {
    const decls = []; let mapped = false;
    const keepWords = theme === 'light' && ownFill(rule);
    for (const d of rule.nodes ?? []) {
      if (d.type !== 'decl') continue;
      const role0 = roleOf(d.prop, rule); if (!role0 || !carriesColour(d.prop, d.value)) continue;
      const isToken = d.prop.startsWith('--'), atRoot = rule.selector.trim() === ':root';
      // A shorthand that cannot be read is kept whole, followed by the rule's own longhands it would reset (its clip, size…).
      const parts = isToken ? [[d.prop, d.value]] : colourLonghands(d.prop, d.value, kind) ?? [[d.prop, d.value], ...(rule.nodes ?? []).filter(n => n.type === 'decl' && n !== d && new RegExp(`^(-webkit-)?${d.prop}-`).test(n.prop) && !carriedProp(n.prop)).map(n => [n.prop, n.value])];
      for (const [prop, value] of parts) {
        const role = roleOf(prop, rule) ?? role0;
        if (theme === 'light' && role === 'gradientText' && BRAND_MARK_RE.test(rule.selector ?? '')) continue; // H130: the wordmark keeps its colours
        if (keepWords && role === 'text' && !isToken) { decls.push(postcss.decl({prop, value, important: d.important})); continue; }
        // The value's own colours are mapped first, then its accent tokens are written out (each mapped once). Inside a
        // color-mix() of a word-less role a token that has a day value of its own (a line, a panel) is written as its
        // Nebula colour, so mapValue's mix rule decides for it too.
        const pinned = theme === 'light' && role !== 'text' && role !== 'gradientText' ? pinMixTokens(value) : value;
        const literal = mapValue(pinned, role, theme) ?? pinned, swapped = isToken && !atRoot && role !== 'gradientText' ? literal : substitute(literal, role, prop);
        if (swapped !== value) mapped = true;
        decls.push(postcss.decl({prop, value: swapped, important: d.important}));
      }
    }
    return {decls, mapped};
  };
  // Every rule with a colour declaration is carried, changed or not, each with the same one id of weight: among the
  // sheet's rules the cascade is then Nebula's own (a chosen chip's colour still wins over its base rule's day colour; a
  // var()-only rule still wins over a literal one). Colour longhands only, so nothing else Nebula sets is overruled.
  const rules = [];
  for (const [file, ast] of parsed) ast.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    if (theme === 'light' && touchesIsland(rule.selector)) return;
    const {decls, mapped} = colourDecls(rule); if (decls.length) rules.push({file, rule, decls, mapped});
  });
  const out = postcss.root();
  let block = null, blockFile = null;
  for (const {file, rule, decls} of rules) {
    if (blockFile !== file) { block = postcss.atRule({name: 'scope', params: scope}); blockFile = file; out.append(postcss.comment({text: ` ${file} `})); out.append(block); }
    let node = postcss.rule({selector: boostSelector(rule.selector)}); node.append(decls);
    for (let p = rule.parent; p && p.type === 'atrule'; p = p.parent) { const wrap = postcss.atRule({name: p.name, params: p.params}); wrap.append(node); node = wrap; }
    block.append(node);
  }
  // Light: the islands keep the nebula's own token values (tokens are inherited, so the scope's limit alone would not),
  // the ink twins included (inside an island a word keeps its night colour).
  if (theme === 'light') {
    const restore = [...tokens].filter(([prop, value]) => roleOf(prop, {}) !== 'accent' && (mapValue(value, roleOf(prop, {}), theme) !== null || prop.endsWith('-ink') && substitute(value, 'text') !== value || GRADIENT_TEXT_TOKENS.has(prop))); // H130: a gradient word's token made of other tokens is deep by day too
    if (restore.length) { const r = postcss.rule({selector: `:root[data-theme=light] :is(${ISLANDS.join(', ')})`}); r.append(restore.map(([prop, value]) => postcss.decl({prop, value}))); r.append(postcss.decl({prop: 'color', value: 'var(--text)'})); out.append(postcss.comment({text: ' the islands keep the nebula tokens '})); out.append(r); }
  }
  const head = `/* Generated by scripts/themes/build-themes.mjs (Session AD, ADR-026 F13) from the app's own CSS. Do not edit: change\n   the mapping there or apps/web/themes/${theme}.extra.css, then run it again. */\n`;
  return head + out.toString().replace(/\n{3,}/g, '\n\n') + '\n' + handLayers(theme).map(file => `/* ${relative(ROOT, file)} */\n` + readFileSync(file, 'utf8')).join('');
}

/** The theme's hand-written layers: <theme>.extra.css first, then any <theme>.<part>.css (Session AE: one file per area, so
 *  parallel work never shares a file), in name order. */
export function handLayers(theme) {
  const dir = join(WEB, 'themes'), extra = join(dir, `${theme}.extra.css`);
  const parts = existsSync(dir) ? readdirSync(dir).filter(name => name.startsWith(`${theme}.`) && name.endsWith('.css') && name !== `${theme}.extra.css`).sort().map(name => join(dir, name)) : [];
  return [...(existsSync(extra) ? [extra] : []), ...parts];
}

/**
 * The one script that runs before the page paints (ADR-026 F5; TIER 3 security headers/CSP), served as a same-origin file
 * (public/theme-boot.js) and loaded by the root layout with the request's CSP nonce, synchronously in <head>. It reads the
 * theme from this device's own display record (zigoals:ui-prefs:v1) and, for Light or Dark only, sets data-theme on <html>
 * and adds that theme's same-origin stylesheet; while the sheet loads the page stays unpainted (data-theme-loading, at most
 * 1.5 s). Nebula, no record, unreadable bytes or storage refused: nothing. No Trusted Types sink (an attribute and a link).
 */
export function bootScript(sheets) {
  const map = JSON.stringify(sheets);
  return `/* ZIGoals theme bootstrap (generated by scripts/themes/build-themes.mjs; Session AD, ADR-026 F5). */\n(function(){try{var d=document.documentElement,r=localStorage.getItem("zigoals:ui-prefs:v1");if(!r)return;var p=JSON.parse(r),m=${map},t=p&&p.version===1&&typeof p.theme==="string"?p.theme:"";if(!Object.prototype.hasOwnProperty.call(m,t))return;var s=m[t];d.setAttribute("data-theme",t);d.setAttribute("data-theme-loading","");var l=document.createElement("link"),done=function(){d.removeAttribute("data-theme-loading")};l.id="zigoals-theme-sheet";l.rel="stylesheet";l.href=s;l.setAttribute("blocking","render");l.onload=done;l.onerror=function(){d.removeAttribute("data-theme");done();l.remove()};setTimeout(done,1500);document.head.appendChild(l)}catch(e){}})();\n`;
}

export function buildAll() {
  const files = sourceFiles(), sheets = {}, hashes = {};
  for (const theme of ['light', 'dark']) { sheets[theme] = buildTheme(theme, files); hashes[theme] = createHash('sha256').update(sheets[theme]).digest('hex').slice(0, 12); }
  const sheetsMap = {light: `/themes/light.css?v=${hashes.light}`, dark: `/themes/dark.css?v=${hashes.dark}`};
  const boot = bootScript(sheetsMap), bootHash = createHash('sha256').update(boot).digest('hex').slice(0, 12);
  const sheetModule = `// Generated by scripts/themes/build-themes.mjs (Session AD, Part 3): the theme stylesheets and the early script, with\n// their content hashes.\nexport const THEME_SHEETS = ${JSON.stringify(sheetsMap).replace(/"(light|dark)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')} as const;\nexport const THEME_BOOT_SRC = '/theme-boot.js?v=${bootHash}';\n`;
  return {sheets, module: sheetModule, boot};
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const {sheets, module: sheetModule, boot} = buildAll(), check = process.argv.includes('--check');
  const targets = [[join(WEB, 'public', 'themes', 'light.css'), sheets.light], [join(WEB, 'public', 'themes', 'dark.css'), sheets.dark], [join(WEB, 'public', 'theme-boot.js'), boot], [join(WEB, "lib", "ui-prefs", "theme-sheets.ts"), sheetModule]];
  let stale = 0;
  for (const [file, text] of targets) {
    if (check) { if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { console.error(`stale: ${relative(ROOT, file)}`); stale++; } }
    else { mkdirSync(dirname(file), {recursive: true}); writeFileSync(file, text); console.log(`${relative(ROOT, file)} ${text.length} bytes`); }
  }
  if (stale) process.exit(1);
}
