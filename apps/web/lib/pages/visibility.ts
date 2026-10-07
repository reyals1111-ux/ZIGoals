import {BUTTON_IDS, PAGE_IDS, type ButtonId, type PageId, type Pages, type PagesView, type VisibilityId} from './schema';

/**
 * "Your pages & buttons" (Session W Part 2, owner decision W4): which pages and buttons show, and the page ZIGoals opens
 * on. Pure functions over the synced choice (settings v3 `pages`) and the device's mirror of it (`zigoals:pages-view:v1`).
 * Settings and Help have no switch and always show. A page id may exist in the format before its page lands in this
 * build (Chess arrives with Part 14, the music player with Part 20, My links with Part 19): only the available ones get a
 * switch, a navigation entry or a start-page choice, and a choice stored for one waits until it arrives.
 */
export const PAGE_HREF: Readonly<Record<PageId, string>> = {
  today: '/app', goals: '/app/goals', habits: '/app/habits', health: '/app/health', wealth: '/app/wealth', markets: '/app/markets',
  staking: '/app/staking', portfolio: '/app/portfolio', ecosystem: '/app/ecosystem', chess: '/app/chess', activity: '/app/activity',
};
export const PAGE_LABEL: Readonly<Record<PageId, string>> = {
  today: 'Today', goals: 'Goals', habits: 'Habits', health: 'Health', wealth: 'Wealth', markets: 'Markets', staking: 'Staking',
  portfolio: 'Portfolio', ecosystem: 'Ecosystem', chess: 'Chess', activity: 'Activity',
};
export const BUTTON_LABEL: Readonly<Record<ButtonId, string>> = {
  'quick-add': 'Quick add', zigi: 'ZIGi button', music: 'Music player', links: 'My links', 'wealth-shortcut': 'Wealth shortcut on phones',
};
/** The pages and buttons this build has, in navigation order. */
export const AVAILABLE_PAGES: readonly PageId[] = PAGE_IDS.filter(id => id !== 'chess');
export const AVAILABLE_BUTTONS: readonly ButtonId[] = BUTTON_IDS.filter(id => id !== 'music' && id !== 'links');
/** Hidden until the person shows them (approved default): Chess and the music player. Showcase shows everything. */
export const DEFAULT_HIDDEN: readonly VisibilityId[] = ['chess', 'music'];
const ALL_IDS: readonly VisibilityId[] = [...PAGE_IDS, ...BUTTON_IDS];

export const defaultView = (showcase = false): PagesView => ({version: 1, hidden: showcase ? [] : [...DEFAULT_HIDDEN]});
/** What an unreadable settings record shows: every page and button (and no start page other than Today). */
export const everythingView = (): PagesView => ({version: 1, hidden: []});

/** The view a stored choice gives: each switch the person set, else its default; the start page if one was chosen. */
export function viewOf(pages: Pages | undefined, showcase = false): PagesView {
  const fallback = new Set(defaultView(showcase).hidden);
  const hidden = ALL_IDS.filter(id => (pages?.items[id]?.v ?? (fallback.has(id) ? 'hidden' : 'shown')) === 'hidden');
  const start = pages?.start?.id ?? undefined;
  return start ? {version: 1, hidden, start} : {version: 1, hidden};
}
export const sameView = (a: PagesView, b: PagesView) => a.start === b.start && a.hidden.length === b.hidden.length && a.hidden.every((id, i) => b.hidden[i] === id);
export const isShown = (view: PagesView, id: VisibilityId) => !view.hidden.includes(id);

/** The page a path belongs to (the navigation's own rule: Today is exactly /app; the old Staking address is Staking's). */
export function pageIdForPath(path: string): PageId | null {
  if (path === '/app') return 'today';
  if (path === '/app/goals/positions') return 'staking';
  for (const id of PAGE_IDS) if (id !== 'today' && (path === PAGE_HREF[id] || path.startsWith(`${PAGE_HREF[id]}/`))) return id;
  return null;
}
export function pageIdForHref(href: string): PageId | null {
  return (Object.keys(PAGE_HREF) as PageId[]).find(id => PAGE_HREF[id] === href) ?? null;
}
/** Whether a navigation destination shows: Settings (and every address that is no page, like Help) always does. */
export function hrefShown(view: PagesView, href: string): boolean {
  const id = pageIdForHref(href);
  return id === null || (AVAILABLE_PAGES.includes(id) && isShown(view, id));
}
/** The visible pages, in navigation order. */
export const visiblePages = (view: PagesView): PageId[] => AVAILABLE_PAGES.filter(id => isShown(view, id));
/** The page ZIGoals opens on: the chosen one while it shows, else the first visible page; null when only Settings is left. */
export function startPage(view: PagesView): PageId | null {
  const visible = visiblePages(view);
  return view.start && visible.includes(view.start) ? view.start : visible[0] ?? null;
}
export const startHref = (view: PagesView) => { const id = startPage(view); return id ? PAGE_HREF[id] : '/app/settings'; };
/** The ZIGoals home link: Today while it shows, else the start page. */
export const homeHref = (view: PagesView) => isShown(view, 'today') ? '/app' : startHref(view);

/**
 * The phone tab bar: the first four visible pages, then More with the rest and Settings (always last), so More is never
 * empty. Each group's first entry (after the first entry of the list) keeps the space before it.
 */
export function phoneTabs<T extends readonly [string, ...unknown[]]>(items: readonly T[]): {tabs: T[]; more: T[]} {
  const pages = items.filter(item => item[0] !== '/app/settings'), settings = items.filter(item => item[0] === '/app/settings');
  return {tabs: pages.slice(0, 4), more: [...pages.slice(4), ...settings]};
}
/** The space before a group: on the first visible entry of each group, never on the list's first entry. */
export function groupStarts(items: readonly (readonly [string, ...unknown[]])[], groupOf: (href: string) => number): Map<string, number> {
  const starts = new Map<string, number>();
  let previous: number | null = null;
  for (const [href] of items) { const group = groupOf(href); if (previous !== null && group !== previous) starts.set(href, group); previous = group; }
  return starts;
}

/** A switch the person set (stamped, so the later choice wins between devices). Unavailable ids and Settings are refused. */
export function withChoice(pages: Pages, id: VisibilityId, shown: boolean, at: string): Pages {
  if (!ALL_IDS.includes(id)) throw Error('Choose a page or button ZIGoals has.');
  return {...pages, items: {...pages.items, [id]: {v: shown ? 'shown' : 'hidden', at}}};
}
/** The start page (null: the first visible page). */
export function withStart(pages: Pages, id: PageId | null, at: string): Pages {
  if (id !== null && !AVAILABLE_PAGES.includes(id)) throw Error('Choose a page ZIGoals has.');
  return {...pages, start: {id, at}};
}
/** "Show everything again": every page and button this build has shows, Chess and the music player included. */
export function showEverything(pages: Pages, at: string): Pages {
  const items = {...pages.items};
  for (const id of [...AVAILABLE_PAGES, ...AVAILABLE_BUTTONS]) items[id] = {v: 'shown', at};
  return {...pages, items};
}
