'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatPlainDecimal} from '../../../lib/visual-format';
import type {ValuationSnapshot} from '../../../lib/positions';
import {TARGET_ALLOCATION, assetPerformance, driftByCurrency, holdingRows, setTargets, targetSum, type DriftRow, type Performance, type TargetAllocation} from '../../../lib/allocation/target';
import './allocation.css';

/**
 * Session AK (7.4): the person's target mix beside today's, one currency at a time (never converted), with the recorded
 * 30- and 90-day price change of each market-priced asset. The numbers are a table (the bars beside them are the
 * same numbers drawn); the targets are the person's own and kept on this device (`zigoals:target-allocation:v1`).
 * Information, not advice: it says how far a share is from the target, never what to buy or sell. Lazy-loaded.
 */
export type OverviewRow = {position: {id: string; asset: string; providerId: string; marketRef?: unknown; valuationMode?: 'manual' | 'automatic'}; wealthClass: string; currency?: string; value?: bigint};
const money = (value: string, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency, maximumFractionDigits: 0}).format(Number(value)); } catch { return `${value} ${currency}`; } };
const pct = (n: number) => `${formatPlainDecimal(n.toFixed(1))} %`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatPlainDecimal(Math.abs(n).toFixed(1))} pp`;
const STATUS: Record<DriftRow['status'], string> = {within: 'Within your range', above: 'Above your target', below: 'Below your target', 'no-target': 'No target'};
const perfText = (p: Performance) => p.pct !== undefined ? `${Number(p.pct) > 0 ? '+' : Number(p.pct) < 0 ? '−' : ''}${formatPlainDecimal(Math.abs(Number(p.pct)).toFixed(1))} %` : p.reason === 'currency-changed' ? 'Unknown (currency changed)' : 'Unknown';

export type TargetViewProps = {record: TargetAllocation; rows: readonly OverviewRow[]; snapshots: readonly ValuationSnapshot[]; now: number; onChange: (change: (current: TargetAllocation) => TargetAllocation) => void};
export function TargetAllocationView({record, rows, snapshots, now, onChange}: TargetViewProps) {
  const id = useId();
  const [editing, setEditing] = useState(false), [basis, setBasis] = useState<TargetAllocation['basis']>(record.basis), [draft, setDraft] = useState<Record<string, string>>({}), [band, setBand] = useState(String(record.band));
  const [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const holdings = useMemo(() => holdingRows(rows), [rows]);
  const views = useMemo(() => driftByCurrency(holdings, record), [holdings, record]);
  const keys = useMemo(() => {
    const seen = new Map<string, string>();
    for (const h of holdings) seen.set(basis === 'class' ? h.wealthClass : h.assetKey, basis === 'class' ? h.wealthClass : h.assetLabel);
    if (record.basis === basis) for (const t of record.targets) seen.set(t.key, t.label);
    return [...seen];
  }, [holdings, basis, record]);
  const priced = rows.filter(r => r.position.marketRef && r.position.valuationMode !== 'manual');
  const startEdit = () => { setBasis(record.basis); setDraft(Object.fromEntries(record.targets.map(t => [t.key, t.percent]))); setBand(String(record.band)); setEditing(true); setStatus(''); setProblem(''); };
  const save = () => {
    const list = keys.map(([key, label]) => ({key, label, percent: (draft[key] ?? '').trim().replace(',', '.') || '0'}));
    const bad = list.find(t => !/^\d{1,3}(\.\d{1,2})?$/.test(t.percent));
    if (bad) { setProblem(`Enter a percentage for ${bad.label}, for example 40 or 12.5.`); return; }
    const width = Number(band);
    if (!Number.isFinite(width) || width < 1 || width > 25) { setProblem('Choose a range from 1 to 25 percentage points.'); return; }
    try { onChange(r => setTargets(r, basis, list, width)); setEditing(false); setProblem(''); setStatus('Your targets are saved on this device.'); }
    catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Not saved on this device.'); }
  };
  const draftSum = keys.reduce((sum, [key]) => sum + (Number((draft[key] ?? '').replace(',', '.')) || 0), 0);
  return <div className="alloc-body">
    {!record.targets.length && !editing && <p className="fine">Set the mix you aim for — for example 60 % stocks, 30 % crypto, 10 % cash — and see how today&rsquo;s compares.</p>}
    {views.length === 0 && <p className="fine">Add a valued asset to compare a mix.</p>}
    {views.map(v => <section key={v.currency} aria-labelledby={`${id}-${v.currency}`} className="alloc-currency">
      <h3 id={`${id}-${v.currency}`}>In {v.currency} · {money(v.total, v.currency)} known</h3>
      <table className="alloc-table">
        <caption className="fine">Share now and your target{record.targets.length ? `, ± ${record.band} percentage points counting as within range` : ''}.</caption>
        <thead><tr><th scope="col">{record.basis === 'class' ? 'Asset class' : 'Asset'}</th><th scope="col">Now</th><th scope="col">Target</th><th scope="col">Difference</th><th scope="col"><span className="visually-hidden">Bar</span></th></tr></thead>
        <tbody>{v.rows.map(r => <tr key={r.key} data-status={r.status}>
          <th scope="row">{r.label}</th>
          <td>{pct(r.current)}<small className="fine"> {money(r.value, v.currency)}</small></td>
          <td>{r.target !== undefined ? pct(r.target) : '—'}</td>
          <td>{r.drift !== undefined ? <>{signed(r.drift)}<small className="fine"> {STATUS[r.status]}</small></> : <small className="fine">{STATUS[r.status]}</small>}</td>
          <td aria-hidden="true" className="alloc-bar-cell"><span className="alloc-bar"><span className="alloc-bar-now" style={{width: `${Math.min(100, r.current)}%`}}/>{r.target !== undefined && <span className="alloc-bar-target" style={{left: `${Math.min(100, r.target)}%`}}/>}</span></td>
        </tr>)}</tbody>
      </table>
      {v.unvalued > 0 && <p className="fine">{v.unvalued} {v.unvalued === 1 ? 'asset has' : 'assets have'} no value yet and {v.unvalued === 1 ? 'is' : 'are'} left out of these shares.</p>}
      {v.targetTotal > 0 && v.targetTotal < 100 && <p className="fine">Your targets add up to {formatPlainDecimal(String(v.targetTotal))} %; the rest has no target.</p>}
    </section>)}
    {views.length > 1 && <p className="fine">Each currency is compared on its own; amounts are never converted.</p>}
    {editing ? <div className="alloc-edit" role="group" aria-label="Your target mix">
      <div className="alloc-basis" role="radiogroup" aria-label="Targets for">
        {(['class', 'asset'] as const).map(b => <label key={b} className="alloc-chip"><input type="radio" name={`${id}-basis`} checked={basis === b} onChange={() => { setBasis(b); setDraft({}); }}/><span>{b === 'class' ? 'Asset classes' : 'Single assets'}</span></label>)}
      </div>
      {keys.map(([key, label]) => <label key={key} className="field alloc-target-field"><span>{label}</span><span className="alloc-input"><input inputMode="decimal" value={draft[key] ?? ''} onChange={e => setDraft(d => ({...d, [key]: e.target.value}))} placeholder="0" aria-label={`Target for ${label}, percent`}/>%</span></label>)}
      <label className="field alloc-target-field"><span>Range that counts as on target (± percentage points)</span><input inputMode="numeric" value={band} onChange={e => setBand(e.target.value)}/></label>
      <p className="fine" aria-live="polite">Together: {formatPlainDecimal(String(Math.round(draftSum * 100) / 100))} %{draftSum > 100 ? ' — more than 100 %' : ''}</p>
      {problem && <p role="alert">{problem}</p>}
      <div className="alloc-actions"><button type="button" className="primary" onClick={save}>Save targets</button><button type="button" className="quiet" onClick={() => setEditing(false)}>Cancel</button></div>
    </div> : <div className="alloc-actions"><button type="button" className="secondary" onClick={startEdit}>{record.targets.length ? 'Change targets' : 'Set a target mix'}</button>{record.targets.length > 0 && <span className="fine">Targets: {formatPlainDecimal(String(targetSum(record)))} % set</span>}</div>}
    <p role="status" aria-live="polite" className="alloc-status">{status}</p>
    {priced.length > 0 && <section aria-labelledby={`${id}-perf`}>
      <h3 id={`${id}-perf`}>Recorded price change</h3>
      <table className="alloc-table">
        <caption className="fine">An estimate from prices ZIGoals recorded on this device; unknown where no price was recorded about that long ago. Past change says nothing about the future.</caption>
        <thead><tr><th scope="col">Asset</th><th scope="col">30 days</th><th scope="col">90 days</th></tr></thead>
        <tbody>{priced.map(r => <tr key={r.position.id}><th scope="row">{r.position.providerId || r.position.asset}{r.position.providerId && r.position.providerId !== r.position.asset ? <small className="fine"> {r.position.asset}</small> : null}</th>
          <td>{perfText(assetPerformance(snapshots, r.position.id, now, 30))}</td><td>{perfText(assetPerformance(snapshots, r.position.id, now, 90))}</td></tr>)}</tbody>
      </table>
    </section>}
    <p className="fine">Information about your own mix, not financial advice. ZIGoals never buys, sells or moves anything.</p>
  </div>;
}
export default function TargetAllocation({rows, snapshots, now}: {rows: readonly OverviewRow[]; snapshots: readonly ValuationSnapshot[]; now: number}) {
  const record = useDeviceRecord(TARGET_ALLOCATION);
  if (!record.loaded) return null;
  return <>{record.unreadable && <p role="alert">This device&rsquo;s targets could not be read; saving starts a fresh set.</p>}<TargetAllocationView record={record.data} rows={rows} snapshots={snapshots} now={now} onChange={fn => { record.update(fn); }}/></>;
}
