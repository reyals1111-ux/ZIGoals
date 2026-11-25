import {afterEach, describe, expect, test} from 'vitest';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {habitDataSchema, type HabitData} from '../../habits';
import {setDisplayLocale} from '../../visual-format';
import {parseReply} from '../actions/parse';
import {planAction, type Env, type Stores} from '../actions/plan';
import {presetSettings} from '../../dashboard-settings';
import {buildShowcase} from '../../showcase-data';
import {healthSchema, type HealthData} from '../../health';
import {platformSchema, type Platform} from '../../positions';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptyReminders} from '../../reminders/schema';
import type {ToolEnv, ToolSources} from '../tools/env';
import {HEALTH_CLOSED, HEALTH_CLOSED_NL} from '../tools/format';
import {sanneAll} from './fr-answers-fixture';
import {averageTargetNl, averageValueNl, nlCountUnit, nlUnit} from './aw-p5-goal-line';
import type {AverageGoal} from '../../average-goals/store';

/**
 * Session AW (Part 5, the Carried answer rows): each row asked through the whole engine (`ask`: the device's answer, then
 * the no-model reply) in NOVA and ZIGi, English and Dutch.
 */
/** The Showcase's stores, as the cards are planned in the app (lib/ai/local-answers/au-allow-health.test.ts does the same). */
const RECORDS = buildShowcase('2026-11-17', 'UTC').records;
const planStores = (): Stores => ({
  habits: {...habitDataSchema.parse(JSON.parse(RECORDS['zigoals:habits:v1']!)), timeZone: 'UTC'} as HabitData,
  health: healthSchema.parse(JSON.parse(RECORDS['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(RECORDS['zigoals:platform:v1']!)) as Platform,
  fasting: homeRecordsIn(RECORDS).fasting, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(RECORDS).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true},
});
afterEach(() => setDisplayLocale('en-US'));
const both = (s: () => ToolSources) => [['ZIGi', zigiEnv(s())], ['NOVA', novaEnv(s())]] as const;
const inDutch = (run: () => void) => { setDisplayLocale('nl-NL'); try { run(); } finally { setDisplayLocale('en-US'); } };

describe('FR-S-13: a Dutch goal line is Dutch, with nl-NL figures', () => {
  const goal = (over: Partial<AverageGoal>): AverageGoal => ({id: 'g1', name: 'Sleep', metric: 'sleep-hours', unit: 'h a night', target: 8, direction: 'at-least', windowDays: 7, status: 'active', createdAt: '2026-11-01T08:00:00.000Z', entries: [], ...over});
  test('the values: sleep in hours and minutes, the app\'s English units in Dutch, a typed unit as typed', () => {
    inDutch(() => {
      expect(averageValueNl(goal({}), 7.9, {exact: true})).toBe('7 h 54 min per nacht');
      expect(averageTargetNl(goal({}))).toBe('minstens 8 uur per nacht');
      expect(averageTargetNl(goal({target: 7.5}))).toBe('minstens 7 h 30 min per nacht');
      expect(averageTargetNl(goal({metric: 'steps', unit: 'steps a day', target: 8000, direction: 'at-most'}))).toBe('hooguit 8.000 stappen per dag');
      expect(averageValueNl(goal({metric: 'custom', unit: 'h a day'}), 1.9)).toBe('1,9 uur per dag');
      expect(averageValueNl(goal({metric: 'custom', unit: 'boeken'}), 3)).toBe('3 boeken');
    });
    expect(nlUnit('mL a day')).toBe('mL per dag');
    expect(nlCountUnit('2 milestones')).toBe('2 mijlpalen');
    expect(nlCountUnit('US$ 9.000')).toBe('US$ 9.000');
  });
  test('the Showcase\'s goals list in Dutch: no English unit inside a Dutch sentence (NOVA and ZIGi)', () => {
    for (const [who, env] of both(showcaseAll)) {
      const t = ask('hoe gaat het met mijn doelen', env).text;
      expect(t, who).toMatch(/^7 actieve doelen, uit je eigen gegevens:/);
      expect(t, who).toMatch(/• Sleep 8 hours a night: [\d,]+% — gemiddeld \d+ h \d{2} min per nacht van minstens 8 uur per nacht/);
      expect(t, who).toMatch(/• Create 2 hours a day: [\d,]+% — gemiddeld [\d,]+ uur per dag van minstens 2 uur per dag/);
      expect(t, who).toContain('• Launch my creative studio: 50% — 2 mijlpalen van 4 mijlpalen, nog 2 mijlpalen te gaan');
      expect(t, who).not.toMatch(/a night van|a day van|at least|milestones/);
      // The English list keeps its words.
      expect(ask('how are my goals doing', env).text, who).toContain('h a night of at least 8 h a night');
    }
  });
  test('one goal that keeps an average, asked by name in Dutch: its average against its target, never "nog  te gaan"', () => {
    for (const [who, env] of both(sanneAll)) inDutch(() => {
      const t = ask('Hoe ver ben ik met Elke nacht 8 uur slapen?', env).text;
      expect(t, who).toMatch(/^Elke nacht 8 uur slapen: gemiddeld 7 h \d{2} min per nacht van minstens 8 uur per nacht \(99%\), over de afgelopen 7 dagen\.$/);
      expect(t, who).not.toMatch(/nog\s+te gaan|a night|at least/);
    });
  });
  test('Sanne\'s "Elke nacht 8 uur slapen", in nl-NL', () => {
    for (const [who, env] of both(sanneAll)) inDutch(() => {
      const t = ask('Hoe gaat het met mijn doelen?', env).text;
      expect(t, who).toMatch(/• Elke nacht 8 uur slapen: [\d,]+% — gemiddeld 7 h \d{2} min per nacht van minstens 8 uur per nacht/);
      expect(t, who).not.toMatch(/\d\.\d|a night|at least/);
    });
  });
});

describe('FR-TJ-16: Dutch answers name the app\'s own English screens', () => {
  test('money places, the debt planner and Markets (NOVA and ZIGi)', () => {
    for (const [who, env] of both(showcaseAll)) for (const q of ['wanneer ben ik schuldenvrij', 'Wat is bitcoin vandaag waard?', 'hoeveel heb ik deze maand uitgegeven', 'wat is mijn laagste saldo de komende 6 maanden']) {
      expect(ask(q, env).text, `${who}: ${q}`).not.toMatch(/Vermogen →|Vermogen-|in Vermogen|Markten|Instellingen →|Wat je schuldig bent|Komende rekeningen|→ Uitgaven|→ Budgetten|→ Rekeningen/);
    }
    expect(ask('wanneer ben ik schuldenvrij', zigiEnv(showcaseAll())).text).toContain('Wealth → What you owe → Plan paying off your debts');
    expect(ask('hoeveel heb ik deze week uitgegeven', zigiEnv(freshAll())).text).not.toMatch(/Vermogen/);
  });
});

describe('FR-MAX-6: "welke gewoonte sla ik het vaakst over" is the skipped-habits answer', () => {
  test('the Showcase, Dutch as the English (NOVA and ZIGi)', () => {
    for (const [who, env] of both(showcaseAll)) {
      const en = ask('Which habit do I skip most?', env).text;
      for (const q of ['Welke gewoonte sla ik het vaakst over?', 'welke gewoonte sla ik deze maand het vaakst over', 'Welke gewoonte sloeg ik het vaakst over?']) {
        const nl = ask(q, env).text;
        expect(nl, `${who}: ${q}`).toMatch(/overgeslagen/);
        expect(nl, `${who}: ${q}`).not.toMatch(/^Gewoontes nog open|nog open vandaag:/);
      }
      expect(en, who).toMatch(/skipped/);
    }
  });
  test('"sla … op" and a plain "over" are not skipping; an imperative skip is still a card, not a lookup', () => {
    const env = zigiEnv(showcaseAll());
    expect(ask('Hoeveel gewoontes heb ik vandaag nog over?', env).text).not.toMatch(/overgeslagen/);
    expect(ask('Welke gewoonte sla ik het vaakst over?', env).text).not.toBe(ask('Hoeveel gewoontes heb ik vandaag nog over?', env).text);
  });
});

describe('FR-TJ-17: a habit called Gym answers "gym streak" before the workout weeks', () => {
  const withGym = (): ToolSources => {
    const s = showcaseAll(), day = (d: string) => ({date: d, count: 1, disposition: 'logged', note: '', updatedAt: `${d}T20:00:00.000Z`});
    const gym = {id: '7a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d', title: 'Gym', category: 'Health', description: '', notes: '', timeOfDay: 'anytime', endCondition: {kind: 'none'}, startDate: '2026-11-01', createdAt: '2026-11-01T07:00:00.000Z', updatedAt: '2026-11-16T20:00:00.000Z',
      rules: [{from: '2026-11-01', schedule: {kind: 'daily'}, type: 'build', measurement: {kind: 'boolean'}, target: 1, targetPeriod: 'day', endCondition: {kind: 'none'}, state: 'active'}], entries: [day('2026-11-14'), day('2026-11-15'), day('2026-11-16')]};
    const habits = habitDataSchema.parse({...s.habits, habits: [...s.habits.habits, gym]}) as HabitData;
    return {...s, habits};
  };
  test('with the habit: its streak, never the workout weeks (NOVA and ZIGi)', () => {
    for (const [who, env] of both(withGym)) {
      const t = ask('What is my gym streak?', env).text;
      expect(t, who).toMatch(/\bGym\b/);
      expect(t, who).toMatch(/3 days/);
      expect(t, who).not.toMatch(/weeks? in a row with at least one workout/);
    }
  });
  test('without it: the workout weeks, as before', () => {
    for (const [who, env] of both(showcaseAll)) expect(ask('What is my gym streak?', env).text, who).toMatch(/^3 weeks in a row with at least one workout/);
  });
});

describe('FR-S-16: ZIGi\'s Health-closed reply names the one action, Allow Health in NOVA → Permissions', () => {
  const shut = (): ToolEnv => zigiEnv(showcaseAll(), false);
  test('English and Dutch: one sentence, one card to NOVA → Permissions, no switch named one by one', () => {
    for (const [q, words] of [['How did I sleep this week?', HEALTH_CLOSED], ['Hoe heb ik deze week geslapen?', HEALTH_CLOSED_NL]] as const) {
      const a = ask(q, shut()), parsed = parseReply(a.text);
      expect(a.kind, q).toBe('refusal');
      expect(parsed.text, q).toBe(words);
      expect(parsed.text, q).not.toMatch(/Health page data|Include Health|Privacy & data/);
      expect(parsed.proposals, q).toEqual([{kind: 'open-page', page: 'nova', view: 'permissions'}]);
    }
  });
  test('the card only opens NOVA → Permissions: nothing is written', () => {
    const env: Env = {stores: planStores(), handles: [], now: new Date('2026-11-17T19:00:00Z'), habitDay: '2026-11-17', healthDay: '2026-11-17', timeZone: 'UTC'};
    const r = planAction({kind: 'open-page', page: 'nova', view: 'permissions'}, env);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.navigate).toEqual({href: '/app/nova#nova-permissions', label: 'NOVA → Permissions'});
    expect(r.plan.card.title).toBe('Open NOVA → Permissions');
    expect(r.plan.undo).toBeNull();
    expect(planAction({kind: 'open-page', page: 'health', view: 'permissions'}, env).ok).toBe(false);
  });
  test('NOVA keeps its own words (FR-TJ-1)', () => {
    expect(ask('How did I sleep?', novaEnv(sanneAll(), undefined, false)).text).toBe('Health answers are off on this device, so nothing from Health is read here; turn them on with Allow Health in NOVA → Permissions.');
  });
});

describe('S-10: Dutch answers write Dutch dates and the 24-hour clock', () => {
  test('the week and the sleep goal, in Dutch words and dates (NOVA and ZIGi)', () => {
    for (const [who, env] of both(showcaseAll)) {
      const week = ask('Hoe was mijn week?', env).text;
      expect(week, who).toContain('laatste gewicht 73,6 kg op 12 nov 2026');
      expect(week, who).not.toMatch(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}, \d{4}/);
      expect(ask('Hoe heb ik geslapen?', env).text, who).toContain('Je doel: 8 h 00 min per nacht, bedtijd tussen 22:30 en 23:30.');
    }
    // A Dutch question where the weekly review is not on the device: its reason in Dutch too.
    const env = zigiEnv({...sanneAll(), weekly: null} as ToolSources);
    const t = ask('Hoe was mijn week?', env).text;
    expect(t).toMatch(/^Het weekoverzicht is nog niet beschikbaar op dit apparaat\. Het Life review toont de week ook uit je gegevens\./);
    expect(t).not.toMatch(/The weekly review is not available/);
  });
  test('the agenda, tomorrow and next (NOVA and ZIGi)', () => {
    for (const [who, env] of both(showcaseAll)) {
      for (const q of ['wat staat er morgen op mijn agenda', 'wat is het volgende op mijn agenda', 'Wat moet ik vandaag doen?']) {
        const t = ask(q, env).text;
        expect(t, `${who}: ${q}`).not.toMatch(/\d{1,2}:\d{2} ?(?:AM|PM)\b/);
        expect(t, `${who}: ${q}`).not.toMatch(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d/);
      }
      expect(ask('wat staat er morgen op mijn agenda', env).text, who).toMatch(/\b07:30 Upper body session\b/);
      expect(ask('what is on my agenda tomorrow', env).text, who).toMatch(/7:30 AM (?:Example · )?Upper body session/);
    }
  });
});
