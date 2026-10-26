import {habitDay, habitStats, type HabitData} from '../habits';
import type {HealthData} from '../health';
import {dailyData} from '../health-daily';
import type {Platform} from '../positions';
import type {Fasting} from '../fasting/schema';
import type {AverageGoal} from '../average-goals/store';
import {addLocalDays} from '../local-date';
import {formatNumber} from '../visual-format';
import {derivedGoalStatus} from '../positions';

/**
 * My Universe (Session AF, L5b; P9.1, ADR-028 H55, H77): a personal star system with one planet per pillar, derived on
 * every read from the person's own records — never from the game layer, so it works with Gamify off. Every count is a
 * cumulative count of something the person did (check-ins, days logged, goals reached, contributions, accounts tracked),
 * so a planet only ever grows: rings and moons come from counts that a missed day cannot lower, and a miss leaves a faint
 * ring (a trace kept, never a deletion). Light is today's own threshold per pillar (Finch's daily energy): it fills from
 * what was done today and is full at the threshold, one state and no reward per tick. Money is counts only — contributions
 * made, accounts tracked, a stake tracked — never a price, a balance, a rate or a return. Nothing here is stored; the
 * only record is the list of milestones already celebrated (lib/universe/store.ts).
 */
export type UniversePillar = 'habits' | 'health' | 'goals' | 'wealth';
export const UNIVERSE_PILLARS: readonly UniversePillar[] = ['habits', 'health', 'goals', 'wealth'];
export const PILLAR_LABEL: Record<UniversePillar, string> = {habits: 'Habits', health: 'Health', goals: 'Goals', wealth: 'Wealth'};
/** The pillar colours (app/visual-v21.css `--pillar-*`), for the share image drawn on a canvas. */
export const PILLAR_HEX: Record<UniversePillar, string> = {goals: '#9273ff', habits: '#23eaff', health: '#ff74be', wealth: '#ffd27a'};
export const MAX_RINGS = 6, MAX_MOONS = 8, MAX_FAINT = 3;
/** The cumulative counts at which a planet gains its 1st…6th ring (and the faint rings' counts of misses). */
export const RING_STEPS: Record<UniversePillar, readonly number[]> = {
  habits: [1, 10, 30, 75, 150, 300],   // habit check-ins completed
  health: [1, 7, 21, 50, 100, 200],    // days with a Health log
  goals: [1, 2, 3, 4, 5, 6],           // goals reached: one ring each
  wealth: [1, 5, 15, 30, 60, 100],     // contributions put into goals
};
export const FAINT_STEPS: Record<'habits' | 'health', readonly number[]> = {habits: [1, 7, 30], health: [1, 4, 12]};

export type Planet = {
  pillar: UniversePillar; label: string;
  /** Bright rings, from the pillar's cumulative count (RING_STEPS). */
  rings: number;
  /** Faint rings: the trace of missed days (Habits) or quiet weeks (Health), kept for good. */
  faintRings: number;
  moons: number;
  /** Today's light, 0–1, or null when the pillar has nothing today could fill (no habit due, no goal, nothing tracked). */
  light: number | null;
  /** Today's threshold reached. */
  lit: boolean;
  /** Wealth only: a stake is tracked (money working on its own). */
  staked?: boolean;
  /** The counts behind the planet, in plain words (shown on tap and on the share image). */
  facts: string[];
  /** What fills today's light, in plain words. */
  lightLine: string;
};
export type Milestone = {id: string; pillar: UniversePillar | 'all'; kind: 'ring' | 'moon' | 'staked' | 'all-four'; level: number; title: string; line: string};
export type Universe = {asOf: string; planets: Planet[]; milestones: Milestone[]; empty: boolean; totals: {rings: number; moons: number}};
export type UniverseInput = {
  habits: HabitData; health: HealthData; platform: Platform; fasting?: Fasting | null;
  averages?: readonly AverageGoal[];
  /** The habits journal's day (habits.today); records after it are ignored. */
  today: string;
};

const stepsReached = (count: number, steps: readonly number[]) => steps.filter(s => count >= s).length;
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
const dayOf = (iso: string) => iso.slice(0, 10);
const span = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

type Counts = {
  checkIns: number; misses: number; streakHabits: number; dueToday: number; doneToday: number;
  healthDays: number; healthKinds: number; quietWeeks: number; healthKindsToday: number; healthEver: boolean;
  goalsReached: number; goalsSetAside: number; milestonesDone: number; goalsAny: boolean; goalMovedToday: boolean;
  contributions: number; tracked: number; stakedSince: string | null; wealthAny: boolean; wealthToday: boolean;
};

/** Everything the universe counts, as of a day (records after it are left out), so a milestone's day can be found. */
export function universeCounts({habits, health, platform, fasting, averages = []}: UniverseInput, asOf: string): Counts {
  // Habits: completed check-ins (as the game layer counts them), missed days, habits that held a 7-day streak.
  let checkIns = 0, misses = 0, streakHabits = 0, dueToday = 0, doneToday = 0;
  for (const h of habits.habits) {
    for (const e of h.entries) {
      if (e.date > asOf || e.disposition !== 'logged') continue;
      const day = habitDay(h, e.date, asOf);
      if (day.scheduled && day.status === 'complete') checkIns++;
    }
    if (h.startDate > asOf) continue;
    const stats = habitStats(h, asOf);
    // Today's open day is not a miss yet: the stats count only days that ended (or were marked missed).
    misses += stats.failCount;
    if (stats.bestStreak >= 7) streakHabits++;
    const today = habitDay(h, asOf, asOf);
    if (today.scheduled && today.status !== 'skipped') { dueToday++; if (today.status === 'complete') doneToday++; }
  }
  // Health: the days with any log, the kinds of log ever kept, the quiet weeks between logs, today's kinds.
  const kinds = new Map<string, Set<string>>();
  const add = (kind: string, date: string) => { if (date > asOf) return; const set = kinds.get(kind) ?? new Set<string>(); set.add(date); kinds.set(kind, set); };
  for (const d of health.diary) add('meals', d.date);
  for (const a of health.activity) add('activity', a.date);
  for (const w of health.weights) add('weight', w.date);
  for (const w of dailyData(health).water) add('water', w.date);
  for (const n of health.sleep?.nights ?? []) if (n.end && n.kind === 'night') add('sleep', dayOf(n.end));
  for (const s of health.meditation?.sessions ?? []) add('meditation', dayOf(s.startedAt));
  for (const f of [...(fasting?.sessions ?? []), ...(health.fasting?.sessions ?? [])]) if (f.endedAt) add('fasting', dayOf(f.endedAt));
  const days = new Set<string>();
  for (const set of kinds.values()) for (const d of set) days.add(d);
  const sorted = [...days].sort();
  let quietWeeks = 0;
  for (let i = 1; i < sorted.length; i++) quietWeeks += Math.floor(Math.max(0, span(sorted[i - 1]!, sorted[i]!) - 1) / 7);
  if (sorted.length) quietWeeks += Math.floor(Math.max(0, span(sorted.at(-1)!, asOf) - 1) / 7);
  const healthKindsToday = [...kinds.values()].filter(set => set.has(asOf)).length;

  // Goals: reached (a tracked goal's "completed" step, an average goal's own day), set aside (closed), milestones ticked.
  let goalsReached = 0, goalsSetAside = 0, milestonesDone = 0;
  for (const g of platform.goals) {
    if (dayOf(g.createdAt) > asOf) continue;
    milestonesDone += g.milestones.filter(m => m.done).length;
    // Session AH (TR6, B-009): reached means the Goal's derived status (its saved progress), as Goals and Today count it,
    // never a stored flag that its progress no longer supports.
    if (g.status !== 'closed' && derivedGoalStatus(platform, g.id) === 'completed') {
      const done = [...(g.lifecycle ?? [])].reverse().find(l => l.kind === 'completed');
      // An older record without the finishing step counts as reached on every day (its day is not recorded).
      if (!done || dayOf(done.at) <= asOf) goalsReached++;
    }
    if (g.status === 'closed') goalsSetAside++;
  }
  for (const a of averages) {
    if (dayOf(a.createdAt) > asOf) continue;
    if (a.status === 'completed' && (!a.completedAt || dayOf(a.completedAt) <= asOf)) goalsReached++;
  }
  const goalsAny = platform.goals.some(g => dayOf(g.createdAt) <= asOf) || averages.some(a => dayOf(a.createdAt) <= asOf);
  const contributionsIn = platform.contributions.filter(c => c.direction === 'IN' && !c.reversesId && dayOf(c.occurredAt) <= asOf);
  const goalMovedToday = contributionsIn.some(c => dayOf(c.occurredAt) === asOf)
    || platform.goalHistory.some(h => (h.kind === 'milestone' || h.kind === 'status') && dayOf(h.capturedAt) === asOf);

  // Wealth: contributions, assets tracked (since their first record), a stake tracked; today's light from a contribution
  // or an account seen today.
  const firstSeen = new Map<string, string>();
  for (const s of platform.snapshots) { const d = dayOf(s.observedAt), old = firstSeen.get(s.positionId); if (!old || d < old) firstSeen.set(s.positionId, d); }
  const sinceOf = (p: Platform['positions'][number]) => [p.trackingStartedAt ? dayOf(p.trackingStartedAt) : null, firstSeen.get(p.id) ?? null, dayOf(p.observedAt)].filter((d): d is string => !!d).sort()[0]!;
  // Session AH (TR6, D-246): assets tracked (holdings, not accounts), leaving out one archived by then.
  const trackedPositions = platform.positions.filter(p => sinceOf(p) <= asOf && !(p.archivedAt && dayOf(p.archivedAt) <= asOf));
  const staked = trackedPositions.filter(p => p.liquidity === 'BONDED' || p.liquidity === 'UNBONDING' || !!p.validator).map(sinceOf).sort();
  const wealthToday = contributionsIn.some(c => dayOf(c.occurredAt) === asOf) || platform.positions.some(p => !p.archivedAt && dayOf(p.observedAt) === asOf);
  return {
    checkIns, misses, streakHabits, dueToday, doneToday,
    healthDays: days.size, healthKinds: kinds.size, quietWeeks, healthKindsToday, healthEver: days.size > 0,
    goalsReached, goalsSetAside, milestonesDone, goalsAny, goalMovedToday,
    contributions: contributionsIn.length, tracked: trackedPositions.length, stakedSince: staked[0] ?? null,
    wealthAny: trackedPositions.length > 0 || contributionsIn.length > 0, wealthToday,
  };
}

/** Today's Health light is full at three kinds of log (water, a meal, a walk, a night, a weight…). */
export const HEALTH_LIGHT_KINDS = 3;

function planets(c: Counts): Planet[] {
  const habitsLight = c.dueToday ? c.doneToday / c.dueToday : null;
  const healthLight = Math.min(1, c.healthKindsToday / HEALTH_LIGHT_KINDS);
  const goalsLight = c.goalsAny ? (c.goalMovedToday ? 1 : 0) : null;
  const wealthLight = c.wealthAny ? (c.wealthToday ? 1 : 0) : null;
  return [
    {pillar: 'habits', label: PILLAR_LABEL.habits, rings: stepsReached(c.checkIns, RING_STEPS.habits), faintRings: stepsReached(c.misses, FAINT_STEPS.habits), moons: Math.min(MAX_MOONS, c.streakHabits),
      light: habitsLight, lit: habitsLight === 1,
      facts: [plural(c.checkIns, 'check-in'), `${plural(c.streakHabits, 'habit')} held a 7-day streak`, ...(c.misses ? [`${plural(c.misses, 'missed day')} kept as faint rings`] : [])],
      lightLine: c.dueToday ? `${formatNumber(c.doneToday)} of ${plural(c.dueToday, 'habit')} due today done` : 'No habit is due today'},
    {pillar: 'health', label: PILLAR_LABEL.health, rings: stepsReached(c.healthDays, RING_STEPS.health), faintRings: stepsReached(c.quietWeeks, FAINT_STEPS.health), moons: Math.min(MAX_MOONS, c.healthKinds),
      light: c.healthEver || c.healthKindsToday ? healthLight : null, lit: healthLight === 1,
      facts: [`${plural(c.healthDays, 'day')} with a Health log`, `${plural(c.healthKinds, 'kind')} of log kept`, ...(c.quietWeeks ? [`${plural(c.quietWeeks, 'quiet week')} kept as faint rings`] : [])],
      lightLine: `${formatNumber(Math.min(c.healthKindsToday, HEALTH_LIGHT_KINDS))} of ${HEALTH_LIGHT_KINDS} kinds of log today`},
    {pillar: 'goals', label: PILLAR_LABEL.goals, rings: Math.min(MAX_RINGS, stepsReached(c.goalsReached, RING_STEPS.goals)), faintRings: Math.min(MAX_FAINT, c.goalsSetAside), moons: Math.min(MAX_MOONS, c.milestonesDone),
      light: goalsLight, lit: goalsLight === 1,
      facts: [plural(c.goalsReached, 'goal') + ' reached', `${plural(c.milestonesDone, 'milestone')} ticked`, ...(c.goalsSetAside ? [`${plural(c.goalsSetAside, 'goal')} set aside, kept as faint rings`] : [])],
      lightLine: !c.goalsAny ? 'No goal yet' : c.goalMovedToday ? 'A goal moved today' : 'No goal moved today yet'},
    {pillar: 'wealth', label: PILLAR_LABEL.wealth, rings: stepsReached(c.contributions, RING_STEPS.wealth), faintRings: 0, moons: Math.min(MAX_MOONS, c.tracked), staked: !!c.stakedSince,
      light: wealthLight, lit: wealthLight === 1,
      facts: [plural(c.contributions, 'contribution') + ' to your goals', `${plural(c.tracked, 'asset')} tracked`, ...(c.stakedSince ? ['A stake is tracked'] : [])],
      lightLine: !c.wealthAny ? 'Nothing tracked yet' : c.wealthToday ? 'Money moved or was checked today' : 'Nothing moved or checked today yet'},
  ];
}

const RING_LINE: Record<UniversePillar, (count: number) => string> = {
  habits: n => `${plural(n, 'habit check-in')} in all.`,
  health: n => `${plural(n, 'day')} with a Health log.`,
  goals: n => `${plural(n, 'goal')} reached.`,
  wealth: n => `${plural(n, 'contribution')} to your goals.`,
};
const MOON_LINE: Record<UniversePillar, (count: number) => string> = {
  habits: n => `${plural(n, 'habit')} held a streak of seven.`,
  health: n => `${plural(n, 'kind')} of Health log kept.`,
  goals: n => `${plural(n, 'goal milestone')} ticked.`,
  wealth: n => `${plural(n, 'asset')} tracked.`,
};
function milestonesOf(list: Planet[]): Milestone[] {
  const out: Milestone[] = [];
  for (const p of list) {
    for (let n = 1; n <= p.rings; n++) out.push({id: `universe:${p.pillar}:ring:${n}`, pillar: p.pillar, kind: 'ring', level: n, title: `${p.label} gained ring ${n}`, line: RING_LINE[p.pillar](RING_STEPS[p.pillar][n - 1]!)});
    for (let n = 1; n <= p.moons; n++) out.push({id: `universe:${p.pillar}:moon:${n}`, pillar: p.pillar, kind: 'moon', level: n, title: `${p.label} gained moon ${n}`, line: MOON_LINE[p.pillar](n)});
    if (p.staked) out.push({id: 'universe:wealth:staked', pillar: 'wealth', kind: 'staked', level: 1, title: 'Money at work', line: 'A stake is tracked in your Wealth: money working on its own.'});
  }
  if (list.every(p => p.rings > 0)) out.push({id: 'universe:all-four', pillar: 'all', kind: 'all-four', level: 1, title: 'All four planets have a ring', line: 'Goals, Habits, Health and Wealth each gained their first ring.'});
  return out;
}

/** The milestone ids this module makes, and what they say about the planets (for the never-regress floor). */
export const MILESTONE_ID = /^universe:(habits|health|goals|wealth):(ring|moon):([1-9]\d?)$/;
/**
 * Growth never regresses (H77): a planet keeps at least what its celebrated milestones say it reached, so a record the
 * person later corrected never takes a ring or a moon off a planet that already celebrated it.
 */
export function withFloor(list: Planet[], celebrated: readonly string[]): Planet[] {
  const floor = new Map<string, number>();
  for (const id of celebrated) { const m = MILESTONE_ID.exec(id); if (!m) continue; const key = `${m[1]}:${m[2]}`; floor.set(key, Math.max(floor.get(key) ?? 0, Number(m[3]))); }
  return list.map(p => ({...p, rings: Math.min(MAX_RINGS, Math.max(p.rings, floor.get(`${p.pillar}:ring`) ?? 0)), moons: Math.min(MAX_MOONS, Math.max(p.moons, floor.get(`${p.pillar}:moon`) ?? 0)), ...(p.pillar === 'wealth' && celebrated.includes('universe:wealth:staked') ? {staked: true} : {})}));
}

/** The universe as of a day. `celebrated` (the milestone ids already celebrated here) only ever adds (withFloor). */
export function universeOf(input: UniverseInput, asOf: string = input.today, celebrated: readonly string[] = []): Universe {
  const list = withFloor(planets(universeCounts(input, asOf)), celebrated);
  const milestones = milestonesOf(list);
  const totals = {rings: list.reduce((s, p) => s + p.rings, 0), moons: list.reduce((s, p) => s + p.moons, 0)};
  const empty = totals.rings === 0 && totals.moons === 0 && list.every(p => !p.light);
  return {asOf, planets: list, milestones, empty, totals};
}

/** How far back a milestone still celebrates once it is first seen: reached within the last week. */
export const CELEBRATE_WITHIN_DAYS = 7;
/**
 * The milestones to celebrate now, newest kind first: reached in the last week by the records' own days (in the universe
 * of today, not in the universe of a week ago) and not yet celebrated on this device. A milestone whose day is not
 * recorded (an older goal without its finishing step, a milestone ticked without a date) is reached "always" and never
 * celebrates; it simply shows. Each id celebrates once (the person's "Lovely" writes it to `zigoals:universe:v1`).
 */
export function pendingCelebrations(input: UniverseInput, celebrated: readonly string[]): Milestone[] {
  const now = universeOf(input, input.today), before = new Set(universeOf(input, addLocalDays(input.today, -CELEBRATE_WITHIN_DAYS)).milestones.map(m => m.id));
  const seen = new Set(celebrated), order = {'all-four': 0, staked: 1, ring: 2, moon: 3} as const;
  return now.milestones.filter(m => !before.has(m.id) && !seen.has(m.id)).sort((a, b) => order[a.kind] - order[b.kind] || b.level - a.level);
}

/**
 * The milestone to name on the compact card: the biggest one reached (all four planets ringed, then the highest ring,
 * then a stake, then the highest moon; planets in their own order on a tie). Its day is not stored, so it is never
 * called "new" unless it is still waiting to be celebrated.
 */
export function newestMilestone(u: Universe): Milestone | null {
  const rank = {'all-four': 0, ring: 1, staked: 2, moon: 3} as const;
  return [...u.milestones].sort((a, b) => rank[a.kind] - rank[b.kind] || b.level - a.level)[0] ?? null;
}

/** The share image's words (counts only, never a price, a rate or a return): a title and one line per planet. */
export function universeShareCard(u: Universe, dateLabel: string): {eyebrow: string; title: string; lines: string[]} {
  return {
    eyebrow: `My universe · ${dateLabel}`,
    title: `${plural(u.totals.rings, 'ring')}, ${plural(u.totals.moons, 'moon')}`,
    lines: u.planets.map(p => `${p.label}: ${plural(p.rings, 'ring')}, ${plural(p.moons, 'moon')} · ${p.facts[0]}`),
  };
}
