'use client';
import {useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE} from '../../lib/cycle/store';
import {cycleHistory, cycleStats, setLeftOut, type PastCycle, type Spread} from '../../lib/cycle/history';
import {formatDate, formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (r5-body; Clue's Analysis and "exclude a cycle"; LEDGER #379, #382): "Your cycles" in the cycle log —
 * each past cycle with its first day, its length and its period's length, the average cycle and period and how much they
 * vary, as a list or a table; "Leave out of the averages" on any cycle (the estimate then reads the others). A look back
 * only, never a forecast. Its own chunk, loaded when the fold opens.
 */
const days = (n: number) => `${formatNumber(n, {maximumFractionDigits: 1})} ${n === 1 ? 'day' : 'days'}`;
const spreadWords = (s: Spread) => s.count < 2 ? 'from 1' : `${s.shortest === s.longest ? `all ${days(s.shortest)}` : `${days(s.shortest)} to ${days(s.longest)}, so they vary by ${days(s.longest - s.shortest)}`}; from ${s.count}`;
function cycleWords(c: PastCycle): string {
  if (c.pause) return `a pause in logging (${days(c.length)} to the next period), not counted as a cycle`;
  return c.complete ? days(c.length) : `${days(c.length)} so far (still going)`;
}
export default function CycleHistory({today}: {today: string}) {
  const rec = useDeviceRecord(CYCLE), [view, setView] = useState<'list' | 'table'>('list'), [said, setSaid] = useState('');
  const history = useMemo(() => rec.loaded ? cycleHistory(rec.data, today) : [], [rec.loaded, rec.data, today]);
  const stats = useMemo(() => cycleStats(history), [history]);
  if (!rec.loaded) return <p className="fine">Reading your cycles…</p>;
  if (!history.length) return <p className="fine">No cycle yet. Tap a flow on each day of your period; each period you log starts a cycle, and its length shows here once the next one begins.</p>;
  const leave = (c: PastCycle, out: boolean) => {
    try { rec.update(r => setLeftOut(r, c.start, out)); setSaid(out ? `The cycle from ${formatDate(c.start)} is left out of the averages and the estimate.` : `The cycle from ${formatDate(c.start)} is back in the averages.`); }
    catch { setSaid('Not saved on this device. Nothing was changed.'); }
  };
  const toggle = (c: PastCycle) => <button type="button" className="quiet cycle-leave" aria-pressed={c.leftOut} disabled={rec.unreadable} aria-label={`Leave the cycle from ${formatDate(c.start)} out of the averages`} onClick={() => leave(c, !c.leftOut)}>{c.leftOut ? 'Left out' : 'Leave out'}</button>;
  return <div className="cycle-history">
    <dl className="cycle-stats">
      <div><dt>Average cycle</dt><dd>{stats.cycle ? <><strong>{days(stats.cycle.average)}</strong> <span className="fine">({spreadWords(stats.cycle)} {stats.cycle.count === 1 ? 'cycle' : 'cycles'})</span></> : <span className="fine">Shows once one cycle is complete (the next period logged).</span>}</dd></div>
      <div><dt>Average period</dt><dd>{stats.period ? <><strong>{days(stats.period.average)}</strong> <span className="fine">({stats.period.count < 2 ? 'from 1 period' : `${stats.period.shortest === stats.period.longest ? `all ${days(stats.period.shortest)}` : `${days(stats.period.shortest)} to ${days(stats.period.longest)}`}; from ${stats.period.count} periods`})</span></> : <span className="fine">Shows once a period is over.</span>}</dd></div>
    </dl>
    {stats.leftOut > 0 && <p className="fine">{stats.leftOut === 1 ? '1 cycle is' : `${stats.leftOut} cycles are`} left out of the averages and the estimate, as you chose.</p>}
    <div className="cycle-view" role="group" aria-label="Show your cycles as">
      <button type="button" className="secondary" aria-pressed={view === 'list'} onClick={() => setView('list')}>List</button>
      <button type="button" className="secondary" aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
    </div>
    {view === 'list'
      ? <ul className="cycle-history-list">{history.map(c => <li key={c.start}>
          <span><strong>{formatDate(c.start)}</strong>: {cycleWords(c)}; period {days(c.periodLength)}{c.periodSoFar ? ' so far' : ''}.{c.leftOut ? ' Left out of the averages.' : ''}</span>
          {!c.pause && toggle(c)}
        </li>)}</ul>
      : <div className="cycle-table-wrap" role="region" aria-label="Your cycles, table" tabIndex={0}><table className="cycle-table">
          <caption className="sr-only">Your cycles, newest first</caption>
          <thead><tr><th scope="col">Began</th><th scope="col">Cycle</th><th scope="col">Period</th><th scope="col">Averages</th></tr></thead>
          <tbody>{history.map(c => <tr key={c.start}>
            <th scope="row">{formatDate(c.start)}</th>
            <td>{c.pause ? 'A pause' : c.complete ? days(c.length) : `${days(c.length)} so far`}</td>
            <td>{days(c.periodLength)}{c.periodSoFar ? ' so far' : ''}</td>
            <td>{c.pause ? 'Not a cycle' : toggle(c)}</td>
          </tr>)}</tbody>
        </table></div>}
    <p className="cycle-status" role="status" aria-live="polite">{said}</p>
    <p className="fine">A look back at the days you logged, not a forecast. Leave out a cycle that does not fit how you usually are, for example after an illness or a long trip; it stays listed.</p>
  </div>;
}
