'use client';
import {useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import type {Report} from '../../lib/clinician-report/build';
import {weightChangeText, weightText, type WeightUnit} from '../../lib/health-units';
import {formatClock, formatDate, formatDateTime, formatNumber} from '../../lib/visual-format';
import {formatMinutes} from '../../lib/zone-time';

/**
 * Session AK (lane S, item 14): the report itself, a print page. Every value is text React escapes; the charts are inline
 * SVG in the page's own text colour (black on paper) told apart by line style and marker shape, never colour alone; every
 * chart has a table beside it with the same values. A missing day is a gap, never zero.
 */
const W = 640, H = 150, PAD = {top: 12, right: 8, bottom: 22, left: 36};
const pw = W - PAD.left - PAD.right, ph = H - PAD.top - PAD.bottom;
const day = (d: string) => formatDate(d, {year: false});
const pct = (v: number) => `${Math.round(v * 100)}%`;

function Axis({labels}: {labels: {at: number; text: string}[]}) {
  return <g className="report-axis">
    <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ph} y2={PAD.top + ph}/>
    {labels.map(l => <text key={`${l.at}-${l.text}`} x={l.at} y={H - 6} textAnchor="middle">{l.text}</text>)}
  </g>;
}
const dateLabels = (dates: readonly string[], x: (i: number) => number) => { const n = dates.length, every = Math.max(1, Math.ceil(n / 6)); return dates.flatMap((d, i) => i % every === 0 || i === n - 1 ? [{at: x(i), text: day(d)}] : []).filter((l, i, all) => i === all.length - 1 || all[i + 1]!.at - l.at > 60); };

function SleepChart({series, goal}: {series: {date: string; asleep: number | null}[]; goal: number | null}) {
  const max = Math.max(9 * 60, goal ?? 0, ...series.map(p => p.asleep ?? 0)), step = pw / Math.max(1, series.length), bw = Math.max(1, step * 0.7);
  const x = (i: number) => PAD.left + i * step + step / 2, y = (m: number) => PAD.top + ph - m / max * ph;
  const logged = series.filter(p => p.asleep !== null).length;
  return <svg className="report-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Time asleep per night, ${logged} of ${series.length} nights logged${goal ? `, goal ${formatMinutes(goal)}` : ''}.`}>
    {[0, 240, 480].filter(m => m <= max).map(m => <g key={m} className="report-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(m)} y2={y(m)}/><text x={PAD.left - 4} y={y(m) + 4} textAnchor="end">{m / 60} h</text></g>)}
    {series.map((p, i) => p.asleep === null ? null : <rect key={p.date} className="report-bar" x={x(i) - bw / 2} y={y(p.asleep)} width={bw} height={PAD.top + ph - y(p.asleep)}/>)}
    {goal && <line className="report-goal" x1={PAD.left} x2={W - PAD.right} y1={y(goal)} y2={y(goal)}/>}
    <Axis labels={dateLabels(series.map(p => p.date), x)}/>
  </svg>;
}
function ScaleChart({series}: {series: {date: string; mood: number | null; energy: number | null}[]}) {
  const step = pw / Math.max(1, series.length - 1 || 1), x = (i: number) => PAD.left + (series.length === 1 ? pw / 2 : i * step), y = (v: number) => PAD.top + ph - (v - 1) / 4 * ph;
  const path = (key: 'mood' | 'energy') => { let d = '', open = false; series.forEach((p, i) => { const v = p[key]; if (v === null) { open = false; return; } d += `${open ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; open = true; }); return d; };
  return <svg className="report-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Mood (solid line, circles) and energy (dashed line, squares) per day, 1 to 5; gaps are days without a rating.">
    {[1, 3, 5].map(v => <g key={v} className="report-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)}/><text x={PAD.left - 4} y={y(v) + 4} textAnchor="end">{v}</text></g>)}
    <path className="report-line" d={path('mood')}/><path className="report-line is-dashed" d={path('energy')}/>
    {series.map((p, i) => p.mood === null ? null : <circle key={`m${p.date}`} className="report-dot" cx={x(i)} cy={y(p.mood)} r={2.6}/>)}
    {series.map((p, i) => p.energy === null ? null : <rect key={`e${p.date}`} className="report-dot is-open" x={x(i) - 2.4} y={y(p.energy) - 2.4} width={4.8} height={4.8}/>)}
    <Axis labels={dateLabels(series.map(p => p.date), x)}/>
  </svg>;
}
function WeightChart({rows, unit}: {rows: {date: string; grams: number}[]; unit: WeightUnit}) {
  const lo = Math.min(...rows.map(r => r.grams)), hi = Math.max(...rows.map(r => r.grams)), span = Math.max(1000, hi - lo), base = lo - span * 0.1, top = hi + span * 0.1;
  const t0 = Date.parse(`${rows[0]!.date}T12:00:00Z`), t1 = Date.parse(`${rows.at(-1)!.date}T12:00:00Z`), x = (d: string) => PAD.left + (t1 === t0 ? pw / 2 : (Date.parse(`${d}T12:00:00Z`) - t0) / (t1 - t0) * pw), y = (g: number) => PAD.top + ph - (g - base) / (top - base) * ph;
  return <svg className="report-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Weight, ${rows.length} readings, from ${weightText(rows[0]!.grams, unit)} to ${weightText(rows.at(-1)!.grams, unit)}.`}>
    {[lo, hi].map(g => <g key={g} className="report-grid"><line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)}/><text x={PAD.left - 4} y={y(g) + 4} textAnchor="end">{weightText(g, unit).split(' ')[0]}</text></g>)}
    <path className="report-line" d={rows.map((r, i) => `${i ? 'L' : 'M'}${x(r.date).toFixed(1)},${y(r.grams).toFixed(1)}`).join('')}/>
    {rows.map(r => <circle key={r.date} className="report-dot" cx={x(r.date)} cy={y(r.grams)} r={2.6}/>)}
    <Axis labels={[{at: x(rows[0]!.date), text: day(rows[0]!.date)}, ...(rows.length > 1 ? [{at: x(rows.at(-1)!.date), text: day(rows.at(-1)!.date)}] : [])]}/>
  </svg>;
}
/**
 * Session AV (q3 #48, axe scrollable-region-focusable): a table that is wider than the sheet (a phone at 390 px) scrolls
 * sideways in its own frame, and that frame is then a named stop in the Tab order so the keyboard can scroll it too.
 */
function Wide({label, children}: {label: string; children: ReactNode}) {
  const ref = useRef<HTMLDivElement>(null), [wide, setWide] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const check = () => setWide(el.scrollWidth > el.clientWidth + 1);
    check();
    if (typeof ResizeObserver === 'undefined') return;
    const watch = new ResizeObserver(check); watch.observe(el);
    return () => watch.disconnect();
  }, []);
  return <div ref={ref} className="report-table" {...(wide ? {tabIndex: 0, role: 'group', 'aria-label': `${label} (scrolls sideways)`} : {})}>{children}</div>;
}
const More = ({n, what}: {n: number; what: string}) => n > 0 ? <p className="report-more">{n} more {what} in these dates are not listed here.</p> : null;

export function ReportDocument({report: r, weightUnit, showcase}: {report: Report; weightUnit: WeightUnit; showcase: boolean}) {
  const none = <p className="report-none">Nothing logged in these dates.</p>;
  return <article className="report-sheet" aria-label="Report">
    <header className="report-head">
      <h1>Health log summary</h1>
      <p><strong>{formatDate(r.range.from)} – {formatDate(r.range.to)}</strong> ({r.range.days} {r.range.days === 1 ? 'day' : 'days'}) · generated {formatDateTime(new Date())}</p>
      <p>From the person&rsquo;s own log in ZIGoals: entered by them or imported from their own devices and apps. Not a medical record; it holds no diagnosis and no advice. Days without an entry are left blank, never counted as zero.</p>
      {showcase && <p className="report-showcase"><strong>Showcase: fictional example data, not a real person&rsquo;s log.</strong></p>}
    </header>
    {r.sleep && <section className="report-section" aria-labelledby="report-sleep"><h2 id="report-sleep">Sleep</h2>
      {r.sleep.nights ? <>
        <ul className="report-facts"><li>Nights logged: {r.sleep.nights} of {r.range.days}</li><li>Asleep, average: {formatMinutes(r.sleep.avgAsleep!)}{r.sleep.estimated ? ' (some estimated from time in bed)' : ''}</li><li>Bedtime · wake time, average: {formatClock(r.sleep.avgBed!)} · {formatClock(r.sleep.avgWake!)}</li><li>Own quality rating, average: {r.sleep.avgQuality !== null ? `${formatNumber(r.sleep.avgQuality)} of 5` : 'not rated'}</li>{r.sleep.goal && <li>Own sleep goal: {formatMinutes(r.sleep.goal)}</li>}</ul>
        <SleepChart series={r.sleep.series} goal={r.sleep.goal}/>
        <p className="report-legend">Bars: time asleep per night{r.sleep.goal ? '; dashed line: the person’s goal' : ''}; gaps: nights not logged.</p>
        <Wide label="Nights"><table><thead><tr><th scope="col">Night ending</th><th scope="col">Bed → wake</th><th scope="col">Asleep</th><th scope="col">Quality</th><th scope="col">Tags</th></tr></thead>
          <tbody>{r.sleep.rows.map((n, i) => <tr key={`${n.date}-${i}`}><th scope="row">{day(n.date)}</th><td>{formatClock(n.bed)} → {formatClock(n.wake)}</td><td>{formatMinutes(n.asleep)}{n.estimated ? ' (est.)' : ''}</td><td>{n.quality !== null ? `${n.quality} of 5` : '—'}</td><td>{n.tags.join(', ') || '—'}</td></tr>)}</tbody></table></Wide>
        <More n={r.sleep.more} what="nights"/>
      </> : none}
    </section>}
    {r.mood && <section className="report-section" aria-labelledby="report-mood"><h2 id="report-mood">Mood and energy</h2>
      {r.mood.moodDays || r.mood.energyDays ? <>
        <ul className="report-facts"><li>Mood (1 hard – 5 great): {r.mood.moodDays ? `average ${formatNumber(r.mood.avgMood!)} over ${r.mood.moodDays} days` : 'not rated'}</li><li>Energy (1 drained – 5 full of energy): {r.mood.energyDays ? `average ${formatNumber(r.mood.avgEnergy!)} over ${r.mood.energyDays} days` : 'not rated'}</li></ul>
        <ScaleChart series={r.mood.series}/>
        <p className="report-legend">Solid line with circles: mood. Dashed line with squares: energy. Gaps: days without a rating.</p>
        {r.mood.words.length > 0 && <><h3>Feeling words picked ({r.mood.wordDays} days)</h3><ul className="report-facts">{r.mood.words.map(w => <li key={w.id}>{w.title}: {w.count} {w.count === 1 ? 'day' : 'days'} ({w.examples.join(', ')})</li>)}</ul></>}
      </> : none}
    </section>}
    {r.notes && <section className="report-section" aria-labelledby="report-notes"><h2 id="report-notes">Notes with mood and sleep</h2>
      {r.notes.rows.length ? <><Wide label="Notes"><table><thead><tr><th scope="col">Day</th><th scope="col">With</th><th scope="col">Note, as written</th></tr></thead>
        <tbody>{r.notes.rows.map((n, i) => <tr key={`${n.date}-${n.kind}-${i}`}><th scope="row">{day(n.date)}</th><td>{n.kind === 'mood' ? 'Mood' : 'Night'}</td><td className="report-note">{n.text}</td></tr>)}</tbody></table></Wide><More n={r.notes.more} what="notes"/></> : none}
    </section>}
    {r.weight && <section className="report-section" aria-labelledby="report-weight"><h2 id="report-weight">Weight</h2>
      {r.weight.rows.length ? <>
        <ul className="report-facts"><li>Readings: {r.weight.rows.length + r.weight.more}</li><li>First · last: {weightText(r.weight.first!, weightUnit)} · {weightText(r.weight.last!, weightUnit)}</li>{r.weight.change !== null && <li>Change over the dates: {weightChangeText(r.weight.change, weightUnit)}</li>}</ul>
        {r.weight.rows.length > 1 && <WeightChart rows={r.weight.rows} unit={weightUnit}/>}
        <Wide label="Weight readings"><table><thead><tr><th scope="col">Day</th><th scope="col">Weight</th></tr></thead><tbody>{r.weight.rows.map(w => <tr key={w.date}><th scope="row">{day(w.date)}</th><td>{weightText(w.grams, weightUnit)}</td></tr>)}</tbody></table></Wide>
        <More n={r.weight.more} what="readings"/>
      </> : none}
    </section>}
    {r.habits && <section className="report-section" aria-labelledby="report-habits"><h2 id="report-habits">Habits</h2>
      {r.habits.rows.length ? <><Wide label="Habits"><table><thead><tr><th scope="col">Habit</th><th scope="col">Done</th><th scope="col">Scheduled</th><th scope="col">Share</th><th scope="col">Skipped</th></tr></thead>
        <tbody>{r.habits.rows.map((h, i) => <tr key={`${h.title}-${i}`}><th scope="row">{h.title}</th><td>{h.done}</td><td>{h.scheduled}</td><td>{h.share !== null ? pct(h.share) : '—'}</td><td>{h.skipped}</td></tr>)}</tbody></table></Wide>
        <More n={r.habits.more} what="habits"/></> : none}
    </section>}
    {/* Session AK (BUILD list 2 #4): "Your numbers", as typed; a lab value's verdict only against the range the person copied. */}
    {r.numbers && <section className="report-section" aria-labelledby="report-numbers"><h2 id="report-numbers">Your numbers</h2>
      {r.numbers.bp.length || r.numbers.labs.length ? <>
        <p>Typed by the person from their own readings and lab sheets. Ranges are the ones they copied from the sheet; ZIGoals sets none and gives no interpretation. Not a diagnosis.</p>
        {r.numbers.bp.length > 0 && <><h3>Blood pressure (mmHg)</h3><Wide label="Blood pressure readings"><table><thead><tr><th scope="col">Day</th><th scope="col">Reading</th><th scope="col">Pulse</th><th scope="col">Note</th></tr></thead>
          <tbody>{r.numbers.bp.map((b, i) => <tr key={`${b.date}-${i}`}><th scope="row">{day(b.date)}</th><td>{b.systolic}/{b.diastolic}</td><td>{b.pulse ?? '—'}</td><td className="report-note">{b.note ?? '—'}</td></tr>)}</tbody></table></Wide><More n={r.numbers.bpMore} what="readings"/></>}
        {r.numbers.labs.length > 0 && <><h3>Lab values</h3><Wide label="Lab values"><table><thead><tr><th scope="col">Day</th><th scope="col">Name</th><th scope="col">Value</th><th scope="col">Range copied</th><th scope="col">Against that range</th></tr></thead>
          <tbody>{r.numbers.labs.map((l, i) => <tr key={`${l.date}-${l.name}-${i}`}><th scope="row">{day(l.date)}</th><td>{l.name}</td><td>{formatNumber(l.value)} {l.unit}</td><td>{l.range ?? 'none copied'}</td><td>{l.verdict ?? '—'}</td></tr>)}</tbody></table></Wide><More n={r.numbers.labsMore} what="values"/></>}
      </> : none}
    </section>}
    {/* Session AV (owner follow-up 1, F-REPORT-MORE): symptoms and factors as rated, supplements and medication as logged. */}
    {r.symptoms && <section className="report-section" aria-labelledby="report-symptoms"><h2 id="report-symptoms">Symptoms and factors</h2>
      {r.symptoms.rows.length ? <><p>Rated by the person each day from None to Strong (0 to 3). Days without a rating are left out, never counted as None.</p>
        <Wide label="Symptom ratings"><table><thead><tr><th scope="col">Symptom or factor</th><th scope="col">Days rated</th><th scope="col">Above None</th><th scope="col">Strong</th><th scope="col">Average</th></tr></thead>
          <tbody>{r.symptoms.rows.map((s, i) => <tr key={`${s.name}-${i}`}><th scope="row" className="report-name">{s.name}{s.kind === 'factor' ? ' (factor)' : ''}</th><td>{s.rated}</td><td>{s.noted}</td><td>{s.strong}</td><td>{s.average === null ? '—' : `${formatNumber(s.average)} (${s.averageWord})`}</td></tr>)}</tbody></table></Wide>
        {/* Session AV lane 2 (food; q3 #48 check 8): each symptom's level over the range, a dot per rated day (none for a day not rated). */}
        {(r.symptoms.series ?? []).map(s => { const n = s.levels.length, x = (i: number) => n > 1 ? 4 + i * 292 / (n - 1) : 150, y = (v: number) => 44 - v * 13, rated = s.levels.flatMap((v, i) => v === null ? [] : [[i, v] as const]);
          return <figure key={s.name} className="report-symptom-chart"><svg viewBox="0 0 300 48" width="100%" height="48" role="img" aria-label={`${s.name}: ${rated.length} ${rated.length === 1 ? 'day' : 'days'} rated, highest ${['None', 'Mild', 'Moderate', 'Strong'][Math.max(...rated.map(([, v]) => v))] ?? 'None'}`} preserveAspectRatio="none">
            <line x1="4" x2="296" y1="44" y2="44" stroke="currentColor" strokeOpacity=".3"/>
            {rated.length > 1 && <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={rated.map(([i, v]) => `${x(i)},${y(v)}`).join(' ')}/>}
            {rated.map(([i, v]) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="currentColor"/>)}
          </svg><figcaption className="fine">{s.name}, None (0) to Strong (3), {r.range.days} days</figcaption></figure>; })}</> : none}
    </section>}
    {/* Session AV lane 2 (food, LEDGER #98): the food diary's averages for the range. */}
    {r.nutrition && <section className="report-section" aria-labelledby="report-nutrition"><h2 id="report-nutrition">Nutrition</h2>
      {r.nutrition.loggedDays ? <><p>From the food diary: {r.nutrition.loggedDays} {r.nutrition.loggedDays === 1 ? 'day' : 'days'} with food logged. Each average is over the days whose every entry gives that value; others are left out, never counted as 0. As logged, not measured.</p>
        <Wide label="Nutrition averages"><table><thead><tr><th scope="col">Nutrient</th><th scope="col">Average a day</th><th scope="col">Days counted</th></tr></thead>
          <tbody>{r.nutrition.rows.map(n => <tr key={n.name}><th scope="row" className="report-name">{n.name}</th><td>{n.average === null ? '—' : `${formatNumber(n.average)} ${n.unit}`}</td><td>{n.days}</td></tr>)}</tbody></table></Wide></> : none}
    </section>}
    {r.supplements && <section className="report-section" aria-labelledby="report-supplements"><h2 id="report-supplements">Supplements and medication</h2>
      {r.supplements.rows.length ? <><p>As the person wrote them and logged each dose. ZIGoals checks no dose and gives no advice.</p>
        <Wide label="Doses logged"><table><thead><tr><th scope="col">Name</th><th scope="col">Dose</th><th scope="col">Planned doses</th><th scope="col">Taken</th><th scope="col">Skipped</th><th scope="col">Not logged</th></tr></thead>
          <tbody>{r.supplements.rows.map((s, i) => <tr key={`${s.name}-${i}`}><th scope="row" className="report-name">{s.name}{s.kind === 'medication' ? ' (medication)' : ''}</th><td>{s.dose ?? '—'}</td><td>{s.planned ?? 'as needed'}</td><td>{s.taken}</td><td>{s.skipped}</td><td>{s.notLogged ?? '—'}</td></tr>)}</tbody></table></Wide></> : none}
    </section>}
    <footer className="report-foot"><p>Made on the person&rsquo;s own device with ZIGoals. Nothing in this report was uploaded.</p></footer>
  </article>;
}
