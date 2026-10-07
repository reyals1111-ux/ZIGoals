import type {DashboardPreset} from '../dashboard-settings';
import type {Pages, VisibilityId} from '../pages/schema';
import {AVAILABLE_PAGES, viewOf, withChoice} from '../pages/visibility';
import {BUTTON_IDS, PAGE_IDS} from '../pages/schema';
import {HABIT_TEMPLATES, type HabitTemplate, type HabitTemplateGroup} from './habits';

/**
 * "What do you want to improve?" (Session W Part 3): the welcome's pillars, and what each one shows. Picking pillars
 * sets the pages and buttons that show (Part 2's stamped choices, editable any time in Settings → Your pages & buttons)
 * and Today's starting layout; picking none changes neither.
 */
export const PILLARS = ['goals-money', 'habits', 'health-food', 'sleep-mind', 'chess', 'music'] as const;
export type Pillar = typeof PILLARS[number];
export const PILLAR_TEXT: Readonly<Record<Pillar, {label: string; note: string}>> = {
  'goals-money': {label: 'Goals & money', note: 'Plans, wealth and the money tools'},
  habits: {label: 'Habits', note: 'Small steps that last'},
  'health-food': {label: 'Health & food', note: 'Meals, water, steps and weight'},
  'sleep-mind': {label: 'Sleep & mind', note: 'Sleep, meditation and calm'},
  chess: {label: 'Chess', note: 'Your ratings, games and puzzles'},
  music: {label: 'Music', note: 'Your soundtrack while you plan'},
};
const SHOWS: Readonly<Record<Pillar, readonly VisibilityId[]>> = {
  'goals-money': ['goals', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'wealth-shortcut'],
  habits: ['habits'],
  'health-food': ['health'],
  'sleep-mind': ['health'],
  chess: ['chess'],
  music: ['music'],
};
/** Shown whatever is picked: Today, Activity, Quick add, the ZIGi button and My links. */
const ALWAYS: readonly VisibilityId[] = ['today', 'activity', 'quick-add', 'zigi', 'links'];

/**
 * The pages choice for these pillars over the person's current one (`base`): a stamped choice for every page and button
 * whose state changes; null when nothing is picked or nothing changes (then nothing is written). On a device that never
 * chose, the base is empty, so only what differs from the defaults is written.
 */
export function pagesForPillars(pillars: readonly Pillar[], at: string, base: Pages = {version: 1, items: {}}): Pages | null {
  if (!pillars.length) return null;
  const shown = new Set<VisibilityId>([...ALWAYS, ...pillars.flatMap(p => SHOWS[p])]), current = viewOf(base);
  let pages = base;
  for (const id of [...PAGE_IDS, ...BUTTON_IDS]) {
    const want = shown.has(id);
    if (want === current.hidden.includes(id)) pages = withChoice(pages, id, want, at);
  }
  return pages === base ? null : pages;
}
/** The pages that will show after finishing, in navigation order (for the welcome's summary). */
export const pagesShownFor = (pillars: readonly Pillar[], base?: Pages) => {
  const pages = pagesForPillars(pillars, '1970-01-01T00:00:00.000Z', base);
  const view = viewOf(pages ?? base);
  return AVAILABLE_PAGES.filter(id => !view.hidden.includes(id));
};
/** Today's starting layout for these pillars, or null to leave Today as it is. */
export function presetForPillars(pillars: readonly Pillar[]): DashboardPreset | null {
  const money = pillars.includes('goals-money'), habits = pillars.includes('habits'), health = pillars.includes('health-food') || pillars.includes('sleep-mind');
  if (money) return habits || health ? 'balanced' : 'wealth';
  if (habits) return 'habits-health';
  if (health) return 'health';
  return null;
}
/** The starter habits to suggest: three from each group the pillars point to, or one from every group when none is picked. */
export function starterHabits(pillars: readonly Pillar[]): HabitTemplate[] {
  const groups: HabitTemplateGroup[] = [...new Set(pillars.flatMap((p): HabitTemplateGroup[] => p === 'goals-money' ? ['money'] : p === 'habits' ? ['fitness', 'learning', 'home'] : p === 'health-food' ? ['health'] : p === 'sleep-mind' ? ['sleep', 'mind'] : p === 'chess' ? ['chess'] : []))];
  if (!groups.length) return (['fitness', 'health', 'learning', 'mind', 'sleep', 'money', 'home'] as const).map(g => HABIT_TEMPLATES.find(t => t.group === g)!);
  return groups.flatMap(g => HABIT_TEMPLATES.filter(t => t.group === g).slice(0, 3));
}
