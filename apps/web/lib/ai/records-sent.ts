import {AREA_LABELS} from './context/pages';
import type {Handle} from './handles';
import type {PageArea} from './settings';

/**
 * Session Z-Local (Z-Cloud's persona round, finding #7): which records went with a question, as labels a person can read
 * under the reply ("Habits: Drink water, Walk · Today's page data"), kept with the turn (never the values themselves).
 * The handles are the records the question-aware context or the tools selected; the page is the area whose own data
 * went along with "Share this page's data" on.
 */
const KIND_LABELS: Record<string, string> = {habit: 'Habits', goal: 'Goals', food: 'Foods', recipe: 'Recipes', counter: 'Counters', meal: 'Meals', asset: 'Holdings', account: 'Accounts', link: 'Links', widget: 'Widgets', note: 'Notes'};
export function recordsSent(handles: readonly Handle[], page: PageArea | null): string[] {
  const groups = new Map<string, string[]>();
  for (const h of handles) { const kind = KIND_LABELS[h.kind] ?? h.kind; const list = groups.get(kind) ?? []; if (!list.includes(h.label) && list.length < 12) list.push(h.label); groups.set(kind, list); }
  const out = [...groups].map(([kind, labels]) => `${kind}: ${labels.join(', ')}`.slice(0, 80));
  if (page) out.push(`${AREA_LABELS[page]}'s page data`.slice(0, 80));
  return out.slice(0, 40);
}
