import {afterEach, describe, expect, test, vi} from 'vitest';
import {HEALTH_CLOSED} from '../tools/format';
import {DAY, freshAll, showcaseAll, zigiEnv} from '../evals/as/harness';
import {showcaseEvening} from '../../evening-plan/showcase';
import {AV2_BODY} from '../evals/as/cases-av2-body';
import {av2BodyAnswer} from './av2-body';
import {hideBodyFigures, withHiddenFigures} from './av2-hide-figures';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (body): the on-device answers of lib/ai/local-answers/av2-body.ts, on the Showcase (17 Nov 2026) and
 * on a fresh profile, in English and Dutch, and under the Health switch. Every corpus phrasing gets an answer here.
 */
const text = (r: LocalReply | null) => r && 'text' in r ? r.text : '';
const ask = (q: string, s = showcaseAll(), health = true) => av2BodyAnswer(q, zigiEnv(s, health));

describe('every corpus phrasing is answered, in its own language', () => {
  for (const c of AV2_BODY) for (const [lang, qs] of [['en', c.en], ['nl', c.nl]] as const) for (const q of qs) test(`${c.id} (${lang}): ${q}`, () => {
    const r = ask(q);
    expect(r?.kind, q).toBe('answer');
    for (const n of c.never ?? []) expect(text(r)).not.toContain(n);
  });
  test('Health closed: the Health refusal, never the data', () => {
    for (const c of AV2_BODY) { const r = ask(c.en[0]!, showcaseAll(), false); expect(r?.kind, c.id).toBe('refusal'); expect(text(r)).toBe(HEALTH_CLOSED); }
  });
});

describe('the exercise library (LEDGER #116, #119)', () => {
  test('how to do a squat: its muscles, three steps, the tip and the Showcase\'s pinned note, in English and Dutch', () => {
    const en = text(ask('how do I do a squat')), nl = text(ask('hoe doe ik een squat'));
    expect(en).toContain('Squat (works most: Quads (front thigh) · Glutes');
    expect(en).toContain('1. Bar on your upper back');
    expect(en).toContain('Your pinned note: “Example · safety bars at hole 6”');
    expect(nl).toContain('werkt vooral op: Voorkant bovenbeen · Bilspieren');
    expect(nl).toContain('Je vastgezette notitie');
    // "front squat" is its own exercise, never the squat.
    expect(text(ask('how do I do a front squat'))).toContain('Front squat (');
  });
  test('muscles and exercises for a muscle', () => {
    expect(text(ask('what muscles does the deadlift work'))).toContain('Deadlift works most: Glutes · Hamstrings (back thigh) · Lower back');
    expect(text(ask('welke spieren traint de deadlift'))).toContain('Deadlift werkt vooral op: Bilspieren');
    expect(text(ask('which exercises work my glutes'))).toContain('Hip thrust');
  });
  test('pinned notes: the Showcase\'s one; a fresh profile is told where to pin one', () => {
    expect(text(ask('what are my pinned notes'))).toContain('Squat: “Example · safety bars at hole 6”');
    expect(text(ask('wat zijn mijn vastgezette notities', freshAll()))).toContain('Er is nog geen notitie');
  });
  test('a question with an action in it, or not about exercises, is left alone', () => {
    expect(ask('how do I do a squat and log one more glass')).toBeNull();
    expect(ask('how do I do my taxes')).toBeNull();
  });
});

describe('progression (LEDGER #109)', () => {
  test('the Showcase\'s Push day: one more rep at 62.5 kg, in English and Dutch', () => {
    expect(text(ask('what is my next target for bench press'))).toContain('• Push day (6–10 reps, then +2.5 kg), Bench press: 62.5 kg × 9/9/8: one more rep than on Mon, Nov 16');
    expect(text(ask('wat is mijn volgende doel voor bankdrukken'))).toContain('62.5 kg × 9/9/8: één herhaling meer dan op ma 16 nov');
    expect(text(ask('what is my next target for the squat', freshAll()))).toContain('No routine has a progression rule yet');
  });
});

describe('runs, distance goals and the training load (LEDGER #110, #111)', () => {
  test('the Showcase\'s running goal this month, in English and Dutch', () => {
    expect(text(ask('how is my running goal going'))).toMatch(/^Your distance goals, from your own log:\n• running this month: \d+(?:\.\d+)? of 30 km/);
    expect(text(ask('hoe gaat mijn hardloopdoel'))).toMatch(/• hardlopen deze maand: \d+(?:\.\d+)? van 30 km/);
    expect(text(ask('what are my distance goals', freshAll()))).toContain('No distance goal is set yet');
  });
  test('the load in minutes, never calories; the last run beside the one before', () => {
    const en = text(ask('what is my training load'));
    expect(en).toMatch(/^Training load, the last 7 days: \d+ min/);
    expect(en).toContain('never calories');
    expect(en).not.toMatch(/kcal|calories burned/);
    expect(text(ask('wat is mijn trainingsbelasting'))).toContain('nooit calorieën');
    const run = text(ask('how did my last run compare'));
    expect(run).toContain('Easy run, ');
    expect(run).toContain('6 km at 5:40 a km. Against your last run: 4 s a km slower, 1 km longer.');
    expect(text(ask('hoe was mijn laatste loop'))).toContain('Tegenover je laatste loop: 4 s per km langzamer, 1 km langer.');
  });
});

describe('sleep: time to fall asleep and your usual (LEDGER #123, #124)', () => {
  test('the Showcase\'s nights: the week, 30 days and the usual, in English and Dutch', () => {
    expect(text(ask('how long do I take to fall asleep'))).toMatch(/^Time to fall asleep: \d+ min on average over the last 7 days \(\d nights\); \d+ min over the last 30 days; your usual \d+ min/);
    expect(text(ask('wat is mijn inslaaptijd'))).toMatch(/^Inslaaptijd: gemiddeld \d+ min de afgelopen 7 dagen/);
    const usual = text(ask('how did I sleep this week compared to usual'));
    expect(usual).toMatch(/^The last 7 days \(\d nights\) beside your usual \(the middle of your own \d+ nights before this week\): asleep \d+ h \d\d min \(usual \d+ h \d\d min\)/);
    expect(usual).toContain('No outside figures');
    expect(text(ask('wat is mijn gewone slaap'))).toContain('Geen cijfers van buiten');
    expect(text(ask('what is my usual sleep', freshAll()))).toContain('There is no usual yet');
  });
});

describe('the evening plan (LEDGER #83)', () => {
  const withPlan = (plan: ReturnType<typeof showcaseEvening> | null) => { const s = showcaseAll(); s.ak = {...s.ak, eveningPlan: plan} as typeof s.ak; return s; };
  test('tonight\'s steps and the bar, in English and Dutch, once the record is in the sources', () => {
    const en = text(ask('am I ready for bed', withPlan(showcaseEvening(DAY))));
    expect(en).toMatch(/^Ready for bed: 2 of 5 steps tonight; lights out at /);
    expect(en).toContain('Write down what is on your mind (done)');
    expect(en).toContain('Lights out');
    const nl = text(ask('wat is mijn avondplan', withPlan(showcaseEvening(DAY))));
    expect(nl).toContain('Klaar voor bed: 2 van 5 stappen vanavond; licht uit om 23:00.');
    expect(nl).toContain('• 22:00 Write down what is on your mind (gedaan)');
    expect(text(ask('what is my evening plan', withPlan(null)))).toContain('No evening plan yet');
    // Lead (batch 2, deliberate): the record is now in the AK sources, so the Showcase answers with its own plan, not where it lives.
    expect(text(ask('what is my evening plan'))).toContain('Ready for bed');
  });
});

describe('shoes and running tips (LEDGER #203, #208)', () => {
  test('the Showcase\'s labelled pair near its limit; a tip of the day in both languages', () => {
    expect(text(ask('how far have my running shoes gone'))).toBe('Your shoes in use:\n• Example · blue trainers: 631 of 700 km, near its limit (69 km to go)');
    expect(text(ask('hoeveel km hebben mijn hardloopschoenen'))).toContain('631 van 700 km, bijna op (nog 69 km)');
    expect(text(ask('when should I replace my shoes', freshAll()))).toContain('No shoes are added yet');
    expect(text(ask('give me a running tip'))).toMatch(/^A running tip for today: .+ \(Health → Workouts has one each day\.\)$/);
    expect(text(ask('geef me een looptip'))).toMatch(/^Een looptip voor vandaag: /);
  });
});

describe('BMI and weight milestones (LEDGER #205, #210)', () => {
  const withBody = (bodyExtras: unknown) => { const s = showcaseAll(); s.ak = {...s.ak, bodyExtras} as typeof s.ak; return s; };
  test('the number only, never a judgement word, in English and Dutch', () => {
    const latest = [...showcaseAll().health!.weights].sort((x, y) => y.date.localeCompare(x.date))[0]!;
    const en = text(ask('what is my BMI', withBody({version: 1, heightCm: 180})));
    expect(en).toContain(`Your BMI is ${(Math.round(latest.grams / 1000 / 3.24 * 10) / 10).toLocaleString('en-US')}: `);
    expect(en).toContain('on its own it says nothing about your health');
    for (const word of ['overweight', 'underweight', 'normal', 'healthy weight', 'ideal', 'obese']) expect(en.toLowerCase()).not.toContain(word);
    expect(text(ask('wat is mijn BMI', withBody({version: 1, heightCm: 180})))).toContain('Je BMI is ');
    expect(text(ask('what is my BMI', withBody({version: 1})))).toContain('it needs your height');
    expect(text(ask('what is my BMI'))).toContain('Health → Weight → BMI and milestones');
  });
  test('milestones: off, then the steps reached and the next', () => {
    expect(text(ask('how are my weight milestones', withBody({version: 1})))).toContain('Weight milestones are off');
    const latest = [...showcaseAll().health!.weights].sort((x, y) => y.date.localeCompare(x.date))[0]!;
    const body = {version: 1, milestones: {step: '2kg', startGrams: latest.grams + 3000, goalGrams: latest.grams - 3000, startedOn: '2026-10-01', reached: []}};
    expect(text(ask('how are my weight milestones', withBody(body)))).toMatch(/^1 of 3 milestones reached; the next is [\d.]+ kg\.$/);
    expect(text(ask('hoe gaan mijn gewichtsmijlpalen', withBody(body)))).toMatch(/^1 van 3 mijlpalen gehaald/);
  });
});

describe('the calendar (LEDGER #118)', () => {
  test('the Showcase\'s weeks in a row and its days this year', () => {
    // The Showcase trains on days −13 … −1 before 17 Nov: the weeks of 2 Nov, 9 Nov and 16 Nov.
    expect(text(ask('how many weeks in a row have I trained'))).toContain('3 weeks in a row with at least one workout, this week included');
    expect(text(ask('hoeveel weken op rij heb ik getraind'))).toContain('3 weken op rij');
    expect(text(ask('how many days did I train this year'))).toMatch(/^\d+ days with a workout in 2026/);
    expect(text(ask('what is my workout streak', freshAll()))).toContain('No week in a row yet');
  });
});

describe('progress analytics (LEDGER #117)', () => {
  test('the month beside the month before, in English and Dutch', () => {
    const en = text(ask('how did my training go this month'));
    expect(en).toMatch(/^Nov 2026 so far, beside the month before: \d+ workouts on \d+ days/);
    expect(en).toContain('Health → Workouts → Progress');
    expect(text(ask('hoe ging mijn training deze maand'))).toMatch(/^november 2026 tot nu toe, naast de maand ervoor: \d+ workouts op \d+ dagen/);
  });
  test('sets per muscle group: this week and the last 8 weeks', () => {
    expect(text(ask('show my sets per muscle group'))).toMatch(/^Working sets per muscle group, this week \/ the last 8 weeks: chest \d+ \/ \d+/);
    expect(text(ask('hoeveel sets per spiergroep heb ik gedaan'))).toContain('borst');
    expect(text(ask('show my sets per muscle group', freshAll()))).toContain('No working set');
  });
});

describe('routines (LEDGER #112, #115, #119)', () => {
  test('own routines by folder, with the Showcase\'s labelled note', () => {
    const en = text(ask('what routines do I have'));
    expect(en).toContain('2 routines:');
    expect(en).toContain('• Gym: Push day (note: Example · 90 s rest between sets), Leg day');
    expect(text(ask('welke routines heb ik', freshAll()))).toContain('Er is nog geen routine opgeslagen');
  });
  test('the ready-made library, filtered for at home', () => {
    expect(text(ask('which ready-made routines are there'))).toContain('Full body A (Gym, about 45 min)');
    const home = text(ask('stel een routine voor thuis voor'));
    expect(home).toContain('Lichaamsgewicht thuis');
    expect(home).not.toContain('Duwdag');
  });
});

/** Review b2b #3: with "Hide calories and weight" on, the BMI answer says neither the BMI nor the height (together they give the weight back). */
describe('BMI under hidden figures (review b2b #3)', () => {
  afterEach(() => { vi.unstubAllGlobals(); });
  const withBody = (bodyExtras: unknown) => { const s = showcaseAll(); s.ak = {...s.ak, bodyExtras} as typeof s.ak; return s; };
  const hide = () => vi.stubGlobal('window', {localStorage: {getItem: (k: string) => k === 'zigoals:hide-body-figures' ? 'on' : null}});
  test('English: no BMI, no height, no weight; one line on where to show it again', () => {
    const shown = text(ask('what is my BMI', withBody({version: 1, heightCm: 180})));
    expect(shown).toMatch(/Your BMI is \d/);
    hide();
    const r = ask('what is my BMI', withBody({version: 1, heightCm: 180}));
    const en = text(withHiddenFigures(r!, true, 'en'));
    expect(en).toBe('Your BMI is hidden with your weight figures on this device; Health → “Show calories and weight” brings it back.');
    expect(en).not.toMatch(/\d/);
  });
  test('Dutch: no BMI, no height, no weight; one line on where to show it again', () => {
    expect(text(ask('wat is mijn BMI', withBody({version: 1, heightCm: 180})))).toMatch(/Je BMI is \d/);
    hide();
    const nl = text(withHiddenFigures(ask('wat is mijn BMI', withBody({version: 1, heightCm: 180}))!, true, 'nl'));
    expect(nl).toBe('Je BMI is verborgen, samen met je gewichtscijfers op dit apparaat; Health → “Show calories and weight” zet hem terug.');
    expect(nl).not.toMatch(/\d/);
  });
  test('the switch off: the number as before; the height still asked for when missing, switch on or off', () => {
    hide();
    expect(text(ask('what is my BMI', withBody({version: 1})))).toContain('it needs your height');
    vi.unstubAllGlobals();
    expect(text(ask('what is my BMI', withBody({version: 1, heightCm: 180})))).toContain('(weight in kg ÷ height in metres, squared)');
  });
  test('any other answer that names a BMI figure has it hidden too, in English and Dutch', () => {
    expect(hideBodyFigures('Your BMI is 24.3: 78.6 kg and 180 cm.').text).toBe('Your BMI is —: — kg and 180 cm.');
    expect(hideBodyFigures('Je BMI is 24,3 vandaag.').text).toBe('Je BMI is — vandaag.');
    expect(hideBodyFigures('BMI: 22.1').text).toBe('BMI: —');
    expect(hideBodyFigures('3 sets of 8 reps; BMI 23').text).toBe('3 sets of 8 reps; BMI —');
  });
});
