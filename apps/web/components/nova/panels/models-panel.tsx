'use client';
import Link from 'next/link';
import {useState} from 'react';
import {readKey} from '../../../lib/ai/keys';
import {listModels} from '../../../lib/ai/models';
import {currentAiScope} from '../../../lib/ai/scope';
import type {ModelInfo} from '../../../lib/ai/types';
import {NOVA_SETUP} from '../../../lib/nova/setup';
import {NOVA_WORKFLOWS, setTaskModel, taskModel} from '../../../lib/nova/workflows/schema';
import {ModelPicker} from '../../ai/model-picker';
import {useAiSettings} from '../../ai/use-ai-settings';
import {useDeviceRecord} from '../../ai/use-device-record';
import {providerLabel} from '../workflows/use-nova-model';
import '../../ai/ai.css';
import './panels.css';

/**
 * NOVA's model per task (Session AK, owner follow-up 2 N2), on ZIGi's own model picker and connection: the chat's model is
 * ZIGi's (one engine: changing it here changes it there); briefs and workflows may use another model of the same provider
 * (`zigoals:nova-workflows:v1` taskModels), else the chat's. A local model is free and stays on the device; a cloud model
 * is used for briefs and workflows only in the Guarded or Relaxed privacy mode.
 */
type Task = 'chat' | 'briefs' | 'workflows';
const TASKS: {id: Task; label: string; note: string}[] = [
  {id: 'chat', label: 'Chat', note: 'NOVA and ZIGi\'s conversations (the same model for both).'},
  {id: 'briefs', label: 'Briefs', note: 'Rewording a brief in warmer words, on your tap.'},
  {id: 'workflows', label: 'Workflows', note: 'Putting a workflow\'s results into words.'},
];
export default function ModelsPanel() {
  const settings = useAiSettings(), workflows = useDeviceRecord(NOVA_WORKFLOWS), setup = useDeviceRecord(NOVA_SETUP);
  const [models, setModels] = useState<ModelInfo[] | null>(null), [choosing, setChoosing] = useState<Task | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState<{text: string; failed?: boolean} | null>(null);
  const data = settings.data, provider = data.enabled && data.mode !== 'subscription' ? data.provider : null;
  const mode = setup.unreadable ? 'strict' : setup.data.privacyMode ?? 'strict', cloud = !!provider && provider !== 'local';
  const load = async (task: Task) => {
    if (!provider) return; setChoosing(task); if (models) return;
    setBusy(true); setMessage(null);
    try { const key = await readKey(currentAiScope(), provider).catch(() => null); setModels((await listModels({provider, key, baseUrl: data.baseUrl ?? undefined, localServer: data.localServer ?? undefined})).filter(m => m.kind === 'chat')); }
    catch (error) { setMessage({text: error instanceof Error ? error.message : 'The model list could not be loaded.', failed: true}); setChoosing(null); }
    finally { setBusy(false); }
  };
  const choose = (task: Task, id: string | null) => {
    try {
      if (task === 'chat') { if (id) settings.update(s => ({...s, model: id})); }
      else workflows.update(current => setTaskModel(current, provider!, task, id));
      setMessage({text: id ? `${TASKS.find(t => t.id === task)!.label}: ${id}.` : `${TASKS.find(t => t.id === task)!.label}: the chat's model.`}); setChoosing(null);
    } catch { setMessage({text: 'Not saved on this device.', failed: true}); }
  };
  if (!settings.loaded) return <p className="ai-note" role="status">Reading your connection…</p>;
  if (!provider || !data.model) return <div className="nova-models"><p className="ai-note">No model is connected yet, so NOVA answers and words everything on this device. Build NOVA&rsquo;s brain with the setup guide: a local model is free and private.</p><div className="ai-card-actions"><Link className="primary nova-link" href="/app/nova/setup">Open the setup guide</Link></div></div>;
  return <div className="nova-models">
    <p className="ai-note">Connected: {providerLabel(provider)}{provider === 'local' ? ' · free, on your device' : ' · a cloud model with your own key'}.{cloud && mode === 'strict' ? ' Your privacy mode is Strict, so briefs and workflows stay on this device.' : ''}</p>
    <ul className="ai-memory-list">{TASKS.map(task => {
      const own = task.id === 'chat' ? data.model : taskModel(workflows.data, provider, task.id), shown = own ?? data.model;
      return <li key={task.id} className="ai-memory-note">
        <p className="nova-wf-title">{task.label}: <span className="nova-model-id">{shown}</span>{task.id !== 'chat' && !own ? <span className="ai-note"> (the chat&rsquo;s)</span> : null}</p>
        <p className="ai-note">{task.note}{provider === 'local' ? ' Free, on your device.' : task.id !== 'chat' && mode === 'strict' ? ' Not used in Strict mode.' : ''}</p>
        <div className="ai-card-actions">
          <button type="button" className="secondary" disabled={busy} onClick={() => choosing === task.id ? setChoosing(null) : void load(task.id)} aria-expanded={choosing === task.id}>{busy && choosing === task.id ? 'Loading models…' : choosing === task.id ? 'Close' : 'Change'}</button>
          {task.id !== 'chat' && own && <button type="button" className="text-link" onClick={() => choose(task.id, null)}>Use the chat&rsquo;s model</button>}
        </div>
        {choosing === task.id && models && <ModelPicker label={`${task.label} model`} models={models} value={shown} onChange={id => choose(task.id, id)}/>}
      </li>;
    })}</ul>
    {message && <p role={message.failed ? 'alert' : 'status'} className="ai-note">{message.text}</p>}
  </div>;
}
