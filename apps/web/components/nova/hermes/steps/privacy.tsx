'use client';
import {guardRequest} from '../../../../lib/ai/privacy-mode';
import {hermesRequest} from '../../../../lib/nova/hermes';
import {confirmLocalModel, HERMES_DEFAULT_BASE, hermesNeedsRedaction} from '../../../../lib/nova/hermes-record';
import {PRIVACY_WORDS, privacyMode} from '../../../../lib/nova/privacy-mode';
import {NOVA_SETUP} from '../../../../lib/nova/setup';
import {localDate} from '../../../../lib/local-date';
import {deviceSettingFailureMessage} from '../../../../lib/storage-error-copy';
import Link from 'next/link';
import {useState} from 'react';
import {LOCAL_CHECK_COMMANDS, LOCAL_CHECKLIST} from '../../../../lib/nova/hermes-guide';
import {CommandBlock} from '../../setup/command-block';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {AboutToSend} from '../../setup/about-to-send';
import {HermesCheck} from '../hermes-check';
import type {HermesState} from '../use-hermes';

const SAMPLE = 'Plan my week around my sister Anna’s birthday dinner; budget €184.50.';
/**
 * Planet 8: the privacy mode with Hermes. Hermes runs on this computer but may itself call a cloud model and use tools,
 * so it counts as local (Strict-safe) only once the person confirms their Hermes runs a local model; until then NOVA sends
 * it the redacted copy in Strict and Guarded. What Hermes does next is governed by Hermes's own settings: ZIGoals never
 * sees, stores or proxies any of it.
 */
export default function PrivacyStep({hermes}: {hermes: HermesState}) {
  const setup = useDeviceRecord(NOVA_SETUP), mode = setup.unreadable ? 'strict' : setup.data.privacyMode ?? null;
  const confirmed = hermes.record.data.localModelConfirmed === true, [error, setError] = useState(''), [ticks, setTicks] = useState<boolean[]>(() => LOCAL_CHECKLIST.map(() => confirmed));
  const set = (value: boolean) => { try { hermes.record.update(r => confirmLocalModel(r, value, localDate())); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  const run = async () => {
    const base = hermes.record.data.baseUrl ?? HERMES_DEFAULT_BASE, probe = hermesRequest({base, key: null, model: 'hermes-agent', system: 'Probe.', question: SAMPLE});
    const out = await guardRequest(probe), redacted = out.messages[0]!.content !== SAMPLE, expected = hermesNeedsRedaction(privacyMode(), confirmed);
    if (redacted !== expected) return {ok: false, note: 'The privacy rule did not hold in the test. Reload and try again.'};
    const now = privacyMode();
    return {ok: true, note: `${now ? PRIVACY_WORDS[now].label : 'No mode chosen'}: your Hermes gets ${redacted ? `the redacted copy (“${out.messages[0]!.content}”)` : 'your words as they are'}.`};
  };
  return <>
    <p>Whatever NOVA sends your Hermes is then handled by Hermes’s own settings: its model, its tools, its memory. ZIGoals never sees, stores or relays any of it, and NOVA never asks Hermes to sign, send or move money. Anything Hermes suggests for your ZIGoals records comes back as a card you confirm, with Undo.</p>
    <p>Your privacy mode is <b>{mode ? PRIVACY_WORDS[mode].label : 'not chosen yet'}</b>{mode === null && <> — choose one in <Link className="text-link" href="/app/nova/setup">Build your own NOVA</Link>, planet 2</>}.</p>
    <p>Before you count Hermes as local, read its settings:</p>
    {LOCAL_CHECK_COMMANDS.map(c => <CommandBlock key={c} command={c}/>)}
    <fieldset className="nova-scopes"><legend>My Hermes is local when all four hold</legend>
      {LOCAL_CHECKLIST.map((line, i) => <label key={line} className="ai-check"><input type="checkbox" checked={ticks[i]} onChange={e => setTicks(t => t.map((v, j) => j === i ? e.target.checked : v))}/> {line}</label>)}
    </fieldset>
    <div className="ai-card-actions">
      {confirmed ? <button type="button" className="secondary" onClick={() => { set(false); setTicks(LOCAL_CHECKLIST.map(() => false)); }}>Treat my Hermes as a cloud again</button>
        : <button type="button" className="primary" disabled={!ticks.every(Boolean)} onClick={() => set(true)}>My Hermes runs a local model</button>}
    </div>
    <p className="fine">{confirmed ? 'Confirmed: in Strict, NOVA sends your Hermes your words as they are. The model is local; its tools may still go online.' : 'Until you confirm, NOVA treats Hermes like a cloud: in Strict and Guarded it sends the redacted copy.'}</p>
    {error && <p role="alert" className="fine">{error}</p>}
    <AboutToSend message={SAMPLE} mode={mode} provider="local" hermesUnconfirmed={!confirmed}/>
    <HermesCheck id="privacy" hermes={hermes} run={run} disabled={!setup.loaded} label="Check the rule holds"/>
  </>;
}
