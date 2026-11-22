import {afterEach, describe, expect, test, vi} from 'vitest';
import type {ToolSources} from '../tools/env';
import {ask, DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {av2R6MoneyAnswer} from './av2-r6-money';
import {av2R6PlanAnswer} from './av2-r6-plan';
import {av2R6NotesAnswer} from './av2-r6-notes';
import {av2R6BodyAnswer} from './av2-r6-body';
import type {LocalReply} from './engine';
import {MOON_WORDS, moonOn, sunOn} from '../../journal/sky';
import {addDays, wallClock} from '../../zone-time';
import {emptyDayEnds, setCurrentDayEnds} from '../../day-boundary-core';
import {emptyWorkouts, workoutsSchema} from '../../workouts/schema';
import {setLight} from '../../workouts/r6-gym';

/**
 * Session AV lane 2 (fixb6q): review B6Q's findings on round 6's on-device answers (NOVA and ZIGi), each pinned here in
 * English and Dutch. B6Q-2 asks the whole engine (`localAnswer`, through the harness's `ask`) once with round 6's money
 * answer and once with it switched off (the mock below passes every call through unless `off.money` is set): the payday
 * questions must get the same answer either way, so they stay with the older payday answers.
 */
const off = vi.hoisted(() => ({money: false}));
vi.mock('./av2-r6-money', async importOriginal => {
  const real = await importOriginal<typeof import('./av2-r6-money')>();
  return {...real, av2R6MoneyAnswer: (...args: Parameters<typeof real.av2R6MoneyAnswer>) => off.money ? null : real.av2R6MoneyAnswer(...args)};
});
afterEach(() => { off.money = false; setCurrentDayEnds(emptyDayEnds()); });
const text = (r: LocalReply | null) => r && 'text' in r ? r.text.replace(/[  ]/g, ' ') : '';
const ENGLISH_NAMES = /\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|January|February|March|April|May|June|July|August|September|October|November|December|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

describe('B6Q-2: the paycheck plan answers only about the plan; the next paycheck stays with the payday answers', () => {
  const PAYDAY = {
    en: ['when is my next paycheck', 'how much is left until my next paycheck', 'how much is due before my next paycheck', 'which bills are due before my next paycheck'],
    nl: ['wanneer is mijn volgende salaris', 'hoeveel houd ik over tot mijn volgende salaris', 'hoeveel moet ik betalen voor mijn volgende salaris', 'welke rekeningen moet ik betalen voor mijn volgende salaris'],
  };
  const PLAN = {
    en: ['what is left of each paycheck', 'show my paycheck plan', 'how do I plan my paychecks', 'how much does each paycheck cover'],
    nl: ['wat staat er per salaris gepland', 'toon mijn salarisplan', 'hoe plan ik mijn salarissen', 'hoeveel blijft er over van elk salaris'],
  };
  const envs = () => [['ZIGi', zigiEnv(showcaseAll())], ['NOVA', novaEnv(showcaseAll())], ['ZIGi fresh', zigiEnv(freshAll())]] as const;
  for (const lang of ['en', 'nl'] as const) test(`the payday questions (${lang}): the same answer as without round 6’s money answer`, () => {
    for (const q of PAYDAY[lang]) for (const [who, env] of envs()) {
      expect(av2R6MoneyAnswer(q, env), `${who}: ${q}`).toBeNull();
      const withR6 = ask(q, env).text;
      off.money = true;
      const without = ask(q, env).text;
      off.money = false;
      expect(withR6, `${who}: ${q}`).toBe(without);
      expect(withR6, `${who}: ${q}`).not.toMatch(/paychecks are set up|Your paychecks in|nog geen salarissen ingesteld|Je salarissen in/);
    }
  });
  for (const lang of ['en', 'nl'] as const) test(`the plan’s own questions (${lang}) are still its own`, () => {
    for (const q of PLAN[lang]) expect(text(av2R6MoneyAnswer(q, zigiEnv(showcaseAll()))), q).toMatch(lang === 'en' ? /^(?:Your paychecks in|No paychecks are set up yet)/ : /^(?:Je salarissen in|Er zijn nog geen salarissen ingesteld)/);
  });
});

describe('B6Q-3: a light week is marked during the workout to keep a routine’s weights out', () => {
  const lift = (id: string, date: string) => ({id, name: `Fictional legs ${id}`, date, type: 'strength', startedAt: `${date}T17:00:00.000Z`, endedAt: `${date}T18:00:00.000Z`, exercises: [{id: `${id}-e`, exerciseId: 'squat', name: 'Squat', measure: 'weight-reps', sets: [{id: `${id}-s`, kind: 'normal', reps: 5, weightKg: 100, done: true}]}]});
  const light = (): ToolSources => { const s = showcaseAll(); return {...s, ak: {...s.ak, workouts: setLight(workoutsSchema.parse({...emptyWorkouts(), workouts: [lift('a', '2026-11-09')]}), 'a', true)} as typeof s.ak}; };
  const none = (): ToolSources => { const s = showcaseAll(); return {...s, ak: {...s.ak, workouts: emptyWorkouts()} as typeof s.ak}; };
  const EN = 'Mark a light week during the workout ("Light week (not in my bests)", above Finish workout) and a routine that keeps your last weights leaves its weights out too; marked afterwards under Health → Workouts → Your workouts, it is left out of your bests and "new best" marks only.';
  const NL = 'Markeer een lichte week tijdens de workout ("Light week (not in my bests)", boven Finish workout), dan laat een routine die je laatste gewichten bewaart de gewichten ervan ook weg; markeer je hem achteraf onder Health → Workouts → Your workouts, dan blijft hij alleen buiten je records en de "new best"-markeringen.';
  test('none marked yet, English and Dutch', () => {
    expect(text(av2R6BodyAnswer('which workouts are light weeks', zigiEnv(none())))).toBe(`No workout is marked as a light week. ${EN} Either way its sets stay in your history and volume.`);
    expect(text(av2R6BodyAnswer('welke workouts tellen niet mee voor mijn records', zigiEnv(none())))).toBe(`Geen workout is als lichte week gemarkeerd. ${NL} Hoe dan ook blijven de sets in je geschiedenis en volume.`);
  });
  test('some marked: listed, then when to mark one', () => {
    expect(text(av2R6BodyAnswer('which workouts are light weeks', zigiEnv(light())))).toMatch(new RegExp(`^Light weeks, left out of your bests: Fictional legs a \\([^)]+\\)\\. Their sets stay in your history and volume\\. ${EN.replace(/[()→.]/g, '\\$&')}$`));
    const nl = text(av2R6BodyAnswer('welke workouts zijn lichte weken', zigiEnv(light())));
    expect(nl.endsWith(` Hun sets blijven in je geschiedenis en volume. ${NL}`), nl).toBe(true);
    expect(nl).not.toMatch(ENGLISH_NAMES);
  });
});

describe('B6Q-4 and B6Q-20 (plan): only "no day" leaves a repeating task’s day alone; Dutch says Ongedaan maken', () => {
  test('several tasks at once', () => {
    const en = text(av2R6PlanAnswer('how do I change several tasks at once', zigiEnv(showcaseAll())));
    expect(en).toMatch(/each as one change with one Undo\. Given no day, a repeating task keeps its own day, as it needs one\.$/);
    const nl = text(av2R6PlanAnswer('hoe pas ik meerdere taken tegelijk aan', zigiEnv(showcaseAll())));
    expect(nl).toMatch(/elk als één wijziging die je met één keer Ongedaan maken terugdraait\. Krijgt een herhalende taak geen dag, dan houdt ze haar eigen dag, want ze heeft er een nodig\.$/);
    expect(nl).not.toMatch(/\bUndo\b/);
  });
  test('the focus names the views as Tasks does: the Priority matrix, the Calendar', () => {
    const s = showcaseAll(), plain = {...s, nova: {...s.nova, taskPlan: null}} as ToolSources;
    expect(text(av2R6PlanAnswer('what am I focused on', zigiEnv(plain)))).toContain('(or Upcoming, the Priority matrix, the Calendar)');
    expect(text(av2R6PlanAnswer('waar ben ik op gefocust', zigiEnv(plain)))).toContain('(of Upcoming, de Priority matrix, de Calendar)');
  });
});

describe('B6Q-15: repeats from the month’s end answer a question about a task, never a date question', () => {
  test('date questions are not this answer', () => {
    for (const q of ['what is the second to last friday of the month', 'when is the last workday of the month', 'wat is de voorlaatste vrijdag van de maand', 'wanneer is de laatste werkdag van de maand']) expect(av2R6PlanAnswer(q, zigiEnv(showcaseAll())), q).toBeNull();
  });
  test('"Yes" only answers a yes-or-no question', () => {
    expect(text(av2R6PlanAnswer('can a task repeat on the second to last Friday', zigiEnv(showcaseAll())))).toMatch(/^Yes\. Type “every second-to-last Friday”/);
    expect(text(av2R6PlanAnswer('kan ik een taak laten herhalen op de voorlaatste vrijdag', zigiEnv(showcaseAll())))).toMatch(/^Ja\. Typ “elke voorlaatste vrijdag”/);
    expect(text(av2R6PlanAnswer('how do I make a task repeat on the last workday', zigiEnv(showcaseAll())))).toMatch(/^Type “every second-to-last Friday”/);
    expect(text(av2R6PlanAnswer('hoe laat ik een taak herhalen op de laatste werkdag', zigiEnv(showcaseAll())))).toMatch(/^Typ “elke voorlaatste vrijdag”/);
  });
});

describe('B6Q-19 (plan): Dutch', () => {
  test('no project in order, and a repeat’s record names no English rule', () => {
    const s = showcaseAll(), none = {...s, nova: {...s.nova, tasks: {...s.nova!.tasks!, projects: []}}} as ToolSources;
    expect(text(av2R6PlanAnswer('wat is de volgende taak in mijn project', zigiEnv(none)))).toMatch(/^Geen enkel project staat op volgorde\./);
    const t = {id: 'r1', title: 'Fictional plants', createdAt: `${DAY}T08:00:00.000Z`, due: DAY, recur: {every: 'week', interval: 1, weekdays: [1]}};
    const rec = {...s, nova: {...s.nova, tasks: {...s.nova!.tasks!, tasks: [t]}}} as ToolSources;
    const nl = text(av2R6PlanAnswer('hoe vaak heb ik mijn herhalende taken gedaan', zigiEnv(rec)));
    expect(nl).toMatch(/^Je herhalende taken over de laatste 3 maanden:\n• Fictional plants: 0 keer gedaan$/);
    expect(nl).not.toMatch(/herhaalt|every|\bMon\b/i);
    expect(text(av2R6PlanAnswer('how often did I do my repeating tasks', zigiEnv(rec)))).toMatch(/^Your repeating tasks over the last 3 months:\n• Fictional plants \(every week on mon\): done 0 times$/);
  });
});

describe('B6Q-5 and B6Q-20 (notes): Earlier versions while there is room; Dutch says Ongedaan maken', () => {
  const nova = (q: string) => text(av2R6NotesAnswer(q, novaEnv(showcaseAll())));
  test('renaming a tag', () => {
    expect(nova('how do I rename a tag in my notes')).toContain('the earlier words are kept under Earlier versions while there is room, and one Undo always puts every note back.');
    expect(nova('hoe hernoem ik een tag in mijn notities')).toContain('de eerdere woorden blijven onder Earlier versions zolang daar plaats is, en één keer Ongedaan maken zet altijd alle notities terug.');
  });
  test('no Dutch notes answer says Undo', () => {
    for (const q of ['hoe hernoem ik een tag in mijn notities', 'hoe voeg ik twee notities samen', 'kan ik een eigenschap op veel notities zetten', 'hoe importeer ik dagboekstukken uit een csv']) { const t = nova(q); expect(t, q).toContain('Ongedaan maken'); expect(t, q).not.toMatch(/\bUndo\b/); }
    expect(nova('hoe markeer ik een dagnotitie als teruggelezen')).toContain('die je nog niet hebt teruggelezen, oudste eerst.');
  });
});

describe('B6Q-16: sunrise and the moon for the place chosen under Sun and moon', () => {
  const env = () => zigiEnv(showcaseAll());
  const times = (day: string, lat: number, lon: number, zone: string) => { const s = sunOn(day, lat, lon); if (s.kind !== 'normal') throw Error('no sunrise'); return [wallClock(s.rise, zone).clock, wallClock(s.set, zone).clock] as const; };
  const moonEn = (day: string) => { const m = moonOn(day); return `${MOON_WORDS[m.phase].en}, ${Math.round(m.lit * 100)}% lit`; };
  const moonNl = (day: string) => { const m = moonOn(day); return `${MOON_WORDS[m.phase].nl}, ${Math.round(m.lit * 100)}% verlicht`; };
  test('a chosen city, in its own time, whatever this device’s zone', () => {
    const [rise, set] = times(DAY, 35.68, 139.69, 'Asia/Tokyo');
    expect(text(av2R6NotesAnswer('what time is sunrise today', env(), {sky: {city: 'tokyo'}, zone: 'Europe/Amsterdam'}))).toBe(`Today: sunrise ${rise} and sunset ${set} in Tokyo (the place you chose, in its own time; good to a few minutes), and the moon: ${moonEn(DAY)}. Worked out on this device, nothing looked up; the place is chosen under Journal → Entries → Sun and moon on a day.`);
    expect(text(av2R6NotesAnswer('hoe laat is de zonsopkomst vandaag', env(), {sky: {city: 'tokyo'}, zone: 'Europe/Amsterdam'}))).toBe(`Vandaag: zonsopkomst ${rise} en zonsondergang ${set} in Tokyo (de plaats die je koos, in haar eigen tijd; op een paar minuten na), en de maan: ${moonNl(DAY)}. Op dit apparaat berekend, er wordt niets opgezocht; de plaats kies je onder Journal → Entries, bij zon en maan van een dag.`);
  });
  test('a typed place, in this device’s zone; none chosen, the zone’s city', () => {
    const [rise] = times(DAY, 40, -3.7, 'Europe/Madrid');
    expect(text(av2R6NotesAnswer('what time is sunrise today', env(), {sky: {lat: 40, lon: -3.7, name: 'Fictional home'}, zone: 'Europe/Madrid'}))).toMatch(new RegExp(`^Today: sunrise ${rise} and sunset \\d\\d:\\d\\d in Fictional home \\(the place you typed, in this device’s time zone;`));
    const [ams] = times(DAY, 52.37, 4.9, 'Europe/Amsterdam');
    expect(text(av2R6NotesAnswer('what time is sunrise today', env(), {sky: undefined, zone: 'Europe/Amsterdam'}))).toMatch(new RegExp(`^Today: sunrise ${ams} and sunset \\d\\d:\\d\\d in Amsterdam \\(this device’s time zone; good to a few minutes\\).*; choose another place under Journal → Entries → Sun and moon on a day\\.$`));
  });
  test('Sun and moon off: the moon only, and where to turn it on', () => {
    expect(text(av2R6NotesAnswer('what time is sunrise today', env(), {sky: {off: true}, zone: 'Europe/Amsterdam'}))).toBe(`Today the moon is: ${moonEn(DAY)}. Sun and moon is off for your entries; to see sunrise and sunset, choose a place under Journal → Entries → Sun and moon on a day. It is worked out on this device, nothing is looked up.`);
    expect(text(av2R6NotesAnswer('welke fase heeft de maan vandaag', env(), {sky: {off: true}, zone: 'Europe/Amsterdam'}))).toBe(`Vandaag is de maan: ${moonNl(DAY)}. Zon en maan staat uit voor je stukken; kies voor zonsopkomst en zonsondergang een plaats onder Journal → Entries, bij zon en maan van een dag. Het wordt op dit apparaat berekend, er wordt niets opgezocht.`);
  });
  test('a Dutch sky answer writes no English day or month name, whatever the place', () => {
    for (const extra of [{sky: {city: 'tokyo'}}, {sky: {off: true as const}}, {sky: {lat: 40, lon: -3.7}, zone: 'Europe/Madrid'}, {sky: undefined, zone: 'Europe/Amsterdam'}, {sky: undefined, zone: 'Etc/Unknown'}]) for (const q of ['hoe laat is de zonsopkomst vandaag', 'welke fase heeft de maan vandaag']) {
      const t = text(av2R6NotesAnswer(q, env(), extra));
      expect(t, q).toMatch(/^(?:Vandaag|Morgen)\b/);
      expect(t, q).not.toMatch(ENGLISH_NAMES);
    }
  });
  test('tomorrow is tomorrow’s sun and moon, said as tomorrow', () => {
    const next = addDays(DAY, 1), [rise, set] = times(next, 52.37, 4.9, 'Europe/Amsterdam');
    expect(text(av2R6NotesAnswer('when is sunrise tomorrow', env(), {sky: {city: 'amsterdam'}}))).toMatch(new RegExp(`^Tomorrow: sunrise ${rise} and sunset ${set} in Amsterdam .*the moon: ${moonEn(next).replace(/[,%]/g, '\\$&')}\\.`));
    const nl = text(av2R6NotesAnswer('hoe laat komt de zon morgen op', env(), {sky: {city: 'amsterdam'}}));
    expect(nl).toMatch(new RegExp(`^Morgen: zonsopkomst ${rise} en zonsondergang ${set} in Amsterdam `));
    expect(nl).not.toMatch(ENGLISH_NAMES);
  });
});

describe('B6Q-17: the word goal reached says so', () => {
  const journal = (goal: number): ToolSources => { const s = showcaseAll(); s.journal = {version: 1, shareWithAi: false, followUps: true, wordGoal: goal, entries: [{id: 'a', date: DAY, text: 'one two three four five', createdAt: `${DAY}T08:00:00.000Z`}]} as never; return s; };
  test('English and Dutch', () => {
    expect(text(av2R6NotesAnswer('did I reach my word goal today', novaEnv(journal(5))))).toBe('Your goal is 5 words a day, and today holds 5: goal reached. The journal calendar marks each day you reached it.');
    expect(text(av2R6NotesAnswer('heb ik mijn woorddoel vandaag gehaald', novaEnv(journal(5))))).toBe('Je doel is 5 woorden per dag, en vandaag staan er 5: doel gehaald. De dagboekkalender markeert elke dag dat je het haalde.');
  });
});

describe('B6Q-13, B6Q-14 and B6Q-19 (money)', () => {
  const zigi = (q: string, s: ToolSources = showcaseAll()) => av2R6MoneyAnswer(q, zigiEnv(s));
  test('B6Q-13: "order" alone is not reordering the budgets', () => {
    for (const q of ['is my takeaway budget enough to order pizza', 'which budgets are over, in order', 'what budgets do I have in order of spending', 'welke budgetten zijn over, op volgorde']) expect(zigi(q), q).toBeNull();
    for (const q of ['how do I reorder my budgets', 'can I put my budgets in my own order', 'how do I change the order of my budgets', 'how do I sort my budgets', 'hoe zet ik mijn budgetten in een andere volgorde', 'kan ik mijn budgetten herschikken', 'hoe verander ik de volgorde van mijn budgetten']) expect(text(zigi(q)), q).toMatch(/Reorder budgets/);
  });
  test('B6Q-14: a refund policy or a subscription’s refund is not a logged refund', () => {
    for (const q of ['what is your refund policy', 'how do I get a refund for my subscription', 'can I get a refund for ZIGoals', 'hoe krijg ik een terugbetaling voor mijn abonnement', 'wat is het beleid voor een terugbetaling']) expect(zigi(q), q).toBeNull();
    for (const q of ['how much did I get refunded this month', 'does a refund count as income', 'hoeveel geld heb ik deze maand terug gekregen', 'is een terugbetaling inkomsten']) expect(text(zigi(q)), q).not.toBe('');
  });
  test('B6Q-19(f): the streak in Dutch words; (g): every repair can be undone', () => {
    expect(text(zigi('wat is mijn geldreeks', freshAll()))).toMatch(/^Je reeks voor je geld staat uit\. /);
    const s = freshAll(); s.moneyLog = {...s.moneyLog!, entries: [{id: 'a', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: `${DAY.slice(0, 7)}-05`, createdAt: `${DAY}T10:00:00.000Z`, note: 'Shop'}, {id: 'b', kind: 'expense', amount: '10.00', currency: 'EUR', category: 'Groceries', date: `${DAY.slice(0, 7)}-05`, createdAt: `${DAY}T10:00:00.000Z`, note: 'Shop'}]};
    const nl = text(zigi('zijn er dubbele boekingen in mijn geldlog', s));
    expect(nl).toMatch(/; elke reparatie kun je terugdraaien met Ongedaan maken\.$/);
    expect(nl).not.toMatch(/elke heeft/);
  });
});
