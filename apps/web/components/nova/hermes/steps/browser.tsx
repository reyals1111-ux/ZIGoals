'use client';
import {useEffect, useState, useSyncExternalStore} from 'react';
import {HERMES_DEFAULT_BASE} from '../../../../lib/nova/hermes-record';
import {browserKind, loopbackNote, loopbackPermission, type LoopbackState} from '../../../../lib/nova/local-servers';
import {testHermes} from '../../../../lib/nova/hermes';
import {HermesCheck} from '../hermes-check';
import {useOrigin} from '../os-choice';
import type {HermesState} from '../use-hermes';

const subscribeNothing = () => () => undefined;
/**
 * Planet 6: let the browser reach Hermes. Hermes's own allowlist (API_SERVER_CORS_ORIGINS, planet 4) answers this site;
 * the browser asks once for "apps on this device". The check reads /health from this page and names which of the three
 * blocks it met: not running, this site not allowed, or the browser's permission.
 */
export default function BrowserStep({hermes}: {hermes: HermesState}) {
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => ''), origin = useOrigin(), [permission, setPermission] = useState<LoopbackState>('unknown');
  useEffect(() => { let live = true; void loopbackPermission().then(p => { if (live) setPermission(p); }); return () => { live = false; }; }, []);
  const run = async () => {
    const t = await testHermes(hermes.record.data.baseUrl ?? HERMES_DEFAULT_BASE, null, {permission: loopbackPermission});
    setPermission(await loopbackPermission());
    if (t.ok || t.problem === 'wrong-key') return {ok: true, note: 'This browser reads Hermes’s answers: /health said “ok”.'};
    return {ok: false, note: `${t.title} ${t.steps[0] ?? ''}`};
  };
  return <>
    <p>Hermes answers only the sites on its allowlist: API_SERVER_CORS_ORIGINS must be exactly <code>{origin}</code> (planet 4), and the gateway restarted after the change. No extra program or proxy is needed.</p>
    <p className="nova-note" role="note">{loopbackNote(browserKind(ua), false)}{permission === 'denied' && <b> This site is blocked from apps on this device now.</b>}</p>
    <HermesCheck id="browser" hermes={hermes} run={run} label="Test from this page"/>
  </>;
}
