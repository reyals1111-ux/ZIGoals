import {habitStats, type Habit} from './habits';
import {unitFor} from './plural';
import type {ShareCard} from './share-image';

/**
 * Session AI (B3 competitor gap: a shareable habit card): the words of a habit's share image, drawn on this device
 * (lib/share-image.ts) and handed to the person's own share sheet or saved; nothing is uploaded. Counts only: the
 * current streak, the personal best and how often it was done; never a note, a mood or a figure from Health.
 */
export function habitShareCard(habit: Habit, today: string): ShareCard {
  const s = habitStats(habit, today), lines: string[] = [];
  if (s.currentStreak > 0) lines.push(`${s.currentStreak} ${unitFor(s.currentStreak, s.streakUnit)} in a row`);
  if (s.bestStreak > s.currentStreak) lines.push(`Personal best: ${s.bestStreak} ${unitFor(s.bestStreak, s.streakUnit)}`);
  if (s.successCount > 0) lines.push(`Done ${s.successCount} ${s.successCount === 1 ? 'time' : 'times'} so far`);
  return {eyebrow: 'My habit', title: habit.title, lines: lines.length ? lines : ['Just getting started.'], footer: 'Made on this device with ZIGoals'};
}
