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
const TICKS = Array.from({length: 60}, (_, i) => i);
/** A ring gauge (art direction "AM-2" D): a tick bezel, a faint track, the value arc in a gradient with a lit dot at its end, the figure in the middle. */
export function ReadoutRing({gauge}: {gauge: Gauge}) {
  const id = `ncx-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`, part = Math.max(0, Math.min(1, gauge.part));
  const angle = part * 2 * Math.PI - Math.PI / 2, x = 50 + 36 * Math.cos(angle), y = 50 + 36 * Math.sin(angle);
  return <span className="ncx-ring" aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <defs><linearGradient id={id} x1="0" x2="1" y1="1" y2="0"><stop offset="0" className="ncx-ring-0"/><stop offset="1" className="ncx-ring-1"/></linearGradient></defs>
      <g className="ncx-ring-ticks">{TICKS.map(i => <line key={i} x1="50" y1={i % 5 ? 3 : 1} x2="50" y2="6.5" transform={`rotate(${i * 6} 50 50)`}/>)}</g>
      <circle className="ncx-ring-track" cx="50" cy="50" r="36"/>
      {part > 0 && <circle className="ncx-ring-arc" cx="50" cy="50" r="36" stroke={`url(#${id})`} pathLength="100" strokeDasharray={`${Math.max(0.5, part * 100)} 100`} transform="rotate(-90 50 50)"/>}
      {part > 0 && part < 1 && <circle className="ncx-ring-lead" cx={Math.round(x * 10) / 10} cy={Math.round(y * 10) / 10} r="4.2"/>}
    </svg>
    {/* The figure is drawn from an attribute (ncx-console.css), so the read-out's own text still begins with its words
        (tests/grok53/ai/l7-fifth-answers.spec.ts reads the turn's text; the ring is decoration and says nothing new). */}
    <span className="ncx-ring-figure" data-long={gauge.label.length > 4 ? '' : undefined} data-label={gauge.label}/>
  </span>;
}
