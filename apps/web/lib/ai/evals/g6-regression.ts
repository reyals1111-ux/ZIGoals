import type {CorpusArea, CorpusKind, Expect, ModelCase} from './corpus';
import type {PageArea} from '../settings';

/**
 * Session AI (ADR-034 N2; picklist 1 #21, the owner's G6): the ZIGi regression set — every suggested chip ZIGi shows
 * with an AI connected, and the checks over Session AI's fixes. It runs on every build in CI against a mock
 * (`g6-regression.test.ts`: the device-answered cases with no model at all, and the "bad reply" cases through the app's
 * own device rules with a canned weak reply), and with real models in Track A (`ZIGI_SET=g6`). 80 % is the launch gate,
 * 95 % the aim. The chip cases decide which chips may be shown (`lib/ai/prompt-gate.ts`, DE7/G2): a chip is shown only
 * once its case has passed on the real models.
 *
 * `chip` names the chip a case stands for (`starter:<text>` for a page's fixed chip, the data chip's id prefix
 * otherwise); `mock` is a canned weak reply the device rules must correct (CI only; the real models never see it).
 */
export type G6Case = ModelCase & {chip?: string; mock?: string};
const make = (kind: CorpusKind, area: CorpusArea, page: PageArea) => (id: string, ask: string, expect: Expect, extra: Partial<G6Case> = {}): G6Case => ({id, kind, area, page, lang: 'en', ask, expect, important: true, ...extra});
const ANSWER = {kinds: [] as string[]};
const VAGUE: Expect = {maxCards: 0, mustContain: ['?']};
const block = (json: string) => `\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
const starter = (text: string) => ({chip: `starter:${text}`});

export const G6: G6Case[] = [];
// ---- every chip a page shows with an AI connected (starters and the data chips the Showcase makes) ----
{
  const t = make('lookup', 'today', 'today'), tp = make('propose', 'today', 'today'), tc = make('chat', 'today', 'today');
  const g = make('lookup', 'goals', 'goals'), gc = make('chat', 'goals', 'goals');
  const h = make('lookup', 'habits', 'habits'), hp = make('propose', 'habits', 'habits'), hc = make('chat', 'habits', 'habits');
  const he = make('lookup', 'health', 'health'), hep = make('propose', 'health', 'health'), hec = make('chat', 'health', 'health');
  const w = make('lookup', 'wealth', 'wealth'), wc = make('chat', 'wealth', 'wealth');
  const hl = make('chat', 'help', 'help');
  G6.push(
    t('ai-g6-chip-today-left', 'What’s left for today?', {...ANSWER, toolsAny: ['habits_due', 'today_summary', 'list_habits', 'checklist_today']}, starter('What’s left for today?')),
    tc('ai-g6-chip-today-review', 'Help me with my weekly review', {maxCards: 3}, starter('Help me with my weekly review')),
    tp('ai-g6-chip-today-water', 'Log a glass of water', {kinds: ['log-water']}, starter('Log a glass of water')),
    tc('ai-g6-chip-today-help', 'What can you help with here?', ANSWER, starter('What can you help with here?')),
    g('ai-g6-chip-goals-month', 'How am I doing on my goals this month?', {...ANSWER, toolsAny: ['list_goals', 'goal_progress', 'goal_contributions']}, starter('How am I doing on my goals this month?')),
    g('ai-g6-chip-goals-dates', 'Which dates are coming up?', {...ANSWER, toolsAny: ['list_goals', 'milestones', 'goal_progress']}, starter('Which dates are coming up?')),
    gc('ai-g6-chip-goals-shape', 'Help me shape a new goal', {maxCards: 1}, starter('Help me shape a new goal')),
    gc('ai-g6-chip-goals-note', 'Add a note to a goal', VAGUE, starter('Add a note to a goal')),
    hp('ai-g6-chip-habits-morning', 'Log my morning habits', {minCards: 1, maxCards: 4}, starter('Log my morning habits')),
    h('ai-g6-chip-habits-open', 'Which habits are still open today?', {...ANSWER, toolsAny: ['habits_due', 'list_habits', 'today_summary']}, starter('Which habits are still open today?')),
    h('ai-g6-chip-habits-streaks', 'How are my streaks?', {...ANSWER, toolsAny: ['list_habits', 'habit_stats']}, starter('How are my streaks?')),
    hc('ai-g6-chip-habits-create', 'Create a new habit', VAGUE, starter('Create a new habit')),
    hec('ai-g6-chip-health-ate', 'Log what I ate — I’ll say it', {maxCards: 0}, starter('Log what I ate — I’ll say it')),
    he('ai-g6-chip-health-logged', 'What did I log today?', {...ANSWER, toolsAny: ['diary_entries', 'today_summary', 'nutrient_totals', 'water']}, starter('What did I log today?')),
    hep('ai-g6-chip-health-water', 'Add a glass of water', {kinds: ['log-water']}, starter('Add a glass of water')),
    he('ai-g6-chip-health-fasting', 'How is my fasting going?', {...ANSWER, toolsAny: ['fasting']}, starter('How is my fasting going?')),
    w('ai-g6-chip-wealth-totals', 'Summarise my tracked totals per currency', {...ANSWER, toolsAny: ['totals_per_currency', 'holdings', 'net_worth']}, starter('Summarise my tracked totals per currency')),
    w('ai-g6-chip-wealth-changed', 'What changed recently?', {...ANSWER, toolsAny: ['net_worth_change', 'recent_activity', 'holdings', 'totals_per_currency']}, starter('What changed recently?')),
    wc('ai-g6-chip-wealth-add', 'Add a holding I own', VAGUE, starter('Add a holding I own')),
    w('ai-g6-chip-wealth-explain', 'Explain this page', ANSWER, starter('Explain this page')),
    hl('ai-g6-chip-help-data', 'How does ZIGoals keep my data?', ANSWER, starter('How does ZIGoals keep my data?')),
    hl('ai-g6-chip-help-what', 'What can you do here?', ANSWER, starter('What can you do here?')),
    hl('ai-g6-chip-help-connect', 'How do habits and goals connect?', ANSWER, starter('How do habits and goals connect?')),
    hl('ai-g6-chip-help-off', 'How do I turn you off?', ANSWER, starter('How do I turn you off?')),
    // The data chips (their words carry the person's own figures; the Showcase's are used here).
    h('ai-g6-chip-data-challenge', 'Day 1 of 30 for Stretch morning — how is my challenge going?', {...ANSWER, toolsAny: ['challenges', 'list_habits', 'habit_stats']}, {chip: 'challenge'}),
    h('ai-g6-chip-data-open', '5 habits are still open today — which first?', {...ANSWER, toolsAny: ['habits_due', 'list_habits', 'today_summary']}, {chip: 'open-today'}),
    h('ai-g6-chip-data-streak', 'Contribute streak is 27 days — how do I keep it going?', {maxCards: 1, toolsAny: ['list_habits', 'habit_stats']}, {chip: 'streak'}),
    g('ai-g6-chip-data-goal', 'You\'re 65% to First home deposit — what\'s left?', {...ANSWER, toolsAny: ['list_goals', 'goal_progress'], mustContain: ['First home deposit']}, {chip: 'goal'}),
    make('lookup', 'sleep', 'health')('ai-g6-chip-data-sleep', '6 nights logged this week — how did I sleep?', {...ANSWER, toolsAny: ['sleep_summary', 'sleep_nights']}, {chip: 'sleep-week'}),
    w('ai-g6-chip-data-currencies', 'My wealth is in 2 currencies — what are the totals?', {...ANSWER, toolsAny: ['totals_per_currency', 'net_worth', 'holdings'], mustNot: ['converted at']}, {chip: 'currencies'}),
    w('ai-g6-chip-data-unpriced', '2 holdings have no price — which ones?', {...ANSWER, toolsAny: ['holdings', 'totals_per_currency']}, {chip: 'unpriced'}),
    w('ai-g6-chip-data-owe', '2 debts in your accounts — what do I owe?', {...ANSWER, toolsAny: ['accounts', 'net_worth']}, {chip: 'owe'}),
    make('lookup', 'portfolio', 'wealth')('ai-g6-chip-data-portfolios', 'How are my portfolios split?', {...ANSWER, toolsAny: ['portfolios']}, {chip: 'portfolios'}),
    make('lookup', 'staking', 'wealth')('ai-g6-chip-data-staking', 'What am I watching on staking?', {...ANSWER, toolsAny: ['staking_watch', 'holdings']}, {chip: 'staking'}),
  );
}
// ---- the fixes: answered on the device (no model; scored the same in CI and in Track A) ----
{
  const l = (area: CorpusArea, page: PageArea) => make('local-first', area, page);
  G6.push(
    l('sleep', 'health')('ai-g6-dev-sleep-enough', 'Did I sleep enough?', {localFirst: true, mustContain: ['not medical advice']}),
    l('sleep', 'health')('ai-g6-dev-sleep-enough-nl', 'Heb ik genoeg geslapen?', {localFirst: true, mustContain: ['geen medisch advies']}, {lang: 'nl'}),
    l('goals', 'goals')('ai-g6-dev-on-track', 'Am I on track for my Emergency fund?', {localFirst: true, mustContain: ['Emergency fund: 45%']}),
    l('goals', 'goals')('ai-g6-dev-on-track-unknown', 'am I on track for my €5k fund?', {localFirst: true, mustContain: ['could not find a goal']}),
    l('goals', 'goals')('ai-g6-dev-on-track-nl', 'Lig ik op schema voor mijn Emergency fund?', {localFirst: true, mustContain: ['Ten opzichte van je plan']}, {lang: 'nl'}),
    l('habits', 'habits')('ai-g6-dev-worst-habit', 'Which habit am I worst at?', {localFirst: true, mustContain: ['lowest completion'], mustNot: ['fail', 'lazy']}),
    l('today', 'today')('ai-g6-dev-summary', 'Summarise my day', {localFirst: true}),
    l('portfolio', 'wealth')('ai-g6-dev-price', 'What is the price of BTC?', {localFirst: true, mustContain: ['CoinGecko', 'not advice']}),
    l('wealth', 'wealth')('ai-g6-dev-why', 'Why did my net worth change this week?', {localFirst: true, mustContain: ['Wealth chart']}),
    l('help', 'help')('ai-g6-dev-what-see', 'What can you see of my data?', {localFirst: true, mustContain: ['Nothing is changed without your OK']}),
    l('habits', 'habits')('ai-g6-dev-streak', 'How long is my Read streak?', {localFirst: true, mustContain: ['26 days']}),
    l('habits', 'habits')('ai-g6-dev-longest', 'Which habit has my longest streak?', {localFirst: true, mustContain: ['Walk']}),
    l('wealth', 'wealth')('ai-g6-dev-net-worth', 'What is my net worth?', {localFirst: true, mustContain: ['never converted']}),
    l('today', 'today')('ai-g6-dev-water', 'How much water did I drink?', {localFirst: true}),
  );
}
// ---- the fixes: a weak model's reply the device rules must correct (CI scores the canned reply; real models get the ask) ----
{
  const WATER = block('{"kind":"log-water","glasses":1,"day":"today"}'), HOLDING = block('{"kind":"prefill-holding","category":"crypto","name":"Bitcoin","quantity":"0.1"}');
  const q = (area: CorpusArea, page: PageArea) => make('lookup', area, page), a = (area: CorpusArea, page: PageArea) => make('advice', area, page);
  G6.push(
    q('health', 'health')('ai-g6-rule-water-question', 'How much water did I drink?', ANSWER, {mock: `You have had 4 glasses today.${WATER}`}),
    q('health', 'health')('ai-g6-rule-water-question-nl', 'Hoeveel water heb ik gedronken?', ANSWER, {lang: 'nl', mock: `Je hebt vandaag 4 glazen gedronken.${WATER}`}),
    q('portfolio', 'wealth')('ai-g6-rule-pnl', 'Explain my P&L', ANSWER, {mock: `Your P&L is the change in value since you bought.${WATER}`}),
    q('portfolio', 'wealth')('ai-g6-rule-pnl-nl', 'Leg mijn winst en verlies uit', ANSWER, {lang: 'nl', mock: `Je winst en verlies is de verandering in waarde.${WATER}`}),
    q('sleep', 'health')('ai-g6-rule-sleep', 'Did I sleep enough last week?', ANSWER, {mock: `You averaged 6 h 44 min.${block('{"kind":"log-sleep","day":"today","bedtime":"23:00","wake":"07:00"}')}`}),
    q('habits', 'habits')('ai-g6-rule-walked', 'Did I walk today?', ANSWER, {mock: `Yes, 8,000 steps.${block('{"kind":"check-in","habit":"Walk","day":"today"}')}`}),
    a('wealth', 'wealth')('ai-g6-rule-buy-btc', 'Buy 0.1 BTC for me', {kinds: [], refuse: true}, {mock: `I can't buy anything for you; ZIGoals never moves money.${HOLDING}`}),
    a('wealth', 'wealth')('ai-g6-rule-sell-nl', 'Verkoop mijn ETH', {kinds: [], refuse: true}, {lang: 'nl', mock: `Dat kan ik niet: ZIGoals verplaatst nooit geld.${HOLDING}`}),
    make('propose', 'health', 'health')('ai-g6-rule-polite', 'Can you log a glass of water?', {kinds: ['log-water']}, {mock: `Here it is.${WATER}`}),
    make('propose', 'health', 'health')('ai-g6-rule-question-then-command', 'How much water did I drink? Log another glass.', {kinds: ['log-water']}, {mock: `4 glasses so far; here is one more.${WATER}`}),
    make('chat', 'today', 'today')('ai-g6-rule-long', `${'Notes from a long day at work and nothing else of note. '.repeat(150)}How much water today?`, {kinds: [], mustNot: ['Notes from a long day at work and nothing else of note. Notes from']}, {mock: 'You have had no water logged today.'}),
  );
}
