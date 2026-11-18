/**
 * Session AS (ADR-042, approval item 3; TIER 3 (stored format), additive): a period as a short token, the one new
 * optional widget parameter in `zigoals:nova-stage:v1` (`params.<widget>.period`). Relative where the words were
 * ("this-month" stays this month tomorrow), absolute where they named a day. What each token means is in
 * lib/ai/local-answers/exact/period.ts; an older build ignores the field, and a value this build cannot read reads as
 * absent (the widget then shows its own default period).
 */
export const PERIOD_TOKEN = /^(?:today|yesterday|this-week|last-week|this-month|last-month|this-year|last-year|last-(?:[1-9]\d{0,2})-days|since:\d{4}-\d{2}-\d{2}|on:\d{4}-\d{2}-\d{2}|month:\d{4}-\d{2})(?:@[0-6])?$/;
export const MAX_PERIOD = 24;
export const isPeriodToken = (value: unknown): value is string => typeof value === 'string' && value.length <= MAX_PERIOD && PERIOD_TOKEN.test(value);
