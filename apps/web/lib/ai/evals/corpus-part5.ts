import type {CorpusArea, CorpusKind, Expect, Lang, ModelCase} from './corpus';
import type {PageArea} from '../settings';

/**
 * Session Z-Local Part 5 (docs/product/ZIGI_ACTIONS_Z.md): the new kinds, asked in English and Dutch across the pages
 * they belong to. Navigation asks are answered on the device (`open-page`, local-first); deletions become one card that
 * opens the app's own confirmation (never "everything"); habit states, vacations, skips undone, reminders removed and a
 * goal's close/reopen are cards. Fictional data only (the Showcase of 2026-09-20).
 */
type Base = Omit<ModelCase, 'id' | 'ask' | 'expect' | 'kind' | 'lang'> & {lang?: Lang};
const make = (kind: CorpusKind, base: Base) => (id: string, ask: string, expect: Expect, extra: Partial<ModelCase> = {}): ModelCase => ({id, kind, lang: 'en', ...base, ask, expect, ...extra});
const on = (area: CorpusArea, page: PageArea) => ({propose: make('propose', {area, page}), refuse: make('refuse', {area, page}), local: make('local-first', {area, page}), lookup: make('lookup', {area, page})});
const REFUSE: Expect = {refuse: true, kinds: []};
export const PART5: ModelCase[] = [];
function add(...cases: ModelCase[]) { PART5.push(...cases); }
{
  const t = on('today', 'today'), hb = on('habits', 'habits'), g = on('goals', 'goals'), h = on('health', 'health'), w = on('wealth', 'wealth'), st = on('settings', 'help');
  add(
    // Navigation, on the device (no model), English and Dutch.
    t.local('p5-nav-sleep', 'Open my sleep page', {localFirst: true, mustContain: ['Health → Sleep']}, {important: true}),
    t.local('p5-nav-portfolio', 'take me to my portfolio', {localFirst: true, mustContain: ['Portfolio']}),
    t.local('p5-nav-nl', 'ga naar mijn gewoontes', {localFirst: true, mustContain: ['Habits']}, {lang: 'nl', important: true}),
    t.local('p5-nav-settings-nl', 'open de instellingen', {localFirst: true, mustContain: ['Settings']}, {lang: 'nl'}),
    // Navigation through the model when a record is named.
    hb.propose('p5-nav-habit', 'Open my Walk habit', {kinds: ['open-page'], fields: [{kind: 'open-page', page: 'habits'}]}),
    g.propose('p5-nav-goal', 'Show me the Japan adventure goal page', {kinds: ['open-page'], fields: [{kind: 'open-page', page: 'goals'}]}),
    // Deletions: one record, the app's own confirmation; "everything" stays a refusal.
    hb.propose('p5-delete-habit', 'Delete my Walk habit', {kinds: ['delete-record'], fields: [{kind: 'delete-record', what: 'habit'}]}, {important: true}),
    hb.propose('p5-delete-habit-nl', 'Verwijder mijn gewoonte Lezen', {kinds: ['delete-record'], fields: [{kind: 'delete-record', what: 'habit'}]}, {lang: 'nl', important: true}),
    g.propose('p5-delete-goal', 'Delete the Emergency fund goal', {kinds: ['delete-record'], fields: [{kind: 'delete-record', what: 'goal'}]}, {important: true}),
    h.propose('p5-delete-weight', 'Delete my weight from yesterday, it was wrong', {kinds: ['delete-record'], fields: [{kind: 'delete-record', what: 'weight'}]}),
    h.propose('p5-delete-water-nl', 'Haal het water van gisteren weg', {kinds: ['delete-record'], fields: [{kind: 'delete-record', what: 'water-entry'}]}, {lang: 'nl'}),
    hb.refuse('p5-delete-everything', 'Delete all my habits and goals and start over', REFUSE, {important: true}),
    // Habit states, vacations, skips, reminders.
    hb.propose('p5-pause', 'Pause my Walk habit for now', {kinds: ['set-habit-state'], fields: [{kind: 'set-habit-state', state: 'paused'}]}, {important: true}),
    hb.propose('p5-archive-nl', 'Archiveer de gewoonte Lezen', {kinds: ['set-habit-state'], fields: [{kind: 'set-habit-state', state: 'archived'}]}, {lang: 'nl'}),
    hb.propose('p5-vacation', 'I am on holiday from 2026-09-22 to 2026-09-26, mark those as vacation days', {kinds: ['vacation'], fields: [{kind: 'vacation', from: '2026-09-22', to: '2026-09-26'}]}, {important: true}),
    hb.propose('p5-vacation-nl', 'Ik ben op vakantie van 2026-09-22 tot 2026-09-26, zet vakantiedagen voor al mijn gewoontes', {kinds: ['vacation'], fields: [{kind: 'vacation', from: '2026-09-22', to: '2026-09-26'}]}, {lang: 'nl'}),
    hb.propose('p5-unskip', 'Undo the skip I planned for my Walk tomorrow', {kinds: ['unskip']}),
    hb.propose('p5-remove-reminder', 'Turn off the reminder for my Meditate habit', {kinds: ['remove-reminder'], fields: [{kind: 'remove-reminder', for: 'habit'}]}),
    t.propose('p5-remove-water-reminder-nl', 'Zet de waterherinnering uit', {kinds: ['remove-reminder'], fields: [{kind: 'remove-reminder', for: 'water'}]}, {lang: 'nl'}),
    // Goals: close, reopen.
    g.propose('p5-close-goal', 'Close the Japan adventure goal, I am done with it', {kinds: ['close-goal']}, {important: true}),
    g.propose('p5-close-goal-nl', 'Sluit het doel Japan adventure af', {kinds: ['close-goal']}, {lang: 'nl'}),
    g.propose('p5-reopen-goal', 'Reopen the Japan adventure goal', {kinds: ['reopen-goal']}),
    // Still a "no": milestone ticks, money.
    g.refuse('p5-no-milestone', 'Mark the milestone "Flights booked" as reached on the Japan goal', REFUSE),
    g.propose('p5-fund', 'Fund the Japan goal with 200 euros', {kinds: ['prefill-contribution'], fields: [{kind: 'prefill-contribution', amount: 200}]}, {important: true}),
    // Health's own edits, plans, counters, targets, preferences, the running night, the bell.
    h.propose('p5-diary-edit', 'Change today\'s oatmeal to two servings', {kinds: ['edit-diary-entry'], fields: [{kind: 'edit-diary-entry', quantity: 2}]}),
    h.propose('p5-diary-edit-nl', 'Zet de havermout van vandaag op twee porties', {kinds: ['edit-diary-entry'], fields: [{kind: 'edit-diary-entry', quantity: 2}]}, {lang: 'nl'}),
    h.propose('p5-grocery-notes', 'Add oat milk and spinach to my grocery notes', {kinds: ['grocery-notes', 'grocery-item'], minCards: 1, maxCards: 1}),
    h.propose('p5-favourite', 'Make my oatmeal a favourite', {kinds: ['set-favorite']}),
    h.propose('p5-counter-create', 'Add a counter for burpees', {kinds: ['create-counter'], fields: [{kind: 'create-counter', name: 'Burpees'}]}, {important: true}),
    h.propose('p5-counter-create-nl', 'Maak een teller voor burpees', {kinds: ['create-counter']}, {lang: 'nl'}),
    h.propose('p5-counter-rename', 'Rename my Push-ups counter to Press-ups', {kinds: ['edit-counter'], fields: [{kind: 'edit-counter', name: 'Press-ups'}]}),
    h.propose('p5-target-protein', 'Set my protein target to 120 grams a day', {kinds: ['set-target'], fields: [{kind: 'set-target', target: 'protein', value: 120}]}, {important: true}),
    h.propose('p5-target-steps-nl', 'Zet mijn stappendoel op 9000 stappen per dag', {kinds: ['set-target'], fields: [{kind: 'set-target', target: 'steps', value: 9000}]}, {lang: 'nl', important: true}),
    h.propose('p5-target-water', 'I want to drink 2.5 litres a day from now on, set that as my water target', {kinds: ['set-target'], fields: [{kind: 'set-target', target: 'water'}]}),
    h.propose('p5-target-sleep', 'My sleep goal is 8 hours a night', {kinds: ['set-target'], fields: [{kind: 'set-target', target: 'sleep', value: 8}]}),
    h.propose('p5-target-clear', 'Clear my calorie target', {kinds: ['set-target'], fields: [{kind: 'set-target', target: 'kcal', value: null}]}),
    h.propose('p5-units', 'Show my weight in pounds from now on', {kinds: ['set-health-preference'], fields: [{kind: 'set-health-preference', weightUnit: 'lb'}]}),
    h.propose('p5-night-start', 'I am going to bed now', {kinds: ['start-night']}, {important: true}),
    h.propose('p5-night-start-nl', 'Ik ga nu slapen', {kinds: ['start-night']}, {lang: 'nl'}),
    h.propose('p5-night-end', 'I am up, it is 7:10', {kinds: ['end-night'], fields: [{kind: 'end-night', wake: '07:10'}]}, {important: true}),
    h.propose('p5-bells', 'Ring the meditation bell every 5 minutes with the chime sound', {kinds: ['set-bells'], fields: [{kind: 'set-bells', intervalMin: 5, sound: 'chime'}]}),
    // Today's presets and links, the weekly review, the wrap-up; pages and ZIGi's look (Settings asks are made from Help); two money forms.
    t.propose('p5-preset', 'Switch Today to the Wealth preset', {kinds: ['set-today-preset'], fields: [{kind: 'set-today-preset', preset: 'wealth'}]}),
    t.propose('p5-preset-nl', 'Zet Today op de preset Habits + Health', {kinds: ['set-today-preset'], fields: [{kind: 'set-today-preset', preset: 'habits-health'}]}, {lang: 'nl'}),
    t.propose('p5-link-rename', 'Rename my Running club link to Run crew', {kinds: ['edit-link'], fields: [{kind: 'edit-link', label: 'Run crew'}]}),
    t.propose('p5-skip-review', 'Skip this week\'s review, I was away', {kinds: ['skip-review']}, {important: true}),
    t.propose('p5-review-day', 'Move my weekly review to Sunday', {kinds: ['set-review-weekday'], fields: [{kind: 'set-review-weekday', weekday: 'sunday'}]}),
    t.propose('p5-review-day-nl', 'Zet mijn wekelijkse terugblik op vrijdag', {kinds: ['set-review-weekday'], fields: [{kind: 'set-review-weekday', weekday: 'friday'}]}, {lang: 'nl'}),
    t.propose('p5-wrap-up-time', 'Do the evening wrap-up at 9 pm instead', {kinds: ['set-wrap-up'], fields: [{kind: 'set-wrap-up', time: '21:00'}]}, {important: true}),
    t.propose('p5-wrap-up-off-nl', 'Zet de avondafsluiting uit', {kinds: ['set-wrap-up'], fields: [{kind: 'set-wrap-up', enabled: false}]}, {lang: 'nl'}),
    st.propose('p5-hide-page', 'Hide the Chess page, I never use it', {kinds: ['set-page-visibility'], fields: [{kind: 'set-page-visibility', page: 'chess', shown: false}]}, {important: true}),
    st.propose('p5-show-page-nl', 'Laat de pagina Markets weer zien', {kinds: ['set-page-visibility'], fields: [{kind: 'set-page-visibility', page: 'markets', shown: true}]}, {lang: 'nl'}),
    st.propose('p5-start-page', 'Open the app on Habits from now on', {kinds: ['set-start-page'], fields: [{kind: 'set-start-page', page: 'habits'}]}, {important: true}),
    st.propose('p5-zigi-left', 'Put ZIGi on the left side and make it bigger', {kinds: ['set-zigi-look'], fields: [{kind: 'set-zigi-look', side: 'left', size: 'l'}]}),
    st.propose('p5-zigi-calm-nl', 'Zet de animatie van ZIGi op rustig', {kinds: ['set-zigi-look'], fields: [{kind: 'set-zigi-look', animation: 'calm'}]}, {lang: 'nl'}),
    st.propose('p5-zigi-knock', 'Stop ZIGi from knocking', {kinds: ['set-zigi-look'], fields: [{kind: 'set-zigi-look', knock: false}]}),
    g.propose('p5-fund-nl', 'Stort 150 euro op mijn doel Emergency fund', {kinds: ['prefill-contribution'], fields: [{kind: 'prefill-contribution', amount: 150}]}, {lang: 'nl'}),
    w.propose('p5-account', 'Add a savings account called Rainy day at Showcase Bank with 1500 euros', {kinds: ['prefill-account'], fields: [{kind: 'prefill-account', accountKind: 'savings', balance: 1500}]}, {important: true}),
    w.propose('p5-debt-nl', 'Voeg mijn autolening van 12000 euro toe als schuld', {kinds: ['prefill-account'], fields: [{kind: 'prefill-account', accountKind: 'loan'}]}, {lang: 'nl'}),
  );
}
