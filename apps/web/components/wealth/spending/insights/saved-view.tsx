'use client';
import {useId, useState} from 'react';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {MONEY_MORE} from '../../../../lib/money-more/schema';
import {MONEY_TAGS_RECORD} from '../../../../lib/money-tags/schema';
import {tagsOf} from '../../../../lib/money-tags/tags';
import {questionChart, questionEntries, questionsOf, removeQuestion, setQuestionBy, type QuestionChart} from '../../../../lib/money-log/saved-searches';
import {formatDate, formatNumber} from '../../../../lib/visual-format';
import {showUndo} from '../../../ui/undo-toast';
import type {InsightProps} from './spending-insights';
import {money, monthName} from './format';

/**
 * Session AV lane 2, round 4 (money; Lunch Money's Query Tool, LEDGER #344): "Saved searches" in Your money over time —
 * each search the person kept under "Search all your entries" drawn as bars by month, by week or by category over its
 * range, per currency (never converted), with its total and its monthly average, and a table of every bar. The chart is
 * drawn by hand (no library, no motion) and never the only way to read it. Figures: lib/money-log/saved-searches.ts
 * (Wealth → Spending's own `totals` and `byCategory` over what the search finds now).
 */
const W = 640, H = 160, PAD = 8;
const barLabel = (c: QuestionChart, key: string) => c.by === 'month' ? monthName(key) : c.by === 'week' ? `Week of ${formatDate(key)}` : key;
function Bars({chart}: {chart: QuestionChart}) {
  const n = chart.bars.length, step = (W - PAD * 2) / Math.max(1, n), bar = Math.max(2, Math.min(28, step - 4)), max = Math.max(1, ...chart.bars.map(b => b.cents));
  return <svg className="money-insights-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${chart.currency}: ${chart.figure} ${chart.by === 'category' ? 'by category' : `each ${chart.by}`}, as bars; the table lists the same figures`}>
    <line className="axis" x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD}/>
    {chart.by !== 'category' && chart.monthly > 0 && chart.by === 'month' && <line className="money-saved-average" x1={PAD} x2={W - PAD} y1={H - PAD - (chart.monthly / max) * (H - PAD * 2)} y2={H - PAD - (chart.monthly / max) * (H - PAD * 2)}/>}
    {chart.bars.map((b, i) => { const h = (b.cents / max) * (H - PAD * 2); return b.cents > 0 && <rect key={b.key} className="bar-out" x={PAD + i * step + (step - bar) / 2} y={H - PAD - h} width={bar} height={h} rx={Math.min(4, bar / 2)}><title>{barLabel(chart, b.key)}: {money(b.cents, chart.currency)}</title></rect>; })}
  </svg>;
}
export default function SavedView({entries, today, weekStartsOn = 'monday'}: InsightProps) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), tags = useDeviceRecord(MONEY_TAGS_RECORD), [chosen, setChosen] = useState(''), [note, setNote] = useState('');
  const list = questionsOf(more.data), q = list.find(x => x.id === chosen) ?? list[0];
  if (!more.loaded) return <p className="fine" aria-busy="true">Loading…</p>;
  if (!q) return <p className="fine" id={`${id}-empty`} tabIndex={-1}>No saved searches yet. Under “Search all your entries”, choose your filters and tap “Save this search”: it shows here as a chart by month, week or category, with its total and monthly average.</p>;
  const tagged = q.tag && tags.loaded ? new Set(entries.filter(e => tagsOf(tags.data, e.id).includes(q.tag!)).map(e => e.id)) : undefined;
  const found = questionEntries(entries, q, tagged), charts = questionChart(found, q, today, weekStartsOn), by = q.by ?? 'month';
  const remove = () => {
    const kept = q;
    try { more.update(m => removeQuestion(m, kept.id)); } catch { setNote('This could not be saved on this device.'); return; }
    setChosen(''); setNote(`${kept.name} is no longer saved.`);
    requestAnimationFrame(() => (document.getElementById(`${id}-empty`) ?? document.getElementById(`${id}-remove`))?.focus());
    showUndo({message: `${kept.name} is no longer saved.`, undoLabel: `Undo removing ${kept.name}`, undone: `${kept.name} is saved again.`, restore: () => { more.update(m => (m.questions ?? []).some(x => x.id === kept.id) ? m : {...m, questions: [...(m.questions ?? []), kept].slice(0, 10)}); }});
  };
  return <section className="money-insights-currency money-saved" aria-labelledby={`${id}-t`}>
    <h4 id={`${id}-t`}>Saved searches</h4>
    {list.length > 1 && <div className="money-insights-views" role="group" aria-label="Saved search">{list.map(x => <button key={x.id} type="button" className="quiet" aria-pressed={x.id === q.id} onClick={() => setChosen(x.id)}>{x.name}</button>)}</div>}
    <div className="money-insights-views" role="group" aria-label={`Draw ${q.name}`}>{(['month', 'week', 'category'] as const).map(b => <button key={b} type="button" className="quiet" aria-pressed={by === b} onClick={() => { try { more.update(m => setQuestionBy(m, q.id, b)); } catch { setNote('This could not be saved on this device.'); } }}>{b === 'month' ? 'By month' : b === 'week' ? 'By week' : 'By category'}</button>)}</div>
    {!charts.length ? <p className="fine">{q.name} finds nothing in your log right now. It stays saved; entries that match show here as you log them.</p> : charts.map(c => <div key={c.currency} className="money-saved-chart">
      <p className="money-saved-total"><strong>{q.name}</strong> · {c.currency}: {c.figure} <strong data-private-amount>{money(c.total, c.currency)}</strong> from {formatDate(c.from)} to {formatDate(c.to)} ({formatNumber(c.count)} {c.count === 1 ? 'entry' : 'entries'} counted), <span data-private-amount>{money(c.monthly, c.currency)}</span> a month on average over {c.months === 1 ? 'one month' : `${formatNumber(c.months)} months`}.</p>
      {c.by === 'month' && <p className="money-insights-legend" aria-hidden="true"><span><i className="out"/>{c.figure === 'spent' ? 'Spent' : 'Received'}</span><span><i className="money-saved-key"/>Monthly average</span></p>}
      <Bars chart={c}/>
      <table className="money-insights-table">
        <caption>{q.name} in {c.currency}, {c.by === 'category' ? 'by category' : `each ${c.by}`}{c.bars.length >= (c.by === 'week' ? 26 : 24) && c.by !== 'category' ? ` (the last ${c.bars.length})` : ''}</caption>
        <thead><tr><th scope="col">{c.by === 'category' ? 'Category' : c.by === 'week' ? 'Week' : 'Month'}</th><th scope="col">{c.figure === 'spent' ? 'Spent' : 'Received'}</th></tr></thead>
        <tbody>{c.bars.map(b => <tr key={b.key}><th scope="row">{barLabel(c, b.key)}</th><td data-private-amount>{money(b.cents, c.currency)}</td></tr>)}</tbody>
      </table>
    </div>)}
    <p className="fine">Counted as Wealth → Spending counts: entries left out and transfers are not added in, a shared cost counts your share, and a cost spread over months its share in each month. Only the filters are kept, so the chart reads your log as it is now.</p>
    <button type="button" id={`${id}-remove`} className="quiet" aria-label={`Remove the saved search ${q.name}`} onClick={remove}>Remove this saved search</button>
    <p className="fine" role="status">{note}</p>
  </section>;
}
