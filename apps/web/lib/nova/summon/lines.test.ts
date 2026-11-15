import {describe, expect, it} from 'vitest';
import {emptyAccounts} from '../../accounts/schema';
import {emptyBills} from '../../bills/schema';
import {gatesFor, showcaseSources} from '../../ai/tools/fixtures';
import {readAkToolSources} from '../../ai/tools/ak-sources';
import {readNovaToolSources} from '../../ai/tools/nova-sources';
import type {ToolSources} from '../../ai/tools/env';
import {UNMATCHED_EN} from '../../ai/local-answers/al-fifth';
import {DEFAULT_NOVA_SCOPES} from '../../ai/context-pack/nova';
import {emptyHabitData} from '../../habits';
import {createEmptyHealth} from '../../health';
import {emptyJournal} from '../../journal/schema';
import {emptyMoneyLog} from '../../money-log/schema';
import {emptyPlatform} from '../../positions';
import {buildShowcase} from '../../showcase-data';
import {formatCurrencyAmount, formatProgressPercent} from '../../visual-format';
import {wealthOverview} from '../../wealth';
import {emptyWorkouts, workoutsSchema, WORKOUTS_KEY} from '../../workouts/schema';
import {billsCard} from '../cards/bills';
import {focusGoal} from '../cards/goal-focus';
import {habitWeek} from '../cards/habit-week';
import {journalMonth} from '../cards/journal';
import {netWorthCard} from '../cards/net-worth';
import {spendingCard} from '../cards/spending';
import {weightCard} from '../cards/weight';
import {wealthHud} from '../holo/wealth';
import {novaLocalEnv} from '../local-env';
import {WIDGETS, widgetSpec} from '../widgets/catalog';
import {WEATHER_OFF_WORDS, WEATHER_PLACE_WORDS} from '../world/ask';
import {showcaseReading, SHOWCASE_PLACE} from '../world/showcase';
import {engineLook, replyLook} from './engine-look';
import {lineData, lockedLine, plainName, seesCount, stageLine, stageLines, type LineData} from './lines';
import {FAMILIES, isLogLine, replyWidgets, stageOwns, summonFor} from './summon';
import {answerWords, announceMade, commandAskWords, keptAskWords, lineWords, madeWords, sentenceCut, stageAnswerText} from './words';

/**
 * Session AM (design review AM-D2, AM-D3, AM-D12, AM-D13, AM-D22, AM-D26, AM-D32): the widgets' one-line figure
 * summaries, and the lead's rule that the engine comes first. Records: the Showcase's own (fictional), and an empty profile.
 */
const DAY = '2026-11-11', NOW = new Date(`${DAY}T14:05:00Z`);
const RECORDS = buildShowcase(DAY, 'UTC').records, get = {getItem: (k: string) => RECORDS[k] ?? null};
const showcase = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get)});
const empty = (): ToolSources => ({...showcaseSources(DAY), now: NOW, habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), accounts: emptyAccounts(), moneyLog: emptyMoneyLog(), journal: emptyJournal(), fasting: null, weekly: null, energy: null, chess: null, ak: {bills: emptyBills()}, nova: {}, showcase: false});
const OPEN = () => true, SHUT = () => false;
const weather = {kind: 'live' as const, place: SHOWCASE_PLACE.name, reading: showcaseReading(DAY), example: true};
const extras = {workouts: workoutsSchema.parse(JSON.parse(RECORDS[WORKOUTS_KEY]!)), weather, brain: {kind: 'none', words: 'On-device answers'}, sees: seesCount(DEFAULT_NOVA_SCOPES, {today: true, goals: true, habits: true, health: true, wealth: true}, false, false), asks: [{text: 'Show my habits this week'}, {text: 'What’s the weather?'}]};
const SOURCES = showcase(), BUILT = lineData(SOURCES, OPEN, extras)!;
/** The Showcase's line data, built once (its selectors are the widgets' own; only the switch differs per test). */
const data = (gate: (id: string) => boolean = OPEN): LineData => ({...BUILT, gateOpen: gate});
const blank = (): LineData => lineData(empty(), OPEN, {workouts: emptyWorkouts(), weather: {kind: 'off'}, brain: {kind: 'none', words: ''}, asks: []})!;
const line = (id: string, params?: Parameters<typeof stageLine>[1], lang: 'en' | 'nl' = 'en', d = data()) => stageLine(id, params, d, lang, NOW);
/** Every widget the summon step can make: its families' widgets and one goal's own. */
const SUMMONED = [...new Set([...FAMILIES.map(f => f.id), 'goal-focus'])];

describe('a stage line is the widget’s own figures, in one short line', () => {
  it('weight: the hero and the change are the selector’s own words', () => {
    const d = data(), card = weightCard(d.health!, d.healthDay, 'month');
    expect(card.latest && card.change).toBeTruthy();
    expect(line('weight', {range: 'month'})).toBe(`${card.latest!.text}, ${card.change!.text}.`);
    expect(line('weight', {range: 'month'})).toMatch(/^\d+(\.\d+)? kg, ((down|up) \d+(\.\d+)? kg|no change) since [A-Za-z0-9 ]+\.$/);
    expect(line('weight', {range: 'month'}, 'nl')).toMatch(new RegExp(`^${card.latest!.text.replace('.', '\\.')}, .+ (lager|hoger) dan op |geen verandering sinds `));
  });
  it('habits this week: done of due today and the longest streak, as the widget counts them', () => {
    const d = data(), w = habitWeek(d.habits!, d.day);
    expect(w.due).toBeGreaterThan(0); expect(w.longest).not.toBeNull();
    expect(line('habit-week')).toBe(`${w.done} of ${w.due} habits done today; longest streak ${w.longest!.streak} ${w.longest!.unit}.`);
    expect(line('habit-week', undefined, 'nl')).toBe(`${w.done} van ${w.due} gewoontes vandaag gedaan; langste reeks ${w.longest!.streak} dagen.`);
  });
  it('journal: the days written this month (AM-D3: the question the fallback could not answer)', () => {
    const d = data(), m = journalMonth(d.journal!, d.day);
    expect(m.entries).toBeGreaterThan(0);
    expect(line('journal')).toMatch(new RegExp(`^${m.daysWritten} days? written this month`));
  });
  it('tracked wealth: the hero’s own amount (AM-D13), and it says accounts and debts are not in it', () => {
    const s = showcase(), hud = wealthHud(wealthOverview(s.platform, NOW.getTime(), [])), card = netWorthCard(hud, DAY, 'quarter');
    const text = line('net-worth', {range: 'quarter'})!;
    expect(card.total).not.toBeNull();
    expect(text.startsWith('Tracked wealth ')).toBe(true);
    // One figure: the line's amount is the card's total, which is the line chart's last point.
    const digits = (cents: bigint) => (Number(cents) / 100).toLocaleString('en-US', {minimumFractionDigits: 2});
    expect(text).toContain(digits(card.total!));
    expect(card.points.at(-1)!.cents).toBe(card.total);
    expect(text).toMatch(/ Accounts and debts are not in this figure\.$/);
    expect(text).not.toMatch(/net worth/i);
    expect(widgetSpec('net-worth')!.title).toBe('Tracked wealth');
  });
  it('spending: one range in the line and the widget; the month asked is this calendar month (AM-D13)', () => {
    const d = data(), month = spendingCard(d.moneyLog!, d.day);
    expect(month.state).toBe('live');
    expect(line('spending')).toMatch(new RegExp(`^${month.total.replace(/[.$]/g, '\\$&')} spent this month; most on `));
    expect(line('spending', {range: 'month'})).toBe(line('spending'));
    expect(line('spending', {range: 'quarter'})).toContain('spent in the last 90 days');
  });
  it('goal: the same whole percent as the ring (AM-D13), the saved amount, the plan’s verdict; no forecast is promised', () => {
    const d = data(), goal = focusGoal(d.goals!.summaries, d.goals!.arcs, undefined, d.goals!.leadHref)!;
    const text = line('goal-focus')!;
    expect(text).toContain(`: ${goal.text}`);
    expect(goal.text).toBe(goal.figure);
    expect(text).not.toMatch(/\d\.\d+\s?%/); // never "41.66 %"
    expect(text).not.toMatch(/will|by \w+ \d|at this pace/i);
    expect(formatProgressPercent('41.66', false)).toBe('42%');
    expect(line('goals-hud')).toMatch(/^\d+ active goals?; .+ is at (At least )?\d+%, /);
  });
  it('bills: the next bill without the Showcase suffix inside its name (AM-D32)', () => {
    const d = data(), next = billsCard(d.bills!, d.day).next!;
    expect(next.title).toMatch(/SHOWCASE DATA/);
    const text = line('bills')!;
    expect(text).toMatch(/^Next bill: /);
    expect(text).toContain(next.amount);
    expect(plainName('Rent · SHOWCASE DATA')).toBe('Rent');
    expect(plainName('Home insurance · SHOWCASE DATA')).toBe('Home insurance');
    expect(plainName('Showcase rent')).toBe('Showcase rent');
    for (const id of SUMMONED) for (const lang of ['en', 'nl'] as const) expect(line(id, undefined, lang) ?? '', `${id} ${lang}`).not.toMatch(/SHOWCASE DATA/i);
  });
  it('the world and NOVA itself: the sun, the weather as an example in the Showcase, the brain, what NOVA sees, the requests, the time', () => {
    expect(line('sun')).toMatch(/^Showcase example, not a real reading: Sunrise \d{2}:\d{2}, sunset \d{2}:\d{2}; \d+ h \d{2} min of daylight\.$/);
    expect(line('weather')).toMatch(/^Showcase example, not a real reading: -?\d+°(, [a-z ]+)?\. The forecast /);
    expect(line('weather', undefined, 'nl')).toMatch(/^Showcase-voorbeeld, geen echte meting: /);
    expect(stageLine('weather', undefined, {...data(), weather: {kind: 'off'}}, 'en', NOW)).toBe(WEATHER_OFF_WORDS.en);
    expect(stageLine('sun', undefined, {...data(), weather: {kind: 'off'}}, 'nl', NOW)).toBe(WEATHER_OFF_WORDS.nl);
    expect(stageLine('weather', undefined, {...data(), weather: {kind: 'no-place'}}, 'en', NOW)).toBe(WEATHER_PLACE_WORDS.en);
    expect(line('nova-brain')).toBe('On-device answers; no AI connected.');
    expect(line('nova-brain', undefined, 'nl')).toBe('Antwoorden op dit apparaat; geen AI verbonden.');
    expect(stageLine('nova-brain', undefined, {...data(), brain: {kind: 'local', words: 'Local · llama3'}}, 'en', NOW)).toBe('Answering now: Local · llama3.');
    expect(line('nova-sees')).toBe('5 of 8 parts of your life are open to NOVA; weather (outside data) is off.');
    expect(line('requests')).toBe('2 requests kept; the last was “Show my habits this week”.');
    expect(line('time')).toMatch(/^It is .+; \d+ (h|min) left today, \d+ days left this year\.$/);
  });
  it('every line is short: at most two sentences, no list, no record text, whole percents, in English and Dutch', () => {
    for (const id of SUMMONED) for (const lang of ['en', 'nl'] as const) {
      const text = line(id, undefined, lang);
      if (text === null) continue;
      expect(text, id).not.toMatch(/[•\n]|\b\d{4}-\d{2}-\d{2}\b|\b\d+\.\d{2} (EUR|USD)\b|\d\.\d+\s?%/);
      expect(text.length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(190);
      expect((text.match(/[.!?](\s|$)/g) ?? []).length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(2);
      expect(text, id).toMatch(/[.!?]$/);
    }
    // The made widgets and the HUDs the families map to all speak with the Showcase's records. The rest are named, as
    // before ("On the stage: …"): a day's panels a sentence does not hold, and the notes, which are not read without NOVA's Notes permission.
    const silent = SUMMONED.filter(id => line(id) === null);
    expect(silent.sort()).toEqual(['agenda-clock', 'briefs', 'focus', 'glance', 'markets', 'next', 'notes', 'now-playing', 'orbit']);
    for (const id of WIDGETS.filter(w => w.made).map(w => w.id)) expect(line(id), id).not.toBeNull();
  });
});

describe('a line is held back by the widget’s own switch', () => {
  it('a closed switch gives the locked sentence, never a figure, in both languages', () => {
    const shut = data(SHUT);
    expect(stageLine('weight', {range: 'month'}, shut, 'en', NOW)).toBe('Health is off for NOVA. Turn it on in Permissions to see this.');
    expect(stageLine('weight', {range: 'month'}, shut, 'nl', NOW)).toBe('Gezondheid staat uit voor NOVA. Zet het aan bij Permissions om dit te zien.');
    for (const w of WIDGETS.filter(x => x.gate)) for (const lang of ['en', 'nl'] as const) {
      const text = stageLine(w.id, undefined, shut, lang, NOW);
      expect(text, w.id).toBe(lockedLine(w.gate!, lang));
      expect(text, w.id).not.toMatch(/\d/);
    }
    // Only the closed one is locked: Health off, Habits on.
    const healthOff = data(id => widgetSpec(id)?.gate !== 'health');
    expect(stageLine('steps', undefined, healthOff, 'en', NOW)).toBe(lockedLine('health', 'en'));
    expect(stageLine('habit-week', undefined, healthOff, 'en', NOW)).toMatch(/habits done today/);
    // A widget with no switch (the clock, NOVA's own state) still speaks.
    expect(stageLine('time', undefined, shut, 'en', NOW)).toMatch(/^It is /);
  });
  it('records that were not read give no line (never a zero), and no sources give no lines at all', () => {
    expect(lineData(null, OPEN)).toBeNull();
    expect(stageLines([{id: 'weight'}], null, 'en', NOW)).toEqual({});
    const unread: LineData = {gateOpen: OPEN, day: DAY, healthDay: DAY};
    for (const id of SUMMONED.filter(x => x !== 'time')) expect(stageLine(id, undefined, unread, 'en', NOW), id).toBeNull();
    expect(stageLine('no-such-widget', undefined, data(), 'en', NOW)).toBeNull();
  });
});

describe('unknown is not zero: an empty profile teaches (AM-D22)', () => {
  it('says what is missing, in words, with no figure', () => {
    const d = blank(), say = (id: string, lang: 'en' | 'nl' = 'en') => stageLine(id, undefined, d, lang, NOW);
    expect(say('goal-pace')).toBe('You have no goals yet.');
    expect(say('goals-hud')).toBe('You have no goals yet.');
    expect(say('goal-focus')).toBe('You have no goals yet.');
    expect(say('goal-focus', 'nl')).toBe('Je hebt nog geen doelen.');
    expect(say('habit-week')).toBe('You have no habits yet.');
    expect(say('weight')).toBe('No weight logged yet.');
    expect(say('steps')).toBe('No steps logged yet.');
    expect(say('workouts')).toBe('No workouts logged yet.');
    expect(say('journal')).toBe('No journal entries yet.');
    expect(say('net-worth')).toBe('Nothing is tracked on Wealth yet.');
    expect(say('spending')).toBe('No spending logged yet.');
    expect(say('bills')).toBe('No bill reminders yet.');
    expect(say('requests')).toBe('Nothing asked yet.');
    for (const id of ['goal-pace', 'habit-week', 'weight', 'steps', 'workouts', 'journal', 'net-worth', 'spending', 'bills']) for (const lang of ['en', 'nl'] as const) expect(say(id, lang), id).not.toMatch(/\d/);
  });
});

describe('the words NOVA says with a line', () => {
  const lines = {'habit-week': '4 of 7 habits done today; longest streak 27 days.', weight: '81.4 kg, down 1.2 kg since 12 Oct.', weather: 'Weather is off. Turn it on.', 'net-worth': 'Tracked wealth $501,800.00.'};
  it('the answer is the widget’s title and its line; a line that names itself stands alone; no line falls back to "On the stage"', () => {
    expect(answerWords([{id: 'habit-week'}], lines, 'en')).toBe('Habits this week: 4 of 7 habits done today; longest streak 27 days.');
    expect(answerWords([{id: 'weight', params: {range: 'month'}}], lines, 'en')).toBe('Weight · the last 30 days: 81.4 kg, down 1.2 kg since 12 Oct.');
    expect(answerWords([{id: 'weight', params: {range: 'month'}}], lines, 'nl')).toBe('Gewicht · de afgelopen 30 dagen: 81.4 kg, down 1.2 kg since 12 Oct.');
    expect(answerWords([{id: 'weather'}], lines, 'en')).toBe('Weather is off. Turn it on.');
    expect(answerWords([{id: 'net-worth'}], lines, 'en')).toBe('Tracked wealth $501,800.00.');
    expect(answerWords([{id: 'spending', params: {range: 'month'}}], {spending: '€348.19 spent this month.'}, 'en')).toBe('Spending · this month: €348.19 spent this month.');
    expect(answerWords([{id: 'glance'}], lines, 'en')).toBe(madeWords([{id: 'glance'}], 'en'));
    expect(answerWords([{id: 'habit-week'}, {id: 'glance'}], lines, 'en')).toBe('Habits this week: 4 of 7 habits done today; longest streak 27 days. On the stage: Day at a glance.');
    // Two widgets speak at most (the card under the star stays short).
    expect(answerWords([{id: 'habit-week'}, {id: 'weight'}, {id: 'net-worth'}], lines, 'en')).toBe('Habits this week: 4 of 7 habits done today; longest streak 27 days. Weight: 81.4 kg, down 1.2 kg since 12 Oct.');
  });
  it('the polite announcement carries the figure', () => {
    expect(announceMade([{id: 'weight', params: {range: 'month'}}], 3, lines)).toBe('Weight · the last 30 days is on the stage: 81.4 kg, down 1.2 kg since 12 Oct. 3 widgets on the stage.');
    expect(announceMade([{id: 'habit-week'}, {id: 'weight'}], 2, lines)).toBe('Added: Habits this week and Weight. Habits this week: 4 of 7 habits done today; longest streak 27 days. Weight: 81.4 kg, down 1.2 kg since 12 Oct. 2 widgets on the stage.');
    expect(announceMade([{id: 'glance'}], 1, lines)).toBe('Added: Day at a glance. 1 widget on the stage.');
  });
  it('a phone gets the lines alone, only when every widget of the request has one (AM-D26)', () => {
    expect(lineWords([{id: 'habit-week'}], lines, 'en')).toBe('Habits this week: 4 of 7 habits done today; longest streak 27 days.');
    expect(lineWords([{id: 'habit-week'}, {id: 'glance'}], lines, 'en')).toBe('');
    expect(lineWords([], lines, 'en')).toBe('');
    expect(lineWords([{id: 'habit-week'}], lines, 'en')).not.toMatch(/stage|•/);
  });
  it('a reply with no widget is cut at a sentence end: two sentences at most, no list, never mid-word (AM-D12)', () => {
    expect(sentenceCut('One. Two. Three.')).toBe('One. Two.');
    expect(sentenceCut('4 bill reminders; next due:\n• Rent · SHOWCASE DATA: 2026-12-01, 950.00 EUR (monthly)\n• Energy: 2026-12-02, 120.00 EUR')).toBe('4 bill reminders; next due:');
    const long = sentenceCut(`${'word '.repeat(80)}end.`);
    expect(long.length).toBeLessThanOrEqual(220); expect(long).toMatch(/word…$/);
    expect(sentenceCut('Opening Goals.')).toBe('Opening Goals.');
    expect(sentenceCut('')).toBe('');
  });
  it('a stage command is kept in the stage’s own words, never the person’s (AM-S5, second pass)', () => {
    const typed = 'sluit gewicht, ik woog 82,4', plan = summonFor(typed);
    expect(plan.command).toEqual({kind: 'close', id: 'weight'});
    const kept = keptAskWords(commandAskWords(plan.command!), [{id: 'weight'}]);
    expect(commandAskWords(plan.command!)).toBe('Close: Weight');
    expect(kept).toBe('Health: Weight');
    expect(kept).not.toMatch(/\d|woog|ik/);
    expect(commandAskWords({kind: 'pin', id: 'net-worth'})).toBe('Pin: Tracked wealth');
    expect(commandAskWords({kind: 'hide', id: 'weather'})).toBe('Hide: Weather');
    expect(commandAskWords({kind: 'unpin', id: 'tasks'})).toBe('Unpin: Tasks');
    expect(commandAskWords({kind: 'clear'})).toBe('Clear the stage');
    expect(commandAskWords({kind: 'arrangement', preset: 'health'})).toBe('Arrangement: Health HUD');
    for (const c of [{kind: 'close', id: 'weather'}, {kind: 'clear'}, {kind: 'arrangement', preset: 'minimal'}] as const) expect(commandAskWords(c)).not.toMatch(/\d/);
  });
});

describe('the stage owns the answer when it made a widget and the engine had none (AM-D3)', () => {
  /** One English and one Dutch phrase per family of lib/nova/summon/summon.ts. */
  const SAMPLES: Readonly<Record<string, [string, string]>> = {
    weight: ['how is my weight', 'hoe gaat mijn gewicht'], sleep: ['how did I sleep', 'hoe heb ik geslapen'], water: ['my water today', 'hoeveel water heb ik gedronken'], steps: ['my steps today', 'hoeveel stappen heb ik'],
    workouts: ['my workouts this month', 'hoe vaak heb ik gesport'], 'health-hud': ['my calories today', 'hoeveel eiwit heb ik gegeten'], 'habits-hud': ['my streaks', 'wat zijn mijn reeksen'], 'habit-week': ['my habits this week', 'mijn gewoontes deze week'],
    budgets: ['how is my budget', 'hoe staat mijn budget ervoor'], spending: ['what did I spend', 'wat heb ik uitgegeven'], bills: ['which bills are due', 'welke rekeningen komen eraan'], money: ['my next contribution', 'mijn inleg'],
    'net-worth': ['what is my net worth', 'wat is mijn vermogen'], markets: ['how are the markets', 'hoe staan de koersen'], 'wealth-hud': ['how is my portfolio', 'mijn spaargeld'], 'goals-hud': ['how are my goals', 'hoe gaan mijn doelen'],
    'goal-pace': ['am I on track', 'lig ik op schema'], 'agenda-clock': ['my agenda', 'mijn afspraken'], tasks: ['my tasks', 'mijn taken'], orbit: ['my checklist', 'de checklist'], focus: ['my focus this week', 'mijn concentratie'],
    journal: ['did I journal this month', 'heb ik in mijn dagboek geschreven'], notes: ['my notes', 'mijn notities'], briefs: ['my recap', 'de terugblik'], next: ['what should I do', 'wat moet ik nu'],
    sun: ['when is sunset', 'wanneer is de zonsondergang'], weather: ['do I need an umbrella', 'gaat het regenen'], time: ['what time is it', 'hoe laat is het'], 'nova-sees': ['what can you see', 'wat kun je zien'],
    'nova-brain': ['which model are you using', 'welk model gebruik je'], requests: ['what did I ask before', 'wat heb ik gevraagd'], 'now-playing': ['what music is playing', 'welke muziek speelt er'], glance: ['how is my day', 'hoe gaat mijn dag'],
  };
  const phrases = FAMILIES.flatMap(f => (SAMPLES[f.id] ?? []).map(text => ({id: f.id, text})));
  it('for every phrase family, the stage’s answer is never the engine’s fallback string', () => {
    const d = data(), fallbackReply = `${UNMATCHED_EN}\nUntil you give me a brain, I answer from your own records on this device. For example:`;
    expect(Object.keys(SAMPLES).sort()).toEqual(FAMILIES.map(f => f.id).sort());
    expect(phrases.length).toBe(FAMILIES.length * 2);
    for (const {id, text} of phrases) {
      const plan = summonFor(text);
      expect(plan.widgets.map(w => w.id), `${id}: "${text}"`).toContain(id);
      // Before the engine: the stage answers these words itself, with the widgets' lines.
      expect(stageOwns(plan, 'fallback'), text).toBe(true);
      const lines = stageLines(plan.widgets, d, plan.lang, NOW), direct = answerWords(plan.widgets, lines, plan.lang);
      // And if the fallback was said all the same (a question that reached the engine another way): still the lines.
      const made = replyWidgets(plan, {kind: 'examples', calls: [], card: false}), after = stageAnswerText({made, lines, lang: plan.lang, reply: fallbackReply, decision: false, fallback: true});
      expect(made).toEqual(plan.widgets);
      for (const answer of [direct, after]) {
        expect(answer.length, text).toBeGreaterThan(0);
        expect(answer, text).not.toContain('That isn’t something I can answer');
        expect(answer, text).not.toContain('Without a brain');
        expect(answer, text).not.toContain(UNMATCHED_EN.slice(0, 30));
      }
    }
  });
  it('"Did I journal this month?" in the Showcase: no answer on the device, so the stage says the journal’s line', () => {
    const env = novaLocalEnv({sources: showcase(), gates: gatesFor(true), scopes: {...DEFAULT_NOVA_SCOPES, journal: true}, chainChosen: true});
    const plan = summonFor('Did I journal this month?'), look = engineLook('Did I journal this month?', env);
    expect(plan.widgets.map(w => w.id)).toEqual(['journal']);
    expect(look.kind).toBe('fallback');
    expect(stageOwns(plan, look.kind)).toBe(true);
    expect(answerWords(plan.widgets, stageLines(plan.widgets, data(), 'en', NOW), 'en')).toMatch(/^Journal: \d+ days? written this month/);
  });
});

describe('a log line is the engine’s (its Quick add offer), never a widget request', () => {
  it.each(['drank 2 glasses of water', 'walked 4000 steps', 'slept 7 hours', 'weighed 81.4 kg', '2 glazen water gedronken'])('%s', text => {
    const plan = summonFor(text);
    expect(plan.command).toBeNull();
    expect(isLogLine(text, plan), text).toBe(true);
  });
  it('a plain "show me …", a question and a stage command are not log lines', () => {
    for (const text of ['Show my water', 'show my habits this week', 'How much water did I drink?', 'Did I journal this month?', 'habits this week', 'my steps', 'bills', 'net worth', 'spending', 'close the weather', 'clear the stage']) expect(isLogLine(text, summonFor(text)), text).toBe(false);
  });
});
describe('the engine comes first (the lead’s rule): what it answers itself stays its reply, and no unrelated widget is made', () => {
  const env = () => novaLocalEnv({sources: empty(), gates: gatesFor(false), scopes: DEFAULT_NOVA_SCOPES, chainChosen: false});
  const five = ['Add a habit called Evening walk', '10-minute morning routine', 'give me a 10-minute routine for tonight', 'Show my Sleep 7 hours a night goal', 'open goals\nand tell me what is left today', 'What can you read about me?'];
  it.each(five)('%s: not answered by the stage, and nothing unrelated is made', text => {
    const plan = summonFor(text), look = engineLook(text, env());
    expect(plan.command, text).toBeNull();
    expect(look.kind, text).not.toBe('fallback');
    expect(look.kind, text).not.toBe('model');
    expect(stageOwns(plan, look.kind), text).toBe(false);
    // Beside the reply: only widgets of the records it read (none for a card, a navigation, a note or a permissions answer).
    const made = replyWidgets(plan, {kind: 'answer', calls: look.calls, card: look.kind !== 'records'});
    if (look.kind !== 'records') expect(made, text).toEqual([]);
    else { const gates = new Set(made.map(w => widgetSpec(w.id)?.gate)); expect(made.every(w => !!widgetSpec(w.id)?.gate), text).toBe(true); expect(gates.size, text).toBeLessThanOrEqual(1); }
    expect(made.map(w => w.id), text).not.toContain('habit-week');
    expect(made.map(w => w.id), text).not.toContain('sleep');
    expect(made.map(w => w.id), text).not.toContain('nova-sees');
  });
  it('the stage answers by itself only a command, or a widget request the engine has no answer for; with a model, a plain "show me" as before', () => {
    const show = summonFor('Show my habits this week'), question = summonFor('How are my habits?'), none = summonFor('Tell me a story'), command = summonFor('pin the weather');
    expect(show.direct).toBe(true); expect(question.direct).toBe(false);
    for (const look of ['fallback', 'records', 'other', 'model'] as const) expect(stageOwns(command, look)).toBe(true);
    for (const look of ['fallback', 'records', 'other', 'model'] as const) expect(stageOwns(none, look)).toBe(false);
    expect(stageOwns(show, 'fallback')).toBe(true); expect(stageOwns(question, 'fallback')).toBe(true);
    expect(stageOwns(show, 'records')).toBe(false); expect(stageOwns(show, 'other')).toBe(false);
    expect(stageOwns(show, 'model')).toBe(true); expect(stageOwns(question, 'model')).toBe(false);
    // A one-tap request above the command bar is the stage's own: its widget is made where the engine would open a page.
    expect(stageOwns(summonFor('Show my agenda'), 'other')).toBe(false);
    expect(stageOwns(summonFor('Show my agenda'), 'other', true)).toBe(true);
    expect(stageOwns(none, 'other', true)).toBe(false);
  });
  it('a widget belongs to a reply only when the reply read its records', () => {
    const weight = summonFor('What’s my weight progress this month?');
    expect(replyWidgets(weight, {kind: 'answer', calls: [{tool: 'weight'}], card: false})).toEqual([{id: 'weight', params: {range: 'month'}}]);
    // The same words answered with a card to confirm, a navigation or a note (no lookup), a refusal, a question back: nothing.
    expect(replyWidgets(weight, {kind: 'answer', calls: [{tool: 'weight'}], card: true})).toEqual([]);
    expect(replyWidgets(weight, {kind: 'answer', calls: [], card: false})).toEqual([]);
    expect(replyWidgets(weight, {kind: 'refusal', calls: [{tool: 'weight'}], card: false})).toEqual([]);
    expect(replyWidgets(weight, {kind: 'choices', calls: [{tool: 'weight'}], card: true})).toEqual([]);
    expect(replyWidgets(weight, {kind: undefined, calls: [], card: false})).toEqual([]);
    // A family the reply did not read under is left out: a goals answer does not make the sleep widget.
    const mixed = summonFor('Show my Sleep 7 hours a night goal');
    expect(mixed.widgets.map(w => w.id)).toEqual(['sleep', 'goal-pace']);
    expect(replyWidgets(mixed, {kind: 'answer', calls: [{tool: 'list_goals'}], card: false}).map(w => w.id)).toEqual(['goal-pace']);
    // One widget of a kind: the wealth widget asked for, not the Wealth HUD a second lookup maps to.
    expect(replyWidgets(summonFor('Show my net worth'), {kind: 'answer', calls: [{tool: 'totals_per_currency'}, {tool: 'net_worth'}], card: false}).map(w => w.id)).toEqual(['net-worth']);
    expect(replyWidgets(summonFor('Tell me about it'), {kind: 'answer', calls: [{tool: 'totals_per_currency'}], card: false}).map(w => w.id)).toEqual(['wealth-hud']);
    // AM-D22: one goal widget for one request, never Goal pace and the Goals HUD together.
    expect(replyWidgets(summonFor('Am I on track for Japan?'), {kind: 'answer', calls: [{tool: 'list_goals'}], card: false}).map(w => w.id)).toEqual(['goal-pace']);
    expect(replyLook({kind: 'examples', text: 'x', examples: [], calls: []}).kind).toBe('fallback');
    expect(replyLook({kind: 'answer', text: 'Opening Goals.', calls: []}).kind).toBe('other');
    expect(replyLook({kind: 'refusal', text: 'no', calls: []}).kind).toBe('other');
  });
  it('AM-D22: no goal by that name on an empty profile says "You have no goals yet." — never "one of these names" with no names', () => {
    const env0 = novaLocalEnv({sources: empty(), gates: gatesFor(false), scopes: DEFAULT_NOVA_SCOPES, chainChosen: false})!;
    const look = engineLook('Am I on track for Japan?', env0);
    expect(look.kind).not.toBe('model');
    expect(stageLine('goal-pace', undefined, blank(), 'en', NOW)).toBe('You have no goals yet.');
  });
  it('the card under the star: the made widgets’ lines; a card to confirm keeps the reply; no widget: the reply, cut', () => {
    const lines = {weight: '81.4 kg, down 1.2 kg since 12 Oct.'}, made = [{id: 'weight', params: {range: 'month' as const}}];
    const reply = 'Your weight over the last 30 days:\n• 2026-10-12: 82.6 kg\n• 2026-11-09: 81.4 kg\nFigures from your log.';
    expect(stageAnswerText({made, lines, lang: 'en', reply, decision: false, fallback: false})).toBe('Weight · the last 30 days: 81.4 kg, down 1.2 kg since 12 Oct.');
    expect(stageAnswerText({made, lines, lang: 'en', reply: 'A new habit, Evening walk. Add it?', decision: true, fallback: false})).toBe('A new habit, Evening walk. Add it?');
    expect(stageAnswerText({made: [], lines: {}, lang: 'en', reply: 'Opening Goals.', decision: false, fallback: false})).toBe('Opening Goals.');
    expect(stageAnswerText({made: [{id: 'glance'}], lines: {}, lang: 'en', reply: 'One. Two. Three.', decision: false, fallback: false})).toBe('One. Two.');
    expect(formatCurrencyAmount('950.00', 'EUR')).toMatch(/950/);
  });
});
