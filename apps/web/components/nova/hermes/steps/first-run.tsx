'use client';
import {useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {readKey} from '../../../../lib/ai/keys';
import {guardRequest} from '../../../../lib/ai/privacy-mode';
import {currentAiScope} from '../../../../lib/ai/scope';
import {askHermes, HERMES_DELEGATE_SYSTEM, hermesDataBlock, hermesRequest} from '../../../../lib/nova/hermes';
import {HERMES_KEY_SLOT, NOVA_HERMES, withCheckTime} from '../../../../lib/nova/hermes-record';
import {NOVA_SETUP} from '../../../../lib/nova/setup';
import {SafeText} from '../../../ai/safe-text';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {useDeviceRecord} from '../../../ai/use-device-record';
import {AboutToSend} from '../../setup/about-to-send';
import {useContextPack} from '../../setup/what-nova-sees';
import {HermesCheck} from '../hermes-check';
import type {HermesState} from '../use-hermes';

const subscribeNothing = () => () => undefined;
const TASK = 'Plan my week from my goals.';
/** The goals part of the person's own context pack (the areas they share; Health never here), as data for Hermes. */
const goalsOf = (markdown: string) => { const at = markdown.indexOf('## Goals'); if (at < 0) return ''; const next = markdown.indexOf('\n## ', at + 8); return markdown.slice(at, next < 0 ? undefined : next).slice(0, 6000).trim(); };
/**
 * Planet 9: the first run. One task delegated to the person's Hermes ("Ask my Hermes to plan my week from my goals"),
 * with the scoped context shown first exactly as it would leave (redacted per the privacy mode), sent only on their
 * press, streamed back as text. NOVA sends Hermes no tools (Hermes runs its own); any change to ZIGoals it suggests stays
 * text until NOVA turns it into a card the person confirms.
 */
export default function FirstRunStep({hermes}: {hermes: HermesState}) {
  const settings = useAiSettings(), setup = useDeviceRecord(NOVA_SETUP), hermesRecord = useDeviceRecord(NOVA_HERMES), {pack} = useContextPack(settings.data);
  const scope = useSyncExternalStore(subscribeNothing, currentAiScope, () => 'local');
  const mode = setup.unreadable ? 'strict' : setup.data.privacyMode ?? null, confirmed = hermesRecord.data.localModelConfirmed === true;
  const [task, setTask] = useState(TASK), [reply, setReply] = useState(''), [busy, setBusy] = useState(false), abort = useRef<AbortController | null>(null);
  const goals = useMemo(() => pack ? goalsOf(pack.markdown) : '', [pack]);
  // Security reviews Z1A-5 and Z1A-11: the goals go as one marked data block, recovery words hidden (lib/nova/hermes.ts).
  const question = goals ? `${task}\n\n${hermesDataBlock('My goals, from ZIGoals', goals)}` : task;
  const run = async () => {
    const base = hermes.record.data.baseUrl, model = hermes.record.data.model ?? 'hermes-agent';
    if (!base) return {ok: false, note: 'Connect Hermes first (planet 7).'};
    let key: string | null = null; try { key = await readKey(scope, HERMES_KEY_SLOT); } catch { key = null; }
    abort.current?.abort(); const controller = new AbortController(); abort.current = controller;
    setBusy(true); setReply('');
    const started = performance.now(); let text = '', reason: string | null = null;
    try {
      for await (const event of askHermes(hermesRequest({base, key, model, system: HERMES_DELEGATE_SYSTEM, question, signal: controller.signal}), r => guardRequest(r))) {
        if (event.type === 'text') { text += event.delta; setReply(text); }
        else if (event.type === 'done') reason = event.reason;
      }
    } catch (cause) { return {ok: false, note: cause instanceof Error ? cause.message : 'Hermes did not answer.'}; }
    finally { setBusy(false); }
    const ms = Math.round(performance.now() - started);
    try { hermes.record.update(r => withCheckTime(r, ms, new Date())); } catch { /* the panel's figure is a convenience */ }
    return text.trim() && (reason === null || reason === 'stop') ? {ok: true, note: `Your Hermes answered in ${(ms / 1000).toFixed(1)} s.`} : {ok: false, note: reason ? `Hermes stopped early (${reason}).` : 'The answer came back empty.'};
  };
  return <>
    <label className="field">The task for your Hermes<input value={task} maxLength={300} onChange={e => setTask(e.target.value)}/></label>
    <p className="fine">Your goals go with it as data{goals ? '' : ' (none shared yet: Goals is off in “What NOVA can see”, or you have none)'}. Exactly this would leave:</p>
    <AboutToSend message={question} mode={mode} provider="local" hermesUnconfirmed={!confirmed}/>
    {reply && <div className="nova-reply" aria-live="polite"><p className="eyebrow">Your Hermes</p><SafeText text={reply}/></div>}
    {busy && <div className="ai-card-actions"><button type="button" className="secondary" onClick={() => abort.current?.abort()}>Stop</button></div>}
    <HermesCheck id="first-run" hermes={hermes} run={run} disabled={busy || !hermes.record.data.baseUrl} label="Ask my Hermes"/>
  </>;
}
