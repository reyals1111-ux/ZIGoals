'use client';
import {useState} from 'react';
import type {ImportRecord} from '../../lib/import/undo-schema';
import type {ImportUndoStore} from './use-import-undo';
import {formatDateTime} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import './import.css';

/** The newest live import of this page's kind, as a status banner with Undo, until undone, dismissed or expired. */
/** True for an import made in the last 24 hours (a clock set back counts as recent). */
export const recentImport = (at: string, now = Date.now()) => { const t = Date.parse(at); return !Number.isFinite(t) || now - t < 86_400_000; };
export function ImportBanner({imports, kind, onUndo}: {imports: ImportUndoStore; kind: ImportRecord['kind']; onUndo: (record: ImportRecord) => Promise<void>}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  // Session AL (N-TK-27): the page banner is for a recent import (the last 24 hours); an older one stays undoable from the import sheet's Recent imports.
  const record = imports.live.find(r => r.kind === kind && !r.dismissed && recentImport(r.at));
  if (!record) return null;
  return <div role="status" className="import-banner">
    <p>{record.label} <span className="fine">(imported {formatDateTime(record.at)}).</span></p>
    {/* Session AL (P-MO-37; MO-075, MO-089): two real buttons, never centred plain text: Undo is the action, Dismiss the quiet one; neither wraps. */}<div className="actions"><button type="button" className="secondary" disabled={busy} onClick={() => { setBusy(true); setError(''); onUndo(record).catch(e => setError(plainErrorMessage(e, 'The import was not undone.'))).finally(() => setBusy(false)); }}>Undo import</button><button type="button" className="quiet" aria-label="Dismiss this notice" disabled={busy} onClick={() => { try { imports.dismiss(record.id); } catch (e) { setError(plainErrorMessage(e, 'Could not dismiss.')); } }}>Dismiss</button></div>
    {error && <p role="alert">{error}</p>}
  </div>;
}
