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
  const [span, setSpan] = useState<'day' | 'week'>('day'), [open, setOpen] = useState<string | null>(null), [days, setDays] = useState<7 | 30 | 90>(7);
  const all = span === 'day' ? nutrientDay(ctx, date).map(r => ({...r, value: r.total, note: r.entries > 0 && r.known < r.entries ? `${r.entries - r.known} of ${r.entries} entries have no value` : ''}))
    : nutrientAverages(ctx, date, 7).map(r => ({...r, value: r.average, note: r.average === null ? '' : `average of ${r.daysWithValue} ${plural(r.daysWithValue, 'day')} with a value, of ${r.loggedDays} logged`}));
  const shown = withData(all.map(r => ({...r, total: r.value}))), hidden = all.length - shown.length;
  return <div className="health-rich" data-region="nutrient-report">
    <h3 id="nutrient-report-title">Nutrient report</h3>
    <div className="health-rich-row" role="group" aria-label="Report period"><button type="button" className="quiet" aria-pressed={span === 'day'} onClick={() => setSpan('day')}>This day</button><button type="button" className="quiet" aria-pressed={span === 'week'} onClick={() => setSpan('week')}>7-day average</button></div>
    {shown.length === 0 ? <p className="health-empty-inline">{span === 'day' ? 'Nothing logged with nutrient values on this day yet.' : 'Log a few days and their averages appear here.'}</p> : GROUPS.map(group => {
      const rows = shown.filter(r => r.group === group); if (!rows.length) return null;
      return <section key={group} aria-label={group}><h4 style={{margin: '8px 0 6px'}}>{group}</h4><ul className="health-micro-list">{rows.map(r => <ReportRow key={r.key} row={r} value={r.value!} note={r.note} open={open === r.key} onToggle={() => setOpen(open === r.key ? null : r.key)}>
        {open === r.key && <Sources ctx={ctx} def={r} date={date} days={days} onDays={setDays} />}
      </ReportRow>)}</ul></section>;
    })}
    {hidden > 0 && <p className="fine">{hidden} {plural(hidden, 'nutrient')} with no values {span === 'day' ? 'on this day' : 'in these 7 days'} {hidden === 1 ? 'is' : 'are'} hidden: unknown is not zero.</p>}
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
function Sources({ctx, def, date, days, onDays}: {ctx: ReportContext; def: ReportNutrient; date: string; days: 7 | 30 | 90; onDays: (d: 7 | 30 | 90) => void}) {
  const top = topSources(ctx, def.key, date, days);
  return <div className="health-rich" aria-label={`Where ${def.label} came from`} role="group">
    <div className="health-rich-row" role="group" aria-label="Days to read">{([7, 30, 90] as const).map(d => <button type="button" key={d} className="quiet" aria-pressed={days === d} onClick={() => onDays(d)}>{d} days</button>)}</div>
    {top.sources.length === 0 ? <p className="health-empty-inline">Log a few days to see where your {def.label.toLowerCase()} comes from.</p> : <ol>{top.sources.map(s => <li key={`${s.kind}:${s.id}`}>
      <strong>{s.name}</strong> <small>· {formatNutrient(s.amount, def.scale)} {def.unit} · {Math.round(s.share * 100)} % · {s.days.length} {plural(s.days.length, 'day')}{s.kind === 'recipe' ? ' · recipe' : ''}</small>
      <GlassBar identity={`source:${def.key}:${s.id}`} className="health-micro-bar" aria-hidden="true" value={s.share} />
      <small style={{display: 'block'}}>{s.days.slice(-4).map(d => formatDate(d)).join(', ')}{s.days.length > 4 ? ', …' : ''}</small>
    </li>)}</ol>}
    {top.entries > 0 && top.known < top.entries && <p className="fine">{top.entries - top.known} of {top.entries} entries in these {days} days carry no {def.label.toLowerCase()} value and are not counted.</p>}
  </div>;
}
