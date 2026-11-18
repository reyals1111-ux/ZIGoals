import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {BILLS_KEY} from '../bills/schema';
import {MOOD_TAGS_KEY} from '../mood-tags/schema';
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
  it('symptoms stay unread by ZIGi and NOVA, even with Health on; mood tags and money are not seeded (carried)', () => {
    const get = {getItem: (k: string) => records[k] ?? null};
    const sources = {...withSentinels(showcaseSources(DAY)), ak: readAkToolSources(get), nova: readNovaToolSources(get)};
    const scopes = {today: true, goals: true, habits: true, health: true, wealth: true, notes: false, journal: false, earn: true};
    const seen = JSON.stringify(sources.ak) + JSON.stringify(sources.nova) + buildNovaPack({sources, gates: gatesFor(true, 'today'), scopes, chainChosen: true, privacy: {mode: 'relaxed', redactForSend: t => t}}).text;
    for (const word of ['Example · headache', 'Example · pollen', 'Example · stiff back']) expect(seen).not.toContain(word);
    // Session AS's pinned answers stay as they are: no example moods, mood tags or money-log payments are added.
    expect(records[MOOD_TAGS_KEY]).toBeUndefined();
    expect(parse(HEALTH_STORAGE_KEY, healthSchema).moods).toBeUndefined();
    expect(records[BILLS_KEY]).not.toContain('Streaming');
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
