import {beforeAll, expect, test} from 'vitest';
import {presetSettings} from '../../dashboard-settings';
import {buildShowcase} from '../../showcase-data';
import {habitDataSchema as habitsSchema, type HabitData as Habits} from '../../habits';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptyReminders} from '../../reminders/schema';
import {cardInLanguage} from './aw-p5-card-nl';
import {loadAaPlanner, planAction, type Env, type Stores} from './plan';

beforeAll(() => loadAaPlanner()); // the Life review's card is planned in the lazy AA chunk

/** Session AW (p5-answers, S-10): the Life review card under a Dutch answer is Dutch; everything it does stays the same. */
/** The Showcase's stores, as the cards are planned in the app (lib/ai/local-answers/au-allow-health.test.ts does the same). */
const RECORDS = buildShowcase('2026-11-17', 'UTC').records;
const planStores = (): Stores => ({
  habits: {...habitsSchema.parse(JSON.parse(RECORDS['zigoals:habits:v1']!)), timeZone: 'UTC'} as Habits,
  health: healthSchema.parse(JSON.parse(RECORDS['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(RECORDS['zigoals:platform:v1']!)) as Platform,
  fasting: homeRecordsIn(RECORDS).fasting, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(RECORDS).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true},
});
const env: Env = {stores: planStores(), handles: [], now: new Date('2026-11-17T19:00:00Z'), habitDay: '2026-11-17', healthDay: '2026-11-17', timeZone: 'UTC'};

test('open-review for a Dutch question: a Dutch title and lines, the same navigation and device choice', () => {
  for (const [period, words] of [['week', 'deze week'], ['month', 'deze maand']] as const) {
    const en = planAction({kind: 'open-review', period}, env), nl = cardInLanguage(en, 'nl');
    expect(en.ok && nl.ok).toBe(true);
    if (!en.ok || !nl.ok) continue;
    expect(nl.plan.card.title).toBe(`Open het Life review: ${words}`);
    expect(nl.plan.card.lines).toEqual(['Opent /app/review op die periode', 'De periode is een keuze die op dit apparaat blijft']);
    expect(nl.plan.card.where).toBe('Life review');
    expect(nl.plan.navigate).toEqual(en.plan.navigate);
    expect(nl.plan.device).toEqual(en.plan.device);
    // English, or no language given: as before, word for word.
    expect(cardInLanguage(en, 'en')).toBe(en);
    expect(cardInLanguage(en, undefined)).toBe(en);
    expect(en.plan.card.title).toBe(`Open the Life review: ${period === 'week' ? 'this week' : 'this month'}`);
  }
});
test('the review opened on a week by open-page: Dutch lines, the screen\'s own English name in the title', () => {
  const r = cardInLanguage(planAction({kind: 'open-page', page: 'review', view: 'week'}, env), 'nl');
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.plan.card.title).toBe('Open Life review → This week');
  expect(r.plan.card.lines).toEqual(['Opent /app/review op deze week', 'De periode is een keuze die op dit apparaat blijft']);
});
test('any other card is left as it is, in either language', () => {
  const other = planAction({kind: 'open-page', page: 'goals'}, env);
  expect(cardInLanguage(other, 'nl')).toBe(other);
  const refused = planAction({kind: 'open-page', page: 'goals', view: 'week'}, env);
  expect(refused.ok).toBe(false);
  expect(cardInLanguage(refused, 'nl')).toBe(refused);
});
