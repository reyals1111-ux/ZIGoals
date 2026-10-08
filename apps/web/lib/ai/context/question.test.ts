import {expect, test} from 'vitest';
import {bridgePrompt} from '../bridge';
import {gatesFor, SENTINEL, sentinelsIn, settingsWith, showcaseSources, withHandHealth, withSentinels} from '../tools/fixtures';
import {HEALTH_CLOSED} from '../tools/format';
import {buildPageContext} from './builders';
import {consent} from './consent';
import {QUESTION_HEADING, questionCalls, questionContext} from './question';
import {buildSystemPrompt, DATA_CLOSE, DATA_OPEN} from './specialists';

// Session V Part 4: the owner's finding. On Health, "How many minutes did I meditate this month?" must bring the
// Meditate habit's figures for this month, on every path that leaves the device: the copy, the action-block system
// prompt and, from Part 6, the tool path.
const OWNER = 'How many minutes did I meditate this month?';
const healthPage = (health: boolean) => gatesFor(health, 'health', '/app/health');
const meditate = () => showcaseSources().habits.habits.find(h => h.title === 'Meditate')!;
const minutes = () => meditate().entries.filter(e => e.date >= '2026-10-01' && e.date <= '2026-10-05' && e.disposition === 'logged').reduce((s, e) => s + e.count, 0);

test('the owner\'s scenario: on Health, the meditation question brings Meditate\'s minutes for this month', () => {
  for (const health of [false, true]) {
    const chosen = questionContext(OWNER, showcaseSources(), healthPage(health))!;
    expect(chosen.sources.map(s => s.label)).toEqual(['Meditate · this month']);
    expect(chosen.text.startsWith(QUESTION_HEADING)).toBe(true);
    expect(chosen.text).toContain(`"valueText":"${minutes()} minutes"`);
    expect(chosen.text).toContain('"range":{"from":"2026-10-01","to":"2026-10-05","label":"this month"}');
    expect(chosen.handles.some(h => h.kind === 'habit' && h.label === 'Meditate')).toBe(true);
  }
});
test('the same records on the copy path and the action-block path, inside the data marks, never as instructions', () => {
  const s = showcaseSources(), gates = healthPage(false), chosen = questionContext(OWNER, s, gates)!;
  const page = buildPageContext({area: 'health', pathname: '/app/health', consent: consent({settings: settingsWith(false), area: 'health', pathname: '/app/health', layoutHasHealth: true, accountActive: false, accountHealthPermitted: null}), now: s.now, habitDay: s.habitDay, healthDay: s.healthDay, habits: s.habits, health: s.health, fasting: s.fasting, platform: s.platform, localGoals: [], metadata: {}, quotes: [], portfolio: null});
  const copied = bridgePrompt({context: page.text ? page : null, question: OWNER, questionData: chosen.text});
  expect(copied).toContain('Below is a copy of what my page shows right now and the records for my question, then my question.');
  expect(copied.indexOf(QUESTION_HEADING)).toBeGreaterThan(copied.indexOf(DATA_OPEN)); expect(copied.indexOf(QUESTION_HEADING)).toBeLessThan(copied.lastIndexOf(DATA_CLOSE));
  expect(copied).toContain(`"valueText":"${minutes()} minutes"`);
  expect(copied.endsWith(`My question: ${OWNER}`)).toBe(true);
  // Without question records the prompt is T's, word for word.
  expect(bridgePrompt({context: null, question: 'Hi'})).toContain('Below is a copy of what my page shows right now, then my question.');
  const system = buildSystemPrompt({area: 'health', context: [page.text, chosen.text].filter(Boolean).join('\n\n'), customInstructions: '', providerName: 'Mock'});
  expect(system.indexOf(QUESTION_HEADING)).toBeGreaterThan(system.indexOf(DATA_OPEN)); expect(system).toContain(`"valueText":"${minutes()} minutes"`);
});
test('advice questions still bring the records they name; lookups bring their own tools', () => {
  const gates = gatesFor(false, 'today', '/app');
  expect(questionContext('Help me meditate more this month', showcaseSources(), gates)!.sources.map(s => s.label)).toEqual(['Meditate · this month']);
  expect(questionContext('Should I read more than last week?', showcaseSources(), gates)!.sources.map(s => s.label)).toEqual(['Read · last week']);
  expect(questionContext('Any tips to reach my Japan goal sooner?', showcaseSources(), gates)!.sources.map(s => s.label)).toEqual(['Goal · Japan adventure']);
  // Session W Part 21 (deliberate): with accounts and debts on the device (the Showcase has them), net worth joins the total.
  expect(questionCalls('What is my net worth?', showcaseSources(), gates).map(c => c.tool)).toEqual(['totals_per_currency', 'net_worth']);
  expect(questionCalls('What is my net worth?', showcaseSources(undefined, {accounts: null}), gates).map(c => c.tool)).toEqual(['totals_per_currency']);
  expect(questionContext('Hello there', showcaseSources(), gates)).toBeNull();
});
test('Health stays out when its gate is closed: listed as not included, no sentinel anywhere', () => {
  const s = withHandHealth(withSentinels(showcaseSources()));
  for (const q of ['How much water did I drink yesterday?', 'Help me eat more protein this week', 'Any tips for my steps?', 'What did I eat today?', `How are my ${SENTINEL.counter} going?`, 'How many steps did I walk today?']) {
    const chosen = questionContext(q, s, healthPage(false));
    expect(sentinelsIn(JSON.stringify(chosen)), q).toEqual([]);
  }
  const water = questionContext('How much water did I drink yesterday?', s, healthPage(false))!;
  // The habit the question names is not Health data and may go; the Health water journal may not. Part 8: the person's
  // notes go first, without the one tagged health (the sentinel note), since the gate is closed.
  expect(water.sources.map(x => x.call.tool)).toEqual(['about_me', 'habit_stats']); expect(water.sources[1]!.label).toBe('Drink water · yesterday');
  expect(water.sources[0]!.label).toBe('About me · 1 note'); expect(water.sources[0]!.text).toContain('Prefers short answers in the morning');
  expect(water.withheld).toEqual([HEALTH_CLOSED]);
  // The control: with the gate open the same question carries the values.
  expect(questionContext('How much water did I drink today?', s, healthPage(true))!.text).toContain(String(SENTINEL.waterMl));
});
test('a removed chip leaves the payload; Settings, sensitive screens and a disconnected ZIGi add nothing', () => {
  const s = showcaseSources(), gates = gatesFor(false, 'today', '/app');
  const both = questionContext('Help me with meditation and reading this month', s, gates)!;
  expect(both.sources.map(x => x.label)).toEqual(['Read · this month', 'Meditate · this month']);
  const without = questionContext('Help me with meditation and reading this month', s, gates, [], new Set([both.sources[0]!.id]))!;
  expect(without.sources.map(x => x.label)).toEqual(['Meditate · this month']); expect(without.text).not.toContain('"habit":"Read"');
  expect(questionContext(OWNER, s, gatesFor(true, 'help', '/app/settings'))).toBeNull();
  expect(questionContext(OWNER, s, gatesFor(true, 'today', '/app', {sensitive: true}))).toBeNull();
  expect(questionContext(OWNER, s, gatesFor(true, 'today', '/app', {settings: settingsWith(true, {enabled: false})}))).toBeNull();
  // An area whose switch is off is left out and said so.
  const noHabits = gatesFor(true, 'today', '/app', {settings: settingsWith(true, {pageShare: {...settingsWith(true).pageShare, habits: false}})});
  expect(questionContext(OWNER, s, noHabits)!.withheld[0]).toMatch(/^Habits isn't shared with ZIGi here/);
});

test('Session W Part 21: the new areas bring their own records; Health ones only through the Health gate', () => {
  const s = withHandHealth(withSentinels(showcaseSources())), open = healthPage(true), closed = healthPage(false), today = gatesFor(false, 'today', '/app');
  // Advice questions are not lookups, so the records they name come from the question's subjects.
  const sleep = questionContext('Any tips to sleep better this week?', s, open)!;
  expect(sleep.sources.map(x => x.call.tool)).toContain('sleep_summary');
  const shut = questionContext('Any tips to sleep better this week?', s, closed)!;
  expect(shut.sources.map(x => x.call.tool)).not.toContain('sleep_summary'); expect(shut.withheld).toContain(HEALTH_CLOSED);
  expect(sentinelsIn(JSON.stringify(shut)), 'sleep with the gate closed').toEqual([]);
  // A habit the question names keeps "meditate" for itself; mindful minutes are Health's.
  expect(questionCalls('Help me meditate more this month', s, open).map(c => c.tool)).toEqual(['habit_stats']);
  expect(questionCalls('Help me get more mindful minutes', s, open).map(c => c.tool)).toEqual(['meditation_summary']);
  expect(questionCalls('Should I pay off my debts sooner?', s, today).map(c => c.tool)).toEqual(['net_worth']);
  expect(questionCalls('Any tips for my chess?', s, today).map(c => c.tool)).toEqual(['chess_ratings']);
  expect(questionCalls('Help me with my challenges', s, today).map(c => c.tool)).toEqual(['challenges']);
  expect(questionCalls('Should I add milestones to my Japan goal?', s, today).map(c => c.tool)).toEqual(['goal_progress', 'milestones']);
});
test('Phase 2: an ask to add a widget or a link is a card, not a lookup — nothing is pre-run for it; the lookup it resembles still is', () => {
  const gates = gatesFor(true, 'today', '/app');
  for (const ask of ['Add a water widget to Today', 'Voeg een waterwidget toe aan Vandaag', "Ajoute un widget eau sur Aujourd'hui", 'Add a link to my running club https://example.org/club']) expect(questionCalls(ask, showcaseSources(), gates), ask).toEqual([]);
  expect(questionCalls('How much water today?', showcaseSources(), gates).map(c => c.tool)).toContain('water');
  expect(questionCalls('How many links do I have on Today?', showcaseSources(), gates).map(c => c.tool)).toContain('links_count');
});

