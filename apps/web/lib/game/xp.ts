import {habitDay, habitRuleOn, type HabitData} from '../habits';
import type {HealthData} from '../health';
import type {Platform} from '../positions';
import type {WeeklyReview} from '../weekly-review/schema';
import {addLocalDays, localWeekday} from '../local-date';
import {levelProgress, type LevelProgress} from './levels';
import type {ChecklistDays} from '../checklist/schema';
import {ACADEMY_LESSON_IDS, ACADEMY_LESSON_XP} from '../earn/academy-ids';
import type {EarnAcademy} from '../earn/records';

/**
 * XP is derived from the person's own records, never stored: a check-in, a log, a goal step or a review earns points the
 * moment its record exists and loses them the moment Undo removes it, so nothing is lost or counted twice. The rules are
 * this table; a cap per day keeps a busy diary from outweighing a habit. No rule ever subtracts.
 */
export const XP_RULES = {
  habitComplete: 10, habitPartial: 3, diaryEntry: 5, diaryCapPerDay: 20, water: 2, waterCapPerDay: 10, weight: 5, sleep: 5, meditation: 5, activity: 3,
  goalMilestone: 25, goalStatus: 25, contribution: 10, review: 30,
  // Session AG (owner Part 6; ADR-029 I4): the Checklist awards no XP any more (Session AF gave 15 for a day with every dot
  // lit and 5 for its Perfect orbit). Its badges — First orbit, Seven orbits, Perfect orbit — stay (lib/game/badges.ts).
  // Session AF chunk 2 (L1; P1.27): an Earn Academy lesson passed (all three answers right), once per lesson.
  earnLesson: ACADEMY_LESSON_XP,
} as const;
/** Session AF (L3): `checklist` is the Checklist's day history (device-only in AF); `checklistToday` today's summary as the
 *  Checklist derives it from the records (the history holds sealed days only). Both optional. Session AG: they feed the
 *  Checklist's badges only — the Checklist earns no XP. */
export type ChecklistDaySummaryXp = {date: string; total: number; done: number; perfect?: boolean};
/** Session AF chunk 2 (L1): `earnAcademy` is the Earn Academy's device record (`zigoals:earn-academy:v1`); optional, so a store
 *  without it earns no Academy XP, as before. */
export type GameStores = {habits: HabitData; health: HealthData; platform?: Platform | null; weekly?: WeeklyReview | null; checklist?: ChecklistDays | null; checklistToday?: ChecklistDaySummaryXp | null; earnAcademy?: EarnAcademy | null};
export type XpEvent = {id: string; day: string; xp: number; kind: 'habit' | 'health' | 'goal' | 'review' | 'checklist' | 'earn'; title: string};
/** Session AF chunk 2 (L1): the Academy lessons this build knows, passed on or before `today`, each once (by its first pass). */
export function earnLessonsPassed(stores: Pick<GameStores, 'earnAcademy'>, today: string): {id: string; day: string}[] {
  const lessons = stores.earnAcademy?.lessons ?? {};
  return ACADEMY_LESSON_IDS.flatMap(id => { const at = lessons[id]?.passedAt; const day = typeof at === 'string' ? at.slice(0, 10) : null; return day && day <= today ? [{id, day}] : []; });
}
/** Session AF (L3): the days with every counted Checklist dot lit (sealed days, then today once complete), each with its Perfect orbit flag. */
export function checklistOrbitDays(stores: Pick<GameStores, 'checklist' | 'checklistToday'>, today: string): {day: string; perfect: boolean}[] {
  const out = Object.entries(stores.checklist?.days ?? {}).filter(([day, d]) => day < today && d.total > 0 && d.done >= d.total).map(([day, d]) => ({day, perfect: !!d.perfect}));
  const t = stores.checklistToday;
  if (t && t.date === today && t.total > 0 && t.done >= t.total) out.push({day: today, perfect: !!t.perfect});
  return out.sort((a, b) => a.day.localeCompare(b.day));
}
const isoDay = (stamp: string) => stamp.slice(0, 10);
export function xpEvents(stores: GameStores, today: string): XpEvent[] {
  const out: XpEvent[] = [];
  for (const h of stores.habits.habits) {
    for (const e of h.entries) {
      if (e.date > today || e.disposition !== 'logged') continue;
      const day = habitDay(h, e.date, today), rule = habitRuleOn(h, e.date);
      if (!rule || !day.scheduled) continue;
      if (day.status === 'complete') out.push({id: `habit:${h.id}:${e.date}`, day: e.date, xp: XP_RULES.habitComplete, kind: 'habit', title: h.title});
      else if (day.status === 'partial' && e.count > 0) out.push({id: `habit:${h.id}:${e.date}`, day: e.date, xp: XP_RULES.habitPartial, kind: 'habit', title: h.title});
    }
  }
  const perDay = new Map<string, number>();
  const capped = (key: string, cap: number, xp: number) => { const used = perDay.get(key) ?? 0; if (used >= cap) return 0; perDay.set(key, used + xp); return Math.min(xp, cap - used); };
  for (const d of stores.health.diary) { if (d.date > today) continue; const xp = capped(`diary:${d.date}`, XP_RULES.diaryCapPerDay, XP_RULES.diaryEntry); if (xp) out.push({id: `diary:${d.id}`, day: d.date, xp, kind: 'health', title: d.snapshot.name}); }
  for (const w of stores.health.daily?.water ?? []) { if (w.date > today) continue; const xp = capped(`water:${w.date}`, XP_RULES.waterCapPerDay, XP_RULES.water); if (xp) out.push({id: `water:${w.id}`, day: w.date, xp, kind: 'health', title: 'Water'}); }
  for (const w of stores.health.weights) if (w.date <= today) out.push({id: `weight:${w.id}`, day: w.date, xp: XP_RULES.weight, kind: 'health', title: 'Weight'});
  for (const a of stores.health.activity) if (a.date <= today) out.push({id: `activity:${a.id}`, day: a.date, xp: XP_RULES.activity, kind: 'health', title: a.name});
  for (const n of stores.health.sleep?.nights ?? []) { if (!n.end) continue; const day = isoDay(n.end); if (day <= today && n.kind === 'night') out.push({id: `sleep:${n.id}`, day, xp: XP_RULES.sleep, kind: 'health', title: 'A night logged'}); }
  for (const s of stores.health.meditation?.sessions ?? []) { const day = isoDay(s.startedAt); if (day <= today) out.push({id: `meditation:${s.id}`, day, xp: XP_RULES.meditation, kind: 'health', title: 'Meditation'}); }
  if (stores.platform) {
    for (const g of stores.platform.goalHistory) { if (g.kind !== 'milestone' && g.kind !== 'status') continue; const day = isoDay(g.capturedAt); if (day <= today) out.push({id: `goal:${g.id}`, day, xp: g.kind === 'milestone' ? XP_RULES.goalMilestone : XP_RULES.goalStatus, kind: 'goal', title: g.label}); }
    for (const c of stores.platform.contributions) { if (c.direction !== 'IN' || c.reversesId) continue; const day = isoDay(c.occurredAt); if (day <= today) out.push({id: `contribution:${c.id}`, day, xp: XP_RULES.contribution, kind: 'goal', title: 'A contribution'}); }
  }
  for (const r of stores.weekly?.reviews ?? []) if (r.completedAt && isoDay(r.completedAt) <= today) out.push({id: `review:${r.weekStart}`, day: isoDay(r.completedAt), xp: XP_RULES.review, kind: 'review', title: 'Weekly review'});
  // (Session AG: no Checklist events — the kind stays in the summary's breakdown at 0, so older readers of it still read.)
  for (const l of earnLessonsPassed(stores, today)) out.push({id: `earn-lesson:${l.id}`, day: l.day, xp: XP_RULES.earnLesson, kind: 'earn', title: 'An Earn Academy lesson passed'});
  return out;
}
export const weekStart = (day: string) => addLocalDays(day, -((localWeekday(day) + 6) % 7));
export type XpSummary = {total: number; level: LevelProgress; thisWeek: number; lastWeek: number; today: number; byKind: Record<XpEvent['kind'], number>; events: XpEvent[]};
export function xpSummary(stores: GameStores, today: string): XpSummary {
  const events = xpEvents(stores, today), ws = weekStart(today), lastWs = addLocalDays(ws, -7);
  let total = 0, thisWeek = 0, lastWeek = 0, todayXp = 0;
  const byKind: Record<XpEvent['kind'], number> = {habit: 0, health: 0, goal: 0, review: 0, checklist: 0, earn: 0};
  for (const e of events) { total += e.xp; byKind[e.kind] += e.xp; if (e.day >= ws) thisWeek += e.xp; else if (e.day >= lastWs) lastWeek += e.xp; if (e.day === today) todayXp += e.xp; }
  return {total, level: levelProgress(total), thisWeek, lastWeek, today: todayXp, byKind, events};
}
