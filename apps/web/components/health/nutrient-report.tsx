'use client';
import {useState, type ReactNode} from 'react';
import {GlassBar} from '../progress/glass-progress';
import {useDeviceRecord} from '../ai/use-device-record';
import {HEALTH_VITAMINS} from '../../lib/health-vitamins/schema';
import {NUTRIENT_EXTRAS_RECORD} from '../../lib/health-vitamins/extras';
import {MICRO_TARGETS} from '../../lib/health-aa/micro';
import {nutrientAverages, nutrientDay, referenceShare, topSources, withData, type ReportContext, type ReportGroup, type ReportNutrient} from '../../lib/health-aa/nutrient-report';
import {formatNutrient, type HealthData} from '../../lib/health';
import {formatDate} from '../../lib/visual-format';
import {plural} from '../../lib/plural';
import {MAX_RANGE_DAYS, rangeOf} from '../../lib/health-aa/nutrient-range';
import {addLocalDays} from '../../lib/local-date';
import './health-aa.css';

/**
 * Session AK (task 4.4, COMPETITORS N2): the nutrient report, loaded when the person opens it from Micronutrients: the
 * day's totals or the 7-day averages of every nutrient the app knows (the seven, the vitamins and, where a source gave
 * them, magnesium, zinc, B1, B2, B3, B6 and omega-3), each against a reference value labelled general guidance, and
 * "Where it came from": the top five foods over 7, 30 or 90 days with their share and days. A nutrient with no value is
 * hidden; a day without one is never averaged as zero.
 */
const GROUPS: ReportGroup[] = ['Energy and macros', 'Carbs and fats', 'Minerals', 'Vitamins', 'More'];
export function NutrientReport({data, date}: {data: HealthData; date: string}) {
  const vitamins = useDeviceRecord(HEALTH_VITAMINS), extras = useDeviceRecord(NUTRIENT_EXTRAS_RECORD), micro = useDeviceRecord(MICRO_TARGETS);
  const ctx: ReportContext = {data, vitamins: vitamins.loaded && !vitamins.unreadable ? vitamins.data : {version: 1}, extras: extras.loaded && !extras.unreadable ? extras.data : {version: 1}, micro: micro.loaded && !micro.unreadable ? micro.data : {version: 1}};
  // Session AV (owner follow-up 1, F-NUTRIENT-RANGE; Cronometer): averages over 7, 30 or 90 days, or a range of the person's choosing.
  const [span, setSpan] = useState<'day' | 'week' | 30 | 90 | 'custom'>('day'), [from, setFrom] = useState(() => addLocalDays(date, -13)), [to, setTo] = useState(date), [open, setOpen] = useState<string | null>(null), [days, setDays] = useState<7 | 30 | 90>(7);
  const range = rangeOf(span, date, from, to);
  const all = span === 'day' ? nutrientDay(ctx, date).map(r => ({...r, value: r.total, note: r.entries > 0 && r.known < r.entries ? `from ${r.known} of ${r.entries} ${r.entries === 1 ? 'entry' : 'entries'}` : '' /* Session AL fourth pass (MO-014): neutral, as the tiles */}))
    // Session AV (q3 #47): an average is shown to one decimal of its own unit (131 g, not 130.997 g).
    : nutrientAverages(ctx, range.end, range.days).map(r => ({...r, value: r.average === null ? null : Math.round(r.average / r.scale * 10) * r.scale / 10, note: r.average === null ? '' : `average of ${r.daysWithValue} ${plural(r.daysWithValue, 'day')} with a value, of ${r.loggedDays} logged`}));
  const shown = withData(all.map(r => ({...r, total: r.value}))), hidden = all.length - shown.length;
  return <div className="health-rich" data-region="nutrient-report">
    <h3 id="nutrient-report-title">Nutrient report</h3>
    <div className="health-rich-row" role="group" aria-label="Report period"><button type="button" className="quiet" aria-pressed={span === 'day'} onClick={() => setSpan('day')}>This day</button><button type="button" className="quiet" aria-pressed={span === 'week'} onClick={() => setSpan('week')}>7-day average</button><button type="button" className="quiet" aria-pressed={span === 30} onClick={() => setSpan(30)}>30 days</button><button type="button" className="quiet" aria-pressed={span === 90} onClick={() => setSpan(90)}>90 days</button><button type="button" className="quiet" aria-pressed={span === 'custom'} onClick={() => setSpan('custom')}>Choose dates</button></div>
    {span === 'custom' && <div className="health-rich-row nutrient-range" role="group" aria-label="Dates to average">
      <label className="field"><span>From</span><input type="date" value={from} max={to} onChange={e => e.target.value && setFrom(e.target.value)}/></label>
      <label className="field"><span>To</span><input type="date" value={to} min={from} max={date} onChange={e => e.target.value && setTo(e.target.value)}/></label>
    </div>}
    {span !== 'day' && <p className="fine" role="status">Averages of {formatDate(range.start, {year: range.start.slice(0, 4) !== date.slice(0, 4) || range.end.slice(0, 4) !== date.slice(0, 4)})} to {formatDate(range.end, {year: range.start.slice(0, 4) !== range.end.slice(0, 4) || range.end.slice(0, 4) !== date.slice(0, 4)})} ({range.days} {plural(range.days, 'day')}){range.capped ? `; the first ${MAX_RANGE_DAYS} days up to “To”` : ''}.</p>}
    {shown.length === 0 ? <p className="health-empty-inline">{span === 'day' ? 'Nothing logged with nutrient values on this day yet.' : 'Log a few days and their averages appear here.'}</p> : GROUPS.map(group => {
      const rows = shown.filter(r => r.group === group); if (!rows.length) return null;
      return <section key={group} aria-label={group}><h4 style={{margin: '8px 0 6px'}}>{group}</h4><ul className="health-micro-list">{rows.map(r => <ReportRow key={r.key} row={r} value={r.value!} note={r.note} open={open === r.key} onToggle={() => setOpen(open === r.key ? null : r.key)}>
        {open === r.key && <Sources ctx={ctx} def={r} date={span === 'day' ? date : range.end} days={days} onDays={setDays} span={span === 'day' ? null : range.days} />}
      </ReportRow>)}</ul></section>;
    })}
    {hidden > 0 && <p className="fine">{hidden} {plural(hidden, 'nutrient')} with no values {span === 'day' ? 'on this day' : `in these ${range.days} days`} {hidden === 1 ? 'is' : 'are'} hidden: unknown is not zero.</p>}
    <p className="fine">Reference values are general guidance for adults, not advice; the seven and the vitamins use your own targets when you set them. Magnesium, zinc, B1, B2, B3, B6 and omega-3 appear only for foods logged from a source that gives them.</p>
  </div>;
}
function ReportRow({row, value, note, open, onToggle, children}: {row: ReportNutrient; value: number; note: string; open: boolean; onToggle: () => void; children: ReactNode}) {
  const share = referenceShare(value, row.reference), shownRef = row.reference === null ? null : row.reference / row.scale;
  return <li>
    <div><strong>{row.label}</strong> <small>{formatNutrient(value, row.scale)} {row.unit}{shownRef !== null ? ` · ${share} % of ${formatNutrient(shownRef)} ${row.unit} (${row.direction === 'at-most' ? 'a general-guidance upper limit' : 'general guidance'}, not advice)` : ''}{note ? <span className="health-micro-unknown"><span className="sr-only">. </span>{note}</span> : ''}</small></div>
    <div><button type="button" className="quiet" aria-expanded={open} onClick={onToggle} aria-label={`Where ${row.label} came from`}>Sources</button></div>
    {share !== null && <GlassBar identity={`report:${row.key}`} className="health-micro-bar" role="progressbar" aria-label={`${row.label}: ${formatNutrient(value, row.scale)} of ${formatNutrient(shownRef!)} ${row.unit}`} aria-valuenow={value / row.scale} aria-valuemin={0} aria-valuemax={shownRef!} value={Math.min(1, share / 100)} />}
    {children && <div style={{gridColumn: '1 / -1'}}>{children}</div>}
  </li>;
}
function Sources({ctx, def, date, days: own, onDays, span}: {ctx: ReportContext; def: ReportNutrient; date: string; days: 7 | 30 | 90; onDays: (d: 7 | 30 | 90) => void; /** Session AV (q3 #47): the report's chosen range, which Sources then reads too. */ span: number | null}) {
  const days = span ?? own, top = topSources(ctx, def.key, date, days);
  return <div className="health-rich" aria-label={`Where ${def.label} came from`} role="group">
    {span === null ? <div className="health-rich-row" role="group" aria-label="Days to read">{([7, 30, 90] as const).map(d => <button type="button" key={d} className="quiet" aria-pressed={days === d} onClick={() => onDays(d)}>{d} days</button>)}</div> : <p className="fine">From the same {span} {plural(span, 'day')} as the averages.</p>}
    {top.sources.length === 0 ? <p className="health-empty-inline">Log a few days to see where your {def.label.toLowerCase()} comes from.</p> : <ol>{top.sources.map(s => <li key={`${s.kind}:${s.id}`}>
      <strong>{s.name}</strong> <small>· {formatNutrient(s.amount, def.scale)} {def.unit} · {Math.round(s.share * 100)} % · {s.days.length} {plural(s.days.length, 'day')}{s.kind === 'recipe' ? ' · recipe' : ''}</small>
      <GlassBar identity={`source:${def.key}:${s.id}`} className="health-micro-bar" aria-hidden="true" value={s.share} />
      <small style={{display: 'block'}}>{s.days.slice(-4).map(d => formatDate(d)).join(', ')}{s.days.length > 4 ? ', …' : ''}</small>
    </li>)}</ol>}
    {top.entries > 0 && top.known < top.entries && <p className="fine">{top.entries - top.known} of {top.entries} entries in these {days} days carry no {def.label.toLowerCase()} value and are not counted.</p>}
  </div>;
}
