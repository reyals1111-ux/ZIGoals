import {getAppStorage} from './showcase-storage';
/**
 * Session AO (RR-16, owner decision 13 Nov): Wealth's longer sections fold on a computer or a tablet by default (Wealth was
 * about 20,720 px tall at 1440 px with the Showcase). Which sections the person opened is remembered on this device. A
 * display convenience, never a record: section ids only, no amounts; not exported, synced or catalogued
 * (lib/erase-coverage.test.ts lists it in NOT_RECORDS); "Erase everything" removes it with every other `zigoals:` key.
 */
export const WEALTH_FOLDS_KEY = 'zigoals:wealth-folds:v1';
const ID = /^[a-z0-9:-]{1,64}$/;
const MAX = 64;

/** The open section ids a stored value names; anything unreadable reads as "none open" (every section folded). */
export function parseOpen(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    const list = value && typeof value === 'object' && !Array.isArray(value) && (value as {version?: unknown}).version === 1 ? (value as {open?: unknown}).open : null;
    return Array.isArray(list) ? [...new Set(list.filter((id): id is string => typeof id === 'string' && ID.test(id)))].slice(0, MAX) : [];
  } catch { return []; }
}
export function serialiseOpen(ids: Iterable<string>): string | null {
  const open = [...new Set([...ids].filter(id => ID.test(id)))].slice(0, MAX).sort();
  return open.length ? JSON.stringify({version: 1, open}) : null;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: {raw: string | null; open: ReadonlySet<string>} | null = null;
// Through the app storage (per account; the Showcase tab's own storage there), as the device records are (security delta, Info).
function store(): Storage | null { try { return typeof window === 'undefined' ? null : getAppStorage(); } catch { return null; } }
function read(): ReadonlySet<string> {
  let raw: string | null = null;
  try { raw = store()?.getItem(WEALTH_FOLDS_KEY) ?? null; } catch { raw = null; }
  if (!cache || cache.raw !== raw) cache = {raw, open: new Set(parseOpen(raw))};
  return cache.open;
}
const EMPTY: ReadonlySet<string> = new Set();
export const wealthFolds = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => { if (event.key === WEALTH_FOLDS_KEY) listener(); };
    window.addEventListener('storage', onStorage);
    return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
  },
  snapshot: read,
  serverSnapshot: () => EMPTY,
  /** Opens or folds one section and remembers it on this device (storage refused: it lasts until the page reloads). */
  set(id: string, open: boolean) {
    const next = new Set(read());
    if (open) next.add(id); else next.delete(id);
    const value = serialiseOpen(next);
    try { if (value) store()?.setItem(WEALTH_FOLDS_KEY, value); else store()?.removeItem(WEALTH_FOLDS_KEY); } catch { /* the choice lasts for this page */ }
    cache = {raw: cache?.raw ?? null, open: next};
    try { cache = {raw: store()?.getItem(WEALTH_FOLDS_KEY) ?? null, open: next}; } catch { /* keep the in-memory set */ }
    for (const listener of listeners) listener();
  },
};
