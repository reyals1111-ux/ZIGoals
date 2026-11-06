import type {ToolEnv} from '../tools/env';
import {localAnswer, zigiOverview, type LocalReply} from './engine';
import {alFirst, alMoreAnswer, fixTypos, rewriteQuestion} from './al-more';
import {normalizeSpoken} from '../spoken/normalize';
import {alFactsAnswer} from './al-facts';
import {EXAMPLES_INTRO, examplesFor} from './examples';
import {simpleCommand} from './ai-session';
import {quickLogItems, quickLogReply} from '../../quick-log/multi';
import {quickLogContext} from '../../quick-log/context';
import {novaEnvInfo, novaWording} from './nova-env';
import {mealPhotoReply, streakBreakReply} from './p14b';
import {checklistEditReply, foodEstimateReply, unknownTickReply, weeklyRecapReply} from './al-third';
import {fourthAnswer, fourthFirst} from './al-fourth';
import {safetyFirst} from '../safety-guard';

/**
 * Session AB-Cloud Part 9 (ADR-023 C30): what ZIGi says when no model answers (no AI connected, no on-device model) and the
 * device's own answers had nothing. Two things only, after `localAnswer` said "none" — so every golden case stays exactly
 * as pinned (a whole Dutch question, "Create a habit…", "Make a goal…" stay "none" there; with a model connected they
 * still go to the model, which can draft the cards):
 *
 * - A question in Dutch gets its introduction in Dutch (persona #4). The examples stay the English questions the device
 *   answers, said so plainly, because a tapped example must work.
 * - "Create a food", "log my meal plan" and "plan a goal" get the steps to do it by hand and a button to the right page,
 *   in the question's language, instead of a list of unrelated examples.
 */
export type ReplyLanguage = 'en' | 'nl';
/** Words that mark Dutch and are not English words too ("de", "plan", "week", "is" are left out on purpose). */
const DUTCH = /\b(ik|jij|je|jouw|mijn|hoeveel|hoe|wat|welke|waar|waarom|heb|hebt|heeft|hebben|ben|bent|zijn|het|een|van|voor|niet|met|deze|dit|vandaag|gisteren|morgen|maand|jaar|gedaan|kan|kun|wil|graag|alsjeblieft|maak|maken|voeg|toe|doel|doelen|eten|maaltijd|maaltijden|gewoonte|gewoontes|stappen|minuten|keer|nog|ook|naar|over|hoeft|moet)\b/gi;
const ENGLISH = /\b(i|my|me|you|your|how|what|which|where|why|have|has|did|do|does|the|a|an|of|for|not|with|this|today|yesterday|month|year|can|want|please|make|add|goal|food|meal|habit|steps|minutes|times)\b/gi;
/** The language of a question: Dutch when it carries at least two Dutch words and more Dutch than English ones. */
export function questionLanguage(text: string): ReplyLanguage {
  const nl = new Set((text.match(DUTCH) ?? []).map(w => w.toLowerCase())), en = new Set((text.match(ENGLISH) ?? []).map(w => w.toLowerCase()));
  return nl.size >= 2 && nl.size > en.size ? 'nl' : 'en';
}

// Session AK P4 (FIRST_RUN_REVIEW FR-2): "without any AI" read as a contradiction under NOVA's "Private intelligence"; the
// introduction says what answers now and what a brain adds.
export const EXAMPLES_INTRO_NL = 'Tot je me een brein geeft, beantwoord ik vragen uit je eigen gegevens op dit apparaat, voorlopig in het Engels. Tik op een voorbeeld:';
/** The examples reply in the question's language (the examples themselves are the device's English questions). */
export const examplesIn = (env: ToolEnv | null, lang: ReplyLanguage): LocalReply => ({kind: 'examples', text: lang === 'nl' ? EXAMPLES_INTRO_NL : EXAMPLES_INTRO, examples: examplesFor(env), calls: []});

type HowTo = {id: 'create-food' | 'log-meal-plan' | 'plan-goal'; en: RegExp; nl: RegExp; page: string; view?: string; text: Record<ReplyLanguage, string>};
export const HOW_TO: readonly HowTo[] = [
  {id: 'log-meal-plan', en: /\bmeal ?plan(?:ner|s)?\b|\bplan (?:my |the )?meals?\b/i, nl: /\bmaaltijd ?plan(?:ner|ning)?\b|\bweekmenu\b|\bmaaltijden plannen\b/i, page: 'health', view: 'planner',
    text: {en: 'Without an AI I can\'t fill in a meal plan for you, but by hand it takes a minute:\n1. Health → Planner.\n2. Pick a day and a meal, and plan a recipe or a food into it.\n3. Log it in one tap when you eat it; the grocery list follows the week\'s plan.',
      nl: 'Zonder AI kan ik geen maaltijdplan voor je invullen, maar met de hand gaat het snel:\n1. Health → Planner.\n2. Kies een dag en een maaltijd en plan er een recept of voedingsmiddel in.\n3. Log het met één tik als je het eet; de boodschappenlijst volgt het weekplan.'}},
  {id: 'create-food', en: /\b(?:create|add|make|new|save)\b[^.?!]{0,30}\bfoods?\b|\bfoods?\b[^.?!]{0,20}\b(?:create|add)\b/i, nl: /\b(?:maak|maken|voeg|nieuw(?:e)?|bewaar)\b[^.?!]{0,30}\b(?:voedingsmiddel|product|eten)\b/i, page: 'health',
    text: {en: 'Without an AI I can\'t fill in a food for you, but by hand it takes a minute:\n1. Health → Foods & recipes → New food.\n2. Type the name and the label\'s values per serving, or scan the barcode.\n3. Save it: it is ready to log, and to use in recipes.',
      nl: 'Zonder AI kan ik geen voedingsmiddel voor je invullen, maar met de hand gaat het snel:\n1. Health → Foods & recipes → New food.\n2. Typ de naam en de waarden van het etiket per portie, of scan de barcode.\n3. Bewaar het: je kunt het meteen loggen en in recepten gebruiken.'}},
  {id: 'plan-goal', en: /\b(?:plan|create|make|set|start|new)\b[^.?!]{0,30}\bgoals?\b/i, nl: /\b(?:plan|maak|maken|stel|nieuw(?:e)?|begin)\b[^.?!]{0,30}\bdoel(?:en)?\b/i, page: 'goals', view: 'new-goal',
    text: {en: 'Without an AI I can\'t draft the goal for you, but by hand it takes a minute:\n1. Goals → Create a goal (or start from a template).\n2. Give it a name, a target and a date; the plan step suggests what to put aside each month.\n3. From the goal\'s page, add habits that move it forward.',
      nl: 'Zonder AI kan ik het doel niet voor je opstellen, maar met de hand gaat het snel:\n1. Goals → Create a goal (of begin met een sjabloon).\n2. Geef het een naam, een doelbedrag en een datum; de planstap stelt voor hoeveel je per maand opzijzet.\n3. Voeg op de pagina van het doel gewoontes toe die je dichterbij brengen.'}},
];
const action = (page: string, view?: string) => `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page, ...(view ? {view} : {})})}\n\`\`\``;
/** The steps for a "how do I…" that only a model could have done for the person, or null. */
export function howToReply(text: string, lang: ReplyLanguage): LocalReply | null {
  const hit = HOW_TO.find(h => h.en.test(text) || h.nl.test(text));
  return hit ? {kind: 'answer', text: hit.text[lang] + action(hit.page, hit.view), calls: []} : null;
}
/**
 * Session AK P4 (FIRST_RUN_REVIEW FR-2): a first question about saving ("Help me save for a holiday", "I want to put money
 * aside for a new bike", "Ik wil sparen voor een vakantie") is a goal the person wants to start. The reply offers the goal
 * form with the name filled in from their words (nothing is saved before they create it there).
 */
const SAVE_EN = /\b(?:sav(?:e|ing)(?:\s+(?:up|money))?(?:\s+(?:[$€]\s?\d[\d,.]*|\d[\d,.]*\s?(?:dollars?|euros?|usd|eur|[$€])))?|put(?:ting)?\s+(?:some\s+)?(?:money\s+)?(?:aside|away)|set(?:ting)?\s+(?:some\s+)?(?:money\s+)?aside|budget(?:ing)?|(?:start|make|build|open)\s+(?:a\s+)?(?:savings?\s+)?fund)\s+(?:up\s+)?(?:for|towards?)\b\s*(.*)$/i;
const SAVE_NL = /\b(?:sparen|spaar|opzij\s*zetten|geld\s+opzij(?:\s*zetten)?)\s+(?:voor|om)\b\s*(.*)$/i;
/** Words a question can carry around its noun ("a", "my", "next year") that are no part of the goal's name. */
const NAME_LEAD = /^(?:a|an|the|my|our|some|een|de|het|mijn|onze|new|nieuwe?)\s+/i;
const NAME_TAIL = /\s+(?:next|this|in|by|before|within|over|volgend(?:e)?|deze|dit|in|voor|binnen)\b.*$|\s*[,;:(].*$|[.?!\s]+$/i;
/** The goal's name from the words after "save for" ("a holiday next summer" → "Holiday"), or undefined. */
export function savingGoalName(rest: string): string | undefined {
  let words = rest.trim().replace(NAME_TAIL, '').trim();
  for (let i = 0; i < 3 && NAME_LEAD.test(words); i++) words = words.replace(NAME_LEAD, '');
  words = words.replace(/\s+/g, ' ').trim();
  // A name is a few words of letters; a number, a sum or a whole sentence is left for the person to type.
  if (!words || words.length > 40 || words.split(' ').length > 4 || !/^[\p{L}][\p{L}' -]*$/u.test(words)) return undefined;
  return words[0]!.toUpperCase() + words.slice(1);
}
const openNewGoal = (name?: string) => `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: 'goals', view: 'new-goal', ...(name ? {name} : {})})}\n\`\`\``;
export function savingGoalReply(text: string, lang: ReplyLanguage): LocalReply | null {
  if (/\bgoals?\b|\bdoel(?:en)?\b/i.test(text)) return null; // "plan a goal…" keeps its own how-to (pinned)
  if (/\?\s*$/.test(text) && /^\s*(?:how much|how far|what|when|did|have|hoeveel|wat|wanneer|heb)\b/i.test(text)) return null; // a lookup
  const hit = SAVE_EN.exec(text) ?? SAVE_NL.exec(text);
  if (!hit) return null;
  const name = savingGoalName(hit[1] ?? '');
  const en = name ? `Let's make it a goal: “${name}”. Open the goal form below; the name is filled in, and you add how much and, if you like, by when. Nothing is saved until you create it.`
    : 'Let\'s make it a goal. Open the goal form below: give it a name, how much and, if you like, by when. Nothing is saved until you create it.';
  const nl = name ? `Laten we er een doel van maken: “${name}”. Open het doelformulier hieronder; de naam staat er al, jij vult het bedrag en eventueel een datum in. Er wordt niets opgeslagen voordat je het aanmaakt.`
    : 'Laten we er een doel van maken. Open het doelformulier hieronder: geef het een naam, een bedrag en eventueel een datum. Er wordt niets opgeslagen voordat je het aanmaakt.';
  return {kind: 'answer', text: (lang === 'nl' ? nl : en) + openNewGoal(name), calls: []};
}
/**
 * Session AK P4 (FR-2): "What can you do?" gets a short, true answer: what works now, on this device, and what a brain adds,
 * with one tap to where the brain is set up (NOVA's guide on NOVA, Settings → ZIGi elsewhere).
 */
const CAN_DO_EN = /^\s*(?:(?:hey|hi|hello|ok(?:ay)?|so)\s*,?\s+)*(?:(?:nova|zigi)\s*,?\s+)?(?:what (?:can|do|could) you do(?: for me)?|what are you(?: for)?|who are you|what can i ask(?: you)?|how (?:can|do|could) you help(?: me)?|how do(?:es)? (?:this|you) work|help(?: me)?|what do you know(?: about me)?)\s*[?.!]*\s*$/i;
const CAN_DO_NL = /^\s*(?:(?:hoi|hey|hallo)\s*,?\s+)?(?:(?:nova|zigi)\s*,?\s+)?(?:wat kun(?: je|t)(?: jij)?(?: voor me)?(?: doen)?|wat kan je(?: voor me)?(?: doen)?|wie ben (?:je|jij)|hoe werk je|hoe kun je (?:me )?helpen|help)\s*[?.!]*\s*$/i;
export function capabilitiesReply(text: string, lang: ReplyLanguage, env: ToolEnv | null): LocalReply | null {
  const nlAsk = CAN_DO_NL.test(text);
  if (!CAN_DO_EN.test(text) && !nlAsk) return null;
  const nova = !!(env && novaEnvInfo(env)), where = JSON.stringify(nova ? {kind: 'open-page', page: 'nova', view: 'setup'} : {kind: 'open-page', page: 'settings', view: 'zigi'});
  // Session AL fourth pass (L7-4b; Moscow ZP-32, NP-21, MO:Z-031): Health is named, with whether it is shared now.
  const health = env?.health ? 'your Health (food, water, sleep, workouts), shared now' : 'your Health once you share it'; const healthNl = env?.health ? 'je Health (eten, water, slaap, trainingen), nu gedeeld' : 'je Health zodra je het deelt';
  const en = `Right now I answer from your own records, on this device: what is due today, how your habits and goals are going, ${health}, and what your money adds up to. Say a new habit (“Create a habit called Walk”) or a saving goal (“Help me save for a holiday”) and I prepare it for you to confirm.\nWith a brain of your own (a model on your computer, or your own key) I can also plan with you and talk things through.`;
  const nl = `Nu beantwoord ik vragen uit je eigen gegevens, op dit apparaat: wat er vandaag open staat, hoe je gewoontes en doelen gaan, ${healthNl}, en wat je geld bij elkaar is. Noem een nieuwe gewoonte (“Maak een gewoonte Wandelen”) of een spaardoel (“Ik wil sparen voor een vakantie”) en ik zet het klaar; jij bevestigt.\nMet een eigen brein (een model op je computer, of je eigen sleutel) kan ik ook met je plannen en meedenken.`;
  return {kind: 'answer', text: (lang === 'nl' || nlAsk ? nl : en) + `\n\n\`\`\`zigoals-action\n${where}\n\`\`\``, calls: []};
}
const FRENCH = /\b(je|tu|mon|ma|mes|combien|quel(?:le)?s?|est-ce|pourquoi|aujourd'hui|j'ai|eau|objectifs?|habitudes?|bu|dormi)\b/gi;
const SPANISH = /\b(yo|mi|mis|cu[aá]nt[oa]s?|cu[aá]l(?:es)?|por qu[eé]|hoy|tengo|he|agua|metas?|h[aá]bitos?|dorm[ií]|beb[ií])\b/gi;
// Session AL fourth pass (L7-4b; Lisbon #026, #027, #352/353, LA-010, LZ-020; ZIGi-F8): German and Japanese get the note too.
const GERMAN = /\b(ich|wie|viele|wieviel|habe|hast|heute|meine?n?|füge|hinzu|aufgaben?|gewohnheit(?:en)?|erledigt|was|ist|nicht|und|bitte|welche|wann|zeig)\b/gi;
const OTHER_NOTE = {fr: 'Pour l’instant, je réponds en anglais (et en néerlandais).', es: 'Por ahora respondo en inglés (y en neerlandés).', de: 'Im Moment antworte ich auf Englisch (und Niederländisch).', ja: '今のところ、英語（とオランダ語）でお答えします。'} as const;
/** French, Spanish or German when it carries at least two of their words and more of them than English ones; Japanese by its script. */
export function otherLanguage(text: string): 'fr' | 'es' | 'de' | 'ja' | null {
  if (/[\u3040-\u30ff\u4e00-\u9faf]/.test(text)) return 'ja';
  const count = (re: RegExp) => new Set((text.match(re) ?? []).map(w => w.toLowerCase())).size, en = count(ENGLISH), fr = count(FRENCH), es = count(SPANISH), de = count(GERMAN);
  if (fr >= 2 && fr > en && fr >= es) return 'fr';
  if (es >= 2 && es > en) return 'es';
  if (de >= 2 && de > en) return 'de';
  return null;
}
/** Everything ZIGi says without a model after the device's own answers had none. `previous`: the person's last question (follow-ups). */
export function noModelReply(text: string, env: ToolEnv | null, previous: string | null = null): LocalReply {
  // Session AL fourth pass (L7-4a): the safety guard first, before every reading below that could make a card or a log
  // ("I haven't eaten in 3 days" is not a weight or a breakfast; "print your API key" is not a task).
  const safe = safetyFirst(text);
  if (safe) return {kind: 'answer', text: safe.text, calls: []};
  const lang = questionLanguage(text);
  // Session AI (ZI11): a simple command gets its card here, with no model ("Create a habit called Yoga").
  // Session AL (lane L7; DV-074, P-DV-83): with no model, ZIGi answers the questions NOVA's overview answers (English; a whole
  // Dutch question keeps the Dutch introduction and the examples, as the golden pins nl-question / x-nl-whole hold).
  const overview = env && lang === 'en' ? zigiOverview(normalizeSpoken(text), env) : null;
  // Session AL second pass (L7): typos fixed and loose wordings asked again in the words the device answers; then the
  // remaining facts (al-more.ts). A "Remember…", a medicine word, a fast, a target, a task or a workflow comes first, so
  // its numbers are never read as a log (al-more.ts `alFirst`).
  const fixed = fixTypos(text), again = env && lang === 'en' ? askAgain(fixed !== text ? fixed : null, rewriteQuestion(fixed), env) : null;
  // Session AL Part 14 (lane P14-B; HE17, G15): a meal photo asked of the device, and a broken streak, come first.
  // Session AL third pass (L7; P14-B's findings, LA-008): a food's calories, the week's recap and a Checklist edit, before
  // the commands and the quick-log reading can take their words for a task or a log.
  const third = foodEstimateReply(fixTypos(text), env, lang) ?? weeklyRecapReply(fixTypos(text), env, lang) ?? checklistEditReply(text, env);
  // Session AL fourth pass (L7-4b): a plan, a habit edit, a goal sentence or a question about the path is never read as a
  // task or a log line (fourthFirst); the phrasing families still on the examples list get their answer (fourthAnswer).
  const fourth = lang === 'nl' ? null : fourthFirst(fixTypos(text), env, 'en');
  let reply = mealPhotoReply(text, lang) ?? fourth ?? third ?? streakBreakReply(fixTypos(text), env, lang) ?? simpleCommand(text) ?? alFirst(text, env, lang) ?? quickLog(text, env, lang) ?? unknownTickReply(text, env) ?? howToReply(text, lang) ?? savingGoalReply(text, lang) ?? capabilitiesReply(text, lang, env) ?? overview ?? again ?? alFactsAnswer(normalizeSpoken(fixed), env, lang) ?? alMoreAnswer(normalizeSpoken(fixed), env, lang) ?? fourthAnswer(normalizeSpoken(fixed), env, lang, previous) ?? examplesIn(env, lang);
  // Session AL (L7; Tokyo TK-054/TK-084, Moscow ZP-28/NP-28, Denver Z-007; P-TK-34, P-MO-11, P-DV-89): a French or Spanish
  // question is told, in its own language, that the device answers in English (and Dutch) for now, as a Dutch one is.
  // Session AL fourth pass (L7-4b; Lisbon #024): an answer in English to a question in another language carries the note too.
  const other = otherLanguage(text), info = env ? novaEnvInfo(env) : null;
  if (info) reply = novaWording(reply, info, lang === 'nl' ? 'nl' : 'en'); // L7-4b (BN-047): NOVA's own words on this path too
  return other && 'text' in reply && !reply.text.startsWith(OTHER_NOTE[other]) ? {...reply, text: `${OTHER_NOTE[other]}${reply.kind === 'examples' ? ' ' : '\n'}${reply.text}`} as LocalReply : reply;
}

/** The device's own answer to the typo-fixed question, then to a looser wording asked again (null when neither answers). */
function askAgain(fixed: string | null, rewritten: string | null, env: ToolEnv): LocalReply | null {
  for (const q of [fixed, rewritten]) {
    if (!q) continue;
    let r: LocalReply = {kind: 'none'};
    try { r = localAnswer(q, env); } catch { r = {kind: 'none'}; }
    if (r.kind === 'answer' || r.kind === 'choices' || r.kind === 'refusal') return r;
    const own = zigiOverview(normalizeSpoken(q), env);
    if (own) return own;
  }
  return null;
}
/**
 * Session AI (J10, ZI11): with no model, a line of several things done, eaten or drunk becomes one card each, made on this
 * device ("30 push-ups, 500 ml water and a banana"). A single item Quick add already previews stays with Quick add; a
 * single food, mood or goal contribution gets its card here.
 */
function quickLog(raw: string, env: ToolEnv | null, lang: ReplyLanguage): LocalReply | null {
  if (!env) return null;
  // Session AL third pass (L7): "calories in my lunch" is a question, never a food called "calories in my".
  if (/^\s*(?:how (?:many|much) )?(?:calories|kcal|protein|carbs|fat|sugars?|calorie[eë]n)\b/i.test(raw)) return null;
  const text = mealLine(raw);
  const ctx = quickLogContext(env), items = quickLogItems(text, ctx, lang), known = items.filter(i => i.action);
  if (!known.length || !(items.length >= 2 || ['log-food', 'log-mood', 'prefill-contribution', 'log-expense'].includes(String(known[0]!.action!.kind)))) return null;
  const reply = quickLogReply(text, ctx, lang);
  return reply ? {kind: 'answer', text: cardFixes(reply.text, text, env), calls: []} : null;
}
/**
 * Session AL fourth pass (L7-4b; Lisbon #363/364, LA-044; Moscow ZP-11, NP-09, MO-057): the meal said as a command is the
 * meal, not part of the food's name ("Log breakfast: oatmeal" was a food called "Log oatmeal", "add oatmeal to breakfast"
 * one called "add oatmeal to"). Quick add's own reader (lib/quick-add/parse.ts, shared) reads "breakfast: oatmeal".
 */
export function mealLine(text: string): string {
  const t = text.trim();
  const said = /^(?:please\s+)?(?:log|add|track|record|note|put)\s+(breakfast|lunch|dinner|snacks?)\s*[:,-]\s*(.+)$/i.exec(t);
  if (said) return `${said[1]}: ${said[2]}`;
  const to = /^(?:please\s+)?(?:log|add|track|record|put)\s+(.+?)\s+(?:to|for|in|at|with)\s+(?:my\s+)?(breakfast|lunch|dinner|snacks?)\s*[.!]?$/i.exec(t);
  return to ? `${to[2]}: ${to[1]}` : t;
}
/**
 * The cards ZIGi makes from the shared reader, read once more (L7-4b): a spending note keeps no "I" ("I paid 50 for dinner"
 * was "I dinner"; Lisbon LA-034, #280–289c), and a food eaten in the night with no meal named goes to Snacks, never Breakfast
 * ("I ate a banana" at 02:31; Lisbon #363/364).
 */
function cardFixes(reply: string, said: string, env: ToolEnv): string {
  let out = reply.replace(/("note":")(?:I|I've|I have|we|We)\s+/g, '$1');
  const named = /\b(?:breakfast|lunch|dinner|snacks?|ontbijt|lunch|avondeten|tussendoor)\b/i.test(said);
  const hour = (() => { try { return Number(new Intl.DateTimeFormat('en-GB', {hour: '2-digit', hourCycle: 'h23', timeZone: env.healthZone}).format(env.now)); } catch { return env.now.getUTCHours(); } })();
  if (!named && hour < 5) out = out.replace(/"meal":"Breakfast"/g, '"meal":"Snacks"');
  return out;
}
