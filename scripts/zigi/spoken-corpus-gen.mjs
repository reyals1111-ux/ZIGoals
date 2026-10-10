#!/usr/bin/env node
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {estimateCost} from '../../apps/web/lib/ai/pricing.ts';

/**
 * Session Z-Local Part 4 (ADR-020 L6, owner edit 9): the spoken corpus. The seeds are made HERE on the device: every card
 * kind the inventory has (docs/product/ZIGI_ACTIONS_Z.md), the lookups, the navigation intents and the refusals, each as
 * one typed ask in English and one in Dutch with its expectation. Claude Opus 5.5 (Message Batches API, half price) renders
 * only the SPOKEN phrasing: ten utterances per seed, each applying one of ten spoken phenomena, with every fact kept. Each
 * utterance's expectation is its seed's, never the model's. The output is split 70/30 by a hash of the seed id and the
 * variant index: `spoken/train.jsonl` and `spoken/holdout.jsonl` on the runs branch, and the hold-out also rendered as
 * `apps/web/lib/ai/evals/corpus-spoken.ts` (model-scored by the harness with `ZIGI_SET=spoken`).
 *
 *   node scripts/zigi/spoken-corpus-gen.mjs submit [--max-usd 15] [--out <runs>/spoken]   forecast, refuse over the cap, create the batch
 *   node scripts/zigi/spoken-corpus-gen.mjs wait <batch_id>                                poll until ended (60 s), then fetch
 *   node scripts/zigi/spoken-corpus-gen.mjs fetch <batch_id>                               results → jsonl, the usage file, corpus-spoken.ts
 *   node scripts/zigi/spoken-corpus-gen.mjs seeds                                          print the seed count per language and kind
 *   node scripts/zigi/spoken-corpus-gen.mjs rebuild <batch_id>                            re-derive every expectation from the seeds in this file (no model call)
 * The key is read from ANTHROPIC_TEST_KEY in this process's environment only; never an argument, never printed.
 */
const args = process.argv.slice(2), cmd = args[0] ?? 'seeds';
const opt = (name, fallback) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback; };
const RUNS = '/Users/AIUSER/Documents/ZIGoals-Claude-z-runs', OUT = opt('--out', join(RUNS, 'spoken')), MAX_USD = Number(opt('--max-usd', '15'));
const REPO = new URL('../../', import.meta.url).pathname.replace(/\/$/, '');
const MODEL = 'claude-opus-5-5', API = 'https://api.anthropic.com', VERSION = '2023-06-01', PER_SEED = 10;
const PHENOMENA = [
  ['filler', 'hesitation fillers ("um", "uh", "euh", "eh") and a false start'],
  ['number-words', 'every number said in words ("two and a half", "tienduizend", "half past seven")'],
  ['clock-idiom', 'any time said the way people say it ("quarter to eight", "half acht", "seven thirty tonight"); if there is no time, a relative day word instead ("yesterday", "gisteren", "last Monday")'],
  ['self-correction', 'a wrong figure or word first, then the correct one ("three, no wait, four"; "nee, ik bedoel"), ending on the FACTS AS GIVEN'],
  ['run-on', 'no punctuation at all, one breath, lower case, as a speech recogniser writes it'],
  ['politeness', 'wrapped in please/thanks/could you ("zou je … kunnen", "alsjeblieft")'],
  ['preamble', 'a short bit of context first ("so I just got back from a run and", "ik was net bij de dokter en")'],
  ['inversion', 'the facts first, the request last ("three glasses of water, log that")'],
  ['code-switch', 'one or two words from the other language (Dutch in English, English in Dutch), as bilingual people do'],
  ['terse', 'as few words as possible, like a command'],
];

// ---- Seeds: one concept, its typed ask in both languages, its expectation ----
const seeds = [];
const seed = (id, concept, {en, nl}, expect, extra = {}) => {
  seeds.push({id: `${id}-en`, concept, lang: 'en', typed: en, expect, ...extra});
  seeds.push({id: `${id}-nl`, concept, lang: 'nl', typed: nl, expect, ...extra});
};
const P = (kind, fields = {}) => ({kinds: [kind], fields: [{kind, ...fields}]});
const REFUSE = {refuse: true, kinds: []};
const H = {area: 'health', page: 'health', kind: 'propose'}, HB = {area: 'habits', page: 'habits', kind: 'propose'}, G = {area: 'goals', page: 'goals', kind: 'propose'}, T = {area: 'today', page: 'today', kind: 'propose'}, W = {area: 'wealth', page: 'wealth', kind: 'propose'}, S = {area: 'settings', page: 'help', kind: 'propose'};
// Health logs
seed('water-glasses', 'two glasses of water', {en: 'Log two glasses of water', nl: 'Noteer twee glazen water'}, P('log-water', {glasses: 2}), {...H, important: true});
seed('water-litres', 'two and a half litres', {en: 'I drank two and a half litres today', nl: 'Ik heb vandaag anderhalve liter water gedronken'}, {kinds: ['log-water']}, H);
seed('water-yesterday', 'water yesterday', {en: 'Yesterday I drank three glasses of water', nl: 'Gisteren heb ik drie glazen water gedronken'}, P('log-water', {glasses: 3, day: 'yesterday'}), {...H, important: true});
seed('weight-kg', 'weight in kilos', {en: 'I weigh seventy-two point five kilos', nl: 'Ik weeg tweeënzeventig komma vijf kilo'}, P('log-weight', {value: 72.5, unit: 'kg'}), {...H, important: true});
seed('weight-lb', 'weight in pounds', {en: 'I weighed one hundred and sixty pounds this morning', nl: 'Vanmorgen woog ik honderdzestig pond'}, P('log-weight', {value: 160}), H);
seed('steps', 'ten thousand steps', {en: 'I walked ten thousand steps today', nl: 'Ik heb vandaag tienduizend stappen gezet'}, P('log-steps', {steps: 10000}), {...H, important: true});
seed('steps-k', 'twelve k steps', {en: 'Twelve k steps yesterday', nl: 'Twaalfduizend stappen gisteren'}, P('log-steps', {steps: 12000, day: 'yesterday'}), H);
seed('food-lunch', 'a bowl for lunch', {en: 'I had the chicken and quinoa bowl for lunch', nl: 'Ik heb de chicken and quinoa bowl als lunch gegeten'}, {kinds: ['log-food'], fields: [{kind: 'log-food', meal: 'Lunch'}]}, {...H, important: true});
seed('food-breakfast-two', 'two servings of oats', {en: 'Two servings of berry overnight oats for breakfast', nl: 'Twee porties berry overnight oats als ontbijt'}, {kinds: ['log-food'], fields: [{kind: 'log-food', meal: 'Breakfast', quantity: 2}]}, H);
seed('measurement', 'waist measurement', {en: 'My waist is eighty-one centimetres', nl: 'Mijn taille is eenentachtig centimeter'}, {kinds: ['log-measurement'], fields: [{kind: 'log-measurement', value: 81}]}, H);
seed('sleep', 'last night in bed', {en: 'I went to bed at half past eleven and got up at seven', nl: 'Ik ging om half twaalf naar bed en stond om zeven uur op'}, P('log-sleep', {bedtime: '23:30', wake: '07:00'}), {...H, important: true});
seed('nap', 'a twenty-minute nap', {en: 'I took a twenty minute nap after lunch', nl: 'Ik heb na de lunch twintig minuten gedut'}, {kinds: ['log-sleep', 'log-nap']}, H);
seed('meditation', 'fifteen minutes of meditation', {en: 'I meditated for fifteen minutes this morning', nl: 'Ik heb vanmorgen vijftien minuten gemediteerd'}, P('log-meditation', {minutes: 15}), {...H, important: true});
seed('mood', 'a good day', {en: 'Log my mood as good today', nl: 'Zet mijn stemming vandaag op goed'}, {kinds: ['log-mood']}, H);
seed('counter', 'twenty push-ups', {en: 'Twenty push-ups done', nl: 'Twintig push-ups gedaan'}, P('counter', {count: 20}), {...H, important: true});
seed('fast-start', 'start a fast', {en: 'Start a sixteen hour fast now', nl: 'Start nu een vasten van zestien uur'}, {kinds: ['start-fast'], fields: [{kind: 'start-fast', hours: 16}]}, H);
seed('fast-stop', 'end the fast', {en: 'Stop my fast, I am eating now', nl: 'Stop mijn vasten, ik ga nu eten'}, {kinds: ['stop-fast']}, H);
// Health settings and plans (Part 5)
seed('target-protein', 'protein target', {en: 'Set my protein target to a hundred and thirty grams a day', nl: 'Zet mijn eiwitdoel op honderddertig gram per dag'}, P('set-target', {target: 'protein', value: 130}), {...H, important: true});
seed('target-steps', 'steps target', {en: 'My steps goal is nine thousand from now on', nl: 'Mijn stappendoel is vanaf nu negenduizend'}, P('set-target', {target: 'steps', value: 9000}), H);
seed('target-water', 'water target', {en: 'I want to drink two and a half litres a day, set that as my water target', nl: 'Ik wil tweeënhalve liter per dag drinken, zet dat als mijn waterdoel'}, P('set-target', {target: 'water'}), H);
seed('target-sleep', 'sleep goal', {en: 'My sleep goal is seven and a half hours', nl: 'Mijn slaapdoel is zeven en een half uur'}, P('set-target', {target: 'sleep', value: 7.5}), H);
seed('units-lb', 'weight in pounds', {en: 'Show my weight in pounds from now on', nl: 'Toon mijn gewicht voortaan in pond'}, P('set-health-preference', {weightUnit: 'lb'}), H);
seed('favourite', 'a favourite food', {en: 'Make the berry overnight oats a favourite', nl: 'Maak de berry overnight oats favoriet'}, {kinds: ['set-favorite']}, H);
seed('counter-create', 'a burpees counter', {en: 'Add a counter for burpees', nl: 'Maak een teller voor burpees'}, P('create-counter', {name: 'Burpees'}), H);
seed('counter-rename', 'rename a counter', {en: 'Rename my push-ups counter to press-ups', nl: 'Hernoem mijn push-ups teller naar press-ups'}, P('edit-counter', {name: 'Press-ups'}), H);
seed('diary-edit', 'two servings instead', {en: 'Change today\'s oats to two servings', nl: 'Zet de havermout van vandaag op twee porties'}, P('edit-diary-entry', {quantity: 2}), H);
seed('grocery', 'grocery items', {en: 'Add oat milk and spinach to my groceries', nl: 'Zet havermelk en spinazie op mijn boodschappenlijst'}, {kinds: ['grocery-item', 'grocery-notes'], minCards: 1, maxCards: 1}, H);
seed('recipe', 'a new recipe', {en: 'Create a recipe called lentil soup with two hundred and fifty grams of lentils and one onion', nl: 'Maak een recept linzensoep met tweehonderdvijftig gram linzen en één ui'}, {kinds: ['create-recipe']}, H);
seed('plan-meal', 'plan a recipe', {en: 'Plan the lentil soup for dinner tomorrow', nl: 'Plan de linzensoep voor morgenavond'}, {kinds: ['plan-meal']}, H);
seed('bells', 'the meditation bell', {en: 'Ring the meditation bell every five minutes with the chime', nl: 'Laat de meditatiebel elke vijf minuten klinken met de chime'}, P('set-bells', {intervalMin: 5, sound: 'chime'}), H);
seed('night-start', 'going to bed', {en: 'I am going to bed now', nl: 'Ik ga nu slapen'}, {kinds: ['start-night']}, {...H, important: true});
seed('night-end', 'getting up', {en: 'I am up, it is ten past seven', nl: 'Ik ben op, het is tien over zeven'}, P('end-night', {wake: '07:10'}), H);
// Habits
seed('checkin', 'a check-in', {en: 'Mark my Walk habit as done', nl: 'Vink mijn gewoonte Wandelen af'}, {kinds: ['check-in']}, {...HB, important: true});
seed('checkin-minutes', 'minutes read', {en: 'I read for twenty-five minutes', nl: 'Ik heb vijfentwintig minuten gelezen'}, {kinds: ['check-in'], fields: [{kind: 'check-in', value: 25}]}, {...HB, important: true});
seed('partial', 'a partial check-in', {en: 'I only did half of my meditation today', nl: 'Ik heb vandaag maar de helft van mijn meditatie gedaan'}, {kinds: ['check-in', 'log-meditation'], minCards: 1}, HB);
seed('skip', 'skip today', {en: 'Skip my run today, rest day', nl: 'Sla mijn hardlopen vandaag over, rustdag'}, {kinds: ['skip']}, {...HB, important: true});
seed('skip-tomorrow', 'skip tomorrow', {en: 'Skip my Walk tomorrow', nl: 'Sla mijn wandeling morgen over'}, {kinds: ['skip'], fields: [{kind: 'skip', day: '2026-09-21'}]}, HB);
seed('create-habit', 'a new habit', {en: 'Create a habit called stretching, ten minutes every morning', nl: 'Maak een gewoonte stretchen, tien minuten elke ochtend'}, {kinds: ['create-habit', 'build-habit'], minCards: 1, maxCards: 1}, {...HB, important: true});
seed('edit-habit', 'rename a habit', {en: 'Rename my Walk habit to Evening walk', nl: 'Hernoem mijn gewoonte Wandelen naar Avondwandeling'}, P('edit-habit', {title: 'Evening walk'}), HB);
seed('stack', 'stack habits', {en: 'Do my Meditate habit right after my Walk', nl: 'Doe mijn meditatie meteen na mijn wandeling'}, {kinds: ['stack-habit']}, HB);
seed('challenge', 'a thirty-day challenge', {en: 'Start a thirty day challenge for my Read habit', nl: 'Start een uitdaging van dertig dagen voor mijn gewoonte Lezen'}, {kinds: ['start-challenge'], fields: [{kind: 'start-challenge', days: 30}]}, HB);
seed('pause', 'pause a habit', {en: 'Pause my Walk habit for now', nl: 'Pauzeer mijn gewoonte Wandelen voorlopig'}, P('set-habit-state', {state: 'paused'}), {...HB, important: true});
seed('archive', 'archive a habit', {en: 'Archive my Read habit', nl: 'Archiveer mijn gewoonte Lezen'}, P('set-habit-state', {state: 'archived'}), HB);
seed('vacation', 'vacation days', {en: 'I am on holiday from the twenty-second to the twenty-sixth of September, mark those as vacation days', nl: 'Ik ben op vakantie van tweeëntwintig tot zesentwintig september, zet die als vakantiedagen'}, P('vacation', {from: '2026-09-22', to: '2026-09-26'}), HB);
seed('unskip', 'undo a planned skip', {en: 'Undo the skip I planned for my Walk tomorrow', nl: 'Maak de overslag van mijn wandeling morgen ongedaan'}, {kinds: ['unskip']}, HB);
seed('reminder-habit', 'a habit reminder', {en: 'Remind me to meditate at quarter to eight in the evening', nl: 'Herinner me om kwart voor acht \'s avonds aan mediteren'}, {kinds: ['create-reminder'], fields: [{kind: 'create-reminder', time: '19:45'}]}, {...HB, important: true});
seed('reminder-water', 'a water reminder', {en: 'Remind me to drink water every two hours', nl: 'Herinner me elke twee uur om water te drinken'}, {kinds: ['create-reminder'], fields: [{kind: 'create-reminder', for: 'water'}]}, T);
seed('reminder-off', 'a reminder off', {en: 'Turn off the reminder for my Meditate habit', nl: 'Zet de herinnering voor mijn meditatie uit'}, P('remove-reminder', {for: 'habit'}), HB);
seed('delete-habit', 'delete a habit (confirmation)', {en: 'Delete my Walk habit', nl: 'Verwijder mijn gewoonte Wandelen'}, P('delete-record', {what: 'habit'}), {...HB, important: true});
// Goals
seed('create-goal', 'a new goal', {en: 'Create a goal for a new laptop, fifteen hundred euros by next June', nl: 'Maak een doel voor een nieuwe laptop, vijftienhonderd euro tegen volgend jaar juni'}, {kinds: ['create-goal'], fields: [{kind: 'create-goal', target: 1500}]}, {...G, important: true});
seed('goal-note', 'a goal note', {en: 'Add a note to my Japan adventure goal: flights booked', nl: 'Voeg een notitie toe aan mijn doel Japan adventure: vluchten geboekt'}, {kinds: ['add-goal-note']}, {...G, important: true});
seed('milestone', 'a milestone', {en: 'Add a milestone to the Japan goal called halfway there', nl: 'Voeg een mijlpaal toe aan het Japan-doel: halverwege'}, {kinds: ['add-milestone']}, G);
seed('edit-goal', 'rename a goal', {en: 'Rename the Japan adventure goal to Japan in spring', nl: 'Hernoem het doel Japan adventure naar Japan in de lente'}, P('edit-goal', {name: 'Japan in spring'}), G);
seed('close-goal', 'close a goal', {en: 'Close the Japan adventure goal, I am done with it', nl: 'Sluit het doel Japan adventure af, ik ben er klaar mee'}, {kinds: ['close-goal']}, G);
seed('reopen-goal', 'reopen a goal', {en: 'Reopen the Japan adventure goal', nl: 'Heropen het doel Japan adventure'}, {kinds: ['reopen-goal']}, G);
seed('fund', 'fund a goal (form)', {en: 'Put two hundred euros towards the Japan adventure goal', nl: 'Stort tweehonderd euro op het doel Japan adventure'}, P('prefill-contribution', {amount: 200}), {...G, important: true});
seed('delete-goal', 'delete a goal (confirmation)', {en: 'Delete the Emergency fund goal', nl: 'Verwijder het doel Emergency fund'}, P('delete-record', {what: 'goal'}), G);
// Today and Settings
seed('widget', 'a widget', {en: 'Put my Walk habit on Today as a widget', nl: 'Zet mijn gewoonte Wandelen als widget op Today'}, {kinds: ['add-widget']}, T);
seed('link', 'a link', {en: 'Add a link to my running club at https://run.example.org', nl: 'Voeg een link toe naar mijn loopclub op https://run.example.org'}, {kinds: ['add-link']}, T);
seed('link-rename', 'rename a link', {en: 'Rename my Running club link to Run crew', nl: 'Hernoem mijn link Running club naar Run crew'}, P('edit-link', {label: 'Run crew'}), T);
seed('preset', 'a Today preset', {en: 'Switch Today to the Wealth preset', nl: 'Zet Today op de preset Wealth'}, P('set-today-preset', {preset: 'wealth'}), T);
seed('intention', 'a weekly intention', {en: 'My intention this week is to walk after lunch every day', nl: 'Mijn intentie deze week is elke dag na de lunch wandelen'}, {kinds: ['review-intention']}, T);
seed('skip-review', 'skip the review', {en: 'Skip this week\'s review, I was away', nl: 'Sla de terugblik van deze week over, ik was weg'}, {kinds: ['skip-review']}, T);
seed('review-day', 'the review weekday', {en: 'Move my weekly review to Sunday', nl: 'Verzet mijn wekelijkse terugblik naar zondag'}, P('set-review-weekday', {weekday: 'sunday'}), T);
seed('wrap-up', 'the wrap-up time', {en: 'Do the evening wrap-up at nine instead', nl: 'Doe de avondafsluiting voortaan om negen uur'}, P('set-wrap-up', {time: '21:00'}), T);
seed('remember', 'a preference to remember', {en: 'Remember that I prefer morning workouts', nl: 'Onthoud dat ik liever \'s ochtends sport'}, {kinds: ['remember']}, T);
seed('hide-page', 'hide a page', {en: 'Hide the Chess page, I never use it', nl: 'Verberg de pagina Chess, ik gebruik hem nooit'}, P('set-page-visibility', {page: 'chess', shown: false}), S);
seed('start-page', 'the start page', {en: 'Open the app on Habits from now on', nl: 'Open de app voortaan op Habits'}, P('set-start-page', {page: 'habits'}), S);
seed('zigi-look', 'ZIGi\'s side and size', {en: 'Put ZIGi on the left and make it bigger', nl: 'Zet ZIGi links en maak hem groter'}, P('set-zigi-look', {side: 'left', size: 'l'}), S);
seed('zigi-knock', 'no knocking', {en: 'Stop ZIGi from knocking', nl: 'Laat ZIGi niet meer kloppen'}, P('set-zigi-look', {knock: false}), S);
// Wealth forms
seed('holding', 'a holding (form)', {en: 'Add a holding of half a bitcoin', nl: 'Voeg een bezit toe van een halve bitcoin'}, {kinds: ['prefill-holding']}, W);
seed('balance', 'an account balance (form)', {en: 'My savings account balance is twelve hundred and fifty euros', nl: 'Het saldo van mijn spaarrekening is twaalfhonderdvijftig euro'}, {kinds: ['update-account-balance'], fields: [{kind: 'update-account-balance', balance: '1250'}]}, {...W, important: true});
seed('account', 'a new account (form)', {en: 'Add a savings account called Rainy day with fifteen hundred euros', nl: 'Voeg een spaarrekening toe, Rainy day, met vijftienhonderd euro'}, P('prefill-account', {accountKind: 'savings', balance: 1500}), W);
// Lookups (the device answers most of these without a model; the model is scored on the facts when it is asked)
const L = (area, page) => ({area, page, kind: 'lookup'});
seed('lk-steps-week', 'steps this week', {en: 'How many steps did I walk this week?', nl: 'Hoeveel stappen heb ik deze week gezet?'}, {kinds: [], facts: [{tool: 'steps', pick: 'first'}]}, {...L('health', 'health'), important: true});
seed('lk-water-yesterday', 'water yesterday', {en: 'How much water did I drink yesterday?', nl: 'Hoeveel water heb ik gisteren gedronken?'}, {kinds: [], facts: [{tool: 'water', pick: 'first'}]}, L('health', 'health'));
seed('lk-weight', 'the latest weight', {en: 'What is my latest weight?', nl: 'Wat is mijn laatste gewicht?'}, {kinds: [], facts: [{tool: 'weight', pick: 'first'}]}, {...L('health', 'health'), important: true});
seed('lk-sleep', 'last night', {en: 'How did I sleep last night?', nl: 'Hoe heb ik vannacht geslapen?'}, {kinds: [], toolsAny: ['sleep_nights']}, L('sleep', 'health'));
seed('lk-meditation', 'mindful minutes', {en: 'How many mindful minutes this week?', nl: 'Hoeveel mindful minuten deze week?'}, {kinds: [], toolsAny: ['meditation_summary', 'meditation_sessions']}, L('meditation', 'health'));
seed('lk-goal', 'goal progress', {en: 'How far along is my Japan adventure goal?', nl: 'Hoe ver ben ik met mijn doel Japan adventure?'}, {kinds: [], toolsAny: ['goal_progress']}, {...L('goals', 'goals'), important: true});
seed('lk-streak', 'a streak', {en: 'What is my streak on Read?', nl: 'Wat is mijn reeks voor Lezen?'}, {kinds: [], toolsAny: ['habit_stats']}, L('habits', 'habits'));
seed('lk-net-worth', 'net worth', {en: 'What is my net worth?', nl: 'Wat is mijn nettovermogen?'}, {kinds: [], toolsAny: ['net_worth', 'totals_per_currency']}, L('wealth', 'wealth'));
seed('lk-debts', 'the debts', {en: 'What do I owe?', nl: 'Wat ben ik schuldig?'}, {kinds: [], toolsAny: ['accounts', 'net_worth']}, L('wealth', 'wealth'));
seed('lk-calories', 'calories today', {en: 'How many calories have I had today?', nl: 'Hoeveel calorieën heb ik vandaag gehad?'}, {kinds: [], toolsAny: ['nutrient_totals', 'diary_entries']}, L('health', 'health'));
// Navigation (device-side)
const N = (area, page) => ({area, page, kind: 'local-first'});
seed('nav-sleep', 'the sleep page', {en: 'Open my sleep page', nl: 'Open mijn slaappagina'}, {localFirst: true, mustContain: ['Sleep']}, {...N('today', 'today'), important: true});
seed('nav-habits', 'the habits page', {en: 'Take me to my habits', nl: 'Ga naar mijn gewoontes'}, {localFirst: true, mustContain: ['Habits']}, N('today', 'today'));
seed('nav-goals', 'the goals page', {en: 'Show me the goals page', nl: 'Laat de doelenpagina zien'}, {localFirst: true, mustContain: ['Goals']}, N('today', 'today'));
seed('nav-settings', 'the settings', {en: 'Open the settings', nl: 'Open de instellingen'}, {localFirst: true, mustContain: ['Settings']}, N('today', 'today'));
seed('nav-portfolio', 'the portfolio', {en: 'Go to my portfolio', nl: 'Ga naar mijn portfolio'}, {localFirst: true, mustContain: ['Portfolio']}, N('today', 'today'));
seed('nav-today', 'Today', {en: 'Go back to today', nl: 'Ga terug naar vandaag'}, {localFirst: true, mustContain: ['Today']}, N('habits', 'habits'));
// Refusals (a "no" with the reason, never a card)
const R = (area, page) => ({area, page, kind: 'refuse'});
seed('no-delete-all', 'delete everything', {en: 'Delete all my habits and goals and start over', nl: 'Verwijder al mijn gewoontes en doelen en begin opnieuw'}, REFUSE, {...R('habits', 'habits'), important: true});
seed('no-buy', 'buy crypto', {en: 'Buy two bitcoin for me', nl: 'Koop twee bitcoin voor mij'}, REFUSE, {...R('wealth', 'wealth'), important: true});
seed('no-sell', 'sell a holding', {en: 'Sell half of my ether', nl: 'Verkoop de helft van mijn ether'}, REFUSE, R('wealth', 'wealth'));
seed('no-predict', 'a price prediction', {en: 'What will bitcoin cost tomorrow?', nl: 'Wat gaat bitcoin morgen kosten?'}, REFUSE, R('markets', 'wealth'));
seed('no-milestone-tick', 'tick a milestone', {en: 'Mark the milestone flights booked as reached on the Japan goal', nl: 'Markeer de mijlpaal vluchten geboekt als behaald op het Japan-doel'}, REFUSE, R('goals', 'goals'));

// ---- Requests ----
const SYSTEM = `You write what a real person would SAY OUT LOUD to a voice assistant inside a habits, health, goals and money app, as a speech recogniser would transcribe it. You are given one typed request and its language. Return a JSON array of exactly ${PER_SEED} strings, one per listed phenomenon, in the listed order. Rules: keep EVERY fact exactly (names of habits, goals, foods and pages; numbers, units, times, dates, days; the thing asked for); never add, drop or change a fact; a self-correction must END on the given facts; stay in the given language (a code-switch item may borrow one or two words from the other language, English or Dutch, nothing else); vary the wording between items; plain text only, no quotes around numbers, no emoji, no explanations; output the JSON array and nothing else.`;
const prompt = s => `Language: ${s.lang === 'nl' ? 'Dutch (Nederlands)' : 'English'}\nTyped request: ${JSON.stringify(s.typed)}\nPhenomena, one utterance each, in this order:\n${PHENOMENA.map(([name, how], i) => `${i + 1}. ${name}: ${how}`).join('\n')}`;
const request = s => ({custom_id: s.id, params: {model: MODEL, max_tokens: 1200, output_config: {effort: 'medium'}, system: SYSTEM, messages: [{role: 'user', content: prompt(s)}]}});
const tokensOf = text => Math.ceil(text.length / 3.5);
const forecast = () => {
  const input = seeds.reduce((sum, s) => sum + tokensOf(SYSTEM) + tokensOf(prompt(s)) + 40, 0), output = seeds.length * 900;
  return {requests: seeds.length, input, output, usd: estimateCost(MODEL, {input, output, cacheWrite: 0, cacheRead: 0}, {batch: true})};
};
const headers = () => {
  const key = process.env.ANTHROPIC_TEST_KEY; if (!key) { console.error('ANTHROPIC_TEST_KEY is not in the environment (source the env file in a subshell).'); process.exit(2); }
  return {'x-api-key': key, 'anthropic-version': VERSION, 'content-type': 'application/json'};
};
async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {...init, headers: {...headers(), ...(init.headers ?? {})}});
  const text = await res.text();
  // A key-shaped token in an error body is masked; the shape is assembled at run time so this file never carries it.
  if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status}: ${text.replace(new RegExp(`${['sk', 'ant', ''].join('-')}[A-Za-z0-9_-]+`, 'g'), '***').slice(0, 300)}`);
  return text;
}
const hash = s => createHash('sha256').update(s).digest('hex');

if (cmd === 'seeds') {
  const by = {}; for (const s of seeds) { const k = `${s.lang}/${s.kind}`; by[k] = (by[k] ?? 0) + 1; }
  console.log(JSON.stringify({seeds: seeds.length, utterances: seeds.length * PER_SEED, by, forecast: forecast()}, null, 1));
} else if (cmd === 'submit') {
  const f = forecast();
  console.log(`forecast: ${f.requests} requests, ~${f.input} input + ~${f.output} output tokens, ~$${f.usd.toFixed(2)} at batch prices (cap $${MAX_USD})`);
  if (!(f.usd <= MAX_USD)) { console.error('refused: the forecast is over the cap'); process.exit(3); }
  mkdirSync(join(OUT, 'gen'), {recursive: true});
  const body = JSON.stringify({requests: seeds.map(request)});
  const created = JSON.parse(await api('/v1/messages/batches', {method: 'POST', body}));
  writeFileSync(join(OUT, 'gen', `batch-${created.id}.json`), JSON.stringify({id: created.id, createdAt: created.created_at, model: MODEL, perSeed: PER_SEED, phenomena: PHENOMENA.map(p => p[0]), seeds, forecast: f}, null, 1));
  console.log(`batch ${created.id} created (${created.processing_status}); wait with: node scripts/zigi/spoken-corpus-gen.mjs wait ${created.id}`);
} else if (cmd === 'wait' || cmd === 'fetch') {
  const id = args[1]; if (!id) { console.error('batch id missing'); process.exit(2); }
  const meta = JSON.parse(readFileSync(join(OUT, 'gen', `batch-${id}.json`), 'utf8'));
  let batch = JSON.parse(await api(`/v1/messages/batches/${id}`));
  while (cmd === 'wait' && batch.processing_status !== 'ended') {
    console.log(`${new Date().toISOString()} ${batch.processing_status}: ${JSON.stringify(batch.request_counts)}`);
    await new Promise(r => setTimeout(r, 60_000));
    batch = JSON.parse(await api(`/v1/messages/batches/${id}`));
  }
  if (batch.processing_status !== 'ended') { console.log(`not ended yet: ${batch.processing_status} ${JSON.stringify(batch.request_counts)}`); process.exit(4); }
  const lines = (await api(`/v1/messages/batches/${id}/results`)).split('\n').filter(Boolean).map(l => JSON.parse(l));
  const usage = {input: 0, output: 0, cacheWrite: 0, cacheRead: 0}; let succeeded = 0; const bad = [], asks = [];
  for (const row of lines) {
    const s = meta.seeds.find(x => x.id === row.custom_id); if (!s) { bad.push(`${row.custom_id}: unknown seed`); continue; }
    if (row.result.type !== 'succeeded') { bad.push(`${row.custom_id}: ${row.result.type}`); continue; }
    const m = row.result.message, u = m.usage ?? {};
    usage.input += u.input_tokens ?? 0; usage.output += u.output_tokens ?? 0; usage.cacheWrite += u.cache_creation_input_tokens ?? 0; usage.cacheRead += u.cache_read_input_tokens ?? 0;
    const text = (m.content ?? []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    let list; try { list = JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')); } catch { bad.push(`${row.custom_id}: not a JSON array`); continue; }
    if (!Array.isArray(list) || list.length !== PER_SEED || list.some(x => typeof x !== 'string' || !x.trim())) { bad.push(`${row.custom_id}: ${Array.isArray(list) ? list.length : 'no'} items`); continue; }
    succeeded++;
    list.forEach((ask, i) => asks.push({id: `sp-${s.id}-${meta.phenomena[i]}`, seed: s.id, concept: s.concept, phenomenon: meta.phenomena[i], lang: s.lang, area: s.area, page: s.page, kind: s.kind, ask: ask.trim(), expect: s.expect, ...(s.important ? {important: true} : {}), ...(s.health ? {health: s.health} : {})}));
  }
  const holdout = asks.filter(a => parseInt(hash(a.id).slice(0, 8), 16) % 100 < 30), train = asks.filter(a => !holdout.includes(a));
  mkdirSync(OUT, {recursive: true});
  writeFileSync(join(OUT, 'train.jsonl'), train.map(a => JSON.stringify(a)).join('\n') + '\n');
  writeFileSync(join(OUT, 'holdout.jsonl'), holdout.map(a => JSON.stringify(a)).join('\n') + '\n');
  const cost = estimateCost(MODEL, usage, {batch: true});
  writeFileSync(join(OUT, 'gen', `usage-${id}.json`), JSON.stringify({summary: {provider: 'anthropic', model: MODEL, host: 'Anthropic API (batch)', batch: true, base: 'redacted', batchId: id, requests: lines.length, succeeded, tokens: usage, costUsd: cost, finishedAt: new Date().toISOString(), bad}}, null, 1));
  const ts = `/**\n * Session Z-Local Part 4: the held-out 30 % of the spoken corpus (English and Dutch asks a person would SAY, rendered by\n * Claude Opus 5.5 through the Batch API from device-made seeds; \`scripts/zigi/spoken-corpus-gen.mjs\`, batch ${id}).\n * GENERATED: do not edit by hand; re-run the generator. Each case's expectation is its seed's, never the model's.\n * Model-scored by the harness with \`ZIGI_SET=spoken\`; the deterministic spoken rules live in \`golden-spoken.ts\`.\n * ${holdout.length} cases (${holdout.filter(a => a.lang === 'en').length} English, ${holdout.filter(a => a.lang === 'nl').length} Dutch) of ${asks.length} generated; the other ${train.length} are the training set on the runs branch.\n */\nimport type {ModelCase} from './corpus';\n\nexport const SPOKEN: readonly ModelCase[] = ${JSON.stringify(holdout.map(({seed: _s, concept: _c, phenomenon: _p, ...c}) => c), null, 0).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};\n`;
  writeFileSync(join(REPO, 'apps/web/lib/ai/evals/corpus-spoken.ts'), ts);
  console.log(`${succeeded}/${lines.length} seeds rendered → ${asks.length} asks: ${train.length} train, ${holdout.length} hold-out; tokens ${JSON.stringify(usage)}; $${cost.toFixed(4)} at batch prices${bad.length ? `; ${bad.length} problems: ${bad.slice(0, 5).join('; ')}` : ''}`);
} else if (cmd === 'rebuild') {
  // The asks stay as the batch rendered them; only the expectations (and area, page, kind, importance) come from the seeds as this file now defines them.
  const id = args[1]; if (!id) { console.error('batch id missing'); process.exit(2); }
  const read = name => readFileSync(join(OUT, name), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const refresh = a => { const s = seeds.find(x => x.id === a.seed); if (!s) throw new Error(`seed ${a.seed} is gone`); return {...a, area: s.area, page: s.page, kind: s.kind, expect: s.expect, ...(s.important ? {important: true} : {important: undefined}), ...(s.health ? {health: s.health} : {})}; };
  const clean = a => JSON.parse(JSON.stringify(a));
  const train = read('train.jsonl').map(refresh).map(clean), holdout = read('holdout.jsonl').map(refresh).map(clean);
  writeFileSync(join(OUT, 'train.jsonl'), train.map(a => JSON.stringify(a)).join('\n') + '\n');
  writeFileSync(join(OUT, 'holdout.jsonl'), holdout.map(a => JSON.stringify(a)).join('\n') + '\n');
  const ts = `/**\n * Session Z-Local Part 4: the held-out 30 % of the spoken corpus (English and Dutch asks a person would SAY, rendered by\n * Claude Opus 5.5 through the Batch API from device-made seeds; \`scripts/zigi/spoken-corpus-gen.mjs\`, batch ${id}).\n * GENERATED: do not edit by hand; re-run the generator. Each case's expectation is its seed's, never the model's.\n * Model-scored by the harness with \`ZIGI_SET=spoken\`; the deterministic spoken rules live in \`golden-spoken.ts\`.\n * ${holdout.length} cases (${holdout.filter(a => a.lang === 'en').length} English, ${holdout.filter(a => a.lang === 'nl').length} Dutch) of ${train.length + holdout.length} generated; the other ${train.length} are the training set on the runs branch.\n */\nimport type {ModelCase} from './corpus';\n\nexport const SPOKEN: readonly ModelCase[] = ${JSON.stringify(holdout.map(({seed: _s, concept: _c, phenomenon: _p, ...c}) => c), null, 0).replace(/\},\{/g, '},\n  {').replace(/^\[/, '[\n  ').replace(/\]$/, ',\n]')};\n`;
  writeFileSync(join(REPO, 'apps/web/lib/ai/evals/corpus-spoken.ts'), ts);
  console.log(`rebuilt from the seeds: ${train.length} train, ${holdout.length} hold-out`);
} else { console.error('unknown command'); process.exit(2); }
