import {describe, expect, test} from 'vitest';
import {FORBIDDEN_WORDS, GUIDE_LABEL, NUDGES, STREAK_MILESTONES, SUMMARY_COPY} from './copy';

// ADR-011 "Tone rules", checked over the copy table and the summary templates.
const texts = NUDGES.flatMap(n => [n.heading, n.body, n.action?.label ?? '']);
const samples = [SUMMARY_COPY.lead, SUMMARY_COPY.habitDays(0, 0), SUMMARY_COPY.habitDays(3, 7), SUMMARY_COPY.habitDays(1, 1), SUMMARY_COPY.waterDays(0), SUMMARY_COPY.waterDays(1), SUMMARY_COPY.waterDays(5), SUMMARY_COPY.weights(0), SUMMARY_COPY.weights(1), SUMMARY_COPY.weights(2), SUMMARY_COPY.contributions(0, 0), SUMMARY_COPY.contributions(1, 2), SUMMARY_COPY.contributions(1, 1), SUMMARY_COPY.intention('walk more')];
const KNOWN_VALUES = new Set(['n', 'are', 'titles', 'title', 'habitId', 'goal', 'when', 'href']);
describe('the copy table', () => {
  test('calm, second person: no exclamation mark, no emoji, no shame, no praise inflation, no urgency', () => {
    for (const text of [...texts, ...samples, GUIDE_LABEL]) {
      expect(text, text).not.toMatch(/!/);
      expect(text, text).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      for (const word of FORBIDDEN_WORDS) expect(text.toLowerCase(), `"${text}" uses "${word}"`).not.toMatch(new RegExp(`(^|[^a-z])${word}([^a-z]|$)`));
    }
  });
  test('every placeholder maps to an engine value; priorities are distinct and in table order; hiding windows are 1, 7 or 28 days', () => {
    for (const nudge of NUDGES) for (const text of [nudge.heading, nudge.body, nudge.action?.href ?? '']) for (const [, key] of text.matchAll(/\{(\w+)\}/g)) expect(KNOWN_VALUES.has(key!), `${nudge.kind}: {${key}}`).toBe(true);
    expect(NUDGES.map(n => n.priority)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(NUDGES.map(n => n.kind)).toEqual(['review-ready', 'habits-open', 'streak-notice', 'goal-next-date', 'insight-ready', 'quiet-day', 'first-time']);
    for (const nudge of NUDGES) expect([1, 7, 28]).toContain(nudge.hideDays);
    expect(STREAK_MILESTONES).toEqual([7, 14, 30, 60, 100, 365]);
  });
  test('the label names the place and says there is no AI service; the summary writes zero out', () => {
    expect(GUIDE_LABEL).toBe('Guide · on this device, no AI service');
    expect(SUMMARY_COPY.weights(0)).toBe('no weights recorded');
    expect(SUMMARY_COPY.waterDays(0)).toBe('no days with water logged');
    expect(SUMMARY_COPY.habitDays(0, 0)).toBe('no habit days scheduled');
    expect(SUMMARY_COPY.contributions(0, 0)).toBe('no planned contributions');
    expect(SUMMARY_COPY.habitDays(2, 5)).toBe('2 of 5 habit days done');
    expect(SUMMARY_COPY.contributions(1, 1)).toBe('1 of 1 planned contribution recorded');
  });
});
