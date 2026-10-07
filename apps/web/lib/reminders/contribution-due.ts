import {localClock} from './due';
import {localDate} from '../local-date';
import {clockSchema} from '../sleep/schema';
import {fundingHealth} from '../goal-intelligence';
import type {Platform} from '../positions';
import {wRemindersSchema, type WReminders} from './w-schema';

/**
 * A contribution plan's reminder (Session W Part 12): a time on this device (`zigoals:w-reminders:v1` `contributions`,
 * per Goal). Once it has passed on a day the plan has an amount due, Today shows a card and ZIGi may knock, with "Fund
 * now", which opens the Goal's own contribution form already filled in (the person confirms; nothing moves money). It
 * goes once the day's amount is recorded, or when put off for the day.
 */
export const CONTRIBUTION_PREFIX = 'contribution:';
export type ContributionDue = {id: string; kind: 'contribution-due'; goalId: string; title: string; time: string; day: string; href: string; due: string};
export function contributionDue(w: WReminders, platform: Platform, now: Date): ContributionDue[] {
  const day = localDate(now), clock = localClock(now);
  return Object.entries(w.contributions).flatMap(([goalId, {time}]) => {
    const goal = platform.goals.find(g => g.id === goalId);
    if (!goal || goal.status !== 'active' || !goal.plan?.active || time > clock || w.dismissed[`${CONTRIBUTION_PREFIX}${goalId}`] === day) return [];
    let due = '0';
    try { due = fundingHealth(platform, goalId, now.getTime()).dueToday; } catch { return []; }
    if (BigInt(due) <= 0n) return [];
    return [{id: `${CONTRIBUTION_PREFIX}${goalId}`, kind: 'contribution-due' as const, goalId, title: goal.name, time, day, href: `/app/goals/tracked/${encodeURIComponent(goalId)}?contribute=1`, due}];
  });
}
/** Sets a Goal's reminder time on this device (null turns it off). */
export function setContributionReminder(w: WReminders, goalId: string, time: string | null): WReminders {
  const contributions = {...w.contributions};
  if (time) contributions[goalId] = {time: clockSchema.parse(time)}; else delete contributions[goalId];
  return wRemindersSchema.parse({...w, contributions});
}
export const dismissContribution = (w: WReminders, goalId: string, day: string): WReminders => wRemindersSchema.parse({...w, dismissed: {...w.dismissed, [`${CONTRIBUTION_PREFIX}${goalId}`]: day}});
