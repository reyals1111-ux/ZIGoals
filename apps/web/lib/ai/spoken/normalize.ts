/**
 * Session Z-Local Part 4 (ADR-020 L6): spoken English and Dutch, read on the device after the words are in. The message
 * the person sees and the model receives stays their exact words; this normalised form feeds only the parts that decide
 * on the device (the intent router, the question-aware router, the on-device answers, the day cue and the quantity cue),
 * so "log two and a half litres, no wait, three" reads as "log 3 litres" where a cue is looked for. Model-agnostic: no
 * model sees this text. Everything here is a plain rewrite of spoken forms into the typed forms those parts already
 * read; a word that is not a filler, a number, a clock idiom or a self-correction is left exactly as it came.
 */

/** Wake words and fillers: at the start ("hey ZIGi, …", "ok zigi …") and anywhere ("um", "uh", "euh", "you know,"). */
const WAKE = /^\s*(?:(?:hey|hi|hello|ok|okay|hé|hoi|hallo|he|ey)[,!]?\s+)?zigi[,!.:]?\s+/i;
const FILLER = /(?:,\s*|^|(?<=\s))(?:u+m+|u+h+|uhm+|erm+|hmm+|m+h+m+|euh+|ehm+|eh)(?=[\s,.!?]|$)[,.]?\s*/gi;
const re = (source: string, flags: string) => new RegExp(source, flags);
const FILLER_PHRASE = /(?:^|(?<=\s))(?:you know|i mean|zeg maar|nou ja|weet je|dus eh)[,]?\s+/gi;

const EN_SMALL: Readonly<Record<string, number>> = {zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19};
const EN_TENS: Readonly<Record<string, number>> = {twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90};
const NL_SMALL: Readonly<Record<string, number>> = {nul: 0, een: 1, één: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9, tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16, zeventien: 17, achttien: 18, negentien: 19};
const NL_TENS: Readonly<Record<string, number>> = {twintig: 20, dertig: 30, veertig: 40, vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90};
const UNITS = 'glass(?:es)?|glas|glazen|cups?|bottles?|flesj?e?s?|lit(?:re|er)s?|l|ml|millilit(?:re|er)s?|kg|kilos?|kilograms?|lbs?|pounds?|pond|g|grams?|gram|km|kilomet(?:re|er)s?|miles?|mijl|steps?|stappen|minutes?|mins?|minuten|minuut|hours?|hrs?|uur|uren|seconds?|seconden|kcal|calories|calorieën|reps?|push-?ups|pages?|pagina\'?s|bladzijden|x|times|keer|servings?|porties?|portie|pieces?|stuks?|eggs?|eieren|bananas?|bananen|apples?|appels?';

/** One Dutch number written as one word ("vijfentwintig", "tweehonderd", "twaalfduizend", "tweeduizendvijfhonderd"), or null. */
function dutchWord(word: string): number | null {
  const w = word.toLowerCase();
  if (w in NL_SMALL) return NL_SMALL[w]!;
  if (w in NL_TENS) return NL_TENS[w]!;
  const tens = /^(een|één|twee|drie|vier|vijf|zes|zeven|acht|negen)(?:en|ën)(twintig|dertig|veertig|vijftig|zestig|zeventig|tachtig|negentig)$/.exec(w);
  if (tens) return NL_SMALL[tens[1]!]! + NL_TENS[tens[2]!]!;
  const big = /^(.*?)(duizend|honderd)(.*)$/.exec(w);
  if (big) {
    const head = big[1] ?? '', scale = big[2] ?? '', tail = big[3] ?? '', factor = scale === 'duizend' ? 1000 : 100;
    const lead = head === '' ? 1 : dutchWord(head); if (lead === null) return null;
    const rest = tail === '' ? 0 : dutchWord(tail); if (rest === null) return null;
    return lead * factor + rest;
  }
  return null;
}
/** An English number word ("twenty-five", "hundred") as its value, or null; "a" and "and" are handled by the run reader. */
function englishWord(word: string): number | null {
  const w = word.toLowerCase();
  if (w in EN_SMALL) return EN_SMALL[w]!;
  if (w in EN_TENS) return EN_TENS[w]!;
  if (w === 'hundred') return 100;
  if (w === 'thousand') return 1000;
  const pair = /^(twenty|thirty|forty|fourty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)$/.exec(w);
  if (pair) return EN_TENS[pair[1]!]! + EN_SMALL[pair[2]!]!;
  return null;
}
const isScale = (v: number) => v === 100 || v === 1000;
/** Folds a run of number values ("two", "hundred", "and", "twenty", "five") into one number, English and Dutch alike. */
function fold(values: readonly number[]): number {
  let total = 0, current = 0;
  for (const v of values) {
    if (v === 100) current = (current || 1) * 100;
    else if (v === 1000) { total += (current || 1) * 1000; current = 0; }
    else current += v;
  }
  return total + current;
}
const WORD = /[A-Za-zÀ-ÿ'’-]+/g;
/**
 * Number words to digits, in runs: "twenty five" → "25", "two hundred and fifty" → "250", "twaalfhonderd" → "1200",
 * "tweeduizend vijfhonderd" → "2500". A lone "one"/"een" converts only before a unit (an article stays an article), and
 * a lone "a"/"an"/"'n" before a unit reads as 1 ("a glass of water" → "1 glass of water").
 */
function numberWords(text: string): string {
  const tokens: {word: string; start: number; end: number; value: number | null; article: boolean}[] = [];
  for (const m of text.matchAll(WORD)) {
    const word = m[0], lower = word.toLowerCase();
    const value = englishWord(lower) ?? dutchWord(lower);
    tokens.push({word, start: m.index, end: m.index + word.length, value, article: lower === 'a' || lower === 'an' || lower === "'n" || lower === '’n'});
  }
  const unit = new RegExp(`^\\s*(?:${UNITS})(?![A-Za-z])`, 'i');
  const out: string[] = []; let cursor = 0, i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.article && i + 1 < tokens.length && unit.test(text.slice(t.end, tokens[i + 1]!.end + 1)) && englishWord(tokens[i + 1]!.word.toLowerCase()) === null) {
      out.push(text.slice(cursor, t.start), '1'); cursor = t.end; i += 1; continue;
    }
    if (t.value === null) { i += 1; continue; }
    // A run: number words, with "and"/"en" allowed between a hundred and its remainder.
    let j = i; const values: number[] = [];
    while (j < tokens.length) {
      const u = tokens[j]!;
      if (u.value !== null && (j === i || /^[\s-]+$/.test(text.slice(tokens[j - 1]!.end, u.start)))) {
        // "seven thirty" and "twenty ten" are two numbers (a spoken clock), not one: a run only continues into a scale, or from a tens word into a unit.
        const prev = values[values.length - 1];
        const continues = prev === undefined || isScale(u.value) || (prev >= 1000 && prev % 1000 === 0 && u.value < 1000 && u.value > 0) || (prev >= 100 && prev % 100 === 0 && u.value < 100 && u.value > 0) || (prev >= 20 && prev < 100 && u.value < 10 && u.value > 0);
        if (!continues) break;
        values.push(u.value); j += 1; continue;
      }
      const lower = u.word.toLowerCase();
      if ((lower === 'and' || lower === 'en') && j + 1 < tokens.length && tokens[j + 1]!.value !== null && values.length && isScale(values[values.length - 1]!) && /^\s+$/.test(text.slice(tokens[j - 1]!.end, u.start))) { j += 1; continue; }
      break;
    }
    const last = tokens[j - 1]!, isOne = values.length === 1 && values[0] === 1 && /^(?:one|een|één)$/i.test(t.word);
    const before = text.slice(0, t.start), after = text.slice(last.end);
    // "one of", "one more", "een gewoonte": a lone one converts only before a unit.
    if (isOne && !unit.test(after)) { i = j; continue; }
    // "a hundred", "one and a half": "a" before hundred/thousand reads as 1; "X and a half" handled by the decimal pass.
    if (isScale(values[0]!) && /\b(?:a|an)\s*$/i.test(before)) { const art = /\b(?:a|an)\s*$/i.exec(before)!; out.push(text.slice(cursor, art.index), String(fold(values))); cursor = last.end; i = j; continue; }
    out.push(text.slice(cursor, t.start), String(fold(values))); cursor = last.end; i = j;
  }
  out.push(text.slice(cursor));
  return out.join('');
}

/** Halves and decimals: "two and a half" → 2.5, "half a litre" → 0.5 litre, "anderhalf uur" → 1.5 uur, "two point five" → 2.5, "twee komma vijf" → 2.5. */
function fractions(text: string): string {
  return text
    .replace(/\b(\d+)\s+(?:and|en)\s+(?:a|een|'n)?\s*half\b/gi, (_, n: string) => `${n}.5`)
    .replace(/\b(\d+)\s*(?:en\s*een\s*)?half\b/gi, (_, n: string) => `${n}.5`)
    .replace(/\b(?:(?:an?|1|een)\s+)?(hour|uur|lit(?:re|er)|kilo|glass|glas|minute|minuut|cup|bottle|fles|mile|mijl)\s+(?:and|en)\s+(?:a\s+|een\s+)?half(?:\s+(?:an?|een)\b)?/gi, (_, u: string) => `1.5 ${u}`)
    .replace(/\banderhal(?:f|ve)\b/gi, '1.5')
    .replace(re(`\\b(?:a\\s+|een\\s+)?hal(?:f|ve)\\s+(?:an?\\s+|een\\s+|1\\s+)?(?=(?:${UNITS})(?![A-Za-z]))`, 'gi'), '0.5 ')
    .replace(/\bhalf\s+(?:an?|een|1)\s+/gi, '0.5 ')
    .replace(/\b(\d+)\s+(?:point|komma|comma)\s+(\d+)\b/gi, '$1.$2')
    .replace(/\b(\d+)\s*k(?=\s*(?:steps|stappen)\b)/gi, (_, n: string) => String(Number(n) * 1000));
}

/** The quarter of an hour: "a quarter of an hour" → 15 minutes, "een kwartier" → 15 minuten, "three quarters of an hour" → 45 minutes. */
const quarters = (text: string) => text
  .replace(/\b(?:a|one|1)\s+quarter\s+of\s+an\s+hour\b/gi, '15 minutes').replace(/\bthree\s+quarters\s+of\s+an\s+hour\b/gi, '45 minutes')
  .replace(/\b(?:een|1)\s+kwartier\b/gi, '15 minuten').replace(/\b(?:drie|3)\s*kwartier\b/gi, '45 minuten').replace(/\bkwartiertje\b/gi, '15 minuten');

const two = (n: number) => String(n).padStart(2, '0');
const clock = (h: number, m: number) => `${h % 24}:${two(m)}`;
const EVENING = /\b(?:in the (?:evening|afternoon)|tonight|this evening|this afternoon|pm|'s avonds|s avonds|vanavond|vanmiddag|'s middags|s middags|in de avond|vannacht|at night)\b/i;
const MORNING = /\b(?:in the morning|this morning|am|'s ochtends|s ochtends|'s morgens|s morgens|vanochtend|vanmorgen)\b/i;
const shift = (h: number, context: string) => EVENING.test(context) && h < 12 ? h + 12 : MORNING.test(context) && h === 12 ? 0 : h;
/**
 * Clock idioms to H:MM. English: "half past seven" 7:30, "quarter to eight" 7:45, "ten past seven" 7:10, "seven o'clock"
 * 7:00, "seven thirty" after "at" 7:30. Dutch: "half acht" is 7:30 (half before eight), "kwart over zeven" 7:15, "kwart
 * voor acht" 7:45, "tien over zeven" 7:10, "vijf voor half acht" 7:25, "vijf over half acht" 7:35, "zeven uur" 7:00. An
 * evening or afternoon word in the message moves a small hour into the afternoon (19:30); "'s ochtends" keeps it.
 */
function clocks(text: string): string {
  const ctx = text;
  let t = text
    .replace(/\b(?:a\s+)?quarter\s+past\s+(\d{1,2})\b/gi, (_, h: string) => clock(shift(+h, ctx), 15))
    .replace(/\b(?:a\s+)?quarter\s+to\s+(\d{1,2})\b/gi, (_, h: string) => clock(shift(+h - 1 + (+h === 0 ? 24 : 0), ctx), 45))
    .replace(/\bhalf\s+past\s+(\d{1,2})\b/gi, (_, h: string) => clock(shift(+h, ctx), 30))
    .replace(/\b(\d{1,2})\s+past\s+(\d{1,2})\b/gi, (_, m: string, h: string) => +m < 60 ? clock(shift(+h, ctx), +m) : `${m} past ${h}`)
    .replace(/\b(\d{1,2})\s+to\s+(\d{1,2})\s*(?=o'?clock|am|pm|in the|tonight|$|[,.!?]|\s)/gi, (m0, mm: string, h: string, offset: number, s: string) => {
      // "ten to eight" is a time only when minutes fit and the phrase is not a range ("from 7 to 8", "3 to 5 glasses").
      const before = s.slice(0, offset);
      if (+mm >= 60 || +mm === 0 || /\b(?:from|van|between|tussen)\s*$/i.test(before) || new RegExp(`^\\s*(?:${UNITS})(?![A-Za-z])`, 'i').test(s.slice(offset + m0.length))) return m0;
      return clock(shift((+h + 23) % 24, ctx), 60 - +mm);
    })
    .replace(/\b(\d{1,2})\s+o'?clock\b/gi, (_, h: string) => clock(shift(+h, ctx), 0))
    .replace(re(`\\b(at|around|about|by|rond|om|tegen)\\s+(\\d{1,2})\\s+(\\d{2})\\b(?!\\s*(?:${UNITS})(?![A-Za-z]))`, 'gi'), (m0, w: string, h: string, m: string) => +h < 24 && +m < 60 ? `${w} ${clock(shift(+h, ctx), +m)}` : m0)
    // Dutch
    .replace(/\b(\d{1,2})\s+(?:over|na)\s+half\s+(\d{1,2})\b/gi, (_, m: string, h: string) => clock(shift(+h - 1, ctx), 30 + +m))
    .replace(/\b(\d{1,2})\s+voor\s+half\s+(\d{1,2})\b/gi, (_, m: string, h: string) => clock(shift(+h - 1, ctx), 30 - +m))
    .replace(/\bkwart\s+over\s+(\d{1,2})\b/gi, (_, h: string) => clock(shift(+h, ctx), 15))
    .replace(/\bkwart\s+voor\s+(\d{1,2})\b/gi, (_, h: string) => clock(shift(+h - 1, ctx), 45))
    .replace(re(`\\bhalf\\s+(\\d{1,2})\\b(?!\\s*(?:${UNITS})(?![A-Za-z]))(?![:.]\\d)`, 'gi'), (_, h: string) => clock(shift(+h - 1, ctx), 30))
    .replace(/\b(\d{1,2})\s+(?:over|na)\s+(\d{1,2})\b(?=\s|$|[,.!?])/gi, (m0, m: string, h: string) => +m < 30 && +h <= 24 ? clock(shift(+h, ctx), +m) : m0)
    .replace(/\b(\d{1,2})\s+voor\s+(\d{1,2})\b(?=\s|$|[,.!?])/gi, (m0, m: string, h: string) => +m < 30 && +h <= 24 ? clock(shift((+h + 23) % 24, ctx), 60 - +m) : m0)
    .replace(re(`\\b(\\d{1,2})\\s+uur\\s+(\\d{1,2})\\b(?!\\s*(?:${UNITS})(?![A-Za-z]))`, 'gi'), (m0, h: string, m: string) => +h < 24 && +m < 60 ? clock(shift(+h, ctx), +m) : m0)
    .replace(/\b(?:om|rond|tegen)\s+(\d{1,2})\s+uur\b/gi, (_, h: string) => `om ${clock(shift(+h, ctx), 0)}`);
  // "7 pm" / "7pm" / "19 uur" stay as they are: the clock cue reads them already.
  t = t.replace(/\b(\d{1,2}):(\d{2})\s*pm\b/gi, (_, h: string, m: string) => `${(+h % 12) + 12}:${m}`).replace(/\b(\d{1,2}):(\d{2})\s*am\b/gi, (_, h: string, m: string) => `${+h % 12}:${m}`);
  return t;
}

/** "two glasses, no wait, three" → "three glasses"; "3 kilometer, nee, 4" → "4 kilometer"; "make that 5" keeps the unit. */
const MARKER = /\s*[,.]?\s*(?:no[,.]?\s*wait[,.]?|wait[,.]?\s*no[,.]?|no[,.]|sorry[,.]?|i mean[,.]?|make (?:that|it)|actually[,.]?|nee[,.]?\s*wacht[,.]?|wacht[,.]?\s*nee[,.]?|nee[,.]|ik bedoel[,.]?|maak er|eigenlijk[,.]?|correctie[,.]?|correction[,.]?)\s*(?=\d)/i;
const UNIT_AFTER = new RegExp(`^\\s+(${UNITS})(?![A-Za-z])`, 'i');
/** The last number before the marker takes the first number after it; the unit stays where it was, and "maak er 4 van" loses its "van". */
function corrections(text: string): string {
  for (let guard = 0; guard < 4; guard++) {
    const m = MARKER.exec(text); if (!m) return text;
    const before = text.slice(0, m.index), after = text.slice(m.index + m[0].length);
    const prev = /(\d+(?:\.\d+)?)(?!.*\d)/s.exec(before); const next = /^(\d+(?:\.\d+)?)/.exec(after);
    if (!prev || !next) return text;
    const prevUnit = UNIT_AFTER.exec(before.slice(prev.index + prev[0].length)), nextUnit = UNIT_AFTER.exec(after.slice(next[0].length));
    let rest = after.slice(next[0].length + (nextUnit ? nextUnit[0].length : 0));
    if (/\bmaak er\s*$/i.test(m[0])) rest = rest.replace(/^\s*van\b/i, '');
    const head = before.slice(0, prev.index) + next[1] + before.slice(prev.index + prev[0].length) + (!prevUnit && nextUnit ? nextUnit[0] : '');
    text = (head + rest).replace(/\s+([,.!?])/g, '$1');
  }
  return text;
}

/** The normalised form (see the file comment): fillers out, numbers as digits, clock idioms as H:MM, the last of a self-correction. */
export function normalizeSpoken(text: string): string {
  let t = text.replace(/\s+/g, ' ').trim();
  t = t.replace(WAKE, '').replace(FILLER_PHRASE, '').replace(FILLER, m => m.startsWith(',') ? ' ' : '');
  t = quarters(t);
  t = numberWords(t);
  t = fractions(t);
  // "5,000 steps" is five thousand (three digits after the comma); "1,5 liter" is one and a half.
  t = t.replace(/\b(\d{1,3}),(\d{3})\b(?!,\d)/g, '$1$2').replace(/\b(\d+),(\d{1,2})\b/g, '$1.$2');
  t = clocks(t);
  t = corrections(t);
  return t.replace(/\s+([,.!?])/g, '$1').replace(/\s{2,}/g, ' ').trim();
}
/** Whether the normalised form differs from the words (so a caller can tell a spoken reading happened). */
export const spokenDiffers = (text: string): boolean => normalizeSpoken(text) !== text.replace(/\s+/g, ' ').trim();
