import type {GoldenCase, GoldenCategory, LocalCase, ReplyCase} from './golden-set';

/**
 * Session AF (L4, Part 8; ADR-028 D7, H30, H47, H69): the golden cases of this session's ZIGi, spread into GOLDEN_SET
 * and run on every CI run with the rest (`golden-set.test.ts`). Every case is deterministic: the on-device answers run on
 * the golden records plus a small fictional Checklist path, the Earn snapshot made from the recorded Earn answers and
 * Today's page view (`env: 'af'`; `'af-bare'` has the Checklist but no snapshot and no page view, as before a visit to
 * Earn or on Settings), and the replies are MOCK replies written for this file. No provider is ever called.
 *
 * - command: the Checklist by voice and text (P8.6), English and Dutch, with the stop rule's negatives.
 * - bundle: plans (P8.4): one plan-bundle becomes its cards in order, cut at ten steps, one plan per reply, a bad step refused alone.
 * - earn: the Earn coach (P8.5): a figure only from the snapshot with its source and "as of", none without one; never ranked.
 * - page: page awareness (P8.7): titles only, Health cards only with the gate, nothing without a page view.
 * - brief: the brief and the recap asked in words (P8.2), Health counts only with the gate.
 * - reply / money: the new kinds through the whitelist; a staking card only fills in the review, signing is refused.
 */
const block = (value: unknown) => `\`\`\`zigoals-action\n${typeof value === 'string' ? value : JSON.stringify(value)}\n\`\`\``;
type Expect = LocalCase['expect'];
const local = (id: string, category: GoldenCategory, question: string, expect: Expect, options: {health?: 'open' | 'closed'; env?: 'af' | 'af-bare'} = {}): LocalCase =>
  ({id: `af-${id}`, category, kind: 'local', question, health: options.health ?? 'open', env: options.env ?? 'af', expect});
const reply = (id: string, category: GoldenCategory, text: string, expect: ReplyCase['expect']): ReplyCase => ({id: `af-${id}`, category, kind: 'reply', reply: text, expect});
const CONFIRM = 'Add it below when it looks right; nothing is written before.', CONFIRM_NL = 'Voeg het hieronder toe als het klopt; er wordt niets opgeslagen voor je dat doet.';
/** A command answered on the device: its words and the one card it carries (the fenced action, as the chat reads it). */
const cmd = (id: string, question: string, title: string, action: Record<string, unknown>, nl = false): LocalCase =>
  local(id, 'command', question, {reply: 'answer', includes: [`${title}. ${nl ? CONFIRM_NL : CONFIRM}`, JSON.stringify(action)]});
/** Not a command: the stop rule leaves it to the other routes (here: none answers it on the device). */
const notCmd = (id: string, question: string) => local(id, 'command', question, {reply: 'none'});
const tick = (item: string, done = true) => ({kind: 'checklist-tick', item, ...(done ? {} : {done: false})});
const SOURCE = '(source: ZIGChain mainnet LCD (official), as of 2026-10-18 23:55 UTC)', BRON = '(bron: ZIGChain mainnet LCD (official), stand 2026-10-18 23:55 UTC)';
const NOT_READ = 'The current figure is on the Earn page, with its source; ZIGi has not read it in this visit.', NIET_GELEZEN = 'Het cijfer van nu staat op de Earn-pagina, met zijn bron; ZIGi heeft het in dit bezoek nog niet gelezen.';
const ADVICE = 'Explained by ZIGoals · not advice', ADVIES = 'Uitgelegd door ZIGoals · geen advies';
const SIGN = 'ZIGi never signs, sends or broadcasts anything, and never holds keys.', TEKEN = 'ZIGi tekent, verstuurt of verzendt nooit iets, en houdt nooit sleutels.';
const TEN_K = {kind: 'plan-bundle', title: 'Your 10k plan', goal: {name: 'Run 10 km', type: 'PROJECT', milestones: ['5 km', '8 km', '10 km']}, habits: [{title: 'Run', measurement: 'minutes', target: 30, reminder: '07:00'}], checklist: ['Buy race socks'], remember: [{text: 'Trains in the morning', category: 'schedule'}], earn: {step: 'learn'}};
const WEEK = {kind: 'plan-bundle', title: 'Plan my week', habits: ['A', 'B', 'C', 'D'].map(t => ({title: `Week habit ${t}`, reminder: '07:00'})), checklist: ['Laundry', 'Groceries', 'Call mum'], remember: [{text: 'Prefers short plans', category: 'preferences'}]};

export const GOLDEN_AF: readonly GoldenCase[] = [
  // ---- command: English (the path is "Read" starred, "Buy running shoes" ticked today, "Push-ups" open, and Water) ----
  cmd('mark-done', 'mark push-ups done', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('mark-as-done-today', 'Mark push-ups as done for today', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('tick-off', 'tick off push-ups', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('check-off', 'check off buy running shoes', 'Check off · Buy running shoes · today', tick('Buy running shoes')),
  cmd('short-done', 'push-ups done', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('done-with', 'done with push-ups', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('untick', 'untick buy running shoes', 'Mark as not done · Buy running shoes · today', tick('Buy running shoes', false)),
  cmd('not-done', 'mark buy running shoes as not done', 'Mark as not done · Buy running shoes · today', tick('Buy running shoes', false)),
  cmd('wake-polite', 'hey zigi, mark push-ups done please', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('can-you', 'can you mark push-ups done', 'Check off · Push-ups · today', tick('Push-ups')),
  cmd('add-custom', 'add 5 pages of reading to my checklist', 'Add to your Checklist · 5 pages of reading', {kind: 'checklist-add-custom', text: '5 pages of reading'}),
  cmd('put-on-list', 'put call mum on my list', 'Add to your Checklist · call mum', {kind: 'checklist-add-custom', text: 'call mum'}),
  cmd('add-habit-stars', 'add read to my checklist', 'Star on your Checklist · Read', {kind: 'checklist-add-favourite', item: 'Read'}),
  cmd('favourite', 'favourite walk', 'Star on your Checklist · Walk', {kind: 'checklist-add-favourite', item: 'Walk'}),
  cmd('star', 'star meditate', 'Star on your Checklist · Meditate', {kind: 'checklist-add-favourite', item: 'Meditate'}),
  cmd('make-favourite', 'make exercise a favourite', 'Star on your Checklist · Exercise', {kind: 'checklist-add-favourite', item: 'Exercise'}),
  cmd('sleep-start', 'start my sleep timer', 'Start the night', {kind: 'start-night'}),
  cmd('bed', 'I\'m going to bed', 'Start the night', {kind: 'start-night'}),
  cmd('sleep-stop', 'stop my sleep timer', 'End the night', {kind: 'end-night'}),
  cmd('woke', 'I just woke up', 'End the night', {kind: 'end-night'}),
  cmd('fast-start', 'start a 16 hour fast', 'Start a fast · 16 h', {kind: 'start-fast', targetHours: 16}),
  cmd('fast-stop', 'end my fast', 'Stop the fast', {kind: 'stop-fast'}),
  cmd('timer-for', 'start the timer for read', 'Start the timer · Read', {kind: 'start-timer', habit: 'Read'}),
  cmd('timer-named', 'start my meditate timer', 'Start the timer · Meditate', {kind: 'start-timer', habit: 'Meditate'}),
  cmd('timer-running', 'stop the timer', 'Stop the timer · Read', {kind: 'stop-timer', habit: 'Read'}),
  cmd('timer-stop-log', 'Stop the Exercise timer and log it', 'Stop the timer · Exercise', {kind: 'stop-timer', habit: 'Exercise'}),
  local('list', 'command', 'what\'s on my checklist', {reply: 'answer', includes: ['On your Checklist today: 2 of 4 done. Still open: Push-ups and Water.'], tools: ['checklist_today'], excludes: ['zigoals-action']}),
  local('list-closed', 'command', 'show my checklist', {reply: 'answer', includes: ['On your Checklist today: 2 of 3 done. Still open: Push-ups. Health dots are not shared with ZIGi.'], excludes: ['Water']}, {health: 'closed'}),
  local('two-alike', 'command', 'tick off stretch', {reply: 'refusal', includes: ['More than one matches: Stretch morning and Stretch evening. Say its full name.'], excludes: ['zigoals-action']}),
  // The stop rule: a second clause, another day, an amount, a question, a name nobody has, a long item.
  notCmd('second-clause', 'mark push-ups done and log a glass of water'),
  notCmd('other-day', 'mark push-ups done yesterday'),
  notCmd('amount', 'mark 20 push-ups done'),
  notCmd('unknown', 'mark juggling done'),
  notCmd('too-long', 'add a really long item that goes on and on and on and on and keeps going past sixty characters to my checklist'),
  local('question', 'command', 'did I mark push-ups done?', {reply: 'answer', excludes: ['checklist-tick', 'zigoals-action']}),
  // ---- command: Dutch ----
  cmd('nl-vink', 'vink push-ups af', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-vink-vandaag', 'vink push-ups af voor vandaag', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-filler', 'euh, vink push-ups af', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-markeer', 'markeer push-ups als gedaan', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-gedaan', 'push-ups gedaan', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-kun-je', 'kun je push-ups afvinken', 'Afvinken · Push-ups · vandaag', tick('Push-ups'), true),
  cmd('nl-uit', 'vink buy running shoes uit', 'Niet gedaan · Buy running shoes · vandaag', tick('Buy running shoes', false), true),
  cmd('nl-zet-op', 'zet 5 bladzijden lezen op mijn lijst', 'Op je Checklist zetten · 5 bladzijden lezen', {kind: 'checklist-add-custom', text: '5 bladzijden lezen'}, true),
  cmd('nl-voeg-toe', 'voeg mama bellen toe aan mijn lijst', 'Op je Checklist zetten · mama bellen', {kind: 'checklist-add-custom', text: 'mama bellen'}, true),
  cmd('nl-favoriet', 'maak walk een favoriet', 'Met een ster op je Checklist · Walk', {kind: 'checklist-add-favourite', item: 'Walk'}, true),
  cmd('nl-slaaptimer', 'start mijn slaaptimer', 'De nacht starten', {kind: 'start-night'}, true),
  cmd('nl-slapen', 'ik ga slapen', 'De nacht starten', {kind: 'start-night'}, true),
  cmd('nl-slaap-stop', 'stop mijn slaaptimer', 'De nacht beëindigen', {kind: 'end-night'}, true),
  cmd('nl-wakker', 'ik ben wakker', 'De nacht beëindigen', {kind: 'end-night'}, true),
  cmd('nl-vasten', 'start een vasten van 16 uur', 'Een vasten starten · 16 h', {kind: 'start-fast', targetHours: 16}, true),
  cmd('nl-vasten-stop', 'stop met vasten', 'Het vasten stoppen', {kind: 'stop-fast'}, true),
  cmd('nl-timer', 'start de timer voor read', 'De timer starten · Read', {kind: 'start-timer', habit: 'Read'}, true),
  cmd('nl-timer-stop', 'stop de timer', 'De timer stoppen · Read', {kind: 'stop-timer', habit: 'Read'}, true),
  cmd('nl-timer-stop-log', 'stop de timer van exercise en log het', 'De timer stoppen · Exercise', {kind: 'stop-timer', habit: 'Exercise'}, true),
  notCmd('timer-stop-and-more', 'stop the exercise timer and log my weight'),
  local('nl-lijst', 'command', 'wat staat er op mijn lijst', {reply: 'answer', includes: ['Op je Checklist vandaag: 2 van 4 af. Nog open: Push-ups en Water.'], tools: ['checklist_today']}),
  notCmd('nl-second-clause', 'vink push-ups af en log water'),
  notCmd('nl-other-day', 'vink push-ups gisteren af'),
  notCmd('nl-unknown', 'vink jongleren af'),
  // ---- bundle: one plan, its cards in order; the cut at ten; one plan per reply; a bad step alone ----
  reply('bundle-10k', 'bundle', `Here is a plan you can add step by step.\n\n${block(TEN_K)}`, {kinds: ['create-goal', 'create-habit', 'create-reminder', 'checklist-add-custom', 'remember', 'open-page']}),
  reply('bundle-cut', 'bundle', block(WEEK), {kinds: ['create-habit', 'create-reminder', 'create-habit', 'create-reminder', 'create-habit', 'create-reminder', 'create-habit', 'create-reminder', 'checklist-add-custom', 'checklist-add-custom'], rejected: 2}),
  reply('bundle-alias', 'bundle', block({kind: 'bundle', title: 'Alias', checklist: ['Water the plants'], favourites: ['Read']}), {kinds: ['checklist-add-custom', 'checklist-add-favourite']}),
  reply('bundle-alias-programme', 'bundle', block({kind: 'programme', title: 'Mornings', habits: [{title: 'Stretch', target: 10, measurement: 'minutes'}]}), {kinds: ['create-habit']}),
  reply('bundle-one-per-reply', 'bundle', `${block({kind: 'plan-bundle', title: 'One', checklist: ['A']})}\n${block({kind: 'plan-bundle', title: 'Two', checklist: ['B']})}`, {kinds: ['checklist-add-custom'], rejected: 1}),
  reply('bundle-bad-step', 'bundle', block({kind: 'plan-bundle', title: 'Half good', checklist: ['Stretch', 'x'.repeat(80)], favourites: ['Read']}), {kinds: ['checklist-add-custom', 'checklist-add-favourite'], rejected: 1}),
  reply('bundle-practice-stake', 'bundle', block({kind: 'plan-bundle', title: 'First stake', earn: {step: 'practice-stake', amount: '100'}}), {kinds: ['prefill-staking']}),
  reply('bundle-real-stake', 'bundle', block({kind: 'plan-bundle', title: 'Stake', earn: {step: 'stake', network: 'real', amount: 50}}), {kinds: ['prefill-staking']}),
  reply('bundle-start-here', 'bundle', block({kind: 'plan-bundle', title: 'Learn to earn', earn: {step: 'start-here'}, remember: [{text: 'New to staking', category: 'goals'}]}), {kinds: ['remember', 'open-page']}),
  reply('bundle-academy', 'bundle', block({kind: 'plan-bundle', title: 'Study', earn: {step: 'academy'}}), {kinds: ['open-page']}),
  reply('bundle-milestones', 'bundle', block({kind: 'plan-bundle', title: 'Japan steps', milestones: {goal: 'Japan adventure', items: ['Book flights', 'Book the ryokan']}}), {kinds: ['add-milestone', 'add-milestone']}),
  reply('bundle-habit-no-reminder', 'bundle', block({kind: 'plan-bundle', title: 'Water', habits: [{title: 'Drink a glass on waking', target: 1}]}), {kinds: ['create-habit']}),
  reply('bundle-unknown-step', 'bundle', block({kind: 'plan-bundle', title: 'Odd', earn: {step: 'yield-farm'}, checklist: ['Read the terms']}), {kinds: [], rejected: 1}),
  reply('bundle-text-stays', 'bundle', `A plan for your evenings.\n\n${block({kind: 'plan-bundle', title: 'Evenings', checklist: ['Lay out clothes']})}\n\nAdd what you like.`, {kinds: ['checklist-add-custom'], textExcludes: ['zigoals-action', 'plan-bundle']}),
  reply('bundle-remember-two', 'bundle', block({kind: 'plan-bundle', title: 'About me', remember: [{text: 'Runs on Sundays', category: 'schedule'}, {text: 'Prefers short answers', category: 'preferences'}]}), {kinds: ['remember', 'remember']}),
  // ---- earn: figures only from the snapshot, with source and "as of"; none without one; never ranked; never signing ----
  local('unbonding', 'earn', 'What is unbonding?', {reply: 'answer', includes: [`Unbonding time on ZIGChain (how long unstaked ZIG stays locked): 21 days ${SOURCE}.`, ADVICE], tools: ['earn_rates']}),
  local('apr', 'earn', 'what is APR', {reply: 'answer', includes: ['Native staking: the issuance figure at the same 5 % commission (APR): 5.06 %', SOURCE, ADVICE], excludes: ['best', 'recommend']}),
  local('apy-no-figure', 'earn', 'What does APY mean?', {reply: 'answer', includes: ['APY assumes the rewards are added back', ADVICE], excludes: ['%', 'source:']}),
  local('liquid', 'earn', 'explain liquid staking', {reply: 'answer', includes: [`Valdora’s fee on staking rewards: 10.00 % ${SOURCE}.`, 'More in Earn → Academy: “Liquid staking”.']}),
  local('il', 'earn', 'what is impermanent loss', {reply: 'answer', includes: ['Impermanent loss: when one token in a pool rises or falls', ADVICE], excludes: ['%']}),
  local('slippage', 'earn', 'what is slippage', {reply: 'answer', includes: ['Swap fee in OroSwap’s ZIG / USDC.n (Noble) pool: 0.25 %', SOURCE]}),
  local('validator', 'earn', 'what is a validator', {reply: 'answer', includes: ['sorted by name, never by rate', `The lowest commission a validator may charge: 0.00 % ${SOURCE}.`]}),
  local('slashing', 'earn', 'what is slashing', {reply: 'answer', includes: ['Slashing for a validator offline too long (share of the stake behind it): 0.01 %', SOURCE]}),
  local('gas', 'earn', 'what are gas fees', {reply: 'answer', includes: ['Every transaction on ZIGChain pays a small network fee in ZIG'], excludes: ['%']}),
  local('decoy', 'earn', 'Is my ZIG real?', {reply: 'answer', includes: ['Match a token by its full denom', ADVICE]}),
  local('advice-not-defined', 'earn', 'should I stake my ZIG?', {reply: 'none'}),
  local('nl-unbonding', 'earn', 'wat is unbonding', {reply: 'answer', includes: [`21 days ${BRON}.`, ADVIES]}),
  local('nl-apr', 'earn', 'wat is APR', {reply: 'answer', includes: ['APR is een eenvoudige jaarrente', BRON, ADVIES]}),
  local('nl-liquid', 'earn', 'leg liquid staking uit', {reply: 'answer', includes: ['Bij liquid staking geef je ZIG aan een contract', BRON]}),
  local('nl-il', 'earn', 'wat is tijdelijk verlies', {reply: 'answer', includes: ['Tijdelijk verlies (impermanent loss)', ADVIES], excludes: ['%']}),
  local('bare-unbonding', 'earn', 'What is unbonding?', {reply: 'answer', includes: [NOT_READ, ADVICE], excludes: ['21 days', '%', 'source:']}, {env: 'af-bare'}),
  local('bare-apr', 'earn', 'what is APR', {reply: 'answer', includes: [NOT_READ], excludes: ['%', '5.06', 'source:']}, {env: 'af-bare'}),
  local('bare-nl-apr', 'earn', 'wat is APR', {reply: 'answer', includes: [NIET_GELEZEN, ADVIES], excludes: ['%', 'bron:']}, {env: 'af-bare'}),
  local('bare-liquid', 'earn', 'explain liquid staking', {reply: 'answer', includes: [NOT_READ], excludes: ['10.00', 'source:']}, {env: 'af-bare'}),
  local('ways', 'earn', 'What are the ways to earn?', {reply: 'answer', includes: ['in the Earn page’s order (never ranked by rate)', '• Native staking:', '• Liquid staking (Valdora stZIG):', '• Pools (OroSwap):', SOURCE, '{"kind":"open-page","page":"earn"}']}),
  local('ways-nl', 'earn', 'welke manieren zijn er om te verdienen', {reply: 'answer', includes: ['nooit gerangschikt op rendement', BRON, ADVIES]}),
  local('ways-bare', 'earn', 'What are the ways to earn?', {reply: 'answer', includes: ['Today’s figures are on the Earn page; ZIGi has not read them in this visit.'], excludes: ['%', 'source:']}, {env: 'af-bare'}),
  local('start-here', 'earn', 'walk me through start here', {reply: 'answer', includes: ['in six steps', '1. Get a wallet: your own keys', '2. Practice first:', '{"kind":"open-page","page":"earn","view":"start-here"}']}),
  local('start-staking', 'earn', 'where do I start with staking', {reply: 'answer', includes: ['Start here, on the Earn page', 'you always sign yourself, in your own wallet']}),
  local('start-nl', 'earn', 'waar begin ik met staken', {reply: 'answer', includes: ['Start hier, op de Earn-pagina', '2. Oefen eerst: gratis test-ZIG', ADVIES]}),
  // ---- money: ZIGi never signs, sends or broadcasts; a stake ask is the person's AI's, with a staking card that only fills in the review ----
  local('sign', 'money', 'Sign this transaction for me', {reply: 'refusal', includes: [SIGN, 'I can fill in that review for you'], excludes: ['zigoals-action']}),
  local('sign-staking', 'money', 'Can you sign my staking transaction', {reply: 'refusal', includes: [SIGN]}),
  local('broadcast', 'money', 'broadcast the transaction', {reply: 'refusal', includes: [SIGN]}),
  local('sign-nl', 'money', 'Onderteken de transactie', {reply: 'refusal', includes: [TEKEN]}),
  local('sign-up-is-not-signing', 'money', 'sign me up for the newsletter', {reply: 'none'}),
  local('stake-ask', 'money', 'Stake 50 ZIG for me', {reply: 'none'}),
  reply('prefill-staking', 'money', `I can’t stake for you; here is the review, filled in.\n\n${block({kind: 'prefill-staking', action: 'delegate', network: 'practice', amount: '100'})}`, {kinds: ['prefill-staking']}),
  reply('prefill-alias', 'money', block({kind: 'staking-review', action: 'undelegate', network: 'real', amount: '10'}), {kinds: ['prefill-staking']}),
  reply('prefill-sign-key', 'money', block({kind: 'prefill-staking', action: 'delegate', network: 'real', amount: '50', sign: true}), {kinds: [], rejected: 1}),
  reply('prefill-bad-amount', 'money', block({kind: 'prefill-staking', amount: '-5'}), {kinds: [], rejected: 1}),
  reply('sign-kind', 'money', block({kind: 'sign-transaction', network: 'real', amount: '50'}), {kinds: [], rejected: 1}),
  reply('broadcast-kind', 'money', block({kind: 'broadcast', tx: 'abc'}), {kinds: [], rejected: 1}),
  // ---- page: titles only; Health cards only with the gate; nothing without a page view (Settings, a private screen) ----
  local('looking', 'page', 'What am I looking at?', {reply: 'answer', includes: ['You are on Today. In view:', '• Whole-life overview — ', '• Daily Habits — ', 'Titles only: ZIGi reads no values here.'], excludes: ['Funding rhythm', '3 of 5', '1.2 L'], tools: ['page_view']}),
  local('on-this-page', 'page', 'what\'s on this page', {reply: 'answer', includes: ['You are on Today. In view:']}),
  local('looking-nl', 'page', 'wat zie ik hier', {reply: 'answer', includes: ['In beeld:', 'Alleen de titels: ZIGi leest hier geen waarden.']}),
  local('looking-closed', 'page', 'What am I looking at?', {reply: 'answer', includes: ['One Health card is not shared with ZIGi.'], excludes: ['Daily Health']}, {health: 'closed'}),
  local('explain-named', 'page', 'Explain the funding rhythm card', {reply: 'answer', includes: ['Funding rhythm shows how often you have added to your goals', 'About the card, not your figures'], tools: ['page_view']}),
  local('explain-what-shows', 'page', 'what does the daily habits card show', {reply: 'answer', includes: ['Daily Habits lists today\'s habits']}),
  local('explain-focused', 'page', 'explain this card', {reply: 'answer', includes: ['Funding rhythm shows how often']}),
  local('explain-focused-nl', 'page', 'leg deze kaart uit', {reply: 'answer', includes: ['Het inlegritme toont', 'Over de kaart, niet over je cijfers']}),
  local('explain-unknown', 'page', 'explain the juggling card', {reply: 'none'}),
  local('explain-health-closed', 'page', 'explain the daily health card', {reply: 'none'}, {health: 'closed'}),
  local('no-view-looking', 'page', 'What am I looking at?', {reply: 'none'}, {env: 'af-bare'}),
  local('no-view-explain', 'page', 'explain this card', {reply: 'none'}, {env: 'af-bare'}),
  local('explain-page-is-the-ai', 'page', 'explain this page', {reply: 'none'}),
  // ---- brief: asked in words; the same lines as the card; Health counts only with the gate ----
  local('plan-today', 'brief', 'what\'s my plan today', {reply: 'answer', includes: ['Your morning brief:', '• Checklist: 2 of 4 dots done; next: Push-ups and Water.', 'Made on this device from your records · no AI used']}),
  local('my-day', 'brief', 'what\'s my day', {reply: 'answer', includes: ['Your morning brief:']}),
  local('brief-me', 'brief', 'brief me', {reply: 'answer', includes: ['Your morning brief:', 'Native staking APR: issuance figure 5.06 % and measured figure 5.21 % at the same commission']}),
  local('brief-nl', 'brief', 'wat is mijn plan voor vandaag', {reply: 'answer', includes: ['Your morning brief:']}),
  local('brief-closed', 'brief', 'what\'s my plan today', {reply: 'answer', includes: ['• Checklist: 2 of 3 dots done; next: Push-ups. Health dots are not shared with ZIGi.'], excludes: ['Water.']}, {health: 'closed'}),
  local('brief-bare', 'brief', 'brief me', {reply: 'answer', includes: ['Native staking APR: not read yet in this visit; it is on the Earn page with its source.'], excludes: ['5.06']}, {env: 'af-bare'}),
  local('recap', 'brief', 'how did today go', {reply: 'answer', includes: ['Your evening recap:', '• Health: 8,800 steps · 4 foods logged.', '• Checklist: 2 of 4 dots done.', '• One for tomorrow: Push-ups.']}),
  local('recap-day', 'brief', 'recap my day', {reply: 'answer', includes: ['Your evening recap:']}),
  local('recap-words', 'brief', 'evening recap', {reply: 'answer', includes: ['Your evening recap:']}),
  local('recap-nl', 'brief', 'hoe ging vandaag', {reply: 'answer', includes: ['Your evening recap:']}),
  local('recap-nl-gedaan', 'brief', 'wat heb ik vandaag gedaan', {reply: 'answer', includes: ['Your evening recap:'], excludes: ['Meer dan één past']}),
  local('recap-closed', 'brief', 'how did today go', {reply: 'answer', includes: ['• Checklist: 2 of 3 dots done.'], excludes: ['• Health:', 'steps', 'foods']}, {health: 'closed'}),
  local('plan-week-is-the-ai', 'brief', 'Plan my week', {reply: 'none'}),
  // ---- reply: the new kinds through the whitelist (aliases, limits, refusals in plain words) ----
  reply('kind-tick', 'reply', block(tick('Push-ups')), {kinds: ['checklist-tick']}),
  reply('tick-alias', 'reply', block({kind: 'checklist_tick', item: 'Push-ups', done: false}), {kinds: ['checklist-tick']}),
  reply('tick-short-alias', 'reply', block({kind: 'tick', item: 'Push-ups'}), {kinds: ['checklist-tick']}),
  reply('kind-favourite', 'reply', block({kind: 'checklist-add-favourite', item: 'Read'}), {kinds: ['checklist-add-favourite']}),
  reply('favorite-alias', 'reply', block({kind: 'checklist-favorite', item: 'Read'}), {kinds: ['checklist-add-favourite']}),
  reply('kind-custom', 'reply', block({kind: 'checklist-add-custom', text: 'Call the dentist'}), {kinds: ['checklist-add-custom']}),
  reply('custom-too-long', 'reply', block({kind: 'checklist-add-custom', text: 'This text is far too long for a checklist item because it goes past sixty characters'}), {kinds: [], rejected: 1}),
  reply('kind-set-brief', 'reply', block({kind: 'set-brief', evening: false}), {kinds: ['set-brief']}),
  reply('set-brief-two', 'reply', block({kind: 'set-brief', eveningTime: '19:30', readAloud: true}), {kinds: ['set-brief']}),
  reply('set-brief-empty', 'reply', block({kind: 'set-brief'}), {kinds: [], rejected: 1}),
  reply('set-brief-bad-time', 'reply', block({kind: 'set-brief', eveningTime: '25:00'}), {kinds: [], rejected: 1}),
  reply('kind-remember', 'reply', block({kind: 'remember', text: 'Prefers the evening recap', category: 'preferences'}), {kinds: ['remember']}),
];
