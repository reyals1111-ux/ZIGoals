import {habitDay, habitRuleOn, habitStats, type HabitData} from '../habits';
import {quitSummary} from '../habits-extras/quit';
import {levelOf} from './levels';
import {checklistOrbitDays, weekStart, xpEvents, type GameStores} from './xp';
import {addLocalDays} from '../local-date';

/**
 * Badges: each is derived from the records (earned the moment the records show it); the device record keeps the day a
 * badge was first SEEN, so it celebrates once and, from Session AL, stays earned after that. Copy is warm, never guilt.
 */
export type BadgeDef = {id: string; title: string; blurb: string; symbol: string; test: (s: GameStores, today: string) => boolean};
const daysWithCheckIn = (h: HabitData, today: string) => new Set(h.habits.flatMap(x => x.entries.filter(e => e.date <= today && e.disposition === 'logged' && e.count > 0).map(e => e.date)));
export const BADGES: readonly BadgeDef[] = [
  {id: 'first-step', title: 'First step', blurb: 'Your first check-in.', symbol: '✦', test: (s, t) => daysWithCheckIn(s.habits, t).size >= 1},
  {id: 'first-week', title: 'First week', blurb: 'Seven days with a check-in.', symbol: '◐', test: (s, t) => daysWithCheckIn(s.habits, t).size >= 7},
  {id: 'streak-7', title: 'Seven in a row', blurb: 'A seven-day streak on one habit.', symbol: '✶', test: (s, t) => s.habits.habits.some(h => habitStats(h, t).bestStreak >= 7)},
  {id: 'streak-30', title: 'Thirty in a row', blurb: 'A thirty-day streak on one habit.', symbol: '✷', test: (s, t) => s.habits.habits.some(h => habitStats(h, t).bestStreak >= 30)},
  {id: 'hundred', title: 'A hundred check-ins', blurb: 'One hundred completed days, all told.', symbol: '◎', test: (s, t) => s.habits.habits.reduce((n, h) => n + h.entries.filter(e => e.date <= t && e.disposition === 'logged' && habitDay(h, e.date, t).status === 'complete').length, 0) >= 100},
  {id: 'first-goal', title: 'A goal finished', blurb: 'Your first goal reached.', symbol: '◆', test: s => (s.platform?.goals ?? []).some(g => g.status === 'completed') || (s.platform?.goalHistory ?? []).some(g => g.kind === 'status' && /done|reached|complete/i.test(g.label))},
  // Session AL (P-NB-02; NB-251): a whole week (Monday to Sunday, ended or on its Sunday) with all three, never day one.
  {id: 'balanced-week', title: 'Balanced week', blurb: 'A whole week, Monday to Sunday, with a habit, a Health log and a goal step.', symbol: '❂', test: (s, t) => balancedWeek(s, t)},
  {id: 'water-week', title: 'Well watered', blurb: 'Seven days with water logged.', symbol: '◉', test: (s, t) => new Set((s.health.daily?.water ?? []).filter(w => w.date <= t).map(w => w.date)).size >= 7},
  {id: 'reflective', title: 'Reflective', blurb: 'Ten notes or moods on your check-ins.', symbol: '✎', test: (s, t) => s.habits.habits.reduce((n, h) => n + h.entries.filter(e => e.date <= t && (e.note || e.mood)).length, 0) >= 10},
  {id: 'quit-30', title: 'Thirty days clear', blurb: 'Thirty days since on a quit habit.', symbol: '☽', test: (s, t) => s.habits.habits.some(h => habitRuleOn(h, t)?.type === 'quit' && quitSummary(h, t).daysSince >= 30)},
  {id: 'reviewer', title: 'Reviewer', blurb: 'Four weekly reviews completed.', symbol: '✧', test: s => (s.weekly?.reviews ?? []).filter(r => r.completedAt).length >= 4},
  {id: 'level-5', title: 'Comet', blurb: 'Level 5 reached.', symbol: '☄', test: (s, t) => levelOf(xpEvents(s, t).reduce((n, e) => n + e.xp, 0)) >= 5},
  {id: 'level-10', title: 'Quasar', blurb: 'Level 10 reached.', symbol: '✺', test: (s, t) => levelOf(xpEvents(s, t).reduce((n, e) => n + e.xp, 0)) >= 10},
  // Session AF (L3; P7.7, P7.13): from the Checklist's day history (and today, once every planet is lit). Gate C design review: "planets", the Checklist's own word.
  {id: 'first-orbit', title: 'First orbit', blurb: 'A day with every planet on your path lit.', symbol: '◍', test: (s, t) => checklistOrbitDays(s, t).length >= 1},
  {id: 'seven-orbits', title: 'Seven orbits', blurb: 'Seven days with every planet on your path lit.', symbol: '⊛', test: (s, t) => checklistOrbitDays(s, t).length >= 7},
  {id: 'perfect-orbit', title: 'Perfect orbit', blurb: 'Every planet lit in path order, in one day.', symbol: '✪', test: (s, t) => checklistOrbitDays(s, t).some(o => o.perfect)},
];
/** A Monday-to-Sunday week that has ended (or ends today) with a habit, a Health log and a goal step in it. */
function balancedWeek(s: GameStores, today: string): boolean {
  const byWeek = new Map<string, Set<string>>();
  for (const e of xpEvents(s, today)) { const ws = weekStart(e.day); if (addLocalDays(ws, 6) > today) continue; const k = byWeek.get(ws) ?? new Set<string>(); k.add(e.kind); byWeek.set(ws, k); }
  return [...byWeek.values()].some(k => k.has('habit') && k.has('health') && k.has('goal'));
}
export type Badge = Omit<BadgeDef, 'test'> & {earned: boolean};
/**
 * Session AL (P-NB-02; NB-171): a badge once earned stays earned ("Nothing is ever taken away"): `kept` is the device's
 * record of badges already shown or remembered (`badgesSeen`), so an Undo of the check-in behind it never unlights it.
 */
export function badges(stores: GameStores, today: string, kept?: Readonly<Record<string, string>>): Badge[] { return BADGES.map(({test, ...b}) => ({...b, earned: !!kept?.[b.id] || test(stores, today)})); }
/** The path of milestones for the Journey page: every level up to two past the current one, with the badges that sit on it. */
export type PathStop = {level: number; name: string; xp: number; reached: boolean; current: boolean; badges: Badge[]};
export function journeyPath(stores: GameStores, today: string, currentLevel: number, xp: number, kept?: Readonly<Record<string, string>>): PathStop[] {
  const all = badges(stores, today, kept);
  const levelBadge = (lvl: number) => all.filter(b => b.id === `level-${lvl}`);
  const last = Math.max(currentLevel + 2, 6);
  return Array.from({length: last}, (_, i) => { const level = i + 1; const floor = level <= 1 ? 0 : 50 * level * level; return {level, name: levelNameOf(level), xp: floor, reached: xp >= floor, current: level === currentLevel, badges: levelBadge(level)}; });
}
function levelNameOf(level: number) { const names = ['Spark', 'Ember', 'Glow', 'Orbit', 'Comet', 'Aurora', 'Nova', 'Nebula', 'Pulsar', 'Quasar', 'Galaxy', 'Cosmos']; return level <= names.length ? names[level - 1]! : `Cosmos ${level - names.length + 1}`; }
export const badgesByDay = (earned: readonly Badge[], seen: Record<string, string> | undefined) => earned.filter(b => b.earned && !seen?.[b.id]);
