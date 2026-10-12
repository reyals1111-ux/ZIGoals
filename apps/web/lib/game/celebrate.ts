import {habitStats, type HabitData} from '../habits';
import type {Celebrations} from '../celebrations';
import {badges} from './badges';
import {levelOf, levelName} from './levels';
import {xpEvents, type GameStores} from './xp';
import type {GameRecord} from './schema';

/**
 * S10: which celebrations are due, derived from the records and the device's "seen" map (`zigoals:celebrations:v1`,
 * Session W's key), so each shows exactly once on this device: a level reached, a new badge, a 100-day streak, a fasting
 * milestone (Part 3 adds its ids), a goal reached (AA-Cloud emits the event; this lane renders it, once a day per kind).
 * Tasteful and one-time; never a punishment, never a loss.
 */
export type Celebration = {id: string; kind: 'level' | 'badge' | 'streak' | 'goal' | 'fast'; title: string; line: string; symbol: string; semantic?: 'level_up' | 'achievement_unlocked'};
export const celebrationId = {level: (n: number) => `level:${n}`, badge: (id: string) => `badge:${id}`, streak: (habitId: string) => `streak-100:${habitId}`, goal: (type: string, day: string) => `goal:${type}:${day}`, fast: (id: string) => `fast:${id}`};
export function pendingCelebrations(stores: GameStores, game: GameRecord, seen: Celebrations['seen'], today: string, fasting?: {id: string; hours: number; targetHours: number; endedAt: string | null}[]): Celebration[] {
  // The moment the layer is switched on, what the records already hold is remembered (level and badges), not celebrated.
  if (!game.enabled || game.levelSeen === undefined) return [];
  const out: Celebration[] = [];
  const xp = xpEvents(stores, today).reduce((n, e) => n + e.xp, 0), level = levelOf(xp);
  // The first level ever seen is not a celebration: the layer was just switched on. From then on each new level is.
  if (level > game.levelSeen && !seen[celebrationId.level(level)]) out.push({id: celebrationId.level(level), kind: 'level', title: `Level ${level} · ${levelName(level)}`, line: 'Every check-in and log you made brought you here.', symbol: '✦', semantic: 'level_up'});
  for (const b of badges(stores, today)) if (b.earned && !game.badgesSeen?.[b.id] && !seen[celebrationId.badge(b.id)]) out.push({id: celebrationId.badge(b.id), kind: 'badge', title: `New badge · ${b.title}`, line: b.blurb, symbol: b.symbol, semantic: 'achievement_unlocked'});
  for (const h of (stores.habits as HabitData).habits) if (habitStats(h, today).bestStreak >= 100 && !seen[celebrationId.streak(h.id)]) out.push({id: celebrationId.streak(h.id), kind: 'streak', title: `100 days · ${h.title}`, line: 'A hundred days in a row. That is a rhythm.', symbol: '✷'});
  for (const f of fasting ?? []) if (f.endedAt === null && f.hours >= f.targetHours && !seen[celebrationId.fast(f.id)]) out.push({id: celebrationId.fast(f.id), kind: 'fast', title: `${f.targetHours} hours fasted`, line: 'You reached the hours you set. How you end it is yours.', symbol: '◌'});
  return out;
}
/** What the first switch-on remembers: the current level and every badge already earned. */
export function firstSight(stores: GameStores, today: string): {level: number; badgeIds: string[]} {
  const level = levelOf(xpEvents(stores, today).reduce((n, e) => n + e.xp, 0));
  return {level, badgeIds: badges(stores, today).filter(b => b.earned).map(b => b.id)};
}
/** A goal reached on Goals: AA-Cloud emits `goal_milestone_reached` or `goal_funded` through ZIGi's bus; the renderer makes one celebration per kind per day. */
export function goalCelebration(type: 'goal_milestone_reached' | 'goal_funded', seen: Celebrations['seen'], today: string): Celebration | null {
  const id = celebrationId.goal(type, today);
  if (seen[id]) return null;
  return {id, kind: 'goal', title: type === 'goal_funded' ? 'Goal funded' : 'Milestone reached', line: type === 'goal_funded' ? 'Your plan did what you asked of it.' : 'One step of the way, done.', symbol: '◆'};
}
