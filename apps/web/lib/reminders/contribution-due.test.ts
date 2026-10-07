import {describe, expect, it} from 'vitest';
import {emptyPlatform, privateGoalSchema, type Platform} from '../positions';
import {emptyWReminders, wRemindersSchema} from './w-schema';
import {contributionDue, dismissContribution, setContributionReminder} from './contribution-due';
import {knockLines} from '../ai/knock/rules';

// Session W Part 12: a contribution plan's reminder on this device; a card and a knock once its time has passed on a
// day the plan has an amount due. "Fund now" opens the Goal's own form; nothing moves money. Fictional Goal.
const ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const at = (h: number, m = 0) => new Date(2026, 9, 1, h, m); // 2026-10-01, this device's time
function platform(extra: Record<string, unknown> = {}, plan: Record<string, unknown> = {}): Platform {
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '600000', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: [],
    plan: {amount: '10000', asset: 'USD', decimals: 2, cadence: 'monthly', nextDate: '2026-10-01', active: true, timeZone: ZONE, ...plan}, ...extra});
  return {...emptyPlatform(), goals: [goal]};
}
const w = setContributionReminder(emptyWReminders(), '7', '09:30');

describe('contribution reminders', () => {
  it('set and turned off per Goal; a time is HH:MM', () => {
    expect(w.contributions).toEqual({'7': {time: '09:30'}});
    expect(setContributionReminder(w, '7', null).contributions).toEqual({});
    expect(() => setContributionReminder(w, '7', '9:30')).toThrow();
    expect(wRemindersSchema.safeParse({...w, contributions: {abc: {time: '09:30'}}}).success).toBe(false);
  });
  it('due once its time has passed on a day the plan has an amount due; "Fund now" opens the Goal\'s form', () => {
    expect(contributionDue(w, platform(), at(9, 29))).toEqual([]);
    expect(contributionDue(w, platform(), at(9, 30))).toEqual([{id: 'contribution:7', kind: 'contribution-due', goalId: '7', title: 'Fictional reserve', time: '09:30', day: '2026-10-01', href: '/app/goals/tracked/7?contribute=1', due: '10000'}]);
  });
  it('not due on a day without an amount, for a paused plan, a closed Goal, a Goal that is gone, or once put off for the day', () => {
    expect(contributionDue(w, platform({}, {nextDate: '2026-10-02'}), at(10))).toEqual([]);
    expect(contributionDue(w, platform({}, {active: false}), at(10))).toEqual([]);
    expect(contributionDue(w, platform({status: 'closed'}), at(10))).toEqual([]);
    expect(contributionDue(w, {...emptyPlatform()}, at(10))).toEqual([]);
    const later = dismissContribution(w, '7', '2026-10-01');
    expect(later.dismissed).toEqual({'contribution:7': '2026-10-01'});
    expect(contributionDue(later, platform(), at(10))).toEqual([]);
    expect(contributionDue(later, platform({}, {cadence: 'weekly', nextDate: '2026-10-01'}), new Date(2026, 9, 8, 10))).toHaveLength(1);
  });
  it('ZIGi\'s knock words: calm, the plan\'s amount for today, "Fund now"', () => {
    const [due] = contributionDue(w, platform(), at(10));
    expect(knockLines(due!)).toEqual({title: 'A contribution is due: Fictional reserve', line: 'Your plan\'s amount for today · 09:30', action: 'Fund now'});
  });
});
