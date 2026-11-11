import * as z from 'zod';
import type {DeviceRecordSpec} from '../../device-record';
import {itemId, MAX_WIDGETS, WIDGET_SIZES, type NovaWidget, type WidgetSize} from '../store';

/**
 * Session AM (ADR-038 D3, D16, A5): NOVA's stage record, `zigoals:nova-stage:v1`. It holds what the person *asked for*:
 * the widgets NOVA made on request (`made`, newest first; a pinned widget lives in `zigoals:nova:v1`'s arranged list
 * instead), the small parameters of widgets (`params`: a range of days, one record's id), the widgets folded into the
 * dock (`hidden`), the history of requests (`asks`), and two choices: keep made widgets until closed (`keep`) and the
 * opt-in gentle cards from the briefs (`proactive`).
 *
 * A loose object, version 1, every field optional (an absent field reads as its default through the helpers below), every
 * list bounded. It holds kinds, ids, times and the person's own words; never a figure, a key or a health value. In Export
 * everything, restore, the encrypted backup and erase; it travels in the `nova` extras section (D18). A chat that is not
 * kept writes no request (the caller's rule). Reads are tolerant: an enum value a later build adds reads as its default.
 */
export const NOVA_STAGE_KEY = 'zigoals:nova-stage:v1';
export const MAX_ASKS = 200, MAX_ASK_TEXT = 300, MAX_ASK_WIDGETS = 6, MAX_PARAMS = 48, MAX_REF = 80;
/** A made widget leaves by itself after this long unless it is pinned or "keep until I close" is on (D3). */
export const MADE_TTL_MS = 12 * 60 * 60 * 1000;
export const WIDGET_RANGES = ['week', 'month', 'quarter', 'year'] as const;
export type WidgetRange = (typeof WIDGET_RANGES)[number];
export const RANGE_DAYS: Readonly<Record<WidgetRange, number>> = {week: 7, month: 30, quarter: 90, year: 365};
export const RANGE_WORDS: Readonly<Record<WidgetRange, string>> = {week: 'the last 7 days', month: 'the last 30 days', quarter: 'the last 90 days', year: 'the last 12 months'};
const iso = z.string().min(10).max(40).refine(s => !Number.isNaN(Date.parse(s)), 'A time.');
const plain = (max: number) => z.string().max(max).refine(s => !/[\u0000-\u001f\u007f]/.test(s), 'Plain text.');
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;

/** A widget's parameters: both optional; `ref` is a record's own id (a goal's), plain and bounded. */
export const widgetParamsSchema = z.looseObject({
  range: z.enum(WIDGET_RANGES).optional().catch(undefined),
  ref: plain(MAX_REF).min(1).optional().catch(undefined),
});
export type WidgetParams = {range?: WidgetRange; ref?: string};
export const madeWidgetSchema = z.looseObject({id: itemId, at: iso, size: z.enum(WIDGET_SIZES).optional().catch(undefined)});
export type MadeWidget = {id: string; at: string; size?: WidgetSize};
export const ASK_DEVICES = ['computer', 'phone'] as const;
export type AskDevice = (typeof ASK_DEVICES)[number];
export const ASK_SOURCES = ['device', 'model'] as const;
export type AskSource = (typeof ASK_SOURCES)[number];
export const askSchema = z.looseObject({
  id: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
  at: iso,
  /** The person's own words, trimmed to one bounded line. */
  text: plain(MAX_ASK_TEXT).min(1),
  /** The widgets this request made (kinds only). */
  widgets: z.array(itemId).max(MAX_ASK_WIDGETS).optional(),
  /** The parameters those widgets were made with (so a request shown again targets the same range or record). */
  params: z.record(itemId, widgetParamsSchema).optional(),
  device: z.enum(ASK_DEVICES).catch('computer'),
  by: z.enum(ASK_SOURCES).catch('device'),
});
export type NovaAsk = {id: string; at: string; text: string; widgets?: string[]; params?: Record<string, WidgetParams>; device: AskDevice; by: AskSource};

export const novaStageSchema = z.looseObject({
  version: z.literal(1),
  made: z.array(madeWidgetSchema).max(MAX_WIDGETS).refine(w => unique(w.map(x => x.id)), 'Each widget shows once.').optional(),
  hidden: z.array(itemId).max(MAX_WIDGETS * 2).refine(unique, 'Each widget is hidden once.').optional(),
  params: z.record(itemId, widgetParamsSchema).refine(r => Object.keys(r).length <= MAX_PARAMS, 'Too many parameters.').optional(),
  asks: z.array(askSchema).max(MAX_ASKS).optional(),
  /** A5: keep made widgets until the person closes them (absent: they leave after 12 hours). */
  keep: z.boolean().optional(),
  /** A5: gentle cards from the briefs while NOVA is open (absent: off). */
  proactive: z.boolean().optional(),
});
export type NovaStage = z.infer<typeof novaStageSchema>;
export const emptyStage = (): NovaStage => ({version: 1});
export const NOVA_STAGE: DeviceRecordSpec<NovaStage> = {key: NOVA_STAGE_KEY, schema: novaStageSchema, empty: emptyStage};

// ---- Reading ----
export const keepsMade = (r: NovaStage): boolean => r.keep === true;
export const proactiveOn = (r: NovaStage): boolean => r.proactive === true;
export const paramsOf = (r: NovaStage, id: string): WidgetParams => { const p = r.params?.[id]; return p ? {...(p.range ? {range: p.range} : {}), ...(p.ref ? {ref: p.ref} : {})} : {}; };
export const hiddenOf = (r: NovaStage): readonly string[] => r.hidden ?? [];
export const asksOf = (r: NovaStage): readonly NovaAsk[] => (r.asks ?? []) as readonly NovaAsk[];
/** The made widgets that are still on the stage at `now`: newest first, each once, not expired (unless kept). */
export function madeAt(r: NovaStage, now: number, known: (id: string) => boolean = () => true): MadeWidget[] {
  const keep = keepsMade(r), seen = new Set<string>();
  return (r.made ?? []).filter(w => {
    if (!known(w.id) || seen.has(w.id)) return false;
    seen.add(w.id);
    return keep || now - Date.parse(w.at) < MADE_TTL_MS;
  }).map(w => ({id: w.id, at: w.at, ...(w.size ? {size: w.size} : {})}));
}
/**
 * The stage's list: the made widgets (newest first), then the arranged (pinned) ones in their order — or the pinned ones
 * first while arranging — without the hidden ones; each with whether it is pinned. `pinned` is `widgetsFor(...)` of NOVA's own record.
 */
export type StageWidget = NovaWidget & {pinned: boolean; at?: string};
export function stageWidgets(r: NovaStage, pinned: readonly NovaWidget[], now: number, sizeOf: (id: string) => WidgetSize, known: (id: string) => boolean = () => true, order: 'made-first' | 'pinned-first' = 'made-first'): {shown: StageWidget[]; docked: StageWidget[]} {
  const hidden = new Set(hiddenOf(r)), pinnedIds = new Set(pinned.map(w => w.id));
  const made: StageWidget[] = madeAt(r, now, known).filter(w => !pinnedIds.has(w.id)).map(w => ({id: w.id, size: w.size ?? sizeOf(w.id), slot: 0, pinned: false, at: w.at}));
  const kept: StageWidget[] = pinned.map(w => ({...w, pinned: true}));
  // What was just asked for stands in front (it must be in view the moment it is made); while arranging, the arranged
  // widgets lead in their own order, so a place on the orbits means the same before and after a move.
  const all: StageWidget[] = (order === 'made-first' ? [...made, ...kept] : [...kept, ...made]).map((w, slot) => ({...w, slot}));
  return {shown: all.filter(w => !hidden.has(w.id)).map((w, slot) => ({...w, slot})), docked: all.filter(w => hidden.has(w.id))};
}

// ---- Changes (pure; each returns a record the schema accepts) ----
const parse = (r: NovaStage) => novaStageSchema.parse(r);
const cleanParams = (p: WidgetParams | undefined): WidgetParams | null => {
  if (!p) return null;
  const out: WidgetParams = {...(p.range && (WIDGET_RANGES as readonly string[]).includes(p.range) ? {range: p.range} : {}), ...(typeof p.ref === 'string' && p.ref && p.ref.length <= MAX_REF && !/[\u0000-\u001f\u007f]/.test(p.ref) ? {ref: p.ref} : {})};
  return Object.keys(out).length ? out : null;
};
export type MakeRequest = {id: string; size?: WidgetSize; params?: WidgetParams};
/**
 * Makes widgets (D3): each goes to the front of `made` with this moment as its time (one already made is made again in
 * place: its time renews, so it materialises again), leaves the dock, and takes its parameters. The list keeps the newest
 * `MAX_WIDGETS`. A pinned widget is not added to `made` (it is on the stage already) but still takes new parameters.
 */
export function makeWidgets(r: NovaStage, requests: readonly MakeRequest[], now: Date, pinnedIds: ReadonlySet<string> = new Set()): NovaStage {
  if (!requests.length) return r;
  const at = now.toISOString(), ids = requests.map(q => q.id), fresh = requests.filter(q => !pinnedIds.has(q.id)).map(q => ({id: q.id, at, ...(q.size ? {size: q.size} : {})}));
  const made = [...fresh, ...(r.made ?? []).filter(w => !ids.includes(w.id))].slice(0, MAX_WIDGETS);
  const params = {...(r.params ?? {})};
  for (const q of requests) { const p = cleanParams(q.params); if (p) params[q.id] = p; else if (q.params) delete params[q.id]; }
  const next: NovaStage = {...r, made, hidden: (r.hidden ?? []).filter(id => !ids.includes(id))};
  if (Object.keys(params).length) next.params = Object.fromEntries(Object.entries(params).slice(-MAX_PARAMS)); else delete next.params;
  return parse(next);
}
/** Closes a made widget (a pinned one is removed from NOVA's own record by the caller); its dock mark goes too. */
export function closeMade(r: NovaStage, id: string): NovaStage {
  if (!(r.made ?? []).some(w => w.id === id) && !(r.hidden ?? []).includes(id)) return r;
  return parse({...r, made: (r.made ?? []).filter(w => w.id !== id), hidden: (r.hidden ?? []).filter(x => x !== id)});
}
/** Folds a widget into the dock, or brings it back. */
export function setHidden(r: NovaStage, id: string, hidden: boolean): NovaStage {
  const list = (r.hidden ?? []).filter(x => x !== id);
  return parse({...r, hidden: hidden ? [...list, id].slice(-MAX_WIDGETS * 2) : list});
}
/** A widget was pinned: it leaves `made` (NOVA's own record holds it from now on). */
export const dropMade = (r: NovaStage, id: string): NovaStage => (r.made ?? []).some(w => w.id === id) ? parse({...r, made: (r.made ?? []).filter(w => w.id !== id)}) : r;
/** A widget was unpinned: it stays on the stage as a made widget from this moment. */
export const keepAsMade = (r: NovaStage, id: string, size: WidgetSize, now: Date): NovaStage => parse({...r, made: [{id, at: now.toISOString(), size}, ...(r.made ?? []).filter(w => w.id !== id)].slice(0, MAX_WIDGETS)});
export const resizeMade = (r: NovaStage, id: string, size: WidgetSize): NovaStage => (r.made ?? []).some(w => w.id === id) ? parse({...r, made: (r.made ?? []).map(w => w.id === id ? {...w, size} : w)}) : r;
/** Everything made leaves the stage (the pinned widgets stay); the dock keeps only pinned widgets' marks. */
export const clearMade = (r: NovaStage, pinnedIds: ReadonlySet<string> = new Set()): NovaStage => parse({...r, made: [], hidden: (r.hidden ?? []).filter(id => pinnedIds.has(id))});
/** Puts the made list, the dock and the parameters back exactly as they were (Undo). */
export const restoreStage = (r: NovaStage, before: NovaStage): NovaStage => {
  const next: NovaStage = {...r};
  for (const k of ['made', 'hidden', 'params'] as const) { if (before[k] === undefined) delete next[k]; else (next as Record<string, unknown>)[k] = before[k]; }
  return parse(next);
};
export const setKeep = (r: NovaStage, keep: boolean): NovaStage => { const next = {...r}; if (keep) next.keep = true; else delete next.keep; return parse(next); };
export const setProactive = (r: NovaStage, on: boolean): NovaStage => { const next = {...r}; if (on) next.proactive = true; else delete next.proactive; return parse(next); };
/** Drops made widgets that expired (called when NOVA opens, so the record does not carry them forever). */
export function pruneStage(r: NovaStage, now: number): NovaStage {
  if (keepsMade(r) || !(r.made ?? []).some(w => now - Date.parse(w.at) >= MADE_TTL_MS)) return r;
  const made = (r.made ?? []).filter(w => now - Date.parse(w.at) < MADE_TTL_MS), ids = new Set(made.map(w => w.id));
  return parse({...r, made, hidden: (r.hidden ?? []).filter(id => ids.has(id) || !(r.made ?? []).some(w => w.id === id))});
}

// ---- Requests (D16, D19) ----
const oneLine = (text: string) => text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_ASK_TEXT);
export const askId = (now: Date, salt = Math.floor(Math.random() * 1e6)): string => `a${now.getTime().toString(36)}-${salt.toString(36)}`;
/** Records a request (newest first, at most `MAX_ASKS`); an empty line is not a request. */
export function recordAsk(r: NovaStage, ask: {id: string; at: Date; text: string; widgets?: readonly MakeRequest[]; device: AskDevice; by: AskSource}): NovaStage {
  const text = oneLine(ask.text);
  if (!text) return r;
  const widgets = (ask.widgets ?? []).slice(0, MAX_ASK_WIDGETS), params: Record<string, WidgetParams> = {};
  for (const w of widgets) { const p = cleanParams(w.params); if (p) params[w.id] = p; }
  const entry: NovaAsk = {id: ask.id, at: ask.at.toISOString(), text, device: ask.device, by: ask.by, ...(widgets.length ? {widgets: [...new Set(widgets.map(w => w.id))]} : {}), ...(Object.keys(params).length ? {params} : {})};
  return parse({...r, asks: [entry, ...(r.asks ?? []).filter(a => a.id !== ask.id)].slice(0, MAX_ASKS)});
}
/** A request's widgets, as requests to make again ("Show again"). */
export const askRequests = (ask: NovaAsk): MakeRequest[] => (ask.widgets ?? []).map(id => ({id, ...(ask.params?.[id] ? {params: ask.params[id]} : {})}));
export const forgetAsk = (r: NovaStage, id: string): NovaStage => (r.asks ?? []).some(a => a.id === id) ? parse({...r, asks: (r.asks ?? []).filter(a => a.id !== id)}) : r;
export const forgetAsks = (r: NovaStage): NovaStage => { const next = {...r}; delete next.asks; return parse(next); };

/**
 * The Showcase's stage (fictional, labelled on the page as the Showcase's): the history of four example requests, one of
 * them from a phone, each one tap from being shown again. The Showcase's widgets themselves are its Command arrangement
 * (lib/nova/store.ts `showcaseNova`); nothing is "made" before the visitor asks. No personal field: the words are the
 * Showcase's own example questions.
 */
export function showcaseStage(day: string): NovaStage {
  const at = (hm: string) => `${day}T${hm}:00.000Z`;
  return novaStageSchema.parse({
    version: 1,
    asks: [
      {id: 'showcase-4', at: at('08:12'), text: 'Show my habits this week', widgets: ['habit-week'], device: 'computer', by: 'device'},
      {id: 'showcase-3', at: at('08:10'), text: 'Am I on track for Japan?', widgets: ['goal-focus'], device: 'computer', by: 'device'},
      {id: 'showcase-2', at: at('08:06'), text: 'Show my net worth', widgets: ['net-worth'], params: {'net-worth': {range: 'quarter'}}, device: 'phone', by: 'device'},
      {id: 'showcase-1', at: at('08:02'), text: 'What’s the weather?', widgets: ['weather'], device: 'computer', by: 'device'},
    ],
  });
}
