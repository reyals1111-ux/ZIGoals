import {en} from './locales/en';
import type {QuickAddContext, QuickAddDay, QuickAddKnown, QuickAddLocale, QuickAddResult, UnitKind, VerbKind} from './types';
export type * from './types';

/**
 * The Quick-add line (Session P, PR 3, A2; docs/product/features/A2-quick-add.md): one typed English line becomes
 * exactly one record, previewed before anything is saved. Pure: it reads no clock and no store; the habit titles and
 * counter names come in through the context because they are the person's own words. Honest numbers: a glass is a
 * stated 250 mL, steps are never derived from a distance, nothing is guessed when a line could mean two things.
 */
export const GLASS_ML = 250, FL_OZ_ML = 29.5735295625, LB_GRAMS = 453.59237, MILE_KM = 1.609344;
export const LIMITS = {waterMl: 10_000, weightGrams: 1_000_000, steps: 1_000_000, minutes: 1440, count: 100_000, habit: 1_000_000_000};
export const OUTSIDE = 'That number is outside what the journal keeps.', ABOVE_ZERO = 'Use a number above zero.', MINUTES_HINT = 'Add the minutes, for example ran 5k in 28 min';
export const UNCLEAR_NUMBER = 'Type that number without a thousands separator, for example 1234.';
const LOCALES: Record<'en', QuickAddLocale> = {en};
const ACTIVITY: Record<Exclude<VerbKind, 'water' | 'weight' | 'sleep'>, 'Run' | 'Walk' | 'Cycle' | 'Swim'> = {walk: 'Walk', run: 'Run', cycle: 'Cycle', swim: 'Swim'};
type Num = {value: number; grouped: boolean; plus: boolean; thousands: boolean};
type Token = {word: string; num?: Num; unit?: UnitKind; verb?: VerbKind; used: boolean};
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const normalizeName = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, '').replace(/s$/, '');

function readNumber(raw: string): Num | null {
  const plus = raw.startsWith('+'), text = plus ? raw.slice(1) : raw;
  if (/^\d{1,3}(,\d{3})+$/.test(text)) { const grouped = /^\d{1,3},\d{3}$/.test(text); return {value: Number(text.replace(/,/g, '')), grouped, plus, thousands: !grouped}; }
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(text);
  if (!m) return null;
  return {value: Number(`${m[1]}.${m[2] ?? '0'}`), grouped: false, plus, thousands: false};
}
function tokenize(input: string, locale: QuickAddLocale): Token[] | null {
  if (/\d\s*e\s*[+-]?\d/i.test(input) || /(^|[\s(])[-−]\s*\d/.test(input)) return null;
  let text = input.toLowerCase().replace(/[’']/g, '').replace(/[.,!?;:]+(?=\s|$)/g, ' ').replace(/[^\p{L}\p{N}+.,\s-]/gu, ' ');
  text = text.replace(/(\d)([a-z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2');
  const tokens: Token[] = [];
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const num = readNumber(raw);
    if (num) { tokens.push({word: raw, num, used: false}); continue; }
    const word = raw.replace(/^\++/, '');
    const numberWord = locale.numbers[word];
    const token: Token = {word, used: false};
    if (numberWord !== undefined) token.num = {value: numberWord, grouped: false, plus: raw.startsWith('+'), thousands: false};
    if (locale.units[word]) token.unit = locale.units[word];
    if (locale.verbs[word]) token.verb = locale.verbs[word];
    tokens.push(token);
  }
  // "5k" and "8k": a bare k after a number multiplies by a thousand (steps) or names kilometres (a run, a walk, a ride).
  for (let i = 1; i < tokens.length; i++) if (tokens[i]!.word === 'k' && tokens[i - 1]!.num && !tokens[i]!.unit) tokens[i]!.unit = 'k' as UnitKind;
  return tokens;
}
const unknown = (locale: QuickAddLocale): QuickAddResult => ({kind: 'unknown', examples: locale.examples});
const needsMore = (hint: string): QuickAddResult => ({kind: 'needs-more', hint});
/** The first unused number, optionally the one right before or after a unit kind. */
function numberNear(tokens: Token[], unitIndex: number): Token | undefined {
  const before = tokens[unitIndex - 1], after = tokens[unitIndex + 1];
  if (before?.num && !before.used) return before;
  if (after?.num && !after.used) return after;
  return undefined;
}
const firstNumber = (tokens: Token[]) => tokens.find(t => t.num && !t.used);
const take = (t: Token | undefined) => { if (t) t.used = true; return t; };

export function parse(text: string, localeName: 'en', context: QuickAddContext): QuickAddResult {
  const locale = LOCALES[localeName];
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 200) return unknown(locale);
  const tokens = tokenize(trimmed, locale);
  if (!tokens || !tokens.length) return unknown(locale);
  if (tokens.some(t => locale.conjunctions.includes(t.word))) return unknown(locale);
  let day: QuickAddDay = 'today';
  for (const t of tokens) { const d = locale.dayWords[t.word]; if (d) { day = d; t.used = true; } }
  if (tokens.every(t => t.used)) return unknown(locale);
  // "half a glass", "a couple of glasses": an article next to another number word is not a second number.
  for (let i = 0; i < tokens.length; i++) if ((tokens[i]!.word === 'a' || tokens[i]!.word === 'an') && (tokens[i - 1]?.num?.value === 0.5 || tokens[i + 1]?.num)) tokens[i]!.num = undefined;
  const unitAt = (kinds: UnitKind[]) => tokens.findIndex(t => t.unit && kinds.includes(t.unit) && !t.used);
  const verbOf = (kinds: VerbKind[]) => tokens.find(t => t.verb && kinds.includes(t.verb) && !t.used);
  const hasWord = (word: string) => tokens.some(t => t.word === word);
  const explicit: QuickAddKnown[] = [];
  const decimal = (t: Token | undefined): number | 'unclear' | undefined => t?.num ? (t.num.grouped || t.num.thousands ? 'unclear' : t.num.value) : undefined;
  const whole = (t: Token | undefined): number | undefined => t?.num ? t.num.value : undefined;

  // Water: a water verb, a water unit, or the word water.
  const waterUnit = unitAt(['glass', 'ml', 'l', 'floz']), waterVerb = verbOf(['water']);
  if (waterUnit >= 0 || (waterVerb && waterVerb.word !== 'had')) {
    const unitToken = waterUnit >= 0 ? tokens[waterUnit]! : undefined;
    const numberToken = unitToken ? numberNear(tokens, waterUnit) ?? firstNumber(tokens) : firstNumber(tokens);
    const value = decimal(numberToken);
    if (value === 'unclear') return needsMore(UNCLEAR_NUMBER);
    const kind: UnitKind = unitToken?.unit ?? (numberToken ? (context.waterUnit === 'ml' ? 'ml' : 'floz') : 'glass');
    const n = value ?? 1;
    if (!(n > 0)) return needsMore(ABOVE_ZERO);
    const millilitres = kind === 'glass' ? n * GLASS_ML : kind === 'ml' ? n : kind === 'l' ? n * 1000 : round3(n * FL_OZ_ML);
    if (millilitres > LIMITS.waterMl) return needsMore(OUTSIDE);
    take(unitToken); take(numberToken); if (waterVerb) waterVerb.used = true; for (const t of tokens) if (t.verb === 'water') t.used = true;
    explicit.push({kind: 'water', millilitres: round3(millilitres), shown: {amount: n, unit: kind === 'glass' ? 'glasses' : kind === 'ml' ? 'mL' : kind === 'l' ? 'L' : 'US fl oz'}, day});
  }
  // Weight: a weight verb or kg/lb.
  const weightUnit = unitAt(['kg', 'lb']), weightVerb = verbOf(['weight']);
  if (!explicit.length && (weightUnit >= 0 || weightVerb)) {
    const unitToken = weightUnit >= 0 ? tokens[weightUnit]! : undefined;
    const numberToken = unitToken ? numberNear(tokens, weightUnit) ?? firstNumber(tokens) : firstNumber(tokens);
    if (!numberToken) return unknown(locale);
    const value = decimal(numberToken);
    if (value === 'unclear') return needsMore(UNCLEAR_NUMBER);
    if (!(value! > 0)) return needsMore(ABOVE_ZERO);
    const unit: 'kg' | 'lb' = unitToken?.unit === 'lb' ? 'lb' : unitToken?.unit === 'kg' ? 'kg' : context.weightUnit;
    const grams = unit === 'kg' ? Math.round(value! * 1000) : Math.round(value! * LB_GRAMS);
    if (grams > LIMITS.weightGrams) return needsMore(OUTSIDE);
    take(unitToken); take(numberToken); if (weightVerb) weightVerb.used = true;
    explicit.push({kind: 'weight', grams, shown: {amount: value!, unit}, day});
  }
  // Steps, a walk, a run, a ride, a swim.
  const stepsUnit = unitAt(['steps']), moveVerb = verbOf(['walk', 'run', 'cycle', 'swim']);
  const minutesOf = (): number | 'unclear' | null | undefined => {
    const h = unitAt(['h']), m = unitAt(['min']);
    let total = 0, any = false;
    if (h >= 0) { const t = numberNear(tokens, h); const v = decimal(t); if (v === 'unclear') return 'unclear'; if (v === undefined) return null; total += v * 60; any = true; take(t); tokens[h]!.used = true; const after = tokens[h + 1]; if (after?.num && !after.used && m < 0) { total += after.num.value; take(after); } }
    if (m >= 0) { const t = numberNear(tokens, m); const v = decimal(t); if (v === 'unclear') return 'unclear'; if (v === undefined) return null; total += v; any = true; take(t); tokens[m]!.used = true; }
    return any ? total : undefined;
  };
  if (!explicit.length && (stepsUnit >= 0 || (moveVerb && moveVerb.verb === 'walk' && !hasWord('km') && !hasWord('mi') && unitAt(['km', 'mi', 'k' as UnitKind, 'min', 'h']) < 0 && firstNumber(tokens)))) {
    const unitToken = stepsUnit >= 0 ? tokens[stepsUnit]! : undefined;
    const numberToken = unitToken ? numberNear(tokens, stepsUnit) ?? firstNumber(tokens) : firstNumber(tokens);
    if (!numberToken) return unknown(locale);
    let steps = whole(numberToken)!;
    const kToken = tokens[tokens.indexOf(numberToken) + 1];
    if (kToken?.unit === ('k' as UnitKind)) { steps *= 1000; kToken.used = true; }
    if (!Number.isInteger(steps)) return needsMore('Steps are whole numbers.');
    if (!(steps > 0)) return needsMore(ABOVE_ZERO);
    if (steps > LIMITS.steps) return needsMore(OUTSIDE);
    take(unitToken); take(numberToken); if (moveVerb) moveVerb.used = true;
    const minutes = minutesOf();
    if (minutes === 'unclear') return needsMore(UNCLEAR_NUMBER);
    if (typeof minutes === 'number' && (minutes > LIMITS.minutes || minutes <= 0)) return needsMore(minutes <= 0 ? ABOVE_ZERO : OUTSIDE);
    explicit.push({kind: 'steps', steps, ...(typeof minutes === 'number' ? {minutes} : {}), day});
  } else if (!explicit.length && moveVerb) {
    moveVerb.used = true;
    const name = ACTIVITY[moveVerb.verb as keyof typeof ACTIVITY];
    let distanceKm: number | undefined;
    const km = unitAt(['km']), mi = unitAt(['mi']), k = unitAt(['k' as UnitKind]);
    const distanceAt = km >= 0 ? km : mi >= 0 ? mi : k;
    if (distanceAt >= 0) { const t = numberNear(tokens, distanceAt); const v = decimal(t); if (v === 'unclear') return needsMore(UNCLEAR_NUMBER); if (v === undefined || !(v > 0)) return needsMore(ABOVE_ZERO); distanceKm = mi >= 0 && distanceAt === mi ? round3(v * MILE_KM) : v; take(t); tokens[distanceAt]!.used = true; }
    const minutes = minutesOf();
    if (minutes === 'unclear') return needsMore(UNCLEAR_NUMBER);
    if (minutes === undefined || minutes === null) return needsMore(MINUTES_HINT);
    if (!(minutes > 0)) return needsMore(ABOVE_ZERO);
    if (minutes > LIMITS.minutes) return needsMore(OUTSIDE);
    explicit.push({kind: 'activity', name, minutes: round3(minutes), ...(distanceKm !== undefined ? {distanceKm} : {}), day});
  }
  // Sleep: slept 7h, 7.5 hours, 7h30, 6 h 45 min.
  const sleepVerb = verbOf(['sleep']);
  if (!explicit.length && sleepVerb) {
    sleepVerb.used = true;
    const minutes = minutesOf();
    if (minutes === 'unclear') return needsMore(UNCLEAR_NUMBER);
    if (minutes === undefined || minutes === null) { const bare = firstNumber(tokens); if (!bare) return unknown(locale); const v = decimal(bare); if (v === 'unclear') return needsMore(UNCLEAR_NUMBER); take(bare); if (!(v! > 0)) return needsMore(ABOVE_ZERO); if (v! * 60 > LIMITS.minutes) return needsMore(OUTSIDE); explicit.push({kind: 'sleep', minutes: round3(v! * 60), day}); }
    else { if (!(minutes > 0)) return needsMore(ABOVE_ZERO); if (minutes > LIMITS.minutes) return needsMore(OUTSIDE); explicit.push({kind: 'sleep', minutes: round3(minutes), day}); }
  }
  // The person's own words: exercise counters and habit titles, from every word that is not a number, a unit, a filler or a day word.
  const words = tokens.filter(t => !t.num && !t.unit && !locale.fillers.includes(t.word) && !locale.dayWords[t.word]).map(t => t.word);
  const stemmed = words.map(w => locale.stems[w] ?? w);
  const joined = normalizeName(stemmed.join('')), joinedRaw = normalizeName(words.join(''));
  const own: QuickAddKnown[] = [];
  // The person's own words may share their number with an explicit reading ("drink water 2 glasses"), so any number counts here.
  const count = tokens.find(t => t.num);
  if (words.length) {
    for (const counter of context.counters) {
      const name = normalizeName(counter.name);
      if (name && (joined === name || joinedRaw === name)) {
        const n = count ? count.num!.value : 1;
        if (!Number.isInteger(n)) return needsMore('Counters take whole numbers.');
        if (!(n > 0)) return needsMore(ABOVE_ZERO);
        if (n > LIMITS.count) return needsMore(OUTSIDE);
        own.push({kind: 'exercise', counterId: counter.id, name: counter.name, count: n, day});
      }
    }
    for (const habit of context.habits) {
      const title = normalizeName(habit.title), first = normalizeName(habit.title.split(/\s+/)[0] ?? '');
      const firstWord = normalizeName(stemmed[0] ?? ''), firstRaw = normalizeName(words[0] ?? '');
      if (!title || !(joined === title || joinedRaw === title || (first && (firstWord === first || firstRaw === first)))) continue;
      let value: number;
      if (habit.kind === 'duration') { const minutes = minutesOf(); if (minutes === 'unclear') return needsMore(UNCLEAR_NUMBER); value = typeof minutes === 'number' ? minutes : count ? count.num!.value : 1; }
      else if (habit.kind === 'boolean') value = count ? count.num!.value : habit.target || 1;
      else value = count ? count.num!.value : 1;
      if (!(value > 0)) return needsMore(ABOVE_ZERO);
      if (value > LIMITS.habit) return needsMore(OUTSIDE);
      own.push({kind: 'habit', habitId: habit.id, title: habit.title, value, unit: habit.kind === 'duration' ? 'minutes' : habit.kind === 'boolean' ? 'done' : habit.unit, day});
    }
  }
  const choices = [...explicit, ...own];
  if (choices.length === 1) return choices[0]!;
  if (choices.length > 1) return {kind: 'ambiguous', choices};
  return unknown(locale);
}
