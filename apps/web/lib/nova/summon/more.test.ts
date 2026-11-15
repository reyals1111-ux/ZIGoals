import {describe, expect, it} from 'vitest';
import {showcaseSources} from '../../ai/tools/fixtures';
import {readAkToolSources} from '../../ai/tools/ak-sources';
import {readNovaToolSources} from '../../ai/tools/nova-sources';
import type {ToolSources} from '../../ai/tools/env';
import {emptyAccounts} from '../../accounts/schema';
import {emptyBills} from '../../bills/schema';
import {showcaseCycle} from '../../cycle/showcase';
import {DEBT_PLANNER_KEY, debtPlannerSchema, emptyDebtPlanner} from '../../debt-planner/store';
import {emptyFasting, fastingSchema} from '../../fasting/schema';
import {emptyHabitData} from '../../habits';
import {createEmptyHealth} from '../../health';
import {emptyJournal} from '../../journal/schema';
import {emptyMoneyLog} from '../../money-log/schema';
import {emptyPlatform} from '../../positions';
import {PRICE_ALERTS_KEY, emptyPriceAlerts, priceAlertsSchema} from '../../price-alerts/schema';
import {SAVINGS_CHALLENGES_KEY, emptySavingsChallenges, savingsChallengesSchema} from '../../savings-challenges/challenges';
import {buildShowcase} from '../../showcase-data';
import {SUPPLEMENTS_KEY, emptySupplements, supplementsSchema} from '../../supplements/schema';
import {emptyWeeklyReview} from '../../weekly-review/schema';
import {accountsCard, cashFlowCard, debtPlanCard, priceAlertsCard} from '../cards/money-more';
import {matrixCard, milestonesCard} from '../cards/plan-insights';
import {WIDGETS, widgetSpec} from '../widgets/catalog';
import {CONNECT_FAMILIES} from './connect-families';
import {lineData, lockedLine, stageLine, type LineData} from './lines';
import {MORE_FAMILIES, MORE_NL_TITLES, morePrune} from './more-families';
import {CYCLE_LINE_WORDS} from './more-lines';
import {FAMILIES, normal, replyWidgets, stageCalls, summonFor, summonForTools, summonLanguage} from './summon';
import {answerWords, keptAskWords, widgetTitle} from './words';

/**
 * Session AM-2 (step 3, round 2; ADR-038 D4, D6; AL lesson 6): the widgets of the pages that still had none, as requests
 * in English and Dutch phrasing families, and the one-line answer each gives from its own selector. Six of them read
 * under the Health gate; the cycle log's line never carries a figure; the payoff plan's line is a projection in words.
 */
const DAY = '2026-11-11', NOW = new Date(`${DAY}T14:05:00Z`);
const RECORDS = buildShowcase(DAY, 'UTC').records, get = {getItem: (k: string) => RECORDS[k] ?? null};
const NEW = ['priority-matrix', 'hour-grid', 'reviews', 'milestones', 'cash-flow', 'accounts', 'debt-plan', 'savings-challenges', 'price-alerts', 'health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle'] as const;
const HEALTH = ['health-trends', 'food-days', 'fasting', 'meditation', 'supplements', 'cycle'] as const;
const ids = (q: string, ctx = {}) => summonFor(q, ctx).widgets.map(w => w.id);

describe('the catalogue and the families agree', () => {
  it('every round-2 widget is in the closed catalogue, has a family, a Dutch title and a page', () => {
    expect(MORE_FAMILIES.map(f => f.id).sort()).toEqual([...NEW].sort());
    expect(Object.keys(MORE_NL_TITLES).sort()).toEqual([...NEW].sort());
    for (const id of NEW) {
      const spec = widgetSpec(id)!;
      expect(spec.made, id).toBe(true);
      expect(spec.gate, id).toBeTruthy(); // every one reads the person's records under a switch
      expect(spec.href, id).toMatch(/^\/app\/(tasks|agenda|review|goals|wealth|markets|health)/);
      expect(widgetTitle(id, 'nl'), id).toBe(MORE_NL_TITLES[id]);
    }
    expect(FAMILIES.slice(CONNECT_FAMILIES.length, CONNECT_FAMILIES.length + MORE_FAMILIES.length)).toEqual([...MORE_FAMILIES]);
    expect(NEW.filter(id => widgetSpec(id)?.gate === 'health')).toEqual([...HEALTH]);
    expect(widgetSpec('price-alerts')).toMatchObject({gate: 'wealth', needs: 'markets'});
    expect(MORE_FAMILIES.filter(f => f.stageOnly).map(f => f.id)).toEqual(['hour-grid']);
  });
});

describe('summonFor: each round-2 widget from several phrasings, English and Dutch', () => {
  const cases: [string, string[], string[]][] = [
    ['priority-matrix', ['Show my priority matrix', 'What is urgent and important?', 'show my urgent tasks', 'which are my most important tasks'], ['Toon mijn prioriteitenmatrix', 'Wat is dringend en belangrijk?', 'mijn dringende taken']],
    ['hour-grid', ['Show my day hour by hour', 'show the hour grid', 'my hourly schedule', 'show my time blocks'], ['Toon mijn dag uur voor uur', 'laat het uurrooster zien', 'mijn tijdblokken']],
    ['reviews', ['Is my weekly review due?', 'When is my next review?', 'show my life review', 'show my reviews'], ['Toon mijn weekreview', 'Wanneer is mijn volgende review?', 'mijn wekelijkse terugblik']],
    ['milestones', ['Show my milestones', 'Which milestones are next?', 'goal milestones'], ['Toon mijn mijlpalen', 'Welke mijlpaal is de volgende?', 'mijlpalen van mijn doelen']],
    ['cash-flow', ['Show my cash flow', 'income vs spending this month', 'who did I pay this month?', 'where does my money go'], ['Toon mijn kasstroom', 'inkomsten en uitgaven', 'Aan wie betaal ik?', 'waar gaat mijn geld heen']],
    ['accounts', ['Show my accounts and debts', 'What do I owe?', 'show my balances', 'how much do I owe on my loans'], ['Toon mijn schulden', 'Wat ben ik nog schuldig?', 'mijn saldo', 'rekeningen en schulden']],
    ['debt-plan', ['Show my debt payoff plan', 'When will I be debt free?', 'snowball or avalanche', 'paying off my credit cards'], ['Toon mijn aflosplan', 'Wanneer ben ik schuldenvrij?', 'mijn schulden aflossen']],
    ['savings-challenges', ['Show my savings challenges', 'how is my 52 week challenge', 'my no spend days', 'show my round ups'], ['Toon mijn spaaruitdagingen', 'mijn 52 weken uitdaging', 'spaar challenge']],
    ['price-alerts', ['Show my price alerts', 'which alerts are waiting', 'my price targets'], ['Toon mijn prijsalerts', 'welke prijsalarmen wachten', 'mijn koersalarm']],
    ['health-trends', ['Show my health trends', 'how is my resting heart rate', 'my trends'], ['Toon mijn gezondheidstrends', 'hoe is mijn rusthartslag', 'mijn trends']],
    ['food-days', ['On how many days did I log food?', 'show my food logging', 'my food log consistency'], ['Op hoeveel dagen heb ik eten gelogd?', 'hoe vaak log ik mijn eten', 'dagen eten gelogd']],
    ['fasting', ['Show my fasting', 'How long is my fast?', 'my last fast', 'show my fasts'], ['Toon mijn vasten', 'Hoe lang heb ik gevast?', 'mijn vastenperiode']],
    ['meditation', ['Show my meditation', 'How much did I meditate this week?', 'my mindfulness minutes'], ['Toon mijn meditatie', 'Hoeveel heb ik gemediteerd?', 'mijn ademhalingsoefeningen']],
    ['supplements', ['Show my supplements', 'Did I take my vitamins?', 'my doses today'], ['Toon mijn supplementen', 'Heb ik mijn vitamines genomen?', 'mijn doseringen']],
    ['cycle', ['Show my cycle log', 'Which day of my cycle is it?', 'when is my next period'], ['Toon mijn cyclus', 'Wanneer is mijn volgende menstruatie?', 'welke dag van mijn cyclus']],
  ];
  it('covers every round-2 widget', () => { expect(cases.map(c => c[0]).sort()).toEqual([...NEW].sort()); });
  for (const [id, en, nl] of cases) it(`${id}: ${en.length} English and ${nl.length} Dutch phrasings make it, and it leads`, () => {
    for (const text of [...en, ...nl]) {
      const made = ids(text);
      expect(made, text).toContain(id);
      expect(made[0], text).toBe(id);
    }
    expect(summonLanguage(nl[0]!), nl[0]).toBe('nl');
    expect(summonLanguage(en[0]!), en[0]).toBe('en');
  });
});

describe('one request, one widget of a kind', () => {
  it('the specific widget stands in for the general one the same words name', () => {
    expect(ids('show my urgent tasks')).toEqual(['priority-matrix']); // not Tasks beside it
    expect(ids('my hourly schedule')).toEqual(['hour-grid']); // not the Agenda clock
    expect(ids('mijn wekelijkse terugblik')).toEqual(['reviews']); // "terugblik" is not NOVA's briefs here
    expect(ids('goal milestones')).toEqual(['milestones']); // not Goal pace
    expect(ids('income vs spending this month')).toEqual(['cash-flow']);
    expect(ids('Show my accounts and debts')).toEqual(['accounts']);
    expect(ids('rekeningen en schulden')).toEqual(['accounts']); // one thing in Dutch, not the bills beside it
    expect(ids('Show my debt payoff plan')).toEqual(['debt-plan']); // not Accounts and debts too
    expect(ids('my no spend days')).toEqual(['savings-challenges']); // not Spending
    expect(ids('Show my price alerts')).toEqual(['price-alerts']); // not Market watch
    expect(ids('Show my health trends')).toEqual(['health-trends']); // not the Health HUD
    expect(ids('show my food logging')).toEqual(['food-days']);
    expect(ids('Show my meditation')).toEqual(['meditation']);
  });
  it('an everyday word steps back when the request is about something else', () => {
    expect(ids('Show my sleep balance')).toEqual(['sleep']); // "balance" is not an account here
    expect(ids('my weight trend')).toEqual(['weight']); // the weight widget is the trend
    expect(ids('show the net worth trend')).toEqual(['net-worth-history']);
    expect(ids('how fast was my last run')).toEqual(['run-splits']); // "fast" is not a fast
    expect(ids('weather alerts')).toEqual(['weather']);
    // …and stays when it is the request.
    expect(ids('show my balances')).toEqual(['accounts']);
    expect(ids('my trends')).toEqual(['health-trends']);
    expect(ids('my heart rate and my weight')).toEqual(expect.arrayContaining(['health-trends', 'weight']));
    expect(morePrune(['accounts', 'sleep'], normal('my sleep and my loans'))).toEqual(['accounts', 'sleep']);
  });
  it('the earlier families still make what they made', () => {
    expect(ids('What are my tasks?')).toEqual(['tasks']);
    expect(ids('What’s on my agenda?')).toEqual(['agenda-clock']);
    expect(ids('How are my goals?')).toEqual(['goals-hud']);
    expect(ids('What did I spend this month?')).toEqual(['spending']);
    expect(ids('Which bills are due?')).toEqual(['bills']);
    expect(ids('What is my net worth?')).toEqual(['net-worth']);
    expect(ids('How many calories did I eat?')).toEqual(['health-hud']);
    expect(ids('What are my streaks?')).toEqual(['habits-hud']);
    expect(ids('Start a focus session')).toEqual(['focus']);
  });
  it('a lookup the engine or a model ran maps to its own widget; beside an asked one the general widget is not added', () => {
    expect(summonForTools([{tool: 'fasting'}, {tool: 'supplements'}, {tool: 'meditation_summary'}]).map(w => w.id)).toEqual(['fasting', 'supplements', 'meditation']);
    expect(summonForTools([{tool: 'debt_plan'}, {tool: 'savings_challenges'}, {tool: 'price_alerts'}]).map(w => w.id)).toEqual(['debt-plan', 'savings-challenges', 'price-alerts']);
    expect(summonForTools([{tool: 'weekly_review'}, {tool: 'cycle_log'}]).map(w => w.id)).toEqual(['reviews', 'cycle']);
    expect(replyWidgets(summonFor('Show my accounts and debts'), {kind: 'answer', calls: [{tool: 'accounts'}], card: false})).toEqual([{id: 'accounts'}]); // the lookup's Wealth HUD is not added
    expect(replyWidgets(summonFor('Show my cash flow'), {kind: 'answer', calls: [{tool: 'spending'}], card: false})).toEqual([{id: 'cash-flow'}]);
  });
  it('a model’s pin on a Health read-out whose switch is closed is dropped (AM-S1); price alerts need Markets in use', () => {
    const call = (action: string, widget: string) => ({tool: 'stage_widget', args: {action, widget}});
    const closed = {gateOpen: (id: string) => widgetSpec(id)?.gate !== 'health'};
    for (const id of HEALTH) { expect(stageCalls([call('pin', id)], closed).commands, id).toEqual([]); expect(stageCalls([call('show', id)], closed).show, id).toEqual([{id}]); }
    const noMarkets = {available: (id: string) => widgetSpec(id)?.needs !== 'markets'}; // Markets not in use: neither widget of that page
    expect(ids('Show my price alerts', noMarkets)).toEqual([]);
    expect(stageCalls([call('show', 'price-alerts')], noMarkets).show).toEqual([]);
  });
});

/* ---- The lines ---- */
const showcase = (): ToolSources => ({...showcaseSources(DAY), now: NOW, ak: readAkToolSources(get), nova: readNovaToolSources(get)});
const empty = (): ToolSources => ({...showcaseSources(DAY), now: NOW, habits: emptyHabitData(), health: createEmptyHealth(), platform: emptyPlatform(), accounts: emptyAccounts(), moneyLog: emptyMoneyLog(), journal: emptyJournal(), fasting: emptyFasting(), weekly: emptyWeeklyReview(), energy: null, chess: null, ak: {bills: emptyBills()}, nova: readNovaToolSources({getItem: () => null}), showcase: false});
const OPEN = () => true, SHUT = () => false;
const base = {weather: {kind: 'off' as const}, brain: {kind: 'none', words: ''}, asks: []};
const MORE = {debtPlanner: debtPlannerSchema.parse(JSON.parse(RECORDS[DEBT_PLANNER_KEY]!)), savingsChallenges: savingsChallengesSchema.parse(JSON.parse(RECORDS[SAVINGS_CHALLENGES_KEY]!)), priceAlerts: priceAlertsSchema.parse(JSON.parse(RECORDS[PRICE_ALERTS_KEY]!)), supplements: supplementsSchema.parse(JSON.parse(RECORDS[SUPPLEMENTS_KEY]!))};
const SHOW: LineData = lineData(showcase(), OPEN, {...base, ...MORE})!;
const BLANK: LineData = lineData(empty(), OPEN, {...base, debtPlanner: emptyDebtPlanner(), savingsChallenges: emptySavingsChallenges(), priceAlerts: emptyPriceAlerts(), supplements: emptySupplements()})!;
const line = (id: string, d: LineData = SHOW, lang: 'en' | 'nl' = 'en') => stageLine(id, undefined, d, lang, NOW);
const SPEAKS = NEW.filter(id => id !== 'hour-grid');

describe('each round-2 widget’s one line is its own selector’s figures (the Showcase’s fictional records)', () => {
  it('the day and the goals', () => {
    const m = matrixCard(SHOW.tasks!, SHOW.day), n = (q: string) => m.boxes.find(b => b.id === q)!.count;
    expect(line('priority-matrix')).toBe(`${n('do')} urgent and important, ${n('plan')} important, ${n('quick')} urgent, ${n('later')} neither; ${m.open} open tasks.`);
    expect(line('priority-matrix', SHOW, 'nl')).toMatch(/^\d+ dringend en belangrijk, \d+ belangrijk, \d+ dringend, \d+ geen van beide; \d+ open taken\.$/);
    expect(line('hour-grid')).toBeNull(); // a day's agenda is not in the line data: the widget is named
    expect(answerWords([{id: 'hour-grid'}], {}, 'en')).toBe('On the stage: Today by the hour.');
    expect(line('reviews')).toMatch(/^(Your weekly review is (due|started), for the week of .+|This week’s review is (done|skipped); the next review day is .+)\.$/);
    expect(line('reviews', SHOW, 'nl')).toMatch(/^(Je weekreview |De review van deze week )/);
    const ms = milestonesCard(SHOW.platform!);
    expect(line('milestones')).toMatch(ms.state === 'live' ? new RegExp(`^${ms.done} of ${ms.total} milestones ticked`) : /^No open goal has milestones yet\.$/);
  });
  it('the money read-outs: the page’s own figures; the payoff plan is a projection in words, never a promise', () => {
    const flow = cashFlowCard(SHOW.moneyLog!, DAY);
    expect(flow.state).toBe('live');
    expect(line('cash-flow')).toBe(`This month: ${flow.income} in, ${flow.spending} out; ${flow.net} more ${flow.netCents! > 0 ? 'in than out' : 'out than in'}.`);
    expect(line('cash-flow', SHOW, 'nl')).toMatch(/^Deze maand: .+ in, .+ uit; .+ meer (in dan uit|uit dan in)\.$/);
    const acc = accountsCard(SHOW.accounts!, DAY);
    expect(line('accounts')).toBe(`Accounts ${acc.assets}, debts ${acc.debts}: ${acc.net} together. Wealth’s holdings are not in this.`);
    expect(line('accounts', SHOW, 'nl')).toMatch(/^Rekeningen \$[\d,.]+, schulden \$[\d,.]+: samen \$[\d,.]+\. De bezittingen van Vermogen zitten hier niet in\.$/);
    const plan = debtPlanCard(SHOW.accounts!, SHOW.debtPlanner!, DAY);
    expect(plan.state).toBe('live');
    expect(line('debt-plan')).toBe(`With the figures you kept, your debts would be cleared by ${plan.plans[0]!.monthName}, highest rate first: a projection, not a promise.`);
    expect(line('debt-plan', SHOW, 'nl')).toMatch(/zouden je schulden tegen .+ zijn afgelost, hoogste rente eerst: een projectie, geen belofte\.$/);
    for (const lang of ['en', 'nl'] as const) expect(line('debt-plan', SHOW, lang)).not.toMatch(/\bwill\b|\bzal\b|\bzullen\b|guarantee|garantie/i);
    expect(line('savings-challenges')).toMatch(/^First home deposit: 52-week challenge, week 4 of 52, this week .+; \d+ of 52 covered; 1 more running\.$/);
    const alerts = priceAlertsCard(SHOW.priceAlerts!);
    expect(line('price-alerts')).toBe(`${alerts.waiting} price alert is waiting; the last one fired Nov 9.`);
    expect(line('price-alerts', SHOW, 'nl')).toMatch(/^1 prijsalert wacht; de laatste ging af op .+\.$/);
  });
  it('the Health read-outs, once the Health gate is open', () => {
    expect(line('health-trends')).toMatch(/^(.+: (up|down|about the same) over the last 90 days, .+ against .+ over the year|Not enough days yet for a trend: .+|Nothing is recorded for a trend yet)\.$/);
    expect(line('food-days')).toMatch(/^Food logged on \d+ of 11 days so far this month\.$/);
    expect(line('food-days', SHOW, 'nl')).toMatch(/^Eten gelogd op \d+ van de 11 dagen van deze maand tot nu toe\.$/);
    const running: LineData = {...SHOW, fasting: fastingSchema.parse({version: 1, sessions: [{id: 'f', startedAt: '2026-11-11T07:05:00.000Z', endedAt: null, targetHours: 16, timeZone: 'UTC'}]})};
    expect(line('fasting', running)).toBe('A fast is running: 7 h 00 min of 16 h.');
    expect(line('fasting', running, 'nl')).toBe('Er loopt een vastenperiode: 7 h 00 min van 16 uur.');
    expect(line('fasting')).toMatch(/^(A fast is running: .+|No fast is running(; the last one was [\d.]+ h, .+)?|No fast logged yet)\.$/);
    expect(line('meditation')).toMatch(/^(\d+ h \d{2} min|\d+ min) of meditation this week( of your \d+ min)?(; \d+ days in a row)?\.$/);
    expect(line('supplements')).toBe('Today: 1 of 2 doses taken, 1 not logged yet.');
    expect(line('supplements', SHOW, 'nl')).toBe('Vandaag: 1 van 2 doses genomen, 1 nog niet gelogd.');
  });
  it('every line is short: at most two sentences, no list, no record date, a full stop, in both languages', () => {
    for (const id of SPEAKS) for (const lang of ['en', 'nl'] as const) for (const d of [SHOW, BLANK]) {
      const text = line(id, d, lang);
      expect(text, `${id} ${lang}`).not.toBeNull();
      expect(text!, id).not.toMatch(/[•\n]|\b\d{4}-\d{2}-\d{2}\b|\b\d+\.\d{2} (EUR|USD)\b|\d\.\d+\s?%|SHOWCASE DATA/);
      expect(text!.length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(190);
      expect((text!.match(/[.!?](\s|$)/g) ?? []).length, `${id} ${lang}: ${text}`).toBeLessThanOrEqual(2);
      expect(text!, id).toMatch(/[.!?]$/);
    }
  });
});

describe('the cycle log is the most sensitive: its line never carries a figure', () => {
  it('whatever the log holds and whatever is asked, NOVA says only that the widget is on the stage', () => {
    expect(CYCLE_LINE_WORDS).toEqual({en: 'Your cycle widget is on the stage.', nl: 'Je cycluswidget staat op het podium.'});
    // Even with the cycle log handed over by mistake, the line is the same and holds none of it.
    const withLog = {...SHOW, cycle: showcaseCycle(DAY), nova: {cycle: showcaseCycle(DAY)}} as unknown as LineData;
    for (const d of [SHOW, BLANK, withLog]) for (const lang of ['en', 'nl'] as const) {
      const text = line('cycle', d, lang)!;
      expect(text).toBe(CYCLE_LINE_WORDS[lang]);
      expect(text).not.toMatch(/\d|day|dag \d|period|menstr|cramps/i);
    }
    expect(answerWords([{id: 'cycle'}], {cycle: line('cycle')!}, 'en')).toBe('Cycle: Your cycle widget is on the stage.');
  });
  it('closed, it is the locked sentence; a request for it is kept as "Health: Cycle", never the person’s words', () => {
    expect(stageLine('cycle', undefined, {...SHOW, gateOpen: id => widgetSpec(id)?.gate !== 'health'}, 'en', NOW)).toBe('Health is off for NOVA. Turn it on in Permissions to see this.');
    expect(keptAskWords('when is my next period, the last one started on the 2nd', [{id: 'cycle'}])).toBe('Health: Cycle');
    expect(keptAskWords('show my cycle log', [{id: 'cycle'}])).not.toMatch(/period|2nd/);
  });
});

describe('an empty profile teaches; unknown is never a zero', () => {
  it('each widget says what is not there yet, in words', () => {
    const teach: Record<string, RegExp> = {
      'priority-matrix': /^No open tasks\.$/, reviews: /^Your weekly review is due, for the week of /, milestones: /^You have no goals yet\.$/, 'cash-flow': /^Nothing is in your money log yet\.$/,
      accounts: /^No account or debt is kept yet\.$/, 'debt-plan': /^No debt with a balance is kept\.$/, 'savings-challenges': /^No savings challenge is running\.$/, 'price-alerts': /^No price alerts yet\.$/,
      'health-trends': /^Nothing is recorded for a trend yet\.$/, 'food-days': /^No food logged yet\.$/, fasting: /^No fast logged yet\.$/, meditation: /^No meditation logged yet\.$/, supplements: /^You keep track of no supplement yet\.$/,
    };
    for (const [id, re] of Object.entries(teach)) { const text = line(id, BLANK)!; expect(text, id).toMatch(re); expect(text, id).not.toMatch(/\b0\b|\$0|€0/); }
  });
  it('a record that was not read gives no line at all (the widget is then only named)', () => {
    const unread: LineData = {gateOpen: OPEN, day: DAY, healthDay: DAY};
    for (const id of SPEAKS.filter(x => x !== 'cycle')) expect(stageLine(id, undefined, unread, 'en', NOW), id).toBeNull();
    // Half of what a line needs is not enough either.
    expect(stageLine('debt-plan', undefined, {...unread, accounts: emptyAccounts()}, 'en', NOW)).toBeNull();
    expect(stageLine('savings-challenges', undefined, {...unread, savingsChallenges: emptySavingsChallenges(), moneyLog: emptyMoneyLog()}, 'en', NOW)).toBeNull();
    // A payoff plan with a figure missing says so without a date; with nothing kept it says that.
    expect(stageLine('debt-plan', undefined, {...SHOW, debtPlanner: emptyDebtPlanner()}, 'en', NOW)).toBe('No figures are kept for the payoff planner yet.');
    expect(stageLine('debt-plan', undefined, {...SHOW, debtPlanner: debtPlannerSchema.parse({version: 1, extra: '10.00'})}, 'en', NOW)).toBe('The payoff plan misses a figure; the widget says which.');
  });
});

describe('a line is held back by the widget’s own switch; Health stays Health’s (Q14, Q16, AM-S5)', () => {
  it('a closed switch gives the locked sentence and no figure, for every round-2 widget, in both languages', () => {
    const shut: LineData = {...SHOW, gateOpen: SHUT};
    for (const id of NEW) for (const lang of ['en', 'nl'] as const) {
      const text = stageLine(id, undefined, shut, lang, NOW);
      expect(text, id).toBe(lockedLine(widgetSpec(id)!.gate!, lang));
      expect(text, id).not.toMatch(/\d/);
    }
  });
  it('Health off, everything else on: the six Health read-outs are locked; the others speak', () => {
    const healthOff: LineData = {...SHOW, gateOpen: id => widgetSpec(id)?.gate !== 'health'};
    for (const id of HEALTH) expect(stageLine(id, undefined, healthOff, 'en', NOW), id).toBe('Health is off for NOVA. Turn it on in Permissions to see this.');
    expect(stageLine('accounts', undefined, healthOff, 'en', NOW)).toMatch(/^Accounts /);
    expect(stageLine('priority-matrix', undefined, healthOff, 'en', NOW)).toMatch(/open tasks\.$/);
  });
  it('a request for a Health read-out is kept by the widget’s name, never the person’s words', () => {
    const titles: Record<string, string> = {'health-trends': 'Health trends', 'food-days': 'Food-logging days', fasting: 'Fasting', meditation: 'Meditation', supplements: 'Supplements', cycle: 'Cycle'};
    for (const id of HEALTH) {
      const kept = keptAskWords('Fictional words 12345 about my body', [{id}]);
      expect(kept, id).toBe(`Health: ${titles[id]}`);
      expect(kept, id).not.toMatch(/12345|Fictional|body/);
    }
    expect(keptAskWords('show my debt payoff plan', [{id: 'debt-plan'}])).toBe('show my debt payoff plan');
    expect(WIDGETS.filter(w => w.gate === 'health').map(w => w.id)).toEqual(expect.arrayContaining([...HEALTH]));
  });
});
