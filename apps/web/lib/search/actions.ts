import {normalize, scoreItem} from './engine';

/**
 * The search palette's actions (Session AK, F5d): things to do, found by name ("log water", "start focus", "add
 * contribution", "open review", "open agenda"). An action never writes: it opens the page, the view or the existing
 * flow where the person finishes it with that flow's own button and confirm (Today's water button, Health's entry form,
 * a goal's Contribute → Preview → Confirm, the focus garden's Start). Pure and synchronous; the palette scores them with
 * the search engine's own `scoreItem`. A query that starts with ">" shows actions only.
 */
export type ActionEffect = 'opens' | 'confirm';
export type PaletteAction = {
  id: string; title: string; subtitle: string; keywords: readonly string[];
  /** Where it opens: an app path (with the page's own `?add=`, `?shortcut=`, `?view=` or anchor). */
  href: string;
  /** `confirm`: it opens a flow that asks the person to confirm before anything is saved; `opens`: it only opens a place. */
  effect: ActionEffect;
  pillar?: 'goals' | 'habits' | 'health' | 'wealth';
};
export const ACTION_PREFIX = '>';

export const PALETTE_ACTIONS: readonly PaletteAction[] = [
  {id: 'action:log-water', title: 'Log water', subtitle: 'Today · the water button, one tap away', keywords: ['water', 'drink', 'hydrate', 'glass', 'log'], href: '/app?shortcut=water', effect: 'confirm', pillar: 'health'},
  {id: 'action:log-food', title: 'Log a meal', subtitle: 'Health · the food entry form', keywords: ['food', 'meal', 'eat', 'calories', 'diary', 'log'], href: '/app/health?add=entry', effect: 'confirm', pillar: 'health'},
  {id: 'action:log-weight', title: 'Log weight', subtitle: 'Health · the weight field', keywords: ['weight', 'weigh', 'scale', 'kg', 'lb', 'log'], href: '/app/health?shortcut=weight#weight', effect: 'confirm', pillar: 'health'},
  {id: 'action:start-workout', title: 'Start a workout', subtitle: 'Health · Workouts', keywords: ['workout', 'gym', 'train', 'lift', 'exercise', 'start'], href: '/app/health?view=workouts', effect: 'confirm', pillar: 'health'},
  {id: 'action:start-focus', title: 'Start focus', subtitle: 'Journey · the focus garden', keywords: ['focus', 'timer', 'pomodoro', 'deep work', 'concentrate', 'start', 'session'], href: '/app/journey#focus', effect: 'confirm'},
  {id: 'action:check-in', title: 'Check in a habit', subtitle: 'Habits', keywords: ['habit', 'check in', 'done', 'complete', 'tick'], href: '/app/habits', effect: 'confirm', pillar: 'habits'},
  {id: 'action:add-habit', title: 'Add a habit', subtitle: 'Habits · the new habit form', keywords: ['habit', 'new', 'create', 'add', 'routine'], href: '/app/habits?add=habit', effect: 'confirm', pillar: 'habits'},
  {id: 'action:add-contribution', title: 'Add a contribution', subtitle: 'Goals · choose a goal, then Contribute', keywords: ['contribution', 'contribute', 'fund', 'save', 'deposit', 'add', 'money'], href: '/app/goals', effect: 'opens', pillar: 'goals'},
  {id: 'action:add-goal', title: 'Create a goal', subtitle: 'Goals · the goal wizard', keywords: ['goal', 'new', 'create', 'add', 'target'], href: '/app/goals/new', effect: 'confirm', pillar: 'goals'},
  {id: 'action:add-asset', title: 'Add an asset', subtitle: 'Wealth · the asset form', keywords: ['asset', 'account', 'holding', 'add', 'track'], href: '/app/wealth?add=asset', effect: 'confirm', pillar: 'wealth'},
  {id: 'action:add-bill', title: 'Add a bill', subtitle: 'Wealth · Bills', keywords: ['bill', 'subscription', 'rent', 'due', 'add'], href: '/app/wealth?view=bills', effect: 'confirm', pillar: 'wealth'},
  {id: 'action:open-review', title: 'Open the weekly review', subtitle: 'Life review', keywords: ['review', 'weekly review', 'reflect', 'week', 'look back', 'open'], href: '/app/review', effect: 'opens', pillar: 'goals'},
  {id: 'action:open-agenda', title: 'Open the agenda', subtitle: 'Your days: habits, contributions, bills, meals, reviews', keywords: ['agenda', 'calendar', 'schedule', 'upcoming', 'week', 'month', 'plan', 'open'], href: '/app/agenda', effect: 'opens'},
  {id: 'action:export-calendar', title: 'Export to a calendar (.ics)', subtitle: 'Agenda · choose what goes in, then download', keywords: ['ics', 'ical', 'calendar', 'export', 'google calendar', 'outlook', 'apple calendar'], href: '/app/agenda?export=1', effect: 'confirm'},
  {id: 'action:open-timeline', title: 'Open the day timeline', subtitle: 'Today as a timeline', keywords: ['timeline', 'today', 'day', 'plan', 'open'], href: '/app/timeline', effect: 'opens'},
  {id: 'action:open-wrapped', title: 'Open ZIGoals Wrapped', subtitle: 'Your year in a few cards', keywords: ['wrapped', 'year', 'year in review', 'recap', 'story', 'open'], href: '/app/journey?wrapped=open', effect: 'opens'},
  {id: 'action:ask-zigi', title: 'Ask ZIGi', subtitle: 'Opens ZIGi; nothing is sent until you send it', keywords: ['zigi', 'ask', 'chat', 'assistant', 'help'], href: '/app?shortcut=ask', effect: 'opens'},
];
/** Offered before anything is typed. */
export const SUGGESTED_ACTIONS: readonly string[] = ['action:log-water', 'action:start-focus', 'action:open-agenda', 'action:open-review'];

/** One "Add a contribution to …" per active goal with a plan or without (a tracked goal's Contribute flow, which previews and asks to confirm). */
export function goalContributionActions(goals: readonly {id: string; name: string; status: string; type: string}[], max = 20): PaletteAction[] {
  return goals.filter(g => g.status === 'active' && g.type !== 'PROJECT' && /^\d+$/.test(g.id)).slice(0, max).map(g => ({
    id: `action:contribute:${g.id}`, title: `Add a contribution to ${g.name}`, subtitle: 'Goals · preview, then confirm', keywords: ['contribution', 'contribute', 'fund', 'add', 'money'],
    href: `/app/goals/tracked/${encodeURIComponent(g.id)}?contribute=1`, effect: 'confirm', pillar: 'goals',
  }));
}
export type ActionHit = PaletteAction & {score: number};
/** The actions a query names, best first; ">" alone lists them all. At most `limit`. */
export function searchActions(actions: readonly PaletteAction[], query: string, limit = 5): ActionHit[] {
  const q = query.trim().replace(/^>\s*/, '');
  if (!normalize(q)) return query.trim().startsWith(ACTION_PREFIX) ? actions.slice(0, limit).map(a => ({...a, score: 0})) : [];
  const hits: ActionHit[] = [];
  for (const a of actions) { const score = scoreItem({id: a.id, kind: 'page', title: a.title, subtitle: a.subtitle, href: a.href, keywords: a.keywords}, q); if (score !== null) hits.push({...a, score}); }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, limit);
}
/** Whether the query asks for actions only (">water"). */
export const actionsOnly = (query: string) => query.trim().startsWith(ACTION_PREFIX);
/** Plain words for what choosing it does (the palette's preview). */
export const effectLine = (a: Pick<PaletteAction, 'effect'>) => a.effect === 'confirm' ? 'Opens it ready to finish; nothing is saved until you confirm there.' : 'Opens the page; nothing is saved.';
