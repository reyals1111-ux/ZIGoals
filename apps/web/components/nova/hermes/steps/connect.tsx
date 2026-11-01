'use client';
import {useState, useSyncExternalStore} from 'react';
import {readKey, SHOWCASE_SCOPE} from '../../../../lib/ai/keys';
import {currentAiScope} from '../../../../lib/ai/scope';
import {HERMES_DEFAULT_BASE, HERMES_KEY_SLOT, hermesTestLine, normalizeHermesBase, testHermes, withCheck, type HermesTest} from '../../../../lib/nova/hermes';
import {loopbackPermission} from '../../../../lib/nova/local-servers';
import {hermesKeyProblem} from '../../../../lib/nova/hermes-guide';
import {hermesKeyToBrain, keepHermesKey} from '../../../../lib/nova/hermes-keys';
import {localDate} from '../../../../lib/local-date';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {HermesCheck} from '../hermes-check';
import type {HermesState} from '../use-hermes';

const subscribeNothing = () => () => undefined;
/**
 * Planet 7: connect the person's Hermes in ZIGoals. The address (default http://127.0.0.1:8642/v1) and the key
 * (API_SERVER_KEY), sealed in this browser's key store like every key (never synced, never sent to ZIGoals); a live test
 * of /health and /v1/models that names what answered; then, if they want, Hermes as NOVA's brain (ZIGi's own local
 * OpenAI-compatible connection, so the whole chat runs on their Hermes).
 */
export default function ConnectStep({hermes}: {hermes: HermesState}) {
  const settings = useAiSettings(), scope = useSyncExternalStore(subscribeNothing, currentAiScope, () => 'local'), showcase = scope === SHOWCASE_SCOPE;
  const [base, setBase] = useState(hermes.record.data.baseUrl ? `${hermes.record.data.baseUrl}/v1` : `${HERMES_DEFAULT_BASE}/v1`), [key, setKey] = useState(''), [remember, setRemember] = useState(false);
  const [test, setTest] = useState<HermesTest | null>(null), [brain, setBrain] = useState('');
  const isBrain = settings.data.enabled && settings.data.provider === 'local' && settings.data.baseUrl === hermes.record.data.baseUrl;
  const run = async () => {
    let clean: string;
    try { clean = normalizeHermesBase(base); } catch (cause) { return {ok: false, note: cause instanceof Error ? cause.message : 'Check the address.'}; }
    let secret = key.trim() || null;
    const problem = secret ? hermesKeyProblem(secret) : null;
    if (problem) return {ok: false, note: problem};
    if (secret) { await keepHermesKey(scope, secret, remember && !showcase); setKey(''); }
    else { try { secret = await readKey(scope, HERMES_KEY_SLOT); } catch { secret = null; } }
    const result = await testHermes(clean, secret, {permission: loopbackPermission});
    setTest(result);
    hermes.record.update(r => withCheck(r, result, clean, new Date()));
    // Session AK lane P7 (EX3-4): Hermes already NOVA's brain and a key that works now: the brain sends this key too (it
    // kept the one from "Use Hermes as NOVA's brain", and its button stays disabled, so a new key never reached NOVA's chat).
    if (result.ok && isBrain && clean === settings.data.baseUrl) { try { await hermesKeyToBrain(scope); } catch { /* the test result stands */ } }
    return {ok: result.ok, note: result.ok ? hermesTestLine(result) : `${result.title} ${result.steps[0] ?? ''}`};
  };
  const makeBrain = async () => {
    setBrain('');
    const record = hermes.record.data, model = record.model;
    if (!record.baseUrl || !model) { setBrain('Test the connection first.'); return; }
    try {
      // EX3-4: kept the way the guide's key is kept (sealed only if it is), not by this page's unticked box after a reload.
      const sealed = await hermesKeyToBrain(scope);
      settings.update(s => ({...s, enabled: true, mode: 'local', provider: 'local', model, localServer: 'openai-compatible', baseUrl: record.baseUrl!, subscriptionApp: null, rememberKey: sealed, connectedOn: localDate()}));
      setBrain(`NOVA and ZIGi now answer with your Hermes (${model}).`);
    } catch (cause) { setBrain(cause instanceof Error ? cause.message : 'The connection could not be saved.'); }
  };
  return <>
    <p>Tell ZIGoals where your Hermes listens and give it the key you put in API_SERVER_KEY. The key is sealed in this browser, sent only to your own Hermes, never synced and never sent to ZIGoals.</p>
    <label className="field">Hermes address<input type="url" value={base} onChange={e => setBase(e.target.value)} autoComplete="off" spellCheck={false} inputMode="url" placeholder="http://127.0.0.1:8642/v1"/></label>
    <label className="field">API_SERVER_KEY<input type="password" value={key} onChange={e => setKey(e.target.value)} autoComplete="off" spellCheck={false} autoCapitalize="off" placeholder={hermes.record.data.baseUrl ? 'Kept on this device; paste again to replace' : 'Paste your key'}/></label>
    <label className="ai-check"><input type="checkbox" checked={remember && !showcase} disabled={showcase} onChange={e => setRemember(e.target.checked)}/> Remember the key on this device <small>{showcase ? '(Showcase keeps keys for this tab only)' : '(sealed; otherwise this page forgets it on reload)'}</small></label>
    {test && !test.ok && <div className="ai-failure" role="alert"><p className="ai-failure-title">{test.title}</p><ul>{test.steps.map(s => <li key={s}>{s}</li>)}</ul></div>}
    <HermesCheck id="connect" hermes={hermes} run={run} label="Test /health and /v1/models"/>
    {hermes.record.data.lastCheck?.reachable && <div className="ai-card-actions">
      <button type="button" className={isBrain ? 'secondary' : 'primary'} disabled={isBrain} onClick={() => void makeBrain()}>{isBrain ? 'Hermes is NOVA’s brain' : 'Use Hermes as NOVA’s brain'}</button>
      <span className="ai-note">Or keep your current brain and ask Hermes from NOVA as a second agent.</span>
    </div>}
    {brain && <p className="ai-note" role="status">{brain}</p>}
  </>;
}
