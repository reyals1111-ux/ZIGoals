import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema} from './schema';
import * as GENERATED from './theme-sheets';

/**
 * Session AV lane 2 (LEDGER #34 Notion's high contrast, N6 #191 Loop's pure black): Dark's style, chosen in Settings →
 * Appearance → Customize and used whenever Dark is on: "standard" (Dark as it is, the default and never stored), "black"
 * (Pure black: true black ground for OLED screens) or "contrast" (High contrast: white words on black, every word at
 * least 7:1, strong focus rings). Kept as `look.darkStyle` in this device's own `zigoals:ui-prefs:v1` (never synced);
 * public/theme-boot.js applies it before the first paint. On the page it is `data-dark-style` on <html> plus the style's
 * generated sheet (scripts/themes/build-themes.mjs DARK_STYLES), both only while Dark is on.
 */
export const DARK_STYLES = ['standard', 'black', 'contrast'] as const;
export type DarkStyle = typeof DARK_STYLES[number];
export const DARK_STYLE_EVENT = 'zigoals-dark-style';
export const DARK_STYLE_ATTRIBUTE = 'data-dark-style';
const SHEET_ID = 'zigoals-dark-style-sheet';

/** The style's generated sheet (theme-sheets.ts, written by the generator with its content hash). */
export function darkStyleSheet(style: Exclude<DarkStyle, 'standard'>): string {
  // Read by name, not imported by name: the generator adds DARK_STYLE_SHEETS when it next runs.
  const sheets = Reflect.get(GENERATED, 'DARK_STYLE_SHEETS') as Partial<Record<string, string>> | undefined;
  return sheets?.[style] ?? `/themes/dark-${style}.css`;
}
export function darkStyleOf(prefs: unknown): DarkStyle {
  const look = prefs && typeof prefs === 'object' ? (prefs as {look?: unknown}).look : undefined;
  const value = look && typeof look === 'object' ? (look as {darkStyle?: unknown}).darkStyle : undefined;
  return value === 'black' || value === 'contrast' ? value : 'standard';
}
export function readDarkStyle(storage: Pick<Storage, 'getItem'> | null = safeLocal()): DarkStyle {
  try { const raw = storage?.getItem(UI_PREFS_KEY); if (!raw) return 'standard'; const parsed = uiPrefsSchema.safeParse(JSON.parse(raw)); return parsed.success ? darkStyleOf(parsed.data) : 'standard'; } catch { return 'standard'; }
}
/** Stores the style, keeping every other field of the record and of its `look` group (Standard removes the field). */
export function writeDarkStyle(style: DarkStyle, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocal()): void {
  if (!storage) throw Error('This browser could not save your choice.');
  let record: Record<string, unknown> = {version: 1};
  try { const raw = storage.getItem(UI_PREFS_KEY); if (raw) { const parsed = uiPrefsSchema.safeParse(JSON.parse(raw)); if (parsed.success) record = parsed.data; } } catch { /* a fresh record */ }
  const group: Record<string, unknown> = {...(record.look && typeof record.look === 'object' ? record.look as Record<string, unknown> : {})};
  if (style === 'standard') delete group.darkStyle; else group.darkStyle = style;
  for (const key of Object.keys(group)) if (group[key] === undefined) delete group[key];
  const next = {...record};
  if (Object.keys(group).length) next.look = group; else delete next.look;
  storage.setItem(UI_PREFS_KEY, JSON.stringify(next));
}
/**
 * Puts the style on the page: with Dark on and a style chosen, the attribute and the style's sheet; otherwise neither.
 * A sheet that fails takes the attribute away (the page stays Dark).
 */
export function applyDarkStyle(style: DarkStyle, doc: Document = document): void {
  const root = doc.documentElement, on = root.dataset.theme === 'dark' && style !== 'standard';
  let link = doc.getElementById(SHEET_ID) as HTMLLinkElement | null;
  if (!on) { root.removeAttribute(DARK_STYLE_ATTRIBUTE); link?.remove(); return; }
  const href = darkStyleSheet(style as Exclude<DarkStyle, 'standard'>);
  root.setAttribute(DARK_STYLE_ATTRIBUTE, style);
  if (link?.getAttribute('href') === href) return;
  if (!link) { link = doc.createElement('link'); link.id = SHEET_ID; link.rel = 'stylesheet'; doc.head.appendChild(link); }
  const sheet = link;
  sheet.addEventListener('error', () => { if (sheet.isConnected && sheet.getAttribute('href') === href) { sheet.remove(); if (root.getAttribute(DARK_STYLE_ATTRIBUTE) === style) root.removeAttribute(DARK_STYLE_ATTRIBUTE); } }, {once: true});
  sheet.href = href;
}
/** Choose: store, show, and tell the other readers on the page (other tabs hear the storage event). */
export function chooseDarkStyle(style: DarkStyle): void {
  writeDarkStyle(style);
  applyDarkStyle(style);
  window.dispatchEvent(new Event(DARK_STYLE_EVENT));
}
function safeLocal(): Storage | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
