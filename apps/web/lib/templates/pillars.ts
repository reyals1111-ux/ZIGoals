import type {DashboardPreset} from '../dashboard-settings';
import type {Pages, VisibilityId} from '../pages/schema';
import {AVAILABLE_PAGES, viewOf, withChoice} from '../pages/visibility';
import {BUTTON_IDS, PAGE_IDS} from '../pages/schema';
import {isCryptoPage} from '../chain-choice';
import {HABIT_TEMPLATES, type HabitTemplate, type HabitTemplateGroup} from './habits';

/**
 * "What do you want to improve?" (Session W Part 3): the welcome's pillars, and what each one shows. Picking pillars
 * sets the pages and buttons that show (Part 2's stamped choices, editable any time in Settings → Your pages & buttons)
 * and Today's starting layout; picking none changes neither.
 */
export const PILLARS = ['goals-money', 'habits', 'health-food', 'sleep-mind', 'chess', 'music', 'zigchain'] as const;
export type Pillar = typeof PILLARS[number];
/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-12): the four life areas lead; Chess, Music and the chain are extras on a later
 * line of the same step.
 */
export const MAIN_PILLARS = ['goals-money', 'habits', 'health-food', 'sleep-mind'] as const satisfies readonly Pillar[];
export const EXTRA_PILLARS = ['chess', 'music', 'zigchain'] as const satisfies readonly Pillar[];
export const PILLAR_TEXT: Readonly<Record<Pillar, {label: string; note: string}>> = {
  'goals-money': {label: 'Goals & money', note: 'Plans, savings, budgets and bills'},
  habits: {label: 'Habits', note: 'Small steps that last'},
  'health-food': {label: 'Health & food', note: 'Meals, water, steps and weight'},
  'sleep-mind': {label: 'Sleep & mind', note: 'Sleep, meditation and calm'},
  chess: {label: 'Chess', note: 'Your ratings, games and puzzles'},
  music: {label: 'Music', note: 'Your soundtrack while you plan'},
  zigchain: {label: 'Crypto & ZIGChain', note: 'Wallets, staking and markets (optional)'},
};
/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-6; the owner's "consumer first, chain invisible"): "Goals & money" is Goals and
 * Wealth (money log, budgets, bills) and never the chain. Only the explicit "Crypto & ZIGChain" extra shows the crypto
 * pages, which is choosing the chain (lib/chain-choice.ts); it brings Wealth too, since Earn and Portfolio live beside it.
 */
const SHOWS: Readonly<Record<Pillar, readonly VisibilityId[]>> = {
  'goals-money': ['goals', 'wealth', 'wealth-shortcut'],
  habits: ['habits'],
  'health-food': ['health'],
  'sleep-mind': ['health'],
  chess: ['chess'],
  music: ['music'],
  zigchain: ['wealth', 'markets', 'staking', 'portfolio', 'ecosystem'],
};
/** Shown whatever is picked: Today, Activity, Quick add, the ZIGi button and My links. */
const ALWAYS: readonly VisibilityId[] = ['today', 'activity', 'quick-add', 'zigi', 'links'];

/**
 * The pages choice for these pillars over the person's current one (`base`): a stamped choice for every page and button
 * whose state changes; null when nothing is picked or nothing changes (then nothing is written). On a device that never
 * chose, the base is empty, so only what differs from the defaults is written. `also` adds pages the setup itself needs
 * (R2-12: Habits whenever the welcome creates a habit).
 *
 * The crypto pages are written only to show them, when "Crypto & ZIGChain" is picked: the welcome never chooses the chain
 * on its own, and never hides crypto pages a person switched on earlier (Settings → Your pages & buttons does that).
 */
export function pagesForPillars(pillars: readonly Pillar[], at: string, base: Pages = {version: 1, items: {}}, also: readonly VisibilityId[] = []): Pages | null {
  if (!pillars.length) return null;
  const shown = new Set<VisibilityId>([...ALWAYS, ...pillars.flatMap(p => SHOWS[p]), ...also]), current = viewOf(base);
  let pages = base;
  for (const id of [...PAGE_IDS, ...BUTTON_IDS]) {
    const want = shown.has(id);
    if (!want && isCryptoPage(id)) continue;
    if (want === current.hidden.includes(id)) pages = withChoice(pages, id, want, at);
  }
  return pages === base ? null : pages;
}
/** The pages that will show after finishing, in navigation order (for the welcome's summary). */
export const pagesShownFor = (pillars: readonly Pillar[], base?: Pages, also: readonly VisibilityId[] = []) => {
  const pages = pagesForPillars(pillars, '1970-01-01T00:00:00.000Z', base, also);
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
