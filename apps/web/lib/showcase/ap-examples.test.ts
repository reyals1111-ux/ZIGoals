import {readFileSync} from 'node:fs';
import {AW_MOOD_DAYS} from './aw-examples';
import {describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {BILLS_KEY, billsSchema} from '../bills/schema';
import {detectBills, openCandidates} from '../bills/detect';
import {candidatePriceChange} from '../bills/price-change';
import {MOOD_TAGS_KEY, moodTagsSchema} from '../mood-tags/schema';
import {goodDayTags} from '../mood-tags/tags';
import {MONEY_LOG_KEY, moneyLogSchema} from '../money-log/schema';
import {showcaseMoneyLog} from '../money-log/showcase';
import {SYMPTOMS_KEY, symptomsSchema} from '../symptoms/schema';
import {splitsRecordSchema, WORKOUT_SPLITS_KEY} from '../workouts/splits-schema';
import {workoutsSchema, WORKOUTS_KEY} from '../workouts/schema';
import {readAkToolSources} from '../ai/tools/ak-sources';
import {readNovaToolSources} from '../ai/tools/nova-sources';
import {gatesFor, showcaseSources, withSentinels} from '../ai/tools/fixtures';
import {buildNovaPack} from '../ai/context-pack/nova';
import {AGE_MEANING, AGE_RULE, AGE_WHAT} from '../money-insights/age-of-money';
import {trendDrawable} from '../money-insights/cash-flow';

/** Session AT (ADR-040 D22, "Minor, carried"): the unit checks of the seven copy and visual minors that have one. */
const DAY = '2026-10-31';
const {records} = buildShowcase(DAY, 'UTC');
const parse = <T>(key: string, schema: {parse: (v: unknown) => T}) => schema.parse(JSON.parse(records[key]!));

describe('minor 7: the Showcase has labelled examples of symptoms and run splits', () => {
  it('symptoms: three labelled items, levels on the days answered, skipped days left unknown', () => {
    const s = parse(SYMPTOMS_KEY, symptomsSchema);
    expect(s.items.map(i => i.name)).toEqual(['Example · headache', 'Example · pollen', 'Example · stiff back']);
    expect(Object.keys(s.days)).toHaveLength(11);
    expect(s.days['2026-10-23']).toBeUndefined();
  });
  it('run splits belong to the two example runs and add up to their time', () => {
    const splits = parse(WORKOUT_SPLITS_KEY, splitsRecordSchema), log = parse(WORKOUTS_KEY, workoutsSchema);
    for (const [id, s] of Object.entries(splits.workouts)) {
      const run = log.workouts.find(w => w.id === id)!, set = run.exercises[0]!.sets[0]!;
      expect(run.name).toBe('Easy run');
      expect(s.splits).toHaveLength(set.distanceKm!);
      expect(s.splits.reduce((a, x) => a + x.seconds, 0)).toBe(set.seconds);
      expect(s.paceSecondsPerKm).toBe(Math.round(set.seconds! / set.distanceKm!));
    }
  });
  it('symptoms and mood tags stay unread by ZIGi and NOVA, even with Health on', () => {
    const get = {getItem: (k: string) => records[k] ?? null};
    const sources = {...withSentinels(showcaseSources(DAY)), ak: readAkToolSources(get), nova: readNovaToolSources(get)};
    const scopes = {today: true, goals: true, habits: true, health: true, wealth: true, notes: false, journal: false, earn: true};
    const seen = JSON.stringify(sources.ak) + JSON.stringify(sources.nova) + buildNovaPack({sources, gates: gatesFor(true, 'today'), scopes, chainChosen: true, privacy: {mode: 'relaxed', redactForSend: t => t}}).text;
    for (const word of ['Example · headache', 'Example · pollen', 'Example · stiff back', 'Example · walk', 'Example · friends', 'Example · late screen']) expect(seen).not.toContain(word);
  });
});

/**
 * Session AU (D8, deliberate; ADR-043 D8 carried → ADR-044 D-SHOWCASE): what Session AT left out on purpose is now seeded,
 * labelled and exact: example moods with "Example · " mood tags, and a streaming bill whose price stepped up once in the
 * money log, found in the spending and shown under Price changes. The pinned answers it moves are listed in docs/STATUS.md.
 */
describe('Session AU (D8, deliberate): the Showcase has labelled example mood tags and a bill price change', () => {
  it('moods: twelve of the last fourteen days, none today; mood tags: three labelled tags on eight of those days', () => {
    const moods = parse(HEALTH_STORAGE_KEY, healthSchema).moods!, tags = parse(MOOD_TAGS_KEY, moodTagsSchema);
    // Session AW (showcase, deliberate): the older moods for "your usual" (31 to 325 days back, lib/showcase/aw-examples.ts)
    // sit outside these two weeks; the two weeks hold exactly the twelve, and nothing else is added.
    expect(Object.keys(moods.days).length).toBe(12 + AW_MOOD_DAYS.length);
    expect(Object.keys(moods.days).filter(d => d >= '2026-10-18').sort()).toEqual(['2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30']);
    expect(moods.days[DAY]).toBeUndefined();
    expect(Object.values(moods.days).every(d => d.note === undefined)).toBe(true);
    expect(Object.keys(moods.days).filter(d => d < '2026-10-18' && d > '2026-09-30')).toEqual([]); // none in the last 30 days but those twelve
    expect(tags.entries).toEqual({
      '2026-10-18': ['Example · walk'], '2026-10-19': ['Example · late screen'], '2026-10-20': ['Example · walk', 'Example · friends'], '2026-10-21': ['Example · late screen'],
      '2026-10-23': ['Example · walk', 'Example · friends'], '2026-10-26': ['Example · walk'], '2026-10-27': ['Example · late screen'], '2026-10-29': ['Example · walk', 'Example · friends'],
    });
    for (const d of Object.keys(tags.entries)) expect(moods.days[d], d).toBeDefined();
    const found = goodDayTags(moods.days, tags, DAY);
    // Session AW (showcase, deliberate): the older moods (50 days without a tag) join the days without the walk: 57, 16 good.
    expect(found.ready.map(f => [f.tag, f.withDays, f.withGood, f.otherDays, f.otherGood])).toEqual([['Example · walk', 5, 4, 57, 16]]);
    expect(found.pending).toEqual([{tag: 'Example · friends', days: 3, need: 5}, {tag: 'Example · late screen', days: 3, need: 5}]);
  });
  it('a streaming bill: €12.99 once, then €13.99 three times, monthly; found in the spending, its rise under Price changes', () => {
    const log = parse(MONEY_LOG_KEY, moneyLogSchema), streaming = log.entries.filter(e => e.note === 'Streaming · SHOWCASE DATA');
    expect(streaming.map(e => [e.date, e.amount, e.category, e.currency, e.kind])).toEqual([
      ['2026-07-09', '12.99', 'Subscriptions', 'EUR', 'expense'], ['2026-08-08', '13.99', 'Subscriptions', 'EUR', 'expense'], ['2026-09-08', '13.99', 'Subscriptions', 'EUR', 'expense'], ['2026-10-08', '13.99', 'Subscriptions', 'EUR', 'expense'],
    ]);
    // Additive: the log's own entries are unchanged and come first.
    expect(log.entries.slice(0, -4)).toEqual(showcaseMoneyLog(DAY).entries);
    const bills = parse(BILLS_KEY, billsSchema), open = openCandidates(detectBills(log.entries, DAY), bills);
    expect(open.map(c => [c.title, c.amount, c.cadence, c.occurrences, c.lastDate, c.nextDue, c.confidenceLabel])).toEqual([['Streaming', '13.99', 'monthly', 3, '2026-10-08', '2026-11-08', 'medium']]);
    // (fr-money; deliberate) FR-L-18: "since" is the month of the first payment at the new price (€13.99 from 8 Aug).
    expect(candidatePriceChange(open[0]!, log.entries, DAY)).toEqual({direction: 'up', cents: 100, currency: 'EUR', previous: 1299, latest: 1399, previousDate: '2026-07-09', latestDate: '2026-10-08', sinceMonth: '2026-08'});
    // The confirmed bills are the four hand-made ones, as before: none is linked to the money log.
    expect(bills.bills.map(b => [b.title, b.origin])).toEqual([['Rent · SHOWCASE DATA', 'manual'], ['Music · SHOWCASE DATA', 'manual'], ['Energy · SHOWCASE DATA', 'manual'], ['Home insurance · SHOWCASE DATA', 'manual']]);
  });
});

describe('minor 2: a category line needs three months with records', () => {
  const recorded = (n: number) => ({recorded: Array.from({length: 12}, (_, i) => i >= 12 - n)});
  it('none drawn under three; drawn from three', () => {
    expect([0, 1, 2, 3, 12].map(n => trendDrawable(recorded(n)))).toEqual([false, false, false, true, true]);
  });
});

describe('minor 3: age of money says what it is, then what the figure means, then how it is counted', () => {
  const view = readFileSync(new URL('../../components/wealth/spending/insights/age-view.tsx', import.meta.url), 'utf8');
  it('the three parts, in that order', () => {
    expect(AGE_WHAT).toMatch(/^Age of money is /);
    expect(AGE_MEANING).toMatch(/^The more days/);
    expect(AGE_RULE).toMatch(/first in, first out/);
    const at = (s: string) => view.indexOf(s);
    expect(at('{AGE_WHAT}')).toBeGreaterThan(-1);
    expect(at('{AGE_WHAT}')).toBeLessThan(at('{AGE_MEANING}'));
    expect(at('{AGE_MEANING}')).toBeLessThan(at('{AGE_RULE}'));
  });
});

describe('minor 6: Help names the cards by their own titles', () => {
  const help = readFileSync(new URL('../../components/help/help-page.tsx', import.meta.url), 'utf8');
  const trends = readFileSync(new URL('../../components/health/plus/activity-plus.tsx', import.meta.url), 'utf8');
  const prices = readFileSync(new URL('../../components/wealth/bills/price-changes.tsx', import.meta.url), 'utf8');
  it('"Price changes" and "Trends", never "bill changes"', () => {
    expect(trends).toContain('>Trends</h2>');
    expect(prices).toContain('>Price changes</h3>');
    expect(help).not.toMatch(/bill changes/i);
    expect(help).toContain("'Mood tags, symptoms, orbits, Trends, run splits and copying a meal'");
    expect(help).toContain('Price changes on bills');
    expect(help).toContain('question="How does Trends in Health → Activity work?"');
  });
});
