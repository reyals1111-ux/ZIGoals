import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../../local-date';
import {HEALTH_CLOSED} from '../tools/format';
import type {ToolEnv, ToolSources} from '../tools/env';
import {DAY, freshAll, novaEnv, showcaseAll, zigiEnv} from '../evals/as/harness';
import {localAnswer, type LocalReply} from './engine';
import {noModelReply} from './no-model';

/**
 * Session AV (owner follow-up 2, item 1c; the fresh reviewers' check 5, q1–q4): the AV features' on-device answers where
 * the Showcase alone does not show the fix (a task reminder ahead, the reason a habit was missed, never missing twice,
 * a regular payday), the words that collided ("stemming" is mood, not a vote), and every answer under its own switch.
 * The Showcase's own answers are pinned in the corpus (lib/ai/evals/as/cases-av.ts, expected.json).
 */
const text = (r: LocalReply) => 'text' in r ? r.text : '';
const zigi = (q: string, s: ToolSources = showcaseAll()) => { const env = zigiEnv(s), r = localAnswer(q, env); return r.kind === 'none' ? noModelReply(q, env) : r; };
const nova = (q: string, s: ToolSources = showcaseAll()) => { const env = novaEnv(s), r = localAnswer(q, env); return r.kind === 'none' ? noModelReply(q, env) : r; };
const withAreas = (env: ToolEnv, areas: Partial<ToolEnv['areas']>): ToolEnv => ({...env, areas: {...env.areas, ...areas}});
const yesterday = addLocalDays(DAY, -1);

describe('Today', () => {
  test('task reminders: the reminders still ahead, soonest first, in English and Dutch (q1 #1)', () => {
    const s = showcaseAll(), tasks = s.nova!.tasks!, first = tasks.tasks.find(t => !t.doneAt)!;
    s.nova = {...s.nova, tasks: {...tasks, tasks: tasks.tasks.map(t => t.id === first.id ? {...t, due: addLocalDays(DAY, 1), time: '09:00', reminders: [{before: 30}]} : t)}};
    const en = text(zigi('which task reminders do I have', s)), nl = text(zigi('welke herinneringen heb ik voor taken', s));
    expect(en).toContain('1 task reminder still ahead');
    expect(en).toContain('30 minutes before');
    expect(en).not.toContain('open tasks');
    expect(nl).toContain('1 taakherinnering nog te gaan');
    expect(nl).toContain('wo 18 nov om 08:30 (30 minuten van tevoren)');
  });
  test('countdowns: a yearly one on its next day; on a fresh profile it says where they live, never "no habits" (q1 #44)', () => {
    expect(text(zigi('how many days until mum\'s birthday'))).toContain('Mum’s birthday: in 3 days');
    expect(text(zigi('hoeveel dagen tot de verjaardag van mama'))).toContain('over 3 dagen, op vr 20 nov');
    const fresh = text(zigi('how many days until mum\'s birthday', freshAll()));
    expect(fresh).toContain('Today → Days until');
    expect(fresh).not.toContain('habits');
    // "when is my next bill" is no countdown: the bills answer keeps it.
    expect(text(zigi('when is my next bill'))).toContain('Rent');
  });
  test('plan my day / plan mijn dag with no model: the suggested tasks, never a task called "Plan mijn dag" (q1 #38)', () => {
    const en = text(zigi('plan my day')), nl = text(zigi('plan mijn dag'));
    expect(en).toContain('Worth a look when you plan today');
    expect(nl).toContain('Het bekijken waard als je vandaag plant');
    expect(nl).toContain('stond gepland voor ma 16 nov');
    expect(nl).not.toContain('add-task');
  });
  test('Dutch task answers write Dutch days and a 24-hour clock (q1 #2)', () => {
    const deadline = text(zigi('welke taken hebben een deadline')), due = text(zigi('welke taken hebben hoge prioriteit'));
    expect(deadline).toContain('wo 25 nov');
    expect(deadline).not.toMatch(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), /);
    expect(due).toContain('10:30');
    expect(due).not.toContain('AM');
  });
  test('the weekly review: the intention it kept (q1 #12)', () => {
    expect(text(zigi('what was my intention for this week'))).toContain('one short walk after lunch');
    expect(text(zigi('wat was mijn voornemen voor deze week'))).toContain('zo 8 nov');
  });
});

describe('Wealth', () => {
  test('bills a year: the yearly estimate, not the typical month alone (q1 F-YEAR)', () => {
    expect(text(zigi('how much are my bills a year'))).toMatch(/about €[\d,.]+ a year/);
    expect(text(zigi('hoeveel kosten mijn rekeningen per jaar'))).toMatch(/ongeveer €[\d,.]+ per jaar/);
  });
  test('payday: the next one from the regular income, and the bills before it (q2 #42)', () => {
    const s = showcaseAll(), log = s.moneyLog!, salary = log.entries.find(e => e.kind === 'income' && e.date.startsWith(DAY.slice(0, 7)))!;
    s.moneyLog = {...log, entries: [...log.entries, {...salary, id: `${salary.id}-before`, date: addLocalDays(salary.date, -30)}]};
    const en = text(zigi('how much is due before payday', s)), nl = text(zigi('hoeveel moet ik betalen voor de volgende salarisdag', s));
    expect(en).toContain('Your next payday, as your money log shows it:');
    expect(en).toMatch(/Before it: €[\d,.]+ in \d+ bills?|No bill falls due before it/);
    expect(nl).toContain('Je volgende salarisdag');
  });
  test('a payee is searched in the notes; a name the notes do not hold is never the month or a whole category (q2 #21)', () => {
    expect(text(zigi('how much did I spend at Café Noël'))).toContain('Nothing in your whole money log matches “Café Noël”');
    expect(text(zigi('how much did I spend at Café Noël'))).not.toContain('435.59');
    expect(text(zigi('hoeveel heb ik bij Market uitgegeven'))).toContain('€61.30 uitgegeven bij “Market”');
    // A total with no period named is this month's in Dutch too (it was today's).
    expect(text(zigi('hoeveel heb ik uitgegeven aan boodschappen'))).toContain('deze maand');
  });
  test('budget targets before any goal of that name (q2 #9)', () => {
    const r = text(zigi('Am I on track for my groceries target?'));
    expect(r).toContain('target €300.00');
    expect(r).not.toContain('could not find a goal');
    expect(text(zigi('Wat zijn mijn budgetdoelen?'))).toContain('doel €300.00');
  });
  test('the debt planner is named in Dutch in a Dutch answer (q2 #16)', () => {
    expect(text(zigi('wanneer ben ik schuldenvrij'))).toContain('Vermogen → Wat je schuldig bent');
    expect(text(zigi('laat mijn aflossingsschema zien'))).toContain('Nog te betalen na 3 maanden');
  });
  test('Wealth closed: nothing of it is read (each answer under its own switch)', () => {
    const env = withAreas(zigiEnv(showcaseAll()), {wealth: false});
    for (const q of ['how much are my bills a year', 'which bills have I paid this month', 'what are my budget targets', 'how much did I spend at Market', 'what price alerts do I have'])
      expect(localAnswer(q, env).kind, q).toBe('refusal');
  });
});

describe('Health', () => {
  test('"stemming" is mood, never the Governance vote (q3 #8)', () => {
    const nl = text(zigi('wat beïnvloedt mijn stemming'));
    expect(nl).toContain('Life review');
    expect(nl).not.toContain('Governance');
    // A real vote still gets the Governance answer.
    expect(text(zigi('hoe werkt de stemming over een voorstel'))).toContain('Governance');
  });
  test('Health closed: the Health answers refuse before reading anything (the gate)', () => {
    const s = showcaseAll(), env = zigiEnv(s, false);
    for (const q of ['what is my sleep score', 'how much weight did I lift this week', 'what is my fastest 5k', 'what are my saved meals', 'what supplements do I take', 'how did I sleep the last 90 days']) {
      const r = localAnswer(q, env);
      expect(r.kind, q).toBe('refusal');
      expect(text(r), q).toContain(HEALTH_CLOSED);
    }
  });
  test('the lifted weight is the training volume, never the body weight (q3 #11)', () => {
    expect(text(zigi('how much weight did I lift this week'))).toMatch(/You lifted [\d,]+ kg this week/);
    expect(text(zigi('hoeveel gewicht heb ik deze week getild'))).not.toContain('73.');
  });
  test('sleep over 90 days counts every night (more than 31), in Dutch for a year too (q3 #46)', () => {
    const en = text(zigi('how did I sleep the last 90 days')), nights = Number(/^(\d+) nights logged/.exec(en)?.[1]);
    expect(nights).toBeGreaterThan(31);
    expect(text(zigi('hoe heb ik dit jaar geslapen'))).toContain('dit jaar (do 1 jan t/m di 17 nov)');
  });
});

describe('Journal and habits', () => {
  test('why a habit was missed: the reason the person kept that day (q4 #32)', () => {
    const s = showcaseAll(), exercise = s.habits.habits.find(h => h.title === 'Exercise')!;
    s.habits = {...s.habits, habits: s.habits.habits.map(h => h.id !== exercise.id ? h : {...h, entries: [...h.entries.filter(e => e.date !== yesterday), {date: yesterday, count: 0, disposition: 'failed' as const, note: 'Too busy — rain', updatedAt: `${yesterday}T20:00:00.000Z`}]})};
    const en = text(zigi('Why did I miss Exercise yesterday?', s)), nl = text(zigi('Waarom heb ik Exercise gisteren gemist?', s));
    expect(en).toContain('“Too busy — rain”');
    expect(en).not.toContain('Your records do not say why');
    expect(nl).toContain('ma 16 nov: gemarkeerd als niet gedaan');
    // With no reason kept, the honest line stays.
    expect(text(zigi('Why did I miss Exercise yesterday?'))).toContain('Your records do not say why');
  });
  test('never missed twice beside the streak, when it is longer (q4 #23)', () => {
    const s = showcaseAll(), walk = s.habits.habits.find(h => h.title === 'Walk')!, gap = addLocalDays(DAY, -2);
    s.habits = {...s.habits, habits: s.habits.habits.map(h => h.id !== walk.id ? h : {...h, entries: h.entries.map(e => e.date === gap ? {...e, count: 0, disposition: 'failed' as const} : e)})};
    expect(text(zigi('streak for Walk', s))).toMatch(/Never missed twice in a row: \d+ days\./);
    expect(text(zigi('reeks voor Walk', s))).toMatch(/Nooit twee keer op rij gemist: \d+ dagen\./);
    // The Showcase's own streak is unbroken: nothing is added.
    expect(text(zigi('streak for Walk'))).not.toContain('Never missed twice');
  });
  test('the journal on NOVA without its Journal permission is not read (q4)', () => {
    const s = showcaseAll(), env = novaEnv({...s, journal: null});
    expect(text(localAnswer('how many good things did I write this month', env))).toContain('NOVA → Permissions');
    expect(text(nova('how many good things did I write this month'))).toContain('3 good things');
  });
  test('yesterday’s open habits are yesterday’s, never today’s (q4 #19)', () => {
    const s = showcaseAll(), exercise = s.habits.habits.find(h => h.title === 'Exercise')!;
    s.habits = {...s.habits, habits: s.habits.habits.map(h => h.id !== exercise.id ? h : {...h, entries: h.entries.filter(e => e.date !== yesterday)})};
    const en = text(zigi('Which habits did I leave open yesterday?', s));
    expect(en).toContain('Yesterday (Mon, Nov 16) 1 habit was left open: Exercise');
    expect(en).not.toContain('left today');
    expect(text(zigi('Welke gewoontes heb ik gisteren open gelaten?', s))).toContain('Gisteren (ma 16 nov) 1 gewoonte bleef open: Exercise');
  });
});

// Session AV (CI 1998, nova-stage-am:121; moved from the corpus, deliberate, equally strict): "show my habits this week"
// is ZIGi's on-device answer (q4 #30) and, on NOVA, the stage's habit-week widget, so the engine leaves it to NOVA's stage.
describe('the week of habits (q4 #30)', () => {
  test('ZIGi answers with each habit\'s days done this week, in English and Dutch; NOVA leaves it to its stage', () => {
    for (const q of ['show my habits this week', 'list my habits for this week', 'laat mijn gewoontes van deze week zien', 'toon mijn gewoontes deze week']) {
      const t = text(zigi(q));
      expect(t, q).toContain('Read'); expect(t, q).toContain('Exercise');
      expect(text(nova(q)), q).not.toMatch(/\d+ of \d+ (?:days|dagen)|van \d+ dagen/);
    }
  });
});

