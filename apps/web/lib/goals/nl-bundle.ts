import type {BuiltInArea} from '../goal-extras/store';
import {templateById} from '../templates/goal-library';
import {addDays, daysBetween} from '../goal-forecast';
import type {AutoSource} from '../auto-rules/schema';

/**
 * Session AK (6.1): a local parser for simple goal sentences ("I want a 6-month emergency fund of $15k and walk 8k steps
 * most days", "save €5,000 for a trip by June", "run a 10K by spring and train 3 times a week") → a PROPOSED bundle: a
 * goal, habits, and for a money goal with a date a suggested monthly amount. Nothing is created here: the review card
 * shows every part and hands only the parts the person confirms to the caller, which creates them through the existing
 * stores. Money is never moved; an amount is a pre-fill the person checks. Anything it does not recognise → null (ZIGi
 * handles it when connected). Words only in English for now; no network, no model.
 */
export type BundleGoal = {
  name: string; kind: 'value' | 'project';
  /** A money goal's target in major units (15000 for "$15k"), as typed; absent when none was named. */
  target?: number; currency?: string;
  /** The goal date (YYYY-MM-DD) and the words it came from ("June", "spring"); `approximate` for a season or a holiday. */
  date?: string; dateText?: string; approximate?: true;
  templateId?: string; milestones?: string[];
};
export type BundleHabit = {
  title: string;
  schedule: {kind: 'daily'} | {kind: 'frequency'; times: number; period: 'week'};
  measurement?: {kind: 'count' | 'duration' | 'quantity'; unit: string; target: number};
  /** An auto-complete rule the review card offers (lib/auto-rules): "When steps ≥ 8,000 → … is done". */
  autoRule?: {source: AutoSource; comparator: 'at-least' | 'recorded'; threshold?: number};
};
export type ContributionPlan = {perMonth: number; months: number; currency?: string; suggested: true};
export type GoalBundle = {goal: BundleGoal | null; habits: BundleHabit[]; contributionPlan?: ContributionPlan; lifeArea?: BuiltInArea};
export const MAX_BUNDLE_TEXT = 500;

const CURRENCY_SIGN: Record<string, string> = {'$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY'};
const CURRENCY_WORD: Record<string, string> = {usd: 'USD', dollar: 'USD', dollars: 'USD', eur: 'EUR', euro: 'EUR', euros: 'EUR', gbp: 'GBP', pound: 'GBP', pounds: 'GBP', chf: 'CHF', jpy: 'JPY', yen: 'JPY'};
const WORD_NUMBER: Record<string, number> = {once: 1, one: 1, twice: 2, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12};
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const NUMBER = String.raw`\d+(?:[.,]\d+)*`;

/** "15k" → 15000, "5,000" and "5.000" → 5000, "7.5" → 7.5, "2,5" → 2.5; null when unclear. */
export function readAmount(raw: string, suffix = ''): number | null {
  let text = raw.trim();
  if (/^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/.test(text)) text = text.replace(/[.,]/g, '');
  else if (/^\d+,\d{1,2}$/.test(text)) text = text.replace(',', '.');
  else if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const value = Number(text) * ({k: 1_000, m: 1_000_000}[suffix.toLowerCase() as 'k' | 'm'] ?? 1);
  return Number.isFinite(value) && value > 0 && value <= 1_000_000_000 ? value : null;
}
const count = (word: string) => WORD_NUMBER[word.toLowerCase()] ?? (/^\d+$/.test(word) ? Number(word) : null);
const lastOfMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);
const pad = (n: number) => String(n).padStart(2, '0');
/** The next date on or after today with this month and day. */
const nextOn = (today: string, month: number, day: number) => { const y = Number(today.slice(0, 4)), d = `${y}-${pad(month + 1)}-${pad(day)}`; return d >= today ? d : `${y + 1}-${pad(month + 1)}-${pad(day)}`; };
/** The date words in a clause: "by June (2027)", "by spring", "by the end of the year", "in 6 months", "by 2027-05-01". */
export function readDate(clause: string, today: string): {date: string; text: string; approximate?: true} | null {
  const lower = clause.toLowerCase();
  const iso = /\bby (\d{4}-\d{2}-\d{2})\b/.exec(lower);
  if (iso && !Number.isNaN(Date.parse(`${iso[1]}T12:00:00Z`))) return {date: iso[1]!, text: iso[1]!};
  const month = new RegExp(String.raw`\b(?:by|before|until|in) (?:the end of )?(${MONTHS.join('|')}|${MONTHS.map(m => m.slice(0, 3)).join('|')})\b(?:\s+(\d{4}))?`).exec(lower);
  if (month) {
    const index = MONTHS.findIndex(m => m.startsWith(month[1]!)), year = month[2] ? Number(month[2]) : null, ty = Number(today.slice(0, 4));
    let date = lastOfMonth(year ?? ty, index);
    if (!year && date < today) date = lastOfMonth(ty + 1, index);
    return {date, text: `${MONTHS[index]![0]!.toUpperCase()}${MONTHS[index]!.slice(1)}${year ? ` ${year}` : ''}`};
  }
  const season = /\bby (spring|summer|autumn|fall|winter|christmas)\b/.exec(lower);
  if (season) {
    const [m, d] = ({spring: [2, 20], summer: [5, 21], autumn: [8, 22], fall: [8, 22], winter: [11, 21], christmas: [11, 25]} as Record<string, [number, number]>)[season[1]!]!;
    return {date: nextOn(today, m, d), text: season[1]!, approximate: true};
  }
  if (/\bby the end of (?:the|this) year\b|\bthis year\b/.test(lower)) return {date: `${today.slice(0, 4)}-12-31`, text: 'the end of the year'};
  if (/\bby next year\b|\bnext year\b/.test(lower)) return {date: `${Number(today.slice(0, 4)) + 1}-12-31`, text: 'next year'};
  const span = /\b(?:in|within) (\d{1,3}|a|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve) (day|week|month|year)s?\b/.exec(lower);
  if (span) {
    const n = span[1] === 'a' ? 1 : count(span[1]!)!, unit = span[2]!;
    if (unit === 'month' || unit === 'year') {
      const months = unit === 'year' ? n * 12 : n, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)) - 1 + months, day = Number(today.slice(8, 10));
      const last = Number(lastOfMonth(y + Math.floor(m / 12), m % 12).slice(8, 10));
      return {date: `${y + Math.floor(m / 12)}-${pad(m % 12 + 1)}-${pad(Math.min(day, last))}`, text: `${n} ${unit}${n === 1 ? '' : 's'}`};
    }
    return {date: addDays(today, unit === 'week' ? n * 7 : n), text: `${n} ${unit}${n === 1 ? '' : 's'}`};
  }
  return null;
}
/** How often: "most days" (5 a week), "every day", "3 times a week", "twice a week", "on weekdays" (5 a week). */
export function readFrequency(clause: string): BundleHabit['schedule'] | null {
  const lower = clause.toLowerCase();
  if (/\b(?:every ?day|daily|each day)\b/.test(lower)) return {kind: 'daily'};
  if (/\bmost days\b|\bon weekdays\b|\bweekdays\b/.test(lower)) return {kind: 'frequency', times: 5, period: 'week'};
  const times = /\b(\d|once|twice|one|two|three|four|five|six|seven)(?: times?)? (?:a|per|each|every) week\b/.exec(lower);
  if (times) { const n = count(times[1]!); if (n && n >= 1 && n <= 7) return n === 7 ? {kind: 'daily'} : {kind: 'frequency', times: n, period: 'week'}; }
  return null;
}
const AMOUNT = new RegExp(String.raw`(?:([$€£¥])\s?(${NUMBER})\s?([km])?\b|\b(${NUMBER})\s?([km])?\s?(usd|dollars?|eur|euros?|gbp|pounds?|chf|jpy|yen)\b|(${NUMBER})\s?([km])?\s?([$€£¥]))`, 'i');
function readMoney(clause: string): {amount: number; currency: string} | null {
  const m = AMOUNT.exec(clause);
  if (!m) return null;
  if (m[1]) { const amount = readAmount(m[2]!, m[3] ?? ''); return amount === null ? null : {amount, currency: CURRENCY_SIGN[m[1]]!}; }
  if (m[4]) { const amount = readAmount(m[4], m[5] ?? ''); return amount === null ? null : {amount, currency: CURRENCY_WORD[m[6]!.toLowerCase()]!}; }
  const amount = readAmount(m[7]!, m[8] ?? ''); return amount === null ? null : {amount, currency: CURRENCY_SIGN[m[9]!]!};
}
const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plainNumber = (n: number) => n.toLocaleString('en-US', {maximumFractionDigits: 2});
const templateMilestones = (id: string) => { const t = templateById(id); return t?.milestones ? [...t.milestones] : undefined; };

type Part = {goal?: BundleGoal; habit?: BundleHabit; area?: BuiltInArea};
function moneyGoal(clause: string, today: string): Part | null {
  const lower = clause.toLowerCase(), money = readMoney(clause);
  const saving = /\b(?:save|saving|savings|put aside|set aside|fund|deposit|pay off|debt|nest egg)\b/.test(lower);
  if (!money && !saving) return null;
  if (!money && !/\b(?:emergency fund|fund)\b/.test(lower)) return null;
  const date = readDate(clause, today);
  let name = 'Savings goal', templateId: string | undefined;
  const months = /\b(\d{1,2})[- ]months?(?:'|’)?\s+(?:of\s+)?(?:an?\s+)?emergency fund\b|\bemergency fund of (\d{1,2}) months?\b/.exec(lower);
  if (/\bemergency fund\b|\brainy day\b|\bsafety net\b/.test(lower)) { name = months ? `Emergency fund (${months[1] ?? months[2]} months)` : 'Emergency fund'; templateId = 'emergency-fund'; }
  else if (/\b(?:trip|holiday|vacation|travel)\b/.test(lower)) { const to = /\b(?:trip|holiday|vacation) to ([a-z][a-z ]{1,30}?)(?= by\b| in\b|$|,)/i.exec(clause); name = to ? `Trip to ${title(to[1]!.trim())}` : 'Trip fund'; templateId = 'holiday-fund'; }
  else if (/\b(?:house|home|flat|apartment)\b|\bdeposit\b/.test(lower)) { name = 'House deposit'; templateId = 'house-deposit'; }
  else if (/\bpay off\b|\bdebt\b|\bcredit card\b|\bloan\b/.test(lower)) { name = 'Pay off debt'; templateId = 'pay-off-card'; }
  else { const forWhat = /\bfor (?:a |an |my |the )?([a-z][a-z ]{1,30}?)(?= by\b| in\b| before\b|$|,)/i.exec(clause); if (forWhat) name = `Save for ${forWhat[1]!.trim()}`; }
  const goal: BundleGoal = {name, kind: 'value', ...(money ? {target: money.amount, currency: money.currency} : {}), ...(date ? {date: date.date, dateText: date.text, ...(date.approximate ? {approximate: true as const} : {})} : {}), ...(templateId ? {templateId, milestones: templateMilestones(templateId)} : {})};
  return {goal, area: 'wealth'};
}
const RACES: [RegExp, string, string[]][] = [
  [/\b(?:half[- ]marathon|21(?:\.1)? ?k(?:m)?)\b/, 'Run a half marathon', ['Run 5 km', 'Run 10 km', 'Run 15 km', 'Run 21.1 km']],
  [/\bmarathon\b|\b42(?:\.2)? ?k(?:m)?\b/, 'Run a marathon', ['Run 10 km', 'Run a half marathon', 'Run 30 km', 'Run 42.2 km']],
  [/\b10 ?k(?:m)?\b/, 'Run a 10K', templateMilestones('run-10k') ?? []],
  [/\b5 ?k(?:m)?\b/, 'Run a 5K', ['Run 1 km without stopping', 'Run 3 km', 'Run 5 km']],
];
function raceGoal(clause: string, today: string): Part | null {
  const lower = clause.toLowerCase();
  if (!/\b(?:run|race|finish|complete|do)\b/.test(lower)) return null;
  for (const [pattern, name, milestones] of RACES) if (pattern.test(lower) && !/\bsteps?\b/.test(lower)) {
    const date = readDate(clause, today);
    return {goal: {name, kind: 'project', milestones, ...(name === 'Run a 10K' ? {templateId: 'run-10k'} : {}), ...(date ? {date: date.date, dateText: date.text, ...(date.approximate ? {approximate: true as const} : {})} : {})}, area: 'health'};
  }
  return null;
}
function otherGoal(clause: string, today: string): Part | null {
  const lower = clause.toLowerCase(), date = readDate(clause, today);
  const when = date ? {date: date.date, dateText: date.text, ...(date.approximate ? {approximate: true as const} : {})} : {};
  const books = /\bread (\d{1,3}|a dozen|twelve|ten|five) books?\b/.exec(lower);
  if (books) { const n = books[1] === 'a dozen' ? 12 : count(books[1]!)!; const q = [0.25, 0.5, 0.75, 1].map(s => Math.max(1, Math.round(n * s))); return {goal: {name: `Read ${n} books`, kind: 'project', milestones: [...new Set(q)].map(k => `${k} ${k === 1 ? 'book' : 'books'}`), ...when}, area: 'learning'}; }
  const lang = /\blearn (spanish|french|german|dutch|italian|portuguese|japanese|chinese|mandarin|korean|arabic|a (?:new )?language)\b/.exec(lower);
  if (lang) return {goal: {name: lang[1]!.startsWith('a ') ? 'Learn a language' : `Learn ${title(lang[1]!)}`, kind: 'project', templateId: 'language', milestones: templateMilestones('language'), ...when}, area: 'learning'};
  return null;
}
function habitPart(clause: string): Part | null {
  const lower = clause.toLowerCase(), freq = readFrequency(clause);
  const steps = new RegExp(String.raw`\b(${NUMBER})\s?(k)?\s?steps?\b`).exec(lower);
  if (steps) { const n = readAmount(steps[1]!, steps[2] ?? ''); if (n && Number.isInteger(n)) return {habit: {title: `Walk ${plainNumber(n)} steps`, schedule: freq ?? {kind: 'daily'}, measurement: {kind: 'count', unit: 'steps', target: n}, autoRule: {source: 'steps', comparator: 'at-least', threshold: n}}, area: 'health'}; }
  const train = /\b(train|work ?out|exercise|go to the gym|gym|lift|run|swim|cycle|ride)\b/.exec(lower);
  if (train && freq && !/\bsteps?\b/.test(lower)) {
    const verb = train[1]!.replace(/\s+/g, ' ');
    const name = verb === 'go to the gym' || verb === 'gym' ? 'Gym' : verb.startsWith('work') ? 'Workout' : verb === 'run' ? 'Run' : title(verb);
    return {habit: {title: name, schedule: freq, autoRule: {source: 'workout', comparator: 'recorded'}}, area: 'health'};
  }
  const water = /\bdrink (\d+(?:[.,]\d+)?) ?(l|litres?|liters?|ml|glasses)\b/.exec(lower);
  if (water) { const v = readAmount(water[1]!) ?? 0, ml = water[2]!.startsWith('m') ? v : water[2]!.startsWith('g') ? v * 250 : v * 1000; if (ml > 0) return {habit: {title: `Drink ${plainNumber(ml)} mL of water`, schedule: freq ?? {kind: 'daily'}, measurement: {kind: 'quantity', unit: 'mL', target: ml}, autoRule: {source: 'water', comparator: 'at-least', threshold: ml}}, area: 'health'}; }
  const sleep = /\bsleep (\d+(?:[.,]\d+)?) ?(?:h|hrs?|hours?)\b/.exec(lower);
  if (sleep) { const h = readAmount(sleep[1]!); if (h && h <= 24) return {habit: {title: `Sleep ${plainNumber(h)} hours`, schedule: freq ?? {kind: 'daily'}, autoRule: {source: 'sleep', comparator: 'at-least', threshold: h}}, area: 'health'}; }
  const minutes = /\b(meditate|read|study|practi[sc]e|journal|stretch|walk)(?: for)? (\d{1,3}) ?(?:min|mins|minutes)\b/.exec(lower);
  if (minutes) { const m = Number(minutes[2]); if (m >= 1 && m <= 600) return {habit: {title: `${title(minutes[1]!)} ${m} minutes`, schedule: freq ?? {kind: 'daily'}, measurement: {kind: 'duration', unit: 'minutes', target: m}}, area: /meditate|journal|stretch/.test(minutes[1]!) ? 'mind' : /walk/.test(minutes[1]!) ? 'health' : 'learning'}; }
  const plain = /\b(meditate|journal|read|stretch)\b/.exec(lower);
  if (plain && freq) return {habit: {title: title(plain[1]!), schedule: freq}, area: plain[1] === 'read' ? 'learning' : 'mind'};
  return null;
}
/** A suggested monthly amount for a money goal with a target and a date (rounded up to the cent); never applied by itself. */
export function contributionPlanFor(goal: BundleGoal, today: string): ContributionPlan | undefined {
  if (goal.kind !== 'value' || !goal.target || !goal.date) return undefined;
  const days = daysBetween(today, goal.date);
  if (!(days > 0)) return undefined;
  const months = Math.max(1, Math.round(days / 30.44));
  return {perMonth: Math.ceil(goal.target / months * 100) / 100, months, ...(goal.currency ? {currency: goal.currency} : {}), suggested: true};
}
/** The sentence as clauses: split on "and", ";" and ", then"; the "I want to" opener goes. */
export function clauses(text: string): string[] {
  const body = text.replace(/\s+/g, ' ').trim().replace(/^(?:i(?:'|’)?d like to|i want to|i want|i would like to|help me|my goals? (?:is|are) to|i(?:'|’)?m going to|i will)\s+/i, '');
  return body.split(/\s*(?:;|,?\s+and then\s+|,?\s+and also\s+|,?\s+and\s+|,\s+then\s+|,\s+also\s+|\.\s+)\s*/i).map(s => s.replace(/[.!]+$/, '').trim()).filter(Boolean);
}
export function parseGoalBundle(text: string, today: string): GoalBundle | null {
  if (!text.trim() || text.length > MAX_BUNDLE_TEXT) return null;
  let goal: BundleGoal | null = null, lifeArea: BuiltInArea | undefined;
  const habits: BundleHabit[] = [];
  for (const clause of clauses(text)) {
    const part: Part | null = (!goal && (moneyGoal(clause, today) ?? raceGoal(clause, today) ?? otherGoal(clause, today))) || habitPart(clause);
    if (!part) continue;
    if (part.goal && !goal) { goal = part.goal; lifeArea = part.area; }
    else if (part.habit && habits.length < 5 && !habits.some(h => h.title === part.habit!.title)) { habits.push(part.habit); lifeArea ??= part.area; }
  }
  if (!goal && !habits.length) return null;
  const contributionPlan = goal ? contributionPlanFor(goal, today) : undefined;
  return {goal, habits, ...(contributionPlan ? {contributionPlan} : {}), ...(lifeArea ? {lifeArea} : {})};
}
