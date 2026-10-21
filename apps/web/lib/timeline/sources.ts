/**
 * The Day Timeline's seam for other features (Session AF, L5b; P9.2): a feature registers a source that turns the
 * person's records into items for today's timeline, and the timeline asks every registered source when it is shown. The
 * Checklist registers its dots this way (one line in components/checklist/checklist-launcher.tsx). A registration is
 * only a loader: the source's code loads when the timeline first asks for it, never on the page that registered it. No
 * imports, so registering costs the shell nothing.
 *
 * A source reads; it never writes. Its items are placed by `time` ("HH:MM"), else by `band` (morning, afternoon,
 * evening), else on the "Anytime" shelf, and they do not move on the timeline: they move where they belong.
 */
export type TimelineBand = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type TimelineSourceItem = {
  id: string; title: string; done: boolean; href: string;
  band?: TimelineBand; time?: string;
  pillar?: 'goals' | 'habits' | 'health' | 'wealth' | null;
  /** The habit this item stands for, when it is one (the timeline then marks the habit's own block instead of adding one). */
  habitId?: string;
  /** A short plain word for what it is ("Checklist"). */
  label?: string;
  /** Session AG: its own colour (a CSS colour), the one it wears on the Checklist's path. */
  colour?: string;
};
/** What a source is given: today's records as the timeline read them (typed loosely here, so this file imports nothing). */
export type TimelineSourceContext = {date: string; now: Date; stores: Record<string, unknown>};
export type TimelineSource = (context: TimelineSourceContext) => TimelineSourceItem[];
export type TimelineSourceLoader = () => Promise<TimelineSource>;

const loaders = new Map<string, TimelineSourceLoader>();
const listeners = new Set<() => void>();
let version = 0;
/** Registers (or replaces) a source by id; returns the call that removes it. */
export function registerTimelineSource(id: string, load: TimelineSourceLoader): () => void {
  loaders.set(id, load); version++; for (const l of listeners) l();
  return () => { if (loaders.get(id) === load) { loaders.delete(id); version++; for (const l of listeners) l(); } };
}
export const timelineSourceIds = () => [...loaders.keys()].sort();
export const timelineSourcesVersion = () => version;
export function subscribeTimelineSources(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener); }; }
/** Loads every registered source; one that fails to load is left out (the timeline still shows its own blocks). */
export async function loadTimelineSources(): Promise<{id: string; source: TimelineSource}[]> {
  const out: {id: string; source: TimelineSource}[] = [];
  for (const id of timelineSourceIds()) { try { out.push({id, source: await loaders.get(id)!()}); } catch { /* left out */ } }
  return out;
}
/** Runs the loaded sources on today's records; a source that throws gives nothing rather than breaking the day. */
export function runTimelineSources(sources: readonly {id: string; source: TimelineSource}[], context: TimelineSourceContext): (TimelineSourceItem & {sourceId: string})[] {
  return sources.flatMap(({id, source}) => { try { return source(context).map(item => ({...item, id: `${id}:${item.id}`, sourceId: id})); } catch { return []; } });
}
