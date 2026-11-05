/**
 * Session AL fourth pass (LS-H36, C-LS-22): the command palette's rows and how a typed line narrows them. Pure, so the
 * filter is tested without a browser. A row matches when every typed word is found in its label or its extra words
 * (case and accents ignored); with nothing typed, every row shows in its group order.
 */
export type PaletteGroup = 'Actions' | 'Pages' | 'Recent tasks' | 'Ask or search';
/** The groups in the order they show (and ↑/↓ walk them). */
export const PALETTE_GROUPS: readonly PaletteGroup[] = ['Actions', 'Pages', 'Recent tasks', 'Ask or search'];
export type PaletteRow = {id: string; group: PaletteGroup; label: string; detail?: string; words?: string; href?: string; run?: 'quick-add' | 'search' | 'zigi'; keys?: string};

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();
export function filterRows(rows: readonly PaletteRow[], typed: string): PaletteRow[] {
  const words = fold(typed).split(/\s+/).filter(Boolean);
  if (!words.length) return [...rows];
  return rows.filter(r => { const hay = fold(`${r.label} ${r.detail ?? ''} ${r.words ?? ''}`); return words.every(w => hay.includes(w)); });
}

/**
 * The rows in the order they show. `fallbacks` are the rows that carry the typed words whatever they are (Ask ZIGi, Search
 * everything); `hits` are the actions, pages and tasks the words matched. With nothing typed, or nothing matched, Ask ZIGi
 * leads (Q11). Words that name a page, an action or a task put it first, so Enter on "agenda" opens Agenda; Ask ZIGi and
 * Search follow under "Ask or search" (LS-H36: the first row was "Ask ZIGi: “agenda”", and Enter asked ZIGi).
 */
export function orderRows(fallbacks: readonly PaletteRow[], hits: readonly PaletteRow[], typed: string): PaletteRow[] {
  const byGroup = (a: PaletteRow, b: PaletteRow) => PALETTE_GROUPS.indexOf(a.group) - PALETTE_GROUPS.indexOf(b.group);
  if (typed.trim() && hits.length) return [...[...hits].sort(byGroup), ...fallbacks.map(r => ({...r, group: 'Ask or search' as const}))];
  const zigi = fallbacks.filter(r => r.run === 'zigi'), rest = fallbacks.filter(r => r.run !== 'zigi');
  return [...zigi, ...hits.filter(r => r.group === 'Actions'), ...rest, ...hits.filter(r => r.group !== 'Actions')].sort(byGroup);
}

/** The pages beside the sidebar's own: the apps a person opens from the Apps group (O4) or Apps & extras (O3). */
export const APP_PAGES: readonly [href: string, label: string, words: string][] = [
  ['/app/tasks', 'Tasks', 'to-do todo list projects inbox'],
  ['/app/checklist', 'Checklist', 'daily routine path orbit'],
  ['/app/agenda', 'Agenda', 'calendar week day'],
  ['/app/notes', 'Notes', 'capture inbox'],
  ['/app/journal', 'Journal', 'diary energy'],
  ['/app/review', 'Life review', 'week month summary'],
  ['/app/nova', 'NOVA', 'assistant dashboard'],
];
