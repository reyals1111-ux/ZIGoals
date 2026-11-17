import {ASK_WORDS, DOMAIN_WORDS, GENERIC, HABIT_SYNONYMS, NOT_A_LOOKUP, SHAPE_WORDS, SHORT_WORDS, VOCABULARY} from './lexicon';
import {periodIn} from './period';
import {fixSlips, fold, langOf, root, sameWord} from './text';
import type {Ask, Domain, Query, QuerySubject, Shape} from './types';

/**
 * Session AS (ADR-042, Part 1): a question → a `Query`. Deterministic, on the device, English and Dutch, typos and
 * casual phrasing included. It reads four things: the part of life (a record's own name first: a habit, a goal, a
 * category), what is asked about it (missed, skipped, done, late, …), the shape of the answer (a count, a list, dates, an
 * amount) and the period. A question it does not read with confidence — no part of life, or neither an ask nor a shape —
 * is not claimed (null): the layers that were there before answer it, or NOVA says honestly that it cannot.
 */
export type Records = {
  today: string;
  habits: readonly {id: string; title: string; archived?: boolean}[];
  goals: readonly {id: string; name: string}[];
  categories: readonly string[];
  bills: readonly {id: string; title: string}[];
};
const HEALTH_MEASURES: ReadonlySet<Domain> = new Set(['water', 'steps', 'sleep', 'weight', 'calories', 'protein', 'meditation', 'workouts']);
/** Measures that are a quantity of their own ("how much water"), as against an activity a habit may be named after ("exercise", "meditate"). */
const QUANTITY: ReadonlySet<Domain> = new Set(['water', 'steps', 'sleep', 'weight', 'calories', 'protein']);
const FIGURE_ASKS: ReadonlySet<Ask> = new Set(['total', 'average', 'best', 'worst', 'trend', 'compare']);
const nameWords = (name: string) => fold(name).split(' ').filter(x => x.length >= 3 && !GENERIC.has(x));
/** The question's words, each with what it may stand for ("gemediteerd" → "meditate"). */
function expand(words: readonly string[]): string[] { return words.flatMap(word => [word, ...(HABIT_SYNONYMS[word] ?? [])]); }
/** How well a record's name is named by the words: 1 = every word of the name, 0 = none. A long name needs half its words. */
function nameScore(name: string, words: readonly string[]): number {
  const parts = nameWords(name);
  if (!parts.length) return 0;
  const hit = parts.filter(part => words.some(word => word === part || (word.length >= 4 && part.length >= 4 && sameWord(word, part)))).length;
  return hit === parts.length ? 1 : hit >= Math.ceil(parts.length / 2) && hit > 0 ? hit / parts.length : 0;
}
function bestNamed<T extends {id: string}>(items: readonly T[], nameOf: (item: T) => string, words: readonly string[]): {one: T | null; many: T[]} {
  const scored = items.map(item => ({item, score: nameScore(nameOf(item), words)})).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
  if (!scored.length) return {one: null, many: []};
  const top = scored.filter(s => s.score === scored[0]!.score);
  // Two names that fit equally: the one whose words are all in the question wins over a longer one; else it is a question back.
  return top.length === 1 ? {one: top[0]!.item, many: []} : {one: null, many: top.map(s => s.item)};
}
const first = <K,>(table: readonly [K, RegExp][], text: string): K | null => { for (const [key, re] of table) if (re.test(text)) return key; return null; };

function parse(folded: string, records: Records): Query | null {
  if (NOT_A_LOOKUP.action.test(folded) || NOT_A_LOOKUP.statement.test(folded) || NOT_A_LOOKUP.advice.test(folded) || NOT_A_LOOKUP.food.test(folded) || NOT_A_LOOKUP.other.test(folded) || NOT_A_LOOKUP.ahead.test(folded)) return null;
  const lang = langOf(folded), {token, versus, weekday, rest: left} = periodIn(folded, records.today), rest = left.replace(/\bwork(?:ed|ing)? out\b/g, 'workout').replace(/\bbij te dragen\b/g, 'bijdragen'), words = expand(rest.split(' '));
  const domains = DOMAIN_WORDS.filter(([, re]) => re.test(rest)).map(([d]) => d);
  const live = records.habits.filter(h => !h.archived), plainWords = rest.split(' ');
  // A habit named by its own words wins; one that fits only by a word people use for it ("workout" for Exercise) gives way to the part of life the words name.
  const direct = bestNamed(live, h => h.title, plainWords), loose = bestNamed(live, h => h.title, words), habits = direct.one || direct.many.length ? direct : loose, byName = habits === direct;
  // Every word of the habit's name is in the question ("did I drink water"), as against one of them ("water this week").
  const whole = byName && !!direct.one && nameScore(direct.one.title, plainWords) === 1;
  // A habit named by its own words lends none of them to what is asked ("Late-night snacks" is not late).
  const own = whole ? new Set(nameWords(direct.one!.title)) : null, asked = own ? plainWords.filter(word => !own.has(word)).join(' ') : rest;
  let ask = first(ASK_WORDS, asked);
  const shapeHit = first(SHAPE_WORDS, asked) ?? first(SHAPE_WORDS, rest);
  // "not" before a late-word is done on time; a negation beside a done-word is not done ("did I not reach", "no workout",
  // "niet gehaald"); skipped and missed in one breath is everything not done; two periods named is a comparison.
  if (ask === 'not-done' && /\b(?:not|niet|geen|never|nooit) (?:\w+ ){0,2}(?:late|overdue|te laat)\b/.test(asked)) ask = 'done';
  if ((ask === 'done' || ask === 'open' || ask === null) && /\b(?:not|no|didnt|dont|doesnt|wasnt|havent|never|niet|geen|nooit)\b/.test(asked) && !/\b(?:why not|waarom niet)\b/.test(asked)) ask = 'not-done';
  if ((ask === 'skipped' || ask === 'missed') && ASK_WORDS.find(([k]) => k === 'skipped')![1].test(asked) && ASK_WORDS.find(([k]) => k === 'missed')![1].test(asked)) ask = 'not-done';
  if (versus && ask !== 'why') ask = 'compare';
  const goals = bestNamed(records.goals, g => g.name, plainWords), wholeGoal = goals.one && nameWords(goals.one.name).length >= 2 && nameScore(goals.one.name, plainWords) === 1 ? goals.one : null;
  const category = records.categories.find(c => nameScore(c, plainWords) === 1) ?? null, bill = bestNamed(records.bills, b => b.title, plainWords).one;
  let domain: Domain | null = null, subject: QuerySubject | null = null, choices: QuerySubject[] | undefined, alt: QuerySubject | undefined;
  const measure = domains.find(d => HEALTH_MEASURES.has(d)) ?? null, figure = shapeHit === 'amount' || (ask !== null && FIGURE_ASKS.has(ask));
  const habitWord = domains.includes('habits');
  const other = domains.some(d => d === 'goals' || d === 'budgets' || d === 'bills' || d === 'spending' || d === 'tasks' || d === 'journal' || d === 'nova');
  // "My water goal", "enough water": the measure and its own target, not a habit that shares a word with it.
  const target = !!measure && /\b(?:goal|target|enough|doel|genoeg|te weinig|waterdoel|stappendoel|slaapdoel|eiwitdoel)\b/.test(rest);
  // A habit beats a measure the words also name when its whole name is there and no figure of that measure is asked.
  const habitWins = habitWord || (whole ? !(measure && QUANTITY.has(measure) && (figure || target)) : !measure);
  if (wholeGoal) { domain = 'goals'; subject = {kind: 'goal', id: wholeGoal.id, name: wholeGoal.name}; }
  else if ((habits.one || habits.many.length) && !other && habitWins) {
    domain = 'habits';
    if (habits.one) subject = {kind: 'habit', id: habits.one.id, name: habits.one.title};
    else choices = habits.many.map(h => ({kind: 'habit' as const, id: h.id, name: h.title}));
  } else if (domains.length) {
    // "my day"/"my week" beside a named part of life is that part ("how was my sleep this week" is sleep, not life).
    domain = domains.find(d => d !== 'life' && d !== 'health') ?? domains[0]!;
    if (HEALTH_MEASURES.has(domain) && habits.one) alt = {kind: 'habit', id: habits.one.id, name: habits.one.title};
    if (domain === 'goals' && goals.one) subject = {kind: 'goal', id: goals.one.id, name: goals.one.name};
    else if ((domain === 'spending' || domain === 'budgets') && category) subject = {kind: 'category', id: category, name: category};
    else if (domain === 'bills' && bill) subject = {kind: 'bill', id: bill.id, name: bill.title};
  } else if (goals.one && (ask || shapeHit)) { domain = 'goals'; subject = {kind: 'goal', id: goals.one.id, name: goals.one.name}; }
  // "Did I skip anything", "what did I miss": with no part of life named, a skipped or missed day is a habit's.
  if (!domain && (ask === 'skipped' || ask === 'missed') && /\b(?:anything|something|everything|what|iets|alles|wat)\b/.test(rest) && records.habits.length) domain = 'habits';
  // "What are my streaks": a run of days is a habit's.
  if (!domain && ask === 'streak' && records.habits.length) domain = 'habits';
  // Nothing kept yet and the words ask what was done or not on which days: the habits' own empty state.
  if (!domain && !records.habits.length && !records.goals.length && (ask === 'missed' || ask === 'not-done' || ask === 'skipped' || ((shapeHit === 'dates' || shapeHit === 'count') && (ask === 'done' || ask === null)))) domain = 'habits';
  if (!domain) return null;
  const phrase = domain === 'nova' || domain === 'life';
  // "Workouts last week?", "spending this week": a part of life and a period, nothing else, asks how it went.
  if (!ask && !shapeHit && !phrase && !(token && rest.split(' ').length <= 3)) return null;
  const shape: Shape = shapeHit ?? (ask === 'status' || phrase ? 'overview' : 'list');
  // With nothing asked about it: an amount is its total; "how many times" and "which days" of a habit or a log is what was done; else how it stands.
  if (!ask) ask = shape === 'amount' ? 'total' : phrase || shape === 'list' || shape === 'overview' ? 'status' : domain === 'habits' || HEALTH_MEASURES.has(domain) || domain === 'journal' || domain === 'focus' ? 'done' : 'status';
  return {domain, ask, shape, lang, period: token, versus, weekday, subject, ...(alt ? {alt} : {}), ...(choices ? {choices} : {}), read: folded};
}
/** The `Query` of a question, or null when it is not one the exact layer reads with confidence. */
export function understand(question: string, records: Records): Query | null {
  const folded = fold(question);
  if (!folded || folded.length > 300) return null;
  // A question that also asks for a change ("…, log it", "… and add a glass") is not a lookup: the commas are read as typed.
  if (NOT_A_LOOKUP.mixed.test(question.toLowerCase().replace(/\s+/g, ' '))) return null;
  // A misspelt word is set right against the layer's vocabulary and the person's own record names; the fixed reading
  // is used when it is understood, else the words as typed.
  const names = new Set<string>(VOCABULARY);
  for (const name of [...records.habits.map(h => h.title), ...records.goals.map(g => g.name), ...records.categories, ...records.bills.map(b => b.title)]) for (const part of nameWords(name)) { names.add(part); names.add(root(part)); }
  // Words of five letters or more are set right first; a four-letter word ("wgat") only when nothing else reads the question.
  const long = fixSlips(folded, names, 5), typed = long ?? folded;
  const first = parse(typed, records) ?? (long ? parse(folded, records) : null);
  if (first) return first;
  const short = fixSlips(typed, SHORT_WORDS, 4);
  return short ? parse(short, records) : null;
}
/**
 * Only the part of life a question names ("is my sleep good for my age?"): what the honest fallback shows when the
 * question itself is not one the records can answer. Never for an action, a line to log or another language.
 */
export function topicOf(question: string, _records: Records): Query | null {
  void _records;
  const folded = fold(question);
  if (!folded || folded.length > 300 || NOT_A_LOOKUP.action.test(folded) || NOT_A_LOOKUP.statement.test(folded) || NOT_A_LOOKUP.food.test(folded) || NOT_A_LOOKUP.other.test(folded) || NOT_A_LOOKUP.mixed.test(question.toLowerCase())) return null;
  const domain = DOMAIN_WORDS.find(([d, re]) => d !== 'nova' && d !== 'life' && re.test(folded))?.[0];
  return domain ? {domain, ask: 'status', shape: 'overview', lang: langOf(folded), period: null, versus: null, weekday: null, subject: null, read: folded} : null;
}
