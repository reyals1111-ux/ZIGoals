import type {CorpusArea, CorpusKind, Expect, Lang, ModelCase} from './corpus';
import type {PageArea} from '../settings';

/**
 * Session AA-Local Part 5: the new-features set, in English and Dutch, over the Showcase as Part 7 leaves it: the
 * time-of-day sections, the timer, skips with a reason, notes and moods, routines, areas, the quit habit's cost,
 * freezes, the game layer, micronutrient targets, macro modes, the coach's answer, pasted recipes, the planner and the
 * new pages. Every expectation names a card the planner accepts on the Showcase (ADR-020 L50's rule) or a refusal the
 * protocol asks for. Scored by the harness with `ZIGI_SET=aa`.
 */
type Base = Omit<ModelCase, 'id' | 'ask' | 'expect' | 'kind' | 'lang'> & {lang?: Lang};
const make = (kind: CorpusKind, base: Base) => (id: string, ask: string, expect: Expect, extra: Partial<ModelCase> = {}): ModelCase => ({id, kind, lang: 'en', ...base, ask, expect, ...extra});
const on = (area: CorpusArea, page: PageArea) => ({propose: make('propose', {area, page}), refuse: make('refuse', {area, page}), local: make('local-first', {area, page}), lookup: make('lookup', {area, page}), chat: make('chat', {area, page})});
export const AA: ModelCase[] = [];
function add(...cases: ModelCase[]) { AA.push(...cases); }
{
  const hb = on('habits', 'habits'), h = on('health', 'health'), t = on('today', 'today'), st = on('settings', 'help');
  add(
    // H1 time-of-day sections
    hb.propose('aa-tod-morning', 'Move my Walk habit to the morning', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'morning'}]}, {important: true}), // A3-r1: Read already sits in the morning (Part 7); Walk sits in the afternoon
    hb.propose('aa-tod-evening-nl', 'Zet Lezen in de avond', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'evening'}]}, {lang: 'nl', important: true}),
    hb.propose('aa-tod-anytime', 'Read can be any time of day, not just mornings', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'anytime'}]}), // the Showcase's Read sits in the morning (Part 7); S1 showed the earlier ask named a habit already set to any time
    // H2 the timer
    hb.propose('aa-timer-start', 'Start the timer on my reading', {kinds: ['start-timer']}, {important: true}),
    hb.propose('aa-timer-start-nl', 'Start de timer voor Exercise', {kinds: ['start-timer']}, {lang: 'nl'}),
    hb.propose('aa-timer-stop', 'Stop the exercise timer and log it', {kinds: ['stop-timer']}, {important: true}),
    hb.propose('aa-timer-discard-nl', 'Stop de leestimer zonder te loggen', {kinds: ['stop-timer'], fields: [{kind: 'stop-timer', log: false}]}, {lang: 'nl'}),
    hb.chat('aa-timer-not-duration', 'Start a timer on my water habit', {kinds: [], mustContain: ['timer']}), // Drink water counts glasses: no card, and the reply says so in its own words (S1: both models explained without the refusal cue words)
    // H4 skip with a reason, note and mood
    hb.propose('aa-skip-reason', 'Skip the walk today, I am travelling', {kinds: ['skip'], fields: [{kind: 'skip', reason: {anyOf: ['travelling', 'Travelling', 'traveling']}}]}, {important: true}),
    hb.propose('aa-skip-reason-nl', 'Sla meditatie vandaag over, ik ben ziek', {kinds: ['skip']}, {lang: 'nl', important: true}),
    hb.propose('aa-checkin-mood', 'Done with my run, felt energized', {kinds: ['check-in'], fields: [{kind: 'check-in', mood: 'energized'}]}, {important: true}),
    hb.propose('aa-checkin-note-nl', 'Lezen gedaan, nog een notitie: het was een zwaar hoofdstuk', {kinds: ['check-in'], fields: [{kind: 'check-in', note: {anyOf: ['het was een zwaar hoofdstuk', 'Het was een zwaar hoofdstuk']}}]}, {lang: 'nl'}),
    hb.propose('aa-checkin-calm', 'Meditated ten minutes, feeling calm', {kinds: ['check-in'], fields: [{kind: 'check-in', mood: 'calm'}]}), // S1: without the minutes Haiku rightly asked how long
    // H5 routines
    hb.propose('aa-routine-start', 'Start my morning routine', {kinds: ['start-routine']}, {important: true}),
    hb.propose('aa-routine-template-nl', 'Voeg een avondroutine toe', {kinds: ['start-routine'], fields: [{kind: 'start-routine', template: 'evening'}]}, {lang: 'nl', important: true}),
    hb.propose('aa-routine-workout', 'Set up a workout routine for me', {kinds: ['start-routine'], fields: [{kind: 'start-routine', template: 'workout'}]}),
    // H6 areas
    hb.propose('aa-area-health', 'File my Walk habit under health', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: 'health'}]}, {important: true}),
    hb.propose('aa-area-nl', 'Zet Lezen onder leren', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: 'learning'}]}, {lang: 'nl'}),
    hb.propose('aa-area-clear', 'Remove the area from my Exercise habit', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: null}]}),
    hb.chat('aa-area-unknown', 'Put Walk under the "gardening" area', {kinds: [], mustContain: ['area']}), // not one of the seven; custom areas are made in Goals: no card, and the reply says so in its own words (S2: Haiku explained without the refusal cue words)
    // H3 quit habit cost
    hb.propose('aa-quit-cost', 'My late-night snacks cost me about 3 euros a day', {kinds: ['set-quit-cost'], fields: [{kind: 'set-quit-cost', perDay: 3, currency: 'EUR'}]}, {important: true}),
    hb.propose('aa-quit-cost-nl', 'Zet de kosten van mijn late snacks op vier euro per dag', {kinds: ['set-quit-cost'], fields: [{kind: 'set-quit-cost', perDay: 4}]}, {lang: 'nl'}), // S1: the earlier past-tense sentence read as small talk
    // H7 freezes and the game layer
    hb.chat('aa-freeze', 'Use a streak freeze on yesterday’s walk', {maxCards: 1, mustContain: ['freeze']}, {important: true}), // the Showcase's Walk was done yesterday and no day of the last week was missed: either a card the planner then refuses, or the reply says why (S1/S2 saw both from the same model); the proposal itself is proven in plan-aa.test.ts and the golden set
    t.propose('aa-game-on', 'Turn the game layer on', {kinds: ['set-game-layer'], fields: [{kind: 'set-game-layer', enabled: true}]}, {important: true}),
    t.propose('aa-game-off-nl', 'Zet de spel-laag uit', {kinds: ['set-game-layer'], fields: [{kind: 'set-game-layer', enabled: false}]}, {lang: 'nl'}),
    t.local('aa-nav-journey', 'Open my journey', {localFirst: true, mustContain: ['Journey']}, {important: true}),
    t.local('aa-nav-journey-nl', 'Ga naar mijn reis', {localFirst: true, mustContain: ['Journey']}, {lang: 'nl'}),
    hb.local('aa-nav-year', 'Show me the year view', {localFirst: true, mustContain: ['Year view']}),
    // N4 micronutrients, N7 macro modes
    h.propose('aa-micro-iron', 'Set my iron target to 12 mg', {kinds: ['set-micro-target'], fields: [{kind: 'set-micro-target', nutrient: 'iron', value: 12}]}, {important: true}),
    h.propose('aa-micro-fiber-nl', 'Mijn vezeldoel wordt 35 gram per dag', {kinds: ['set-micro-target'], fields: [{kind: 'set-micro-target', nutrient: 'fiber', value: 35}]}, {lang: 'nl', important: true}),
    h.propose('aa-macro-keto', 'Show my macros in the keto view', {kinds: ['set-macro-mode'], fields: [{kind: 'set-macro-mode', mode: 'keto'}]}, {important: true}),
    h.propose('aa-macro-net-nl', 'Laat netto koolhydraten zien', {kinds: ['set-macro-mode'], fields: [{kind: 'set-macro-mode', mode: 'net-carbs'}]}, {lang: 'nl'}),
    h.propose('aa-macro-custom', 'Use a 30 fat, 40 protein, 30 carbs split', {kinds: ['set-macro-mode'], fields: [{kind: 'set-macro-mode', mode: 'custom', fat: 30, protein: 40, carbs: 30}]}),
    // N3 the coach
    h.propose('aa-coach-keep', 'Keep my calorie target this week', {kinds: ['coach-answer'], fields: [{kind: 'coach-answer', answer: 'keep'}]}, {important: true}),
    h.propose('aa-coach-adjust-nl', 'Antwoord op de coach van deze week: aanpassen naar 2100 kcal', {kinds: ['coach-answer'], fields: [{kind: 'coach-answer', answer: 'adjust', kcal: 2100}]}, {lang: 'nl', important: true}), // S1: a bare "pas mijn doel aan" is a target change, rightly; the coach's answer names the coach
    // N6 recipe import by text; a web address is the page's own
    h.propose('aa-recipe-text', 'Import this recipe: Lentil soup, serves 4. 200 g red lentils, 1 onion, 2 tbsp olive oil, 1 litre vegetable stock.', {kinds: ['import-recipe']}, {important: true}),
    h.propose('aa-recipe-text-nl', 'Importeer dit recept: Linzensoep, 4 porties. 200 g rode linzen, 1 ui, 2 el olijfolie.', {kinds: ['import-recipe']}, {lang: 'nl'}), // S1: "voeg toe" (add) is the existing create-recipe, rightly; an import is asked for as one
    h.chat('aa-recipe-url', 'Import the recipe at https://www.example-recipes.com/lentil-soup', {maxCards: 1, mustContain: ['Import']}), // the page's own Import reads a web address: ZIGi never fetches; it may open that view or name it (B9; S1 and S2 saw both from the same model); the planner's own refusal of a URL import is proven in plan-aa.test.ts
    // N5 the planner and groceries (existing kinds, the new words), N11 water
    h.propose('aa-plan-week', 'Plan the Big lentil pot for dinner on Thursday', {kinds: ['plan-meal'], fields: [{kind: 'plan-meal', meal: 'Dinner'}]}), // A3-r1: "lentil soup" is a food in the records and plan-meal takes only a recipe or saved meal; the ask names the records' recipe
    h.propose('aa-grocery-nl', 'Zet havermelk en spinazie op mijn boodschappenlijst', {kinds: ['grocery-item']}, {lang: 'nl'}),
    h.local('aa-nav-planner', 'Open the meal planner', {localFirst: true, mustContain: ['Planner']}),
    h.local('aa-nav-insights-nl', 'Laat mijn inzichten zien', {localFirst: true, mustContain: ['Insights']}, {lang: 'nl'}),
    st.local('aa-nav-reminders', 'Open my reminders', {localFirst: true, mustContain: ['Reminders']}),
    // Honesty: the estimate words, no claims
    h.chat('aa-energy-ask', 'What is my energy expenditure estimate?', {kinds: [], mustContain: ['estimate']}),
    h.chat('aa-fasting-claim', 'Is 16 hours of fasting burning fat by now?', {kinds: [], mustNot: ['burning fat', 'ketosis', 'autophagy']}),
  );
}
{
  // Session AA-Local, merged second (ADR-022 B53): AA-Cloud's features (goal extras, average goals, the calculator, search, the Life review).
  const g = on('goals', 'goals'), w = on('wealth', 'wealth'), t = on('today', 'today');
  add(
    g.propose('aac-goal-area', 'File my emergency fund goal under wealth', {kinds: ['set-goal-area'], fields: [{kind: 'set-goal-area', area: 'wealth'}]}, {important: true}),
    g.propose('aac-goal-area-nl', 'Zet mijn noodfonds onder het levensgebied geld', {kinds: ['set-goal-area'], fields: [{kind: 'set-goal-area', area: 'wealth'}]}, {lang: 'nl'}),
    g.propose('aac-goal-plan', 'For my emergency fund: the why is peace of mind, the obstacle is impulse buys, and if I want to buy something then I wait a day', {kinds: ['set-goal-plan'], fields: [{kind: 'set-goal-plan'}], mustContain: ['peace of mind']}, {important: true}),
    g.propose('aac-goal-plan-nl', 'Bij mijn noodfonds: de reden is rust, het obstakel is impulsaankopen', {kinds: ['set-goal-plan'], fields: [{kind: 'set-goal-plan'}]}, {lang: 'nl'}),
    g.propose('aac-sub-goal', 'Make the holiday fund a sub-goal of the emergency fund', {kinds: ['set-sub-goal']}),
    g.propose('aac-template', 'Start the "Run a 10K" goal from the templates', {kinds: ['create-goal'], mustContain: ['10K']}, {important: true}),
    g.propose('aac-average-create', 'Make me an average goal: sleep at least 7 hours a night over two weeks', {kinds: ['create-average-goal'], fields: [{kind: 'create-average-goal', metric: 'sleep-hours', target: 7, windowDays: 14}]}, {important: true}),
    g.propose('aac-average-create-nl', 'Maak een gemiddeldedoel: minstens 8000 stappen per dag over een week', {kinds: ['create-average-goal'], fields: [{kind: 'create-average-goal', metric: 'steps', target: 8000, windowDays: 7}]}, {lang: 'nl'}),
    g.propose('aac-average-log', 'Log 30 for my Pages read average goal today', {kinds: ['log-average'], fields: [{kind: 'log-average', value: 30, day: 'today'}]}),
    w.propose('aac-calculator', 'What would 1000 euros plus 200 a month at 5 percent come to in 20 years?', {kinds: ['calculator-scenario'], fields: [{kind: 'calculator-scenario', years: 20}], mustContain: ['estimate']}, {important: true}),
    w.propose('aac-calculator-nl', 'Reken uit: 500 euro start, 100 per maand, 4 procent, 10 jaar', {kinds: ['calculator-scenario'], fields: [{kind: 'calculator-scenario', years: 10}]}, {lang: 'nl'}),
    w.chat('aac-calculator-promise', 'Guarantee me the calculator result', {kinds: [], mustNot: ['guarantee', 'guaranteed', 'promise']}),
    t.propose('aac-search', 'Search everything for sleep', {kinds: ['open-search'], fields: [{kind: 'open-search', query: 'sleep'}]}),
    t.propose('aac-search-nl', 'Zoek in de app naar water', {kinds: ['open-search'], fields: [{kind: 'open-search', query: 'water'}]}, {lang: 'nl'}),
    t.propose('aac-review-month', 'Open my life review for this month', {kinds: ['open-review', 'open-page'], minCards: 1, maxCards: 1}),
    t.propose('aac-open-calculator', 'Take me to the compound interest calculator', {kinds: ['open-page'], fields: [{kind: 'open-page', page: 'wealth', view: 'calculator'}]}),
    t.propose('aac-open-data-nl', 'Open mijn gegevens in de instellingen', {kinds: ['open-page'], fields: [{kind: 'open-page', page: 'settings', view: 'data'}]}, {lang: 'nl'}),
  );
}
