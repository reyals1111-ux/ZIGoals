'use client';
import {useState} from 'react';
import {newHealthId, saveWeight, type HealthData} from '../../lib/health';
import {readWeightCsv, type WeightCsvPlan} from '../../lib/health-weight-csv';
import {weightText, type WeightUnit} from '../../lib/health-units';
import {formatDate} from '../../lib/visual-format';
import {changeWithUndo} from '../ui/remove-with-undo';
import {plainErrorMessage} from '../../lib/plain-error';

/**
 * Session AL (P-MO-62, MO-029): "Import weights from a file": a CSV or pasted lines of date and weight, read on this
 * device, previewed line by line, then saved together with one Undo that takes exactly those readings back out.
 */
export function WeightCsvImport({data, update, unit, today}: {data: HealthData; update: (updater: (latest: HealthData) => HealthData) => Promise<unknown>; unit: WeightUnit; today: string}) {
  const [text, setText] = useState(''), [plan, setPlan] = useState<WeightCsvPlan | null>(null), [note, setNote] = useState(''), [busy, setBusy] = useState(false);
  const read = (value: string) => { setText(value); setNote(''); setPlan(value.trim() ? readWeightCsv(value, {unit, today, existing: data.weights.map(w => w.date)}) : null); };
  async function confirm() {
    if (!plan?.rows.length) return;
    setBusy(true);
    try {
      const at = new Date().toISOString(), rows = plan.rows;
      await changeWithUndo(update, latest => rows.reduce((acc, r) => acc.weights.some(w => w.date === r.date) ? acc : saveWeight(acc, {id: newHealthId(), date: r.date, grams: r.grams}, at), latest), `${rows.length} ${rows.length === 1 ? 'weight' : 'weights'} imported.`, {undone: 'The imported weights are removed.'});
      setPlan(null); setText(''); setNote(`${rows.length} ${rows.length === 1 ? 'reading' : 'readings'} added to your weight journal.`);
    } catch (e) { setNote(plainErrorMessage(e, 'The weights were not imported.')); } finally { setBusy(false); }
  }
  return <details className="panel health-weight-import"><summary className="health-fold-button" data-icon="template">Import weights from a file</summary>
    <p className="fine">A CSV or text with one reading per line: <code>2026-11-04, 72.5</code>, with kg or lb after the number or in a third column ({unit} when none). Read on this device; a day that already has a reading keeps it.</p>
    <label className="field"><span>Weight file (CSV or text)</span><input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; if (f.size > 1_000_000) { setNote('Choose a file under 1 MB.'); return; } read(await f.text()); }}/></label>
    <label className="field"><span>Or paste the lines</span><textarea rows={4} value={text} onChange={e => read(e.target.value)} placeholder={'date,weight\n2026-11-03,72.4\n2026-11-04,72.1'}/></label>
    {plan && <section aria-label="Weight import preview" className="health-preview">
      <p><strong>{plan.rows.length} {plan.rows.length === 1 ? 'reading' : 'readings'} to add</strong>{plan.kept ? ` · ${plan.kept} ${plan.kept === 1 ? 'day already has a reading (kept)' : 'days already have a reading (kept)'}` : ''}{plan.issues.length ? ` · ${plan.issues.length} ${plan.issues.length === 1 ? 'line' : 'lines'} not read` : ''}</p>
      {plan.rows.length > 0 && <ul className="fine">{plan.rows.slice(0, 8).map(r => <li key={r.line}>{formatDate(r.date)} · {weightText(r.grams, unit)}</li>)}{plan.rows.length > 8 && <li>and {plan.rows.length - 8} more</li>}</ul>}
      {plan.issues.length > 0 && <ul className="field-error">{plan.issues.slice(0, 8).map(i => <li key={i.line}>{i.reason}</li>)}</ul>}
      <div className="actions"><button type="button" className="primary" disabled={busy || !plan.rows.length} onClick={() => void confirm()}>{plan.rows.length ? `Import ${plan.rows.length} ${plan.rows.length === 1 ? 'reading' : 'readings'}` : 'Nothing to import'}</button><button type="button" className="quiet" onClick={() => read('')}>Cancel import</button></div>
    </section>}
    {note && <p role="status">{note}</p>}
  </details>;
}
