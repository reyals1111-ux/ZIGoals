import {afterEach, describe, expect, test, vi} from 'vitest';
import {ask, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {createEmptyHealth, healthSchema, type HealthData} from '../../health';
import {tasksSchema} from '../../tasks/schema';
import {setDisplayLocale} from '../../visual-format';
import type {ToolSources} from '../tools/env';
import {awFrAnswer, calorieDays} from './aw-fr-answers';
import {exactQuery, strictClaim} from './exact';

/**
 * Session AW (fr-answers): the fresh-eyes persona walks' NOVA and ZIGi answers (FRIEND_READINESS-aw FR-AW-5, -6, -17, -19),
 * each asked through the whole engine (`localAnswer`, then the no-model reply, as the harness's `ask` does) in NOVA and
 * ZIGi, English and Dutch. Lina's records are fictional, as every fixture here: Mon 30 Nov a breakfast in words and a
 * 620 kcal dinner, Tue 1 Dec a 480 kcal lunch; she asks on Sun 6 Dec.
 */
const LINA_DAY = '2026-12-06';
const entry = (id: string, date: string, meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks', name: string, kcal: number | null) => ({id: `health_diary-${id}`, sourceId: `health_food-${id}`, sourceKind: 'food' as const, snapshot: {name, servingGrams: 100, nutrients: {kcal, proteinMg: null, carbsMg: null, fatMg: null}}, date, meal, quantityMilli: 1000, createdAt: `${date}T18:00:00.000Z`, updatedAt: `${date}T18:00:00.000Z`});
const LINA_WORDS = {version: 1, entries: [{id: 'words_lina-0001', date: '2026-11-30', meal: 'Breakfast', words: 'Porridge with blueberries and a coffee', at: '2026-11-30T07:30:00.000Z'}]};
function linaAll(diary = [entry('lina-1', '2026-11-30', 'Dinner', 'Fictional pasta', 620), entry('lina-2', '2026-12-01', 'Lunch', 'Fictional soup', 480)]): ToolSources {
  const health = healthSchema.parse({...createEmptyHealth(), diary}) as HealthData;
  return {...freshAll(), now: new Date('2026-12-06T17:30:00Z'), habitDay: LINA_DAY, healthDay: LINA_DAY, habitZone: 'Europe/Amsterdam', healthZone: 'Europe/Amsterdam', health};
}
const store = (records: Record<string, string>) => vi.stubGlobal('window', {localStorage: {getItem: (k: string) => records[k] ?? null, setItem: () => undefined, removeItem: () => undefined, key: () => null, length: 0, clear: () => undefined}, sessionStorage: {getItem: () => null}});
const linaStore = () => store({'zigoals:meal-words:v1': JSON.stringify(LINA_WORDS)});
afterEach(() => { vi.unstubAllGlobals(); setDisplayLocale('en-US'); });
const both = (s: () => ToolSources) => [['ZIGi', zigiEnv(s())], ['NOVA', novaEnv(s())]] as const;

describe('FR-AW-5: a day with a meal in words or an entry without calories is never a complete day in the average', () => {
  test('Lina: the words day is left out with its reason, the average is over the one complete day (EN and NL, NOVA and ZIGi)', () => {
    linaStore();
    for (const [who, env] of both(() => linaAll())) {
      const en = ask('What was my average calories this week?', env).text;
      expect(en, who).toBe('On average 480 kcal a day this week (Mon, Nov 30 to Sun, Dec 6), over the 1 day whose entries all say (Tue, Dec 1). 1 day is left out because its total is unknown: Mon, Nov 30 (1 meal in words without calories). “Find these foods” beside a meal in words in Health turns it into foods with calories.');
      expect(en, who).not.toMatch(/550/);
      const nl = ask('Wat waren mijn gemiddelde calorieën deze week?', env).text;
      expect(nl, who).toBe('Gemiddeld 480 kcal per dag deze week (ma 30 nov t/m zo 6 dec), over de 1 dag waarop alle regels het zeggen (di 1 dec). 1 dag telt niet mee, want het totaal is onbekend: ma 30 nov (1 maaltijd in woorden zonder calorieën). “Find these foods” bij een maaltijd in woorden in Health maakt er voedingsmiddelen met calorieën van.');
    }
  });
  test('an entry without calories leaves its day out too; with no complete day the average is unknown, never 0', () => {
    store({});
    const env = novaEnv(linaAll([entry('lina-3', '2026-12-02', 'Lunch', 'Fictional salad', null), entry('lina-4', '2026-12-02', 'Dinner', 'Fictional rice', 500)]));
    expect(ask('What was my average calories this week?', env).text).toBe('No day this week (Mon, Nov 30 to Sun, Dec 6) has a complete calorie total, so there is no average: it is unknown, never 0. Left out: Wed, Dec 2 (1 entry without calories).');
    expect(ask('Gemiddeld hoeveel kcal per dag deze week?', env).text).toBe('Geen dag deze week (ma 30 nov t/m zo 6 dec) heeft een volledig calorietotaal, dus er is geen gemiddelde: het is onbekend, nooit 0. Niet meegeteld: wo 2 dec (1 regel zonder calorieën).');
  });
  test('every day complete: the diary\'s own average answers stand, word for word', () => {
    store({});
    const env = novaEnv(linaAll());
    expect(awFrAnswer('What was my average calories this week?', env, null)).toBeNull();
    expect(ask('What was my average calories this week?', env).text).toBe('On average 550 kcal of energy a day this week (Mon, Nov 30 to Sun, Dec 6), over the 2 days whose entries all say.');
    // The Showcase keeps its answer (no meal in words, every entry says its calories).
    expect(ask('What was my average calories this week?', novaEnv(showcaseAll())).text).toBe('On average 2,019.5 kcal of energy a day this week (Mon, Nov 16 to Tue, Nov 17), over the 2 days whose entries all say.');
  });
  test('calorieDays: unknown is null, never 0; only the days with something logged', () => {
    const days = calorieDays(linaAll().health!.diary, LINA_WORDS.entries as never, {from: '2026-11-30', to: LINA_DAY, label: 'this week'});
    expect(days.map(d => [d.date, d.kcal, d.words])).toEqual([['2026-11-30', null, 1], ['2026-12-01', 480, 0]]);
  });
  test('burned, a target and a food\'s own figures are not this answer', () => {
    linaStore();
    const env = novaEnv(linaAll());
    for (const q of ['What is my average calories burned this week?', 'What is my average calorie target?', 'average calories in a banana']) expect(awFrAnswer(q, env), q).toBeNull();
  });
});

describe('FR-AW-17: "am I eating healthy" is answered from the food diary, with no judgement and no advice', () => {
  test('Lina: entries, meals in words and the complete days, EN and NL', () => {
    linaStore();
    for (const [who, env] of both(() => linaAll())) {
      const en = ask('Am I eating healthy?', env).text;
      expect(en, who).toBe('What your food diary holds the last 7 days (Mon, Nov 30 to Sun, Dec 6): 2 entries and 1 meal in words on 2 days (breakfast 1, lunch 1, dinner 1).\n- Logged most: Fictional pasta (1), Fictional soup (1)\n- Energy on the 1 day whose entries all say: on average 480 kcal a day\n- A meal in words has no calories, so it is in no total (unknown, never 0)\nWhether that is healthy is not something I judge, and I give no diet or medical advice; a GP or a dietitian can help with that.');
      expect(en, who).not.toMatch(/water|weight|steps/i);
      expect(ask('Eet ik gezond?', env).text, who).toBe('Wat je eetdagboek bevat de afgelopen 7 dagen (ma 30 nov t/m zo 6 dec): 2 regels en 1 maaltijd in woorden op 2 dagen (ontbijt 1, lunch 1, avondeten 1).\n- Het vaakst gelogd: Fictional pasta (1), Fictional soup (1)\n- Energie op de 1 dag waarop alle regels het zeggen: gemiddeld 480 kcal per dag\n- Een maaltijd in woorden heeft geen calorieën, dus die telt in geen totaal mee (onbekend, nooit 0)\nOf dat gezond is, beoordeel ik niet, en ik geef geen voedings- of medisch advies; een huisarts of diëtist kan je daarbij helpen.');
    }
  });
  test('the other phrasings, an empty diary, and Health closed', () => {
    store({});
    const env = novaEnv(linaAll());
    for (const q of ['Is my diet healthy?', 'Am I eating well?', 'How healthy is my diet?', 'Eet ik wel gezond?', 'Is mijn eten gezond?', 'Hoe gezond eet ik?']) expect(ask(q, env).text, q).toMatch(/^(?:What your food diary holds|Wat je eetdagboek bevat)/);
    const empty = novaEnv({...linaAll(), health: createEmptyHealth()});
    expect(ask('Am I eating healthy?', empty).text).toBe('Your food diary holds nothing the last 7 days (Mon, Nov 30 to Sun, Dec 6), so there is nothing to describe yet. Log a meal in Health → Food, or describe it in words, and ask again. Whether that is healthy is not something I judge, and I give no diet or medical advice; a GP or a dietitian can help with that.');
    const shut = zigiEnv(linaAll(), false);
    expect(ask('Am I eating healthy?', shut).kind).toBe('refusal');
    expect(ask('Eet ik gezond?', shut).text).toMatch(/^Health wordt hier niet met ZIGi gedeeld/);
    for (const q of ['Am I eating healthy?', 'Eet ik gezond?']) expect(ask(q, env).text, q).not.toMatch(/\b(?:you should|too much|too little|unhealthy|je moet|ongezond|te veel|te weinig)\b/i);
  });
});

const MAX_TASKS = tasksSchema.parse({version: 1, tasks: [
  {id: 'task-physio', title: 'Book physio appointment', due: '2026-12-01', time: '09:30', priority: 'normal', createdAt: '2026-11-30T08:00:00.000Z', updatedAt: '2026-11-30T08:00:00.000Z'},
  {id: 'task-tyres', title: 'Check the bike tyres', due: '2026-12-04', priority: 'normal', createdAt: '2026-11-30T08:00:00.000Z', updatedAt: '2026-11-30T08:00:00.000Z'},
  {id: 'task-form', title: 'Send the gym form', due: '2026-12-08', priority: 'normal', createdAt: '2026-11-30T08:00:00.000Z', updatedAt: '2026-11-30T08:00:00.000Z'},
]});
const maxAll = (): ToolSources => { const s = freshAll(); return {...s, now: new Date('2026-12-03T06:00:00Z'), habitDay: '2026-12-03', healthDay: '2026-12-03', habitZone: 'Europe/Amsterdam', healthZone: 'Europe/Amsterdam', nova: {...s.nova!, tasks: MAX_TASKS}}; };
describe('FR-AW-6: tasks due tomorrow or in the week ahead are recorded today, so they are read', () => {
  test('Max on Thu 3 Dec: tomorrow, this week, next week, EN and NL', () => {
    for (const [who, env] of both(maxAll)) {
      expect(ask('What is due tomorrow?', env).text, who).toBe('1 task is due tomorrow: Check the bike tyres (due Fri, Dec 4).');
      expect(ask('Wat moet er morgen af?', env).text, who).toBe('1 taak staat gepland voor morgen: Check the bike tyres (gepland vr 4 dec).');
      expect(ask('What is due this week?', env).text, who).toBe('1 task is due the rest of this week: Check the bike tyres (due Fri, Dec 4). 1 overdue.');
      expect(ask('What is due next week?', env).text, who).toBe('1 task is due next week: Send the gym form (due Tue, Dec 8).');
      expect(ask('Wat moet er volgende week af?', env).text, who).toBe('1 taak staat gepland voor volgende week: Send the gym form (gepland di 8 dec).');
      expect(ask('What is due in the week ahead?', env).text, who).toBe('2 tasks are due in the next 7 days: Check the bike tyres (due Fri, Dec 4) and Send the gym form (due Tue, Dec 8).');
    }
  });
  test('a record still ahead keeps the guard: tomorrow\'s sleep or weight is not recorded yet', () => {
    for (const [who, env] of both(maxAll)) {
      for (const q of ['How did I sleep tomorrow?', 'What will I weigh tomorrow?']) expect(ask(q, env).text, `${who} ${q}`).toMatch(/^That is still ahead: (?:NOVA|ZIGi) reads only what is recorded up to today\.$/);
    }
  });
});

describe('FR-AW-19: "compare this week with last week" is the week beside the one before, never a task named after it', () => {
  test('the Showcase, EN and NL, NOVA and ZIGi: both periods named, each figure beside its own', () => {
    for (const [who, env] of both(showcaseAll)) {
      for (const q of ['Compare this week with last week', 'Compare this week to last week', 'This week vs last week', 'How was my week compared to last week?']) {
        const a = ask(q, env);
        expect(a.tools, `${who} ${q}`).toEqual(['life_facts']);
        expect(a.text, `${who} ${q}`).toBe('Your records this week (Mon, Nov 16 to Tue, Nov 17) beside the period before (Mon, Nov 9 to Tue, Nov 10): habits 11 of 14 done, 3 still open (12 of 12 the period before); 6 open tasks, 2 overdue; steps 8,450 steps a day (7,050 steps the period before); water 1,550 mL a day (2,100 mL the period before); sleep 6 h 57 min a day (7 h 18 min the period before).');
        expect(a.text).not.toContain('zigoals-action');
      }
      for (const q of ['Vergelijk deze week met vorige week', 'Hoe was mijn week vergeleken met vorige week?']) expect(ask(q, env).text, `${who} ${q}`).toBe('Je gegevens deze week (ma 16 nov t/m di 17 nov) naast de periode ervoor (ma 9 nov t/m di 10 nov): gewoontes 11 van 14 gedaan, 3 nog open (12 van 12 de periode ervoor); 6 open taken, 2 te laat; stappen 8.450 stappen per dag (7.050 stappen de periode ervoor); water 1.550 mL per dag (2.100 mL de periode ervoor); slaap 6 h 57 min per dag (7 h 18 min de periode ervoor).');
    }
  });
  test('a part of life named keeps its own comparison; the strict claim is the whole life\'s only', () => {
    const env = novaEnv(showcaseAll());
    expect(ask('Compare my habits this week with last week', env).text).toBe('Habits this week: 11 of 11 due check-ins done (100%); last week: 40 of 41 (98%).');
    const q = exactQuery('Compare this week with last week', env)!;
    expect([q.domain, q.ask, strictClaim(q)]).toEqual(['life', 'compare', true]);
    expect(strictClaim({...exactQuery('How was my week?', env)!})).toBe(false);
  });
});
