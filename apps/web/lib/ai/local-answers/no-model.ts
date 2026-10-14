import type {ToolEnv} from '../tools/env';
import type {LocalReply} from './engine';
import {EXAMPLES_INTRO, examplesFor} from './examples';

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

export const EXAMPLES_INTRO_NL = 'Zonder AI beantwoord ik vragen over je eigen gegevens hier, op dit apparaat, voorlopig in het Engels. Tik op een voorbeeld:';
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
/** Everything ZIGi says without a model after the device's own answers had none. */
export function noModelReply(text: string, env: ToolEnv | null): LocalReply {
  const lang = questionLanguage(text);
  return howToReply(text, lang) ?? examplesIn(env, lang);
}
