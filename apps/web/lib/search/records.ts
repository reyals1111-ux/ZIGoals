import {DIRECTORY_NAMES} from '@zigoals/ecosystem-registry/directory-names';
import type {Checklist} from '../checklist/schema';
import type {Tasks} from '../tasks/schema';
import {hasOperator, matchTasks} from '../tasks/search';
import {scoreItem, type SearchHit, type SearchItem} from './engine';

/**
 * Session AL (P-LS-05, P-PR-40; LS-005, LS-047, LS-H47, PR-102, PR-112): the records global search also finds.
 * - Tasks go through the Tasks page's own matcher (lib/tasks/search.ts, lane L5), so the same operators work in both
 *   places: `p1`, `today`, `overdue`, `tomorrow`, `no date`, `#Project`, `@label`, `goal:`, `&`, `|`, `!`. Open tasks only,
 *   unless the words ask for `done`.
 * - The Checklist's own items (a custom item's name, or the short word a person put on an item).
 * - The Ecosystem's projects, by name and category.
 * Everything here is this device's own record or the app's own directory; nothing leaves the device.
 */
const dueWords = (due: string | undefined, done: boolean, today: string) => done ? 'done' : !due ? 'no date' : due < today ? `overdue · ${due}` : due === today ? 'today' : due;

/** Tasks the words match, as hits. An operator search ranks tasks first; plain words rank by how well the title matches. */
export function taskHits(record: Tasks | null | undefined, query: string, today: string, limit = 6): SearchHit[] {
  if (!record || !query.trim()) return [];
  // A typed operator (#, @, p1, due:, &, |, !) puts tasks first; a bare word such as "today" or "open" also names a page or
  // an action, so there tasks rank by their title like everything else.
  const operator = hasOperator(query) && /[#@&|!]|\bp[1-4]\b|\b\w+:/i.test(query), names = new Map((record.projects ?? []).map(p => [p.id, p.name]));
  return matchTasks(record, query, {today}).slice(0, limit).map(t => {
    const subtitle = ['Task', dueWords(t.due, !!t.doneAt, today), t.projectId ? `#${names.get(t.projectId) ?? 'project'}` : 'Inbox', ...(t.labels ?? []).map(l => `@${l}`)].join(' · ');
    const item: SearchItem = {id: `task:${t.id}`, kind: 'task', title: t.title, subtitle, href: `/app/tasks?task=${encodeURIComponent(t.id)}`, keywords: t.notes ? [t.notes] : undefined};
    // A task matched by an operator alone (no title word) still shows; an operator search puts tasks at the top.
    return {...item, score: operator ? 40 : scoreItem(item, query) ?? 4};
  });
}

/** The Checklist's own items: custom items by their name, and any item by the word a person gave it on the path. */
export function checklistSearchItems(checklist: Checklist | null | undefined): SearchItem[] {
  if (!checklist) return [];
  const out: SearchItem[] = [];
  for (const item of checklist.items ?? []) {
    const title = (item.kind === 'custom' ? item.label : undefined) ?? item.pathLabel;
    if (!title?.trim()) continue;
    out.push({id: `checklist:${item.id}`, kind: 'checklist', title: title.trim(), subtitle: item.kind === 'custom' ? 'On your Checklist path' : `On your Checklist path · ${item.kind === 'habit' ? 'a habit' : 'a goal step'}`, href: '/app/checklist', keywords: item.label && item.label !== title ? [item.label] : undefined});
  }
  return out;
}

/** The Ecosystem's projects (the app's own directory), opening on their card. */
export const ECOSYSTEM_SEARCH_ITEMS: readonly SearchItem[] = Object.freeze(Object.entries(DIRECTORY_NAMES).map(([id, entry]): SearchItem => ({id: `ecosystem:${id}`, kind: 'ecosystem', title: entry.name, subtitle: `Ecosystem · ${entry.category} · research only`, href: `/app/ecosystem#project-${id}`, keywords: [entry.category, 'zigchain', 'project']})));
