'use client';
import Link from 'next/link';
import {useState} from 'react';
import {checkNovaScopes} from '../../../../lib/nova/setup-scopes';
import {setScope} from '../../../../lib/nova/scopes';
import type {NovaScope} from '../../../../lib/ai/context-pack/nova';
import {deviceSettingFailureMessage} from '../../../../lib/storage-error-copy';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {CheckRow} from '../check-row';
import {useNovaSees, WhatNovaSees} from '../what-nova-sees';
import type {SetupState} from '../use-setup';

const AREAS = [['today', 'Today', 'Agenda, tasks, focus, music and chess'], ['goals', 'Goals', 'Goals and their pace'], ['habits', 'Habits', 'Habits and streaks'], ['wealth', 'Wealth', 'Money log, budgets, bills, what each asset is for']] as const;
/**
 * Planet 5: the data scopes, pillar by pillar, on the same switches NOVA → Permissions shows (ZIGi's per-area choices: one
 * model for both). Health is off by default and only through its three-part gate; the journal follows its own sharing
 * switch in Journal. The exact NOVA pack is shown, as it would leave for the connected model.
 */
export default function ScopesStep({setup}: {setup: SetupState}) {
  const settings = useAiSettings(), s = settings.data, mode = setup.record.unreadable ? 'strict' : setup.record.data.privacyMode ?? null;
  const sees = useNovaSees(s, mode), [error, setError] = useState('');
  // Security review Z1A-10: one switch here writes both records the send reads: ZIGi's share switch and NOVA → Permissions.
  const set = (change: Parameters<typeof settings.update>[0], scope: NovaScope, on: boolean) => { try { settings.update(change); setup.record.update(r => setScope(r, scope, on)); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  const health = s.pageShare.health && s.includeHealth && sees.scopes.health;
  return <>
    <p>Choose what NOVA may read. These are the same switches as NOVA → Permissions and Settings → ZIGi: what one may read, the other may too.</p>
    <fieldset className="nova-scopes"><legend>NOVA may read</legend>
      {AREAS.map(([key, label, hint]) => <label key={key} className="ai-check"><input type="checkbox" checked={s.pageShare[key] && sees.scopes[key]} onChange={e => { const on = e.target.checked; set(c => ({...c, pageShare: {...c.pageShare, [key]: on}}), key, on); }}/> {label} <small>{hint}</small></label>)}
      <label className="ai-check"><input type="checkbox" checked={health} onChange={e => { const on = e.target.checked; set(c => ({...c, includeHealth: on, pageShare: {...c.pageShare, health: on}}), 'health', on); }}/> Health <small>Off unless you choose it. Health also needs Health on your Today layout, and with an account its Health permission.</small></label>
    </fieldset>
    <p className="fine">Notes ({sees.scopes.notes ? 'on' : 'off'} now) and your journal ({sees.scopes.journal ? 'on' : 'off'} now) go to NOVA only when you turn them on in NOVA → Permissions; the journal also needs its own sharing switch in <Link className="text-link" href="/app/journal">Journal</Link>. Earn counts only once you chose the chain.</p>
    {health && !sees.healthGate && <p className="nova-note" role="note">Health is chosen, but its gate is still closed: add Health to your Today layout (Customize), and with an account allow Health sync on this device.</p>}
    {error && <p role="alert" className="fine">{error}</p>}
    <h3 className="nova-sub">What NOVA can see</h3>
    <WhatNovaSees sees={sees}/>
    <CheckRow id="scopes" setup={setup} disabled={!sees.pack} run={() => sees.pack ? checkNovaScopes(sees.scopes, sees.pack, sees.chainChosen, sees.healthGate) : {ok: false, note: 'Your records are still loading.'}} label="Check what NOVA sees"/>
  </>;
}
