import {novaRecordSchema, type NovaRecord} from './store';

/**
 * Session AK (owner follow-up 2, N2; lane NA): NOVA's dock, every ZIGoals feature one tap away as a planet with its label
 * and a single-key shortcut (which the person can turn off, WCAG 2.1.4). The person reorders and hides entries on this
 * device; an entry whose page this device does not show (Your pages & buttons) or whose part was not chosen (Earn, Chess)
 * is simply absent, never a dead button. Each entry is a real link to an existing page, or one of the app's own actions
 * (ZIGi's chat, Quick add, the music player).
 */
export type DockAction = 'zigi' | 'quick-add' | 'music';
export type DockSpec = {
  id: string;
  label: string;
  /** What the entry does, for its tooltip and the arrange list. */
  hint: string;
  /** The single key (lowercase) that opens it; ',' is Settings as on most computers. */
  key: string;
  href?: string;
  action?: DockAction;
  /** The page id in Your pages & buttons, when the entry is a page the person can hide there. */
  page?: 'goals' | 'habits' | 'health' | 'wealth' | 'chess';
  /** Shown only once this part of ZIGoals was chosen on this device. */
  needs?: 'earn';
};
export const DOCK: readonly DockSpec[] = [
  {id: 'health', label: 'Health', hint: 'Meals, water, sleep and more', key: 'e', href: '/app/health', page: 'health'},
  {id: 'zigi', label: 'ZIGi', hint: 'Open ZIGi’s chat on this page', key: 'z', action: 'zigi'},
  {id: 'checklist', label: 'Checklist', hint: 'Your daily Checklist path', key: 'c', href: '/app/checklist'},
  {id: 'music', label: 'Music', hint: 'The music player', key: 'm', action: 'music', href: '/app/music'},
  {id: 'focus', label: 'Focus', hint: 'Start a focus session', key: 'f', href: '/app/journey#focus'},
  {id: 'notes', label: 'Capture', hint: 'A quick note for your inbox, filed later', key: 'n', href: '/app/notes?capture=1'},
  {id: 'quick-add', label: 'Quick add', hint: 'Add a goal, a habit, a meal or a contribution', key: 'q', action: 'quick-add'},
  {id: 'agenda', label: 'Agenda', hint: 'Your day, hour by hour', key: 'a', href: '/app/agenda'},
  {id: 'review', label: 'Review', hint: 'Your week in review', key: 'r', href: '/app/review'},
  {id: 'tasks', label: 'Tasks', hint: 'Your tasks and goals\' next actions', key: 't', href: '/app/tasks'},
  {id: 'goals', label: 'Goals', hint: 'Your goals', key: 'g', href: '/app/goals', page: 'goals'},
  {id: 'habits', label: 'Habits', hint: 'Your habits', key: 'h', href: '/app/habits', page: 'habits'},
  {id: 'wealth', label: 'Wealth', hint: 'Your money with a purpose', key: 'w', href: '/app/wealth', page: 'wealth'},
  {id: 'earn', label: 'Earn', hint: 'Earn, on the chain you chose', key: 'i', href: '/app/earn', needs: 'earn'},
  {id: 'chess', label: 'Chess', hint: 'Your chess ratings and puzzles', key: 'k', href: '/app/chess', page: 'chess'},
  {id: 'settings', label: 'Settings', hint: 'Settings', key: ',', href: '/app/settings'},
];
const BY_ID = new Map(DOCK.map(d => [d.id, d]));
export const dockSpec = (id: string): DockSpec | undefined => BY_ID.get(id);
/** What this device shows: the pages it shows and whether Earn is chosen. */
export type DockContext = {pageShown: (page: NonNullable<DockSpec['page']>) => boolean; earn: boolean};
export const dockAvailable = (spec: DockSpec, ctx: DockContext): boolean => (!spec.page || ctx.pageShown(spec.page)) && (!spec.needs || ctx.earn);

export type DockEntry = DockSpec & {hidden: boolean};
/**
 * Every entry this device can show, in the person's order (entries the stored order does not name, such as one added in
 * a later build, follow in catalog order), each marked hidden or not. The dock shows the ones not hidden.
 */
export function dockEntries(r: NovaRecord, ctx: DockContext): DockEntry[] {
  const stored = (r.dock?.order ?? []).filter(id => BY_ID.has(id)), hidden = new Set(r.dock?.hidden ?? []);
  const order = [...stored, ...DOCK.map(d => d.id).filter(id => !stored.includes(id))];
  return order.map(id => BY_ID.get(id)!).filter(spec => dockAvailable(spec, ctx)).map(spec => ({...spec, hidden: hidden.has(spec.id)}));
}
/** The full order as stored after a change (every catalog entry, so a later build's additions keep their place). */
const fullOrder = (r: NovaRecord) => { const stored = (r.dock?.order ?? []).filter(id => BY_ID.has(id)); return [...stored, ...DOCK.map(d => d.id).filter(id => !stored.includes(id))]; };
/**
 * Moves an entry one place earlier or later among the entries this device shows (`visible`, in dock order), keeping
 * every other entry where it was in the full order.
 */
export function moveDock(r: NovaRecord, id: string, by: -1 | 1, visible: readonly string[]): NovaRecord {
  const at = visible.indexOf(id), neighbour = visible[at + by];
  if (at < 0 || !neighbour) return r;
  const order = fullOrder(r), i = order.indexOf(id), j = order.indexOf(neighbour);
  [order[i], order[j]] = [order[j]!, order[i]!];
  return novaRecordSchema.parse({...r, dock: {...r.dock, order}});
}
export function setDockHidden(r: NovaRecord, id: string, hide: boolean): NovaRecord {
  if (!BY_ID.has(id)) return r;
  const hidden = new Set(r.dock?.hidden ?? []);
  if (hide) hidden.add(id); else hidden.delete(id);
  return novaRecordSchema.parse({...r, dock: {...r.dock, hidden: [...hidden]}});
}
export function resetDock(r: NovaRecord): NovaRecord { const next = {...r}; delete next.dock; return novaRecordSchema.parse(next); }

/** The dock entry a key opens, when shortcuts are on: no modifier but Shift (for ','), the key matched case-insensitively. */
export function dockForKey(entries: readonly DockEntry[], event: {key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean}): DockEntry | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return null;
  const key = event.key.toLowerCase();
  return entries.find(e => !e.hidden && e.key === key) ?? null;
}
/** How a shortcut key is written on its label ("Z", ","). */
export const keyLabel = (key: string) => key.toUpperCase();
