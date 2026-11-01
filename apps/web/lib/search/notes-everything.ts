import type {z} from 'zod';
import {readDeviceRecord} from '../device-record';
import {getAppStorage} from '../showcase-storage';
import {noteHref, habitHref} from '../notes/links';
import {NOTES, noteName, type Note} from '../notes/schema';
import {normalize} from './engine';
import {searchNotes, snippetFor} from './notes';

/**
 * Session AK (B4): one search across notes AND the four pillars, for the Notes page and for NOVA (`searchEverything`).
 * Notes and journal entries are searched in full; goals, habits, foods, recipes, workouts, money entries and assets by
 * their names and words. Money entries show their category, day and note, never an amount. A pillar can be left out
 * (`pillars`: NOVA passes only the scopes the person granted; Health is off there by default). Everything read is this
 * device's own; nothing leaves it. A source that cannot be read is named in `unread`, never treated as empty.
 */
export type EverythingKind = 'note' | 'journal' | 'goal' | 'habit' | 'food' | 'recipe' | 'workout' | 'money' | 'asset';
export type EverythingPillar = 'notes' | 'goals' | 'habits' | 'health' | 'wealth';
export type EverythingHit = {kind: EverythingKind; pillar: EverythingPillar; id: string; title: string; detail: string; href: string; score: number; snippet?: string};
export type EverythingSources = {
  notes?: readonly Note[];
  journal?: readonly {id: string; date: string; text: string}[];
  goals?: readonly {id: string; name: string; href: string; status?: string}[];
  habits?: readonly {id: string; title: string; category?: string; description?: string}[];
  foods?: readonly {id: string; name: string; brand?: string}[];
  recipes?: readonly {id: string; name: string}[];
  workouts?: readonly {id: string; name: string; date: string; notes?: string}[];
  money?: readonly {id: string; kind: string; category: string; note?: string; date: string}[];
  assets?: readonly {id: string; name: string; asset: string}[];
};
export const KIND_PILLAR: Record<EverythingKind, EverythingPillar> = {note: 'notes', journal: 'notes', goal: 'goals', habit: 'habits', food: 'health', recipe: 'health', workout: 'health', money: 'wealth', asset: 'wealth'};
const words = (s: string) => normalize(s).split(' ').filter(Boolean);
/** Every query word in the title (a word start scores most) or in the rest; null when a word matches nowhere. */
function score(title: string, rest: string, q: readonly string[]): number | null {
  const t = normalize(title), tw = t.split(' '), r = normalize(rest);
  let s = 0;
  for (const w of q) { if (tw.some(x => x.startsWith(w))) s += 6; else if (t.includes(w)) s += 4; else if (r.includes(w)) s += 1; else return null; }
  return s;
}

/** The search itself over sources already read (pure). */
export function searchEverythingIn(query: string, src: EverythingSources, {limit = 30, perKind = 8, pillars}: {limit?: number; perKind?: number; pillars?: readonly EverythingPillar[]} = {}): EverythingHit[] {
  const q = words(query).slice(0, 12);
  if (!q.length) return [];
  const allowed = (k: EverythingKind) => !pillars || pillars.includes(KIND_PILLAR[k]);
  const hits: EverythingHit[] = [];
  const add = (kind: EverythingKind, id: string, title: string, rest: string, detail: string, href: string, snippetFrom?: string) => {
    if (!allowed(kind)) return;
    const s = score(title, rest, q);
    if (s !== null) hits.push({kind, pillar: KIND_PILLAR[kind], id, title, detail, href, score: s, ...(snippetFrom ? {snippet: snippetFor(snippetFrom, query)} : {})});
  };
  if (allowed('note')) for (const h of searchNotes(src.notes ?? [], query, perKind)) hits.push({kind: 'note', pillar: 'notes', id: h.note.id, title: h.note.kind === 'daily' && h.note.day ? `Daily note ${h.note.day}` : noteName(h.note), detail: h.note.kind === 'inbox' ? 'Inbox' : h.note.kind === 'daily' ? 'Daily note' : 'Note', href: noteHref(h.note.id), score: h.score, snippet: h.snippet});
  for (const e of src.journal ?? []) add('journal', e.id, `Journal ${e.date}`, e.text, 'Journal entry', '/app/journal', e.text);
  for (const g of src.goals ?? []) add('goal', g.id, g.name, g.status ?? '', 'Goal', g.href);
  for (const h of src.habits ?? []) add('habit', h.id, h.title, `${h.category ?? ''} ${h.description ?? ''}`, 'Habit', habitHref(h.id));
  for (const f of src.foods ?? []) add('food', f.id, f.name, f.brand ?? '', 'Food in Health', '/app/health');
  for (const r of src.recipes ?? []) add('recipe', r.id, r.name, '', 'Recipe in Health', '/app/health');
  for (const w of src.workouts ?? []) add('workout', w.id, w.name, `${w.date} ${w.notes ?? ''}`, `Workout · ${w.date}`, '/app/health?view=workouts');
  for (const m of src.money ?? []) add('money', m.id, m.note?.trim() || m.category, `${m.category} ${m.date} ${m.kind}`, `${m.kind === 'income' ? 'Income' : 'Spending'} · ${m.category} · ${m.date}`, '/app/wealth#spending');
  for (const a of src.assets ?? []) add('asset', a.id, a.name, a.asset, `Asset · ${a.asset}`, `/app/wealth/asset/${encodeURIComponent(a.id)}`);
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  const counts = new Map<EverythingKind, number>(), out: EverythingHit[] = [];
  for (const h of hits) { const n = counts.get(h.kind) ?? 0; if (n >= perKind) continue; counts.set(h.kind, n + 1); out.push(h); if (out.length >= limit) break; }
  return out;
}

async function readPrivate<T>(storage: Storage, key: string, schema: z.ZodType<T>): Promise<T | null | undefined> {
  const raw = storage.getItem(key);
  if (raw === null) return undefined;
  const {isDurableMarker, readDurableStore} = await import('../vault/local');
  if (isDurableMarker(raw)) return await readDurableStore(storage, key, schema);
  const parsed = schema.safeParse(JSON.parse(raw));
  return parsed.success ? parsed.data : null;
}
/** Reads this device's records (this tab's: the account's, or the Showcase's) into search sources; what fails is `unread`. */
export async function readEverythingSources(pillars?: readonly EverythingPillar[]): Promise<{sources: EverythingSources; unread: EverythingPillar[]}> {
  const want = (p: EverythingPillar) => !pillars || pillars.includes(p), sources: EverythingSources = {}, unread: EverythingPillar[] = [];
  let storage: Storage;
  try { storage = getAppStorage(); } catch { return {sources, unread: ['notes', 'goals', 'habits', 'health', 'wealth'].filter(p => want(p as EverythingPillar)) as EverythingPillar[]}; }
  const miss = (p: EverythingPillar) => { if (!unread.includes(p)) unread.push(p); };
  const attempt = async (p: EverythingPillar, fn: () => Promise<void> | void) => { if (!want(p)) return; try { await fn(); } catch { miss(p); } };
  await attempt('notes', async () => {
    const notes = readDeviceRecord(storage, NOTES); if (notes.unreadable) miss('notes'); else sources.notes = notes.data.notes;
    const {JOURNAL} = await import('../journal/schema'); const j = readDeviceRecord(storage, JOURNAL); if (j.unreadable) miss('notes'); else sources.journal = j.data.entries;
  });
  await attempt('habits', async () => { const {HABITS_KEY, habitDataSchema} = await import('../habits'); const h = await readPrivate(storage, HABITS_KEY, habitDataSchema); if (h === null) miss('habits'); else sources.habits = (h?.habits ?? []).map(x => ({id: x.id, title: x.title, category: x.category, description: x.description})); });
  await attempt('health', async () => {
    const {HEALTH_STORAGE_KEY, healthSchema} = await import('../health'); const h = await readPrivate(storage, HEALTH_STORAGE_KEY, healthSchema);
    if (h === null) miss('health'); else { sources.foods = (h?.foods ?? []).map(f => ({id: f.id, name: f.name, brand: f.brand})); sources.recipes = (h?.recipes ?? []).map(r => ({id: r.id, name: r.name})); }
    const {WORKOUTS} = await import('../workouts/schema'); const w = readDeviceRecord(storage, WORKOUTS); if (w.unreadable) miss('health'); else sources.workouts = w.data.workouts.filter(x => x.endedAt).map(x => ({id: x.id, name: x.name, date: x.date, notes: x.notes}));
  });
  if (want('goals') || want('wealth')) {
    try {
      const {PLATFORM_KEY, platformSchema} = await import('../positions'); const p = await readPrivate(storage, PLATFORM_KEY, platformSchema);
      if (p === null) { if (want('goals')) miss('goals'); if (want('wealth')) miss('wealth'); }
      else {
        if (want('goals')) sources.goals = (p?.goals ?? []).map(g => ({id: g.id, name: g.name, href: `/app/goals/tracked/${encodeURIComponent(g.id)}`, status: g.status}));
        if (want('wealth')) sources.assets = (p?.positions ?? []).filter(x => !x.archivedAt).map(x => ({id: x.id, name: x.providerId === 'native-zig' ? `ZIG ${x.sourceType.replaceAll('_', ' ').toLowerCase()}` : x.providerId, asset: x.asset}));
      }
    } catch { if (want('goals')) miss('goals'); if (want('wealth')) miss('wealth'); }
  }
  await attempt('wealth', async () => { const {MONEY_LOG} = await import('../money-log/schema'); const m = readDeviceRecord(storage, MONEY_LOG); if (m.unreadable) miss('wealth'); else sources.money = m.data.entries.map(e => ({id: e.id, kind: e.kind, category: e.category, note: e.note, date: e.date})); });
  return {sources, unread};
}
/**
 * For NOVA (lane NA/NE): one search across this device's notes, journal and the four pillars. `pillars` limits it to the
 * granted scopes. Never sends anything; never throws (a source that fails is listed in `unread`).
 */
export async function searchEverything(query: string, {limit = 30, pillars}: {limit?: number; pillars?: readonly EverythingPillar[]} = {}): Promise<{hits: EverythingHit[]; unread: EverythingPillar[]}> {
  try { const {sources, unread} = await readEverythingSources(pillars); return {hits: searchEverythingIn(query, sources, {limit, pillars}), unread}; }
  catch { return {hits: [], unread: [...(pillars ?? ['notes', 'goals', 'habits', 'health', 'wealth'])]}; }
}
