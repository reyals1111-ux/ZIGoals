'use client';
import {useState, useSyncExternalStore} from 'react';
import {holdKey, readKey} from '../../../../lib/ai/keys';
import {currentAiScope} from '../../../../lib/ai/scope';
import {apiServerEnv, apiServerSteps, hermesKeyProblem, makeHermesKey} from '../../../../lib/nova/hermes-guide';
import {HERMES_KEY_SLOT} from '../../../../lib/nova/hermes-record';
import {GuideSteps} from '../../setup/steps/brain';
import {CommandBlock} from '../../setup/command-block';
import {HermesCheck} from '../hermes-check';
import {OsChoice, useOrigin, useOs} from '../os-choice';
import type {HermesState} from '../use-hermes';

const subscribeNothing = () => () => undefined;
/**
 * Planet 4: turn on Hermes's API server with a strong key of the person's own (made here in the browser, or on their
 * computer), this site allowed by its exact address. The key made here is held for this page only (sealed later, in
 * planet 7, if they choose); it is never sent anywhere but their own Hermes.
 */
export default function ApiStep({hermes}: {hermes: HermesState}) {
  const [os, setOs] = useOs(), origin = useOrigin(), scope = useSyncExternalStore(subscribeNothing, currentAiScope, () => 'local');
  const [key, setKey] = useState<string | null>(null), [cors, setCors] = useState(false), [show, setShow] = useState(false);
  const make = () => { const k = makeHermesKey(); holdKey(scope, HERMES_KEY_SLOT, k); setKey(k); };
  const env = apiServerEnv(os, origin, key);
  const run = async () => {
    let k = key; if (!k) { try { k = await readKey(scope, HERMES_KEY_SLOT); } catch { k = null; } }
    const problem = k ? hermesKeyProblem(k) : null;
    if (k && problem) return {ok: false, note: problem};
    return {ok: true, note: `The API server lines are set${k ? ', with a strong key held on this device' : ''}, and this site (${origin}) is allowed. Planet 5 starts it.`};
  };
  return <>
    <OsChoice os={os} onChange={setOs}/>
    {/* Session AK P3 (ND-8): "Make a key here" stands with step 1's command (the key the person would make there); once a
        key is made, its buttons and note lead the steps. The .env alternative is its own copyable block. */}
    {key && <><div className="ai-card-actions"><button type="button" className="secondary" onClick={make}>Make another key</button><button type="button" className="text-link" onClick={() => setShow(v => !v)}>{show ? 'Hide the key' : 'Show the key'}</button></div>
      <p className="fine">A key of 64 characters was made in this browser and put into the commands below{show ? `: ${key}` : ''}. It stays in this page until you connect in planet 7.</p></>}
    <GuideSteps steps={apiServerSteps(os, origin, key)} after={key ? undefined : {0: <div className="ai-card-actions nova-step-action"><button type="button" className="secondary" onClick={make}>Make a key here</button></div>}}/>
    <p className="fine">Or put these lines in {env.path} instead:</p>
    <CommandBlock command={env.lines} shell=".env"/>
    <p className="fine">{env.note}</p>
    <label className="ai-check"><input type="checkbox" checked={cors} onChange={e => setCors(e.target.checked)}/> “hermes config get API_SERVER_CORS_ORIGINS” printed exactly {origin}</label>
    <HermesCheck id="api" hermes={hermes} run={run} disabled={!cors} label="Done — check it"/>
  </>;
}
