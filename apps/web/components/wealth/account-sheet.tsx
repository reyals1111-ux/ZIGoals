'use client';
import {useCallback, useEffect, useId, useRef, useState, type FormEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {LimitForm} from './account-limits';
import {isDebtKind, type Account, type Accounts} from '../../lib/accounts/schema';
import {WEALTH_SHEET} from '../../lib/wealth-sheet/schema';
import {accountValueNow, addFlow, equityOf, irr, linkMortgage, removeFlow, setEvery, setGroup, setShare} from '../../lib/wealth-sheet/sheet';
import {MAX_DOC_BYTES, accountDocs, deleteDoc, putDoc, type WealthDoc} from '../../lib/wealth-sheet/docs';
import {compressImage, photoScope} from '../../lib/health-aa/photos';
import {shrinkToLimit} from '../../lib/meal-estimates/photos';
import {centsText} from '../../lib/debt-planner/plan';
import {readMoneyAmount} from '../../lib/money-log/form';
import {formatDate, formatMoney, formatNumber} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * Session AV lane 2 (money; Kubera): an account's sheet options, opened from its row — your share (a joint account at
 * 50 %), your own group, a mortgage linked to the property it is secured on (the property then shows its equity), how
 * often you update it, money in and out with the annual return they give (IRR, a result, not advice), and documents kept
 * with it on this device (a photo or PDF; never uploaded). Kept in `zigoals:wealth-sheet:v1` and IndexedDB
 * `zigoals-wealth-docs-v1`. Lazy.
 */
const m = (c: bigint, cur: string) => formatMoney(centsText(c < 0n ? -c : c), cur);
export function PropertyEquity({accounts, account, today}: {accounts: Accounts; account: Account; today: string}) {
  const sheet = useDeviceRecord(WEALTH_SHEET);
  const eq = sheet.loaded && !sheet.unreadable ? equityOf(accounts, sheet.data, account.id, today) : null;
  if (!eq) return null;
  return <small className="accounts-equity">Equity {eq.equity < 0n ? '−' : ''}{m(eq.equity, eq.currency)} (value less {eq.mortgages.map(x => x.name).join(', ')} {m(eq.owed, eq.currency)})</small>;
}
export default function AccountSheet({accounts, account: a, today}: {accounts: Accounts; account: Account; today: string}) {
  const id = useId(), sheet = useDeviceRecord(WEALTH_SHEET), debt = isDebtKind(a.kind), [status, setStatus] = useState(''), [problem, setProblem] = useState('');
  const s = sheet.data, [share, setShareText] = useState(String(s.share?.[a.id] ?? '')), [group, setGroupText] = useState(s.group?.[a.id] ?? '');
  const [flowDate, setFlowDate] = useState(today), [flowAmount, setFlowAmount] = useState(''), [flowKind, setFlowKind] = useState<'in' | 'out'>('in');
  const save = (fn: Parameters<typeof sheet.update>[0], words: string) => { setProblem(''); try { sheet.update(fn); setStatus(words); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept on this device.')); } };
  const properties = accounts.items.filter(x => !x.archivedAt && x.kind === 'property' && x.currency === a.currency);
  const flows = s.flows?.[a.id] ?? [], rate = irr(flows, accountValueNow(a, today), today);
  const saveOptions = (e: FormEvent) => {
    e.preventDefault();
    const pct = share.trim() ? Number(share.replace(',', '.')) : null;
    try { const next = setGroup(setShare(sheet.data, a.id, pct), a.id, group || null); save(() => next, `${a.name}: kept.`); } catch (cause) { setProblem(plainErrorMessage(cause, 'Check the share.')); }
  };
  const saveFlow = (e: FormEvent) => { e.preventDefault(); const amt = readMoneyAmount(flowAmount); if (!amt) { setProblem('Enter an amount above zero, with at most two decimals.'); return; } try { const next = addFlow(sheet.data, a.id, {date: flowDate, amount: amt, kind: flowKind}); save(() => next, `${flowKind === 'in' ? 'Money in' : 'Money out'} ${formatMoney(amt, a.currency)} on ${formatDate(flowDate)} kept.`); setFlowAmount(''); } catch (cause) { setProblem(plainErrorMessage(cause, 'Not kept.')); } };
  if (!sheet.loaded) return null;
  return <div className="account-sheet" role="group" aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`} className="eyebrow">SHEET · {a.name}</p>
    <form className="wealth-sheet-form" onSubmit={saveOptions} aria-label={`${a.name}: share and group`}>
      <label className="field"><span>Your share (%) — empty: all of it</span><input inputMode="decimal" autoComplete="off" value={share} placeholder="50" onChange={e => setShareText(e.target.value)}/></label>
      <label className="field"><span>Your group — optional</span><input maxLength={40} value={group} placeholder="Home" onChange={e => setGroupText(e.target.value)}/></label>
      <button type="submit" className="secondary">Keep</button>
    </form>
    {debt && properties.length > 0 && <label className="field"><span>Secured on</span><select value={s.secures?.[a.id] ?? ''} onChange={e => save(r => linkMortgage(r, a.id, e.target.value || null), e.target.value ? `${a.name} is linked to ${properties.find(p => p.id === e.target.value)?.name}: its equity shows on that row.` : `${a.name} is no longer linked.`)}><option value="">Not linked to a property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>}
    <label className="field"><span>Remind me to update it</span><select value={s.every?.[a.id] ?? ''} onChange={e => save(r => setEvery(r, a.id, (e.target.value || null) as 'month' | null), e.target.value ? `${a.name}: due for an update every ${e.target.value}.` : `${a.name}: no update reminder.`)}><option value="">Never</option><option value="month">Every month</option><option value="quarter">Every quarter</option></select></label>
    {/* Session AV lane 2, round 2 (money; Wallet's balance-limit notifications): a low and a high line for this account. */}
    <LimitForm account={a}/>
    {!debt && <details className="account-sheet-fold"><summary>Money in and out, and its return{flows.length ? ` (${flows.length})` : ''}</summary>
      {flows.length > 0 && <ul className="account-sheet-flows">{flows.map((f, i) => <li key={`${f.date}-${i}`}><span>{formatDate(f.date)} · {f.kind === 'in' ? 'in' : 'out'} {formatMoney(f.amount, a.currency)}</span><button type="button" className="quiet" aria-label={`Remove money ${f.kind} of ${formatMoney(f.amount, a.currency)} on ${formatDate(f.date)}`} onClick={() => save(r => removeFlow(r, a.id, i), 'Removed.')}>Remove</button></li>)}</ul>}
      <p role="status">{rate === null ? (flows.length ? 'The return needs money in and a balance today.' : 'Add what you put in (and took out), with the days; with today’s balance it gives the annual return.') : <>Annual return (IRR): <strong>{formatNumber(rate * 100, {maximumFractionDigits: 1})} %</strong> a year, from your money in and out and today&rsquo;s balance. A result, not advice.</>}</p>
      <form className="wealth-sheet-form" onSubmit={saveFlow} aria-label={`${a.name}: money in or out`}>
        <label className="field"><span>Money</span><select value={flowKind} onChange={e => setFlowKind(e.target.value as 'in' | 'out')}><option value="in">In (you put it in)</option><option value="out">Out (you took it out)</option></select></label>
        <label className="field"><span>Amount ({a.currency})</span><input inputMode="decimal" autoComplete="off" value={flowAmount} onChange={e => setFlowAmount(e.target.value)}/></label>
        <label className="field"><span>On</span><input type="date" value={flowDate} max={today} onChange={e => setFlowDate(e.target.value)}/></label>
        <button type="submit" className="secondary">Add</button>
      </form>
    </details>}
    <AccountDocs account={a}/>
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {problem && <p role="alert">{problem}</p>}
  </div>;
}
function AccountDocs({account: a}: {account: Account}) {
  const [docs, setDocs] = useState<WealthDoc[] | null>(null), [note, setNote] = useState(''), input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(() => { void accountDocs(photoScope(), a.id).then(setDocs, () => { setDocs([]); setNote('This browser cannot keep documents here.'); }); }, [a.id]);
  useEffect(() => { queueMicrotask(refresh); }, [refresh]);
  const add = async (file: File) => {
    setNote('Preparing the document on this device…');
    try {
      let blob: Blob = file, type = file.type;
      if (file.type.startsWith('image/')) { const out = await shrinkToLimit(step => compressImage(file, step.edge, step.quality)); blob = out.blob; type = out.type; }
      else if (file.type !== 'application/pdf') throw new Error('Choose a photo or a PDF.');
      if (blob.size > MAX_DOC_BYTES) throw new Error('This file is larger than 2 MB; choose a smaller one.');
      await putDoc(photoScope(), {accountId: a.id, docId: `doc_${crypto.randomUUID().slice(0, 12)}`, name: (file.name || 'Document').slice(0, 120), blob, type: type as WealthDoc['type'], bytes: blob.size, addedAt: new Date().toISOString()});
      setNote(`${file.name || 'The document'} kept on this device with ${a.name}.`); refresh();
    } catch (cause) { setNote(cause instanceof Error ? cause.message : 'The document was not kept.'); }
  };
  const open = (d: WealthDoc) => { const url = URL.createObjectURL(d.blob); window.open(url, '_blank', 'noopener'); setTimeout(() => URL.revokeObjectURL(url), 60_000); };
  return <details className="account-sheet-fold"><summary>Documents{docs?.length ? ` (${docs.length})` : ''}</summary>
    <p className="fine">A statement, a deed or a policy, as a photo or a PDF (at most 2 MB): kept in this browser only, never uploaded or synced, in Export everything as a file, gone with Erase everything.</p>
    {docs?.length ? <ul className="account-sheet-flows">{docs.map(d => <li key={d.docId}><span>{d.name} · {Math.round(d.bytes / 1000)} kB · {formatDate(d.addedAt.slice(0, 10))}</span><span><button type="button" className="quiet" aria-label={`Open ${d.name}`} onClick={() => open(d)}>Open</button><button type="button" className="quiet" aria-label={`Delete ${d.name}`} onClick={() => { void deleteDoc(photoScope(), a.id, d.docId).then(() => { setNote(`${d.name} deleted from this device.`); refresh(); }, () => setNote('Not deleted; try again.')); }}>Delete</button></span></li>)}</ul> : null}
    <input ref={input} type="file" accept="image/*,application/pdf" hidden tabIndex={-1} aria-hidden="true" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void add(f); }}/>
    <button type="button" className="secondary" onClick={() => input.current?.click()}>Add a photo or PDF</button>
    {note && <p className="fine" role="status">{note}</p>}
  </details>;
}
