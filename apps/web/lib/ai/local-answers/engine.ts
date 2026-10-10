import Decimal from 'decimal.js';
import {latestHabitRule, measurementUnit, type Habit} from '../../habits';
import {exerciseData} from '../../health-counters';
import {summaries} from '../tools/goals';
import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED, text as clean} from '../tools/format';
import {NUTRIENTS, type NutrientName} from '../tools/health';
import {findRanges, previousRange, type DayRange} from '../tools/range';
import {runTool} from '../tools/registry';
import {normalise, stem, tokens} from '../tools/subjects';
import type {ToolOk, ToolResult} from '../tools/types';
import {amount, dayText, groupUnits, grouped, instantText, n, plural, span} from './words';
import {EXAMPLES_INTRO, examplesFor} from './examples';
import {normalizeSpoken} from '../spoken/normalize';

/**
 * Local answers (Session V Part 3, ADR-014): pure lookups answered on this device from ZIGi's own tools, with no AI and
 * nothing sent anywhere. The engine recognises totals, counts, minutes, averages, best and lowest days, streaks,
 * completion rates, goal progress and what remains, the last time something happened, "this versus last" comparisons,
 * what was eaten on a day, a nutrient target, water, steps, weight and holdings. Anything else — advice, plans, lists to
 * act on, logging something — is not a lookup: it goes to the person's AI (or, without one, gets examples of what ZIGi
 * can answer). Two records that match equally come back as choices, never a guess. Health questions with the Health
 * gate closed are refused before anything of Health is read (the environment holds no Health then).
 */
export type ToolCallRecord = {tool: string; args: Record<string, unknown>; label: string};
export type Subject = {kind: 'habit' | 'goal'; id: string};
export type LocalChoice = {label: string; subject: Subject};
export type LocalReply =
  | {kind: 'answer'; text: string; calls: ToolCallRecord[]}
  | {kind: 'choices'; text: string; choices: LocalChoice[]; calls: ToolCallRecord[]}
  | {kind: 'refusal'; text: string; calls: ToolCallRecord[]; choices?: LocalChoice[]}
  | {kind: 'examples'; text: string; examples: string[]; calls: ToolCallRecord[]}
  | {kind: 'none'};
const NONE: LocalReply = {kind: 'none'};

// Not lookups: requests to change something, statements to log, and questions that want judgement or advice.
const ACTION = /^(?:please |can you |could you |ok |okay )?(?:log|add|track|record|mark|skip|create|make|set|remind|start|stop|delete|remove|plan|schedule|change|update|edit|rename|move|buy|sell|send|transfer|stake|unstake|swap|undo|turn|show me how|write|draft)\b/;
/**
 * Session Z-Local Part 6 (ADR-020 L30): a question that also asks for an action ("how much water today, and log one more glass",
 * "wat is mijn reeks? en vink mijn wandeling af", "…, log it") is the model's turn, never the device's: the device would answer the
 * question and the card would never come (seen in the Sonnet UI panel: five such asks answered in 300 ms with no card).
 */
const MIXED = /(?:,|;|\band\b|\bthen\b|\balso\b|\bplus\b|\ben\b|\bdan\b|\book\b)\s+(?:please\s+|also\s+|ook\s+|even\s+)?(?:log|add|track|record|mark|tick|skip|create|make|set|remind|start|stop|delete|remove|note|put|save|zet|voeg|noteer|vink|sla|registreer|verwijder|maak|plan)\b/;
const STATEMENT = /^(?:i|i've|i have|we) (?:ate|drank|had|did|walked|ran|meditated|read|weighed|slept|went|took|spent|bought|sold|logged|finished|completed|just)\b/;
const ADVICE = /\b(why|should|suggest|recommend|advice|advise|tips?|help me|how can i|how do i|how to|improve|explain|what if|motivat|healthy|unhealthy|good for me|bad for me|is that (?:good|bad|ok|okay|enough)|enough|too much|too little|plan|diet|lose weight|gain weight|need attention|needs attention|focus on|worried|worry|feel|feeling)\b/;
const W = {
  average: /\b(average|avg|mean|on average|per day|a day|daily average|typical)\b/,
  best: /\b(best(?: \w+)? day|most (?:in|on) (?:a|one) day|highest|biggest day|top day|record day|most)\b/,
  worst: /\b(worst(?: \w+)? day|least|lowest|fewest)\b/,
  last: /\b(when did i last|when was (?:the|my) last|last time|most recent(?:ly)?)\b/,
  target: /\b(target|goal|hit|reach|reached|meet|met)\b/,
  compare: /\b(than|vs|versus|compare|compared|comparison|difference)\b/,
  streakBest: /\b(longest|best|record|biggest|max(?:imum)?)\b[^?]*\bstreaks?\b|\bstreaks?\b[^?]*\b(longest|best|record|ever)\b/,
  streak: /\bstreaks?\b/,
  rate: /\b(completion rate|success rate|rate|percent(?:age)?|consistency|consistent)\b|%/,
  minutes: /\b(minutes?|mins?|hours?|hrs?|how long|time spent|time did i spend)\b/,
  count: /\b(how many times|how often|times|check-?ins?|checked in|sessions?)\b/,
  // Session X-Local Part 6d: "which" is a lookup word too ("Which milestones are done?"); "summarise" stays the AI's (T's rule).
  lookup: /\b(how (?:many|much|far|long|often|close|did)|what(?:'s| is| was| were)?|which|when|total|did i|do i|have i|am i|average|avg|longest|best|streak|show|compare|compared)\b/,
};
const HEALTH = {
  water: /\b(water|hydrat\w*)\b/,
  steps: /\bsteps?\b/,
  active: /\b(active|movement|activity) minutes\b/,
  weight: /\b(weigh|weight|weighed|kilos?|pounds|lbs?|gewicht|weeg|woog|gewogen|kg)\b/, // Session Z-Local Part 4: the Dutch forms too
  measurement: /\b(waist|hips?|chest|thighs?|arm measurement|measurements?)\b/,
  fasting: /\b(fast|fasts|fasting|fasted)\b/,
  diary: /\b(eat|ate|eaten|eating|food|foods|meal|meals|breakfast|lunch|dinner|snacks?|diary)\b/,
  counter: /\b(push-?ups?|pull-?ups?|squats?|reps|repetitions|counters?)\b/,
};
const NUTRIENT_WORDS: [RegExp, NutrientName][] = [[/\b(calories|calorie|kcal|energy)\b/, 'kcal'], [/\bprotein\b/, 'protein'], [/\b(carbs?|carbohydrates?)\b/, 'carbs'], [/\bsaturated fats?\b/, 'saturated_fat'], [/\bfats?\b/, 'fat'], [/\bfib(?:er|re)s?\b/, 'fiber'], [/\bsugars?\b/, 'sugar'], [/\b(sodium|salt)\b/, 'sodium'], [/\bpotassium\b/, 'potassium'], [/\bcalcium\b/, 'calcium'], [/\biron\b/, 'iron']];
const WEALTH_TOTAL = /\b(net worth|my wealth|total wealth|wealth total|everything i (?:own|hold)|all my holdings|how much (?:is|am) i worth|(?:tracked )?totals? (?:per|by) currency|(?:per|by) currency)\b/;
/** Session X-Local Part 6d: "What is my portfolio worth?" is answered from the portfolios tool, each in its own currency. */
const PORTFOLIO_WORTH = /\bportfolios?\b[^?]*\b(worth|value|valued|total|hold|holds|holding)\b|\b(worth|value) of my portfolios?\b|\bwhat(?:'s| is) in my portfolios?\b/;
// Session W Part 21 (W7): the areas Session W added.
// Session X-Local Part 6b: "how much debt", "list my accounts" and "show my debts" ask the same (never "sleep debt").
const OWE = /\b(what do i owe|how much do i owe|how much debt|my debts?|my loans?|my mortgage|my credit cards?|my accounts|accounts and debts|(?:list|show)(?: me)?(?: my| the)? (?:accounts|debts|loans))\b/;
const CHESS = /\b(chess|lichess|chess\.com|elo)\b/;
const CHESS_SITE = /\b(ratings?|rated|elo|lichess|chess\.com|games?|won|wins?|lost|loss(?:es)?|draws?|results?)\b/;
const CHESS_GAMES = /\b(games?|won|wins?|lost|loss(?:es)?|draws?|results?|play(?:ed)?)\b/;
const LINKS = /\b(my links|how many links)\b/;
const CHALLENGE = /\bchallenges?\b/;
const MILESTONE = /\bmilestones?\b/;
const MINDFUL = /\b(mindful(?:ness)? minutes|breathing sessions?)\b/;
const W_HEALTH = {
  sleep: /\b(sleep|slept|sleeping|bedtime|bed time|woke|waking|naps?)\b/, debt: /\bsleep debt\b/, steady: /\b(consisten\w*|regular|steady)\b/, lastNight: /\blast night\b/,
  meditation: /\bmeditat\w*\b/, vitals: /\b(resting heart rate|heart rate|resting hr|active energy|resting energy|vitals)\b/,
  devices: /\b(my devices|which devices|connected devices|linked (?:services|accounts|devices)|devices and imports|where (?:do|did) my (?:health )?records come from)\b/,
};
const HOLD = /\b(hold|holding|holdings|own|owned|have|got|total)\b/;
const FUTURE = /\b(next (?:week|month|year)|coming (?:week|month|year)|tomorrow|volgende (?:week|maand)|komende (?:week|maand)|morgen|la semaine prochaine|le mois prochain|demain|nächste woche|nächsten monat)\b/;
const GOAL_PROGRESS = /\b(how far|progress|left|remaining|to go|reach(?:ed)?|percent|how close|how much more|status|funded|saved|how is|how are|doing|going|coming along)\b|%/;
const CONTRIBUTION = /\b(contribut\w*|deposit\w*|withdr\w*|put (?:in|into|aside)|set aside)\b/;
const ASSET_NAMES: Record<string, string> = {bitcoin: 'BTC', bitcoins: 'BTC', ethereum: 'ETH', ether: 'ETH', zigchain: 'ZIG', gold: 'GOLD', silver: 'SILVER'};
const MIN_UNITS = new Set(['minutes', 'minute', 'min', 'mins']);

type HabitHit = {habit: Habit; strength: 'strong' | 'weak' | 'partial'};
const words = (q: string) => normalise(q).split(' ').filter(Boolean);
const close = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)));
/** How a habit's title appears in the question: the whole title in order ("strong"), every word apart ("weak"), some words ("partial"). */
function habitHits(env: ToolEnv, q: string): HabitHit[] {
  const qStems = words(q).map(stem), hits: HabitHit[] = [];
  for (const habit of env.habits.habits) {
    if (latestHabitRule(habit).state === 'archived') continue;
    const title = tokens(habit.title).map(stem).filter(t => t.length >= 3);
    if (!title.length) continue;
    const present = title.filter(t => qStems.some(w => close(w, t)));
    if (!present.length) continue;
    if (present.length < title.length) { hits.push({habit, strength: 'partial'}); continue; }
    const contiguous = title.length === 1 || qStems.some((_, i) => title.every((t, j) => qStems[i + j] !== undefined && close(qStems[i + j]!, t)));
    hits.push({habit, strength: contiguous ? 'strong' : 'weak'});
  }
  return hits;
}
const unitWords = (habit: Habit) => { const unit = measurementUnit(latestHabitRule(habit)).toLowerCase(); return unit ? [unit, unit.replace(/s$/, '')] : []; };
function strongestHabits(hits: HabitHit[], q: string): HabitHit[] {
  const promoted = hits.map(h => h.strength === 'weak' && unitWords(h.habit).some(u => new RegExp(`\\b${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`).test(q)) ? {...h, strength: 'strong' as const} : h);
  for (const level of ['strong', 'weak', 'partial'] as const) { const at = promoted.filter(h => h.strength === level); if (at.length) return at; }
  return [];
}

/**
 * What a question is about, for the question-aware context (Part 4): the habits, goals, asset and Health measures it
 * names, and its periods. Nothing of Health is read to decide this unless the environment holds Health (counter names).
 */
export type Subjects = {
  habits: Habit[]; goals: ReturnType<typeof summaries>; asset: string | null; wealthTotal: boolean; contributions: boolean;
  health: {nutrient: NutrientName | null; water: boolean; steps: boolean; active: boolean; weight: boolean; measurement: boolean; fasting: boolean; diary: boolean; counter: string | true | null; sleep: boolean; meditation: boolean; vitals: boolean; devices: boolean};
  /** Session W Part 21: the other areas Session W added. */
  life: {accounts: boolean; chess: boolean; links: boolean; challenges: boolean; milestones: boolean};
  ranges: (DayRange & {phrase?: string})[];
};
export function detectSubjects(question: string, env: ToolEnv): Subjects {
  const q = question.toLowerCase().replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim();
  const hits = strongestHabits(habitHits(env, q), q), counters = env.health ? exerciseData(env.health).counters.map(c => c.name) : [];
  const counter = counters.find(name => new RegExp(`\\b${normalise(name).replace(/ /g, '[ -]?')}\\b`).test(normalise(q))) ?? (HEALTH.counter.test(q) ? true : null);
  // A habit the question names keeps sleep and meditation words for itself, as in the local answers.
  const named = hits.some(h => h.strength !== 'partial');
  return {
    habits: hits.filter(h => h.strength !== 'partial' || hits.length === 1).map(h => h.habit).slice(0, 3),
    goals: mentionedGoals(env, q).slice(0, 2), asset: mentionedAsset(env, q), wealthTotal: WEALTH_TOTAL.test(q), contributions: CONTRIBUTION.test(q),
    health: {nutrient: NUTRIENT_WORDS.find(([re]) => re.test(q))?.[1] ?? null, water: HEALTH.water.test(q), steps: HEALTH.steps.test(q), active: HEALTH.active.test(q), weight: HEALTH.weight.test(q), measurement: HEALTH.measurement.test(q), fasting: HEALTH.fasting.test(q), diary: HEALTH.diary.test(q), counter,
      sleep: !named && W_HEALTH.sleep.test(q), meditation: MINDFUL.test(q) || (!named && W_HEALTH.meditation.test(q)), vitals: W_HEALTH.vitals.test(q), devices: W_HEALTH.devices.test(q)},
    life: {accounts: OWE.test(q) || /\b(debts?|loans?|mortgage|savings account|pension)\b/.test(q), chess: CHESS.test(q), links: LINKS.test(q), challenges: CHALLENGE.test(q), milestones: MILESTONE.test(q)},
    ranges: findRanges(q, env.healthDay),
  };
}
/** The answer to a question, or `none` when it is not a lookup ZIGi answers on the device. */
export function localAnswer(question: string, env: ToolEnv, subject?: Subject): LocalReply {
  const reply = answer(normalizeSpoken(question), env, subject); // Session Z-Local Part 4: the spoken form
  return 'text' in reply ? {...reply, text: groupUnits(reply.text)} : reply;
}
/**
 * Session Z-Local Part 5: "open my sleep page", "go to habits", "ga naar mijn doelen" is a navigation intent the device
 * answers itself with an `open-page` card (no AI, no records read): the ask names only a page or a view. "Show my
 * debts" and "list my goals" stay lookups (no page word), and anything with a record or a figure is not navigation.
 */
const NAV_PAGES: Record<string, {page: string; view?: string; label: string}> = {
  today: {page: 'today', label: 'Today'}, vandaag: {page: 'today', label: 'Today'}, home: {page: 'today', label: 'Today'}, dashboard: {page: 'today', label: 'Today'},
  goals: {page: 'goals', label: 'Goals'}, goal: {page: 'goals', label: 'Goals'}, doelen: {page: 'goals', label: 'Goals'}, 'new goal': {page: 'goals', view: 'new-goal', label: 'Goals → New goal'}, 'nieuw doel': {page: 'goals', view: 'new-goal', label: 'Goals → New goal'},
  habits: {page: 'habits', label: 'Habits'}, habit: {page: 'habits', label: 'Habits'}, gewoontes: {page: 'habits', label: 'Habits'}, gewoonten: {page: 'habits', label: 'Habits'},
  health: {page: 'health', label: 'Health'}, gezondheid: {page: 'health', label: 'Health'}, sleep: {page: 'health', view: 'sleep', label: 'Health → Sleep'}, slaap: {page: 'health', view: 'sleep', label: 'Health → Sleep'},
  meditation: {page: 'health', view: 'meditation', label: 'Health → Meditation'}, meditatie: {page: 'health', view: 'meditation', label: 'Health → Meditation'}, devices: {page: 'health', view: 'devices', label: 'Health → Devices'}, apparaten: {page: 'health', view: 'devices', label: 'Health → Devices'}, imports: {page: 'health', view: 'imports', label: 'Health → Imports'},
  wealth: {page: 'wealth', label: 'Wealth'}, vermogen: {page: 'wealth', label: 'Wealth'}, portfolio: {page: 'portfolio', label: 'Portfolio'}, portefeuille: {page: 'portfolio', label: 'Portfolio'}, markets: {page: 'markets', label: 'Markets'}, market: {page: 'markets', label: 'Markets'}, markten: {page: 'markets', label: 'Markets'},
  staking: {page: 'staking', label: 'Staking'}, ecosystem: {page: 'ecosystem', label: 'Ecosystem'}, ecosysteem: {page: 'ecosystem', label: 'Ecosystem'}, chess: {page: 'chess', label: 'Chess'}, schaken: {page: 'chess', label: 'Chess'}, schaak: {page: 'chess', label: 'Chess'},
  activity: {page: 'activity', label: 'Activity'}, activiteit: {page: 'activity', label: 'Activity'}, settings: {page: 'settings', label: 'Settings'}, instellingen: {page: 'settings', label: 'Settings'}, zigi: {page: 'settings', view: 'zigi', label: 'Settings → ZIGi · Your Personal AI Companion'}, 'zigi settings': {page: 'settings', view: 'zigi', label: 'Settings → ZIGi · Your Personal AI Companion'},
  pages: {page: 'settings', view: 'pages', label: 'Settings → Your pages & buttons'}, "pagina's": {page: 'settings', view: 'pages', label: 'Settings → Your pages & buttons'}, help: {page: 'help', label: 'Help'}, music: {page: 'music', label: 'Music'}, muziek: {page: 'music', label: 'Music'},
};
const NAV_ASK = /^(?:please |ok |okay |hey |hi |zigi,? |nova,? |kun je |kan je |can you |could you |wil je |would you )*(?:open|go to|take me to|switch to|jump to|navigate to|bring up|show me|show|ga naar|open|toon|laat me|laat mij|laat|breng me naar|breng mij naar)\s+(?:my |the |mijn |de |het |me |een )?([a-z' ]{3,24}?)(?:\s*(?:page|pagina|tab|screen|scherm|view|section|overzicht|zien))?(?:\s*(?:please|alsjeblieft|alstublieft|aub|graag|even))?[.!?]?$/;
export function navigationIntent(question: string): {page: string; view?: string; label: string} | null {
  const q = normalizeSpoken(question).toLowerCase().replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim();
  const m = NAV_ASK.exec(q); if (!m) return null;
  const word = m[1]!.trim().replace(/^(?:my|the|mijn|de|het)\s+/, '');
  return NAV_PAGES[word] ?? null;
}
const navigationReply = (nav: {page: string; view?: string; label: string}): LocalReply => ({kind: 'answer', text: `Opening ${nav.label}.\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page: nav.page, ...(nav.view ? {view: nav.view} : {})})}\n\`\`\``, calls: []});
function answer(question: string, env: ToolEnv, subject?: Subject): LocalReply {
  const q = question.toLowerCase().replace(/[’`]/g, '\'').replace(/\s+/g, ' ').trim();
  if (!q || q.length > 300) return NONE;
  const nav = navigationIntent(q); if (nav) return navigationReply(nav);
  if (ACTION.test(q) || STATEMENT.test(q) || MIXED.test(q)) return NONE;
  if (ADVICE.test(q)) return NONE;
  if (env.areas.today === false && env.areas.habits === false && env.areas.goals === false && env.areas.wealth === false && !env.health) return {kind: 'refusal', text: 'Paused on this private screen: ZIGi reads nothing here.', calls: []};
  // A lookup asks: question words, or a figure's name ending in a question mark ("Minutes of reading this month?").
  const asked = /\?\s*$/.test(q) && (W.minutes.test(q) || W.streak.test(q) || W.average.test(q) || W.rate.test(q) || /\b(steps|water|calories|protein)\b/.test(q) || WEALTH_TOTAL.test(q) || OWE.test(q));
  // Session X-Local Part 6b: "list my accounts" and "show my debts" are lookups said as a request.
  const listed = /^(?:list|show)\b/.test(q) && OWE.test(q);
  // "How is my Japan goal doing?" names a goal and asks after its progress; "How is my fasting going?" names none and
  // stays an open question for the person's AI (T's own rule).
  const goalDoing = /\bhow (?:is|are)\b/.test(q) && GOAL_PROGRESS.test(q) && mentionedGoals(env, q).length > 0;
  if (!W.lookup.test(q) && !asked && !listed && !goalDoing && !subject && !W_HEALTH.devices.test(q)) return NONE;
  // Session X-Local Part 6b: a question about a range still ahead is refused in words, never answered with today's
  // range instead (findRanges drops a refused range, and the default would have stood in for it).
  if (FUTURE.test(q)) return {kind: 'refusal', text: 'That is still ahead: ZIGi reads only what is recorded up to today.', calls: []};
  const ranges = (today: string) => findRanges(q, today);
  // Wealth first: a coin or asset the person holds, or the wealth total.
  const asset = mentionedAsset(env, q);
  if (WEALTH_TOTAL.test(q)) return wealthTotal(env);
  if (PORTFOLIO_WORTH.test(q) && env.portfolio) return portfolioAnswer(env);
  if (asset && HOLD.test(q) && !CONTRIBUTION.test(q)) return holding(env, asset);
  // Session W Part 21: accounts and debts, chess, My links, challenges and milestones (each behind its own area's switch),
  // and mindful minutes (Health). A habit the question names keeps its answer: "how often did I play chess" with a habit
  // called Chess, and "meditation" with a habit called Meditate, stay habit answers.
  if (OWE.test(q)) return accountsAnswer(env, q);
  if (CHESS.test(q) && (CHESS_SITE.test(q) || !strongestHabits(habitHits(env, q), q).some(h => h.strength === 'strong'))) return chessAnswer(env, q, ranges(env.habitDay));
  if (LINKS.test(q)) return linksAnswer(env);
  if (CHALLENGE.test(q)) return challengesAnswer(env);
  if (MILESTONE.test(q)) return milestonesAnswer(env, q);
  if (MINDFUL.test(q)) return meditationAnswer(env, ranges(env.healthDay));
  // Goals: a goal named in the question, or "goal" with progress words and no Health measure.
  const healthWord = Object.values(HEALTH).some(re => re.test(q)) || NUTRIENT_WORDS.some(([re]) => re.test(q));
  if (subject?.kind === 'goal') return goalProgress(env, subject.id, q);
  if (CONTRIBUTION.test(q) && /\b(how much|amount|total|sum|goal|goals)\b/.test(q) && !/\btimes\b/.test(q)) return contributions(env, q, ranges(env.habitDay));
  const goalHits = mentionedGoals(env, q);
  // X-Cloud's H10 (ADR-017 S71): "how far am I on my goals?" with no goal on the device answered with the example questions, which held the same question.
  if (!goalHits.length && GOAL_PROGRESS.test(q) && /\bgoals?\b/.test(q) && !healthWord && !summaries(env).some(g => g.status === 'active')) return {kind: 'answer', text: 'You have no goals yet. Open Goals to create one, or tell me the goal and I will draft it as a card.', calls: []};
  if (goalHits.length && (GOAL_PROGRESS.test(q) || /\bgoal\b/.test(q)) && !healthWord) {
    if (goalHits.length > 1) return {kind: 'choices', text: 'More than one goal matches. Which one do you mean?', choices: goalHits.map(g => ({label: clean(g.name, 60), subject: {kind: 'goal', id: g.key}})), calls: []};
    return goalProgress(env, goalHits[0]!.key, q);
  }
  // Habits named in the question come before Health words, unless only part of a longer title matched.
  const hits = subject?.kind === 'habit' ? env.habits.habits.filter(h => h.id === subject.id).map(habit => ({habit, strength: 'strong' as const})) : strongestHabits(habitHits(env, q), q);
  const strong = hits.filter(h => h.strength === 'strong');
  if (strong.length === 1) return habitAnswer(env, strong[0]!.habit, q, ranges(env.habitDay));
  if (strong.length > 1) return choicesFor(strong.map(h => h.habit));
  const health = healthIntent(env, q, hits.some(h => h.strength !== 'partial'));
  if (health) {
    if (!env.health) return {kind: 'refusal', text: HEALTH_CLOSED, calls: [], ...(hits.length ? {choices: hits.map(h => ({label: `${clean(h.habit.title, 50)} (habit)`, subject: {kind: 'habit' as const, id: h.habit.id}}))} : {})};
    return health(ranges(env.healthDay));
  }
  const habitWords = W.streak.test(q) || W.rate.test(q) || W.count.test(q) || W.minutes.test(q) || W.last.test(q) || /\bhabits?\b/.test(q);
  if (hits.length === 1 && habitWords) return habitAnswer(env, hits[0]!.habit, q, ranges(env.habitDay));
  if (hits.length > 1 && habitWords) return choicesFor(hits.map(h => h.habit));
  // Session X-Local Part 6d: "What is my longest streak ever?" names no habit: the best streak across all of them.
  if (W.streakBest.test(q) && !hits.length) return bestStreakAnswer(env);
  return NONE;
}
/** What ZIGi says, with no AI connected, to a question that is not a lookup: what it can answer, as examples to tap. */
export const examplesReply = (env: ToolEnv | null): LocalReply => ({kind: 'examples', text: EXAMPLES_INTRO, examples: examplesFor(env), calls: []});
const choicesFor = (habits: Habit[]): LocalReply => ({kind: 'choices', text: `More than one habit matches: ${habits.map(h => clean(h.title, 50)).join(', ')}. Which one do you mean?`, choices: habits.slice(0, 6).map(h => ({label: clean(h.title, 50), subject: {kind: 'habit', id: h.id}})), calls: []});
function call(env: ToolEnv, tool: string, args: Record<string, unknown>): {result: ToolResult; record: ToolCallRecord} {
  const result = runTool(tool, args, env);
  return {result, record: {tool, args, label: result.label}};
}
const dataOf = (r: ToolResult) => (r as ToolOk).data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function refusalOf(results: {result: ToolResult; record: ToolCallRecord}[]): LocalReply | null {
  const refused = results.find(r => !r.result.ok)?.result;
  return refused && !refused.ok ? {kind: 'refusal', text: refused.refusal, calls: results.map(r => r.record)} : null;
}
const PHRASES = new Set(['today', 'this month', 'the last 7 days', 'the last 30 days', 'the last 90 days']);
/** What a tool is asked for: the person's own phrase when there is one (so the tool's label reads "this month"), else the dates. */
const rangeArg = (range: DayRange & {phrase?: string}) => range.phrase ?? (PHRASES.has(range.label) ? range.label : range.from === range.to ? range.from : `${range.from}..${range.to}`);
const lines = (head: string, items: (string | false | null | undefined)[]) => [head, ...items.filter((x): x is string => !!x).map(x => `- ${x}`)].join('\n');

function habitAnswer(env: ToolEnv, habit: Habit, q: string, found: DayRange[]): LocalReply {
  const title = clean(habit.title, 60), rule = latestHabitRule(habit), unit = measurementUnit(rule) || (rule.measurement.kind === 'boolean' ? 'check-ins' : '');
  const timed = rule.measurement.kind === 'duration' || MIN_UNITS.has(unit.toLowerCase()) || /^(h|hr|hrs|hour|hours)$/i.test(unit);
  const stats = (r: DayRange, metric: string) => call(env, 'habit_stats', {habit: title, range: rangeArg(r), metric});
  const valueOf = (d: Record<string, any>) => typeof d.value === 'number' ? `${n(d.value, 2)} ${d.unit}` : d.valueText as string; // eslint-disable-line @typescript-eslint/no-explicit-any
  if (W.streakBest.test(q) || W.streak.test(q)) {
    const s = call(env, 'habit_stats', {habit: title, metric: 'streak'}), refused = refusalOf([s]); if (refused) return refused;
    const st = dataOf(s.result).streak as {current: number; best: number; unit: string};
    const head = W.streakBest.test(q) ? `Your longest ${title} streak is ${plural(st.best, st.unit.replace(/s$/, ''))}; the current one is ${plural(st.current, st.unit.replace(/s$/, ''))}.` : `Your current ${title} streak is ${plural(st.current, st.unit.replace(/s$/, ''))} (longest: ${plural(st.best, st.unit.replace(/s$/, ''))}).`;
    return {kind: 'answer', text: head, calls: [s.record]};
  }
  if (W.last.test(q)) {
    const range = {from: habit.startDate < env.habitDay ? habit.startDate : env.habitDay, to: env.habitDay, label: 'since it began'};
    const r = call(env, 'habit_checkins', {habit: title, range: rangeArg(clampYear(range, env.habitDay))}), refused = refusalOf([r]); if (refused) return refused;
    const rows = (dataOf(r.result).checkIns as {date: string; value: number | string | null; unit: string}[]).filter(row => row.value !== null && row.value !== 0);
    const last = rows.at(-1);
    return {kind: 'answer', text: last ? `You last checked in ${title} on ${dayText(last.date, env.habitDay.slice(0, 4))}${typeof last.value === 'number' ? ` (${n(last.value, 2)} ${last.unit})` : last.value ? ` (${last.value})` : ''}.` : `There is no check-in for ${title} in the last year.`, calls: [r.record]};
  }
  const range = found[0] ?? defaultRange(env.habitDay, 'this month');
  const metric = W.rate.test(q) ? 'rate' : W.minutes.test(q) ? 'minutes' : W.count.test(q) ? 'count' : 'quantity';
  if (W.compare.test(q) || found.length > 1) {
    const other = found[1] ?? previousRange(range, env.habitDay);
    const a = stats(range, metric), b = stats(other, metric), refused = refusalOf([a, b]); if (refused) return refused;
    const da = dataOf(a.result), db = dataOf(b.result);
    return {kind: 'answer', text: lines(`${title}: ${valueOf(da)} ${span(range, env.habitDay)}, and ${valueOf(db)} ${span(other, env.habitDay)}.`, [compareLine(da.value, db.value, da.unit, range, other)]), calls: [a.record, b.record]};
  }
  const s = stats(range, metric), refused = refusalOf([s]); if (refused) return refused;
  const d = dataOf(s.result), when = span(range, env.habitDay), u = d.unit as string;
  const notes = (d.notes as string[]);
  if (metric === 'rate') return {kind: 'answer', text: lines(`${title} ${when}: ${d.valueText}.`, notes), calls: [s.record]};
  if (W.best.test(q) && !W.average.test(q) || W.worst.test(q)) {
    const pick = W.worst.test(q) ? d.lowest : d.best;
    return {kind: 'answer', text: pick ? `Your ${W.worst.test(q) ? 'lowest' : 'best'} ${title} day ${when} was ${dayText(pick.date, env.habitDay.slice(0, 4))} with ${n(pick.value, 2)} ${u}.` : `There is no ${title} check-in with a value ${when}.`, calls: [s.record]};
  }
  if (W.average.test(q)) {
    const per = d.averagePerCheckIn as string, perDay = d.averagePerDay as string;
    return {kind: 'answer', text: per === 'unknown' ? `There is no ${title} value to average ${when}.` : lines(`On average ${n(Number(per), 1)} ${u} per check-in for ${title} ${when}.`, [`Per calendar day: ${n(Number(perDay), 1)} ${u} over ${plural(d.days.inRange, 'day')}`, ...notes]), calls: [s.record]};
  }
  if (metric === 'minutes' && d.value === null) {
    const quantity = stats(range, 'quantity');
    return {kind: 'answer', text: `${title} isn't measured in time, so there are no minutes to add up. It's measured in ${unit || 'check-ins'}: ${quantity.result.ok ? valueOf(dataOf(quantity.result)) : 'unknown'} ${when}.`, calls: [s.record, quantity.record]};
  }
  const verb = metric === 'count' ? `You checked in ${title} ${plural(d.checkIns, 'time')}` : metric === 'minutes' || timed ? `You logged ${valueOf(d)} of ${title}` : `${title}: ${valueOf(d)}`;
  const several = range.from !== range.to;
  return {kind: 'answer', text: lines(`${verb} ${when}.`, [
    several && metric !== 'count' && `${plural(d.checkIns, 'check-in')} on ${plural(d.days.complete + d.days.partial, 'day')}; ${plural(d.days.scheduled, 'scheduled day')}`,
    several && metric === 'count' && `${plural(d.days.scheduled, 'scheduled day')} in this period`,
    several && d.best && metric !== 'count' && `Best day: ${dayText(d.best.date, env.habitDay.slice(0, 4))} (${n(d.best.value, 2)} ${u})`,
    ...notes,
  ]), calls: [s.record]};
}
function compareLine(a: number | null, b: number | null, unit: string, first: DayRange, second: DayRange): string | null {
  if (a === null || b === null) return 'One of the two periods has unknown values, so they are not compared.';
  const name = (r: DayRange, fallback: string) => /\d{4}-\d{2}-\d{2}/.test(r.label) ? fallback : r.label, diff = a - b;
  return diff === 0 ? 'The same in both periods.' : `${n(Math.abs(diff), 2)} ${unit} ${diff > 0 ? 'more' : 'less'} ${name(first, 'in the first period')} than ${name(second, 'in the second')}.`;
}
function defaultRange(today: string, label: 'today' | 'this month' | 'the last 7 days' | 'the last 30 days'): DayRange {
  const [y, m] = [today.slice(0, 4), today.slice(5, 7)];
  if (label === 'today') return {from: today, to: today, label};
  if (label === 'this month') return {from: `${y}-${m}-01`, to: today, label};
  const days = label === 'the last 7 days' ? 7 : 30, from = new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  return {from, to: today, label};
}
const clampYear = (range: DayRange, today: string): DayRange => { const earliest = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * 86_400_000).toISOString().slice(0, 10); return range.from < earliest ? {...range, from: earliest} : range; };

type HealthAnswer = (found: DayRange[]) => LocalReply;
function healthIntent(env: ToolEnv, q: string, habitNamed = false): HealthAnswer | null {
  // Session W Part 21: vitals and devices first ("active energy" is not food energy); sleep and meditation only when no
  // habit is named, so a habit called Meditate or Sleep early keeps answering for itself.
  if (W_HEALTH.vitals.test(q)) return found => vitalsAnswer(env, found);
  if (W_HEALTH.devices.test(q)) return () => devicesAnswer(env);
  if (!habitNamed && W_HEALTH.sleep.test(q)) return found => sleepAnswer(env, q, found);
  if (!habitNamed && W_HEALTH.meditation.test(q)) return found => meditationAnswer(env, found);
  const nutrient = NUTRIENT_WORDS.find(([re]) => re.test(q))?.[1];
  const counterNames = env.health ? exerciseData(env.health).counters.map(c => c.name) : [];
  const counter = counterNames.find(name => new RegExp(`\\b${normalise(name).replace(/ /g, '[ -]?')}\\b`).test(normalise(q)));
  if (nutrient) return found => nutrientAnswer(env, q, nutrient, found);
  if (HEALTH.water.test(q)) return found => waterAnswer(env, q, found);
  if (HEALTH.active.test(q) || HEALTH.steps.test(q)) return found => stepsAnswer(env, q, found);
  if (counter || HEALTH.counter.test(q)) return found => counterAnswer(env, q, counter ?? null, found);
  if (HEALTH.fasting.test(q)) return found => fastingAnswer(env, found);
  if (HEALTH.weight.test(q)) return found => weightAnswer(env, found);
  if (HEALTH.measurement.test(q)) return found => measurementAnswer(env, q, found);
  if (HEALTH.diary.test(q)) return found => diaryAnswer(env, found);
  return null;
}
function nutrientAnswer(env: ToolEnv, q: string, nutrient: NutrientName, found: DayRange[]): LocalReply {
  const {label, unit} = NUTRIENTS[nutrient], target = W.target.test(q);
  const range = found[0] ?? defaultRange(env.healthDay, target ? 'the last 7 days' : 'today');
  const r = call(env, 'nutrient_totals', {range: rangeArg(range), nutrient}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span({...range, label: range.label}, env.healthDay);
  if (target) {
    const goal = (d.yourTargets as Record<string, string> | string);
    if (typeof goal === 'string' || !goal[nutrient]) return {kind: 'answer', text: `You haven't set a daily ${label} target in Health, so there is nothing to compare. ${capital(label)} ${when}: ${d.overall[nutrient]}.`, calls: [r.record]};
    const rows = d.perDay as Record<string, unknown>[], key = `${nutrient}_vs_your_target`;
    const at = rows.filter(row => row[key] === 'at or above your target').length, below = rows.filter(row => row[key] === 'below your target').length, unknown = rows.filter(row => typeof row[key] === 'string' && (row[key] as string).startsWith('unknown')).length;
    const without = (d.daysInRange as number) - rows.length;
    return {kind: 'answer', text: lines(`Your ${label} target is ${goal[nutrient]}. ${capital(when)}:`, [`At or above it on ${plural(at, 'day')}`, below > 0 && `Below it on ${plural(below, 'day')}`, unknown > 0 && `Unknown on ${plural(unknown, 'day')} (some entries don't say how much ${label} they have)`, without > 0 && `${plural(without, 'day')} without diary entries`]), calls: [r.record]};
  }
  if (W.average.test(q)) {
    const rows = (d.perDay as Record<string, string>[]).map(row => row[nutrient]!).filter(v => /^\d/.test(v)), known = rows.map(v => Number(v.replace(/[^\d.]/g, '')));
    return {kind: 'answer', text: rows.length ? lines(`On average ${n(known.reduce((s, v) => s + v, 0) / known.length, 1)} ${unit} of ${label} a day ${when}, over the ${plural(known.length, 'day')} whose entries all say.`, [(d.daysWithEntries as number) > known.length && `${plural((d.daysWithEntries as number) - known.length, 'day')} with an unknown amount ${(d.daysWithEntries as number) - known.length === 1 ? 'is' : 'are'} not counted`]) : `No day ${when} has a complete ${label} total.`, calls: [r.record]};
  }
  return {kind: 'answer', text: `${capital(label)} ${when}: ${d.overall[nutrient]}${d.entries ? ` from ${plural(d.entries, 'diary entry', 'diary entries')}` : ''}.`, calls: [r.record]};
}
const capital = (s: string) => `${s[0]!.toUpperCase()}${s.slice(1)}`;
function waterAnswer(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  const target = W.target.test(q), average = W.average.test(q);
  const range = found[0] ?? defaultRange(env.healthDay, target || average ? 'the last 7 days' : 'today');
  if (W.compare.test(q) || found.length > 1) {
    const other = found[1] ?? previousRange(range, env.healthDay);
    const a = call(env, 'water', {range: rangeArg(range)}), b = call(env, 'water', {range: rangeArg(other)}), refused = refusalOf([a, b]); if (refused) return refused;
    const ma = Number(dataOf(a.result).totalMl), mb = Number(dataOf(b.result).totalMl);
    return {kind: 'answer', text: lines(`Water: ${n(ma, 0)} mL ${span(range, env.healthDay)}, and ${n(mb, 0)} mL ${span(other, env.healthDay)}.`, [compareLine(ma, mb, 'mL', range, other)]), calls: [a.record, b.record]};
  }
  const r = call(env, 'water', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span(range, env.healthDay), total = Number(d.totalMl), days = d.daysInRange as number;
  const flOz = d.totalFlOz ? ` (${d.totalFlOz} US fl oz)` : '';
  if (target && typeof d.yourDailyTargetMl === 'number') return {kind: 'answer', text: lines(`Your daily water target is ${n(d.yourDailyTargetMl, 0)} mL. ${capital(when)}:`, [`Reached on ${plural(d.daysAtOrAboveTarget, 'day')}`, `${plural(d.daysWithWater - d.daysAtOrAboveTarget, 'day')} with less`, days - d.daysWithWater > 0 && `${plural(days - d.daysWithWater, 'day')} without water logged`]), calls: [r.record]};
  if (target) return {kind: 'answer', text: `You haven't set a daily water target in Health. You logged ${n(total, 0)} mL ${when}${flOz}.`, calls: [r.record]};
  if (average || days > 1) return {kind: 'answer', text: lines(`You logged ${n(total, 0)} mL of water ${when}${flOz}.`, [days > 1 && d.daysWithWater > 0 && `On average ${n(total / d.daysWithWater, 0)} mL on the ${plural(d.daysWithWater, 'day')} with water logged`, days > d.daysWithWater && `${plural(days - d.daysWithWater, 'day')} without water logged (not counted as 0)`]), calls: [r.record]};
  return {kind: 'answer', text: d.daysWithWater ? `You logged ${n(total, 0)} mL of water ${when}${flOz}.` : `No water is logged ${when}.`, calls: [r.record]};
}
function stepsAnswer(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  const active = HEALTH.active.test(q), average = W.average.test(q), target = W.target.test(q) && !active;
  const range = found[0] ?? defaultRange(env.healthDay, average || target ? 'the last 7 days' : 'today');
  const what = active ? 'active minutes' : 'steps', field = active ? 'activeMinutes' : 'steps', totalField = active ? 'totalActiveMinutes' : 'totalSteps';
  if (W.compare.test(q) || found.length > 1) {
    const other = found[1] ?? previousRange(range, env.healthDay);
    const a = call(env, 'steps', {range: rangeArg(range)}), b = call(env, 'steps', {range: rangeArg(other)}), refused = refusalOf([a, b]); if (refused) return refused;
    const ta = dataOf(a.result)[totalField] as number, tb = dataOf(b.result)[totalField] as number;
    return {kind: 'answer', text: lines(`${capital(what)}: ${n(ta, 0)} ${span(range, env.healthDay)}, and ${n(tb, 0)} ${span(other, env.healthDay)}.`, [compareLine(ta, tb, what, range, other)]), calls: [a.record, b.record]};
  }
  const r = call(env, 'steps', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span(range, env.healthDay), recorded = d.daysWithActivity as number, total = d[totalField] as number;
  const rows = d.perDay as Record<string, number | string>[];
  if (!recorded) return {kind: 'answer', text: `No ${what} are recorded ${when}.`, calls: [r.record]};
  if (target && typeof d.yourDailyStepTarget === 'number') return {kind: 'answer', text: lines(`Your daily step target is ${n(d.yourDailyStepTarget, 0)}. ${capital(when)}:`, [`Reached on ${plural(d.daysAtOrAboveTarget, 'day')}`, `${plural(recorded - d.daysAtOrAboveTarget, 'day')} with fewer steps`, (d.daysInRange as number) > recorded && `${plural((d.daysInRange as number) - recorded, 'day')} without steps recorded`]), calls: [r.record]};
  if (W.best.test(q) || W.worst.test(q)) {
    const sorted = [...rows].sort((a, b) => (b[field] as number) - (a[field] as number) || String(a.date).localeCompare(String(b.date)));
    const pick = W.worst.test(q) ? sorted.at(-1)! : sorted[0]!;
    return {kind: 'answer', text: `Your ${W.worst.test(q) ? 'lowest' : 'best'} day for ${what} ${when} was ${dayText(String(pick.date), env.healthDay.slice(0, 4))} with ${n(pick[field] as number, 0)} ${what}.`, calls: [r.record]};
  }
  if (average || (d.daysInRange as number) > 1) return {kind: 'answer', text: lines(`You averaged ${n(total / recorded, 0)} ${what} a day ${when}, over the ${plural(recorded, 'day')} with ${what} recorded.`, [`Total: ${n(total, 0)} ${what}`, (d.daysInRange as number) > recorded && `${plural((d.daysInRange as number) - recorded, 'day')} without ${what} recorded ${(d.daysInRange as number) - recorded === 1 ? 'is' : 'are'} not counted as 0`]), calls: [r.record]};
  return {kind: 'answer', text: `You logged ${n(total, 0)} ${what} ${when}.`, calls: [r.record]};
}
function counterAnswer(env: ToolEnv, q: string, name: string | null, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.healthDay, 'today');
  const r = call(env, 'counters', {range: rangeArg(range), ...(name ? {counter: name} : {})}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span(range, env.healthDay), list = d.counters as {counter: string; total: number; daysWithEntry: number}[];
  const shown = name ? list : list.filter(c => new RegExp(`\\b${normalise(c.counter).split(' ')[0]!.replace(/s$/, '')}`).test(normalise(q)));
  const items = shown.length ? shown : list;
  return {kind: 'answer', text: items.length === 1 ? `${items[0]!.counter}: ${n(items[0]!.total, 0)} ${items[0]!.daysWithEntry ? `on ${plural(items[0]!.daysWithEntry, 'day')} ` : ''}${when}.` : lines(`Your exercise counters ${when}:`, items.map(c => `${c.counter}: ${n(c.total, 0)}${c.daysWithEntry ? ` on ${plural(c.daysWithEntry, 'day')}` : ''}`)), calls: [r.record]};
}
function fastingAnswer(env: ToolEnv, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.healthDay, 'the last 30 days');
  const r = call(env, 'fasting', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), fasts = d.fasts as {day: string; hours: string; targetHours: number}[], when = span(range, env.healthDay);
  const head = d.running !== 'no fast running' ? `A fast is running: ${d.running}.` : fasts.length ? `Your last fast: ${fasts[0]!.hours} h on ${dayText(fasts[0]!.day, env.healthDay.slice(0, 4))} (target ${fasts[0]!.targetHours} h).` : `No fast is recorded ${when}.`;
  return {kind: 'answer', text: lines(head, [fasts.length > 1 && `${plural(fasts.length, 'fast')} recorded ${when}; Health lists them all`, 'ZIGoals keeps no fasting totals or streaks, by design.', d.safety]), calls: [r.record]};
}
function weightAnswer(env: ToolEnv, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.healthDay, 'the last 30 days');
  const r = call(env, 'weight', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), readings = d.readings as {date: string; weight: string}[], when = span(range, env.healthDay);
  if (!readings.length) return {kind: 'answer', text: `No weight is recorded ${when}.`, calls: [r.record]};
  const first = readings[0]!, last = readings.at(-1)!, year = env.healthDay.slice(0, 4), change = /^([+-][\d.]+ (?:kg|lb))/.exec(String(d.change))?.[1];
  return {kind: 'answer', text: lines(`Your latest weight is ${last.weight}, on ${dayText(last.date, year)}.`, [readings.length > 1 && change && `Change from ${dayText(first.date, year)} to ${dayText(last.date, year)}: ${change}`, `${plural(d.count, 'reading')} ${when}`]), calls: [r.record]};
}
function measurementAnswer(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  const kind = (['waist', 'hips', 'chest', 'thigh', 'arm'] as const).find(k => new RegExp(`\\b${k}s?\\b`).test(q));
  const range = found[0] ?? {...defaultRange(env.healthDay, 'the last 30 days'), from: new Date(Date.parse(`${env.healthDay}T00:00:00Z`) - 89 * 86_400_000).toISOString().slice(0, 10), label: 'the last 90 days'};
  const r = call(env, 'body_measurements', {range: rangeArg(range), ...(kind ? {kind} : {})}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span(range, env.healthDay);
  if (typeof d.perKind === 'string') return {kind: 'answer', text: `No body measurements are recorded ${when}.`, calls: [r.record]};
  return {kind: 'answer', text: lines(`Your body measurements ${when}:`, Object.entries(d.perKind as Record<string, {latest: string; changeCm: string}>).map(([k, v]) => `${capital(k)}: ${v.latest}${v.changeCm !== 'unknown: one reading' ? `, change ${v.changeCm.startsWith('-') ? '' : '+'}${v.changeCm} cm` : ''}`)), calls: [r.record]};
}
function diaryAnswer(env: ToolEnv, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.healthDay, 'today');
  const r = call(env, 'diary_entries', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), entries = d.entries as {date: string; meal: string; item: string; servings: string; kcal: number | string}[], when = span(range, env.healthDay);
  if (!entries.length) return {kind: 'answer', text: `Nothing is logged in your food diary ${when}.`, calls: [r.record]};
  const multi = range.from !== range.to;
  return {kind: 'answer', text: lines(`You logged ${plural(d.count, 'item')} ${when}:`, [...entries.slice(0, 12).map(e => `${multi ? `${dayText(e.date, env.healthDay.slice(0, 4))}, ` : ''}${e.meal}: ${e.item} (${e.servings} ${e.servings === '1' ? 'serving' : 'servings'}, ${typeof e.kcal === 'number' ? `${n(e.kcal, 0)} kcal` : 'kcal unknown'})`), entries.length > 12 && `${plural(entries.length - 12, 'more item')} in Health`]), calls: [r.record]};
}
function mentionedGoals(env: ToolEnv, q: string) {
  const all = summaries(env).filter(g => g.status !== 'closed'), stems = words(q).map(stem);
  const scored = all.map(goal => { const t = tokens(goal.name).map(stem).filter(x => x.length >= 3); return {goal, hits: t.filter(x => stems.some(w => close(w, x))).length, size: t.length}; }).filter(s => s.hits > 0);
  if (!scored.length) return [];
  const best = Math.max(...scored.map(s => s.hits / Math.max(s.size, 1)));
  return scored.filter(s => s.hits / Math.max(s.size, 1) === best).map(s => s.goal);
}
function goalProgress(env: ToolEnv, key: string, q: string): LocalReply {
  const goal = summaries(env).find(g => g.key === key);
  if (!goal) return {kind: 'refusal', text: 'That goal is no longer on this device.', calls: []};
  const r = call(env, 'goal_progress', {goal: clean(goal.name, 120)}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), name = clean(goal.name, 60);
  if (goal.progressBound === 'unavailable') return {kind: 'answer', text: lines(`${name}: its value is unknown, so progress can't be worked out.`, [d.valuation, d.now && `Held now: ${d.now}`]), calls: [r.record]};
  const money = (s: string) => s.replace(/^(-?\d+(?:\.\d+)?) ([A-Za-z]+)$/, (_m, v: string, c: string) => amount(v, c));
  const remaining = /\b(left|remaining|to go|how much more|still need)\b/.test(q);
  const head = remaining ? `${name}: ${money(d.remaining)} to go (${d.progress} of the target reached).` : `${name}: ${d.progress} of the target — ${money(d.now)} of ${money(d.target)}.`;
  const plan = typeof d.plan === 'object' ? d.plan as {contributedNet: string; plannedThroughToday: string; nextDate: string} : null;
  return {kind: 'answer', text: lines(head, [!remaining && d.remaining !== 'unknown' && `${money(d.remaining)} to go`, d.targetDate !== 'none' && `Target date: ${dayText(d.targetDate, env.habitDay.slice(0, 4))}`, d.nextPlannedDate !== 'none' && `Next planned contribution: ${dayText(d.nextPlannedDate, env.habitDay.slice(0, 4))}`, plan && `Contributed so far: ${money(plan.contributedNet)}; planned through today: ${money(plan.plannedThroughToday)}`, goal.progressBound === 'at-least' && 'Some sources have no value yet, so progress is at least this', d.needsReview && 'Some of its values need a look in Goals']), calls: [r.record]};
}
function contributions(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.habitDay, 'this month'), goals = mentionedGoals(env, q);
  const r = call(env, 'goal_contributions', {range: rangeArg(range), ...(goals.length === 1 ? {goal: clean(goals[0]!.name, 120)} : {})}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), when = span(range, env.habitDay);
  if (typeof d.totalsPerAsset === 'string') return {kind: 'answer', text: `No contributions are recorded ${when}${goals.length === 1 ? ` for ${clean(goals[0]!.name, 60)}` : ''}.`, calls: [r.record]};
  const totals = d.totalsPerAsset as {asset: string; contributed: string; withdrawn: string; net: string; recordedIncome?: string}[];
  const line = (t: (typeof totals)[number]) => [t.contributed !== '0' && `${amount(t.contributed, t.asset)} in`, t.withdrawn !== '0' && `${amount(t.withdrawn, t.asset)} out (net ${amount(t.net, t.asset)})`, t.recordedIncome && `recorded income ${amount(t.recordedIncome, t.asset)}`].filter(Boolean).join(', ');
  return {kind: 'answer', text: lines(`Contributions ${goals.length === 1 ? `to ${clean(goals[0]!.name, 60)} ` : ''}${when}, per currency (never converted):`, totals.map(t => line(t) || `${t.asset}: nothing in or out`)), calls: [r.record]};
}
function mentionedAsset(env: ToolEnv, q: string): string | null {
  const symbols = [...new Set(env.platform.positions.filter(p => !p.archivedAt).map(p => p.asset.toUpperCase()))];
  for (const [name, symbol] of Object.entries(ASSET_NAMES)) if (new RegExp(`\\b${name}\\b`).test(q) && symbols.includes(symbol)) return symbol;
  return symbols.find(s => s.length >= 2 && new RegExp(`\\b${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(q)) ?? null;
}
function holding(env: ToolEnv, asset: string): LocalReply {
  const r = call(env, 'holdings', {asset}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), rows = d.holdings as {quantity: string; value: string; priceSource: string; valuedAt: string}[];
  if (!rows.length) return {kind: 'answer', text: `You don't track any ${asset} in Wealth.`, calls: [r.record]};
  const quantity = rows.reduce((s, row) => s.plus(/^\d+(\.\d+)?$/.test(row.quantity) ? row.quantity : 0), new Decimal(0)).toFixed();
  const values = new Map<string, Decimal>();
  for (const row of rows) { const m = /^(-?\d+\.\d{2}) ([A-Z]{3,10})$/.exec(row.value); if (m) values.set(m[2]!, (values.get(m[2]!) ?? new Decimal(0)).plus(m[1]!)); }
  const unpriced = rows.filter(row => row.value === 'no price').length, sources = [...new Set(rows.filter(row => row.value !== 'no price').map(row => `${row.priceSource}, ${row.valuedAt === 'unknown' ? 'time unknown' : `observed ${instantText(row.valuedAt, env.habitDay)}`}`))];
  const worth = values.size ? `worth ${[...values].map(([c, v]) => amount(v.toFixed(2), c)).join(' and ')}` : 'with no price, so no value';
  const calls = [r.record];
  const extra: string[] = [];
  if (env.portfolio) {
    const p = call(env, 'portfolios', {}); calls.push(p.record);
    // Portfolio is named apart from Wealth; a hypothetical portfolio holds nothing, so it is never counted as holding.
    if (p.result.ok) for (const pf of dataOf(p.result).portfolios as {portfolio: string; kind: string; coins?: {coin: string; quantity: string}[]}[]) { const coin = pf.coins?.find(c => c.coin.toUpperCase() === asset); if (coin && pf.kind === 'Real') extra.push(`Portfolio (separate from Wealth): ${grouped(coin.quantity)} ${asset} in your Real portfolio ${pf.portfolio}`); }
  }
  return {kind: 'answer', text: lines(`You hold ${grouped(quantity)} ${asset} in Wealth (${plural(rows.length, 'holding')}), ${worth}.`, [sources.length > 0 && `Prices: ${sources.join('; ')}`, unpriced > 0 && values.size > 0 && `${plural(unpriced, 'holding')} without a price ${unpriced === 1 ? 'is' : 'are'} not counted in the value`, values.size > 1 && 'One total per currency, never converted', ...extra]), calls};
}
/** "2430.00 USD" as a local answer writes money: "2,430.00 USD". */
const money = (text: string) => { const i = text.lastIndexOf(' '); return i > 0 ? amount(text.slice(0, i), text.slice(i + 1)) : text; };
/** Session W Part 21: with accounts and debts on this device, net worth per currency joins the wealth answer. */
function netWorthLine(env: ToolEnv): {line: string | null; record: ToolCallRecord | null} {
  if (!(env.accounts?.items ?? []).some(a => !a.archivedAt)) return {line: null, record: null};
  const w = call(env, 'net_worth', {});
  if (!w.result.ok) return {line: null, record: w.record};
  const rows = dataOf(w.result).perCurrency as {netWorth: string; assets: string; debts: string; holdingsWithAValue: string}[];
  const parts = (r: (typeof rows)[number]) => ([['accounts', r.assets], ['holdings with a value', r.holdingsWithAValue], ['debts', r.debts]] as const).filter(([, v]) => !/^0(?:\.0+)? /.test(v)).map(([k, v]) => `${k} ${money(v)}`).join(', ');
  return {line: rows.length ? `With your accounts and debts, your net worth is ${rows.map(r => `${money(r.netWorth)} (${parts(r) || 'nothing recorded'})`).join(' and ')}, never converted between currencies` : null, record: w.record};
}
function wealthTotal(env: ToolEnv): LocalReply {
  const r = call(env, 'totals_per_currency', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), totals = d.totals as {currency: string; total: string}[], worth = netWorthLine(env), extra = worth.record ? [worth.record] : [];
  if (!totals.length) return {kind: 'answer', text: lines(d.holdings ? 'None of your tracked holdings has a price, so there is no total.' : 'No holdings are tracked in Wealth yet.', [worth.line]), calls: [r.record, ...extra]};
  const observed = (text: string) => { const [a, b] = text.split(' to '); return !a || a === 'unknown' ? 'time unknown' : b && b !== a ? `observed from ${instantText(a, env.habitDay)} to ${instantText(b, env.habitDay)}` : `observed ${instantText(a, env.habitDay)}`; };
  return {kind: 'answer', text: lines(`Your tracked wealth, one total per currency (never converted): ${totals.map(t => amount(t.total, t.currency)).join(' and ')}.`, [d.withoutPrice > 0 && `${plural(d.withoutPrice, 'holding')} without a price ${d.withoutPrice === 1 ? 'is' : 'are'} not counted`, ...(d.prices as {source: string; observed: string}[]).map(p => `Values from ${p.source}, ${observed(p.observed)}`), worth.line]), calls: [r.record, ...extra]};
}

// ---- Session W Part 21 (W7): answers from the new tools, in the same plain words; unknown stays unknown, no advice ----
function sleepAnswer(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  if (W_HEALTH.debt.test(q) || W_HEALTH.steady.test(q)) {
    const r = call(env, 'sleep_summary', {}), refused = refusalOf([r]); if (refused) return refused;
    const d = dataOf(r.result), debt = d.sleepDebt, steady = d.bedtimeConsistency;
    return {kind: 'answer', text: lines(W_HEALTH.debt.test(q) ? (typeof debt === 'object' ? `Over the last 7 days your sleep came to ${debt.total}, across ${plural(debt.nights, 'logged night')} (your goal minus the time asleep, night by night).` : `Sleep debt ${debt === 'no night logged in the last 7 days' ? 'needs a logged night in the last 7 days' : 'needs your own sleep goal, in Health → Sleep'}.`)
      : typeof steady === 'object' ? `Your bedtimes over the last 14 days vary by about ${steady.spread} (the standard deviation of ${plural(steady.nights, 'night')}).` : 'Bedtime consistency needs at least 4 logged nights in the last 14 days.', [typeof d.yourGoal === 'string' && d.yourGoal !== 'none set' && `Your goal: ${d.yourGoal}`]), calls: [r.record]};
  }
  if (W_HEALTH.lastNight.test(q)) {
    const r = call(env, 'sleep_nights', {range: 'today'}), refused = refusalOf([r]); if (refused) return refused;
    const night = (dataOf(r.result).nights as {woke: string; bedtime: string; wake: string; inBed: string; asleep: string; quality: number | string}[]).at(-1);
    return {kind: 'answer', text: night ? lines(`Last night: ${night.asleep} asleep, ${night.inBed} in bed, from ${night.bedtime} to ${night.wake}.`, [typeof night.quality === 'number' && `You rated it ${night.quality} of 5`]) : 'No night is logged that ended today.', calls: [r.record]};
  }
  if (found[0]) {
    const range = found[0], r = call(env, 'sleep_nights', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
    const nights = dataOf(r.result).nights as {woke: string; asleep: string; bedtime: string; wake: string}[], when = span(range, env.healthDay);
    if (!nights.length) return {kind: 'answer', text: `No night is logged ${when}.`, calls: [r.record]};
    return {kind: 'answer', text: lines(`${capital(plural(nights.length, 'night'))} logged ${when}:`, nights.slice(-7).map(x => `${dayText(x.woke, env.healthDay.slice(0, 4))}: ${x.asleep} asleep, ${x.bedtime} to ${x.wake}`)), calls: [r.record]};
  }
  const r = call(env, 'sleep_summary', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), week = d.last7Days;
  if (typeof week === 'string') return {kind: 'answer', text: 'No night is logged in the last 7 days.', calls: [r.record]};
  return {kind: 'answer', text: lines(`Over the last 7 days: ${plural(week.nightsLogged, 'night')} logged, ${week.averageAsleep} asleep on average, usually from ${week.usualBedtime} to ${week.usualWake}.`, [d.yourGoal !== 'none set' && `Your goal: ${d.yourGoal}`]), calls: [r.record]};
}
function meditationAnswer(env: ToolEnv, found: DayRange[]): LocalReply {
  if (found[0]) {
    const range = found[0], r = call(env, 'meditation_sessions', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
    const d = dataOf(r.result), when = span(range, env.healthDay);
    return {kind: 'answer', text: d.count ? `${d.totalMinutes} min of meditation ${when}, over ${plural(d.count, 'session')}.` : `No meditation session is logged ${when}.`, calls: [r.record]};
  }
  const r = call(env, 'meditation_summary', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result);
  if (!d.sessions) return {kind: 'answer', text: 'No meditation session is logged yet.', calls: [r.record]};
  return {kind: 'answer', text: lines(`This week: ${d.thisWeek} of meditation${d.yourWeeklyGoal !== 'none set' ? ` (your goal: ${d.yourWeeklyGoal} a week)` : ''}.`, [`${plural(d.sessions, 'session')} in all, ${d.totalMinutes}`, d.daysInARow > 1 && `${d.daysInARow} days in a row`]), calls: [r.record]};
}
function vitalsAnswer(env: ToolEnv, found: DayRange[]): LocalReply {
  const range = found[0] ?? defaultRange(env.healthDay, 'the last 7 days'), r = call(env, 'vitals', {range: rangeArg(range)}), refused = refusalOf([r]); if (refused) return refused;
  const days = dataOf(r.result).days as {date: string; source: string; restingHeartRateBpm?: number; activeKcal?: number}[], when = span(range, env.healthDay);
  if (!days.length) return {kind: 'answer', text: `No vitals are recorded ${when}; they arrive with an import or a linked device.`, calls: [r.record]};
  const resting = days.filter(x => x.restingHeartRateBpm !== undefined).at(-1), active = days.filter(x => x.activeKcal !== undefined).at(-1);
  return {kind: 'answer', text: lines(`${capital(plural(days.length, 'day'))} of vitals ${when}.`, [resting && `Resting heart rate on ${dayText(resting.date, env.healthDay.slice(0, 4))}: ${resting.restingHeartRateBpm} bpm (${resting.source})`, active && `Active energy on ${dayText(active.date, env.healthDay.slice(0, 4))}: ${active.activeKcal} kcal (${active.source})`]), calls: [r.record]};
}
function devicesAnswer(env: ToolEnv): LocalReply {
  const r = call(env, 'devices', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), sources = d.sources as {source: string}[];
  return {kind: 'answer', text: sources.length ? lines('Your Health records came from these besides your own entries:', sources.map(s => s.source)) : d.note, calls: [r.record]};
}
function accountsAnswer(env: ToolEnv, q: string): LocalReply {
  const r = call(env, 'accounts', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), accounts = d.accounts as {name: string; debt: boolean; currency: string; latest: string; asOf?: string}[];
  if (!accounts.length) return {kind: 'answer', text: d.note, calls: [r.record]};
  const row = (a: (typeof accounts)[number]) => `${a.name}: ${a.asOf ? `${money(a.latest)}${a.debt ? ' owed' : ''} on ${dayText(a.asOf, env.habitDay.slice(0, 4))}` : a.latest}`;
  const owned = accounts.filter(a => !a.debt), owed = accounts.filter(a => a.debt);
  // "What do I owe?": the debts' latest balances, one total per currency; a debt without a balance is named, never zero.
  if (/\b(owe|debts?|loans?|mortgage|credit cards?)\b/.test(q) && !/\baccounts?\b/.test(q)) {
    if (!owed.length) return {kind: 'answer', text: 'No debts are kept in Wealth\'s accounts on this device.', calls: [r.record]};
    const totals = new Map<string, {sum: Decimal; places: number}>();
    for (const a of owed) if (a.asOf) { const value = a.latest.split(' ')[0]!, t = totals.get(a.currency); totals.set(a.currency, {sum: (t?.sum ?? new Decimal(0)).plus(value), places: Math.max(t?.places ?? 0, (value.split('.')[1] ?? '').length)}); }
    const unknown = owed.filter(a => !a.asOf).length, sum = [...totals].sort(([x], [y]) => x.localeCompare(y)).map(([c, t]) => amount(t.sum.toFixed(t.places), c)).join(' and ');
    return {kind: 'answer', text: lines(totals.size ? `You owe ${sum} across ${plural(owed.length - unknown, 'debt')}, as entered on this device:` : 'None of your debts has a balance entered yet:', [...owed.map(row), unknown > 0 && totals.size > 0 && `${plural(unknown, 'debt')} without a balance ${unknown === 1 ? 'is' : 'are'} not counted`, totals.size > 1 && 'One total per currency, never converted']), calls: [r.record]};
  }
  return {kind: 'answer', text: lines(`Your accounts and debts on this device (${plural(accounts.length, 'account')}):`, [...owned.map(row), ...owed.map(row), 'Each in its own currency, never converted']), calls: [r.record]};
}
function chessAnswer(env: ToolEnv, q: string, found: DayRange[]): LocalReply {
  const r = call(env, 'chess_ratings', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), ratings = d.ratings as {site: string; control: string; rating: number; readOn: string}[], goals = d.yourGoals as {site: string; control: string; yourTarget: number; left?: number; reached: boolean}[];
  if (CHESS_GAMES.test(q)) {
    const range = found[0] ?? defaultRange(env.habitDay, 'the last 30 days'), g = call(env, 'chess_games', {range: rangeArg(range)}), gr = refusalOf([r, g]); if (gr) return gr;
    const gd = dataOf(g.result), t = gd.results.total as {win: number; draw: number; loss: number}, when = span(range, env.habitDay);
    return {kind: 'answer', text: gd.count ? `${capital(plural(gd.count, 'game'))} ${when}, as the sites list them: ${plural(t.win, 'win')}, ${plural(t.draw, 'draw')}, ${plural(t.loss, 'loss', 'losses')}.` : `No game ${when}, as far as this device last read.`, calls: [r.record, g.record]};
  }
  if (!ratings.length) return {kind: 'answer', text: d.note, calls: [r.record]};
  return {kind: 'answer', text: lines(`Your ratings, as the sites published them: ${ratings.map(x => `${x.site} ${x.control} ${x.rating}`).join(', ')}.`, goals.map(x => `Your goal ${x.site} ${x.control} ${x.yourTarget}: ${x.reached ? 'reached' : x.left !== undefined ? `${x.left} to go` : 'no rating yet'}`)), calls: [r.record]};
}
function linksAnswer(env: ToolEnv): LocalReply {
  const r = call(env, 'links_count', {}), refused = refusalOf([r]); if (refused) return refused;
  const count = dataOf(r.result).count as number;
  return {kind: 'answer', text: count ? `You keep ${plural(count, 'link')} in My links (Settings → My links).` : 'No links in My links yet (Settings → My links).', calls: [r.record]};
}
function challengesAnswer(env: ToolEnv): LocalReply {
  const r = call(env, 'challenges', {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), rows = d.challenges as {habit: string; today: string; doneSoFar: string; ends: string}[];
  if (!rows.length) return {kind: 'answer', text: d.note, calls: [r.record]};
  return {kind: 'answer', text: lines(`${capital(plural(rows.length, 'challenge'))} running:`, rows.map(x => `${x.habit}: ${x.today}${x.doneSoFar.startsWith('0 of 0 ') ? '' : `, ${x.doneSoFar} done so far`} (until ${dayText(x.ends, env.habitDay.slice(0, 4))})`)), calls: [r.record]};
}
/** Every portfolio with its value in its own currency; nothing is added across currencies (the tool's own rule). */
function portfolioAnswer(env: ToolEnv): LocalReply {
  const r = call(env, 'portfolios', {}), refused = refusalOf([r]); if (refused) return refused;
  const rows = dataOf(r.result).portfolios as {portfolio: string; kind: string; currency: string; value?: string; note?: string}[];
  if (!rows.length) return {kind: 'answer', text: 'No portfolio yet; Wealth → Portfolio makes one.', calls: [r.record]};
  const worth = (p: (typeof rows)[number]) => p.note ? p.note : !p.value || p.value === '0' ? 'holds nothing' : p.value.startsWith('unknown') ? 'has no prices, so no value' : `is worth ${money(p.value.replace(/\s*\(.*\)$/, ''))}${/\(/.test(p.value) ? ` (${p.value.replace(/^[^(]*\(/, '').replace(/\)$/, '')})` : ''}`;
  return {kind: 'answer', text: lines('Your portfolios, each in its own currency and never added together:', rows.map(p => `${p.portfolio} (${p.kind}) ${worth(p)}`)), calls: [r.record]};
}
/** The longest streak across every active habit, from the habit engine's own figures (at most twelve lookups). */
function bestStreakAnswer(env: ToolEnv): LocalReply {
  const habits = env.habits.habits.filter(h => latestHabitRule(h).state === 'active').slice(0, 12);
  if (!habits.length) return NONE;
  const calls: ToolCallRecord[] = [], found: {title: string; best: number; current: number; unit: string}[] = [];
  for (const h of habits) {
    const s = call(env, 'habit_stats', {habit: clean(h.title, 60), metric: 'streak'}); calls.push(s.record);
    if (!s.result.ok) continue;
    const st = dataOf(s.result).streak as {current: number; best: number; unit: string};
    found.push({title: clean(h.title, 60), best: st.best, current: st.current, unit: st.unit.replace(/s$/, '')});
  }
  if (!found.length) return {kind: 'answer', text: 'No streak yet: the first check-in starts one.', calls};
  found.sort((a, b) => b.best - a.best);
  const top = found[0]!, rest = found.slice(1, 3).filter(f => f.best > 0);
  return {kind: 'answer', text: lines(`Your longest streak ever is ${plural(top.best, top.unit)}: ${top.title} (current ${plural(top.current, top.unit)}).`, rest.map(f => `${f.title}: longest ${plural(f.best, f.unit)}, current ${plural(f.current, f.unit)}`)), calls};
}
function milestonesAnswer(env: ToolEnv, q: string): LocalReply {
  const named = mentionedGoals(env, q), r = call(env, 'milestones', named.length === 1 ? {goal: clean(named[0]!.name, 120)} : {}), refused = refusalOf([r]); if (refused) return refused;
  const d = dataOf(r.result), goals = d.goals as {goal: string; done: number; total: number; milestones: {title: string; state: string; targetDate?: string}[]}[];
  if (!goals.length) return {kind: 'answer', text: d.note, calls: [r.record]};
  const next = (g: (typeof goals)[number]) => g.milestones.filter(m => m.state === 'open').slice(0, 3).map(m => `${m.title}${m.targetDate ? ` (by ${dayText(m.targetDate, env.habitDay.slice(0, 4))})` : ''}`);
  return {kind: 'answer', text: lines('Your milestones:', goals.map(g => `${g.goal}: ${g.done} of ${g.total} done${next(g).length ? `; next: ${next(g).join(', ')}` : ''}`)), calls: [r.record]};
}
