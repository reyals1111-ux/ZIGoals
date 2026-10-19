'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {STAKING_PREFS} from '../../lib/staking/prefs';
import {VALIDATOR_ALERTS, alertsOff, withAlertsOff} from '../../lib/validators/health';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './af-signing-section.css';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H72, H73): staking and voting choices on this device — the lead mounts it in
 * Settings. "Forget my staking choices" removes `zigoals:staking-prefs:v1` (the network last chosen, the first real-network
 * confirm, the last validator per network, whether practice badges are on), so the next real-network action asks the
 * confirm again; the staking journal (the transactions signed here) is kept. The validator-alert switch is the `off` field
 * of `zigoals:validator-alerts:v1`: off, Staking shows no validator alerts and keeps no new baselines. Both device-only.
 */
export function AfSigningSection() {
  const prefs = useDeviceRecord(STAKING_PREFS), alerts = useDeviceRecord(VALIDATOR_ALERTS);
  const [status, setStatus] = useState(''), [error, setError] = useState('');
  const kept = prefs.loaded && (prefs.unreadable || Object.keys(prefs.data).some(k => k !== 'version'));
  const usable = alerts.loaded && !alerts.unreadable, on = usable && !alertsOff(alerts.data);
  const forget = () => {
    try { prefs.clear(); setStatus('Forgotten on this device. The next real-network action asks you to confirm again; your signed transactions are kept.'); setError(''); }
    catch (cause) { setError(deviceSettingFailureMessage(cause)); }
  };
  return <div className="af-signing-setting">
    <label className="af-signing-setting-row"><input type="checkbox" role="switch" checked={on} disabled={!usable} onChange={e => { try { alerts.update(r => withAlertsOff(r, !e.target.checked)); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } }}/>
      <span><strong>Validator alerts on Staking — on this device</strong><small>Jailed, missing blocks, or a commission change for the validators you stake with, shown on the Staking page only. ZIGoals sends no notifications.</small></span>
    </label>
    <div className="af-signing-setting-row">
      <span><strong>Your staking choices</strong><small>The network you last chose, your real-network confirm, the last validator per network and whether practice badges are on.</small></span>
      <button type="button" className="secondary" onClick={forget} disabled={!prefs.loaded || !kept}>Forget my staking choices</button>
    </div>
    <p className="fine"><Link className="text-link" href="/app/staking">Open Staking →</Link> · <Link className="text-link" href="/app/governance">Open Governance →</Link></p>
    {status && <p role="status">{status}</p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
