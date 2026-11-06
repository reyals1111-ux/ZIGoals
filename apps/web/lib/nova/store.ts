import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';
import {presetWidgets} from './layout';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's own device record, `zigoals:nova:v1`. It holds how the person
 * arranged their command center on this device and nothing else: the layout, the widgets on their orbits, the dock's
 * order and hidden entries, the persona (NOVA's name and avatar), the accent, custom instructions, whether the opening
 * sequence was seen and whether single-key shortcuts are on. (Where a conversation started is NB's own record,
 * `zigoals:nova-bridge:v1`, lib/nova/bridge.ts.)
 *
 * A loose object, version 1, every field optional (an absent field reads as its default through the helpers below), every
 * list bounded. Device-only: never synced; in Export everything, restore and erase through the lead's registries. No key,
 * token, health figure or amount is ever stored here. Reads are tolerant: an enum value a later build adds reads as the
 * default (`.catch`), so an older build shows its own default instead of dropping the whole record.
 */
export const NOVA_KEY = 'zigoals:nova:v1';
export const NOVA_LAYOUTS = ['orbit', 'bento', 'focus', 'minimal'] as const;
export type NovaLayout = (typeof NOVA_LAYOUTS)[number];
export const WIDGET_SIZES = ['S', 'M', 'L'] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];
/** The accents, each a pair of the app's own nebula tokens (components/nova/nova.css maps them). */
export const NOVA_ACCENTS = ['violet', 'cyan', 'magenta', 'teal', 'gold'] as const;
export type NovaAccent = (typeof NOVA_ACCENTS)[number];
export const ACCENT_LABEL: Record<NovaAccent, string> = {violet: 'Nebula violet', cyan: 'Comet cyan', magenta: 'Aurora magenta', teal: 'Lagoon teal', gold: 'Solar gold'};
export const PERSONA_AVATARS = ['orb', 'zigi'] as const;
export type PersonaAvatar = (typeof PERSONA_AVATARS)[number];

export const MAX_WIDGETS = 24, MAX_SLOT = 23, MAX_DOCK = 32, MAX_PERSONA_NAME = 24, MAX_INSTRUCTIONS = 2000, MAX_YOUR_NAME = 40, MAX_MODEL = 200;
/** N12: the left panel open, folded to an icon rail, or hidden; the right panel open or hidden. Absent: by screen width. */
export const LEFT_STATES = ['open', 'rail', 'hidden'] as const;
export type LeftState = (typeof LEFT_STATES)[number];
export const RIGHT_STATES = ['open', 'hidden'] as const;
export type RightState = (typeof RIGHT_STATES)[number];
/** The right panel's numbered sections ("Behind the intelligence"). */
export const RIGHT_SECTIONS = ['brains', 'voice', 'tools', 'usage', 'memory', 'activity'] as const;
export type RightSection = (typeof RIGHT_SECTIONS)[number];
export const DEFAULT_PERSONA_NAME = 'NOVA';
/** A widget or dock id: lowercase words joined by hyphens (an id a later build adds is kept and simply not shown). */
export const itemId = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);
/** Plain text with no control characters (a name shown on screen and sent as NOVA's name in the system prompt). */
const plain = (max: number) => z.string().max(max).refine(s => !/[\u0000-\u001f\u007f]/.test(s), 'Use letters, numbers and spaces.');
const unique = (ids: readonly string[]) => new Set(ids).size === ids.length;

export const novaWidgetSchema = z.looseObject({
  id: itemId,
  size: z.enum(WIDGET_SIZES).catch('M'),
  /** Its place on the orbits: 0 is the first orbit's first place (lib/nova/layout.ts turns places into positions). */
  slot: z.number().int().min(0).max(MAX_SLOT),
});
export type NovaWidget = {id: string; size: WidgetSize; slot: number};

export const novaRecordSchema = z.looseObject({
  version: z.literal(1),
  openingSeen: z.boolean().optional(),
  layout: z.enum(NOVA_LAYOUTS).optional().catch(undefined),
  widgets: z.array(novaWidgetSchema).max(MAX_WIDGETS).refine(w => unique(w.map(x => x.id)), 'Each widget shows once.').optional(),
  dock: z.looseObject({
    order: z.array(itemId).max(MAX_DOCK).refine(unique, 'Each dock entry shows once.').optional(),
    hidden: z.array(itemId).max(MAX_DOCK).refine(unique, 'Each dock entry is hidden once.').optional(),
  }).optional(),
  persona: z.looseObject({
    name: plain(MAX_PERSONA_NAME).optional(),
    avatar: z.enum(PERSONA_AVATARS).optional().catch(undefined),
  }).optional(),
  accent: z.enum(NOVA_ACCENTS).optional().catch(undefined),
  customInstructions: z.string().max(MAX_INSTRUCTIONS).optional(),
  /** WCAG 2.1.4: single-key shortcuts can be turned off (absent means on). */
  shortcuts: z.boolean().optional(),
  /** N12: what NOVA calls the person ("What's on your mind, Rey?"); personal, never in a shared setup. */
  yourName: plain(MAX_YOUR_NAME).optional(),
  /** N12: the side panels and the right panel's folded sections, per device. */
  panels: z.looseObject({
    left: z.enum(LEFT_STATES).optional().catch(undefined),
    right: z.enum(RIGHT_STATES).optional().catch(undefined),
    folded: z.array(itemId).max(12).optional(),
  }).optional(),
  /** N12: the model routing menu: "auto" (the brain connected in the guide) or a model this device's brain offers. */
  routing: z.string().min(1).max(MAX_MODEL).refine(s => !/[\u0000-\u001f\u007f]/.test(s)).optional(),
  /** N12: the "Hey NOVA" wake phrase, only where the browser recognises speech on the device; off unless turned on. */
  wake: z.boolean().optional(),
  /** Owner follow-up 2 (N2, N8): open ZIGoals on NOVA instead of Today (Today stays the default). */
  startOnNova: z.boolean().optional(),
});
export type NovaRecord = z.infer<typeof novaRecordSchema>;
export const emptyNova = (): NovaRecord => ({version: 1});
export const NOVA_STORE: DeviceRecordSpec<NovaRecord> = {key: NOVA_KEY, schema: novaRecordSchema, empty: emptyNova};

// ---- Reading (every helper reads an absent field as its default) ----
export const layoutOf = (r: NovaRecord): NovaLayout => r.layout ?? 'orbit';
export const accentOf = (r: NovaRecord): NovaAccent => r.accent ?? 'violet';
export const shortcutsOn = (r: NovaRecord): boolean => r.shortcuts !== false;
export type Persona = {name: string; avatar: PersonaAvatar};
/** NOVA's name (trimmed; blank reads as "NOVA") and avatar. */
export function personaOf(r: NovaRecord): Persona {
  const name = (r.persona?.name ?? '').replace(/\s+/g, ' ').trim();
  return {name: name || DEFAULT_PERSONA_NAME, avatar: r.persona?.avatar ?? 'orb'};
}
export const instructionsOf = (r: NovaRecord): string => (r.customInstructions ?? '').trim();
/** What NOVA calls the person, or '' (then NOVA asks "What's on your mind?" without a name). */
export const yourNameOf = (r: NovaRecord): string => (r.yourName ?? '').replace(/\s+/g, ' ').trim();
export const routingOf = (r: NovaRecord): string => r.routing ?? 'auto';
export const wakeOn = (r: NovaRecord): boolean => r.wake === true;
/**
 * The panels' state: the stored choice, else by width (wide: the left panel open; laptop: left as a rail; tablet: hidden).
 * Release review 2 (R2-3): "Behind the intelligence" starts hidden at every width until the person opens it, so the first
 * screen leads with their day; once opened (or hidden) the choice is remembered on this device as before.
 */
export function panelsOf(r: NovaRecord, width: number): {left: LeftState; right: RightState; folded: RightSection[]} {
  const auto = width >= 1440 ? {left: 'open' as const, right: 'hidden' as const} : width >= 1100 ? {left: 'rail' as const, right: 'hidden' as const} : {left: 'hidden' as const, right: 'hidden' as const};
  const folded = (r.panels?.folded ?? []).filter((id): id is RightSection => (RIGHT_SECTIONS as readonly string[]).includes(id));
  return {left: r.panels?.left ?? auto.left, right: r.panels?.right ?? auto.right, folded};
}
/** The left panel's next state for its button: open → rail → hidden → open. */
export const nextLeft = (state: LeftState): LeftState => state === 'open' ? 'rail' : state === 'rail' ? 'hidden' : 'open';

/** The widgets a fresh NOVA starts with: the day first, then health, then money and goals. */
export const DEFAULT_WIDGETS: readonly NovaWidget[] = [
  {id: 'orbit', size: 'M', slot: 0}, {id: 'next', size: 'M', slot: 1}, {id: 'glance', size: 'M', slot: 2}, {id: 'water', size: 'S', slot: 3},
  {id: 'goal-pace', size: 'M', slot: 4}, {id: 'money', size: 'M', slot: 5}, {id: 'sleep', size: 'S', slot: 6}, {id: 'now-playing', size: 'S', slot: 7},
];
/**
 * The widgets to show, in orbit order: the stored list (or the defaults when the person never arranged any), only ids
 * `known` accepts, each once, renumbered 0, 1, 2… so places never have gaps.
 */
export function widgetsFor(r: NovaRecord, known: (id: string) => boolean = () => true): NovaWidget[] {
  const list = r.widgets ?? DEFAULT_WIDGETS, seen = new Set<string>();
  return [...list].map((w, i) => ({w, i})).sort((a, b) => a.w.slot - b.w.slot || a.i - b.i)
    .filter(({w}) => { if (!known(w.id) || seen.has(w.id)) return false; seen.add(w.id); return true; })
    .map(({w}, slot) => ({id: w.id, size: w.size, slot}));
}

// ---- Changes (pure; each returns a record the schema accepts, or throws in plain words) ----
const withWidgets = (r: NovaRecord, widgets: readonly NovaWidget[]): NovaRecord => novaRecordSchema.parse({...r, widgets: widgets.map((w, slot) => ({id: w.id, size: w.size, slot}))});
export const WIDGET_LIMIT_MESSAGE = `NOVA holds ${MAX_WIDGETS} widgets at most. Remove one first.`;
/** Adds a widget at the end of the orbits (or at `slot`); one already shown is left where it is. */
export function addWidget(r: NovaRecord, id: string, size: WidgetSize = 'M', slot?: number): NovaRecord {
  const list = widgetsFor(r);
  if (list.some(w => w.id === id)) return r;
  if (list.length >= MAX_WIDGETS) throw Error(WIDGET_LIMIT_MESSAGE);
  const at = slot === undefined ? list.length : Math.max(0, Math.min(list.length, Math.floor(slot)));
  return withWidgets(r, [...list.slice(0, at), {id, size, slot: at}, ...list.slice(at)]);
}
export function removeWidget(r: NovaRecord, id: string): NovaRecord {
  const list = widgetsFor(r);
  return list.some(w => w.id === id) ? withWidgets(r, list.filter(w => w.id !== id)) : r;
}
export function resizeWidget(r: NovaRecord, id: string, size: WidgetSize): NovaRecord {
  const list = widgetsFor(r);
  return list.some(w => w.id === id && w.size !== size) ? withWidgets(r, list.map(w => w.id === id ? {...w, size} : w)) : r;
}
/** Moves a widget to place `to` on the orbits (the others close up around it). */
export function placeWidget(r: NovaRecord, id: string, to: number): NovaRecord {
  const list = widgetsFor(r), from = list.findIndex(w => w.id === id);
  if (from < 0) return r;
  const at = Math.max(0, Math.min(list.length - 1, Math.floor(to)));
  if (at === from) return r;
  const next = [...list]; const [moved] = next.splice(from, 1); next.splice(at, 0, moved!);
  return withWidgets(r, next);
}
/** Review m9 (lane L8d): two widgets trade places (the arrow keys' "other column"); unknown ids leave the record as it is. */
export function swapWidgets(r: NovaRecord, a: string, b: string): NovaRecord {
  const list = widgetsFor(r), i = list.findIndex(w => w.id === a), j = list.findIndex(w => w.id === b);
  if (i < 0 || j < 0 || i === j) return r;
  const next = [...list]; [next[i], next[j]] = [next[j]!, next[i]!];
  return withWidgets(r, next);
}
/** One place earlier (-1) or later (+1): the keyboard and button alternative to dragging. */
export const nudgeWidget = (r: NovaRecord, id: string, by: -1 | 1): NovaRecord => {
  const from = widgetsFor(r).findIndex(w => w.id === id);
  return from < 0 ? r : placeWidget(r, id, from + by);
};
/** Puts back a widget list exactly as it was (Undo). */
export const restoreWidgets = (r: NovaRecord, widgets: readonly NovaWidget[]): NovaRecord => withWidgets(r, widgets);

export const setLayout = (r: NovaRecord, layout: NovaLayout): NovaRecord => novaRecordSchema.parse({...r, layout});
export const setAccent = (r: NovaRecord, accent: NovaAccent): NovaRecord => novaRecordSchema.parse({...r, accent});
export const setShortcuts = (r: NovaRecord, on: boolean): NovaRecord => novaRecordSchema.parse({...r, shortcuts: on});
/**
 * Review fix (lane L8d, NOVA_HUD_REVIEW M8): a brand-new NOVA (no record on this device at all: nothing but its version)
 * starts on the holographic HUD's Command preset, so a first visit meets the instruments. A record that exists — the
 * person opened NOVA before, or arranged anything — keeps its widgets (or the earlier defaults) untouched.
 */
export const isBrandNew = (r: NovaRecord): boolean => Object.keys(r).every(k => k === 'version');
export const FIRST_WIDGETS = (): NovaWidget[] => presetWidgets('command');
export const markOpeningSeen = (r: NovaRecord): NovaRecord => r.openingSeen ? r
  : novaRecordSchema.parse({...r, openingSeen: true, ...(isBrandNew(r) ? {widgets: FIRST_WIDGETS()} : {})});
/** The persona; a name is trimmed and its inner spaces folded (a blank name means "NOVA" again). */
export function setPersona(r: NovaRecord, change: Partial<Persona>): NovaRecord {
  const persona = {...r.persona};
  if (change.name !== undefined) {
    const name = change.name.replace(/\s+/g, ' ').trim();
    if (name.length > MAX_PERSONA_NAME) throw Error(`Keep the name to ${MAX_PERSONA_NAME} characters.`);
    if (/[\u0000-\u001f\u007f]/.test(name)) throw Error('Use letters, numbers and spaces in the name.');
    if (name && name !== DEFAULT_PERSONA_NAME) persona.name = name; else delete persona.name;
  }
  if (change.avatar !== undefined) persona.avatar = change.avatar;
  return novaRecordSchema.parse({...r, persona});
}
export function setInstructions(r: NovaRecord, text: string): NovaRecord {
  if (text.length > MAX_INSTRUCTIONS) throw Error('Keep the instructions to 2,000 characters.');
  const next = {...r};
  if (text.trim()) next.customInstructions = text; else delete next.customInstructions;
  return novaRecordSchema.parse(next);
}

// ---- N12: name, panels, routing, wake phrase ----
export function setYourName(r: NovaRecord, name: string): NovaRecord {
  const clean = name.replace(/\s+/g, ' ').trim();
  if (clean.length > MAX_YOUR_NAME) throw Error(`Keep your name to ${MAX_YOUR_NAME} characters.`);
  if (/[\u0000-\u001f\u007f]/.test(clean)) throw Error('Use letters, numbers and spaces in your name.');
  const next = {...r};
  if (clean) next.yourName = clean; else delete next.yourName;
  return novaRecordSchema.parse(next);
}
export const setLeftPanel = (r: NovaRecord, left: LeftState): NovaRecord => novaRecordSchema.parse({...r, panels: {...r.panels, left}});
export const setRightPanel = (r: NovaRecord, right: RightState): NovaRecord => novaRecordSchema.parse({...r, panels: {...r.panels, right}});
export function foldSection(r: NovaRecord, id: RightSection, folded: boolean): NovaRecord {
  const set = new Set(r.panels?.folded ?? []);
  if (folded) set.add(id); else set.delete(id);
  return novaRecordSchema.parse({...r, panels: {...r.panels, folded: [...set]}});
}
export function setRouting(r: NovaRecord, routing: string): NovaRecord {
  const next = {...r};
  if (routing === 'auto') delete next.routing; else next.routing = routing;
  return novaRecordSchema.parse(next);
}
export const setWake = (r: NovaRecord, on: boolean): NovaRecord => novaRecordSchema.parse({...r, wake: on});
export const setStartOnNova = (r: NovaRecord, on: boolean): NovaRecord => novaRecordSchema.parse({...r, startOnNova: on});
export const startsOnNova = (r: NovaRecord): boolean => r.startOnNova === true;

/**
 * The Showcase's NOVA (proposed for the lead's Showcase wiring; fictional, labelled on the page as the Showcase's): the
 * Orbit layout with every widget that reads the Showcase's own records, the briefs and the notes inbox included, the
 * opening not yet seen (so the Showcase plays it once per tab), and a persona name that is NOVA's own. No personal field.
 * `day` is the Showcase's day (unused today; kept so the record can follow the Showcase's calendar if it ever needs to).
 */
export function showcaseNova(day: string): NovaRecord {
  void day;
  return novaRecordSchema.parse({
    version: 1, layout: 'orbit', accent: 'violet',
    // Review fixes (lane L8d, NOVA_HUD_REVIEW m15, B2): the Showcase opens on the Command preset itself — every pillar's
    // instrument beside the star, then the day's panels (its labelled example tasks and Pomodoro history among them), no
    // duplicates — and with "Behind the intelligence" closed, so at 1440 px the HUD, not a lone orb, is the first view.
    widgets: presetWidgets('command'),
    // Second review M3, M4 (lane L8f): no left-panel choice of its own — the window's width decides, as for everyone (open
    // from 1440 px, the icon rail from 1100, folded below), so a 1280 laptop and a tablet give the HUD the room. It was
    // pinned open, which left a tablet's HUD two 245 px columns beside a 275 px sidebar.
  });
}
