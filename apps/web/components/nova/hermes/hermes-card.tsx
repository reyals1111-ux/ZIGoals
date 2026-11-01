'use client';
import Link from 'next/link';
import {hermesProgress, hermesStatus, NOVA_HERMES} from '../../../lib/nova/hermes-record';
import {HERMES_PLANETS} from '../../../lib/nova/hermes-model';
import {useDeviceRecord} from '../../ai/use-device-record';
import '../setup/setup.css';

/**
 * The Hermes card for NOVA's own page (lane NA's slot): the guide's progress and the gateway's last check, or, once linked,
 * the status line (reachable, the model it reported, the last response time). Hermes Agent is Nous Research's open-source
 * agent; ZIGoals has no partnership with it and runs no server for it.
 */
export function NovaHermesCard() {
  const record = useDeviceRecord(NOVA_HERMES);
  if (!record.loaded) return null;
  const progress = hermesProgress(record.data), status = hermesStatus(record.data);
  if (record.data.cardHidden && !status.connected) return null;
  const line = status.connected ? status.reachable ? `Gateway reachable${status.model ? ` · ${status.model}` : ''}${status.lastMs !== undefined ? ` · ${status.lastMs} ms` : ''}` : 'Gateway not reachable at the last check' : null;
  return <section className="nova-setup-card nova-hermes-card" aria-labelledby="nova-hermes-card-title">
    <p className="eyebrow">Your own agent</p>
    <h2 id="nova-hermes-card-title">{status.connected ? 'Hermes Agent' : 'Connect your Hermes Agent'}</h2>
    <p>{line ?? (progress.done ? `${progress.done} of 10 planets lit. Next: ${HERMES_PLANETS[progress.next!].label}.` : 'Already run Nous Research’s Hermes Agent? Connect it as NOVA’s brain, or as a second agent NOVA can ask.')}</p>
    {status.connected && <p className="fine">{status.localModelConfirmed ? 'You confirmed it runs a local model.' : 'Treated as a cloud until you confirm it runs a local model: what NOVA sends it is redacted in Strict and Guarded.'}</p>}
    <div className="ai-card-actions"><Link className={status.connected ? 'secondary' : 'primary'} href="/app/nova/hermes">{status.connected ? 'Hermes guide' : progress.done ? 'Continue the guide' : 'Start the guide'}</Link></div>
  </section>;
}
