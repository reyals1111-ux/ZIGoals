import type {ToolEnv} from '../tools/env';
import {text as clean} from '../tools/format';
import {runTool} from '../tools/registry';
import type {ToolOk} from '../tools/types';
import type {LocalReply} from './engine';
import {amount} from './words';
import {MEMORY_CATEGORIES} from '../store/records';
import {novaEnvInfo} from './nova-env';
import {taskIntent} from '../../tasks/intent';
import {addLocalDays as addDays} from '../../local-date';

/**
 * Session AL second pass (lane L7): what ZIGi's and NOVA's no-model path still answered with the examples list on the bots'
 * rounds (Denver Z-/N-, Lisbon LA-/LZ-, Moscow ZP-/NP-, Nairobi NB-, Professor PR-033, Tokyo TK-). Asked only after the
 * device's own answers (lib/ai/local-answers/engine.ts, pinned) had none and with no model to ask, so every pinned answer
 * stays as it is. Figures come from the same tools, and so the same stores and area switches, as the pages; app facts
 * come from Help and Settings, each with where to go. What cannot be worked out here says so, never a generic list.
 *
 * - `alFirst` runs BEFORE the quick-log reading: a "Remember…", a medicine word, "start a 16:8 fast", "set my protein
 *   target", "add a task…" and "run the … workflow" are what they say, never a log card read from their numbers
 *   ("Remember that I get paid on the 25th" was a 25 EUR expense card).
 * - `fixTypos` and `rewriteQuestion` turn a typo'd or loosely worded question into one the device already answers.
 * - `alMoreAnswer` runs AFTER the facts (al-facts.ts): trust and capability, recall from saved notes, debts, budgets, the
 *   Checklist, habit insights, macros, workouts, staking, XP.
 */
type Lang = 'en' | 'nl';
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const say = (lang: Lang, en: string, nl: string) => lang === 'nl' ? nl : en;
const block = (action: Record<string, unknown>) => `\n\n\`\`\`zigoals-action\n${JSON.stringify(action)}\n\`\`\``;
const open = (page: string, view?: string) => block({kind: 'open-page', page, ...(view ? {view} : {})});
const run = (tool: string, args: Record<string, unknown>, env: ToolEnv) => { const result = runTool(tool, args, env); return {result, record: {tool, args, label: result.label}}; };
const dataOf = (r: ReturnType<typeof runTool>): Data => (r as ToolOk).data as Data;
const money = (value: unknown) => { const m = /^(-?\d+(?:\.\d+)?) (\S+)$/.exec(String(value ?? '')); return m ? amount(m[1]!, m[2]!) : String(value ?? ''); };
const norm = (raw: string) => raw.trim().replace(/[’`]/g, '\'').replace(/\s+/g, ' ');

// ---- typos (P-DV-86, P-DVR-47, P-LA-17, P-TK-33, P-NB-59): common slips in the words the device routes on ----
const TYPOS: Record<string, string> = {
  hw: 'how', hwo: 'how', mch: 'much', muhc: 'much', mcuh: 'much', hav: 'have', ahve: 'have', waht: 'what', whta: 'what', teh: 'the', fo: 'of',
  goasl: 'goals', gaols: 'goals', goales: 'goals', habbits: 'habits', habbit: 'habit', habtis: 'habits', watter: 'water', wtaer: 'water', waer: 'water',
  todya: 'today', tday: 'today', yesterdy: 'yesterday', yestrday: 'yesterday', streek: 'streak', stepps: 'steps', slep: 'sleep', sleeep: 'sleep', wieght: 'weight', weigth: 'weight',
  holdigns: 'holdings', hodlings: 'holdings', protien: 'protein', calroies: 'calories', budjet: 'budget', debst: 'debts', networth: 'net worth', whats: 'what is', whts: 'what is', im: 'I am',
  lft: 'left', mny: 'many', meny: 'many', checkin: 'check-in', checkins: 'check-ins', complte: 'complete', didi: 'did', dd: 'did',
};
export function fixTypos(text: string): string {
  return text.replace(/[\p{L}']+/gu, word => { const fixed = TYPOS[word.toLowerCase()]; return fixed === undefined || fixed === word.toLowerCase() ? word : fixed; });
}
/** Loose wordings of questions the device answers in its own words (asked again in those words; null when none fits). */
const REWRITES: readonly [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(?:what(?:'s| is) )?(?:my )?(?:current )?streaks?\s*[?.!]*$|\bwhat(?:'s| is| are) my streaks?\b|\bhow long (?:is|are) my streaks?\b/i, () => 'What is my longest streak?'],
  [/\bis (?:my )?(.{2,60}?)(?: goal)? on (?:track|schedule|plan)\b|\bam i on track (?:for|with) (?:my )?(.{2,60}?)(?: goal)?\s*[?.!]*$/i, m => `How far am I on my ${(m[1] ?? m[2])!.trim()} goal?`],
  [/\b(?:what should i (?:focus on|do first)|what(?:'s| is) (?:the )?first thing|where do i start|what(?:'s| is) on my plate|plan (?:for )?(?:my|the) day|what(?:'s| is) (?:in )?my (?:morning |daily |day )?brief|show (?:me )?my (?:morning |daily )?brief|am i behind (?:today|on today))\b/i, () => 'What is due today?'],
  [/\bhow (?:much|many) (?:habits? )?(?:are |is )?(?:left|open|to go)\b.*\bhabits?\b|\bhabits?\b.*\b(?:left|open|to go)\b/i, () => 'How many habits are left today?'],
];
export function rewriteQuestion(question: string): string | null {
  const q = norm(question);
  for (const [re, to] of REWRITES) { const m = q.match(re); if (m) return to(m); }
  return null;
}

// ---- before the quick-log reading ----
const REMEMBER = /^(?:(?:please|pls|zigi|nova)[, ]+)?(?:remember|note|don'?t forget|onthoud)(?! to\b)(?: (?:that|this|dat))?[:,]?\s+(.{3,480})$/i;
/** P-MO-101 (N-MO-04): a category from the note's own words; the person can change it on the card. */
export function memoryCategory(note: string): (typeof MEMORY_CATEGORIES)[number] {
  const t = note.toLowerCase();
  if (/\b(?:allerg\w*|intoleran\w*|vegan|vegetarian|gluten|lactose|dairy|nuts?|peanuts?|halal|kosher|i (?:don'?t|do not|never) eat)\b/.test(t)) return 'diet';
  if (/\b(?:doctor|medication|medicine|condition|injur\w*|asthma|diabet\w*|blood pressure|pregnan\w*)\b/.test(t)) return 'health';
  if (/\b(?:i (?:like|love|prefer|hate|dislike|enjoy)|my favou?rite)\b/.test(t)) return 'preferences';
  if (/\b(?:get paid|payday|salary|every (?:day|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|on (?:the )?\d{1,2}(?:st|nd|rd|th)|at \d{1,2}(?::\d\d)?\s*(?:am|pm)?|weekends?|mornings?|evenings?)\b/.test(t)) return 'schedule';
  if (/\b(?:i (?:can'?t|cannot|must not|shouldn'?t)|no more than|at most|never on)\b/.test(t)) return 'constraints';
  if (/\b(?:goal|save for|saving for|want to (?:run|lose|reach|finish|learn))\b/.test(t)) return 'goals';
  return 'other';
}
const MEDICINE = /\b(?:creatine|ozempic|wegovy|mounjaro|semaglutide|tirzepatide|metformin|ibuprofen|paracetamol|acetaminophen|aspirin|melatonin|ashwagandha|steroids?|testosterone|sarms?|adderall|xanax|diazepam|antidepressants?|ssris?|statins?|insulin|fat burners?|pre-?workout)\b/i;
const MED_ASK = /^\s*(?:and |what about |how about |is |should i (?:take|use|try|start)\s+|can i (?:take|use)\s+|do i need\s+)?(?:some |more )?([\p{L}-]+(?: [\p{L}-]+)?)\s*[?.!]*\s*$/iu;
const FAST = /\b(?:start|begin|do)\b[^.?!]{0,20}\b(?:(\d{2})\s*[:/]\s*\d{1,2}|(\d{1,2})[- ]?(?:h|hours?|uur))\b[^.?!]{0,10}\bfast(?:ing)?\b|\bstart (?:a |my )?fast\b/i;
const TARGET = /\bset (?:my |the )?(?:daily )?(protein|carbs?|fat|calories|kcal|steps|water|sleep|meditation)\b[^.?!\d]{0,30}?(?:target|goal)?\s*(?:to|at|of)?\s*(\d[\d.,]*)\s*(g|grams?|kcal|calories|steps|ml|l|litres?|liters?|hours?|h|minutes?|min)?\b/i;
// P-DV-88 (DV-079, Z-004, Z-008, N-005, N-009): a goal write said plainly, as the goal's own card (the planner checks the goal).
const GOAL_LOG = /^(?:please )?(?:log|add|put|contribute|record)\s+(?:[$€]\s?)?(\d[\d.,]*)\s*(dollars?|euros?|usd|eur|[$€])?\s+(?:to|into|towards?|for|on)\s+(?:my |the )?(.{2,80}?)(?: goal)?\s*[.!]?$/i;
const MILESTONE = /^(?:please )?add (?:a )?milestone\s*[:,]?\s+(.{2,100}?)\s+(?:to|for|on)\s+(?:my |the )?(.{2,80}?)(?: goal)?\s*[.!]?$/i;
const WORKFLOW = /\b(?:run|start|do|open)\b[^.?!]{0,30}\bworkflows?\b|\b(?:review my week|clear my notes inbox|plan my meals (?:and grocery list )?for next week|prepare my monthly money check-?in|draft my focus plan for tomorrow|turn (?:this|my) journal entry into a goal)\b/i;
export function alFirst(question: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  const q = norm(question);
  if (!q || q.length > 500) return null;
  // P-LA-20, P-DVR-49 (Z-068, LA-027): "Remember …" is a note to keep, proposed as a card with a category.
  const remember = REMEMBER.exec(q);
  if (remember && !/\?\s*$/.test(q)) {
    const note = remember[1]!.replace(/[.!]+$/, '').trim(), category = memoryCategory(note);
    return {kind: 'answer', text: say(lang, `A note for what ZIGi knows about you (${category}); it is kept only when you add it, and you can change the category first.`, `Een notitie voor wat ZIGi over je weet (${category}); ze wordt pas bewaard als je haar toevoegt, en je kunt de categorie eerst aanpassen.`) + block({kind: 'remember', text: `${note[0]!.toUpperCase()}${note.slice(1)}`.slice(0, 500), category}), calls: []};
  }
  // P-MO-04 (ZP-21, NP-16, Z-021): a medicine or supplement word on its own is a question for a doctor or pharmacist.
  const med = MED_ASK.exec(q);
  if ((med && MEDICINE.test(med[1]!)) || (/\bshould i (?:take|use|try|start|stop)\b/i.test(q) && MEDICINE.test(q))) {
    return {kind: 'answer', text: say(lang, 'I can’t advise on medicines or supplements: whether, how much and with what is a question for your doctor or pharmacist. What you log yourself is in Health (Supplements, Your numbers), and I can show it.', 'Over medicijnen of supplementen kan ik geen advies geven: of, hoeveel en waarmee is een vraag voor je arts of apotheker. Wat je zelf logt staat in Health (Supplements, Your numbers), en dat kan ik laten zien.'), calls: []};
  }
  // P-MO-07 (ZP-12, NP-10): "start a 16:8 fast" is the fasting card (the planner refuses while a fast runs or Health is closed).
  const fast = FAST.exec(q);
  if (fast && !/\?\s*$/.test(q)) {
    const hours = Number(fast[1] ?? fast[2] ?? 16);
    if (hours >= 1 && hours <= 72) return {kind: 'answer', text: say(lang, `A ${hours} h fast, to start when you add it. Stop it any time from Health.`, `Een vasten van ${hours} uur, dat begint als je het toevoegt. Stop het wanneer je wilt in Health.`) + block({kind: 'start-fast', targetHours: hours}), calls: []};
  }
  // P-MO-07 (ZP-13, NP-11): "set my protein target to 120 g" is the target card.
  const target = TARGET.exec(q);
  if (target) {
    const word = target[1]!.toLowerCase(), value = Number(target[2]!.replace(',', '.')), unitWord = (target[3] ?? '').toLowerCase();
    const which = word.startsWith('carb') ? 'carbs' : word === 'calories' ? 'kcal' : word as 'protein' | 'fat' | 'kcal' | 'steps' | 'water' | 'sleep' | 'meditation';
    const unit = which === 'water' ? (/^l|^lit/.test(unitWord) ? 'l' : 'ml') : which === 'sleep' ? 'hours' : which === 'meditation' ? 'minutes' : which === 'steps' ? 'steps' : which === 'kcal' ? 'kcal' : 'g';
    if (Number.isFinite(value) && value > 0) return {kind: 'answer', text: say(lang, 'Your target, changed only when you add it (Health → Targets shows every target).', 'Je doel, pas aangepast als je het toevoegt (Health → Targets toont alle doelen).') + block({kind: 'set-target', target: which, value, unit}), calls: []};
  }
  // P-LA-11 (LA-047, LA-048): an open task moved to tomorrow or let go is the wrap-up's own card (with Undo, by the task's
  // own words); ticking one off or deleting it is done in Tasks, said plainly.
  const move = /^(?:please )?(?:move|push|postpone|reschedule|shift)\s+(?:the\s+|my\s+)?(?:task\s+)?["“]?(.{2,100}?)["”]?\s+(?:to|until|till)\s+tomorrow\s*[.!]?$/i.exec(q) ?? /^(?:please )?(?:postpone|push back)\s+(?:the\s+|my\s+)?(?:task\s+)?["“]?(.{2,100}?)["”]?\s*[.!]?$/i.exec(q);
  const letGo = /^(?:please )?(?:let\s+(?:the\s+|my\s+)?(?:task\s+)?["“]?(.{2,100}?)["”]?\s+go|let go of\s+(?:the\s+|my\s+)?(?:task\s+)?["“]?(.{2,100}?)["”]?)\s*[.!]?$/i.exec(q);
  if (env && (move || letGo)) return {kind: 'answer', text: say(lang, 'A change to that task, made only when you add it; Undo puts it back.', 'Een wijziging aan die taak, pas gedaan als je haar toevoegt; Undo zet haar terug.') + block({kind: 'move-task', task: (move?.[1] ?? letGo?.[1] ?? letGo?.[2])!.trim().replace(/\s+task$/i, '').slice(0, 140), to: move ? 'tomorrow' : 'let-go'}), calls: []};
  if (/^(?:please )?(?:complete|finish|tick off|check off|mark|delete|remove)\s+(?:the\s+|my\s+)?task\b/i.test(q)) return {kind: 'answer', text: say(lang, 'I can move a task to tomorrow or let it go, but ticking one off or deleting it is done in Tasks, where each has Undo.', 'Ik kan een taak naar morgen verplaatsen of laten gaan, maar afvinken of verwijderen doe je in Tasks, waar elk een Undo heeft.'), calls: []};
  // P-LA-11, P-LA-12 (LA-007, LA-008, C-LA-01): a to-do ("add a task call mom tomorrow", "remind me to buy milk at 18:00",
  // "pay rent friday") is a task card, read by Tasks' own line reader (lib/tasks/intent.ts, lane L5) before any food reading.
  // The pinned how-tos (a meal plan, a food, a goal: no-model.ts HOW_TO) keep their steps; they are not to-dos.
  const howTo = /\bmeal ?plan|\bplan (?:my |the )?meals?\b|\b(?:create|add|make|new|save)\b[^.?!]{0,30}\bfoods?\b|\b(?:plan|create|make|set|start|new)\b[^.?!]{0,30}\bgoals?\b/i.test(q);
  const todo = env && !howTo ? taskIntent(q, env.habitDay) : null;
  if (todo?.confidence === 'sure') {
    const t = todo.parsed, title = t.title.trim(), due = t.due === env!.habitDay ? 'today' : t.due, priority = t.level === 1 || t.level === 2 ? 'high' : t.level === 4 ? 'low' : undefined;
    if (title.length >= 1 && (!due || due === 'today' || due >= env!.habitDay)) return {kind: 'answer', text: say(lang, 'A task for your list, added only when you add it (Tasks shows and edits it).', 'Een taak voor je lijst, pas toegevoegd als je haar toevoegt (Tasks toont en bewerkt haar).') + block({kind: 'add-task', title: `${title[0]!.toUpperCase()}${title.slice(1)}`.slice(0, 140), ...(due ? {due: due === addDays(env!.habitDay, 1) ? 'tomorrow' : due} : {}), ...(due && t.time ? {time: t.time} : {}), ...(priority ? {priority} : {})}), calls: []};
  }
  const goalLog = GOAL_LOG.exec(q), milestone = MILESTONE.exec(q);
  if (goalLog && env) {
    const value = Number(goalLog[1]!.replace(/,(?=\d{3}\b)/g, '')), word = (goalLog[2] ?? '').toLowerCase();
    const asset = /^(?:\$|dollars?|usd)$/.test(word) ? 'USD' : /^(?:€|euros?|eur)$/.test(word) ? 'EUR' : undefined;
    if (Number.isFinite(value) && value > 0) return {kind: 'answer', text: say(lang, 'A contribution to the goal: the goal’s own contribution form opens filled in, and nothing is saved until you save it there.', 'Een inleg voor het doel: het inlegformulier van het doel opent ingevuld, en er wordt niets bewaard tot je het daar opslaat.') + block({kind: 'prefill-contribution', goal: goalLog[3]!.trim().slice(0, 120), amount: value, ...(asset ? {asset} : {}), day: 'today'}), calls: []};
  }
  if (milestone && env) return {kind: 'answer', text: say(lang, 'A milestone for the goal, added only when you add it.', 'Een mijlpaal voor het doel, pas toegevoegd als je hem toevoegt.') + block({kind: 'add-milestone', goal: milestone[2]!.trim().slice(0, 120), title: `${milestone[1]![0]!.toUpperCase()}${milestone[1]!.slice(1)}`.slice(0, 100)}), calls: []};
  // P-LA-19 (LA-009): a workflow named in chat opens NOVA's workflows, where each runs with its steps shown.
  if (WORKFLOW.test(q)) return {kind: 'answer', text: say(lang, 'Workflows run in NOVA → Workflows, step by step on this device; every change is a card you confirm. “Review my week” is one of them.', 'Workflows draaien in NOVA → Workflows, stap voor stap op dit apparaat; elke wijziging is een kaart die je bevestigt. “Review my week” is er een van.') + open('nova'), calls: []};
  return null;
}

// ---- after the facts ----
const TRUST: readonly {re: RegExp; answer: (env: ToolEnv | null, lang: Lang) => string; page?: [string, string?]}[] = [
  {re: /^(?:(?:and )?(?:what(?:'s| is) your name|who (?:are|r) (?:you|u)|who made you|who built you|are you (?:chatgpt|gpt|claude|gemini|siri|alexa|a (?:bot|robot|person|human)))\s*[?.!]*)$/i,
    answer: (env, lang) => say(lang, `I’m ${env && novaEnvInfo(env) ? 'NOVA, your private command center in ZIGoals' : 'ZIGi, the assistant inside ZIGoals'}. Without a brain of your own I answer from your records on this device; with one (your own model or key) that model words the answers. I am not a person, and I don’t send your records anywhere by myself.`, `Ik ben ${env && novaEnvInfo(env) ? 'NOVA, je privé-commandocentrum in ZIGoals' : 'ZIGi, de assistent in ZIGoals'}. Zonder eigen brein antwoord ik uit je gegevens op dit apparaat; met een eigen model of sleutel verwoordt dat model de antwoorden. Ik ben geen persoon en stuur je gegevens nergens zelf heen.`)},
  {re: /\b(?:can|do|could) you (?:see|read|access|use)\b[^.?!]{0,20}\bhealth\b|\bdo you have (?:access to )?my health\b|\bis (?:my )?health shared\b/i,
    answer: (env, lang) => env?.health ? say(lang, 'Yes: Health is shared with me on this device right now, so I can read your diary, water, sleep and the rest when you ask. Settings → ZIGi → Include Health turns it off.', 'Ja: Health is nu op dit apparaat met mij gedeeld, dus ik kan je dagboek, water, slaap en de rest lezen als je het vraagt. Settings → ZIGi → Include Health zet het uit.')
      : say(lang, 'No: Health is not shared with me now, so I don’t read your diary, water, sleep or weight. To share it, turn on Settings → ZIGi → Include Health, with Health on in Your pages.', 'Nee: Health is nu niet met mij gedeeld, dus ik lees je dagboek, water, slaap of gewicht niet. Zet Settings → ZIGi → Include Health aan om het te delen.'), page: ['settings', 'zigi']},
  {re: /\b(?:are|is) you (?:connected|using|running on|powered by)\b|\bwhich (?:ai|model|llm)\b|\bdo you use (?:an? )?(?:ai|model|llm|chatgpt)\b|\bare you (?:an? )?(?:ai|llm|chatgpt|gpt|claude|gemini)\b|\bwhat model\b/i,
    answer: (_env, lang) => say(lang, 'No AI is connected right now: this answer was made on this device from your own records, and nothing was sent anywhere. You can connect your own AI (a model on this computer, or a key of yours) in Settings → ZIGi; it then answers what the device can’t.', 'Er is nu geen AI verbonden: dit antwoord is op dit apparaat gemaakt uit je eigen gegevens, en er is niets verstuurd. Je kunt je eigen AI koppelen in Settings → ZIGi; die beantwoordt dan wat het apparaat niet kan.'), page: ['settings', 'zigi']},
  {re: /\b(?:can|could|will) you (?:delete|remove|erase|clear)\b|\bdelete (?:my|this|that|the) (?:goal|habit|task|entry|record|account)\b/i,
    answer: (_env, lang) => say(lang, 'I can’t delete anything from a chat. Open the record on its own page and choose Delete or Remove there: Goals, Habits and Health each ask you to confirm and offer Undo.', 'Ik kan vanuit een chat niets verwijderen. Open het gegeven op zijn eigen pagina en kies daar Delete of Remove: Goals, Habits en Health vragen om bevestiging en bieden Undo.')},
  {re: /\b(?:do|can|could) you (?:see|read|know|store|keep|access)\b[^.?!]{0,20}\b(?:passwords?|keys?|pins?|seed|bank (?:login|password))\b/i,
    answer: (_env, lang) => say(lang, 'No. I never read, ask for or keep passwords, PINs, private keys or recovery words, and ZIGoals never needs them in a chat. A message that looks like one is refused before it is kept or sent.', 'Nee. Ik lees, vraag of bewaar nooit wachtwoorden, pincodes, privésleutels of herstelwoorden, en ZIGoals heeft ze nooit nodig in een chat. Een bericht dat erop lijkt wordt geweigerd voordat het bewaard of verstuurd wordt.')},
  {re: /\b(?:do|can|will) you (?:change|write|edit|modify|update|add)\b[^.?!]{0,20}\b(?:my )?(?:data|records|anything|things)\b|\bwill you change\b/i,
    answer: (_env, lang) => say(lang, 'Never by myself. Every change I propose is a card you add, edit or dismiss, and an added card has Undo. What I added is listed in Activity → Actions by ZIGi.', 'Nooit uit mezelf. Elke wijziging die ik voorstel is een kaart die jij toevoegt, aanpast of wegklikt, en een toegevoegde kaart heeft Undo. Wat ik toevoegde staat in Activity → Actions by ZIGi.'), page: ['activity']},
  {re: /\bhow much (?:does|do|is|will)\b[^.?!]{0,20}\b(?:zigoals|zigi|nova|premium|it|this app)\b[^.?!]{0,10}\b(?:cost|be)?\b|\b(?:is|are) (?:zigoals|zigi|nova|it|this) free\b|\bpric(?:e|ing) of (?:zigoals|premium)\b|\bwhat does (?:it|zigoals|premium) cost\b/i,
    answer: (_env, lang) => say(lang, 'Everything is free during the Alpha, and nothing is charged. Placeholder prices for later, paid once: ZIGoals €20 and ZIGoals Premium €50 (Premium adds ZIGi and NOVA’s premium features); prices may change. Your own AI provider, if you connect one, bills you directly; ZIGoals bills nothing.', 'Tijdens de Alpha is alles gratis en wordt er niets in rekening gebracht. Voorlopige prijzen voor later, eenmalig: ZIGoals €20 en ZIGoals Premium €50; prijzen kunnen veranderen. Je eigen AI-aanbieder, als je die koppelt, rekent zelf af; ZIGoals rekent niets.'), page: ['settings']},
  {re: /\bforget (?:everything|all|what you know|me|about me|that)\b|\b(?:delete|clear|erase|wipe) (?:your |my )?(?:memory|memories|notes about me)\b|\bvergeet (?:alles|wat je weet)\b/i,
    answer: (_env, lang) => say(lang, 'I only keep what you added as a note. What ZIGi knows about me (on the ZIGi page) lists every note: delete one there, or “Delete all notes”. Nothing else about you is kept from chats.', 'Ik bewaar alleen wat je als notitie toevoegde. What ZIGi knows about me (op de ZIGi-pagina) toont elke notitie: verwijder er daar een, of “Delete all notes”. Verder wordt er niets over jou uit chats bewaard.')},
  {re: /\bwhat (?:did|have) (?:you|zigi|nova) (?:change|changed|add|added|do|done)\b|\bwhat changes? (?:did|have) (?:you|zigi|nova)\b|\bundo (?:what|your) (?:you|last)\b/i,
    answer: (_env, lang) => say(lang, 'Activity → Actions by ZIGi lists every card you added, newest first, each with its page. A card’s own Undo works for ten seconds after you add it; later, change the record on its page.', 'Activity → Actions by ZIGi toont elke kaart die je toevoegde, nieuwste eerst, elk met zijn pagina. De Undo van een kaart werkt tien seconden na het toevoegen; daarna pas je het gegeven op zijn pagina aan.'), page: ['activity']},
];
// P-MO-10 (ZP-17/18/31/39, NP-20/22/24/30/31, Z-030/033): what needs a model says so, with where to give ZIGi one.
const NEEDS_MODEL = /\b(?:give me (?:some )?(?:tips|ideas|advice|suggestions)|tips (?:to|for|on)|how (?:can|could|should) i (?:improve|save more|eat better|sleep better|get better|lose|gain)|motivate me|write (?:me )?(?:a|an)\b|summari[sz]e (?:my|the) (?:week|month|day)|review my (?:week|month)|analy[sz]e my\b|what do you think (?:of|about)\b|explain why\b)/i;
const DEBTS = /\b(?:what|which|my|list|show)\b[^.?!]{0,20}\b(?:debts?|loans?|what i owe|i owe)\b|\bhow much (?:do i|i) owe\b/i;
const BUDGETS = /\b(?:my |weekly |monthly |the )?budgets?\b(?! left)/i;
const CHECKLIST = /\bchecklist\b|\b(?:how many|which)\b[^.?!]{0,30}\b(?:items|planets|dots)\b[^.?!]{0,30}\b(?:done|complete|completed|left|open)\b|\bperfect orbit\b/i;
const BEST_HABIT = /\b(?:best|strongest|most consistent|top) habits?\b/i, SKIPPED = /\b(?:skip(?:ped)?|miss(?:ed)?)\b[^.?!]{0,15}\bmost\b|\bmost (?:skipped|missed)\b|\bweakest habit\b/i;
const HABITS_WEEK = /\bhow (?:are|is) my habits? (?:going|doing)\b|\bhow many check-?ins?\b[^.?!]{0,20}\b(?:this|last) week\b|\bhabits? (?:this|last) week\b/i;
const YESTERDAY = /\bwhat did i (?:do|get done|complete|finish)\b[^.?!]{0,10}\byesterday\b|\byesterday'?s (?:checklist|habits|day)\b/i;
const MACROS = /\bmacros?\b|\b(?:protein|carbs?|fat)\b[^.?!]{0,15}\b(?:and|,)\b[^.?!]{0,15}\b(?:protein|carbs?|fat)\b/i;
const WORKOUT = /\b(?:last|latest|recent|this week'?s?)\s+(?:workouts?|training|gym session)\b|\bwhat workouts?\b|\bwhen did i (?:last )?(?:work out|train|lift)\b/i;
const STAKED = /\bhow much\b[^.?!]{0,20}\bstak(?:ed|ing)\b|\bmy stak(?:e|ed|ing)\b|\bwhat (?:have i|did i) stake\b|\b(?:staking )?rewards?\b[^.?!]{0,20}\b(?:earned|so far|got)\b/i;
const XP = /\b(?:my )?(?:xp|experience points|level)\b[^.?!]{0,10}\??\s*$|\bwhat level am i\b|\bhow much xp\b/i;
const RECALL = /^\s*(?:when|what|where|which|who|how)\b[^?]{2,120}\?\s*$|\bdo you (?:remember|know)\b/i;
const STOP = new Set('the a an is are am do does did i my me you your what when where which who how of to in on at for and or it this that be with about any have has get got'.split(' '));
const words = (s: string) => new Set(s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2 && !STOP.has(w)));

export function alMoreAnswer(question: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  const q = norm(question);
  if (!q || q.length > 300) return null;
  const trust = TRUST.find(t => t.re.test(q));
  if (trust) return {kind: 'answer', text: trust.answer(env, lang) + (trust.page ? open(trust.page[0], trust.page[1]) : ''), calls: []};
  if (NEEDS_MODEL.test(q)) {
    const week = /\breview my week\b/i.test(q);
    return {kind: 'answer', text: say(lang, `This one needs your own AI: without one I answer from your records, but I don’t write reviews, tips or advice.${week ? ' NOVA → Workflows → “Review my week” lays out your week’s own records on this device.' : ''} Settings → ZIGi connects a model on this computer or a key of yours.`, `Hiervoor is je eigen AI nodig: zonder AI antwoord ik uit je gegevens, maar ik schrijf geen overzichten, tips of advies.${week ? ' NOVA → Workflows → “Review my week” zet de gegevens van je week op dit apparaat op een rij.' : ''} In Settings → ZIGi koppel je een model op deze computer of een eigen sleutel.`) + open(week ? 'nova' : 'settings', week ? undefined : 'zigi'), calls: []};
  }
  if (!env) return null;
  if (DEBTS.test(q)) {
    const r = run('accounts', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const debts = ((dataOf(r.result).accounts ?? []) as Data[]).filter(a => a.debt);
    if (!debts.length) return {kind: 'answer', text: say(lang, 'No debt is recorded on this device. A loan, a mortgage or a credit card goes under Wealth → Accounts, debts & net worth.', 'Er is op dit apparaat geen schuld vastgelegd. Een lening, hypotheek of creditcard voeg je toe onder Wealth → Accounts, debts & net worth.') + open('wealth'), calls: [r.record]};
    return {kind: 'answer', text: [say(lang, `Your debts on this device (${debts.length}), each in its own currency:`, `Je schulden op dit apparaat (${debts.length}), elk in zijn eigen valuta:`), ...debts.map(d => `• ${clean(String(d.name), 60)} (${d.kind}): ${money(d.latest)} ${say(lang, 'owed', 'open')}${d.asOf ? ` (${d.asOf})` : ''}${d.yourRatePercent ? `, ${d.yourRatePercent}% ${say(lang, 'rate', 'rente')}` : ''}`), say(lang, 'As Wealth → Accounts shows them; information, not advice.', 'Zoals Wealth → Accounts ze toont; informatie, geen advies.')].join('\n'), calls: [r.record]};
  }
  if (BUDGETS.test(q) && !/\b(?:advice|should)\b/i.test(q)) {
    const r = run('budgets', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result), rows = (d.budgets ?? []) as Data[];
    if (!rows.length) return {kind: 'answer', text: `${/not read on this path/i.test(String(d.note)) ? say(lang, 'Your budgets are not read on this path, so I can’t say them here (unknown, not none).', 'Je budgetten worden hier niet gelezen, dus ik kan ze niet noemen (onbekend, niet nul).') : say(lang, 'No budget is set yet.', 'Er is nog geen budget ingesteld.')} ${say(lang, 'Wealth → Spending → Budgets shows and sets them; the weekly room to spend is on the same page.', 'Wealth → Spending → Budgets toont en zet ze; de ruimte per week staat op dezelfde pagina.')}` + open('wealth'), calls: [r.record]};
    return {kind: 'answer', text: [say(lang, `Your budgets for ${d.month ?? 'this month'}:`, `Je budgetten voor ${d.month ?? 'deze maand'}:`), ...rows.slice(0, 10).map(b => `• ${clean(String(b.category ?? b.name ?? ''), 40)}: ${[b.spent && `${say(lang, 'spent', 'uitgegeven')} ${b.spent}`, b.budget && `${say(lang, 'of', 'van')} ${b.budget}`, b.left && `(${b.left} ${say(lang, 'left', 'over')})`].filter(Boolean).join(' ')}`)].join('\n'), calls: [r.record]};
  }
  if (CHECKLIST.test(q)) {
    const r = run('checklist_today', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result);
    if (d.note) return {kind: 'answer', text: `${clean(String(d.note), 200)} ${say(lang, 'The Checklist page shows today’s path and its counter.', 'De Checklist-pagina toont het pad van vandaag en de teller.')}` + open('checklist'), calls: [r.record]};
    const items = (d.items ?? d.dots ?? []) as Data[], done = items.filter(i => /done|complete/i.test(String(i.state ?? i.status ?? ''))), left = items.filter(i => !done.includes(i));
    return {kind: 'answer', text: [say(lang, `Checklist today: ${done.length} of ${items.length} done.`, `Checklist vandaag: ${done.length} van ${items.length} gedaan.`), ...(left.length ? [say(lang, 'Still open, in path order:', 'Nog open, in de volgorde van het pad:'), ...left.slice(0, 12).map(i => `• ${clean(String(i.title ?? i.label ?? i.name ?? ''), 60)}`)] : [say(lang, 'Everything on today’s path is done.', 'Alles op het pad van vandaag is gedaan.')])].join('\n'), calls: [r.record]};
  }
  if (BEST_HABIT.test(q) || SKIPPED.test(q) || HABITS_WEEK.test(q) || YESTERDAY.test(q)) {
    const list = run('list_habits', {}, env); if (!list.result.ok) return {kind: 'refusal', text: list.result.refusal, calls: [list.record]};
    const habits = ((dataOf(list.result).habits ?? []) as Data[]).filter(h => h.state === 'active').slice(0, 12);
    if (!habits.length) return {kind: 'answer', text: say(lang, 'No habit is kept yet: Habits → New habit, or say “Create a habit called Walk”.', 'Er is nog geen gewoonte: Habits → New habit, of zeg “Maak een gewoonte Wandelen”.'), calls: [list.record]};
    const range = YESTERDAY.test(q) ? 'yesterday' : /\blast week\b/i.test(q) ? 'last week' : 'this week';
    const calls = [list.record], stats = habits.map(h => { const s = run('habit_stats', {habit: String(h.title), range}, env); calls.push(s.record); return s.result.ok ? {title: String(h.title), d: dataOf(s.result)} : null; }).filter((x): x is {title: string; d: Data} => !!x);
    const rate = (d: Data) => d.days?.scheduled ? d.days.complete / d.days.scheduled : 0;
    if (YESTERDAY.test(q)) {
      const done = stats.filter(s => (s.d.days?.complete ?? 0) > 0), partly = stats.filter(s => !(s.d.days?.complete) && (s.d.days?.partial ?? 0) > 0);
      return {kind: 'answer', text: [say(lang, `Yesterday, from your Habits journal: ${done.length} of ${stats.length} habits done.`, `Gisteren, uit je Habits-dagboek: ${done.length} van ${stats.length} gewoontes gedaan.`), ...done.map(s => `• ${clean(s.title, 60)}: ${say(lang, 'done', 'gedaan')}${s.d.valueText ? ` (${s.d.valueText})` : ''}`), ...partly.map(s => `• ${clean(s.title, 60)}: ${say(lang, 'partly', 'deels')}${s.d.valueText ? ` (${s.d.valueText})` : ''}`), say(lang, 'Meals, water and steps: ask “What did I eat yesterday?” or “How many steps did I walk yesterday?”.', 'Maaltijden, water en stappen: vraag “What did I eat yesterday?”.')].join('\n'), calls};
    }
    if (HABITS_WEEK.test(q)) {
      const total = stats.reduce((n, s) => n + (s.d.checkIns ?? 0), 0);
      return {kind: 'answer', text: [say(lang, `${range === 'last week' ? 'Last week' : 'This week'}: ${total} check-ins over ${stats.length} habits.`, `${range === 'last week' ? 'Vorige week' : 'Deze week'}: ${total} check-ins over ${stats.length} gewoontes.`), ...stats.map(s => `• ${clean(s.title, 60)}: ${s.d.days?.complete ?? 0} ${say(lang, 'of', 'van')} ${s.d.days?.scheduled ?? 0} ${say(lang, 'planned days done', 'geplande dagen gedaan')}`)].join('\n'), calls};
    }
    const sorted = [...stats].sort((a, b) => SKIPPED.test(q) ? ((b.d.days?.skipped ?? 0) + (b.d.days?.withoutCheckIn ?? 0)) - ((a.d.days?.skipped ?? 0) + (a.d.days?.withoutCheckIn ?? 0)) : rate(b.d) - rate(a.d) || (b.d.streak?.current ?? 0) - (a.d.streak?.current ?? 0));
    const top = sorted[0]!;
    if (SKIPPED.test(q)) {
      const missed = (top.d.days?.skipped ?? 0) + (top.d.days?.withoutCheckIn ?? 0);
      return {kind: 'answer', text: missed ? say(lang, `${range === 'last week' ? 'Last week' : 'This week'}, ${clean(top.title, 60)} went without a check-in or was skipped most: on ${missed} of ${top.d.days?.scheduled ?? 0} planned days. A smaller step or a set time can make it easier to start.`, `${clean(top.title, 60)} bleef het vaakst open of overgeslagen: op ${missed} van ${top.d.days?.scheduled ?? 0} geplande dagen.`) : say(lang, `No habit was skipped or left without a check-in ${range}.`, `Geen gewoonte werd ${range === 'last week' ? 'vorige week' : 'deze week'} overgeslagen of bleef open.`), calls};
    }
    return {kind: 'answer', text: say(lang, `Your most consistent habit ${range}: ${clean(top.title, 60)}, done on ${top.d.days?.complete ?? 0} of ${top.d.days?.scheduled ?? 0} planned days${top.d.streak?.current ? `, a ${top.d.streak.current}-${top.d.streak.unit === 'weeks' ? 'week' : 'day'} streak` : ''}.`, `Je meest consequente gewoonte ${range === 'last week' ? 'vorige week' : 'deze week'}: ${clean(top.title, 60)}, gedaan op ${top.d.days?.complete ?? 0} van ${top.d.days?.scheduled ?? 0} geplande dagen.`), calls};
  }
  if (MACROS.test(q)) {
    const when = /\byesterday\b/i.test(q) ? 'yesterday' : 'today', r = run('nutrient_totals', {range: when}, env);
    if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result), o = d.overall as Data | undefined, t = typeof d.yourTargets === 'object' ? d.yourTargets as Data : null;
    if (!d.entries || !o) return {kind: 'answer', text: say(lang, `No diary entries ${when}, so no macros to add up (unknown, not zero).`, `Geen dagboekregels ${when === 'today' ? 'vandaag' : 'gisteren'}, dus geen macro's om op te tellen (onbekend, niet nul).`), calls: [r.record]};
    const part = (k: string, label: string) => o[k] ? `${label} ${o[k]}${t?.[k] ? ` ${say(lang, 'of', 'van')} ${String(t[k]).replace(/ a day$/, '')}` : ''}` : null;
    return {kind: 'answer', text: say(lang, `Macros ${when}, from ${d.entries} diary entries: `, `Macro's ${when === 'today' ? 'vandaag' : 'gisteren'}, uit ${d.entries} dagboekregels: `) + [part('kcal', 'energy'), part('protein', 'protein'), part('carbs', 'carbs'), part('fat', 'fat')].filter(Boolean).join(' · ') + say(lang, '. Your own entries; not medical advice.', '. Je eigen invoer; geen medisch advies.'), calls: [r.record]};
  }
  if (WORKOUT.test(q)) {
    const r = run('workouts', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result), recent = (d.recent ?? []) as Data[];
    if (!recent.length) return {kind: 'answer', text: `${/not read on this path/i.test(String(d.note)) ? say(lang, 'Your workout log is not read on this path, so I can’t say it here (unknown, not none).', 'Je trainingslog wordt hier niet gelezen (onbekend, niet nul).') : say(lang, 'No workout is logged yet.', 'Er is nog geen training gelogd.')} ${say(lang, 'Health → Workouts shows them.', 'Health → Workouts toont ze.')}` + open('workouts'), calls: [r.record]};
    const last = recent[0]!;
    return {kind: 'answer', text: say(lang, `Your last workout: ${clean(String(last.name ?? last.title ?? 'a workout'), 60)}${last.day ? ` on ${last.day}` : ''}${last.minutes ? `, ${last.minutes}` : ''}${last.sets ? `, ${last.sets} sets` : ''}.${d.thisWeek ? ` This week: ${d.thisWeek.workouts} workouts, ${d.thisWeek.minutes} minutes.` : ''}`, `Je laatste training: ${clean(String(last.name ?? last.title ?? 'een training'), 60)}${last.day ? ` op ${last.day}` : ''}.`), calls: [r.record]};
  }
  if (STAKED.test(q)) {
    const r = run('staking_watch', {}, env); if (!r.result.ok) return {kind: 'refusal', text: r.result.refusal, calls: [r.record]};
    const d = dataOf(r.result), rows = (d.staking ?? []) as Data[];
    if (!rows.length) return {kind: 'answer', text: say(lang, 'No staking is tracked on this device yet, so nothing staked and no rewards to add up (none tracked, not zero). Staking shows a wallet’s delegations once you connect it there.', 'Er wordt op dit apparaat nog geen staking bijgehouden.') + open('staking'), calls: [r.record]};
    return {kind: 'answer', text: [say(lang, 'Staking tracked in Wealth (watch-only):', 'Staking bijgehouden in Wealth (alleen bekijken):'), ...rows.slice(0, 8).map(s => `• ${clean(String(s.asset), 20)}: ${s.quantity}${s.value && s.value !== 'no price' ? ` (${money(s.value)})` : ''}${s.held ? ` · ${s.held}` : ''}`), say(lang, 'ZIGoals and ZIGi never stake, unstake, claim or move funds; Staking shows the network’s own figures.', 'ZIGoals en ZIGi staken, unstaken of claimen nooit.')].join('\n'), calls: [r.record]};
  }
  // P-NB-60 (NB-105): with no portfolio read here, "what is my portfolio worth" is answered from Wealth's own totals, labelled.
  if (/\bportfolios?\b[^?]{0,30}\b(?:worth|value|valued|total)\b|\b(?:worth|value) of my portfolios?\b/i.test(q)) {
    const w = run('totals_per_currency', {}, env); if (!w.result.ok) return {kind: 'refusal', text: w.result.refusal, calls: [w.record]};
    const totals = (dataOf(w.result).totals ?? []) as Data[];
    return {kind: 'answer', text: say(lang, `Portfolio (Wealth → Portfolio) is read separately and not here. ${totals.length ? `Your holdings in Wealth add up to ${totals.map(t => amount(String(t.total), String(t.currency))).join(' and ')}, one total per currency, never converted.` : 'No holding in Wealth has a value yet.'}`, `Portfolio wordt hier niet gelezen. ${totals.length ? `Je posities in Wealth komen op ${totals.map(t => amount(String(t.total), String(t.currency))).join(' en ')}, per valuta, nooit omgerekend.` : 'Geen positie in Wealth heeft nog een waarde.'}`), calls: [w.record]};
  }
  if (XP.test(q)) return {kind: 'answer', text: say(lang, 'Your level and XP are on Journey, counted on this device from what you do in ZIGoals; I don’t read them in a chat yet.', 'Je level en XP staan op Journey, op dit apparaat geteld uit wat je in ZIGoals doet; in een chat lees ik ze nog niet.') + open('journey'), calls: []};
  // P-DVR-49, P-LA-20 (Z-019, Z-068, LA-027): a question answered by one of the notes the person kept.
  if (env.notes?.length && RECALL.test(q)) {
    const asked = words(q), best = env.notes.map(n => ({n, hits: [...words(n.text)].filter(w => asked.has(w) || [...asked].some(a => a.length > 4 && (w.startsWith(a.slice(0, 5)) || a.startsWith(w.slice(0, 5))))).length})).sort((a, b) => b.hits - a.hits)[0];
    if (best && best.hits >= 1) return {kind: 'answer', text: say(lang, `From what you asked me to remember: “${clean(best.n.text, 300)}”.`, `Uit wat je me vroeg te onthouden: “${clean(best.n.text, 300)}”.`), calls: []};
  }
  return null;
}
