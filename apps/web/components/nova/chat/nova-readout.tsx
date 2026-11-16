import {useId, type ReactNode} from 'react';

/**
 * Session AM-2 (conversation console): what makes an answer in NOVA's conversation a read-out, in the language of the
 * stage's answer card (components/nova/stage/stage-parts.tsx `lit`).
 * - `litFigures`: the figures in a line of words (a number with its separators, a currency sign before it, a percent
 *   sign after it) are lit; the characters are unchanged, the mark-up is for the eye only.
 * - `gaugeOf` and `ReadoutRing`: an answer made on this device that says "4 of 7" or "62%" draws that one figure as a
 *   ring beside its words. Only for answers ZIGoals made itself from the person's records, never from a model's words
 *   (the caller decides), and only when the words hold a real part of a whole. Decoration: the words say the figures
 *   (a ring that shows a share as a percentage rounds it; the exact figures stay in the words beside it).
 * Session AM-3 (round 7): every on-device answer with a figure is an instrument (`ReadoutInstrument`): the ring with the
 * words it was read from and a segmented bar, or, for an answer that opens with a count ("7 habits:"), a dial with that
 * count and a tally (`countOf`). Still only figures that stand in the answer's own words.
 */
const FIGURE = /((?:[$€£]\s?)?\d(?:[\d.,:]*\d)?(?:\s?%)?)/;
export const litFigures = (words: string): ReactNode => words.split(FIGURE).map((part, i) => i % 2 ? <b key={i} className="ncx-fig">{part}</b> : part);

export type Gauge = {part: number; label: string};
// "4 of 7", "46.31 EUR of 200.00 EUR", "3 van 5": a number, at most one short unit word, "of", a number.
const PART_OF = /(\d[\d,]*(?:\.\d+)?)\s+(?:[A-Za-z]{1,4}\s+)?(?:of|van)\s+(?:[$€£]\s?)?(\d[\d,]*(?:\.\d+)?)/i, PERCENT = /(\d+(?:\.\d+)?)\s?%/;
const number = (text: string) => Number(text.replace(/,/g, ''));
/** The first part of a whole the words name ("4 of 7", "62%"), or null when they name none. */
export function gaugeOf(words: string): Gauge | null {
  const of = PART_OF.exec(words);
  if (of) {
    const a = number(of[1]!), b = number(of[2]!);
    // Short figures stand in the ring as they are written ("4/7"); longer ones as their share ("23%").
    if (Number.isFinite(a) && Number.isFinite(b) && b > 0 && a >= 0 && a <= b) return {part: a / b, label: of[1]!.length + of[2]!.length <= 4 ? `${of[1]}/${of[2]}` : `${Math.round(a / b * 100)}%`};
  }
  const pct = PERCENT.exec(words);
  if (pct) {
    const p = Number(pct[1]);
    if (Number.isFinite(p) && p >= 0 && p <= 100) return {part: p / 100, label: `${pct[1]}%`};
  }
  return null;
}
/**
 * Session AM-3 (round 7, the console's read-outs): the words `gaugeOf` reads its part of a whole from, exactly as they
 * are written ("195.80 EUR of 200.00 EUR"), for the instrument's caption; null when the ring was read from a
 * percentage (the ring's own figure says it all). Nothing is computed here: the same pattern, the same first match.
 */
// The same pattern as PART_OF, with the whole's own unit after it when it repeats the part's ("195.80 EUR of 200.00 EUR").
const PART_OF_WORDS = /(\d[\d,]*(?:\.\d+)?)\s+(?:([A-Za-z]{1,4})\s+)?(?:of|van)\s+(?:[$€£]\s?)?(\d[\d,]*(?:\.\d+)?)(?:\s+\2\b)?/i;
export function gaugeWords(words: string): string | null {
  const of = PART_OF_WORDS.exec(words);
  if (!of) return null;
  const a = number(of[1]!), b = number(of[3]!);
  return Number.isFinite(a) && Number.isFinite(b) && b > 0 && a >= 0 && a <= b ? of[0].replace(/\s+/g, ' ').trim() : null;
}
export type Count = {figure: string; unit: string};
// An answer that opens with a count: "7 habits:", "4 bill reminders; next due:", "3 notes in your inbox."
const COUNT = /^\s*(\d{1,4})\s+([A-Za-z][A-Za-z' -]{1,30}?)\s*(?=[:;.,(\n]|$)/;
/** The count an answer opens with and the words it counts, both as written; null when the answer opens with anything else. */
export function countOf(words: string): Count | null {
  const m = COUNT.exec(words);
  return m ? {figure: m[1]!, unit: m[2]!.trim()} : null;
}
const TICKS = Array.from({length: 60}, (_, i) => i);
/** The figure and its unit apart, for the eye only ("98" + "%", "4" + "/7"): the same characters in the same order. */
const split = (label: string): [string, string] => { const at = label.search(/[%/]/); return at > 0 ? [label.slice(0, at), label.slice(at)] : [label, '']; };
/**
 * A ring gauge (art direction "AM-2" D; round 7: the references' weight — a tick bezel, a hairline orbit, a thick track,
 * the value arc in a two-tone gradient with a lit dot at its end, the figure in light, wide numerals). With no `part`
 * (a count) the dial is whole: the orbit and a dashed inner ring, no arc.
 */
export function ReadoutRing({gauge}: {gauge: {part: number | null; label: string}}) {
  const id = `ncx-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`, part = gauge.part === null ? null : Math.max(0, Math.min(1, gauge.part));
  const angle = (part ?? 0) * 2 * Math.PI - Math.PI / 2, x = 50 + 36 * Math.cos(angle), y = 50 + 36 * Math.sin(angle), [figure, unit] = split(gauge.label);
  return <span className="ncx-ring" data-kind={part === null ? 'count' : 'share'} aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <defs><linearGradient id={id} x1="0" x2="1" y1="1" y2="0"><stop offset="0" className="ncx-ring-0"/><stop offset="1" className="ncx-ring-1"/></linearGradient></defs>
      <g className="ncx-ring-ticks">{TICKS.map(i => <line key={i} x1="50" y1={i % 5 ? 3 : 1} x2="50" y2="6.5" transform={`rotate(${i * 6} 50 50)`}/>)}</g>
      <circle className="ncx-ring-orbit" cx="50" cy="50" r="43.5"/>
      <circle className="ncx-ring-track" cx="50" cy="50" r="36"/>
      {part === null && <circle className="ncx-ring-whole" cx="50" cy="50" r="36" stroke={`url(#${id})`}/>}
      {part === null && <circle className="ncx-ring-dash" cx="50" cy="50" r="28.5"/>}
      {part !== null && part > 0 && <circle className="ncx-ring-arc" cx="50" cy="50" r="36" stroke={`url(#${id})`} pathLength="100" strokeDasharray={`${Math.max(0.5, part * 100)} 100`} transform="rotate(-90 50 50)"/>}
      {part !== null && part > 0 && part < 1 && <circle className="ncx-ring-lead" cx={Math.round(x * 10) / 10} cy={Math.round(y * 10) / 10} r="4.2"/>}
    </svg>
    {/* The figure is drawn from an attribute (ncx-console.css), so the read-out's own text still begins with its words
        (tests/grok53/ai/l7-fifth-answers.spec.ts reads the turn's text; the ring is decoration and says nothing new). */}
    <span className="ncx-ring-figure" data-long={gauge.label.length > 3 ? '' : undefined} data-label={figure} data-unit={unit || undefined}/>
  </span>;
}
/** The bar's segments: a share lights its part of twenty-four; a count is a tally of its own pips (up to twenty-four). */
const SEGMENTS = 24;
/**
 * Session AM-3 (round 7): an answer's instrument — the ring (a share) or the dial (a count) and, beside it, the words the
 * figure was read from as a caption, a segmented bar (the same share, or the count as a tally) and a tick scale.
 * Decoration (aria-hidden; every word is generated content): the answer's own words under it say all of it. Only for an
 * answer ZIGoals made on this device (the caller decides), and only from figures in the answer's own words.
 */
export function ReadoutInstrument({gauge, caption, count}: {gauge: Gauge | null; caption?: string | null; count?: Count | null}) {
  if (!gauge && !count) return null;
  const tally = count ? Number(count.figure) : 0, lit = gauge ? Math.max(gauge.part > 0 ? 1 : 0, Math.round(Math.max(0, Math.min(1, gauge.part)) * SEGMENTS)) : Math.min(SEGMENTS, tally);
  const segments = gauge ? SEGMENTS : lit;
  return <div className="ncx-inst" data-kind={gauge ? 'share' : 'count'} aria-hidden="true">
    <ReadoutRing gauge={gauge ?? {part: null, label: count!.figure}}/>
    <span className="ncx-inst-scale">
      {(gauge ? caption : count!.unit) && <span className="ncx-inst-cap" data-label={gauge ? caption! : count!.unit}/>}
      {segments > 0 && (gauge || tally <= SEGMENTS) && <span className="ncx-bar" data-full={lit >= segments ? '' : undefined}>{Array.from({length: segments}, (_, i) => <i key={i} data-lit={i < lit ? '' : undefined} data-cap={i === lit - 1 ? '' : undefined}/>)}</span>}
      <span className="ncx-inst-ruler"/>
    </span>
  </div>;
}
