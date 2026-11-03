import * as z from 'zod';
import {goalExtrasSchema, type GoalExtra, type GoalExtras} from '../goal-extras/store';
import {moveById, moveItem} from '../habits-order/reorder';

/**
 * Session AK (6.4): suggested milestone sets per kind of goal, beside the template library (lib/templates/goal-library.ts,
 * whose own `milestones` stay as they are). A set is offered in the goal form for a template it names (`libraryIds`) or
 * a goal name its keywords match; the person picks, edits, reorders or drops any milestone before it is saved. As in the
 * library, a money set never suggests a sum: a milestone's `share` is a fraction of the person's OWN target, worked out
 * only once they typed one.
 *
 * Habit → milestone links ("Easy run" works toward "Run 5 km") live in the goal extras record
 * (`zigoals:goal-extras:v1`, lib/goal-extras/store.ts): `goalExtraSchema` is a LOOSE object that syncs in the `goals`
 * extras section, so the new optional field `milestoneHabits` ({milestoneId: habitId[]}) is additive; this module
 * validates it on its own until the lead names it in the schema. Nothing goes into the strict finance goal record.
 */
export type MilestoneStep = {title: string; share?: number};
export type MilestoneSet = {id: string; title: string; kind: 'value' | 'project'; keywords: readonly string[]; libraryIds: readonly string[]; steps: readonly MilestoneStep[]};
const s = (title: string, share?: number): MilestoneStep => share === undefined ? {title} : {title, share};
export const MILESTONE_SETS: readonly MilestoneSet[] = [
  {id: 'launch-project', title: 'Launch a project', kind: 'project', keywords: ['launch', 'side project', 'startup', 'app', 'business', 'product', 'website'], libraryIds: ['side-project', 'portfolio-site', 'creative-project'],
    steps: [s('Write down the idea and who it is for'), s('Talk to five possible users'), s('Build a first small version'), s('Share it with the first users'), s('Fix what they found'), s('Launch')]},
  {id: 'buy-home', title: 'Buy a home', kind: 'value', keywords: ['house', 'home', 'flat', 'apartment', 'deposit', 'mortgage', 'property'], libraryIds: ['house-deposit'],
    steps: [s('Set a budget I am comfortable with'), s('A quarter of the deposit', 0.25), s('Half of the deposit', 0.5), s('Three quarters of the deposit', 0.75), s('The full deposit', 1), s('Mortgage offer in principle'), s('Keys in hand')]},
  {id: 'run-5k', title: 'Run a 5K', kind: 'project', keywords: ['5k', '5 km', 'couch to 5k', 'parkrun'], libraryIds: [],
    steps: [s('Run 1 minute, walk 1 minute, for 20 minutes'), s('Run 1 km without stopping'), s('Run 3 km'), s('Run 5 km')]},
  {id: 'run-10k', title: 'Run a 10K', kind: 'project', keywords: ['10k', '10 km', 'race', 'running'], libraryIds: ['run-10k'],
    steps: [s('Run 3 km without stopping'), s('Run 5 km'), s('Run 8 km'), s('Run 10 km'), s('Sign up for a race'), s('Race day')]},
  {id: 'half-marathon', title: 'Run a half marathon', kind: 'project', keywords: ['half marathon', '21k', '21 km'], libraryIds: [],
    steps: [s('Run 5 km'), s('Run 10 km'), s('Run 15 km'), s('Run 18 km'), s('Race day: 21.1 km')]},
  {id: 'learn-language', title: 'Learn a language', kind: 'project', keywords: ['language', 'spanish', 'french', 'german', 'dutch', 'italian', 'japanese', 'chinese', 'fluent'], libraryIds: ['language'],
    steps: [s('The first 100 words'), s('Order food and ask the way'), s('A 10-minute conversation'), s('Read a short article'), s('Watch a show without subtitles'), s('A test at my level')]},
  {id: 'emergency-fund', title: 'Emergency fund', kind: 'value', keywords: ['emergency', 'rainy day', 'safety net', 'buffer'], libraryIds: ['emergency-fund'],
    steps: [s('Work out one month of essential costs'), s('One month of costs', 1 / 6), s('Three months of costs', 0.5), s('Six months of costs', 1)]},
  {id: 'pay-off-debt', title: 'Pay off a debt', kind: 'value', keywords: ['debt', 'credit card', 'loan', 'pay off', 'overdraft'], libraryIds: ['pay-off-card'],
    steps: [s('List every balance and its rate'), s('First payment above the minimum'), s('A quarter paid off', 0.25), s('Half paid off', 0.5), s('Paid off', 1)]},
  {id: 'trip', title: 'Save for a trip', kind: 'value', keywords: ['trip', 'holiday', 'vacation', 'travel', 'journey'], libraryIds: ['holiday-fund', 'trip-new-country'],
    steps: [s('Choose where and when'), s('Half saved', 0.5), s('Book the travel'), s('Fully saved', 1)]},
  {id: 'new-job', title: 'Find a new job', kind: 'project', keywords: ['job', 'career', 'cv', 'resume', 'interview'], libraryIds: ['new-job', 'promotion'],
    steps: [s('Write my wish list'), s('Update my CV and profile'), s('Ten applications or contacts'), s('First interview'), s('Offer signed')]},
  {id: 'read-books', title: 'Read more books', kind: 'project', keywords: ['read', 'books', 'reading'], libraryIds: ['read-12'],
    steps: [s('Choose the first three books'), s('A quarter of the way'), s('Halfway'), s('Three quarters'), s('The last book')]},
  {id: 'certification', title: 'Earn a certification', kind: 'project', keywords: ['exam', 'certificate', 'certification', 'course', 'qualification'], libraryIds: ['certification', 'online-course'],
    steps: [s('Pick the certificate and the date'), s('Finish the course material'), s('Pass a practice exam'), s('Book the exam'), s('Pass the exam')]},
];
const fold = (t: string) => t.toLocaleLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
/** The set for a library template, else the first whose keyword the goal's name holds; null when none fits. */
export function milestoneSetFor({templateId, name}: {templateId?: string | null; name?: string | null}): MilestoneSet | null {
  if (templateId) { const byTemplate = MILESTONE_SETS.find(m => m.libraryIds.includes(templateId) || m.id === templateId); if (byTemplate) return byTemplate; }
  if (!name?.trim()) return null;
  const n = ` ${fold(name).replace(/[^a-z0-9 ]+/g, ' ')} `;
  let best: {set: MilestoneSet; length: number} | null = null;
  for (const set of MILESTONE_SETS) for (const k of set.keywords) if (n.includes(` ${k} `) && (!best || k.length > best.length)) best = {set, length: k.length};
  return best?.set ?? null;
}
/**
 * The milestones a set makes, in the goal record's own shape (title; target as a whole number of the goal's smallest
 * units, a string, as finance keeps it). A share gets a target only for a value goal whose target the person typed.
 */
export function milestonesFromSet(set: MilestoneSet, target?: bigint | null): {title: string; target?: string}[] {
  return set.steps.map(step => {
    if (set.kind !== 'value' || step.share === undefined || !target || target <= 0n) return {title: step.title};
    const units = target * BigInt(Math.round(step.share * 1_000_000)) / 1_000_000n;
    return units > 0n ? {title: step.title, target: String(units)} : {title: step.title};
  });
}
/** Reorder a milestone list (by id, or by index for a drag). */
export const moveMilestone = <T extends {id: string}>(list: readonly T[], id: string, by: -1 | 1 | 'top' | 'bottom'): T[] => {
  const order = moveById(list.map(m => m.id), id, by);
  return order.map(i => list.find(m => m.id === i)!);
};
export const moveMilestoneTo = <T,>(list: readonly T[], from: number, to: number): T[] => moveItem(list, from, to);

// Habit → milestone links in the goal extras.
export const MAX_LINKED_HABITS = 20, MAX_LINKED_MILESTONES = 100;
const goalKey = z.string().regex(/^(private|legacy|health|average):[A-Za-z0-9_-]{1,80}$/);
export const milestoneHabitsSchema = z.record(z.string().min(1).max(250), z.array(z.string().min(1).max(100)).min(1).max(MAX_LINKED_HABITS))
  .refine(m => Object.keys(m).length <= MAX_LINKED_MILESTONES, `Up to ${MAX_LINKED_MILESTONES} milestones can have habits.`)
  .refine(m => Object.values(m).every(ids => new Set(ids).size === ids.length), 'A habit is linked once.');
export type MilestoneHabits = z.infer<typeof milestoneHabitsSchema>;
export function milestoneHabitsOf(extras: GoalExtras, key: string): MilestoneHabits {
  const parsed = milestoneHabitsSchema.safeParse((extras.goals[key] as Record<string, unknown> | undefined)?.milestoneHabits);
  return parsed.success ? parsed.data : {};
}
export const habitsForMilestone = (extras: GoalExtras, key: string, milestoneId: string): string[] => milestoneHabitsOf(extras, key)[milestoneId] ?? [];
/** The milestones a habit works toward in one goal. */
export const milestonesForHabit = (extras: GoalExtras, key: string, habitId: string): string[] => Object.entries(milestoneHabitsOf(extras, key)).filter(([, ids]) => ids.includes(habitId)).map(([m]) => m);
function putLinks(extras: GoalExtras, key: string, links: MilestoneHabits, at: string): GoalExtras {
  goalKey.parse(key);
  const checked = milestoneHabitsSchema.parse(links);
  const current: GoalExtra = {...(extras.goals[key] ?? {})};
  const next: Record<string, unknown> = {...current, updatedAt: at};
  if (Object.keys(checked).length) next.milestoneHabits = checked; else delete next.milestoneHabits;
  const goals = {...extras.goals};
  const {updatedAt: _u, ...rest} = next; void _u;
  if (Object.values(rest).some(v => v !== undefined)) goals[key] = next as GoalExtra; else delete goals[key];
  return goalExtrasSchema.parse({...extras, goals});
}
export function linkHabitToMilestone(extras: GoalExtras, key: string, milestoneId: string, habitId: string, at: string): GoalExtras {
  const links = {...milestoneHabitsOf(extras, key)}, ids = links[milestoneId] ?? [];
  if (ids.includes(habitId)) return extras;
  if (ids.length >= MAX_LINKED_HABITS) throw Error(`Up to ${MAX_LINKED_HABITS} habits per milestone.`);
  links[milestoneId] = [...ids, habitId];
  return putLinks(extras, key, links, at);
}
export function unlinkHabitFromMilestone(extras: GoalExtras, key: string, milestoneId: string, habitId: string, at: string): GoalExtras {
  const links = {...milestoneHabitsOf(extras, key)}, ids = (links[milestoneId] ?? []).filter(id => id !== habitId);
  if (ids.length === (links[milestoneId]?.length ?? 0)) return extras;
  if (ids.length) links[milestoneId] = ids; else delete links[milestoneId];
  return putLinks(extras, key, links, at);
}
/** Links to milestones or habits that no longer exist, removed (after a milestone or a habit is deleted). */
export function pruneMilestoneHabits(extras: GoalExtras, key: string, milestoneIds: ReadonlySet<string>, habitIds: ReadonlySet<string>, at: string): GoalExtras {
  const links = milestoneHabitsOf(extras, key), next: MilestoneHabits = {};
  for (const [m, ids] of Object.entries(links)) { if (!milestoneIds.has(m)) continue; const kept = ids.filter(id => habitIds.has(id)); if (kept.length) next[m] = kept; }
  return JSON.stringify(next) === JSON.stringify(links) ? extras : putLinks(extras, key, next, at);
}
