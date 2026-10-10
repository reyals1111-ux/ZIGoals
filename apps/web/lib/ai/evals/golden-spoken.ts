import type {Intent} from '../intent';
import type {LocalCase} from './golden-set';

/**
 * Session Z-Local Part 4 (ADR-020 L6, L15): the spoken golden set, run on every CI run (`golden-spoken.test.ts`) against
 * the parts that read a spoken message on the device: the normaliser, the intent router, the day cue, the quantity cue,
 * the navigation intent and the on-device answers. Every case is deterministic (no model is ever called), so the bar is
 * all of them. The expectations are plain spoken-to-typed equivalences in English and Dutch, written out here one by
 * one; the number tables are the languages' own words.
 */
export type SpokenCase =
  | {id: string; category: 'normalize'; input: string; output: string}
  | {id: string; category: 'intent'; input: string; expect: Partial<Intent> & {card?: boolean}}
  | {id: string; category: 'day'; input: string; today: string; expect: string | null}
  | {id: string; category: 'quantity'; reply: string; message: string; expect: Record<string, unknown>[]}
  | {id: string; category: 'navigate'; input: string; expect: {page: string; view?: string} | null}
  | ({category: 'local'} & Omit<LocalCase, 'category'>);
export const SPOKEN_CATEGORIES = ['normalize', 'intent', 'day', 'quantity', 'navigate', 'local'] as const;

const cases: SpokenCase[] = [];
let n = 0;
const norm = (input: string, output: string, tag = 'norm') => { cases.push({id: `sp-${tag}-${++n}`, category: 'normalize', input, output}); };
const block = (json: string) => `Noted.\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;

// ---- Number words: English ----
const EN: [string, number][] = [['zero', 0], ['one', 1], ['two', 2], ['three', 3], ['four', 4], ['five', 5], ['six', 6], ['seven', 7], ['eight', 8], ['nine', 9], ['ten', 10], ['eleven', 11], ['twelve', 12], ['thirteen', 13], ['fourteen', 14], ['fifteen', 15], ['sixteen', 16], ['seventeen', 17], ['eighteen', 18], ['nineteen', 19], ['twenty', 20], ['thirty', 30], ['forty', 40], ['fifty', 50], ['sixty', 60], ['seventy', 70], ['eighty', 80], ['ninety', 90],
  ['twenty one', 21], ['twenty-two', 22], ['twenty five', 25], ['thirty three', 33], ['thirty-eight', 38], ['forty four', 44], ['forty-nine', 49], ['fifty five', 55], ['sixty six', 66], ['seventy-two', 72], ['eighty eight', 88], ['ninety nine', 99],
  ['a hundred', 100], ['one hundred', 100], ['a hundred and twenty', 120], ['two hundred', 200], ['two hundred and fifty', 250], ['three hundred twelve', 312], ['twelve hundred', 1200], ['fifteen hundred', 1500], ['a thousand', 1000], ['two thousand', 2000], ['two thousand five hundred', 2500], ['ten thousand', 10000], ['twelve thousand', 12000]];
for (const [words, value] of EN) { norm(`log ${words} steps`, `log ${value} steps`, 'en-num'); norm(`I drank ${words} glasses of water`, `I drank ${value} glasses of water`, 'en-num'); }
// ---- Number words: Dutch ----
const NL: [string, number][] = [['nul', 0], ['één', 1], ['twee', 2], ['drie', 3], ['vier', 4], ['vijf', 5], ['zes', 6], ['zeven', 7], ['acht', 8], ['negen', 9], ['tien', 10], ['elf', 11], ['twaalf', 12], ['dertien', 13], ['veertien', 14], ['vijftien', 15], ['zestien', 16], ['zeventien', 17], ['achttien', 18], ['negentien', 19], ['twintig', 20], ['dertig', 30], ['veertig', 40], ['vijftig', 50], ['zestig', 60], ['zeventig', 70], ['tachtig', 80], ['negentig', 90],
  ['eenentwintig', 21], ['tweeëntwintig', 22], ['drieëntwintig', 23], ['vijfentwintig', 25], ['zesentwintig', 26], ['drieëndertig', 33], ['achtendertig', 38], ['vierenveertig', 44], ['negenenveertig', 49], ['vijfenvijftig', 55], ['zesenzestig', 66], ['tweeënzeventig', 72], ['achtentachtig', 88], ['negenennegentig', 99],
  ['honderd', 100], ['honderdtwintig', 120], ['tweehonderd', 200], ['tweehonderdvijftig', 250], ['driehonderdtwaalf', 312], ['twaalfhonderd', 1200], ['vijftienhonderd', 1500], ['duizend', 1000], ['tweeduizend', 2000], ['tweeduizend vijfhonderd', 2500], ['tienduizend', 10000], ['twaalfduizend', 12000]];
for (const [words, value] of NL) { norm(`log ${words} stappen`, `log ${value} stappen`, 'nl-num'); norm(`ik dronk ${words} glazen water`, `ik dronk ${value} glazen water`, 'nl-num'); }
// ---- Articles, halves, quarters, decimals ----
for (const [i, o] of [['a glass of water', '1 glass of water'], ['an hour of walking', '1 hour of walking'], ['een glas water', '1 glas water'], ['een uur gewandeld', '1 uur gewandeld'], ['one of my habits', 'one of my habits'], ['een gewoonte toevoegen', 'een gewoonte toevoegen'], ['add a habit', 'add a habit'],
  ['two and a half litres', '2.5 litres'], ['half a litre of water', '0.5 litre of water'], ['an hour and a half', '1.5 hour'], ['a quarter of an hour of reading', '15 minutes of reading'], ['three quarters of an hour', '45 minutes'], ['anderhalve liter water', '1.5 liter water'], ['twee en een half uur', '2.5 uur'], ['een half uur gelezen', '0.5 uur gelezen'], ['een kwartier gemediteerd', '15 minuten gemediteerd'], ['drie kwartier gewandeld', '45 minuten gewandeld'],
  ['seventy two point five kilos', '72.5 kilos'], ['tweeënzeventig komma vijf kilo', '72.5 kilo'], ['log 1,5 liter water', 'log 1.5 liter water'], ['I ran 5,000 steps', 'I ran 5000 steps'], ['ten k steps', '10000 steps'], ['twelve k steps today', '12000 steps today']] as [string, string][]) norm(i, o, 'frac');
// ---- Fillers and wake words ----
for (const [i, o] of [['um, log two glasses of water', 'log 2 glasses of water'], ['uh log my weight', 'log my weight'], ['hey ZIGi, skip my walk', 'skip my walk'], ['Okay zigi, uh, skip my walk', 'skip my walk'], ['ZIGi, how many steps today?', 'how many steps today?'], ['euh, ik heb, eh, drie glazen water gedronken', 'ik heb 3 glazen water gedronken'], ['hé zigi, open mijn slaappagina', 'open mijn slaappagina'], ['you know, I walked a lot today', 'I walked a lot today'], ['I mean, log it', 'log it'], ['zeg maar, twintig minuten gelezen', '20 minuten gelezen'], ['hmm, remind me at seven', 'remind me at 7'], ['erm log twenty minutes', 'log 20 minutes'], ['ehm, noteer tien stappen', 'noteer 10 stappen'], ['so um I slept badly', 'so I slept badly'], ['nou ja, ik heb gewandeld', 'ik heb gewandeld']] as [string, string][]) norm(i, o, 'filler');
// ---- Clock idioms ----
for (const [i, o] of [['half past seven', '7:30'], ['quarter past seven', '7:15'], ['a quarter to eight', '7:45'], ['ten past seven', '7:10'], ['twenty to eight', '7:40'], ['seven o\'clock', '7:00'], ['at seven thirty', 'at 7:30'], ['at seven thirty tonight', 'at 19:30 tonight'], ['half past seven in the evening', '19:30 in the evening'], ['quarter to eight in the evening', '19:45 in the evening'], ['ten past six in the morning', '6:10 in the morning'], ['at 7:30 pm', 'at 19:30'], ['at 11:15 am', 'at 11:15'], ['at 12:30 am', 'at 0:30'], ['remind me at 7 pm', 'remind me at 7 pm'],
  ['half acht', '7:30'], ['half acht \'s avonds', '19:30 \'s avonds'], ['kwart over zeven', '7:15'], ['kwart voor acht', '7:45'], ['tien over zeven', '7:10'], ['tien voor acht', '7:50'], ['vijf voor half acht', '7:25'], ['vijf over half acht', '7:35'], ['tien voor half acht', '7:20'], ['om zeven uur', 'om 7:00'], ['om zeven uur \'s avonds', 'om 19:00 \'s avonds'], ['om half elf', 'om 10:30'], ['om kwart over elf naar bed', 'om 11:15 naar bed'], ['om 7 uur 15', 'om 7:15'], ['vanavond om acht uur', 'vanavond om 20:00']] as [string, string][]) norm(i, o, 'clock');
// ---- Self-corrections ----
for (const [i, o] of [['log 3 glasses, no, 4', 'log 4 glasses'], ['log twenty five minutes, no wait, thirty', 'log 30 minutes'], ['two glasses, make that three glasses', '3 glasses'], ['I walked five, sorry, six kilometres', 'I walked 6 kilometres'], ['ten thousand steps, I mean eleven thousand', '11000 steps'], ['drie glazen, nee, vier', '4 glazen'], ['ik heb drie kilometer gelopen, nee wacht, vier', 'ik heb 4 kilometer gelopen'], ['twintig minuten, ik bedoel dertig minuten', '30 minuten'], ['zet er twee glazen bij, maak er drie van', 'zet er 3 glazen bij'], ['log 500 ml, correction, 750 ml', 'log 750 ml'], ['twee uur, eigenlijk drie uur geslapen', '3 uur geslapen'], ['twenty, actually twenty five minutes', '25 minutes']] as [string, string][]) norm(i, o, 'fix');
// ---- Left as they are: ranges, questions, names, typed figures ----
for (const i of ['from 7 to 8 I walked', 'I did 3 to 5 reps', 'I slept from 11 to 7', 'How many steps did I walk last week?', 'what\'s my weight', 'skip my walk tomorrow', 'Delete my Walk habit', 'Open my sleep page', 'Hoeveel water heb ik gisteren gedronken?', 'Pauzeer mijn gewoonte Lezen', 'log 2 glasses of water', 'ik woog 72.5 kg', 'remind me at 19:30', 'Mark the Japan goal as done', 'add a note to my Lisbon goal: flights booked', 'I ate two eggs and a banana', 'What is one plus one?', 'What is one plus one plus 2?', 'my second habit', 'the first one', 'a note for later']) norm(i, i.replace(/\btwo eggs and a banana\b/, '2 eggs and 1 banana'), 'same');

// ---- The intent router reads the spoken form ----
const intent = (input: string, expect: Partial<Intent> & {card?: boolean}) => { cases.push({id: `sp-intent-${++n}`, category: 'intent', input, expect}); };
for (const i of ['um, log two glasses of water', 'hey zigi, I drank two and a half litres', 'I walked ten thousand steps', 'ik heb drie glazen water gedronken', 'euh, ik heb twintig minuten gemediteerd', 'I weigh seventy two point five kilos', 'log twenty five minutes, no wait, thirty', 'twee uur geslapen vannacht', 'I slept from half past eleven to seven', 'ik heb gisteren vijfduizend stappen gezet']) intent(i, {log: true, lookup: false, plan: false});
for (const i of ['remind me at quarter to eight', 'zet een herinnering om half acht', 'hey zigi, add a habit called stretching', 'maak een gewoonte aan: lezen, twintig minuten', 'um, create a goal for a new laptop, fifteen hundred euros', 'plan my meal for tomorrow']) intent(i, {card: true, lookup: false, refuse: false, asks: false}); // a card is asked for (the router's log/plan split is its own business)
for (const i of ['hey zigi, how many steps did I walk this week?', 'um, how much water did I drink yesterday?', 'hoeveel stappen heb ik vandaag gezet?', 'euh, wat is mijn gewicht?', 'how long did I sleep last night?', 'what\'s my longest streak?']) intent(i, {lookup: true, log: false, plan: false});
for (const i of ['uh, delete my walk habit', 'verwijder mijn gewoonte lezen', 'buy two bitcoin', 'koop vijf ether']) intent(i, {refuse: true});

// ---- The day cue reads the spoken form ----
const day = (input: string, today: string, expect: string | null) => { cases.push({id: `sp-day-${++n}`, category: 'day', input, today, expect}); };
day('um, yesterday I drank two glasses', '2026-09-20', 'yesterday'); day('gisteren heb ik drie glazen gedronken', '2026-09-20', 'yesterday'); day('the day before yesterday I walked ten thousand steps', '2026-09-20', '2026-09-18'); day('eergisteren tienduizend stappen', '2026-09-20', '2026-09-18');
day('last Monday I ran', '2026-09-20', '2026-09-14'); day('afgelopen maandag gewandeld', '2026-09-20', '2026-09-14'); day('on Friday I meditated twenty minutes', '2026-09-20', '2026-09-18'); day('vrijdag twintig minuten gemediteerd', '2026-09-20', '2026-09-18');
day('tomorrow I will walk', '2026-09-20', null); day('morgen ga ik wandelen', '2026-09-20', null); day('yesterday and Monday', '2026-09-20', null); day('log two glasses of water', '2026-09-20', null); day('hey zigi, log two glasses', '2026-09-20', null); day('this morning I weighed seventy kilos', '2026-09-20', null); day('vanmorgen zeventig kilo gewogen', '2026-09-20', null); day('next week I start', '2026-09-20', null);

// ---- The quantity cue fills or corrects a log card ----
const quantity = (reply: string, message: string, expect: Record<string, unknown>[]) => { cases.push({id: `sp-qty-${++n}`, category: 'quantity', reply, message, expect}); };
quantity(block('{"kind":"log-water"}'), 'log two glasses of water', [{kind: 'log-water', glasses: 2, day: 'today'}]);
quantity(block('{"kind":"log-water"}'), 'ik dronk anderhalve liter water', [{kind: 'log-water', millilitres: 1500, day: 'today'}]);
quantity(block('{"kind":"log-water","glasses":3}'), 'log 3 glasses', [{kind: 'log-water', glasses: 3, day: 'today'}]);
quantity(block('{"kind":"log-water","millilitres":500}'), 'log two glasses of water', [{kind: 'log-water', millilitres: 500, day: 'today'}]);
quantity(block('{"kind":"log-water","millilitres":250}'), 'ik heb drie glazen water gedronken', [{kind: 'log-water', glasses: 3, day: 'today'}]);
quantity(block('{"kind":"log-steps","steps":1000}'), 'I walked ten thousand steps', [{kind: 'log-steps', steps: 10000, day: 'today'}]);
quantity(block('{"kind":"log-steps","steps":12000}'), 'twelve k steps today', [{kind: 'log-steps', steps: 12000, day: 'today'}]);
quantity(block('{"kind":"log-meditation","minutes":20}'), 'twenty minutes of meditation, no wait, twenty five', [{kind: 'log-meditation', minutes: 25, day: 'today'}]);
quantity(block('{"kind":"log-meditation","minutes":10}'), 'een half uur gemediteerd', [{kind: 'log-meditation', minutes: 30, day: 'today'}]);
quantity(block('{"kind":"log-weight","value":72,"unit":"kg"}'), 'I weigh seventy two point five kilos', [{kind: 'log-weight', value: 72.5, unit: 'kg', day: 'today'}]);
quantity(block('{"kind":"log-weight","value":160,"unit":"kg"}'), 'I weigh one hundred and sixty five pounds', [{kind: 'log-weight', value: 165, unit: 'lb', day: 'today'}]);
quantity(block('{"kind":"check-in","habit":"h1"}'), 'I read twenty pages', [{kind: 'check-in', habit: 'h1', day: 'today'}]);
quantity(block('{"kind":"log-water","glasses":1}'), 'two glasses of water and 30 minutes of walking', [{kind: 'log-water', glasses: 1, day: 'today'}]);
quantity(block('{"kind":"log-water","glasses":1}'), 'between 3 to 5 glasses', [{kind: 'log-water', glasses: 1, day: 'today'}]);
quantity(block('[{"kind":"log-water"},{"kind":"check-in","habit":"h1"}]'), 'two glasses of water and mark my walk', [{kind: 'log-water', glasses: 2, day: 'today'}, {kind: 'check-in', habit: 'h1', day: 'today'}]);
quantity(block('{"kind":"counter","counter":"Push-ups","count":2}'), 'twenty push-ups', [{kind: 'counter', counter: 'Push-ups', count: 20, day: 'today'}]);

// ---- Navigation, spoken ----
const nav = (input: string, expect: {page: string; view?: string} | null) => { cases.push({id: `sp-nav-${++n}`, category: 'navigate', input, expect}); };
nav('um, open my sleep page', {page: 'health', view: 'sleep'}); nav('hey zigi, take me to my portfolio', {page: 'portfolio'}); nav('ok zigi open the settings', {page: 'settings'}); nav('go to habits please', {page: 'habits'}); nav('show me the goals page', {page: 'goals'});
nav('euh, ga naar mijn gewoontes', {page: 'habits'}); nav('hé zigi, open de instellingen', {page: 'settings'}); nav('open mijn slaappagina', {page: 'health', view: 'sleep'}); nav('laat de portfolio zien', {page: 'portfolio'}); nav('ga naar vandaag', {page: 'today'});
nav('how many steps today?', null); nav('log two glasses of water', null); nav('open a bottle of wine', null); nav('open my walk habit', null);

// ---- On-device answers, spoken (the Showcase records, Health shared) ----
const local = (id: string, question: string, expect: LocalCase['expect'], health: 'open' | 'closed' = 'open') => { cases.push({id: `sp-local-${id}`, category: 'local', kind: 'local', question, health, expect}); };
local('steps-um', 'um, how many steps did I walk this week?', {reply: 'answer', includes: ['steps']});
local('steps-hey', 'hey zigi, how many steps did I walk this week?', {reply: 'answer', includes: ['steps']});
local('water-nl', 'euh, hoeveel water heb ik gisteren gedronken?', {reply: 'answer', includes: ['mL']});
local('water-closed', 'um, how much water did I drink yesterday?', {reply: 'refusal'}, 'closed');
local('weight-hey', 'zigi, what was my weight?', {reply: 'answer', includes: ['lb']}); // whole-Dutch questions stay the model's (the golden set pins x-nl-whole and x-nl-sleep as none)
local('sleep-en', 'erm, how did I sleep last night?', {reply: 'answer'});
local('sleep-um', 'um, how did I sleep last night?', {reply: 'answer'});
local('weigh-uh', 'uh, how much do I weigh?', {reply: 'answer', includes: ['lb']});
local('nl-whole-none', 'euh, hoeveel stappen heb ik gisteren gezet?', {reply: 'none'});
local('log-not', 'um, log two glasses of water', {reply: 'none'});
local('plan-not', 'hey zigi, add a habit called stretching', {reply: 'none'});

export const GOLDEN_SPOKEN: readonly SpokenCase[] = cases;
