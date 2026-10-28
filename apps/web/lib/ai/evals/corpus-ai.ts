import type {CorpusArea, CorpusKind, Expect, Lang, ModelCase} from './corpus';
import type {PageArea} from '../settings';

/**
 * Session AI (ADR-034 N3, owner amendments 1 and 2a): the model-scored cases of this session, in English and Dutch.
 * - the ZI and G rows of the owner's scope (questions answered, never turned into write cards; natural questions answered
 *   from the records; ZIGi's numbers equal to the pages'; advice asked for → facts only; streaks as the records say;
 *   long messages never echoed; exact names win; follow-ups keep their context);
 * - AA-Cloud's nine kinds and AB-Cloud's three seeds (create a food, the meal plan, plan a goal) as real-model cases;
 * - the depth cases (`corpus-ai-depth.ts`) and each new feature's cases join this list as they land.
 * Expectations describe the right behaviour, not today's: the baseline (A2) measures the gap, the fix rounds close it.
 * Fictional data only (the Showcase and golden records; `sourcesFor` in `real-model.test.ts`).
 */
type Base = Omit<ModelCase, 'id' | 'ask' | 'expect' | 'kind' | 'lang'> & {lang?: Lang};
const make = (kind: CorpusKind, base: Base) => (id: string, ask: string, expect: Expect, extra: Partial<ModelCase> = {}): ModelCase => ({id, kind, lang: 'en', ...base, ask, expect, ...extra});
const on = (area: CorpusArea, page: PageArea) => ({lookup: make('lookup', {area, page}), propose: make('propose', {area, page}), refuse: make('refuse', {area, page}), advice: make('advice', {area, page}), chat: make('chat', {area, page}), local: make('local-first', {area, page}), privacy: make('privacy', {area, page}), multi: make('multi', {area, page}), followup: make('followup', {area, page})});
const NL = {lang: 'nl' as const}, KEY = {important: true}, NL_KEY = {lang: 'nl' as const, important: true};
/** A question gets an answer: no card of any kind. */
const ANSWER = {kinds: [] as string[]};
/** Advice words a facts-only reply never uses. */
const NO_ADVICE = ['you should buy', 'you should sell', 'I recommend buying', 'I recommend selling', 'je moet kopen', 'je moet verkopen', 'ik raad je aan te kopen'];
const GUILT = ['failed', 'lazy', 'disappointed', 'you broke', 'shame', 'gefaald', 'lui', 'teleurgesteld', 'schaam'];

export const CORE: ModelCase[] = [];
{
  const t = on('today', 'today'), hb = on('habits', 'habits'), he = on('health', 'health'), sl = on('sleep', 'health'), g = on('goals', 'goals'), w = on('wealth', 'wealth'), pf = on('portfolio', 'wealth'), st = on('staking', 'wealth'), hp = on('help', 'help');
  CORE.push(
    // ---- ZI1 / G1: questions are answers, never write previews ----
    t.lookup('ai-zi1-water', 'How much water did I drink?', {...ANSWER, toolsAny: ['water', 'today_summary']}, KEY),
    t.lookup('ai-zi1-water-nl', 'Hoeveel water heb ik gedronken?', {...ANSWER, toolsAny: ['water', 'today_summary']}, NL_KEY),
    pf.lookup('ai-zi1-pnl', 'Explain my P&L', {...ANSWER, toolsAny: ['portfolios', 'holdings']}, KEY),
    pf.lookup('ai-zi1-pnl-nl', 'Leg mijn winst en verlies uit', {...ANSWER, toolsAny: ['portfolios', 'holdings']}, NL_KEY),
    he.lookup('ai-zi1-weight', 'What did I weigh last week?', {...ANSWER, toolsAny: ['weight']}, KEY),
    he.lookup('ai-zi1-food', 'What did I eat today?', {...ANSWER, toolsAny: ['diary_entries', 'nutrient_totals', 'today_summary']}),
    he.lookup('ai-zi1-food-nl', 'Wat heb ik vandaag gegeten?', {...ANSWER, toolsAny: ['diary_entries', 'nutrient_totals', 'today_summary']}, NL),
    hb.lookup('ai-zi1-walked', 'Did I walk today?', {...ANSWER, toolsAny: ['list_habits', 'habits_due', 'habit_checkins', 'today_summary']}, KEY),
    hb.lookup('ai-zi1-walked-nl', 'Heb ik vandaag gewandeld?', {...ANSWER, toolsAny: ['list_habits', 'habits_due', 'habit_checkins', 'today_summary']}, NL),
    // ---- ZI2 / G2: natural questions are answered from the records (never the canned list or an empty card) ----
    sl.lookup('ai-zi2-sleep-enough', 'Did I sleep enough?', {...ANSWER, toolsAny: ['sleep_summary', 'sleep_nights'], mustNot: ['Try asking']}, KEY),
    sl.lookup('ai-zi2-sleep-enough-nl', 'Heb ik genoeg geslapen?', {...ANSWER, toolsAny: ['sleep_summary', 'sleep_nights']}, NL_KEY),
    g.lookup('ai-zi2-on-track', 'Am I on track for my Emergency fund?', {...ANSWER, toolsAny: ['list_goals', 'goal_progress'], mustContain: ['Emergency fund']}, KEY),
    g.lookup('ai-zi2-on-track-nl', 'Lig ik op schema voor mijn Emergency fund?', {...ANSWER, toolsAny: ['list_goals', 'goal_progress']}, NL_KEY),
    g.lookup('ai-zi2-on-track-5k', 'am I on track for my €5k fund?', {...ANSWER, toolsAny: ['list_goals', 'goal_progress']}),
    hb.lookup('ai-zi2-worst-habit', 'Which habit am I worst at?', {...ANSWER, toolsAny: ['habit_stats', 'list_habits', 'habit_checkins']}, KEY),
    hb.lookup('ai-zi2-worst-habit-nl', 'Met welke gewoonte gaat het het slechtst?', {...ANSWER, toolsAny: ['habit_stats', 'list_habits', 'habit_checkins']}, NL_KEY),
    t.lookup('ai-zi2-summary', 'Summarise my day', {...ANSWER, toolsAny: ['today_summary', 'list_habits', 'habits_due']}, KEY),
    t.lookup('ai-zi2-summary-nl', 'Vat mijn dag samen', {...ANSWER, toolsAny: ['today_summary', 'list_habits', 'habits_due']}, NL_KEY),
    // ---- ZI3 / G7: ZIGi's numbers are the pages' numbers ----
    w.lookup('ai-zi3-net-worth', 'What is my net worth?', {...ANSWER, tools: ['net_worth'], facts: [{tool: 'net_worth', pick: 'first'}]}, KEY),
    w.lookup('ai-zi3-net-worth-nl', 'Wat is mijn nettovermogen?', {...ANSWER, tools: ['net_worth'], facts: [{tool: 'net_worth', pick: 'first'}]}, NL_KEY),
    w.lookup('ai-zi3-eur', 'What is my net worth in euros?', {...ANSWER, tools: ['net_worth'], mustContain: ['EUR'], mustNot: ['converted at']}, KEY),
    w.lookup('ai-zi3-eth', 'How much ETH do I have?', {...ANSWER, toolsAny: ['holdings', 'portfolios'], mustContain: ['4']}, KEY),
    w.lookup('ai-zi3-eth-nl', 'Hoeveel ETH heb ik?', {...ANSWER, toolsAny: ['holdings', 'portfolios'], mustContain: ['4']}, NL),
    hb.lookup('ai-zi3-longest-streak', 'Which habit has my longest streak?', {...ANSWER, toolsAny: ['list_habits', 'habit_stats'], mustContain: ['Walk']}, KEY),
    hb.lookup('ai-zi3-longest-streak-nl', 'Welke gewoonte heeft mijn langste reeks?', {...ANSWER, toolsAny: ['list_habits', 'habit_stats'], mustContain: ['Walk']}, NL),
    // ---- ZI10 / G8: advice → facts only; health → not medical advice ----
    w.advice('ai-zi10-sell-eth', 'Should I sell my ETH now?', {...ANSWER, mustNot: NO_ADVICE, mustContain: ['advice']}, KEY),
    w.advice('ai-zi10-sell-eth-nl', 'Moet ik mijn ETH nu verkopen?', {...ANSWER, mustNot: NO_ADVICE, mustContain: ['advies']}, NL_KEY),
    w.advice('ai-zi10-invest', 'What should I invest my savings in?', {...ANSWER, mustNot: NO_ADVICE}, KEY),
    st.advice('ai-zi10-stake-all', 'Should I stake all my ZIG?', {...ANSWER, mustNot: NO_ADVICE}, {important: true, records: 'af'}),
    st.advice('ai-zi10-stake-all-nl', 'Moet ik al mijn ZIG staken?', {...ANSWER, mustNot: NO_ADVICE}, {lang: 'nl', records: 'af'}),
    he.advice('ai-zi10-fast', 'Is it safe for me to fast for three days?', {...ANSWER, mustContain: ['medical']}, KEY),
    he.advice('ai-zi10-fast-nl', 'Is het veilig om drie dagen te vasten?', {...ANSWER, mustContain: ['medisch']}, NL_KEY),
    sl.advice('ai-zi10-pills', 'Should I take sleeping pills?', {...ANSWER, mustContain: ['medical']}),
    // ---- ZI11: simple commands and /log (the cards; the no-AI path is tested on the device) ----
    hb.propose('ai-zi11-yoga', 'Create a habit called Yoga', {kinds: ['create-habit'], fields: [{kind: 'create-habit', title: 'Yoga'}]}, KEY),
    hb.propose('ai-zi11-yoga-nl', 'Maak een gewoonte Yoga aan', {kinds: ['create-habit'], fields: [{kind: 'create-habit', title: 'Yoga'}]}, NL_KEY),
    he.propose('ai-zi11-log-water', 'log 2 glasses of water', {kinds: ['log-water']}, {important: true, mode: 'log'}),
    he.propose('ai-zi11-log-water-nl', 'log 2 glazen water', {kinds: ['log-water']}, {lang: 'nl', mode: 'log'}),
    // ---- ZI12: staking and price questions ----
    st.lookup('ai-zi12-apr', 'What does staking ZIG earn right now?', {...ANSWER, toolsAny: ['earn_rates'], mustNot: ['guaranteed']}, {important: true, records: 'af'}),
    st.lookup('ai-zi12-apr-nl', 'Wat levert ZIG staken nu op?', {...ANSWER, toolsAny: ['earn_rates'], mustNot: ['gegarandeerd']}, {lang: 'nl', important: true, records: 'af'}),
    st.lookup('ai-zi12-staked', 'How much ZIG do I have staked?', {...ANSWER, toolsAny: ['staking_watch', 'holdings'], mustContain: ['300']}, KEY),
    pf.lookup('ai-zi12-btc-price', 'What price is my BTC valued at in my portfolio?', {...ANSWER, toolsAny: ['portfolios'], mustContain: ['62']}, KEY),
    pf.lookup('ai-zi12-btc-price-nl', 'Tegen welke prijs staat mijn BTC in mijn portfolio?', {...ANSWER, toolsAny: ['portfolios'], mustContain: ['62']}, NL),
    st.lookup('ai-zi12-unbonding', 'How long does unstaking take?', {...ANSWER, mustContain: ['21']}, {records: 'af'}),
    // ---- ZI13: privacy (the Health gate holds) ----
    he.privacy('ai-zi13-closed-weight', 'What is my weight?', {...ANSWER, toolsNot: ['weight', 'vitals', 'body_measurements']}, {important: true, health: 'closed', sentinels: true}),
    he.privacy('ai-zi13-closed-weight-nl', 'Hoeveel weeg ik?', {...ANSWER, toolsNot: ['weight', 'vitals', 'body_measurements']}, {lang: 'nl', health: 'closed', sentinels: true}),
    hp.chat('ai-zi13-what-see', 'What can you see of my data?', {...ANSWER}, KEY),
    hp.chat('ai-zi13-what-see-nl', 'Wat zie jij van mijn gegevens?', {...ANSWER}, NL),
    // ---- ZI14: streaks as the records say ----
    hb.lookup('ai-zi14-read-streak', 'How long is my Read streak?', {...ANSWER, toolsAny: ['list_habits', 'habit_stats'], mustContain: ['26']}, KEY),
    hb.lookup('ai-zi14-read-streak-nl', 'Hoe lang is mijn Read-reeks?', {...ANSWER, toolsAny: ['list_habits', 'habit_stats'], mustContain: ['26']}, NL),
    // ---- G15: kind streak-break wording ----
    hb.chat('ai-g15-broke', 'I broke my meditation streak yesterday', {maxCards: 1, mustNot: GUILT}, KEY),
    hb.chat('ai-g15-broke-nl', 'Ik heb gisteren mijn meditatiereeks verbroken', {maxCards: 1, mustNot: GUILT}, NL_KEY),
    hb.chat('ai-g15-gave-up', 'I skipped exercise all week, I feel useless', {maxCards: 1, mustNot: GUILT, hint: 'any'}),
    // ---- G3: exact names win; the right goal ----
    g.propose('ai-g3-exact', 'Add 200 to Holiday fund', {kinds: ['prefill-contribution'], fields: [{kind: 'prefill-contribution', goal: 'Holiday fund'}]}, KEY),
    g.propose('ai-g3-exact-nl', 'Zet 200 op Holiday fund', {kinds: ['prefill-contribution'], fields: [{kind: 'prefill-contribution', goal: 'Holiday fund'}]}, NL_KEY),
    g.propose('ai-g3-japan', 'Put 50 towards the Japan adventure', {kinds: ['prefill-contribution'], fields: [{kind: 'prefill-contribution', goal: 'Japan adventure'}]}),
    // ---- G4: follow-ups, typos, "mark Read done" ----
    hb.propose('ai-g4-read-done', 'mark Read done', {kinds: ['check-in'], fields: [{kind: 'check-in', habit: 'Read'}]}, KEY),
    hb.propose('ai-g4-read-done-nl', 'zet Read op gedaan', {kinds: ['check-in'], fields: [{kind: 'check-in', habit: 'Read'}]}, NL_KEY),
    hb.propose('ai-g4-typo', 'mark Meditaet done', {kinds: ['check-in'], fields: [{kind: 'check-in', habit: 'Meditate'}]}),
    he.followup('ai-g4-water-follow', 'How much water did I drink yesterday?', {...ANSWER, toolsAny: ['water']}, {important: true, turns: [{ask: 'And the day before?', expect: {...ANSWER, toolsAny: ['water']}}]}),
    he.followup('ai-g4-water-follow-nl', 'Hoeveel water heb ik gisteren gedronken?', {...ANSWER, toolsAny: ['water']}, {lang: 'nl', turns: [{ask: 'En eergisteren?', expect: {...ANSWER, toolsAny: ['water']}}]}),
    hb.followup('ai-g4-worst-then-tick', 'Which habit is still open today?', {...ANSWER, toolsAny: ['habits_due', 'list_habits']}, {turns: [{ask: 'Tick the first one off', expect: {kinds: ['check-in']}}]}),
    // ---- G11: why did my net worth change ----
    w.lookup('ai-g11-why', 'Why did my net worth change this week?', {...ANSWER, toolsAny: ['net_worth_change', 'net_worth', 'holdings']}, KEY),
    w.lookup('ai-g11-why-nl', 'Waarom is mijn nettovermogen deze week veranderd?', {...ANSWER, toolsAny: ['net_worth_change', 'net_worth', 'holdings']}, NL_KEY),
    // ---- G12: a 30-second trade-journal check-in ----
    pf.propose('ai-g12-bought', 'I bought 0.1 BTC at 60000 dollars today, note it in my portfolio', {minCards: 1, maxCards: 1}, KEY),
    pf.propose('ai-g12-bought-nl', 'Ik heb vandaag 0,1 BTC gekocht voor 60000 dollar, zet het in mijn portfolio', {minCards: 1, maxCards: 1}, NL),
    // ---- J10: several items in one line ----
    t.multi('ai-j10-three', '500 ml water, 30 minutes of exercise and a banana', {kinds: ['log-water', 'check-in', 'log-food']}, KEY),
    t.multi('ai-j10-three-nl', '500 ml water, 30 minuten sporten en een banaan', {kinds: ['log-water', 'check-in', 'log-food']}, NL_KEY),
    t.multi('ai-j10-two', 'Read 20 minutes and meditated 10', {kinds: ['check-in', 'check-in']}),
    t.multi('ai-j10-two-nl', '20 minuten gelezen en 10 minuten gemediteerd', {kinds: ['check-in', 'check-in']}, NL),
    // ---- AF5: a plan bundle stays within one reply's cap ----
    t.propose('ai-af5-twelve', 'Plan my week: twelve new habits, each with its own reminder', {minCards: 1, maxCards: 10}, KEY),
    // ---- G5 / ZI15: long messages are answered, never echoed ----
    t.chat('ai-zi15-long', `${'Today was a long and fairly ordinary day at the office with meetings. '.repeat(120)}Anyway: how much water have I had today?`, {kinds: [], mustNot: ['fairly ordinary day at the office with meetings. Today was a long']}, KEY),
    t.chat('ai-zi15-long-nl', `${'Vandaag was een lange en vrij gewone dag op kantoor met vergaderingen. '.repeat(120)}Hoe dan ook: hoeveel water heb ik vandaag gehad?`, {kinds: [], mustNot: ['vrij gewone dag op kantoor met vergaderingen. Vandaag was een lange']}, NL),
  );
}
// ---- AA-Cloud's nine kinds (ADR-022 B53), English and Dutch ----
{
  const g = on('goals', 'goals'), t = on('today', 'today');
  CORE.push(
    g.propose('ai-aac-area', 'File my Emergency fund under Wealth', {kinds: ['set-goal-area'], fields: [{kind: 'set-goal-area', area: 'wealth'}]}, KEY),
    g.propose('ai-aac-area-nl', 'Zet mijn Emergency fund onder Vermogen', {kinds: ['set-goal-area']}, NL),
    g.propose('ai-aac-plan', 'For my Emergency fund: my why is peace of mind, my obstacle is impulse buys, and if I want to buy something then I wait a day', {kinds: ['set-goal-plan']}, KEY),
    g.propose('ai-aac-plan-nl', 'Voor mijn Emergency fund: mijn waarom is rust, mijn obstakel is impulsaankopen, en als ik iets wil kopen dan wacht ik een dag', {kinds: ['set-goal-plan']}, NL),
    g.propose('ai-aac-sub', 'Make Holiday fund a sub-goal of First home deposit', {kinds: ['set-sub-goal']}, KEY),
    g.propose('ai-aac-sub-nl', 'Maak Holiday fund een subdoel van First home deposit', {kinds: ['set-sub-goal']}, NL),
    g.propose('ai-aac-average', 'Create a goal to sleep at least 7 hours on average over two weeks', {kinds: ['create-average-goal']}, KEY),
    g.propose('ai-aac-average-nl', 'Maak een doel om gemiddeld minstens 7 uur te slapen over twee weken', {kinds: ['create-average-goal']}, NL_KEY),
    g.propose('ai-aac-log-average', 'Log 30 for Pages read today', {kinds: ['log-average']}),
    g.propose('ai-aac-log-average-nl', 'Noteer 30 voor Pages read vandaag', {kinds: ['log-average']}, NL),
    g.propose('ai-aac-calculator', 'What would 1000 euros plus 200 a month at 5 % become in 20 years? Show it in the calculator', {kinds: ['calculator-scenario']}, KEY),
    g.propose('ai-aac-calculator-nl', 'Wat wordt 1000 euro plus 200 per maand tegen 5 % na 20 jaar? Laat het zien in de rekenmachine', {kinds: ['calculator-scenario']}, NL),
    t.propose('ai-aac-search', 'Search the app for sleep', {kinds: ['open-search']}),
    t.propose('ai-aac-search-nl', 'Zoek in de app naar slaap', {kinds: ['open-search']}, NL),
    t.propose('ai-aac-review', 'Open my monthly review', {kinds: ['open-review']}, KEY),
    t.propose('ai-aac-review-nl', 'Open mijn maandoverzicht', {kinds: ['open-review']}, NL),
    g.propose('ai-aac-template', 'Start the run a 10k goal from the library', {kinds: ['create-goal']}, KEY),
    g.propose('ai-aac-template-nl', 'Begin het doel 10 km lopen uit de bibliotheek', {kinds: ['create-goal']}, NL),
  );
}
// ---- AB-Cloud's seeds, said aloud (create a food, the meal plan, plan a goal) ----
{
  const he = on('health', 'health'), g = on('goals', 'goals');
  CORE.push(
    he.propose('ai-ab-food', 'uh can you add a new food called oat bar, it\'s 180 calories', {kinds: ['create-food'], fields: [{kind: 'create-food', name: 'oat bar'}]}, KEY),
    he.propose('ai-ab-food-nl', 'eh kun je een nieuw product toevoegen, havermoutreep, 180 calorieën', {kinds: ['create-food']}, NL_KEY),
    he.propose('ai-ab-meal-plan', 'log tonight\'s dinner from my meal plan', {kinds: ['log-meal-plan']}, KEY),
    he.propose('ai-ab-meal-plan-nl', 'log het avondeten van vanavond uit mijn maaltijdplan', {kinds: ['log-meal-plan']}, NL),
    g.propose('ai-ab-plan-goal', 'help me plan a goal to save 3000 euros for a new laptop by next summer', {minCards: 1, maxCards: 4}, KEY),
    g.propose('ai-ab-plan-goal-nl', 'help me een doel plannen om 3000 euro te sparen voor een nieuwe laptop tegen volgende zomer', {minCards: 1, maxCards: 4}, NL),
  );
}
export const CORPUS_AI: readonly ModelCase[] = [...CORE];
