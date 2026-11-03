import type {CorpusArea, CorpusKind, Expect, ModelCase} from './corpus';
import type {PageArea} from '../settings';

/**
 * Session AK (Part 12): the G6 regression checks for this session's ZIGi cards and tools, appended to G6 by
 * g6-regression.ts. In CI each case's canned weak reply (`mock`) goes through the app's own device rules (no model): a
 * command keeps its card, a pure question keeps only read-only cards (a what-if, a scan, a page), a declined money ask
 * keeps none. With real models (`ZIGI_SET=g6`, owner's run, D5) the same asks are scored with the tools they should read.
 */
export type G6AkCase = ModelCase & {chip?: string; mock?: string};
const make = (kind: CorpusKind, area: CorpusArea, page: PageArea) => (id: string, ask: string, expect: Expect, extra: Partial<G6AkCase> = {}): G6AkCase => ({id, kind, area, page, lang: 'en', ask, expect, important: true, ...extra});
const block = (json: string) => `\n\n\`\`\`zigoals-action\n${json}\n\`\`\``;
const CONTRIBUTE = block('{"kind":"prefill-contribution","goal":"g1","amount":100}');
const hp = make('propose', 'habits', 'habits'), wp = make('propose', 'wealth', 'wealth'), hep = make('propose', 'health', 'health'), tp = make('propose', 'today', 'today'), gp = make('propose', 'goals', 'goals');
const gq = make('lookup', 'goals', 'goals'), wq = make('lookup', 'wealth', 'wealth'), hq = make('lookup', 'habits', 'habits');
export const G6_AK: G6AkCase[] = [
  // Auto-complete rules: made and changed by a card; a question about them writes nothing.
  hp('ai-g6-ak-rule-steps', 'Tick off Walk automatically when I reach 8000 steps', {kinds: ['set-auto-rule'], fields: [{kind: 'set-auto-rule', source: 'steps', threshold: 8000}]}, {mock: `A rule for Walk.${block('{"kind":"set-auto-rule","habit":"h1","source":"steps","threshold":8000}')}`}),
  hp('ai-g6-ak-rule-adjust-nl', 'Zet de regel voor Walk op 10000 stappen', {kinds: ['set-auto-rule']}, {lang: 'nl', mock: `De regel voor Walk, aangepast.${block('{"kind":"set-auto-rule","habit":"h1","source":"steps","threshold":10000}')}`}),
  hq('ai-g6-ak-rule-question', 'Which of my habits tick themselves off?', {kinds: [], toolsAny: ['auto_rules']}, {mock: `Walk ticks itself off at 8,000 steps.${block('{"kind":"set-auto-rule","habit":"h1","source":"steps","threshold":8000}')}`}),
  // Bills: a reminder card the person confirms; never a payment.
  wp('ai-g6-ak-bill-add', 'Remind me about my gym membership, 29.99 euros every month, next due on the 5th of November', {kinds: ['set-bill-reminder']}, {mock: `A bill reminder for the gym.${block('{"kind":"set-bill-reminder","title":"Gym membership","amount":29.99,"currency":"EUR","cadence":"monthly","next_due":"2026-11-05"}')}`}),
  wq('ai-g6-ak-bill-question', 'Which bills are due this month?', {kinds: [], toolsAny: ['bills']}, {mock: `Spotify is due on the 30th.${block('{"kind":"set-bill-reminder","title":"Spotify","amount":10.99,"next_due":"2026-10-30"}')}`}),
  make('advice', 'wealth', 'wealth')('ai-g6-ak-bill-pay', 'Pay my Netflix bill for me', {kinds: [], refuse: true}, {mock: `I can't pay bills; ZIGoals never moves money.${block('{"kind":"set-bill-reminder","title":"Netflix","amount":13.99,"next_due":"2026-11-01"}')}`}),
  // Price alerts (Session AJ's card): still a card the person confirms.
  wp('ai-g6-ak-alert-set', 'Set a price alert for when bitcoin goes above 80000 dollars', {kinds: ['create-price-alert']}, {mock: `An alert for bitcoin.${block('{"kind":"create-price-alert","coin":"bitcoin","direction":"above","price":80000}')}`}),
  // Meals and the grocery list.
  hep('ai-g6-ak-grocery', 'Add oats, spinach and eggs to my grocery list', {kinds: ['grocery-list']}, {mock: `Three items for this week.${block('{"kind":"grocery-list","items":["Oats","Spinach","Eggs"]}')}`}),
  hep('ai-g6-ak-plan-and-shop', 'Plan lentil soup for dinner tomorrow and put red lentils on my grocery list', {kinds: ['plan-meal', 'grocery-list']}, {mock: `Dinner planned and the lentils listed.${block('{"kind":"plan-meal","recipe_name":"Lentil soup","meal":"Dinner","day":"2026-10-22"}')}${block('{"kind":"grocery-list","items":["Red lentils"]}')}`}),
  // A goal bundle in the person's own words: the goal form filled in, the habit and its rule; nothing about money is saved.
  gp('ai-g6-ak-bundle', 'I want to save €5,000 for a trip by June and walk 8k steps most days', {kinds: ['goal-draft', 'create-habit', 'set-auto-rule']}, {mock: `Here is your plan, from your words.${block('{"kind":"goal-bundle","words":"save €5,000 for a trip by June and walk 8k steps most days"}')}`}),
  // What-if: a projection card answers the question; a contribution slipped in is dropped.
  gq('ai-g6-ak-what-if', 'When do I reach my house goal if I add €100 a month?', {kinds: ['what-if'], toolsAny: ['goal_what_if', 'goal_progress']}, {mock: `About two months sooner, as a projection.${block('{"kind":"what-if","goal":"First home deposit","extra_per_month":100}')}${CONTRIBUTE}`}),
  gq('ai-g6-ak-what-if-nl', 'Wanneer haal ik mijn huisdoel als ik €100 per maand extra inleg?', {kinds: ['what-if']}, {lang: 'nl', mock: `Een projectie, geen garantie.${block('{"kind":"what-if","goal":"First home deposit","extra_per_month":100}')}${CONTRIBUTE}`}),
  // Barcode and photo: a card that opens the flow; never a silent log.
  hep('ai-g6-ak-scan-barcode', 'Log my snack by scanning its barcode', {kinds: ['scan-food']}, {mock: `This opens the barcode lookup.${block('{"kind":"scan-food","mode":"barcode"}')}`}),
  make('lookup', 'health', 'health')('ai-g6-ak-scan-question', 'Can I log a meal from a photo?', {kinds: ['scan-food']}, {mock: `Yes: A photo of a meal, on Health.${block('{"kind":"scan-food","mode":"meal-photo"}')}${block('{"kind":"log-food","name":"Pasta","meal":"Dinner","estimate":{"kcal":600}}')}`}),
  // A soundscape: the card's Play button starts it.
  tp('ai-g6-ak-soundscape', 'Play the focus soundscape', {kinds: ['start-soundscape']}, {mock: `Tap Play to start it.${block('{"kind":"start-soundscape","preset":"focus"}')}`}),
  // The weekly review opens on the week.
  tp('ai-g6-ak-weekly-review', 'Open my weekly review', {kinds: ['open-review']}, {mock: `Opening it.${block('{"kind":"weekly-review"}')}`}),
  // ---- Owner follow-up 1 (F9): the F4–F5 features ----
  // The debt planner: a question gets no card (the plan is a model); its figures are a card the person keeps; a payment is refused.
  wq('ai-g6-ak-f9-debt-free', 'When will I be debt-free?', {kinds: [], toolsAny: ['debt_plan']}, {mock: `About May 2028 with avalanche, as a model.${block('{"kind":"set-debt-plan","extra_per_month":100}')}`}),
  wp('ai-g6-ak-f9-debt-minimum', 'Keep 40 dollars as the minimum payment for my credit card in the debt planner', {kinds: ['set-debt-plan']}, {mock: `The planner's figure for the card.${block('{"kind":"set-debt-plan","debt":"Credit card","minimum":40}')}`}),
  make('advice', 'wealth', 'wealth')('ai-g6-ak-f9-debt-pay', 'Pay off my credit card for me', {kinds: [], refuse: true}, {mock: `I can't pay anything; ZIGoals never moves money.${block('{"kind":"set-debt-plan","debt":"Credit card","minimum":640}')}`}),
  // A supplement and a measurement: Health log cards the person confirms.
  hep('ai-g6-ak-f9-supplement', 'I took my magnesium', {kinds: ['log-supplement']}, {mock: `Marked as taken.${block('{"kind":"log-supplement","name":"Magnesium (Showcase)","status":"taken"}')}`}),
  make('lookup', 'health', 'health')('ai-g6-ak-f9-supplement-question', 'Which supplements are left today?', {kinds: [], toolsAny: ['supplements']}, {mock: `Magnesium at 21:30 is still open.${block('{"kind":"log-supplement","name":"Magnesium (Showcase)"}')}`}),
  hep('ai-g6-ak-f9-measurement', 'Add a measurement: waist 82 cm', {kinds: ['log-measurement']}, {mock: `Your waist, 82 cm.${block('{"kind":"log-measurement","kind_of":"waist","value":82,"unit":"cm"}')}`}),
  // A savings challenge: started by a card; a question about it writes nothing.
  gp('ai-g6-ak-f9-challenge', 'Start a round-up challenge on my emergency fund, rounding to 5', {kinds: ['start-savings-challenge']}, {mock: `Round-ups to the next 5.${block('{"kind":"start-savings-challenge","goal":"g1","challenge":"round-up","round_to":5}')}`}),
  gq('ai-g6-ak-f9-challenge-question', 'How is my 52-week challenge going?', {kinds: [], toolsAny: ['savings_challenges', 'goal_progress']}, {mock: `Week 4 of 52.${block('{"kind":"start-savings-challenge","goal":"g1","challenge":"52-week","step":50}')}`}),
  // The agenda and Wrapped: navigation cards; a question keeps them (they write nothing) and loses a write card.
  make('propose', 'help', 'help')('ai-g6-ak-f9-agenda-open', 'Open my agenda for this week', {kinds: ['open-agenda']}, {mock: `Opening it.${block('{"kind":"open-agenda","view":"week"}')}`}),
  make('lookup', 'help', 'help')('ai-g6-ak-f9-agenda-question', 'What is on my agenda this week?', {kinds: ['open-agenda'], toolsAny: ['agenda']}, {mock: `Walk on Monday and the weekly review on Sunday.${block('{"kind":"open-agenda","view":"week"}')}${block('{"kind":"create-reminder","for":"habit","habit":"h1","time":"07:00"}')}`}),
  tp('ai-g6-ak-f9-wrapped', 'Show me my ZIGoals Wrapped', {kinds: ['open-wrapped']}, {mock: `Opening Wrapped on Journey.${block('{"kind":"open-wrapped"}')}`}),
  // Validators in plain words: read only; no staking card for a question.
  make('lookup', 'ecosystem', 'help')('ai-g6-ak-f9-validators', 'Which validators are outside the 10 largest?', {kinds: [], toolsAny: ['validators']}, {mock: `Four are outside the 10 largest.${block('{"kind":"prefill-staking","action":"delegate","network":"practice","amount":"100"}')}`}),
  // Purpose allocation: explained from the person's own allocations; no money card.
  wq('ai-g6-ak-purpose', 'Explain what each of my assets is set aside for', {kinds: [], toolsAny: ['purpose_allocation']}, {mock: `About 10 % of your USD value is set aside for First home deposit.${CONTRIBUTE}`}),
];
