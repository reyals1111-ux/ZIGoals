'use client';
import {useEffect, useId, useMemo, useState, type FormEvent, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useDeviceRecord} from '../../ai/use-device-record';
import {ACCOUNTS, type AccountKind} from '../../../lib/accounts/schema';
import {localDate} from '../../../lib/local-date';
import {formatDate} from '../../../lib/visual-format';
import {EMERGENCY_SHEET, MAX_NOTE, MAX_SHEET_ROWS, type EmergencySheet} from '../../../lib/emergency-sheet/schema';
import {addressIssue, printable, putRow, removeRow, setDocuments, setNote, sheetView, type SheetView} from '../../../lib/emergency-sheet/sheet';
import {findSecrets, findingText} from '../../../lib/emergency-sheet/secrets';
import {plainErrorMessage} from '../../../lib/plain-error';

/**
 * Session AK (lane M, item 17): "If something happens to me" — a printable page for the people the person trusts: their
 * accounts (from Wealth: name, institution, kind, approximate value) with where the documents are, other accounts,
 * wallets by PUBLIC address only, insurance and a note. Only the typed parts are kept (zigoals:emergency-sheet:v1). It
 * never holds keys or recovery words: while any field looks like one, the sheet refuses to print and names the field.
 * Printing uses the browser's own print dialog on a print-only copy of the page (React escapes every text); nothing is
 * uploaded or sent. Lazy-loaded by Money tools.
 */
const KIND: Record<AccountKind, string> = {cash: 'Cash', savings: 'Savings', investment: 'Investment', pension: 'Pension', property: 'Property', vehicle: 'Vehicle', 'other-asset': 'Other asset', loan: 'Loan', mortgage: 'Mortgage', 'credit-card': 'Credit card', 'other-debt': 'Other debt'};
type List = 'accounts' | 'wallets' | 'insurance';
const FIELDS: Record<List, {key: string; label: string; required?: boolean; max: number}[]> = {
  accounts: [{key: 'name', label: 'Name', required: true, max: 80}, {key: 'institution', label: 'Institution', max: 80}, {key: 'kind', label: 'Kind', max: 40}, {key: 'value', label: 'Approximate value', max: 40}, {key: 'documents', label: 'Where the documents are', max: 200}],
  wallets: [{key: 'label', label: 'Name', required: true, max: 80}, {key: 'network', label: 'Network', max: 40}, {key: 'address', label: 'Public address', required: true, max: 120}, {key: 'documents', label: 'Where the documents are', max: 200}],
  insurance: [{key: 'provider', label: 'Insurer', required: true, max: 80}, {key: 'kind', label: 'Kind', max: 60}, {key: 'reference', label: 'Policy number', max: 60}, {key: 'documents', label: 'Where the documents are', max: 200}],
};
const TITLES: Record<List, string> = {accounts: 'Other accounts', wallets: 'Wallets (public address only)', insurance: 'Insurance'};

export default function EmergencySheetPanel({showcase = false}: {showcase?: boolean}) {
  const id = useId(), today = localDate(), sheet = useDeviceRecord(EMERGENCY_SHEET), accounts = useDeviceRecord(ACCOUNTS);
  const [docs, setDocs] = useState<Record<string, string> | null>(null), [note, setNoteDraft] = useState<string | null>(null);
  const [status, setStatus] = useState(''), [error, setError] = useState(''), [refusal, setRefusal] = useState<string[]>([]), [printing, setPrinting] = useState(false);
  const live = useMemo(() => accounts.loaded && !accounts.unreadable ? accounts.data.items.filter(a => !a.archivedAt) : [], [accounts.loaded, accounts.unreadable, accounts.data.items]);
  const draft: EmergencySheet = useMemo(() => ({...sheet.data, documents: docs ?? sheet.data.documents, note: note ?? sheet.data.note}), [sheet.data, docs, note]);
  const view: SheetView = useMemo(() => sheetView(draft, live, today, k => KIND[k], d => formatDate(d)), [draft, live, today]);
  const warnings = useMemo(() => findSecrets([['The note', note ?? ''], ...Object.entries(docs ?? {}).map(([aid, text]): [string, string] => [`Where the documents are for ${live.find(a => a.id === aid)?.name ?? 'an account'}`, text])]).map(findingText), [note, docs, live]);
  useEffect(() => {
    if (!printing) return;
    const done = () => { document.documentElement.classList.remove('emergency-printing'); setPrinting(false); };
    document.documentElement.classList.add('emergency-printing');
    window.addEventListener('afterprint', done, {once: true});
    const timer = window.setTimeout(() => { window.print(); }, 50);
    return () => { window.clearTimeout(timer); window.removeEventListener('afterprint', done); document.documentElement.classList.remove('emergency-printing'); };
  }, [printing]);
  const write = (fn: (s: EmergencySheet) => EmergencySheet, words: string) => {
    setError('');
    try { sheet.update(fn); setStatus(words); return true; } catch (cause) { setStatus(''); setError(plainErrorMessage(cause, 'Not saved on this device.')); return false; }
  };
  const saveTexts = () => {
    if (warnings.length) { setError('Not saved: take out what looks like a key or recovery words first.'); return; }
    const now = new Date();
    if (write(s => { let next = s; for (const [aid, text] of Object.entries(docs ?? {})) next = setDocuments(next, aid, text, now); return note === null ? next : setNote(next, note, now); }, 'Saved on this device.')) { setDocs(null); setNoteDraft(null); }
  };
  const print = () => {
    setRefusal([]); setStatus('');
    const out = printable(view);
    if (!out.ok) { setRefusal(out.findings.map(findingText)); return; }
    setPrinting(true);
  };
  if (!sheet.loaded || !accounts.loaded) return <p className="fine">Loading…</p>;
  if (sheet.unreadable) return <p role="alert">This device&rsquo;s emergency sheet could not be read. Its bytes are kept and nothing is changed.</p>;
  return <section className="money-panel emergency-sheet" aria-labelledby={`${id}-title`}>
    <h4 id={`${id}-title`}>If something happens to me</h4>
    <p className="fine">A page for the people you trust: what you have and where the papers are. Print it or save it as a PDF and keep it somewhere safe. It is kept on this device only and nothing is sent.</p>
    <p className="notice">Never write passwords, PINs, private keys or recovery words here. Write where they are kept instead. The sheet will not print while a field looks like a key or recovery words.</p>
    {showcase && <p className="fine">Showcase: the accounts below are fictional examples.</p>}

    <h5>Your accounts in Wealth</h5>
    {live.length ? <ul className="money-list">{live.map(a => <li key={a.id} className="emergency-account">
      <span><strong>{a.name}</strong><span className="fine"> · {KIND[a.kind]}{a.institution ? ` · ${a.institution}` : ''}</span></span>
      <label className="field"><span>Where the documents are</span><input maxLength={200} value={(docs ?? sheet.data.documents)[a.id] ?? ''} onChange={e => setDocs({...(docs ?? sheet.data.documents), [a.id]: e.target.value})} placeholder="Grey folder, top drawer of the desk"/></label>
    </li>)}</ul> : <p className="fine">No accounts in Wealth yet. Add them under What you have → Accounts, or list them below.</p>}
    <label className="field"><span>A note for the people you trust — optional</span><textarea rows={4} maxLength={MAX_NOTE} value={note ?? sheet.data.note ?? ''} onChange={e => setNoteDraft(e.target.value)} placeholder="Who to call first, where the will is, which bills are automatic."/></label>
    {warnings.length > 0 && <ul className="emergency-warnings" role="alert">{warnings.map(w => <li key={w}>{w} Take it out and write where it is kept instead.</li>)}</ul>}
    <div className="money-actions"><button type="button" className="secondary" disabled={docs === null && note === null} onClick={saveTexts}>Save notes</button></div>

    {(['accounts', 'wallets', 'insurance'] as const).map(list => <RowList key={list} list={list} sheet={sheet.data} onAdd={(row, words) => write(s => putRow(s, list, row as never, new Date()), words)} onRemove={(rowId, words) => write(s => removeRow(s, list, rowId, new Date()), words)}/>)}

    <div className="money-actions"><button type="button" className="primary" onClick={print}>Print or save as PDF</button></div>
    {refusal.length > 0 && <div role="alert" className="emergency-refusal"><p><strong>Not printed.</strong> These fields look like a key or recovery words, which must never be on paper here:</p><ul>{refusal.map(r => <li key={r}>{r}</li>)}</ul></div>}
    <p className="money-status" role="status" aria-live="polite">{status}</p>
    {error && <p role="alert">{error}</p>}
    {printing && typeof document !== 'undefined' && createPortal(<PrintSheet view={view} today={today}/>, document.body)}
  </section>;
}

function RowList({list, sheet, onAdd, onRemove}: {list: List; sheet: EmergencySheet; onAdd: (row: Record<string, string>, words: string) => boolean; onRemove: (id: string, words: string) => void}) {
  const id = useId(), [form, setForm] = useState<Record<string, string>>({}), [problem, setProblem] = useState('');
  const rows = sheet[list] as unknown as ({id: string} & Record<string, string | undefined>)[], fields = FIELDS[list];
  const add = (event: FormEvent) => {
    event.preventDefault(); setProblem('');
    const missing = fields.find(f => f.required && !form[f.key]?.trim());
    if (missing) return setProblem(`Enter the ${missing.label.toLowerCase()}.`);
    if (list === 'wallets') { const issue = addressIssue(form.address ?? ''); if (issue) return setProblem(issue); }
    const found = findSecrets(fields.map(f => [f.label, form[f.key]] as const));
    if (found.length) return setProblem(`Not added: ${found.map(findingText).join(' ')} Write where it is kept instead.`);
    const row: Record<string, string> = {id: crypto.randomUUID()};
    for (const f of fields) if (form[f.key]?.trim()) row[f.key] = form[f.key]!.trim();
    if (onAdd(row, `${row[fields[0]!.key]} added.`)) setForm({});
  };
  return <section className="emergency-list" aria-labelledby={`${id}-title`}>
    <h5 id={`${id}-title`}>{TITLES[list]}</h5>
    {rows.length > 0 && <ul className="money-list">{rows.map(r => <li key={r.id} className="emergency-row">
      <span className="money-rule-text">{fields.map(f => r[f.key]).filter(Boolean).join(' · ')}</span>
      <button type="button" className="quiet" onClick={() => onRemove(r.id, `${r[fields[0]!.key]} removed.`)} aria-label={`Remove ${r[fields[0]!.key]}`}>Remove</button>
    </li>)}</ul>}
    {rows.length < MAX_SHEET_ROWS && <form className="money-form" onSubmit={add} aria-label={`Add to ${TITLES[list].toLowerCase()}`}>
      <div className="money-grid">{fields.map(f => <label key={f.key} className="field"><span>{f.label}{f.required ? '' : ' — optional'}</span><input maxLength={f.max} autoComplete="off" spellCheck={f.key === 'address' ? false : undefined} value={form[f.key] ?? ''} onChange={e => setForm(x => ({...x, [f.key]: e.target.value}))}/></label>)}</div>
      {problem && <p role="alert">{problem}</p>}
      <button type="submit" className="secondary">Add</button>
    </form>}
  </section>;
}

/** The print-only copy: plain black on white, shown only while the browser prints (money-tools.css). */
function PrintSheet({view, today}: {view: SheetView; today: string}) {
  const table = (head: string[], rows: string[][]): ReactNode => <table><thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>;
  return <div className="emergency-print-root" aria-hidden="true">
    <h1>If something happens to me</h1>
    <p>Written on {formatDate(today)}. Amounts are approximate, from the last balance entered. This page holds no passwords, keys or recovery words.</p>
    <h2>Accounts</h2>
    {view.accounts.length ? table(['Name', 'Institution', 'Kind', 'Approximate value', 'Where the documents are'], view.accounts.map(a => [a.name, a.institution, a.kind, a.value, a.documents])) : <p>None listed.</p>}
    {view.wallets.length > 0 && <><h2>Wallets (public address only)</h2>{table(['Name', 'Network', 'Public address', 'Where the documents are'], view.wallets.map(w => [w.label, w.network ?? '', w.address, w.documents ?? '']))}</>}
    {view.insurance.length > 0 && <><h2>Insurance</h2>{table(['Insurer', 'Kind', 'Policy number', 'Where the documents are'], view.insurance.map(x => [x.provider, x.kind ?? '', x.reference ?? '', x.documents ?? '']))}</>}
    {view.note && <><h2>Note</h2><p className="emergency-print-note">{view.note}</p></>}
  </div>;
}
