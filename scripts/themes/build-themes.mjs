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
/** Light keeps these dark: cosmic artwork with light text on it. */
export const ISLANDS = ['.today-hero', '.site-footer', '.app-sidebar', '.destination-panel', '.account-panel', '.stake-hero', '.staking-card', '.phone-more-signature', '.hero-star', '.how-it-works-dialog', '.logo-intro', '.ai-launcher', '.ai-edge-tab', '.music-launcher-stack', '.music-edge-tab', '.zigi-figure-stage', '.theme-switch-wrap', '.goal-card-art'];

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
export const MAPS = {
  light: {
    text: c => c.L < 0.58 ? c : c.C < 0.06 ? {...c, L: clamp(1.03 - c.L, 0.17, 0.42), C: Math.min(c.C, 0.03)} : {...c, L: 0.47, C: Math.min(c.C, 0.17)},
    surface: c => c.C >= 0.09 && c.L >= 0.55 ? {...c, L: Math.min(c.L, 0.74)} : c.L >= 0.62 && c.C < 0.09 ? {...c, L: 0.26, C: Math.min(c.C, 0.04)} : {...c, L: 0.985 - c.L * 0.2, C: c.C * 0.32},
    border: c => c.C >= 0.07 ? {...c, L: Math.min(c.L, 0.6), a: Math.min(1, c.a * 1.4)} : c.L >= 0.5 ? {...c, L: 0.32, a: Math.min(1, c.a * 1.5)} : {...c, L: 0.84, C: c.C * 0.5},
    shadow: c => c.L < 0.42 ? {...c, L: 0.36, C: Math.min(c.C, 0.05), a: c.a * 0.4} : {...c, L: Math.min(c.L, 0.7), a: c.a * 0.55},
    graphic: c => c.C >= 0.07 ? {...c, L: Math.min(c.L, 0.62)} : c.L >= 0.6 ? {...c, L: 0.32} : c,
    accent: c => c,
  },
  dark: {
    text: c => c,
    surface: c => c.L < 0.5 ? {...c, L: c.L * 0.55, C: c.C * 0.7} : c,
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
const subjectClasses = selector => selector.split(/,(?![^(]*\))/).flatMap(part => { const last = part.trim().split(/[\s>+~]+/).pop() ?? ''; return [...last.matchAll(/\.([\w-]+)/g)].map(m => m[1]); });
export function roleOf(prop, rule) {
  const p = prop.toLowerCase();
  if (p.startsWith('--')) {
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
    return clipText ? 'text' : 'surface';
  }
  return null;
}
export function mapValue(value, role, theme) {
  let changed = false;
  const out = value.replace(COLOR_RE, m => {
    const rgba = parseColor(m.toLowerCase());
    if (rgba.some(v => Number.isNaN(v))) return m;
    const next = formatColor(fromOklch(MAPS[theme][role](toOklch(rgba))));
    if (next !== formatColor(rgba)) changed = true;
    return next;
  });
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
  // The :root colour tokens (last top-level definition wins) and the tokens something redefines outside :root.
  const tokens = new Map(), local = new Set();
  for (const [, ast] of parsed) ast.walkDecls(d => { if (!d.prop.startsWith('--')) return; const rule = d.parent; if (rule?.type === 'rule' && rule.selector.trim() === ':root' && rule.parent?.type === 'root') tokens.set(d.prop, d.value.trim()); else local.add(d.prop); });
  // An accent token (brand, pillar…) used for text, a line or a paint is written out with that role's colour by day.
  // Accent tokens (plain colours or gradients built from them) are resolved to their nebula value, then mapped by the role.
  const resolve = (value, depth = 0) => depth > 4 ? value : replaceVars(value, (name, fallback, whole) => { const v = tokens.get(name) ?? fallback; return v && !local.has(name) ? resolve(v, depth + 1) : whole; });
  const substitute = (value, role) => theme === 'light' ? replaceVars(value, (name, fallback, whole) => {
    const v = tokens.get(name) ?? (tokens.has(name) ? undefined : null); if (local.has(name) || roleOf(name, {}) !== 'accent' || !tokens.has(name)) return whole;
    const full = resolve(v); if (/var\(/.test(full)) return whole;
    COLOR_RE.lastIndex = 0; const coloured = COLOR_RE.test(full); COLOR_RE.lastIndex = 0; if (!coloured) return whole;
    return mapValue(full, role, theme) ?? full;
  }) : value;
  const scope = theme === 'light' ? `(:root[data-theme=light]) to (${ISLANDS.join(', ')})` : '(:root[data-theme=dark])';
  const out = postcss.root();
  for (const [file, ast] of parsed) {
    const block = postcss.atRule({name: 'scope', params: scope}); let any = false;
    ast.walkRules(rule => {
      if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
      if (theme === 'light' && touchesIsland(rule.selector)) return;
      const decls = []; let mapped = false;
      for (const d of rule.nodes ?? []) {
        if (d.type !== 'decl') continue;
        const role = roleOf(d.prop, rule); if (!role) continue;
        if (d.prop.startsWith('--') && !(rule.selector.trim() === ':root')) { const v = mapValue(d.value, role, theme); if (v !== null) { decls.push(postcss.decl({prop: d.prop, value: v, important: d.important})); mapped = true; } continue; }
        if (d.prop.startsWith('--') && !COLOR_RE.test(d.value) && !/var\(/.test(d.value)) { COLOR_RE.lastIndex = 0; continue; }
        COLOR_RE.lastIndex = 0;
        const swapped = substitute(d.value, role), v = mapValue(swapped, role, theme) ?? (swapped !== d.value ? swapped : null);
        if (v !== null) mapped = true;
        decls.push(postcss.decl({prop: d.prop, value: v ?? d.value, important: d.important}));
      }
      if (!mapped) return;
      let node = postcss.rule({selector: boostSelector(rule.selector)}); node.append(decls);
      for (let p = rule.parent; p && p.type === 'atrule'; p = p.parent) { const wrap = postcss.atRule({name: p.name, params: p.params}); wrap.append(node); node = wrap; }
      block.append(node); any = true;
    });
    if (any) { out.append(postcss.comment({text: ` ${file} `})); out.append(block); }
  }
  // Light: the islands keep the nebula's own token values (tokens are inherited, so the scope's limit alone would not).
  if (theme === 'light') {
    const restore = [...tokens].filter(([prop, value]) => roleOf(prop, {}) !== 'accent' && mapValue(value, roleOf(prop, {}), theme) !== null);
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
