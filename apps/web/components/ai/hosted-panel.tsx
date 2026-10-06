'use client';
import {useState} from 'react';
import {HOSTED_DISCLOSURE} from '../../lib/ai/hosted';
import {AI_OPTIONS} from '../../lib/ai/store/records';
import type {HostedState} from './use-hosted';
import {useDeviceRecord} from './use-device-record';
import './agents-panel.css';

/**
 * Settings → "ZIGoals hosted" (Session V Part 17): only in a hosted build, for an account the relay says is invited.
 * The disclosure comes first, in full; "Use ZIGoals hosted" records the person's agreement (ai-options hostedConsent:
 * when, and whether Health may go) and chooses the route; "Stop using it" goes back to the person's own setup.
 */
export default function HostedPanel({entitlement}: {entitlement: Extract<NonNullable<HostedState['entitlement']>, {entitled: true}>}) {
  const options = useDeviceRecord(AI_OPTIONS), [health, setHealth] = useState(false), [note, setNote] = useState('');
  const using = options.data.route === 'hosted' && !!options.data.hostedConsent;
  const save = (change: Parameters<typeof options.update>[0], text: string) => { try { options.update(change); setNote(text); } catch { setNote('This choice could not be saved on this device.'); } };
  return <div className="ai-agents">
    <ul className="ai-agents-list">{HOSTED_DISCLOSURE(entitlement.provider, entitlement.model).map(line => <li key={line}>{line}</li>)}</ul>
    <p className="ai-note">Left today: {entitlement.remaining.requests.toLocaleString('en-US')} messages, about {entitlement.remaining.tokens.toLocaleString('en-US')} tokens.</p>
    {using ? <div className="ai-card-actions">
      <span className="ai-note">In use{options.data.hostedConsent?.health ? ', Health included through its gate' : ', without Health'}.</span>
      <button type="button" className="secondary" onClick={() => save(current => ({...current, route: null}), 'ZIGoals hosted is off. ZIGi uses your own setup again.')}>Stop using ZIGoals hosted</button>
    </div> : <>
      <label className="ai-check"><input type="checkbox" checked={health} onChange={e => setHealth(e.target.checked)}/> Also let Health go to ZIGoals hosted (only while the Health gate in these settings is open)</label>
      <div className="ai-card-actions"><button type="button" className="primary" onClick={() => save(current => ({...current, route: 'hosted', hostedConsent: {at: new Date().toISOString(), health}}), `ZIGoals hosted is on. Replies say "via ZIGoals hosted".`)}>I agree, use ZIGoals hosted</button></div>
    </>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </div>;
}
