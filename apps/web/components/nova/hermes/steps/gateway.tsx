'use client';
import {GATEWAY_RESTART, gatewaySteps, WSL_NOTE} from '../../../../lib/nova/hermes-guide';
import {HERMES_DEFAULT_BASE} from '../../../../lib/nova/hermes-record';
import {loopbackPermission} from '../../../../lib/nova/local-servers';
import {testHermes} from '../../../../lib/nova/hermes';
import {GuideSteps} from '../../setup/steps/brain';
import {HermesCheck} from '../hermes-check';
import {OsChoice, useOs} from '../os-choice';
import type {HermesState} from '../use-hermes';

/** Planet 5: start `hermes gateway` and keep it running; the check asks whether anything answers on its port. */
export default function GatewayStep({hermes}: {hermes: HermesState}) {
  const [os, setOs] = useOs();
  const run = async () => {
    const t = await testHermes(hermes.record.data.baseUrl ?? HERMES_DEFAULT_BASE, null, {permission: loopbackPermission});
    if (t.ok || t.problem === 'needs-key' || t.problem === 'wrong-key' || t.problem === 'cors') return {ok: true, note: `The gateway is running on this computer${t.ok && t.version ? ` (Hermes ${t.version})` : ''}.${!t.ok && t.problem === 'cors' ? ' The browser cannot read it yet: planet 6.' : ''}`};
    return {ok: false, note: `${t.title} ${t.steps[0] ?? ''}`};
  };
  return <>
    <OsChoice os={os} onChange={setOs}/>
    <GuideSteps steps={gatewaySteps(os)}/>
    <p className="fine">{GATEWAY_RESTART}{os === 'windows' ? ` ${WSL_NOTE}` : ''}</p>
    <HermesCheck id="gateway" hermes={hermes} run={run} label="Is it running?"/>
  </>;
}
