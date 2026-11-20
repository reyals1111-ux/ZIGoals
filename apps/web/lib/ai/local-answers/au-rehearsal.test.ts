import {afterEach, describe, expect, test} from 'vitest';
import {noModelReply as _auNoModel} from './no-model';
import {addCustom} from '../../checklist/store';
import {emptyChecklist, type ChecklistDays} from '../../checklist/schema';
import {emptyDayGoal, setCurrentDayGoal} from '../../checklist/day-goal-core';
import {emptyDayEnds, setCurrentDayEnds} from '../../day-boundary-core';
import {createHabit, emptyHabitData, type HabitData} from '../../habits';
import {emptyPlatform, privateGoalSchema, type Platform} from '../../positions';
import {workoutsSchema, type Workouts} from '../../workouts/schema';
import {billsSchema} from '../../bills/schema';
import {moneyLogSchema} from '../../money-log/schema';
import type {EarnSnapshot} from '../../earn/snapshot';
import {ask, freshAll, novaEnv, zigiEnv} from '../evals/as/harness';
import {understand} from './exact/understand';
import {GOAL_ETA} from './exact/lexicon';
import {taskOverdue} from '../../nova/cards/ax/day-tasks';
import {tasksSchema} from '../../tasks/schema';
import type {MarketQuote} from '../../market-quotes';
import type {ToolSources} from '../tools/env';
import {HEALTH_CLOSED, HEALTH_CLOSED_NL} from '../tools/format';
import {ALLOW_HEALTH_CARD} from './nova-env';

/**
 * Session AU (dress rehearsal, docs/review/session-au/REHEARSAL.md R-1 … R-11): what five fresh personas asked NOVA and ZIGi
 * on a production build with no model, answered from their own records. The Showcase cases are in the AS corpus
 * (lib/ai/evals/as/cases-*.ts, id prefix `au-r`); these are the states the Showcase lacks — a fresh person's own records,
 * a night owl's day end, a Checklist rule, a bill whose price changed, Earn's measured rate — each with its own small fixture.
 */
const DAY = '2026-11-17';
const both = (sources: ToolSources, health = true) => ({nova: novaEnv(sources, undefined, health), zigi: zigiEnv(sources, health)});
afterEach(() => { setCurrentDayEnds(emptyDayEnds()); setCurrentDayGoal(emptyDayGoal()); });

// ---- fixtures ----
const CREATED = new Date('2026-09-01T06:00:00.000Z'), WATER_ID = '11111111-1111-4111-8111-111111111111';
const back = (n: number, today = DAY) => new Date(Date.parse(`${today}T12:00:00Z`) - n * 86_400_000).toISOString().slice(0, 10);
const stamp = (day: string, hour = 8) => `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`;
/**
 * Sanne (R-1, R-12): one habit, "Water drinken", started on 1 September; done every day from 20 October except Wednesday
 * 11 to Saturday 14 November (missed). Today (Tuesday 17 November) is still open: a run of 2 days now, the longest 22.
 */
function sanneHabits(): HabitData {
  const d = createHabit(emptyHabitData(), {title: 'Water drinken', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}}, CREATED, WATER_ID);
  const missed = new Set(['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']), days: string[] = [];
  for (let n = 1; back(n) >= '2026-10-20'; n++) if (!missed.has(back(n))) days.push(back(n));
  return {...d, timeZone: 'UTC', habits: d.habits.map(h => ({...h, entries: days.sort().map(date => ({date, count: 1, disposition: 'logged' as const, note: '', updatedAt: stamp(date, 20)}))}))} as HabitData;
}
const sanne = (): ToolSources => ({...freshAll(), habits: sanneHabits()});

/** Tom (R-2, R-3): a Push day today, an easy run on Monday (5 km in its set) and a GPX run on Sunday 15 November (last week, 7.5 km). Today's GPX run is 8.4 km. */
function tomWorkouts(): Workouts {
  const at = (day: string, h: number, m = 0) => `${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
  const run = (id: string, day: string, km: number) => ({id, name: 'Easy run', date: day, type: 'cardio', startedAt: at(day, 18), endedAt: at(day, 18, 30), exercises: [{id: `${id}-e`, exerciseId: 'running', name: 'Running', measure: 'distance-time', sets: [{id: `${id}-s`, kind: 'normal', distanceKm: km, seconds: 1800, done: true}]}]});
  const gpx = (id: string, day: string, km: number) => ({id, name: 'Morning run', date: day, type: 'cardio', startedAt: at(day, 7), endedAt: at(day, 7, 45), exercises: [], imported: {source: 'gpx', importId: `${id}-import`, sport: 'running', distanceKm: km, durationSeconds: 2700}});
  const push = {id: 'tom-push', name: 'Push day', date: DAY, type: 'strength', startedAt: at(DAY, 12), endedAt: at(DAY, 12, 50), exercises: [
    {id: 'tp-e0', exerciseId: 'bench-press', name: 'Bench press', measure: 'weight-reps', sets: [{id: 'tp-s0', kind: 'warmup', weightKg: 40, reps: 10, done: true}, {id: 'tp-s1', kind: 'normal', weightKg: 70, reps: 8, done: true}, {id: 'tp-s2', kind: 'normal', weightKg: 72.5, reps: 6, done: true}, {id: 'tp-s3', kind: 'normal', weightKg: 72.5, reps: 5, done: true}]},
    {id: 'tp-e1', exerciseId: 'overhead-press', name: 'Overhead press', measure: 'weight-reps', sets: [{id: 'tp-s4', kind: 'normal', weightKg: 40, reps: 8, done: true}, {id: 'tp-s5', kind: 'normal', weightKg: 42.5, reps: 6, done: true}]}]};
  return workoutsSchema.parse({version: 1, workouts: [gpx('tom-gpx-last', '2026-11-15', 7.5), run('tom-run-mon', '2026-11-16', 5), push, gpx('tom-gpx-today', DAY, 8.4)], templates: [], exercises: [], restSeconds: 90});
}
const tom = (): ToolSources => { const s = freshAll(); return {...s, ak: {...s.ak, workouts: tomWorkouts()}}; };

/** Max (R-4): a night owl whose day ends at 03:00, asking at 01:30 on Tuesday 24 November (UTC): his day is still Monday 23. */
const max = (): ToolSources => ({...freshAll(), now: new Date('2026-11-24T01:30:00.000Z'), habitDay: '2026-11-23', healthDay: '2026-11-23'});
/**
 * Max (R-5, R-14): four items on his Checklist and "A day counts as done at 3" since 1 November. This week (Monday 23 to his
 * today, Saturday 28): Mon 3 of 4 and Tue 4 of 4 count as done; Wed 0, Thu 2 and Fri 1 of 4 do not; today is 0 of 4 so far.
 */
function maxChecklist(): ToolSources {
  let record = emptyChecklist();
  ['Stretch', 'Read 10 pages', 'Plan tomorrow', 'Tidy desk'].forEach((label, i) => { record = addCustom(record, {label, colour: 'gold', section: 'anytime'}, {id: `ck_${i + 1}`, at: new Date(`2026-11-01T08:0${i}:00.000Z`)}); });
  const days: ChecklistDays = {version: 1, days: {'2026-11-23': {total: 4, done: 3}, '2026-11-24': {total: 4, done: 4}, '2026-11-25': {total: 4, done: 0}, '2026-11-26': {total: 4, done: 2}, '2026-11-27': {total: 4, done: 1}}};
  return {...freshAll(), now: new Date('2026-11-28T15:00:00.000Z'), habitDay: '2026-11-28', healthDay: '2026-11-28', checklist: {record, days, date: '2026-11-28', unreadable: false}};
}

/** Lina (R-6): a phone bill confirmed from the money log; its October payment was €17.50 after €15.00 in August and September. */
function lina(): ToolSources {
  const entry = (id: string, date: string, amount: string) => ({id, kind: 'expense', amount, currency: 'EUR', category: 'Phone', note: 'Fictional Phone', date, createdAt: stamp(date)});
  const moneyLog = moneyLogSchema.parse({version: 1, entries: [entry('ph-aug', '2026-08-15', '15.00'), entry('ph-sep', '2026-09-15', '15.00'), entry('ph-oct', '2026-10-15', '17.50')]});
  const bills = billsSchema.parse({version: 1, dismissed: [], bills: [{id: 'bill-phone', title: 'Fictional Phone', amount: '17.50', currency: 'EUR', cadence: 'monthly', nextDue: '2026-12-15', origin: 'detected', matchKey: 'EUR|Phone|fictional phone|monthly', category: 'Phone', createdAt: stamp('2026-10-16')}]});
  const s = freshAll();
  return {...s, moneyLog, ak: {...s.ak, bills}};
}

/** Jules (R-7 … R-10): nothing in Wealth, one goal named "First 0.01 BTC"; Earn read in this visit (the measured rate), or not. */
function jules(earn?: EarnSnapshot): ToolSources {
  const goal = privateGoalSchema.parse({id: '9', name: 'First 0.01 BTC', type: 'PROJECT', status: 'active', asset: 'BTC', denom: 'BTC', decimals: 8, target: '1000000', notes: '', createdAt: '2026-10-01T09:00:00.000Z', milestones: []});
  return {...freshAll(), platform: {...emptyPlatform(), goals: [goal]} as Platform, ...(earn ? {earn} : {})};
}
const EARN: EarnSnapshot = {families: {}, validators: [], disagree: false, updatedAt: '2026-11-17T18:40:00.000Z', figures: [
  {id: 'native-apr-measured', option: 'native-staking', label: 'Native staking: the measured figure, what Fictional Validator’s own stake earned over the last 10,000 blocks, at its 5% commission (APR)', value: '9.20%', source: 'ZIGChain mainnet (fictional test node)', asOf: '2026-11-17T18:40:00.000Z'},
  {id: 'native-unbonding', option: 'native-staking', label: 'Unbonding time on ZIGChain (how long unstaked ZIG stays locked)', value: '21 days', source: 'ZIGChain mainnet (fictional test node)', asOf: '2026-11-17T18:40:00.000Z'},
]};

/** Max (R-13): two open tasks at 01:30 on his Tuesday-by-the-calendar: one due Sunday, one due Monday (his today) at 22:00. */
function maxTasks(): ToolSources {
  const s = max(), task = (id: string, title: string, due: string, time?: string) => ({id, title, priority: 'normal', due, ...(time ? {time} : {}), createdAt: '2026-11-20T08:00:00.000Z'});
  return {...s, nova: {...s.nova!, tasks: tasksSchema.parse({version: 1, tasks: [task('task-a', 'Call the plumber', '2026-11-22'), task('task-b', 'Send the invoice', '2026-11-23', '22:00')]})}};
}
const text = (q: string, env: ReturnType<typeof novaEnv>) => ask(q, env).text;
const figuresIn = (t: string) => t.replace(/```[\s\S]*?```/g, '').match(/\d[\d.,]*/g) ?? [];

describe('R-1 and R-12 (Sanne): a habit named by its own word is the habit, in Dutch, whatever the Health gate', () => {
  test('R-1 "Wat is mijn reeks voor water drinken?": the habit\'s current and longest run, in Dutch', () => {
    for (const env of Object.values(both(sanne()))) {
      expect(text('Wat is mijn reeks voor water drinken?', env)).toBe('Water drinken: nu 2 dagen op rij; je langste reeks is 22 dagen.');
    }
  });
  test('R-12 "Welke dag heb ik mijn water gemist?": the missed days from the Habits journal, also with Health closed (never its refusal)', () => {
    for (const [name, env] of [...Object.entries(both(sanne())), ...Object.entries(both(sanne(), false)).map(([k, v]) => [`${k}, Health closed`, v] as const)]) {
      const nl = ask('Welke dag heb ik mijn water gemist?', env), en = ask('which day did I miss my water', env);
      expect(nl.kind, name).toBe('answer');
      expect(nl.text, name).toBe('Water drinken: gemist op 4 dagen deze maand (Sun, Nov 1 t/m Tue, Nov 17): Wed, Nov 11, Thu, Nov 12, Fri, Nov 13 en Sat, Nov 14. Vandaag staat nog open.');
      expect(en.text, name).toBe('Water drinken: missed on 4 days this month (Sun, Nov 1 to Tue, Nov 17): Wed, Nov 11, Thu, Nov 12, Fri, Nov 13 and Sat, Nov 14. Today is still open.');
      expect(nl.facts, name).toMatchObject({ask: 'missed', dates: {missed: ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14']}});
    }
  });
  test('the measure\'s own target still reads Health ("did I miss my water goal"), so a closed gate is still closed there', () => {
    expect(ask('which days did I miss my water goal this month', zigiEnv(sanne(), false)).kind).toBe('refusal');
  });
});

describe('R-2 and R-3 (Tom): what was lifted and how far was run, from the workout log; Health closed is its own reply', () => {
  test('open: today\'s exercises with their working sets and top weight; the week\'s run distance, a GPX import included', () => {
    for (const env of Object.values(both(tom()))) {
      expect(text('What did I lift today?', env)).toBe('Lifted today (Tue, Nov 17): Push day — Bench press 3 sets, top 72.5 kg × 6; Overhead press 2 sets, top 42.5 kg × 6.');
      expect(text('Wat heb ik vandaag getild?', env)).toBe('Getild vandaag (Tue, Nov 17): Push day — Bench press 3 sets, zwaarst 72.5 kg × 6; Overhead press 2 sets, zwaarst 42.5 kg × 6.');
      const week = ask('How far did I run this week?', env);
      expect(week.text).toBe('You ran 13.4 km this week (Mon, Nov 16 to Tue, Nov 17), in 2 runs: 5 km on Mon, Nov 16 and 8.4 km on Tue, Nov 17.');
      expect(week.facts).toMatchObject({km: 13.4, count: 2, workouts: [{day: '2026-11-16', km: 5, imported: false}, {day: '2026-11-17', km: 8.4, imported: true}]});
      expect(text('Hoe ver heb ik deze week hardgelopen?', env)).toBe('Je liep 13.4 km deze week (Mon, Nov 16 t/m Tue, Nov 17), in 2 loopjes: 5 km op Mon, Nov 16 en 8.4 km op Tue, Nov 17.');
      expect(text('how far did I run last week', env)).toBe('You ran 7.5 km last week (Mon, Nov 9 to Sun, Nov 15), in 1 run: 7.5 km on Sun, Nov 15.');
    }
  });
  test('closed: ZIGi gives the Health-closed reply with its one button (in the question\'s language), NOVA names NOVA → Permissions; no workout figure is said', () => {
    const shut = both(tom(), false);
    for (const q of ['What did I lift today?', 'How far did I run this week?']) {
      const z = ask(q, shut.zigi), n = ask(q, shut.nova);
      expect(z.kind).toBe('refusal'); expect(z.text).toBe(HEALTH_CLOSED + ALLOW_HEALTH_CARD);
      expect(n.kind).toBe('refusal'); expect(n.text).toContain('NOVA → Permissions');
      for (const t of [z.text, n.text]) for (const figure of ['72.5', '42.5', '13.4', '8.4']) expect(t).not.toContain(figure);
    }
    expect(text('Hoe ver heb ik deze week hardgelopen?', shut.zigi)).toBe(HEALTH_CLOSED_NL + ALLOW_HEALTH_CARD);
  });
});

describe('R-4 (Max): today by the person\'s own day end', () => {
  test('at 01:30 with the day ending at 03:00: still Monday, and why', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    for (const env of Object.values(both(max()))) {
      expect(text('What day is it?', env)).toBe('It\'s Monday, Nov 23 for you: your day ends at 03:00 (the calendar already says Tuesday).');
      expect(text('what\'s the date', env)).toBe('It\'s Monday, Nov 23 for you: your day ends at 03:00 (the calendar already says Tuesday).');
      expect(text('Welke dag is het?', env)).toBe('Voor jou is het maandag, Nov 23: je dag eindigt om 03:00 (de kalender zegt al dinsdag).');
    }
  });
  test('a day that ends at midnight: the plain date', () => {
    const env = novaEnv({...max(), habitDay: '2026-11-24', healthDay: '2026-11-24'});
    expect(text('What day is it?', env)).toBe('It\'s Tuesday, Nov 24.');
    expect(text('Welke datum is het vandaag?', env)).toBe('Het is dinsdag, Nov 24.');
  });
});

describe('R-5 and R-14 (Max): the Checklist\'s days under his own "A day counts as done at 3"', () => {
  test('with the rule: 2 of 5 earlier days done, 3 not done (Wed to Fri); today (Saturday) in progress, never missed; the app\'s day words', () => {
    setCurrentDayGoal({version: 1, changes: [{from: '2026-11-01', need: 3}]});
    for (const env of Object.values(both(maxChecklist()))) {
      const a = ask('How many days this week did I finish my checklist?', env);
      expect(a.text).toBe('This week on your Checklist (Mon, Nov 23 to today, Sat, Nov 28), a day counts as done at 3 dots (your rule): done on 2 of 5 days: Mon, Nov 23 (3 of 4) and Tue, Nov 24 (4 of 4, every dot); not done on 3: Wed, Nov 25 (0 of 4), Thu, Nov 26 (2 of 4) and Fri, Nov 27 (1 of 4). Today is still in progress: 0 of 4 so far.');
      expect(a.facts).toMatchObject({dayGoal: 3, done: ['2026-11-23', '2026-11-24'], notDone: ['2026-11-25', '2026-11-26', '2026-11-27'], everyDot: ['2026-11-24'], today: {counts: false}});
      expect(a.text).not.toMatch(/\b11-2\d\b|0 perfect orbits/);
      expect(text('which days this week did I not finish my checklist', env)).toBe(a.text);
      expect(text('Hoeveel dagen heb ik deze week mijn checklist afgemaakt?', env)).toBe('Deze week op je Checklist (Mon, Nov 23 t/m vandaag, Sat, Nov 28), een dag telt als gedaan bij 3 stippen (jouw regel): gedaan op 2 van 5 dagen: Mon, Nov 23 (3 van 4) en Tue, Nov 24 (4 van 4, elke stip); niet gedaan op 3: Wed, Nov 25 (0 van 4), Thu, Nov 26 (2 van 4) en Fri, Nov 27 (1 van 4). Vandaag loopt nog: 0 van 4 tot nu toe.');
    }
  });
  test('without a rule every dot counts: Tuesday alone; the week\'s orbit question gets the same answer (l7-fourth\'s "This week on your Checklist")', () => {
    const env = novaEnv(maxChecklist()), a = text('How am I doing on my orbit this week?', env);
    expect(a).toBe('This week on your Checklist (Mon, Nov 23 to today, Sat, Nov 28), a day counts as done when every dot is lit: done on 1 of 5 days: Tue, Nov 24 (4 of 4, every dot); not done on 4: Mon, Nov 23 (3 of 4), Wed, Nov 25 (0 of 4), Thu, Nov 26 (2 of 4) and Fri, Nov 27 (1 of 4). Today is still in progress: 0 of 4 so far.');
  });
});

describe('R-13 (Max): the overdue tasks in words are the Overdue widget\'s own set', () => {
  test('at 01:30 of his Monday, a task due Monday 22:00 is late on the widget and in the answer alike (2 of 2)', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    const src = maxTasks(), widget = taskOverdue(src.nova!.tasks!, '2026-11-23', '23:59');
    expect(widget.rows.map(r => r.label)).toEqual(['Call the plumber', 'Send the invoice']);
    for (const env of Object.values(both(src))) {
      const a = ask('What tasks are overdue?', env);
      expect(a.text).toMatch(/^2 tasks are overdue: /);
      for (const r of widget.rows) expect(a.text).toContain(r.label);
    }
  });
  test('on a day that ends at midnight a timed task turns late only after its time (unchanged)', () => {
    const src = {...maxTasks(), now: new Date('2026-11-23T20:00:00.000Z')};
    expect(text('What tasks are overdue?', zigiEnv(src))).toMatch(/^1 task is overdue: Call the plumber/);
  });
});

describe('R-6 (Lina): a bill\'s price change, from the Bills page\'s own notice', () => {
  test('the phone bill went up; EN and NL; ZIGi and NOVA alike', () => {
    for (const env of Object.values(both(lina()))) {
      const a = ask('Did any bill go up in price?', env);
      expect(a.text).toBe('Fictional Phone went up from €15.00 to €17.50 since Sep 2026. From their payments in your money log, as Bills → Price changes shows them.');
      expect(a.facts).toMatchObject({changes: [{bill: 'Fictional Phone', direction: 'up', previousCents: 1500, latestCents: 1750, currency: 'EUR', latestDate: '2026-10-15'}]});
      expect(text('Is een rekening duurder geworden?', env)).toBe('Fictional Phone ging omhoog van €15.00 naar €17.50 sinds Sep 2026. Uit de betalingen in je geldlog, zoals Bills → Price changes ze toont.');
    }
  });
});

describe('R-7 … R-10 (Jules): prices, staking and holdings, never invented, never advice', () => {
  test('R-7 a coin\'s price is not the holdings: none on this device is said plainly, with Markets to open; no figure', () => {
    for (const env of Object.values(both(jules()))) {
      const a = ask('What is bitcoin worth today?', env);
      expect(a.text).toMatch(/^BTC is not tracked in Wealth or Portfolio and no BTC price has reached Markets on this device, so I give none: I read prices only where the app already has them\./);
      expect(a.text).toContain('{"kind":"open-page","page":"markets"}');
      expect(a.text).not.toContain('Nothing is tracked on Wealth');
      expect(figuresIn(a.text)).toEqual([]);
    }
  });
  test('R-7 with a price the app has read: that price, its source and its time', () => {
    const quote = {base: {network: 'bitcoin', denom: 'btc', decimals: 8}, currency: 'USD', price: '6512345', priceDecimals: 2, source: 'CoinGecko (fixture)', providerAssetId: 'bitcoin', observedAt: '2026-11-17T18:55:00.000Z', verification: 'VERIFIED'} as MarketQuote;
    const a = text('What is bitcoin worth today?', zigiEnv({...jules(), quotes: [quote]}));
    expect(a).toContain('Markets: 65,123.5 USD per BTC (CoinGecko (fixture), 2026-11-17 18:55 UTC');
  });
  test('R-8 no measured rate read: no number at all, Earn to open; with Earn\'s measured rate: an estimate, labelled, with its source and as-of', () => {
    const none = text('What would I earn if I staked 100 ZIG?', zigiEnv(jules()));
    expect(none).toMatch(/^ZIGi has not read a measured rate from Earn in this visit, so I give no figure/);
    expect(none).toContain('not a promise');
    expect(none).toContain('{"kind":"open-page","page":"earn"}');
    expect(figuresIn(none).filter(f => f !== '100')).toEqual([]);
    expect(none).not.toMatch(/income/i);
    const est = ask('What would I earn if I staked 100 ZIG?', zigiEnv(jules(EARN)));
    expect(est.text).toMatch(/^An estimate, not a promise: at the measured rate Earn read, 100 ZIG would earn about 9\.2 ZIG over a year if nothing changed\./);
    expect(est.text).toContain('9.20% (source: ZIGChain mainnet (fictional test node), as of 2026-11-17 18:40 UTC)');
    expect(est.tools).toEqual(['earn_rates']);
    expect(text('Wat zou ik verdienen als ik 100 ZIG stake?', novaEnv(jules(EARN)))).toMatch(/^Een schatting, geen belofte: tegen het gemeten rendement dat Earn las, zou 100 ZIG in een jaar ongeveer 9\.2 ZIG opleveren/);
  });
  test('R-9 "How much BTC do I have?" with a goal named "First 0.01 BTC": the holdings first, the goal after, in EN and NL', () => {
    for (const env of Object.values(both(jules()))) {
      const en = text('How much BTC do I have?', env), nl = text('Hoeveel BTC heb ik?', env);
      expect(en).toBe('You have no BTC recorded in Wealth, so there is no amount to show.\n- To track it: Wealth → + Add asset → Crypto, then BTC and the amount you hold\n- Your goal First 0.01 BTC is a goal, not a holding: Goals shows its progress');
      expect(nl).toBe('Je hebt geen BTC vastgelegd in Wealth, dus er is geen hoeveelheid te tonen.\n- Om het bij te houden: Wealth → + Add asset → Crypto, dan BTC en de hoeveelheid die je hebt\n- Je doel First 0.01 BTC is een doel, geen bezit: Goals toont de voortgang');
    }
  });
  test('R-10 "Is staking ZIG safe?": the facts, the Earn figures read, never advice', () => {
    const a = text('Is staking ZIG safe?', zigiEnv(jules(EARN)));
    for (const fact of ['stays in your own account', 'only your signature moves it', 'slashed', 'unbonding', 'unaudited Alpha', 'never holds your keys', 'Whether it is right for you is your call.', 'Unbonding time on ZIGChain (how long unstaked ZIG stays locked): 21 days (source: ', 'Explained by ZIGoals · not advice']) expect(a).toContain(fact);
    expect(a).not.toMatch(/\b(?:you should|we recommend|safe to stake|guaranteed)\b/i);
    expect(text('Is staken van ZIG veilig?', novaEnv(jules()))).toMatch(/^De feiten, geen advies: gestakete ZIG blijft in je eigen account/);
  });
});

describe('R-11: the goal-ETA reading never claims a question whose subject is a bill, a task, a habit or a day', () => {
  const records = {today: DAY, habits: [{id: 'h1', title: 'Read'}], goals: [{id: 'g1', name: 'Emergency fund'}, {id: 'g2', name: 'Next bill buffer'}], categories: [], bills: [{id: 'b1', title: 'Rent'}]};
  test('"when will my next bill be due" is the next bill', () => {
    expect(understand('when will my next bill be due', records)).toMatchObject({domain: 'bills', ask: 'next'});
    expect(understand('when will my rent be due', records)).toMatchObject({domain: 'bills'});
  });
  test('a task, a habit or a day is never read as a goal\'s pace', () => {
    for (const q of ['when will my task be done', 'when will my habit streak be done', 'when will my day be over', 'when will my next bill be done', 'when will the rent be paid']) {
      const read = understand(q, records);
      expect(read?.domain ?? null, q).not.toBe('goals');
    }
  });
  test('a goal by its own name keeps its pace answer, even when its name holds such a word', () => {
    expect(GOAL_ETA.test('when will i reach my emergency fund')).toBe(true);
    expect(understand('when will I reach my emergency fund', records)).toMatchObject({domain: 'goals', subject: {name: 'Emergency fund'}});
    expect(understand('when will I reach my next bill buffer', records)).toMatchObject({domain: 'goals', subject: {name: 'Next bill buffer'}});
  });
  test('the older goal lookup says no "No goal is called" for a bill', () => {
    for (const env of Object.values(both(lina()))) {
      const a = text('when will my next bill be due', env);
      expect(a).toBe('Next bill: Fictional Phone €17.50, in 28 days (Tue, Dec 15).');
      expect(a).not.toContain('No goal is called');
    }
  });
});

// Session AU (ADR-044 T-12): a request or a question is never a food card; a line of things eaten still is.
describe('T-12: requests are not food', () => {
  test('"Show my day at a glance" and "what am I looking at" make no Log a food card; "a banana and 500 ml water" still does', () => {
    const env = zigiEnv(freshAll(), false);
    for (const q of ['Show my day at a glance', 'what am I looking at', 'Toon mijn dag']) expect(_auNoModel(q, env).text, q).not.toContain('log-food');
    expect(_auNoModel('a banana and 500 ml water', env).text).toContain('log-food');
  });
});
