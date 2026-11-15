import {describe, expect, it} from 'vitest';
import {gatesFor, showcaseSources} from '../../ai/tools/fixtures';
import {readAkToolSources} from '../../ai/tools/ak-sources';
import {readNovaToolSources} from '../../ai/tools/nova-sources';
import type {ToolSources} from '../../ai/tools/env';
import {DEFAULT_NOVA_SCOPES} from '../../ai/context-pack/nova';
import {emptyAccounts} from '../../accounts/schema';
import {emptyBills} from '../../bills/schema';
import {chooseDayGoal} from '../../checklist/day-goal';
import {emptyDayGoal} from '../../checklist/day-goal-core';
import {COUNTDOWNS_KEY, countdownsSchema, emptyCountdowns} from '../../countdowns/schema';
import {chooseDayEnd, emptyDayEnds} from '../../day-boundary';
import {emptyHabitData} from '../../habits';
import {createEmptyHealth} from '../../health';
import {emptyJournal} from '../../journal/schema';
import {addLocalDays} from '../../local-date';
import {emptyMoneyLog} from '../../money-log/schema';
import {MONEY_TAGS_KEY, emptyMoneyTags, moneyTagsSchema} from '../../money-tags/schema';
import {emptyMoodTags, moodTagsSchema} from '../../mood-tags/schema';
import {NETWORTH_HISTORY_KEY, emptyNetworthHistory, networthHistorySchema} from '../../networth-history';
import {emptyPlatform} from '../../positions';
import {buildShowcase} from '../../showcase-data';
import {emptySymptoms} from '../../symptoms/schema';
import {addItem, setLevel} from '../../symptoms/symptoms';
import {TASK_WHEN_KEY, emptyTaskWhen, taskWhenSchema} from '../../tasks/when';
import {WORKOUTS_KEY, emptyWorkouts, workoutsSchema} from '../../workouts/schema';
import {emptySplits, splitsRecordSchema} from '../../workouts/splits-schema';
import {TEMPLATE_COUNTS, countdownsCard, journalNumbersCard, perfectDaysCard} from '../cards/life-insights';
import {moneyTagsCard, readyCard} from '../cards/money-insights';
import {historyMoney, netWorthHistoryCard} from '../cards/net-worth-history';
import {novaLocalEnv} from '../local-env';
import {WIDGETS, widgetSpec} from '../widgets/catalog';
import {CONNECT_FAMILIES, CONNECT_NL_TITLES, connectPrune} from './connect-families';
import {engineLook} from './engine-look';
import {lineData, lockedLine, stageLine, type LineData} from './lines';
import {FAMILIES, mergeSummons, normal, replyWidgets, stageCalls, stageOwns, summonFor, summonLanguage} from './summon';
import {answerWords, commandAskWords, keptAskWords, widgetTitle} from './words';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-038 D4, D6; AL lesson 6): the widgets of what Sessions AO and AP added, as
 * requests in English and Dutch phrasing families, and the one-line answer each gives from its own selector. Records:
 * the Showcase's own (fictional) and an empty profile. Health-type records (mood tags, symptoms, run splits) only ever
 * speak under the Health gate, and a request for one is kept by the widget's name.
 */
const DAY = '2026-11-11', NOW = new Date(`${DAY}T14:05:00Z`);
const RECORDS = buildShowcase(DAY, 'UTC').records, get = {getItem: (k: string) => RECORDS[k] ?? null};
const NEW = ['net-worth-history', 'ready-to-assign', 'age-of-money', 'spending-pace', 'bill-changes', 'money-tags', 'perfect-days', 'day-rules', 'tasks-later', 'countdowns', 'journal-numbers', 'templates', 'run-splits', 'mood-tags', 'symptoms'] as const;
const HEALTH = ['run-splits', 'mood-tags', 'symptoms'] as const;
const ids = (q: string, ctx = {}) => summonFor(q, ctx).widgets.map(w => w.id);

describe('the catalogue and the families agree', () => {
  it('every new widget is in the closed catalogue, has a family, a Dutch title and a page', () => {
    expect(CONNECT_FAMILIES.map(f => f.id).sort()).toEqual([...NEW].sort());
    expect(Object.keys(CONNECT_NL_TITLES).sort()).toEqual([...NEW].sort());
    for (const id of NEW) {
      const spec = widgetSpec(id)!;
      expect(spec, id).toBeTruthy();
      expect(spec.made, id).toBe(true);
      expect(spec.href, id).toMatch(/^\/app\/(wealth|habits|settings|tasks|today|journal|goals\/templates|health)/);
      expect(widgetTitle(id, 'nl'), id).toBe(CONNECT_NL_TITLES[id]);
      expect(widgetTitle(id, 'en'), id).toBe(spec.title);
    }
    // They are matched before the general families ("spending pace" before "spending").
    expect(FAMILIES.slice(0, CONNECT_FAMILIES.length)).toEqual([...CONNECT_FAMILIES]);
    // Only Templates is the stage's alone: every other one reads the person's records under a switch.
    expect(CONNECT_FAMILIES.filter(f => f.stageOnly).map(f => f.id)).toEqual(['templates']);
    expect(NEW.filter(id => !widgetSpec(id)?.gate)).toEqual(['templates']);
    expect(NEW.filter(id => widgetSpec(id)?.gate === 'health')).toEqual([...HEALTH]);
  });
});

describe('summonFor: each new widget from several phrasings, English and Dutch', () => {
  const cases: [string, string[], string[]][] = [
    ['net-worth-history', ['Show my net worth history', 'How has my net worth changed?', 'net worth over time', 'show the net worth chart for the last year'], ['Toon het verloop van mijn vermogen', 'Hoe is mijn vermogen veranderd?', 'mijn vermogen door de tijd', 'vermogensgeschiedenis']],
    ['ready-to-assign', ['What is ready to assign?', 'How much is left to assign this month?', 'show my unassigned income', 'how much is left to budget'], ['Wat is er nog te verdelen?', 'Hoeveel kan ik nog toewijzen?', 'klaar om toe te wijzen']],
    ['age-of-money', ['What is the age of my money?', 'How old is my money?', 'show the age of money'], ['Wat is de leeftijd van mijn geld?', 'Hoe oud is mijn geld?', 'toon de geldleeftijd']],
    ['spending-pace', ['What is my spending pace?', 'Am I spending more than usual?', 'show my usual pace', 'did I spend less than I usually do'], ['Wat is mijn uitgaventempo?', 'Geef ik meer uit dan normaal?', 'toon het tempo van mijn uitgaven']],
    ['bill-changes', ['Did any of my bills go up?', 'Show bill changes', 'any price increases on my subscriptions?', 'which subscriptions got more expensive'], ['Zijn mijn rekeningen duurder geworden?', 'Welke abonnementen zijn gestegen?', 'toon de prijswijzigingen']],
    ['money-tags', ['Show my spending by tag', 'What did I spend per tag?', 'show my money tags', 'totals per tag this month'], ['Toon mijn uitgaven per tag', 'Wat heb ik per label uitgegeven?', 'mijn tags']],
    ['perfect-days', ['Show my perfect days', 'How many perfect days this month?', 'on which days were all my habits done'], ['Toon mijn perfecte dagen', 'Hoeveel perfecte dagen heb ik deze maand?', 'dagen met alle gewoontes gedaan']],
    ['day-rules', ['When does my day end?', 'At how many dots does a day count as done?', 'show my day rules', 'my day ends at what time'], ['Wanneer eindigt mijn dag?', 'Wanneer telt een dag als gedaan?', 'toon de regels van mijn dag']],
    ['tasks-later', ['What is on for this evening?', 'Show my someday list', 'my tasks for this evening', 'show tonight’s list'], ['Wat staat er voor vanavond?', 'Toon mijn someday lijst', 'mijn taken voor vanavond']],
    ['countdowns', ['Show my countdowns', 'How many days until my trip?', 'how long until the holidays', 'days to go'], ['Toon mijn aftellingen', 'Hoeveel dagen tot mijn reis?', 'hoe lang nog tot de vakantie']],
    ['journal-numbers', ['Show my journal numbers', 'How many words have I written this year?', 'what is my writing streak', 'journal stats'], ['Toon mijn dagboek in cijfers', 'Hoeveel woorden heb ik geschreven?', 'mijn schrijfreeks']],
    ['templates', ['Show me goal templates', 'Give me some habit ideas', 'open the template library', 'ideas for a new goal'], ['Toon de sjablonen', 'Geef me ideeën voor een gewoonte', 'laat sjablonen voor doelen zien']],
    ['run-splits', ['Show my run splits', 'What was my pace per km?', 'how fast was my last run', 'my running pace'], ['Toon mijn tussentijden', 'Wat was mijn tempo per kilometer?', 'hoe snel liep ik']],
    ['mood-tags', ['Show my mood tags', 'What goes with my good days?', 'show my mood patterns'], ['Toon mijn stemmingstags', 'Wat hoort bij mijn goede dagen?', 'stemmingspatronen']],
    ['symptoms', ['Show my symptoms', 'show my symptom log', 'the factors I follow'], ['Toon mijn symptomen', 'toon mijn klachtenlog', 'de factoren die ik volg']],
  ];
  it('covers every new widget', () => { expect(cases.map(c => c[0]).sort()).toEqual([...NEW].sort()); });
  for (const [id, en, nl] of cases) it(`${id}: ${en.length} English and ${nl.length} Dutch phrasings make it, and it leads`, () => {
    for (const text of [...en, ...nl]) {
      const made = ids(text);
      expect(made, text).toContain(id);
      expect(made[0], text).toBe(id);
    }
    // A Dutch request is answered in Dutch (the widget is the same either way).
    for (const text of nl.slice(0, 2)) expect(summonLanguage(text), text).toBe('nl');
    for (const text of en.slice(0, 2)) expect(summonLanguage(text), text).toBe('en');
  });
});

describe('one request, one widget of a kind', () => {
  it('the specific widget stands in for the general one the same words name', () => {
    expect(ids('What is my spending pace?')).toEqual(['spending-pace']); // not Spending, not Goal pace
    expect(ids('Show my net worth history')).toEqual(['net-worth-history']); // not Tracked wealth
    expect(ids('vermogensgeschiedenis')).toEqual(['net-worth-history']); // "geschiedenis" is not "what did I ask"
    expect(ids('Show bill changes')).toEqual(['bill-changes']);
    expect(ids('any price increases on my subscriptions?')).toEqual(['bill-changes']); // not Market watch
    expect(ids('Show my spending by tag')).toEqual(['money-tags']);
    expect(ids('What is the age of my money?')).toEqual(['age-of-money']); // not the Wealth HUD
    expect(ids('how much is left to budget')).toEqual(['ready-to-assign']); // not Budgets beside it
    expect(ids('How many perfect days this month?')).toEqual(['perfect-days']);
    expect(ids('what is my writing streak')).toEqual(['journal-numbers']); // not the habits' streaks
    expect(ids('Give me some habit ideas')).toEqual(['templates']);
    expect(ids('my tasks for this evening')).toEqual(['tasks-later']);
    expect(ids('What was my pace per km?')).toEqual(['run-splits']);
    expect(ids('When does my day end?')).toEqual(['day-rules']);
    expect(ids('Show my mood tags')).toEqual(['mood-tags']); // "tags" alone is the money tags; a mood's tags are Health's
  });
  it('the earlier families still make what they made', () => {
    expect(ids('What did I spend this month?')).toEqual(['spending']);
    expect(ids('What is my net worth?')).toEqual(['net-worth']);
    expect(ids('Which bills are due?')).toEqual(['bills']);
    expect(ids('What are my tasks?')).toEqual(['tasks']);
    expect(ids('Did I journal this month?')).toEqual(['journal']);
    expect(ids('What are my streaks?')).toEqual(['habits-hud']);
    expect(ids('How many workouts this month?')).toEqual(['workouts']);
    expect(ids('How are my goals?')).toEqual(['goals-hud']);
    expect(ids('How is my budget?')).toEqual(['budgets']);
  });
  it('everyday words step back when the request is about something else', () => {
    expect(ids('What’s the weather this evening?')).toEqual(['weather']);
    expect(ids('Will it rain for tonight?')).toEqual(['weather']);
    expect(ids('How many days until my rent is due?')).toEqual(['bills']);
    expect(ids('how long until sunset')).toEqual(['sun']);
    // …and stay when the request names the list or the countdown itself.
    expect(ids('Show this evening')).toEqual(['tasks-later']);
    expect(ids('my bills and my countdowns')).toEqual(expect.arrayContaining(['countdowns', 'bills']));
    expect(connectPrune(['tasks-later', 'weather'], normal('the weather and my someday list'))).toEqual(['tasks-later', 'weather']);
    expect(connectPrune(['spending-pace', 'spending', 'goal-pace'], 'x')).toEqual(['spending-pace']);
  });
  it('beside a reply that read records, the asked widget is enough: the lookup’s general widget is not added to it', () => {
    const pace = summonFor('What is my spending pace?'), history = summonFor('Show my net worth history');
    expect(replyWidgets(pace, {kind: 'answer', calls: [{tool: 'spending'}], card: false})).toEqual([{id: 'spending-pace'}]);
    expect(replyWidgets(history, {kind: 'answer', calls: [{tool: 'totals_per_currency'}, {tool: 'net_worth'}], card: false})).toEqual([{id: 'net-worth-history'}]);
    expect(replyWidgets(summonFor('Did any of my bills go up?'), {kind: 'answer', calls: [{tool: 'bills'}], card: false})).toEqual([{id: 'bill-changes'}]);
    // A lookup of another part of life still adds its own widget, and a plain merge of earlier widgets is unchanged.
    expect(mergeSummons([{id: 'spending-pace'}], [{id: 'spending'}, {id: 'habit-week'}])).toEqual([{id: 'spending-pace'}, {id: 'habit-week'}]);
    expect(mergeSummons([{id: 'spending'}], [{id: 'budgets'}, {id: 'spending'}])).toEqual([{id: 'spending'}, {id: 'budgets'}]);
  });
  it('a range in the words goes to the widgets that take one, and to no other', () => {
    expect(summonFor('Show my net worth history for the last year').widgets).toEqual([{id: 'net-worth-history', params: {range: 'year'}}]);
    expect(summonFor('spending by tag this quarter').widgets).toEqual([{id: 'money-tags', params: {range: 'quarter'}}]);
    expect(summonFor('How many perfect days this month?').widgets).toEqual([{id: 'perfect-days'}]);
  });
  it('a plain "show me …" is direct; stage commands name the new widgets too', () => {
    expect(summonFor('Show my countdowns').direct).toBe(true);
    expect(summonFor('How many days until my trip?').direct).toBe(false);
    expect(summonFor('Show me goal templates').direct).toBe(true);
    expect(summonFor('goal templates').direct).toBe(true); // only the stage answers the library
    expect(summonFor('close the countdowns').command).toEqual({kind: 'close', id: 'countdowns'});
    expect(summonFor('pin my perfect days').command).toEqual({kind: 'pin', id: 'perfect-days'});
    expect(summonFor('verberg mijn perfecte dagen').command).toEqual({kind: 'hide', id: 'perfect-days'});
    expect(commandAskWords({kind: 'close', id: 'mood-tags'})).toBe('Close: Mood tags');
  });
  it('a guarded message, a secret or a card number makes none of them', () => {
    for (const text of ['my password is hunter2, show my countdowns', 'show my spending by tag 4111 1111 1111 1111']) expect(summonFor(text).widgets, text).toEqual([]);
  });
});

describe('a model’s stage tool reaches the new widgets by their catalogue id only', () => {
  const call = (action: string, widget: string, more: Record<string, unknown> = {}) => ({tool: 'stage_widget', args: {action, widget, ...more}});
  it('show with a range where the widget takes one; an id that is not in the catalogue is dropped', () => {
    expect(stageCalls([call('show', 'net-worth-history', {range: 'year'}), call('show', 'perfect-days', {range: 'year'}), call('show', 'mood-tags; drop table')]).show).toEqual([{id: 'net-worth-history', params: {range: 'year'}}, {id: 'perfect-days'}]);
  });
  it('a pin on a Health widget whose switch is closed is dropped (AM-S1); it may still be shown, and is then locked', () => {
    const closed = {gateOpen: (id: string) => widgetSpec(id)?.gate !== 'health'};
    for (const id of HEALTH) {
      expect(stageCalls([call('pin', id)], closed).commands, id).toEqual([]);
      expect(stageCalls([call('show', id)], closed).show, id).toEqual([{id}]);
      expect(stageCalls([call('pin', id)], {gateOpen: () => true}).commands, id).toEqual([{kind: 'pin', id}]);
    }
    expect(stageCalls([call('pin', 'countdowns')], closed).commands).toEqual([{kind: 'pin', id: 'countdowns'}]);
  });
});

/* ---- The lines ---- */
const showcase = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get)});
const empty = (): ToolSources => ({...showcaseSources(DAY), now: NOW, habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), accounts: emptyAccounts(), moneyLog: emptyMoneyLog(), journal: emptyJournal(), fasting: null, weekly: null, energy: null, chess: null, ak: {bills: emptyBills()}, nova: readNovaToolSources({getItem: () => null}), showcase: false});
const parsed = {
  networthHistory: networthHistorySchema.parse(JSON.parse(RECORDS[NETWORTH_HISTORY_KEY]!)), moneyTags: moneyTagsSchema.parse(JSON.parse(RECORDS[MONEY_TAGS_KEY]!)),
  taskWhen: taskWhenSchema.parse(JSON.parse(RECORDS[TASK_WHEN_KEY]!)), countdowns: countdownsSchema.parse(JSON.parse(RECORDS[COUNTDOWNS_KEY]!)),
};
const OPEN = () => true, SHUT = () => false;
const base = {workouts: workoutsSchema.parse(JSON.parse(RECORDS[WORKOUTS_KEY]!)), weather: {kind: 'off' as const}, brain: {kind: 'none', words: ''}, asks: []};
const SHOW: LineData = lineData(showcase(), OPEN, {...base, ...parsed, dayGoal: emptyDayGoal(), dayEnds: emptyDayEnds(), splits: emptySplits(), moodTags: emptyMoodTags(), symptoms: emptySymptoms(), templates: TEMPLATE_COUNTS})!;
const BLANK: LineData = lineData(empty(), OPEN, {...base, workouts: emptyWorkouts(), networthHistory: emptyNetworthHistory(), moneyTags: emptyMoneyTags(), taskWhen: emptyTaskWhen(), countdowns: emptyCountdowns(), dayGoal: emptyDayGoal(), dayEnds: emptyDayEnds(), splits: emptySplits(), moodTags: emptyMoodTags(), symptoms: emptySymptoms(), templates: TEMPLATE_COUNTS})!;
const line = (id: string, d: LineData = SHOW, lang: 'en' | 'nl' = 'en', params?: Parameters<typeof stageLine>[1]) => stageLine(id, params, d, lang, NOW);

describe('each new widget’s one line is its own selector’s figures (the Showcase’s fictional records)', () => {
  it('net worth over time: the newest recorded day and the change since the first known day, marked as the example it is', () => {
    const c = netWorthHistoryCard(SHOW.networthHistory!, DAY, 'quarter'), money = historyMoney(c.latest!.cents!, 'USD');
    expect(line('net-worth-history')).toMatch(new RegExp(`^Net worth ${money.replace(/[$.]/g, '\\$&')} on Nov 11, up \\$[\\d,]+\\.\\d{2} since [A-Z][a-z]{2} \\d{1,2} \\(example history\\)\\.$`));
    expect(line('net-worth-history', SHOW, 'nl')).toMatch(/^Vermogen \$[\d,]+\.\d{2} op .+, \$[\d,]+\.\d{2} hoger dan op .+ \(voorbeeldgeschiedenis\)\.$/);
    expect(line('net-worth-history', SHOW, 'en', {range: 'week'})).toMatch(/^Net worth \$/);
    expect(line('net-worth-history')).not.toMatch(/SHOWCASE DATA/);
  });
  it('the five money read-outs: the page’s own figures, or what is missing — never a zero', () => {
    const ready = readyCard(SHOW.moneyLog!, SHOW.budgets!, DAY).lead!;
    expect(ready.status).toBe('ok');
    expect(line('ready-to-assign')).toBe(ready.over ? `Your budgets hold ${ready.ready} more than you logged as income this month.` : `Ready to assign this month: ${ready.ready} (${ready.income} logged as income, minus ${ready.held} in budgets).`);
    expect(line('ready-to-assign', SHOW, 'nl')).toMatch(/^(Klaar om toe te wijzen deze maand: |Je budgetten houden )/);
    expect(line('age-of-money')).toMatch(/^Age of money: \d+(\.\d)? days? on average, over what you spent in the last 90 days\.$/);
    expect(line('age-of-money', SHOW, 'nl')).toMatch(/^Leeftijd van je geld: gemiddeld \d+([.,]\d)? dag(en)?, /);
    // Five weeks of records: the usual pace needs three earlier months, and says so.
    expect(line('spending-pace')).toMatch(/^Not enough months yet: this needs 3 earlier months with spending logged, and there (is 1|are (none|2))\.$/);
    expect(line('spending-pace', SHOW, 'nl')).toMatch(/^Nog niet genoeg maanden: /);
    // The Showcase's bills were written by hand: no payments to compare.
    expect(line('bill-changes')).toBe('No bill’s latest payment differs from the one before it.');
    const tags = moneyTagsCard(SHOW.moneyTags!, SHOW.moneyLog!, DAY);
    expect(tags.state).toBe('live');
    expect(line('money-tags')).toBe(`Most under “${tags.rows[0]!.tag}”: ${tags.rows[0]!.text} this month; ${tags.tags} tags in use.`);
    expect(line('money-tags', SHOW, 'nl')).toMatch(/^Het meest onder “.+”: .+ deze maand; \d+ tags in gebruik\.$/);
  });
  it('the day, the habits, the journal and the library', () => {
    const perfect = perfectDaysCard(SHOW.habits!, SHOW.day);
    expect(line('perfect-days')).toMatch(new RegExp(`^Perfect days this month: ${perfect.perfect}(, \\d+ in a row)?; (today included|today \\d+ of \\d+ so far|today \\d+ still to do|nothing due today)\\.$`));
    expect(line('perfect-days', SHOW, 'nl')).toMatch(/^Perfecte dagen deze maand: \d+/);
    expect(line('day-rules')).toBe('A day counts as done at every dot; your day ends at midnight.');
    expect(line('day-rules', SHOW, 'nl')).toBe('Een dag telt als gedaan bij elke stip; je dag eindigt om middernacht.');
    const owl: LineData = {...SHOW, dayGoal: chooseDayGoal(emptyDayGoal(), DAY, 4), dayEnds: chooseDayEnd(emptyDayEnds(), 180, NOW)};
    expect(line('day-rules', owl)).toBe('A day counts as done at 4 dots; your day ends at 3:00.');
    expect(line('day-rules', {...SHOW, dayGoal: null})).toBe('Your day ends at midnight.'); // one setting read, the other not: only what is known
    expect(line('tasks-later')).toBe('This evening: 1 task; Someday: 1.');
    expect(line('tasks-later', SHOW, 'nl')).toBe('Vanavond: 1 taak; ooit: 1.');
    const next = countdownsCard(SHOW.countdowns!, SHOW.day).next!;
    expect(line('countdowns')).toBe(`Days until ${next.title}: 3 (${next.dateText}); 2 more coming up.`);
    expect(line('countdowns', SHOW, 'nl')).toBe(`Dagen tot ${next.title}: 3 (${next.dateText}); daarna nog 2.`);
    const numbers = journalNumbersCard(SHOW.journal!, SHOW.day);
    expect(numbers.words).toBeGreaterThan(0);
    expect(line('journal-numbers')).toMatch(/^[\d,]+ words in \d+ entries this year(; writing streak \d+ days?)?\.$/);
    expect(line('journal-numbers', SHOW, 'nl')).toMatch(/^[\d.,]+ woorden dit jaar, in \d+ teksten/);
    expect(line('templates')).toBe(`${TEMPLATE_COUNTS.goals} goal templates and ${TEMPLATE_COUNTS.habits} habit ideas, in ${TEMPLATE_COUNTS.areas} areas.`);
    expect(line('templates', SHOW, 'nl')).toMatch(/^\d+ doelsjablonen en \d+ gewoonte-ideeën, in 13 gebieden\.$/);
  });
  it('the Health read-outs, once the Health gate is open: a run’s pace, what goes with good days, the days a symptom was there', () => {
    const splits = splitsRecordSchema.parse({version: 1, workouts: {'showcase-workout-2': {source: 'gpx', paceSecondsPerKm: 340, splits: [{km: 1, meters: 1000, seconds: 350}, {km: 2, meters: 1000, seconds: 330}]}}});
    expect(line('run-splits', {...SHOW, splits})).toMatch(/^Easy run, .+: average pace 5:40 \/km over 2 km; fastest kilometre 5:30 \/km\.$/);
    expect(line('run-splits', {...SHOW, splits}, 'nl')).toMatch(/gemiddeld tempo 5:40 \/km over 2 km; snelste kilometer 5:30 \/km\.$/);
    const days = Array.from({length: 14}, (_, i) => addLocalDays(DAY, -i));
    const health = {...SHOW.health!, moods: {version: 1 as const, days: Object.fromEntries(days.map((d, i) => [d, {mood: i < 5 ? 4 : i === 6 || i === 7 ? 5 : 2, at: `${d}T20:00:00.000Z`}]))}};
    const moodTags = moodTagsSchema.parse({version: 1, entries: Object.fromEntries(days.slice(0, 6).map(d => [d, ['walk']]))});
    const moody: LineData = {...SHOW, health, healthDay: DAY, moodTags};
    expect(line('mood-tags', moody)).toBe('On 5 of the 6 days tagged “walk” your mood was Good or Great. Goes with, not a cause.');
    expect(line('mood-tags', moody, 'nl')).toBe('Op 5 van de 6 dagen met de tag “walk” was je stemming Goed of Geweldig. Gaat samen, geen oorzaak.');
    let symptoms = addItem(emptySymptoms(), 'Headache', 'symptom', '2026-11-01T08:00:00.000Z');
    for (const [offset, level] of [[0, 3], [-1, 1], [-2, 0]] as const) symptoms = setLevel(symptoms, addLocalDays(DAY, offset), 'headache', level);
    const answered: LineData = {...SHOW, healthDay: DAY, symptoms};
    expect(line('symptoms', answered)).toBe('Headache: there on 2 of 3 days answered in the last 30 days, strong on 1.');
    expect(line('symptoms', answered, 'nl')).toBe('Headache: aanwezig op 2 van de 3 beantwoorde dagen in de afgelopen 30 dagen, sterk op 1.');
  });
  it('every line is short: at most two sentences, no list, no record date, a full stop, in both languages', () => {
    for (const id of NEW) for (const lang of ['en', 'nl'] as const) for (const d of [SHOW, BLANK]) {
      const text = line(id, d, lang);
      expect(text, `${id} ${lang}`).not.toBeNull();
      expect(text!, id).not.toMatch(/[•\n]|\b\d{4}-\d{2}-\d{2}\b|\b\d+\.\d{2} (EUR|USD)\b|\d\.\d+\s?%|SHOWCASE DATA/);
      expect(text!.length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(190);
      expect((text!.match(/[.!?](\s|$)/g) ?? []).length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(2);
      expect(text!, id).toMatch(/[.!?]$/);
    }
  });
});

describe('an empty profile teaches; unknown is never a zero', () => {
  it('each widget says what is not there yet, in words', () => {
    const teach: Record<string, RegExp> = {
      'net-worth-history': /^No day of net worth is recorded yet/, 'ready-to-assign': /^Nothing is logged as income this month, and there are no budgets yet\.$/, 'age-of-money': /^Nothing is in your money log yet\.$/,
      'spending-pace': /^Nothing is in your money log yet\.$/, 'bill-changes': /^No bill reminders yet\.$/, 'money-tags': /^No tags on your money entries yet\.$/, 'perfect-days': /^You have no habits yet\.$/,
      'tasks-later': /^No open tasks\.$/, countdowns: /^No countdowns yet\.$/, 'journal-numbers': /^No journal entries yet\.$/, 'run-splits': /^No run with a pace yet/, 'mood-tags': /^No mood tags yet\.$/, symptoms: /^You follow no symptom or factor yet\.$/,
    };
    for (const [id, re] of Object.entries(teach)) { const text = line(id, BLANK)!; expect(text, id).toMatch(re); expect(text, id).not.toMatch(/\b0\b|\$0|€0/); }
    // The two settings and the library are never empty: their defaults and their size are real.
    expect(line('day-rules', BLANK)).toBe('A day counts as done at every dot; your day ends at midnight.');
    expect(line('templates', BLANK)).toMatch(/goal templates/);
  });
  it('a record that was not read gives no line at all (the widget is then only named)', () => {
    const unread: LineData = {gateOpen: OPEN, day: DAY, healthDay: DAY};
    for (const id of NEW) expect(stageLine(id, undefined, unread, 'en', NOW), id).toBeNull();
    // Half of what a line needs is not enough either.
    expect(stageLine('money-tags', undefined, {...unread, moneyLog: emptyMoneyLog()}, 'en', NOW)).toBeNull();
    expect(stageLine('tasks-later', undefined, {...unread, taskWhen: emptyTaskWhen()}, 'en', NOW)).toBeNull();
    expect(stageLine('mood-tags', undefined, {...unread, moodTags: emptyMoodTags()}, 'en', NOW)).toBeNull();
    expect(answerWords([{id: 'countdowns'}], {}, 'en')).toBe('On the stage: Days until.');
  });
});

describe('a line is held back by the widget’s own switch; Health stays Health’s (Q14, Q16, AM-S5)', () => {
  it('a closed switch gives the locked sentence and no figure, for every gated new widget, in both languages', () => {
    const shut: LineData = {...SHOW, gateOpen: SHUT};
    for (const id of NEW) for (const lang of ['en', 'nl'] as const) {
      const gate = widgetSpec(id)!.gate, text = stageLine(id, undefined, shut, lang, NOW);
      if (!gate) { expect(text, id).toMatch(/\d/); continue; } // Templates: no records, no switch
      expect(text, id).toBe(lockedLine(gate, lang));
      expect(text, id).not.toMatch(/\d/);
    }
  });
  it('Health off, everything else on: the three Health read-outs are locked and say nothing; the others speak', () => {
    const healthOff: LineData = {...SHOW, gateOpen: id => widgetSpec(id)?.gate !== 'health', moodTags: moodTagsSchema.parse({version: 1, entries: {[DAY]: ['secret tag']}})};
    for (const id of HEALTH) {
      const text = stageLine(id, undefined, healthOff, 'en', NOW)!;
      expect(text, id).toBe('Health is off for NOVA. Turn it on in Permissions to see this.');
      expect(text, id).not.toMatch(/secret|walk|Headache|pace/);
    }
    expect(stageLine('countdowns', undefined, healthOff, 'en', NOW)).toMatch(/^Days until /);
    expect(stageLine('journal-numbers', undefined, {...SHOW, gateOpen: id => widgetSpec(id)?.gate !== 'journal'}, 'en', NOW)).toBe(lockedLine('journal', 'en'));
  });
  it('a request for a Health read-out is kept by the widget’s name, never the person’s words', () => {
    expect(keptAskWords('show my mood tags, I felt awful on the 3rd', [{id: 'mood-tags'}])).toBe('Health: Mood tags');
    expect(keptAskWords('my headache symptoms were strong 5 days', [{id: 'symptoms'}])).toBe('Health: Symptoms');
    expect(keptAskWords('how fast was my last run, 5:12?', [{id: 'run-splits'}])).toBe('Health: Run splits');
    for (const id of HEALTH) expect(keptAskWords('Fictional words 12345', [{id}]), id).not.toMatch(/12345|Fictional/);
    // The others are the person's own words, as a note's are.
    expect(keptAskWords('How many days until my trip?', [{id: 'countdowns'}])).toBe('How many days until my trip?');
    expect(WIDGETS.filter(w => w.gate === 'health').map(w => w.id)).toEqual(expect.arrayContaining([...HEALTH]));
  });
});

describe('the engine comes first, here too (the lead’s rule)', () => {
  const env = (sources: ToolSources, open: boolean) => novaLocalEnv({sources, gates: gatesFor(open), scopes: {...DEFAULT_NOVA_SCOPES, journal: true}, chainChosen: true});
  it('for each new family, the stage answers by itself only when the on-device engine has no answer of its own; otherwise its widget is made only beside records the engine read', () => {
    const samples: Record<string, string> = {
      'net-worth-history': 'Show my net worth history', 'ready-to-assign': 'What is ready to assign?', 'age-of-money': 'What is the age of my money?', 'spending-pace': 'What is my spending pace?', 'bill-changes': 'Show bill changes',
      'money-tags': 'Show my spending by tag', 'perfect-days': 'Show my perfect days', 'day-rules': 'When does my day end?', 'tasks-later': 'Show my someday list', countdowns: 'Show my countdowns',
      'journal-numbers': 'Show my journal numbers', templates: 'Show me goal templates', 'run-splits': 'Show my run splits', 'mood-tags': 'Show my mood tags', symptoms: 'Show my symptom log',
    };
    expect(Object.keys(samples).sort()).toEqual([...NEW].sort());
    const envs = [env(showcase(), true), env(empty(), true)]; // built once: each is the whole on-device engine's environment
    for (const [id, text] of Object.entries(samples)) for (const on of envs) {
      const plan = summonFor(text), look = engineLook(text, on);
      expect(plan.widgets.map(w => w.id), text).toContain(id);
      expect(['fallback', 'records', 'other'], text).toContain(look.kind);
      if (look.kind === 'fallback') expect(stageOwns(plan, look.kind), text).toBe(true);
      else {
        expect(stageOwns(plan, look.kind), text).toBe(false);
        // Beside the engine's own reply: nothing for a card, a navigation or a note; for records, only widgets under the gate it read.
        const made = replyWidgets(plan, {kind: 'answer', calls: look.calls, card: look.kind !== 'records'});
        if (look.kind !== 'records') expect(made, text).toEqual([]);
        else for (const w of made) expect(widgetSpec(w.id)?.gate, `${text}: ${w.id}`).toBeTruthy();
      }
    }
  }, 60_000);
});
