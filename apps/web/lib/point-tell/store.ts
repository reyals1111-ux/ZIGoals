import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {POINT_TELL_KEY} from '../ab-cloud-device-keys';

/**
 * Session AB-Cloud Part 6 (ADR-023 C23): "Point & tell", a feedback mode. With the switch on (Settings → Help &
 * diagnostics), a small button lets the person pick any part of a page and leave a numbered note on it; the notes are
 * listed, edited, removed (with Undo) and exported as plain text: copied, downloaded, or put into the feedback email.
 * Device-only (`zigoals:point-tell:v1`, loose, v1): never synced, exported by Export everything, removed by the account
 * erase, never restored (it describes this screen).
 *
 * A pin keeps what a person reading the note needs and nothing private: the page path (no query or hash), a readable
 * name of the part (its region name, label or heading, at most 120 characters), an optional selector to find it again
 * on this device (a `data-region`, an id, or a short tag path), the note, and when it was written.
 */
export {POINT_TELL_KEY};
export const MAX_PINS = 100, MAX_NOTE = 1000, MAX_TARGET = 120;
export const pinSchema = z.looseObject({
  id: z.string().regex(/^pin-[a-z0-9-]{8,60}$/),
  n: z.number().int().min(1).max(9999),
  path: z.string().regex(/^\/[A-Za-z0-9/_.-]{0,200}$/),
  target: z.string().trim().min(1).max(MAX_TARGET),
  selector: z.string().max(300).optional(),
  note: z.string().max(MAX_NOTE),
  at: z.iso.datetime(),
});
export const pointTellSchema = z.looseObject({version: z.literal(1), enabled: z.boolean().optional(), pins: z.array(pinSchema).max(MAX_PINS).optional()});
export type Pin = z.infer<typeof pinSchema>;
export type PointTell = z.infer<typeof pointTellSchema>;
export const emptyPointTell = (): PointTell => ({version: 1});
export const POINT_TELL: DeviceRecordSpec<PointTell> = {key: POINT_TELL_KEY, schema: pointTellSchema, empty: emptyPointTell};

export const setPointTellEnabled = (r: PointTell, enabled: boolean): PointTell => pointTellSchema.parse({...r, enabled});
/** The page path a pin keeps: no query string or hash (they can hold ids). */
export const pinPath = (pathname: string) => (pathname.split(/[?#]/)[0] || '/').replace(/[^A-Za-z0-9/_.-]/g, '').slice(0, 201) || '/';
const clip = (text: string, max: number) => { const t = text.replace(/\s+/g, ' ').trim(); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };
export function addPin(r: PointTell, pin: {id: string; path: string; target: string; selector?: string; note: string; at: string}): PointTell {
  const pins = r.pins ?? [];
  if (pins.length >= MAX_PINS) throw Error(`Point & tell keeps up to ${MAX_PINS} notes. Export and clear some first.`);
  const n = pins.reduce((m, p) => Math.max(m, p.n), 0) + 1;
  return pointTellSchema.parse({...r, pins: [...pins, {...pin, path: pinPath(pin.path), target: clip(pin.target, MAX_TARGET) || 'This part of the page', note: pin.note.slice(0, MAX_NOTE), n}]});
}
export const editPin = (r: PointTell, id: string, note: string): PointTell => pointTellSchema.parse({...r, pins: (r.pins ?? []).map(p => p.id === id ? {...p, note: note.slice(0, MAX_NOTE)} : p)});
export const removePin = (r: PointTell, id: string): PointTell => pointTellSchema.parse({...r, pins: (r.pins ?? []).filter(p => p.id !== id)});
/** Undo of a removal: the pin back in its place (by number). */
export const restorePin = (r: PointTell, pin: Pin): PointTell => (r.pins ?? []).some(p => p.id === pin.id) ? r : pointTellSchema.parse({...r, pins: [...(r.pins ?? []), pin].sort((a, b) => a.n - b.n)});
export const clearPins = (r: PointTell): PointTell => pointTellSchema.parse({...r, pins: []});

/** The notes as plain text (Markdown-friendly), one block per pin in number order. */
export function pinsText(pins: readonly Pin[], meta: {version: string; at: string}): string {
  const lines = [`ZIGoals Point & tell notes (${pins.length}) · app ${meta.version} · ${meta.at.slice(0, 10)}`, ''];
  for (const p of [...pins].sort((a, b) => a.n - b.n)) lines.push(`${p.n}. ${p.path} — ${p.target}`, p.note ? `   ${p.note.replace(/\n/g, '\n   ')}` : '   (no note)', '');
  return lines.join('\n').trimEnd() + '\n';
}
/** The feedback email with the notes as its body, shortened to what a mail link carries safely. */
export const MAILTO_BODY_MAX = 1800;
export function pinsMailto(address: string, text: string): string {
  const body = text.length > MAILTO_BODY_MAX ? `${text.slice(0, MAILTO_BODY_MAX)}\n… (more notes: use Download or Copy and paste them here)` : text;
  return `mailto:${address}?subject=${encodeURIComponent('ZIGoals Point & tell notes')}&body=${encodeURIComponent(body)}`;
}

/** A readable name for a picked element: its region, its label, its heading, else its own text (never a form value). */
export function describeTarget(el: Element): {target: string; selector: string} {
  const region = el.closest('[data-region]');
  const labelled = el.closest('[aria-label],[aria-labelledby]');
  const section = el.closest('section,article,aside,nav,form,dialog,[role=region],[role=dialog],main');
  const heading = section?.querySelector('h1,h2,h3,h4,legend,[role=heading]');
  const own = el.closest('button,a,label,summary,h1,h2,h3,h4,th,[role=button],[role=tab],[role=link]');
  const labelOf = (node: Element | null): string => {
    if (!node) return '';
    const by = node.getAttribute('aria-labelledby');
    if (by) { const text = by.split(/\s+/).map(id => node.ownerDocument.getElementById(id)?.textContent ?? '').join(' '); if (text.trim()) return text; }
    return node.getAttribute('aria-label') ?? '';
  };
  const ownText = own && !(own instanceof HTMLInputElement) ? (own.getAttribute('aria-label') || own.textContent || '') : '';
  const parts = [ownText, region?.getAttribute('data-region') ?? '', labelOf(labelled), heading?.textContent ?? ''].map(t => clip(t, 60)).filter(Boolean);
  const unique = parts.filter((t, i) => parts.indexOf(t) === i).slice(0, 2);
  return {target: clip(unique.join(' · ') || el.tagName.toLowerCase(), MAX_TARGET), selector: selectorOf(el)};
}
/** A short selector to find the element again on this device: a data-region, an id, or up to four tag:nth-of-type steps. */
export function selectorOf(el: Element): string {
  const region = el.closest('[data-region]');
  if (region) { const v = region.getAttribute('data-region')!; if (/^[\w-]{1,80}$/.test(v)) return `[data-region="${v}"]`; }
  const steps: string[] = [];
  let node: Element | null = el;
  while (node && steps.length < 4 && node.tagName !== 'BODY' && node.tagName !== 'HTML') {
    if (node.id && /^[A-Za-z][\w-]{0,60}$/.test(node.id)) { steps.unshift(`#${node.id}`); break; }
    const parent: Element | null = node.parentElement, tag = node.tagName.toLowerCase();
    const index = parent ? [...parent.children].filter(c => c.tagName === node!.tagName).indexOf(node) + 1 : 1;
    steps.unshift(`${tag}:nth-of-type(${index})`);
    node = parent;
  }
  return steps.join(' > ').slice(0, 300);
}
