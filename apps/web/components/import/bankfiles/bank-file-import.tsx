'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../../ai/use-device-record';
import {formatDate} from '../../../lib/visual-format';
import {MONEY_LOG, type MoneyLog} from '../../../lib/money-log/schema';
import {BANK_FILE_TOO_LARGE, FORMAT_LABELS, MAX_BANK_FILE_BYTES, addEntries, alreadyLogged, decodeBankFile, parseBankFile, removeEntries, toMoneyEntries, type BankStatement, type BankTransaction, type RefusedRow} from '../../../lib/bankfiles';
import './bankfiles.css';

/**
 * Session AK (A14): a bank statement file (CAMT.053, OFX/QFX, MT940) into the money log. The file is read on this
 * device only (no bank connection, nothing uploaded); a preview shows every row, the refused rows with their reasons,
 * possible repeats and rows already in the log (both left out unless the person ticks them back in). Nothing is added
 * until the person confirms, and the last import can be undone. Lazy-loaded by the import sheet.
 */
const money = (amount: string, currency: string) => { try { return new Intl.NumberFormat('en-GB', {style: 'currency', currency}).format(Number(amount)); } catch { return `${amount} ${currency}`; } };
const PREVIEW_ROWS = 200;

export type BankImportViewProps = {log: Pick<MoneyLog, 'entries'>; onAdd: (rows: BankTransaction[]) => {added: number; refused: RefusedRow[]}; onUndo?: () => void};
export function BankFileImportView({log, onAdd, onUndo}: BankImportViewProps) {
  const id = useId();
  const [statement, setStatement] = useState<BankStatement | null>(null), [problem, setProblem] = useState(''), [status, setStatus] = useState('');
  const [included, setIncluded] = useState<ReadonlySet<number>>(new Set()), [later, setLater] = useState<RefusedRow[]>([]), [canUndo, setCanUndo] = useState(false);
  const logged = useMemo(() => new Set(statement?.transactions.filter(t => alreadyLogged(t, log)).map(t => t.index) ?? []), [statement, log]);
  const read = async (file: File | undefined) => {
    setProblem(''); setStatus(''); setStatement(null); setLater([]); setCanUndo(false);
    if (!file) return;
    if (file.size > MAX_BANK_FILE_BYTES) { setProblem(BANK_FILE_TOO_LARGE); return; }
    let text: string;
    try { text = decodeBankFile(new Uint8Array(await file.arrayBuffer())); } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'This file could not be read. Nothing was changed.'); return; }
    const result = parseBankFile(text);
    if (!result.ok) { setProblem(result.error); return; }
    setStatement(result);
    setIncluded(new Set(result.transactions.filter(t => !t.duplicate && !alreadyLogged(t, log)).map(t => t.index)));
  };
  const toggle = (index: number) => setIncluded(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  const chosen = statement?.transactions.filter(t => included.has(t.index)) ?? [];
  const add = () => {
    try {
      const out = onAdd(chosen);
      setLater(out.refused); setCanUndo(out.added > 0);
      setStatus(`${out.added} ${out.added === 1 ? 'entry' : 'entries'} added to your money log${out.refused.length ? `; ${out.refused.length} could not be added (listed below)` : ''}.`);
      setStatement(null);
    } catch (cause) { setProblem(cause instanceof Error ? cause.message : 'Nothing was added on this device.'); }
  };
  return <div className="bankfile-body">
    <label className="field bankfile-file"><span>Bank statement file (CAMT.053 .xml, OFX / QFX, MT940 .sta or .txt)</span>
      <input type="file" accept=".xml,.ofx,.qfx,.sta,.940,.mt940,.txt,application/xml,text/xml,application/x-ofx,text/plain" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; void read(f); }}/></label>
    <p className="fine">Read on this device only. Nothing is uploaded and no bank is connected.</p>
    {problem && <p role="alert">{problem}</p>}
    {statement && <section aria-labelledby={`${id}-preview`} className="bankfile-preview">
      <h3 id={`${id}-preview`} tabIndex={-1}>{FORMAT_LABELS[statement.format]}{statement.account ? ` · ${statement.account}` : ''}: {statement.transactions.length} {statement.transactions.length === 1 ? 'transaction' : 'transactions'}</h3>
      {statement.balances.map((b, i) => <p key={i} className="fine">{b.kind === 'opening' ? 'Opening' : 'Closing'} balance{b.date ? ` on ${formatDate(b.date)}` : ''}: {money(b.amount, b.currency)} (as the file states it)</p>)}
      {statement.warnings.map(w => <p key={w} className="fine">{w}</p>)}
      {statement.transactions.length > 0 && <div className="bankfile-table-wrap"><table className="bankfile-table">
        <caption className="fine">Ticked rows are added. Possible repeats and rows already in your log start unticked.</caption>
        <thead><tr><th scope="col">Add</th><th scope="col">Date</th><th scope="col">Payee</th><th scope="col">Amount</th><th scope="col">Note</th></tr></thead>
        <tbody>{statement.transactions.slice(0, PREVIEW_ROWS).map(t => <tr key={t.index}>
          <td><input type="checkbox" checked={included.has(t.index)} onChange={() => toggle(t.index)} aria-label={`Add ${t.payee || 'row'} ${t.amount} ${t.currency} on ${formatDate(t.date)}`}/></td>
          <td>{formatDate(t.date)}</td>
          <td className="bankfile-payee">{t.payee || '—'}{t.description && t.description !== t.payee && <span className="fine"> · {t.description}</span>}</td>
          <td className={t.direction === 'in' ? 'bankfile-in' : undefined}>{t.direction === 'in' ? '+' : '−'}{money(t.amount, t.currency)}</td>
          <td className="fine">{t.duplicate ? 'Possible repeat in this file' : logged.has(t.index) ? 'Already in your log' : ''}</td>
        </tr>)}</tbody>
      </table></div>}
      {statement.transactions.length > PREVIEW_ROWS && <p className="fine">The first {PREVIEW_ROWS} rows are shown; the rest are added as ticked.</p>}
      <RefusedList rows={statement.refused} title="Not read"/>
      <div className="bankfile-actions"><button type="button" className="primary" disabled={!chosen.length} onClick={add}>Add {chosen.length} to my money log</button><button type="button" className="quiet" onClick={() => setStatement(null)}>Cancel</button></div>
    </section>}
    <p role="status" aria-live="polite" className="bankfile-status">{status}{canUndo && onUndo && <> <button type="button" className="text-link" onClick={() => { onUndo(); setCanUndo(false); setStatus('The import was undone.'); }}>Undo</button></>}</p>
    <RefusedList rows={later} title="Not added"/>
  </div>;
}
function RefusedList({rows, title}: {rows: readonly RefusedRow[]; title: string}) {
  if (!rows.length) return null;
  return <details className="bankfile-refused"><summary>{title}: {rows.length} {rows.length === 1 ? 'row' : 'rows'}</summary><ul>{rows.slice(0, 100).map((r, i) => <li key={`${r.index}-${i}`}>Row {r.index}: {r.reason}</li>)}</ul></details>;
}
export default function BankFileImport() {
  const log = useDeviceRecord(MONEY_LOG), [lastIds, setLastIds] = useState<ReadonlySet<string>>(new Set());
  if (!log.loaded) return <p className="fine">Loading your money log…</p>;
  if (log.unreadable) return <p role="alert">This device&rsquo;s money log could not be read, so nothing can be added to it now. Its bytes are kept.</p>;
  return <BankFileImportView log={log.data} onAdd={rows => {
    const out = toMoneyEntries(rows, log.data, new Date(), () => crypto.randomUUID());
    if (out.entries.length) log.update(current => addEntries(current, out.entries));
    setLastIds(new Set(out.entries.map(e => e.id)));
    return {added: out.entries.length, refused: out.refused};
  }} onUndo={() => { log.update(current => removeEntries(current, lastIds)); setLastIds(new Set()); }}/>;
}
