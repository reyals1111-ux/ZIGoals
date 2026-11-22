'use client';
import {useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {MONEY_MORE, MAX_WHAT_IF_CHANGES, type WhatIf, type WhatIfChange} from '../../lib/money-more/schema';
import type {CurrencyForecast, KnownForecast} from '../../lib/cash-forecast/model';
import {changeIssue, removeWhatIf, restoreWhatIf, saveWhatIf, withChanges, type Tried} from '../../lib/cash-forecast/what-if';
import {readMoneyAmount} from '../../lib/money-log/form';
import {addLocalDays} from '../../lib/local-date';
import {minorUnits} from '../../lib/money-split/parts';
import {formatDate} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {showUndo} from '../ui/undo-toast';
import {centsText, moneyCents, moneyWhole} from '../wealth/money-tools/format';
import {CalcHint} from '../money-calc/calc-hint';
import '../wealth/spending/money-r5.css';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's what-if scenarios, LEDGER #388): "Try a change" under the cash
 * forecast, its own chunk: up to three made-up changes — a one-off amount on a day, or an amount each month from a day
 * (until a day, if given), money out or in — drawn as a dashed second line beside the forecast, with the lowest point and
 * the end of both in words and a table week by week (lib/cash-forecast/what-if.ts). Labelled a model: never written as an
 * entry, a bill or a plan. Kept for the visit, or by name on this device, with Undo on Remove.
 */
const about = (cents: bigint, currency: string) => moneyWhole(centsText(cents), currency);
export const describeChange = (c: WhatIfChange, currency: string) => `${c.label ? `${c.label}: ` : ''}${moneyCents(BigInt(minorUnits(c.amount)), currency)} ${c.dir === 'out' ? 'more out' : 'more in'}${c.kind === 'monthly' ? ` each month from ${formatDate(c.from)}${c.until ? ` until ${formatDate(c.until)}` : ''}` : ` on ${formatDate(c.from)}`}`;
export default function TryAChange({rows, today, words}: {rows: readonly CurrencyForecast[]; today: string; words: string}) {
  const id = useId(), more = useDeviceRecord(MONEY_MORE), known = rows.filter((r): r is KnownForecast => r.known), heading = useRef<HTMLHeadingElement>(null);
  const [currency, setCurrency] = useState(known[0]?.currency ?? ''), [changes, setChanges] = useState<WhatIfChange[]>([]);
  const [kind, setKind] = useState<WhatIfChange['kind']>('once'), [dir, setDir] = useState<WhatIfChange['dir']>('out'), [amount, setAmount] = useState(''), [from, setFrom] = useState(addLocalDays(today, 30)), [until, setUntil] = useState(''), [label, setLabel] = useState('');
  const [name, setName] = useState(''), [problem, setProblem] = useState(''), [said, setSaid] = useState('');
  const row = known.find(r => r.currency === currency) ?? known[0];
  if (!row) return null;
  const tried: Tried | null = changes.length ? withChanges(row, changes) : null, kept = more.loaded && !more.unreadable ? more.data.whatIfs ?? [] : [];
  const add = (e: FormEvent) => {
    e.preventDefault(); setSaid('');
    if (changes.length >= MAX_WHAT_IF_CHANGES) { setProblem(`Up to ${MAX_WHAT_IF_CHANGES} changes at a time: remove one first.`); return; }
    const change: WhatIfChange = {kind, dir, amount: readMoneyAmount(amount) ?? '', from, ...(kind === 'monthly' && until ? {until} : {}), ...(label.trim() ? {label: label.trim().slice(0, 60)} : {})};
    const issue = changeIssue(change, today); if (issue) { setProblem(issue); return; }
    setChanges(c => [...c, change]); setProblem(''); setAmount(''); setLabel(''); setSaid(`Tried: ${describeChange(change, row.currency)}. Nothing is written to your records.`);
  };
  const removeChange = (i: number) => { setChanges(c => c.filter((_, k) => k !== i)); setSaid('Change taken out of the model.'); requestAnimationFrame(() => heading.current?.focus()); };
  const keep = () => { try { more.update(m => saveWhatIf(m, {name, currency: row.currency, changes}, crypto.randomUUID())); setSaid(`Kept on this device as “${name.trim()}”.`); setProblem(''); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); } };
  const open = (w: WhatIf) => { setCurrency(w.currency); setChanges(w.changes.map(c => ({...c}))); setName(w.name); setSaid(`Opened “${w.name}”: ${w.changes.length} ${w.changes.length === 1 ? 'change' : 'changes'}.`); };
  const remove = (w: WhatIf, index: number) => { try { more.update(m => removeWhatIf(m, w.id)); showUndo({message: `“${w.name}” removed.`, undoLabel: `Undo removing ${w.name}`, undone: `“${w.name}” is back.`, restore: () => { more.update(m => restoreWhatIf(m, w, index)); }}); setSaid(`“${w.name}” removed.`); requestAnimationFrame(() => heading.current?.focus()); } catch { setProblem('Not saved on this device.'); } };
  const c = row.currency, end = row.points.at(-1)!;
  return <section className="money-whatif" aria-labelledby={`${id}-title`}>
    <h5 id={`${id}-title`} ref={heading} tabIndex={-1}>Try a change</h5>
    <p className="fine"><strong>A model, not a plan.</strong> Made-up changes drawn beside your forecast; they are never written as entries, bills or plans.</p>
    {known.length > 1 && <label className="field"><span>Currency</span><select value={row.currency} onChange={e => { setCurrency(e.target.value); setChanges([]); }}>{known.map(r => <option key={r.currency} value={r.currency}>{r.currency}</option>)}</select></label>}
    <form className="money-whatif-form" onSubmit={add} aria-label="A change to try">
      <label className="field"><span>How often</span><select value={kind} onChange={e => setKind(e.target.value as WhatIfChange['kind'])}><option value="once">Once</option><option value="monthly">Each month</option></select></label>
      <label className="field"><span>Money</span><select value={dir} onChange={e => setDir(e.target.value as WhatIfChange['dir'])}><option value="out">More going out</option><option value="in">More coming in</option></select></label>
      <label className="field"><span>Amount ({c})</span><input inputMode="decimal" autoComplete="off" value={amount} onChange={e => setAmount(e.target.value)} placeholder="150" aria-describedby={`${id}-calc`}/></label>
      <CalcHint value={amount} id={`${id}-calc`}/>
      <label className="field"><span>{kind === 'monthly' ? 'From' : 'On'}</span><input type="date" value={from} min={kind === 'once' ? addLocalDays(today, 1) : undefined} onChange={e => setFrom(e.target.value)}/></label>
      {kind === 'monthly' && <label className="field"><span>Until — optional</span><input type="date" value={until} min={from} onChange={e => setUntil(e.target.value)}/></label>}
      <label className="field"><span>What it is — optional</span><input maxLength={60} value={label} onChange={e => setLabel(e.target.value)} placeholder="Rent more"/></label>
      <button type="submit" className="secondary" aria-disabled={changes.length >= MAX_WHAT_IF_CHANGES || undefined}>Try this change</button>
    </form>
    {problem && <p role="alert">{problem}</p>}
    {changes.length > 0 && <ul className="money-whatif-list" aria-label="Changes tried">{changes.map((x, i) => <li key={i}><span>{describeChange(x, c)}</span><button type="button" className="quiet" aria-label={`Take out ${describeChange(x, c)}`} onClick={() => removeChange(i)}>Take out</button></li>)}</ul>}
    {tried ? <>
      <WhatIfChart row={row} tried={tried} words={words}/>
      <p className="money-whatif-words">Lowest around {formatDate(row.lowest.date)}: about {about(row.lowest.cents, c)}; <strong>with your changes</strong> around {formatDate(tried.lowest.date)}: about <strong>{about(tried.lowest.cents, c)}</strong>{tried.lowest.cents < 0n ? ' (below zero)' : ''}.</p>
      <p className="fine">In {words}: about {about(end.mid, c)}; with your changes about {about(tried.points.at(-1)!.mid, c)} ({tried.moved < 0n ? '−' : '+'}{moneyCents(tried.moved < 0n ? -tried.moved : tried.moved, c)}).{tried.skipped ? ` ${tried.skipped} ${tried.skipped === 1 ? 'change falls' : 'changes fall'} outside these ${words}.` : ''}</p>
      <details className="cash-forecast-events"><summary>Week by week, with your changes</summary>
        <table><caption>Expected cash at the end of each week, {c}: the forecast and with your changes (a model)</caption>
          <thead><tr><th scope="col">Date</th><th scope="col">Forecast</th><th scope="col">With your changes</th></tr></thead>
          <tbody>{row.points.map((p, k) => ({p, k})).filter(({k}) => k % 7 === 0 || k === row.points.length - 1).map(({p, k}) => <tr key={p.date}><td>{formatDate(p.date)}</td><td>{about(p.mid, c)}</td><td>{about(tried.points[k]!.mid, c)}</td></tr>)}</tbody>
        </table></details>
      <div className="money-whatif-keep"><label className="field"><span>Keep these changes as</span><input maxLength={40} value={name} onChange={e => setName(e.target.value)} placeholder="Moving in March"/></label><button type="button" className="secondary" onClick={keep}>Keep on this device</button></div>
    </> : <p className="fine">Try a change — a higher rent from a month, a trip, more pay each month — to see your forecast beside it. Up to {MAX_WHAT_IF_CHANGES} at a time.</p>}
    {kept.length > 0 && <div className="money-whatif-kept"><p className="fine">Kept changes ({kept.length})</p><ul aria-label="Kept changes">{kept.map((w, i) => <li key={w.id}><span>{w.name} <span className="fine">· {w.currency} · {w.changes.length} {w.changes.length === 1 ? 'change' : 'changes'}</span></span>
      <span className="money-whatif-actions"><button type="button" className="quiet" aria-label={`Open ${w.name}`} onClick={() => open(w)}>Open</button><button type="button" className="quiet" aria-label={`Remove ${w.name}`} onClick={() => remove(w, i)}>Remove</button></span></li>)}</ul></div>}
    <p className="fine" role="status" aria-live="polite">{said}</p>
  </section>;
}
const W = 600, H = 200, PAD = 8;
function WhatIfChart({row, tried, words}: {row: KnownForecast; tried: Tried; words: string}) {
  const values = [...row.points.map(p => p.mid), ...tried.points.map(p => p.mid), 0n];
  const min = values.reduce((m, v) => v < m ? v : m), max = values.reduce((m, v) => v > m ? v : m), span = max - min || 1n;
  const x = (k: number) => PAD + (k * (W - 2 * PAD)) / Math.max(1, row.points.length - 1);
  const y = (v: bigint) => PAD + Number(((max - v) * 10_000n) / span) / 10_000 * (H - 2 * PAD);
  const line = (pts: readonly {mid: bigint}[]) => pts.map((p, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)} ${y(p.mid).toFixed(1)}`).join(' ');
  return <figure className="money-whatif-figure">
    <svg className="cash-forecast-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Expected ${row.currency} cash over the next ${words}, and with your changes (a model)`}>
      {min < 0n && max > 0n && <line className="cash-forecast-zero" x1={PAD} x2={W - PAD} y1={y(0n)} y2={y(0n)}/>}
      <path className="cash-forecast-line" d={line(row.points)}/>
      <path className="money-whatif-line" d={line(tried.points)}/>
    </svg>
    <figcaption className="money-whatif-key fine"><span className="money-whatif-key-forecast" aria-hidden="true"/>Your forecast <span className="money-whatif-key-model" aria-hidden="true"/>With your changes (a model)</figcaption>
  </figure>;
}
