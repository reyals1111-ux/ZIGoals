'use client';
import {useState} from 'react';
import {stepCheck, stepDone, type SetupCheck, type SetupStepId} from '../../../lib/nova/setup';
import type {CheckResult} from '../../../lib/nova/setup-checks';
import {deviceSettingFailureMessage} from '../../../lib/storage-error-copy';
import {formatDateTime} from '../../../lib/visual-format';
import type {SetupState} from './use-setup';

/**
 * A planet's check: the button that runs it, and its last result kept on this device (when, passed or not, and what it
 * saw). A passing check lights the planet; "Mark as not done" puts it back. Results are announced politely. Shared by both
 * planet guides (NOVA's and Hermes's), each with its own record.
 */
export function CheckRowBase({id, last, done, save, reopen, run, label = 'Check it worked', disabled}: {id: string; last: SetupCheck | null; done: boolean; save: (result: CheckResult) => void; reopen: () => void; run: () => Promise<CheckResult> | CheckResult; label?: string; disabled?: boolean}) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const go = async () => {
    setBusy(true); setError('');
    try { save(await run()); }
    catch (cause) { setError(deviceSettingFailureMessage(cause)); }
    finally { setBusy(false); }
  };
  const back = () => { try { reopen(); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <div className="nova-guide-check" data-check={id} data-ok={last ? String(last.ok) : undefined}>
    <div className="ai-card-actions">
      <button type="button" className={done ? 'secondary' : 'primary'} onClick={() => void go()} disabled={busy || disabled}>{busy ? 'Checking…' : done ? 'Check again' : label}</button>
      {/* Session AK lane EXF (EX-13): an action, so it reads as one ("Not done yet" read as a status beside "Checked: it works"). */}
      {done && <button type="button" className="text-link" onClick={back}>Mark as not done</button>}
    </div>
    <p className="nova-guide-check-result" role="status" aria-live="polite">
      {last ? <><b>{last.ok ? 'Checked: it works.' : 'Not yet.'}</b> {last.note} <span className="fine">({formatDateTime(last.at)})</span></> : <span className="fine">Not checked yet.</span>}
    </p>
    {error && <p role="alert" className="fine">{error}</p>}
  </div>;
}
/** The NOVA guide's check row (`zigoals:nova-setup:v1`). */
export function CheckRow({id, setup, run, label, disabled}: {id: SetupStepId; setup: SetupState; run: () => Promise<CheckResult> | CheckResult; label?: string; disabled?: boolean}) {
  return <CheckRowBase id={id} last={stepCheck(setup.record.data, id)} done={stepDone(setup.record.data, id)} save={result => setup.save(id, result)} reopen={() => setup.reopen(id)} run={run} label={label} disabled={disabled}/>;
}
