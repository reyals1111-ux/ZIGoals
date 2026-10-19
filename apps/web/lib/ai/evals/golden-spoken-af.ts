import type {SpokenCase} from './golden-spoken';

/**
 * Session AF (L4, P8.6): the spoken golden cases of the Checklist by voice, spread into GOLDEN_SPOKEN and run on every CI
 * run (`golden-spoken.test.ts`). A `command` case is what the microphone delivers (fillers, a wake word, politeness, a
 * number in words, a self-correction), read on the device exactly as a spoken message is (normalised, then the
 * on-device answers) over the golden records plus the fictional Checklist path (fixtures-af.ts); it must become the one
 * card it names, or (`null`) no card at all. `navigate` cases open this session's pages by voice. No model, no network.
 */
type Card = Record<string, unknown>;
const cases: SpokenCase[] = [];
let n = 0;
const command = (input: string, expect: Card | null, health: 'open' | 'closed' = 'open') => { cases.push({id: `sp-af-cmd-${++n}`, category: 'command', input, expect, health}); };
const tick = (item: string, done = true): Card => ({kind: 'checklist-tick', item, done});
/** Each base command as it is said: bare, after a filler, after the wake word, and with a polite ending. */
function said(base: string, expect: Card, lang: 'en' | 'nl') {
  const [filler, wake, tail] = lang === 'en' ? [['um, ', 'uh '][n % 2]!, ['hey zigi, ', 'okay zigi, uh, '][n % 2]!, [' please', '.'][n % 2]!] : [['euh, ', 'eh, '][n % 2]!, ['hé zigi, ', 'hoi zigi, '][n % 2]!, [' alsjeblieft', '.'][n % 2]!];
  for (const input of [base, `${filler}${base}`, `${wake}${base}`, `${base}${tail}`]) command(input, expect);
}
// ---- English (the path: "Read" starred, "Buy running shoes" ticked today, "Push-ups" open, and Water) ----
said('mark push-ups done', tick('Push-ups'), 'en');
said('tick off push-ups', tick('Push-ups'), 'en');
said('push-ups done', tick('Push-ups'), 'en');
said('check off buy running shoes', tick('Buy running shoes'), 'en');
said('untick buy running shoes', tick('Buy running shoes', false), 'en');
said('mark push-ups as not done', tick('Push-ups', false), 'en');
said('add call mum to my checklist', {kind: 'checklist-add-custom', text: 'call mum'}, 'en');
said('favourite walk', {kind: 'checklist-add-favourite', item: 'Walk'}, 'en');
said('make exercise a favourite', {kind: 'checklist-add-favourite', item: 'Exercise'}, 'en');
said('start my sleep timer', {kind: 'start-night'}, 'en');
said('I\'m going to bed', {kind: 'start-night'}, 'en');
said('stop my sleep timer', {kind: 'end-night'}, 'en');
said('I just woke up', {kind: 'end-night'}, 'en');
said('end my fast', {kind: 'stop-fast'}, 'en');
said('start the timer for read', {kind: 'start-timer', habit: 'Read'}, 'en');
said('start my meditate timer', {kind: 'start-timer', habit: 'Meditate'}, 'en');
said('stop the timer', {kind: 'stop-timer', habit: 'Read'}, 'en');
// Numbers in words and self-corrections, as the normaliser reads them.
command('start a sixteen hour fast', {kind: 'start-fast', targetHours: 16});
command('um, start a sixteen hour fast', {kind: 'start-fast', targetHours: 16});
command('start a sixteen, no wait, eighteen hour fast', {kind: 'start-fast', targetHours: 18});
command('start a sixteen hour fast, no wait, eighteen', {kind: 'start-fast', targetHours: 18});
command('add five pages of reading to my checklist', {kind: 'checklist-add-custom', text: '5 pages of reading'});
command('could you mark push-ups done for me', tick('Push-ups'));
// ---- Dutch ----
said('vink push-ups af', tick('Push-ups'), 'nl');
said('vink push-ups af voor vandaag', tick('Push-ups'), 'nl');
said('push-ups gedaan', tick('Push-ups'), 'nl');
said('markeer push-ups als gedaan', tick('Push-ups'), 'nl');
said('vink push-ups uit', tick('Push-ups', false), 'nl');
said('voeg mama bellen toe aan mijn lijst', {kind: 'checklist-add-custom', text: 'mama bellen'}, 'nl');
said('maak walk een favoriet', {kind: 'checklist-add-favourite', item: 'Walk'}, 'nl');
said('start mijn slaaptimer', {kind: 'start-night'}, 'nl');
said('ik ga slapen', {kind: 'start-night'}, 'nl');
said('stop mijn slaaptimer', {kind: 'end-night'}, 'nl');
said('ik ben wakker', {kind: 'end-night'}, 'nl');
said('stop met vasten', {kind: 'stop-fast'}, 'nl');
said('start de timer voor read', {kind: 'start-timer', habit: 'Read'}, 'nl');
said('stop de timer', {kind: 'stop-timer', habit: 'Read'}, 'nl');
command('wil je push-ups afvinken', tick('Push-ups'));
command('kun je push-ups afvinken', tick('Push-ups'));
command('zet vijf bladzijden lezen op mijn lijst', {kind: 'checklist-add-custom', text: '5 bladzijden lezen'});
command('euh, zet vijf bladzijden lezen op mijn lijst', {kind: 'checklist-add-custom', text: '5 bladzijden lezen'});
command('start een vasten van zestien uur', {kind: 'start-fast', targetHours: 16});
command('euh, start een vasten van zestien uur', {kind: 'start-fast', targetHours: 16});
// ---- The stop rule holds when spoken: a second clause, an amount, another day, a question, a name nobody has ----
for (const input of ['um, mark push-ups done, and log a glass of water', 'mark push-ups done and then log my weight', 'uh, mark two push-ups done', 'mark push-ups done yesterday',
  'did I mark push-ups done', 'mark juggling done', 'tick off stretch', 'euh, vink push-ups gisteren af', 'vink push-ups af en log water', 'vink jongleren af', 'heb ik push-ups afgevinkt',
  'wat heb ik vandaag gedaan', 'um, what did I do today', 'start the juggling timer']) command(input, null);
// A Health dot is named only while Health is shared: with the gate open "water" is the path's Water dot; with it closed
// that dot is not on the path ZIGi sees, and the words find the habit "Drink water" instead (a habit, not Health).
command('mark water done', tick('Water'));
command('vink water af', tick('Water'));
command('mark water done', tick('Drink water'), 'closed');
command('vink water af', tick('Drink water'), 'closed');
// ---- navigate: this session's pages by voice ----
for (const [input, page, view] of [['open my checklist', 'checklist'], ['go to the checklist', 'checklist'], ['open de checklist', 'checklist'], ['open earn', 'earn'], ['go to earn', 'earn'],
  ['open start here', 'earn', 'start-here'], ['take me to the earn academy', 'earn', 'academy'], ['open de earn academy', 'earn', 'academy']] as const) {
  cases.push({id: `sp-af-nav-${++n}`, category: 'navigate', input, expect: view ? {page, view} : {page}});
}
export const GOLDEN_SPOKEN_AF: readonly SpokenCase[] = cases;
