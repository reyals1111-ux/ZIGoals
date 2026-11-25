import {afterEach, describe, expect, test, vi} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {CORPUS} from '../evals/as/cases';
import {AW_X6} from '../evals/as/cases-aw-x6';
import {awX6Answer, dayAsked} from './aw-x6';
import type {LocalReply} from './engine';
import type {ToolSources} from '../tools/env';
import {addLocalDays} from '../../local-date';
import {createEmptyHealth, type HealthData, type HealthWeight} from '../../health';
import {healthGroupIn, withHealthGroup} from '../../vault/w-homes';
import {sleepSchema} from '../../sleep/schema';
import {fold} from './exact/text';

/**
 * Session AW (X6): the on-device answers of lib/ai/local-answers/aw-x6.ts, on the Showcase and on a fresh profile, in
 * English and Dutch, behind Health's gate, with the weight figures hidden by the device's switch, and reading the
 * features' own figures. The "claims no other corpus question" check leaves this group's own intents out (the
 * integrator adds them to the corpus).
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s: ToolSources = showcaseAll(), health = true) => awX6Answer(q, zigiEnv(s, health));
const AT = `${DAY}T08:00:00.000Z`;
const w = (date: string, grams: number): HealthWeight => ({id: `health_weight-${date}`, date, grams, createdAt: AT, updatedAt: AT});
const withWeights = (weights: HealthWeight[], base: ToolSources = freshAll()): ToolSources => ({...base, health: {...(base.health ?? createEmptyHealth()), weights} as HealthData});
const hide = (on: boolean) => vi.stubGlobal('window', {localStorage: {getItem: (k: string) => on && k === 'zigoals:hide-body-figures' ? 'on' : null, setItem: () => undefined, removeItem: () => undefined}, sessionStorage: {getItem: () => null}});
afterEach(() => vi.unstubAllGlobals());

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AW_X6) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    for (const s of [showcaseAll(), freshAll()]) {
      const r = ask(q, s);
      expect(r?.kind, q).toBe('answer');
      for (const n of c.never ?? []) expect(text(r).toLowerCase()).not.toContain(n.toLowerCase());
    }
    if (lang === 'nl') expect(text(ask(q))).not.toMatch(/\b(?:the|your|today|this week)\b/);
    else expect(text(ask(q))).not.toMatch(/\b(?:je|jouw|deze week|nachten)\b/);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AW_X6) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
  test('nearby questions are left alone', () => {
    for (const q of ['how much do I weigh', 'hoeveel weeg ik', 'what is my weight', 'how much weight did I lift this week compared with last week', 'am I reaching my sleep goal', 'haal ik mijn slaapdoel', 'which nights did I sleep under my goal this month', 'what will I weigh and add a task'])
      expect(ask(q), q).toBeNull();
  });
});

describe('claims none of the other corpus questions', () => {
  test('every other intent of the corpus', () => {
    const own = new Set(AW_X6.map(i => i.id)), env = zigiEnv(showcaseAll());
    for (const intent of CORPUS.filter(i => !own.has(i.id))) for (const q of [...intent.en, ...intent.nl]) expect(awX6Answer(q, env), `${intent.id}: ${q}`).toBeNull();
  }, 120_000);
});

describe('#456: the day asked, and the estimate with its sum', () => {
  test('dates in English and Dutch; a day already passed this year is next year’s', () => {
    expect(dayAsked(fold('what will I weigh on 1 January'), '2026-11-25')).toBe('2027-01-01');
    expect(dayAsked(fold('what will I weigh on December 20th'), '2026-11-25')).toBe('2026-12-20');
    expect(dayAsked(fold('wat weeg ik op 3 maart 2027'), '2026-11-25')).toBe('2027-03-03');
    expect(dayAsked(fold('what will I weigh on 2027-02-14'), '2026-11-25')).toBe('2027-02-14');
    expect(dayAsked(fold('what would my weight be on Christmas'), '2026-11-25')).toBe('2026-12-25');
    expect(dayAsked(fold('wat weeg ik op nieuwjaarsdag'), '2026-11-25')).toBe('2027-01-01');
    expect(dayAsked(fold('what will I weigh on 31 February'), '2026-11-25')).toBeNull();
  });
  const steady = Array.from({length: 15}, (_, i) => w(addLocalDays(DAY, -28 + i * 2), 84_000 - i * 140));
  test('the estimate says its pace, its sum and that it is an estimate; English and Dutch', () => {
    const en = text(ask('what will I weigh on 15 December', withWeights(steady)));
    expect(en).toMatch(/^If the last 4 weeks’ pace continued, your trend would be about \d+(\.\d)? kg on .+: \d+(\.\d)? kg now, −0\.\d kg a week, 4 weeks\. An estimate, not medical advice, and not a promise\.$/);
    expect(text(ask('wat weeg ik op 15 december', withWeights(steady)))).toMatch(/^Als het tempo van de afgelopen 4 weken zo doorging, .* per week, 4 weken\. Een schatting, geen medisch advies en geen belofte\.$/);
  });
  test('a day named in Health → Weight is found by its name', () => {
    const s = withWeights(steady), named = {...s, ak: {...s.ak, bodyExtras: {version: 1, namedDays: [{id: 'nd-wedding1', name: 'The wedding', on: addLocalDays(DAY, 21)}]}} as typeof s.ak};
    expect(text(ask('what will I weigh on the wedding', named))).toMatch(/on “The wedding” \(.+\): .* 3 weeks\./);
    expect(text(ask('what will I weigh by then', named))).toMatch(/^Name the day/);
  });
  test('no pace yet, and the weight figures hidden: said, no figure', () => {
    expect(text(ask('what will I weigh on 1 January', withWeights([w(DAY, 80_000)])))).toMatch(/^There is no 4-week pace yet/);
    hide(true);
    expect(text(ask('what will I weigh on 15 December', withWeights(steady)))).toMatch(/^Your weight figures are hidden on this device/);
    expect(text(ask('wat weeg ik op 15 december', withWeights(steady)))).not.toMatch(/\d+(?:[.,]\d)? kg/);
  });
});

describe('#458: this week against the week before', () => {
  const weeks = [w(addLocalDays(DAY, -12), 82_000), w(addLocalDays(DAY, -10), 82_400), w(addLocalDays(DAY, -8), 82_200), w(addLocalDays(DAY, -5), 81_900), w(addLocalDays(DAY, -3), 81_700), w(DAY, 81_500)];
  test('the two means and the gap, in calm words', () => {
    expect(text(ask('how was my weight this week compared with last week', withWeights(weeks)))).toBe('This week 81.7 kg on average (3 weigh-ins), 0.5 kg under the week before (82.2 kg, 3 weigh-ins). The mean of each 7 days’ weigh-ins, as Health → Weight shows it.');
    expect(text(ask('hoe was mijn gewicht deze week vergeleken met vorige week', withWeights(weeks)))).toMatch(/^Deze week gemiddeld 81\.7 kg \(3 wegingen\), 0\.5 kg lager dan de week ervoor/);
  });
  test('not enough weigh-ins: the counts, never a 0 kg', () => {
    const r = text(ask('how was my weight this week compared with last week', withWeights(weeks.slice(0, 4))));
    expect(r).toBe('Not enough weigh-ins yet to compare this week with the week before: it needs 3 or more in each 7 days (this week 1, the week before 3).');
    expect(r).not.toMatch(/0 kg/);
    hide(true);
    expect(text(ask('how was my weight this week compared with last week', withWeights(weeks)))).toMatch(/^Your weight figures are hidden/);
  });
});

describe('#460: the sleep goal over 14 or 30 days', () => {
  test('the Showcase: its period, the window and the Goals goal named in one line', () => {
    const r = text(ask('how am I doing on my sleep goal'));
    expect(r).toMatch(/^Your sleep goal over the last 14 days: \d+ h \d\d min asleep on average, against your goal of 8 h 00 min; \d+ of \d+ logged nights at or above it\. Bedtime on average .+, .+ the end of your window \(.+\); \d+ of \d+ nights inside .+\. From your own logged nights; Health → Sleep → Your sleep goal shows it\. Your goal under Goals, “Sleep 8 hours a night”, is on Goals\.$/);
    expect(text(ask('how is my sleep goal over the last 30 days?'))).toMatch(/^Your sleep goal over the last 30 days:/);
    expect(text(ask('hoe gaat het met mijn slaapdoel'))).toMatch(/^Je slaapdoel over de afgelopen 14 dagen: gemiddeld/);
  });
  test('the device’s period is used when the question names none', () => {
    vi.stubGlobal('window', {localStorage: {getItem: (k: string) => k.endsWith('zigoals:sleep-goal-period:v1') ? JSON.stringify({version: 1, days: 30}) : null, setItem: () => undefined, removeItem: () => undefined}, sessionStorage: {getItem: () => null}});
    expect(text(ask('how am I doing on my sleep goal'))).toMatch(/over the last 30 days/);
  });
  test('no goal: where to set it; only a Goals goal: left to that answer; no night: unknown, never 0', () => {
    expect(text(ask('how am I doing on my sleep goal', freshAll()))).toMatch(/^You have no sleep goal yet: set one in Health → Sleep/);
    const s = showcaseAll(), noGoal = {...s, health: withHealthGroup(s.health!, 'sleep', sleepSchema.parse({...healthGroupIn(s.health!, 'sleep')!, goal: undefined}), false)};
    expect(ask('how am I doing on my sleep goal', noGoal)).toBeNull();
    const fresh = freshAll(), onlyGoal = {...fresh, health: withHealthGroup(createEmptyHealth(), 'sleep', sleepSchema.parse({version: 1, nights: [], goal: {minutes: 480, updatedAt: AT}}), false)};
    expect(text(ask('how am I doing on my sleep goal', onlyGoal))).toBe('Your sleep goal is 8 h 00 min a night. No night is logged in the last 14 days, so it is unknown (never 0).');
  });
});
