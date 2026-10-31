import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {habitDataSchema, type HabitData} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {CONTEXT_BUDGET, defaultAiSettings} from '../settings';
import {consent} from './consent';
import {buildPageContext, type BuilderInput} from './builders';
import {AK_KINDS_BY_AREA, akKindsNote, buildSystemPrompt} from './specialists';
import {estimateTokens} from './budget';

/**
 * Owner follow-up 1 (F9): every page's prompt stays within the default context budget with the Showcase loaded. The AK
 * card kinds ride only in their page's note (never in the shared protocol; Today has none, so its prompt is main's), and
 * each page's fixed part (the system prompt and the page's Showcase records) keeps at least 1,000 tokens of the default
 * 10,000 for the question's own records and the conversation. Measured (estimate, four characters a token) before F9 →
 * after: Today 8,237 → 8,237; Goals 8,489 → 8,531; Habits 8,405 → 8,405; Health 8,769 → 8,805; Wealth 8,588 → 8,631;
 * Help 8,429 → 8,469.
 */
const DAY = '2026-10-31';
const {records} = buildShowcase(DAY);
const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData;
const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData;
const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform;
const fasting = homeRecordsIn(records).fasting;
const settings = {...defaultAiSettings(), enabled: true, mode: 'api' as const, provider: 'openai' as const, model: 'm', includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}};
const PAGES = [['today', '/app'], ['goals', '/app/goals'], ['habits', '/app/habits'], ['health', '/app/health'], ['wealth', '/app/wealth'], ['help', '/app/help']] as const;
const system = (area: BuilderInput['area']) => buildSystemPrompt({area, context: null, customInstructions: '', providerName: 'OpenAI', today: DAY, timeZone: 'Europe/Amsterdam'});
function fixed(area: BuilderInput['area'], pathname: string): number {
  const base = {settings, area, pathname, layoutHasHealth: true, accountActive: false, accountHealthPermitted: null};
  const input: BuilderInput = {area, pathname, consent: consent(base), now: new Date(`${DAY}T19:00:00Z`), habitDay: DAY, healthDay: DAY, habits, health, fasting, platform, localGoals: [], metadata: {}, quotes: [], portfolio: null};
  return estimateTokens(system(area)) + buildPageContext(input).estimatedTokens;
}
test('every page keeps 1,000 tokens of the default budget free with the Showcase loaded', () => {
  expect(CONTEXT_BUDGET.default).toBe(10_000);
  for (const [area, path] of PAGES) expect(fixed(area, path), area).toBeLessThanOrEqual(CONTEXT_BUDGET.default - 1000);
});
test('Today carries no page note, so its prompt is the shared part alone; each page\'s note stays short', () => {
  expect(akKindsNote('today')).toBeNull(); expect(system('today')).not.toContain('Also on this page');
  for (const kind of Object.values(AK_KINDS_BY_AREA).flat()) expect(system('today'), kind).not.toContain(`"kind":"${kind}"`);
  for (const [area] of PAGES) expect(estimateTokens(akKindsNote(area) ?? ''), area).toBeLessThanOrEqual(400);
  // Each kind's line is terse (the five F9 lines are 30 to 60 tokens).
  for (const area of Object.keys(AK_KINDS_BY_AREA) as (keyof typeof AK_KINDS_BY_AREA)[]) for (const line of (akKindsNote(area) ?? '').split('\n').slice(1)) expect(estimateTokens(line), line).toBeLessThanOrEqual(70);
});
