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
    hb.propose('aa-tod-morning', 'Move my Read habit to the morning', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'morning'}]}, {important: true}),
    hb.propose('aa-tod-evening-nl', 'Zet Lezen in de avond', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'evening'}]}, {lang: 'nl', important: true}),
    hb.propose('aa-tod-anytime', 'Stretch can be any time of day, not just mornings', {kinds: ['set-time-of-day'], fields: [{kind: 'set-time-of-day', timeOfDay: 'anytime'}]}),
    // H2 the timer
    hb.propose('aa-timer-start', 'Start the timer on my reading', {kinds: ['start-timer']}, {important: true}),
    hb.propose('aa-timer-start-nl', 'Start de timer voor Exercise', {kinds: ['start-timer']}, {lang: 'nl'}),
    hb.propose('aa-timer-stop', 'Stop the exercise timer and log it', {kinds: ['stop-timer']}, {important: true}),
    hb.propose('aa-timer-discard-nl', 'Stop de leestimer zonder te loggen', {kinds: ['stop-timer'], fields: [{kind: 'stop-timer', log: false}]}, {lang: 'nl'}),
    hb.refuse('aa-timer-not-duration', 'Start a timer on my water habit', {refuse: true, kinds: []}), // Drink water counts glasses: no timer
    // H4 skip with a reason, note and mood
    hb.propose('aa-skip-reason', 'Skip the walk today, I am travelling', {kinds: ['skip'], fields: [{kind: 'skip', reason: {anyOf: ['travelling', 'Travelling', 'traveling']}}]}, {important: true}),
    hb.propose('aa-skip-reason-nl', 'Sla meditatie vandaag over, ik ben ziek', {kinds: ['skip']}, {lang: 'nl', important: true}),
    hb.propose('aa-checkin-mood', 'Done with my run, felt energized', {kinds: ['check-in'], fields: [{kind: 'check-in', mood: 'energized'}]}, {important: true}),
    hb.propose('aa-checkin-note-nl', 'Lezen gedaan, nog een notitie: het was een zwaar hoofdstuk', {kinds: ['check-in'], fields: [{kind: 'check-in', note: {anyOf: ['het was een zwaar hoofdstuk', 'Het was een zwaar hoofdstuk']}}]}, {lang: 'nl'}),
    hb.propose('aa-checkin-calm', 'Meditated, feeling calm', {kinds: ['check-in'], fields: [{kind: 'check-in', mood: 'calm'}]}),
    // H5 routines
    hb.propose('aa-routine-start', 'Start my morning routine', {kinds: ['start-routine']}, {important: true}),
    hb.propose('aa-routine-template-nl', 'Voeg een avondroutine toe', {kinds: ['start-routine'], fields: [{kind: 'start-routine', template: 'evening'}]}, {lang: 'nl', important: true}),
    hb.propose('aa-routine-workout', 'Set up a workout routine for me', {kinds: ['start-routine'], fields: [{kind: 'start-routine', template: 'workout'}]}),
    // H6 areas
    hb.propose('aa-area-health', 'File my Walk habit under health', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: 'health'}]}, {important: true}),
    hb.propose('aa-area-nl', 'Zet Lezen onder leren', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: 'learning'}]}, {lang: 'nl'}),
    hb.propose('aa-area-clear', 'Remove the area from my Exercise habit', {kinds: ['set-habit-area'], fields: [{kind: 'set-habit-area', area: null}]}),
    hb.refuse('aa-area-unknown', 'Put Walk under the "gardening" area', {refuse: true, kinds: []}), // not one of the seven; custom areas are made in Goals
    // H3 quit habit cost
    hb.propose('aa-quit-cost', 'My late-night snacks cost me about 3 euros a day', {kinds: ['set-quit-cost'], fields: [{kind: 'set-quit-cost', perDay: 3, currency: 'EUR'}]}, {important: true}),
    hb.propose('aa-quit-cost-nl', 'Snacken na elf uur kostte me zo’n vier euro per dag', {kinds: ['set-quit-cost'], fields: [{kind: 'set-quit-cost', perDay: 4}]}, {lang: 'nl'}),
    // H7 freezes and the game layer
    hb.propose('aa-freeze', 'Use a streak freeze on yesterday’s walk', {kinds: ['use-freeze'], fields: [{kind: 'use-freeze', day: 'yesterday'}]}, {important: true}),
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
    h.propose('aa-coach-adjust-nl', 'Pas mijn calorie-doel aan naar 2100', {kinds: ['coach-answer'], fields: [{kind: 'coach-answer', answer: 'adjust', kcal: 2100}]}, {lang: 'nl', important: true}),
    // N6 recipe import by text; a web address is the page's own
    h.propose('aa-recipe-text', 'Import this recipe: Lentil soup, serves 4. 200 g red lentils, 1 onion, 2 tbsp olive oil, 1 litre vegetable stock.', {kinds: ['import-recipe']}, {important: true}),
    h.propose('aa-recipe-text-nl', 'Voeg dit recept toe: Linzensoep, 4 porties. 200 g rode linzen, 1 ui, 2 el olijfolie.', {kinds: ['import-recipe']}, {lang: 'nl'}),
    h.refuse('aa-recipe-url', 'Import the recipe at https://www.example-recipes.com/lentil-soup', {refuse: true, kinds: [], mustContain: ['Import']}), // the page's own Import reads a web address
    // N5 the planner and groceries (existing kinds, the new words), N11 water
    h.propose('aa-plan-week', 'Plan the lentil soup for dinner on Thursday', {kinds: ['plan-meal'], fields: [{kind: 'plan-meal', meal: 'Dinner'}]}),
    h.propose('aa-grocery-nl', 'Zet havermelk en spinazie op mijn boodschappenlijst', {kinds: ['grocery-item']}, {lang: 'nl'}),
    h.local('aa-nav-planner', 'Open the meal planner', {localFirst: true, mustContain: ['Planner']}),
    h.local('aa-nav-insights-nl', 'Laat mijn inzichten zien', {localFirst: true, mustContain: ['Insights']}, {lang: 'nl'}),
    st.local('aa-nav-reminders', 'Open my reminders', {localFirst: true, mustContain: ['Reminders']}),
    // Honesty: the estimate words, no claims
    h.chat('aa-energy-ask', 'What is my energy expenditure estimate?', {kinds: [], mustContain: ['estimate']}),
    h.chat('aa-fasting-claim', 'Is 16 hours of fasting burning fat by now?', {kinds: [], mustNot: ['burning fat', 'ketosis', 'autophagy']}),
  );
}
