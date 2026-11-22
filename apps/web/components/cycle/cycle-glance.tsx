'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE, type Flow} from '../../lib/cycle/store';
import {cycleGlance, cycleHistory, type GlanceDay} from '../../lib/cycle/history';
import {wordLabel} from '../../lib/cycle/words';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AV lane 2 (r5-body; Clue's cycle overviews; LEDGER #381): "A cycle at a glance" — one cycle as a row of its days,
 * each marked with its flow and whether words or a note were logged, with the same cycle days of up to five earlier cycles
 * below it, and that cycle day by day in words. Marks carry letters as well as colour (L, M, H; a dot for words). A look
 * back only, never a forecast: a cycle still going ends today. Its own chunk, loaded when the fold opens.
 */
const FLOW_LETTER: Record<Flow, string> = {light: 'L', medium: 'M', heavy: 'H'}, FLOW_WORD: Record<Flow, string> = {light: 'Light flow', medium: 'Medium flow', heavy: 'Heavy flow'};
export default function CycleGlance({today}: {today: string}) {
  const rec = useDeviceRecord(CYCLE), id = useId(), [chosen, setChosen] = useState<string | null>(null);
  const cycles = useMemo(() => rec.loaded ? cycleHistory(rec.data, today).filter(c => !c.pause) : [], [rec.loaded, rec.data, today]);
  const start = cycles.some(c => c.start === chosen) ? chosen! : cycles[0]?.start;
  const rows = useMemo(() => rec.loaded && start ? cycleGlance(rec.data, today, start) : [], [rec.loaded, rec.data, today, start]);
  if (!rec.loaded) return <p className="fine">Reading your cycles…</p>;
  if (!rows.length) return <p className="fine">Nothing to show yet. Once you log a period, each cycle shows here as a row of its days, with the same days of earlier cycles below it.</p>;
  const said = (d: GlanceDay) => [d.flow ? FLOW_WORD[d.flow] : null, ...d.words.map(w => wordLabel(rec.data, w)), d.note ? 'a note' : null].filter(Boolean).join(', ') || 'nothing logged';
  const width = Math.max(...rows.map(r => r.days.length)), first = rows[0]!;
  return <div className="cycle-glance">
    <label className="field"><span>Cycle</span>
      <select value={start} onChange={e => setChosen(e.target.value)}>{cycles.map(c => <option key={c.start} value={c.start}>{`From ${formatDate(c.start)} (${c.complete ? `${c.length} days` : `${c.length} days so far`})`}</option>)}</select>
    </label>
    <p className="fine" id={`${id}-key`}>Key: L light, M medium, H heavy flow; a dot means words or a note were logged. The rows below the first are the same days of your earlier cycles.</p>
    <div className="cycle-glance-wrap" role="region" aria-label="A cycle at a glance, table" aria-describedby={`${id}-key`} tabIndex={0}>
      <table className="cycle-glance-table">
        <caption className="sr-only">The cycle from {formatDate(first.start)}, then earlier cycles, by cycle day</caption>
        <thead><tr><th scope="col">Cycle</th>{Array.from({length: width}, (_, i) => <th key={i} scope="col"><span className="sr-only">Day </span>{i + 1}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.start}>
          <th scope="row">{formatDate(r.start, {year: false})}</th>
          {Array.from({length: width}, (_, i) => { const d = r.days[i]; if (!d) return <td key={i} className="cycle-cell is-none"><span className="sr-only">no day</span></td>;
            return <td key={i} className="cycle-cell" data-flow={d.flow ?? undefined}><span aria-hidden="true">{d.flow ? FLOW_LETTER[d.flow] : ''}{d.words.length || d.note ? <i className="cycle-dot">•</i> : ''}</span><span className="sr-only">{said(d)}</span></td>; })}
        </tr>)}</tbody>
      </table>
    </div>
    <details className="cycle-recent"><summary>The cycle from {formatDate(first.start)}, day by day</summary>
      <ul>{first.days.filter(d => d.flow || d.words.length || d.note).map(d => <li key={d.n}><strong>Day {d.n}</strong> ({formatDate(d.date, {year: false})}): {said(d)}</li>)}</ul>
      {!first.days.some(d => d.flow || d.words.length || d.note) && <p className="fine">Nothing logged on these days.</p>}
    </details>
    <p className="fine">A look back at what you logged, never a forecast of the days ahead.</p>
  </div>;
}
