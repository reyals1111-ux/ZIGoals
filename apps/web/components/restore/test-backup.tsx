'use client';
import {useId, useState} from 'react';
import type {TestReport} from '../../lib/restore/test-restore';
import {formatDate} from '../../lib/visual-format';

/**
 * Session AK Part 8.9: "Test a backup" — choose an Export everything ZIP and see that every part would restore, replayed
 * in a sandbox; nothing on this device is read or changed.
 */
export default function TestBackup() {
  const id = useId(), [report, setReport] = useState<TestReport | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const test = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(''); setReport(null);
    try { setReport(await (await import('../../lib/restore/test-restore')).testBackup(file)); }
    catch (e) { setError(e instanceof Error && e.message ? e.message : 'This file could not be read as an Export everything ZIP.'); }
    finally { setBusy(false); }
  };
  const failed = report?.parts.filter(p => !p.ok) ?? [];
  return <div className="test-backup">
    <label className="field" htmlFor={id}><span>Test a backup: choose an Export everything ZIP. Nothing on this device changes.</span><input id={id} type="file" accept=".zip,application/zip" disabled={busy} onChange={e => void test(e.target.files?.[0])}/></label>
    <div role="status" aria-live="polite">
      {busy && <p>Testing every part in a sandbox…</p>}
      {report && <p><strong>{failed.length ? `${report.ok} of ${report.parts.length} parts would restore.` : `All ${report.parts.length} parts would restore.`}</strong>{report.exportedAt && <> Made {formatDate(report.exportedAt.slice(0, 10))}{report.app ? ` by ZIGoals ${report.app}` : ''}.</>}{report.photos ? ` ${report.photos} photos.` : ''}{report.demo ? ' This is a Showcase (example) backup.' : ''}</p>}
    </div>
    {failed.length > 0 && <ul className="test-backup-problems">{failed.map(p => <li key={p.label}><strong>{p.label}</strong>: {p.reason}</li>)}</ul>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
