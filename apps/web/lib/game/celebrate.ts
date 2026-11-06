import {habitStats, type HabitData} from '../habits';
import type {Celebrations} from '../celebrations';
import {badges} from './badges';
import {levelOf, levelName} from './levels';
import {xpEvents, type GameStores, type XpEvent} from './xp';
import {badgesShown, type GameRecord} from './schema';

/**
 * S10: which celebrations are due, derived from the records and the device's "seen" map (`zigoals:celebrations:v1`,
 * Session W's key), so each shows exactly once on this device: a level reached, a new badge, a 100-day streak, a fasting
 * milestone (Part 3 adds its ids), a goal reached (AA-Cloud emits the event; this lane renders it, once a day per kind).
 * Tasteful and one-time; never a punishment, never a loss.
 */
export type Celebration = {id: string; kind: 'level' | 'badge' | 'streak' | 'goal' | 'fast' | 'checklist'; title: string; line: string; symbol: string; semantic?: 'level_up' | 'achievement_unlocked'};
export const celebrationId = {level: (n: number) => `level:${n}`, badge: (id: string) => `badge:${id}`, streak: (habitId: string) => `streak-100:${habitId}`, goal: (type: string, day: string) => `goal:${type}:${day}`, fast: (id: string) => `fast:${id}`, checklist: (moment: 'all' | 'perfect', day: string) => `checklist:${moment}:${day}`};
export function pendingCelebrations(stores: GameStores, game: GameRecord, seen: Celebrations['seen'], today: string, fasting?: {id: string; hours: number; targetHours: number; endedAt: string | null}[]): Celebration[] {
  // The moment the layer is switched on, what the records already hold is remembered (level and badges), not celebrated.
  if (!game.enabled || game.levelSeen === undefined) return [];
  const out: Celebration[] = [];
  const events = xpEvents(stores, today), xp = events.reduce((n, e) => n + e.xp, 0), level = levelOf(xp);
  // The first level ever seen is not a celebration: the layer was just switched on. From then on each new level is.
  if (level > game.levelSeen && !seen[celebrationId.level(level)]) out.push({id: celebrationId.level(level), kind: 'level', title: `Level ${level} · ${levelName(level)}`, line: levelLine(events), symbol: '✦', semantic: 'level_up'});
  // Session AK Part 8.6: badges celebrate only while they are shown (off by default from a first switch-on).
  for (const b of badgesShown(game) ? badges(stores, today, game.badgesSeen) : []) if (b.earned && !game.badgesSeen?.[b.id] && !seen[celebrationId.badge(b.id)]) out.push({id: celebrationId.badge(b.id), kind: 'badge', title: `New badge · ${b.title}`, line: b.blurb, symbol: b.symbol, semantic: 'achievement_unlocked'});
  for (const h of (stores.habits as HabitData).habits) if (habitStats(h, today).bestStreak >= 100 && !seen[celebrationId.streak(h.id)]) out.push({id: celebrationId.streak(h.id), kind: 'streak', title: `100 days · ${h.title}`, line: 'A hundred days in a row. That is a rhythm.', symbol: '✷'});
  for (const f of fasting ?? []) if (f.endedAt === null && f.hours >= f.targetHours && !seen[celebrationId.fast(f.id)]) out.push({id: celebrationId.fast(f.id), kind: 'fast', title: `${f.targetHours} hours fasted`, line: 'You reached the hours you set. How you end it is yours.', symbol: '◌'});
  out.push(...checklistCelebrations(stores, today, seen));
  return out;
}
/**
 * Session AL fourth pass (DV-118): the level line names what the XP came from, so a level reached from a goal's milestones
 * never says "every check-in and log". Check-ins and logs alone keep the original line.
 */
const SOURCE_WORDS: Record<XpEvent['kind'], string> = {habit: 'check-ins', health: 'logs', goal: 'goal steps', review: 'weekly reviews', checklist: 'Checklist days', earn: 'Earn lessons'};
export function levelLine(events: readonly Pick<XpEvent, 'kind' | 'xp'>[]): string {
  const kinds = (Object.keys(SOURCE_WORDS) as XpEvent['kind'][]).filter(k => events.some(e => e.kind === k && e.xp > 0));
  if (kinds.every(k => k === 'habit' || k === 'health')) return 'Every check-in and log you made brought you here.';
  const words = kinds.map(k => SOURCE_WORDS[k]);
  return `Your ${words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0]} brought you here.`;
}
/**
 * Session AF (L3; P7.7): today's Checklist moments, derived from the Checklist's own summary of today (never stored): every
 * dot lit, then a Perfect orbit (every dot, in path order). One each per day on this device, through the seen map.
 */
export function checklistCelebrations(stores: Pick<GameStores, 'checklistToday'>, today: string, seen: Celebrations['seen']): Celebration[] {
  const t = stores.checklistToday; if (!t || t.date !== today || t.total === 0 || t.done < t.total) return [];
  const out: Celebration[] = [];
  if (!seen[celebrationId.checklist('all', today)]) out.push({id: celebrationId.checklist('all', today), kind: 'checklist', title: 'All dots lit', line: 'Every dot on your path, today. See you tomorrow.', symbol: '◍'});
  if (t.perfect && !seen[celebrationId.checklist('perfect', today)]) out.push({id: celebrationId.checklist('perfect', today), kind: 'checklist', title: 'Perfect orbit', line: 'Every dot, in the order of your path.', symbol: '✪'});
  return out;
}
/** What the first switch-on remembers: the current level and every badge already earned. */
export function firstSight(stores: GameStores, today: string): {level: number; badgeIds: string[]} {
  const level = levelOf(xpEvents(stores, today).reduce((n, e) => n + e.xp, 0));
  return {level, badgeIds: badges(stores, today).filter(b => b.earned).map(b => b.id)};
}
/**
 * A goal reached on Goals: Goals emits `goal_milestone_reached`, `goal_funded` or `goal_finished` through ZIGi's bus; the
 * renderer makes one celebration per kind per day. Session AL (P-NB-02; NB-049, NB-168, NB-197, NB-251): "A goal
 * finished" comes only from `goal_finished` — never from `achievement_unlocked`, which a badge, a first check-in or a
 * mood check-in also sends (the renderer's own badge card fed it back as "A goal finished" at a habit tick).
 */
export function goalCelebration(type: 'goal_milestone_reached' | 'goal_funded' | 'goal_finished', seen: Celebrations['seen'], today: string): Celebration | null {
  const id = celebrationId.goal(type, today);
  if (seen[id]) return null;
  return {id, kind: 'goal', title: type === 'goal_finished' ? 'A goal finished' : type === 'goal_funded' ? 'Goal funded' : 'Milestone reached', line: type === 'goal_finished' ? 'It is on the Hall of achievements.' : type === 'goal_funded' ? 'Your plan did what you asked of it.' : 'One step of the way, done.', symbol: '◆'};
}
/** Session AL (P-NB-02): whether the records show a goal reached today (its target met now, the completion dated today). */
export function goalFinishedToday(stores: Pick<GameStores, 'platform'>, today: string): boolean {
  const p = stores.platform; if (!p) return false;
  return p.goals.some(g => g.status === 'completed' && (p.goalHistory.some(h => h.goalId === g.id && h.kind === 'status' && h.label === 'Goal completed' && h.capturedAt.slice(0, 10) === today) || (g.lifecycle ?? []).some(e => e.kind === 'completed' && e.at.slice(0, 10) === today)));
}
