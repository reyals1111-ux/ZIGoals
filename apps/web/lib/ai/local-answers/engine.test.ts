import {expect, test} from 'vitest';
import {createHabit} from '../../habits';
import {dailyData} from '../../health-daily';
import {toolEnv, type ToolSources} from '../tools/env';
import {DAY, gatesFor, SENTINEL, sentinelsIn, showcaseSources, withHandHealth, withPortfolios, withSentinels} from '../tools/fixtures';
import {HEALTH_CLOSED} from '../tools/format';
import {runTool} from '../tools/registry';
import {examplesReply, localAnswer, navigationIntent, type LocalReply} from './engine';
import {examplesFor} from './examples';
import {TONE_FORBIDDEN} from './words';

// Session V Part 3: lookups answered on the device from the tools, no AI. The Showcase day 2026-10-05 is a Monday.
const sources = (): ToolSources => withPortfolios(withHandHealth(showcaseSources()));
const open = (s: ToolSources = sources()) => toolEnv(s, gatesFor(true), 'local');
const shut = (s: ToolSources = sources()) => toolEnv(s, gatesFor(false), 'local');
const ask = (q: string, env = open()) => localAnswer(q, env);
const textOf = (r: LocalReply) => 'text' in r ? r.text : '';
const habit = (title: string) => showcaseSources().habits.habits.find(h => h.title === title)!;
const sum = (title: string, from: string, to: string) => habit(title).entries.filter(e => e.date >= from && e.date <= to && e.disposition === 'logged').reduce((s, e) => s + e.count, 0);

test('the brief\'s eight examples, answered with the figures the records hold', () => {
  expect(textOf(ask('How many minutes did I meditate this month?'))).toMatch(new RegExp(`^You logged ${sum('Meditate', '2026-10-01', DAY)} minutes of Meditate this month \\(Thu 1 Oct to Mon 5 Oct\\)\\.`));
  expect(textOf(ask('What\'s my longest reading streak?'))).toMatch(/^Your longest Read streak is \d+ days; the current one is \d+ days\.$/);
  const water = dailyData(sources().health).water.filter(w => w.date === '2026-10-04').reduce((s, w) => s + w.amountMilli / 1000, 0);
  expect(textOf(ask('How much water did I drink yesterday?'))).toMatch(new RegExp(`^You logged ${water.toLocaleString('en-US')} mL of water yesterday \\(Sun 4 Oct\\)`));
  const week = sources().health.activity.filter(a => a.date >= '2026-09-28' && a.date <= '2026-10-04'), days = new Set(week.map(a => a.date)).size;
  expect(textOf(ask('Average steps last week?'))).toContain(`You averaged ${Math.round(week.reduce((s, a) => s + a.steps, 0) / days).toLocaleString('en-US')} steps a day last week (Mon 28 Sep to Sun 4 Oct), over the ${days} days with steps recorded.`);
  expect(textOf(ask('How far am I on my Japan goal?'))).toMatch(/^Japan adventure: [\d.]+% of the target — [\d,]+\.\d{2} USD of [\d,]+\.\d{2} USD\./);
  const monday = ask('What did I eat on Monday?');
  expect(textOf(monday)).toMatch(new RegExp(`^You logged ${sources().health.diary.filter(e => e.date === DAY).length} items on Mon 5 Oct:\\n- Breakfast: `));
  const btc = sources().platform.positions.filter(p => p.asset === 'BTC' && !p.archivedAt);
  expect(textOf(ask('Total BTC I hold?'))).toMatch(new RegExp(`^You hold [\\d.]+ BTC in Wealth \\(${btc.length} holding${btc.length === 1 ? '' : 's'}\\)`));
  expect(textOf(ask('Total BTC I hold?'))).toContain('Portfolio (separate from Wealth): 0.05 BTC in your Real portfolio Long-term coins');
  expect(textOf(ask('Total BTC I hold?'))).not.toContain('Hypothetical');
  expect(textOf(ask('Did I hit my protein target this week?'))).toMatch(/^Your protein target is 120 g a day\. This week \(Mon 5 Oct\):\n- At or above it on \d+ days?/);
});
test('forty more phrasings across habits, Health, goals and wealth', () => {
  const env = open(withSentinels(sources()));
  const cases: [string, RegExp][] = [
    ['how many mins did i meditate last week', /^You logged \d+ minutes of Meditate last week/],
    ['How long did I meditate in September?', /^You logged \d+ minutes of Meditate in September 2026 \(Tue 1 Sep to Wed 30 Sep\)/],
    ['Minutes of reading this month?', /^You logged \d+ minutes of Read this month/],
    ['How many minutes did I exercise over the last 14 days?', /^You logged \d+ minutes of Exercise the last 14 days/],
    ['How many times did I exercise last week?', /^You checked in Exercise \d+ times last week/],
    ['How often did I meditate this month?', /^You checked in Meditate \d+ times this month/],
    ['What is my completion rate for reading this month?', /^Read this month \(Thu 1 Oct to Mon 5 Oct\): \d+%/],
    ['What\'s my current meditation streak?', /^Your current Meditate streak is \d+ days? \(longest: \d+ days?\)\.$/],
    ['best streak for exercise', /^Your longest Exercise streak is \d+ days?/],
    ['When did I last meditate?', /^You last checked in Meditate on Mon 5 Oct/],
    ['Did I meditate more this week than last week?', /^Meditate: \d+ minutes this week \(Mon 5 Oct\), and \d+ minutes last week/],
    ['Compare my reading this month vs last month', /^Read: \d+ minutes this month .*, and \d+ minutes last month/],
    ['Average minutes of reading per check-in this month?', /^On average [\d.]+ minutes per check-in for Read this month/],
    ['What was my best meditation day this month?', /^Your best Meditate day this month .* was \w{3} \d+ \w{3} with \d+ minutes\.$/],
    ['How many glasses of water did I drink yesterday?', /^Drink water: \d+ glasses yesterday \(Sun 4 Oct\)\.$/],
    ['How many minutes did I walk this month?', /^Walk isn't measured in time, so there are no minutes to add up\. It's measured in steps: [\d,]+ steps this month/],
    ['How much water did I drink today?', /^You logged [\d,]+ mL of water today \(Mon 5 Oct\)/],
    ['How much water did I drink this week?', /^You logged [\d,]+ mL of water this week/],
    ['Did I reach my water target last week?', /^Your daily water target is 2,000 mL\. Last week \(Mon 28 Sep to Sun 4 Oct\):/],
    ['Compare my water this week and last week', /^Water: [\d,]+ mL this week \(Mon 5 Oct\), and [\d,]+ mL last week/],
    ['How many steps did I take yesterday?', /^You logged [\d,]+ steps yesterday \(Sun 4 Oct\)\.$/],
    ['What was my best day for steps this month?', /^Your best day for steps this month .* with [\d,]+ steps\.$/],
    ['Did I hit my step goal last week?', /^Your daily step target is 8,000\. Last week/],
    ['How many active minutes last week?', /^You averaged [\d,]+ active minutes a day last week/],
    ['How many calories did I eat today?', /^Energy today \(Mon 5 Oct\): unknown|^Energy today \(Mon 5 Oct\): [\d,]+ kcal/],
    ['How much protein did I eat yesterday?', /^Protein yesterday \(Sun 4 Oct\): [\d.]+ g from \d+ diary entr(y|ies)\.$/],
    ['How much fat did I eat today?', /^Fat today \(Mon 5 Oct\): unknown \([\d.]+ g known; \d+ of \d+ entries known\)/],
    ['Average calories per day last week?', /^On average [\d,.]+ kcal of energy a day last week/],
    ['What did I eat yesterday?', /^You logged \d+ items yesterday \(Sun 4 Oct\):/],
    ['What did I have for breakfast on Friday?', /^You logged \d+ items on Fri 2 Oct:/],
    ['What is my weight?', /^Your latest weight is [\d.]+ lb, on Mon 5 Oct\./],
    ['How did my waist change this month?', /^Your body measurements this month .*:\n- Waist: 93\.7 cm on 2026-10-05/],
    ['When was my last fast?', /^Your last fast: 16 h on Sun 4 Oct \(target 16 h\)\./],
    ['How many push-ups this week?', /^Push-ups: \d+ on \d+ days? this week/],
    ['How many squats did I do this month?', /^Squats: \d+/],
    ['How much is left for my emergency fund?', /^Emergency fund: [\d,]+\.\d{2} USD to go \([\d.]+% of the target reached\)\.$/m],
    ['What is the progress of my first home deposit?', /^First home deposit: [\d.]+% of the target/],
    ['How much did I contribute this month?', /^Contributions this month \(Thu 1 Oct to Mon 5 Oct\), per currency \(never converted\):\n- [\d,]+\.\d{2} USD in/],
    ['How much did I put into my Japan goal last month?', /^Contributions to Japan adventure last month \(Tue 1 Sep to Wed 30 Sep\)/],
    ['What is my net worth?', /^Your tracked wealth, one total per currency \(never converted\): [\d,]+\.\d{2} USD and [\d,]+\.\d{2} EUR\./],
    ['How much ETH do I own?', /^You hold [\d.]+ ETH in Wealth/],
    ['how many bitcoin do i have', /^You hold [\d.]+ BTC in Wealth/],
    ['Hoeveel minuten mediteerde ik deze maand? how many minutes of meditate', /^You logged \d+ minutes of Meditate this month/],
  ];
  expect(cases.length).toBeGreaterThanOrEqual(40);
  for (const [question, expected] of cases) {
    const reply = ask(question, env);
    expect(reply.kind, question).toBe('answer');
    expect(textOf(reply), question).toMatch(expected);
    expect(textOf(reply), question).not.toMatch(TONE_FORBIDDEN);
    expect(reply.kind === 'answer' && reply.calls.length > 0, question).toBe(true);
  }
});
test('not lookups: advice, plans, logging and open questions go to the person\'s AI (T\'s own test phrases included)', () => {
  for (const q of ['Which habits are open?', 'What is open?', 'How is my day?', 'Hello', 'Still there?', 'Log 20 minutes of meditation', 'Mark Read done and skip Exercise', 'two glasses of water and two eggs with toast',
    'I ate two eggs and toast and drank two glasses', 'Add 2.5 ounces of gold coins worth 6200 dollars', 'How much protein should I eat?', 'Why do I skip reading on Sundays?', 'Help me with my weekly review', 'Which goal needs attention this month?',
    'What’s left for today?', 'How are my streaks?', 'How is my fasting going?', 'Summarise my tracked totals per currency', 'Plan my meals for next week', 'Is 8,000 steps enough?', 'Explain this page', 'Create a new habit', 'What can you help with here?'])
    expect(ask(q).kind, q).toBe('none');
});
test('two habits that match equally become choices, never a guess; a choice answers the original question', () => {
  let habits = showcaseSources().habits;
  for (const title of ['Stretch morning', 'Stretch evening']) habits = createHabit(habits, {title, category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${DAY}T07:00:00Z`));
  const env = open({...sources(), habits});
  const reply = localAnswer('What is my stretch streak?', env);
  expect(reply.kind).toBe('choices');
  expect(reply.kind === 'choices' && reply.choices.map(c => c.label).sort()).toEqual(['Stretch evening', 'Stretch morning']);
  const evening = reply.kind === 'choices' ? reply.choices.find(c => c.label === 'Stretch evening')! : null;
  expect(textOf(localAnswer('What is my stretch streak?', env, evening!.subject))).toMatch(/^Your current Stretch evening streak is 0 days/);
  // Two goals named alike, too.
  const goals = localAnswer('How far am I on my fund goal?', open({...sources(), platform: {...sources().platform, goals: [...sources().platform.goals, {...sources().platform.goals.find(g => g.name === 'Emergency fund')!, id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', name: 'Holiday fund'}]}}));
  expect(goals.kind).toBe('choices');
});
test('Health questions with the gate closed: the plain refusal, nothing read, and a habit offered when one matches', () => {
  const env = shut(withSentinels(sources()));
  expect(env.health).toBeNull();
  for (const q of ['How much water did I drink yesterday?', 'Average steps last week?', 'Did I hit my protein target this week?', 'What did I eat on Monday?', 'What is my weight?', 'When was my last fast?', 'How many push-ups this week?', 'How many calories did I eat today?', 'How did my waist change this month?']) {
    const reply = ask(q, env);
    expect(reply.kind, q).toBe('refusal'); expect(textOf(reply), q).toBe(HEALTH_CLOSED);
    expect(reply.kind === 'refusal' && reply.calls, q).toEqual([]);
    expect(sentinelsIn(JSON.stringify(reply)), q).toEqual([]);
  }
  const water = ask('How much water did I drink yesterday?', env);
  expect(water.kind === 'refusal' && water.choices?.map(c => c.label)).toEqual(['Drink water (habit)']);
  // Habits, goals and wealth still answer; a Health-filled check-in stays out of the habit's figures.
  expect(ask('How many minutes did I meditate this month?', env).kind).toBe('answer');
  expect(textOf(ask('How many steps did I walk today?', env))).toContain('filled in from Health is not counted');
  expect(textOf(ask('How many steps did I walk today?', env))).not.toContain(String(SENTINEL.habitValue));
});
test('Showcase records say they are fictional, a sensitive screen reads nothing, and every answer keeps a calm tone', () => {
  const reply = ask('How many minutes did I meditate this month?');
  expect(reply.kind).toBe('answer');
  const call = reply.kind === 'answer' ? reply.calls[0]! : null;
  const rerun = runTool(call!.tool, call!.args, open());
  expect(rerun.ok && rerun.provenance).toMatch(/^Fictional Showcase data · From your Habits journal on this device · Meditate · this month/);
  const paused = toolEnv(sources(), gatesFor(true, 'today', '/app', {sensitive: true}), 'local');
  expect(ask('How many minutes did I meditate this month?', paused)).toMatchObject({kind: 'refusal', text: 'Paused on this private screen: ZIGi reads nothing here.'});
});
test('without an AI: examples made from the person\'s records, each one answerable here', () => {
  const env = open();
  const examples = examplesFor(env);
  expect(examples.length).toBeGreaterThanOrEqual(5);
  expect(examples).toContain('How far am I on my Emergency fund goal?');
  for (const example of examples) expect(['answer', 'refusal', 'choices'], example).toContain(ask(example, env).kind);
  expect(examplesFor(shut()).some(e => /water|steps|protein|eat/.test(e))).toBe(false);
  expect(examplesReply(env)).toMatchObject({kind: 'examples', text: 'I answer questions about your own records right here, on this device, without any AI. For example:'});
  expect(examplesFor(null)).toEqual(['How many minutes did I meditate this month?', 'How far am I on my goals?', 'What is my net worth?']);
});
test('Session W Part 21: the new areas answer here, in calm words; a habit the question names keeps its answer', () => {
  // Health's sleep and mindful minutes, from the Showcase's fictional nights and sessions.
  expect(textOf(ask('How did I sleep last night?'))).toMatch(/^Last night: \d+ h \d+ min asleep, \d+ h \d+ min in bed, from \d\d:\d\d to \d\d:\d\d\./);
  expect(textOf(ask('What is my sleep debt?'))).toMatch(/^Over the last 7 days your sleep came to .+, across \d+ logged nights? \(your goal minus the time asleep, night by night\)\./);
  expect(textOf(ask('How many mindful minutes this week?'))).toMatch(/^\d+ min of meditation this week \(Mon 5 Oct\), over \d+ sessions?\.$/);
  // "meditation" still means the habit called Meditate (Session V's pins); a habit called Chess keeps "play chess".
  expect(textOf(ask('What is my meditation streak?'))).toMatch(/^Your current Meditate streak is \d+ days?/);
  const chessHabit = createHabit(sources().habits, {title: 'Chess', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${DAY}T08:00:00Z`));
  const withChess = open({...sources(), habits: chessHabit});
  expect(ask('How often did I play chess this month?', withChess).kind === 'answer' && (ask('How often did I play chess this month?', withChess) as {calls: {tool: string}[]}).calls.map(c => c.tool)).toEqual(['habit_stats']);
  expect(textOf(ask('What are my chess ratings?', withChess))).toMatch(/^Your ratings, as the sites published them: /);
  // Debts: one total per currency from the person's own balances; the accounts question lists everything.
  expect(textOf(ask('What do I owe?'))).toMatch(/^You owe [\d,]+\.\d\d USD across 2 debts, as entered on this device:\n- Car loan: /);
  expect(textOf(ask('What are my accounts and debts?'))).toMatch(/^Your accounts and debts on this device \(5 accounts\):/);
  expect(textOf(ask('What is my net worth?'))).toMatch(/\n- With your accounts and debts, your net worth is .+, never converted between currencies$/);
  // With Health closed the Health ones refuse before anything is read; the others still answer.
  for (const q of ['How did I sleep last night?', 'What is my sleep debt?', 'What was my resting heart rate this week?', 'Which devices do my records come from?']) expect(ask(q, shut()), q).toMatchObject({kind: 'refusal', text: HEALTH_CLOSED, calls: []});
  expect(ask('How many mindful minutes this week?', shut())).toMatchObject({kind: 'refusal', text: HEALTH_CLOSED});
  expect(ask('What do I owe?', shut()).kind).toBe('answer');
  // Not lookups: logging, statements and advice go to the person's AI.
  for (const q of ['Log 7 hours of sleep for last night', 'I slept badly last night', 'Should I go to bed earlier?', 'How can I improve my chess rating?', 'Start a 30 day reading challenge']) expect(ask(q).kind, q).toBe('none');
  for (const q of ['How did I sleep this week?', 'How consistent is my bedtime?', 'What do I owe?', 'How many chess games did I play this month?', 'How many links do I have?', 'What are my milestones?']) expect(textOf(ask(q)), q).not.toMatch(TONE_FORBIDDEN);
});

test('Session X-Local Part 6d: five asks the first model runs found unanswered here are answered on the device', () => {
  const totals = ask('What are my totals per currency?'); expect(totals.kind).toBe('answer'); expect(totals.kind === 'answer' && totals.calls.map(c => c.tool)).toContain('totals_per_currency');
  const portfolio = ask('What is my portfolio worth?'); expect(portfolio.kind).toBe('answer'); expect(textOf(portfolio)).toContain('own currency'); expect(portfolio.kind === 'answer' && portfolio.calls.map(c => c.tool)).toEqual(['portfolios']);
  const milestones = ask('Which milestones are done?'); expect(milestones.kind).toBe('answer'); expect(textOf(milestones)).toContain('of'); expect(milestones.kind === 'answer' && milestones.calls.map(c => c.tool)).toEqual(['milestones']);
  const streak = ask('What is my longest streak ever?'); expect(streak.kind).toBe('answer'); expect(textOf(streak)).toMatch(/^Your longest streak ever is \d+ days?: /); expect(streak.kind === 'answer' && streak.calls.every(c => c.tool === 'habit_stats')).toBe(true);
  // A habit named still gets its own answer; a question that is not a lookup still goes to the AI.
  expect(textOf(ask("What's my longest reading streak?"))).toContain('longest Read streak');
  expect(ask('Which colour should I paint the kitchen?').kind).toBe('none');
});
test("X-Cloud's H10 (S71): with records but no goal, the example list does not offer the goals question, and the goals question itself gets an answer", () => {
  const src = showcaseSources();
  const env = toolEnv({...src, platform: {...src.platform, goals: []}}, gatesFor(true, 'today', '/app'), 'local');
  expect(examplesFor(env)).not.toContain('How far am I on my goals?');
  const reply = localAnswer('How far am I on my goals?', env);
  expect(reply.kind).toBe('answer'); expect((reply as {text: string}).text).toContain('You have no goals yet');
  expect(localAnswer('How far am I on my goals?', toolEnv(src, gatesFor(true, 'today', '/app'), 'local')).kind).toBe('none');
});


// Session Z-Local Part 5: "open my sleep page" is answered on the device with an open-page card; lookups and logs are not navigation.
test('navigation asks become an open-page card on the device; a lookup, a log or a record keeps its own path', () => {
  expect(navigationIntent('Open my sleep page')).toEqual({page: 'health', view: 'sleep', label: 'Health → Sleep'});
  expect(navigationIntent('go to habits')).toEqual({page: 'habits', label: 'Habits'});
  expect(navigationIntent('Take me to my portfolio')).toEqual({page: 'portfolio', label: 'Portfolio'});
  expect(navigationIntent('ga naar mijn doelen')).toEqual({page: 'goals', label: 'Goals'});
  expect(navigationIntent('open de instellingen')).toEqual({page: 'settings', label: 'Settings'});
  expect(navigationIntent('open ZIGi settings')).toEqual({page: 'settings', view: 'zigi', label: 'Settings → ZIGi · Your Personal AI Companion'});
  expect(navigationIntent('Show my debts')).toBeNull();
  expect(navigationIntent('open my water log for yesterday')).toBeNull();
  expect(navigationIntent('Open a 16 hour fast')).toBeNull();
  const env = toolEnv(withPortfolios(withHandHealth(showcaseSources())), gatesFor(true), 'local');
  const reply = localAnswer('open my sleep page', env);
  expect(reply.kind).toBe('answer');
  if (reply.kind === 'answer') { expect(reply.text).toContain('Opening Health → Sleep'); expect(reply.text).toContain('"kind":"open-page"'); expect(reply.calls).toEqual([]); }
  expect(localAnswer('Delete my reading habit', env).kind).toBe('none');
});

// Session Z-Local Part 6 (ADR-020 L30): a question that also asks for an action is the model's turn, never the device's.
test('L30: a question that also asks for an action returns none, so the model proposes the card; the plain question is still answered here', () => {
  const env = open();
  for (const q of ['How much water have I had today, and log one more glass', "What's my walk streak? And mark today's walk as done", 'How far is the Japan goal, and add a note that I booked the hotel', 'How did I sleep this week? Last night was 23:40 to 7:20, log it', 'What was my weight last month, and log 78.0 kg for this morning', 'Hoeveel water heb ik vandaag gedronken, en log nog een glas', 'Wat is mijn wandelreeks? En vink mijn wandeling van vandaag af']) expect(localAnswer(q, env).kind, q).toBe('none');
  expect(localAnswer("What's my walk streak?", env).kind).not.toBe('none');
});
