import {UI_PREFS_KEY} from '../ab-design-keys';
import {uiPrefsSchema, type UiPrefs} from './schema';
import {LOOK_SHEETS} from './theme-sheets';

/**
 * Session AJ (item 32, D5): Settings → Appearance → Customize — font, text size, density and glow, on this device only.
 * Like the theme (lib/ui-prefs/theme.ts) the choice lives in this device's own `zigoals:ui-prefs:v1` record in plain
 * localStorage (the `look` group), so public/theme-boot.js can apply it before the first paint; never synced. A default
 * is never stored: choosing it removes its field, and the group goes when it is empty. On the page each choice that is
 * not the default is one attribute on <html> (app/customize.css; Large text and Compact add their generated sheets).
 */
export type Look = {font: 'system' | 'inter'; textSize: 'standard' | 'large'; density: 'comfortable' | 'compact'; glow: 'full' | 'soft'};
export type LookKey = keyof Look;
export const DEFAULT_LOOK: Look = {font: 'system', textSize: 'standard', density: 'comfortable', glow: 'full'};
export const LOOK_CHOICES: {[K in LookKey]: readonly Look[K][]} = {font: ['system', 'inter'], textSize: ['standard', 'large'], density: ['comfortable', 'compact'], glow: ['full', 'soft']};
/** The <html> attribute each choice sets when it is not the default (public/theme-boot.js sets the same ones). */
export const LOOK_ATTRIBUTE: Record<LookKey, string> = {font: 'data-font', textSize: 'data-text', density: 'data-density', glow: 'data-glow'};
export const LOOK_EVENT = 'zigoals-look';
const LOOK_KEYS = Object.keys(DEFAULT_LOOK) as LookKey[];
/** The generated sheet a choice needs, with the id the early script gives its link. */
const SHEET: Partial<Record<LookKey, {id: string; href: string}>> = {
  textSize: {id: 'zigoals-text-sheet', href: LOOK_SHEETS.text},
  density: {id: 'zigoals-density-sheet', href: LOOK_SHEETS.density},
};

/** The look a record asks for: each field this build cannot read reads as its default. */
export function lookOf(prefs: Pick<UiPrefs, 'look'> | null | undefined): Look {
  const stored = (prefs?.look ?? {}) as Partial<Record<LookKey, unknown>>;
  const out = {...DEFAULT_LOOK} as Record<LookKey, string>;
  for (const key of LOOK_KEYS) { const value = stored[key]; if (typeof value === 'string' && (LOOK_CHOICES[key] as readonly string[]).includes(value)) out[key] = value; }
  return out as Look;
}
/** The <html> attributes a record's look sets: one per choice that is not the default (none for the defaults). */
export function lookAttributes(prefs: Pick<UiPrefs, 'look'> | null | undefined): Record<string, string> {
  const look = lookOf(prefs), out: Record<string, string> = {};
  for (const key of LOOK_KEYS) if (look[key] !== DEFAULT_LOOK[key]) out[LOOK_ATTRIBUTE[key]] = look[key];
  return out;
}
/** Whether every choice is the default. */
export const isDefaultLook = (look: Look): boolean => LOOK_KEYS.every(key => look[key] === DEFAULT_LOOK[key]);

export function readLook(storage: Pick<Storage, 'getItem'> | null = safeLocal()): Look {
  try { const raw = storage?.getItem(UI_PREFS_KEY); if (!raw) return DEFAULT_LOOK; const parsed = uiPrefsSchema.safeParse(JSON.parse(raw)); return parsed.success ? lookOf(parsed.data) : DEFAULT_LOOK; } catch { return DEFAULT_LOOK; }
}
/** The record with this look: only the choices that are not the default are stored (and fields a newer build added to
 *  the group are kept); the group goes when nothing is left in it. Every other field stays as it is. */
export function withLook(record: Record<string, unknown>, look: Look): Record<string, unknown> {
  const group: Record<string, unknown> = {...(typeof record.look === 'object' && record.look !== null ? record.look as Record<string, unknown> : {})};
  for (const key of LOOK_KEYS) { if (look[key] === DEFAULT_LOOK[key]) delete group[key]; else group[key] = look[key]; }
  for (const key of Object.keys(group)) if (group[key] === undefined) delete group[key];
  const next = {...record};
  if (Object.keys(group).length) next.look = group; else delete next.look;
  return next;
}
/** Stores the look, keeping every other field of the record (unreadable bytes are replaced only by a fresh record). */
export function writeLook(look: Look, storage: Pick<Storage, 'getItem' | 'setItem'> | null = safeLocal()): void {
  if (!storage) throw Error('This browser could not save your choice.');
  let record: Record<string, unknown> = {version: 1};
  try { const raw = storage.getItem(UI_PREFS_KEY); if (raw) { const parsed = uiPrefsSchema.safeParse(JSON.parse(raw)); if (parsed.success) record = parsed.data; } } catch { /* a fresh record */ }
  storage.setItem(UI_PREFS_KEY, JSON.stringify(withLook(record, look)));
}
/** Puts a look on the page now: sets or removes each attribute on <html>, and adds or removes the sheets it needs. */
export function applyLook(look: Look, doc: Document = document): void {
  const root = doc.documentElement, attrs = lookAttributes({look});
  for (const key of LOOK_KEYS) {
    const name = LOOK_ATTRIBUTE[key], value = attrs[name], sheet = SHEET[key];
    if (value) root.setAttribute(name, value); else root.removeAttribute(name);
    if (!sheet) continue;
    const link = doc.getElementById(sheet.id) as HTMLLinkElement | null;
    if (!value) { link?.remove(); continue; }
    if (link) continue;
    const added = doc.createElement('link'); added.id = sheet.id; added.rel = 'stylesheet';
    added.addEventListener('error', () => { if (added.isConnected) { added.remove(); if (root.getAttribute(name) === value) root.removeAttribute(name); } });
    added.href = sheet.href; doc.head.appendChild(added);
  }
}
/** Choose: store, show, and tell the other readers on the page (other tabs hear the storage event). */
export function chooseLook(look: Look): void {
  writeLook(look);
  applyLook(look);
  window.dispatchEvent(new Event(LOOK_EVENT));
}
function safeLocal(): Storage | null { try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; } }
