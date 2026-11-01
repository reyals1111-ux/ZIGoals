'use client';
import Link from 'next/link';
import {useState} from 'react';
import {MODEL_CLOUD_NOTE, MODEL_LOCAL_STEPS} from '../../../../lib/nova/hermes-guide';
import {confirmLocalModel} from '../../../../lib/nova/hermes-record';
import {localDate} from '../../../../lib/local-date';
import {Choice, GuideSteps} from '../../setup/steps/brain';
import {HermesCheck} from '../hermes-check';
import type {HermesState} from '../use-hermes';

/** Planet 3: Hermes's own model. Local recommended (the local-model planets of NOVA's guide help); a provider is the person's choice, with its privacy consequence. */
export default function ModelStep({hermes}: {hermes: HermesState}) {
  const [choice, setChoice] = useState<'local' | 'provider'>('local'), [output, setOutput] = useState('');
  const run = () => {
    if (choice === 'provider') { hermes.record.update(r => confirmLocalModel(r, false, localDate())); return {ok: true, note: 'Hermes uses a provider of your choice: NOVA redacts what it sends Hermes in Strict and Guarded.'}; }
    // What "hermes config get model" printed: a local endpoint names localhost or 127.0.0.1 (an Ollama "cloud" model does not count).
    const local = /(localhost|127\.0\.0\.1|local_runtime)/i.test(output) && !/cloud/i.test(output);
    return local ? {ok: true, note: 'Hermes’s model points at this computer. Planet 8 asks you to confirm the rest of its settings.'} : {ok: false, note: 'That model setting does not point at this computer (localhost or 127.0.0.1). Choose a local model with “hermes model”, or choose “A provider I choose”.'};
  };
  return <>
    <Choice label="Hermes’s model" value={choice} options={[{id: 'local', label: 'A local model (recommended)'}, {id: 'provider', label: 'A provider I choose'}]} onChange={setChoice}/>
    {choice === 'local' ? <>
      <GuideSteps steps={MODEL_LOCAL_STEPS}/>
      <label className="field">Paste what “hermes config get model” printed<textarea rows={3} value={output} maxLength={4000} onChange={e => setOutput(e.target.value)} spellCheck={false}/></label>
      <p className="fine">No local model yet? <Link className="text-link" href="/app/nova/setup">Build your own NOVA</Link>, planet 3, sets one up with Ollama, LM Studio or llama.cpp.</p>
    </> : <p className="nova-note" role="note">{MODEL_CLOUD_NOTE}</p>}
    <HermesCheck id="model" hermes={hermes} run={run} disabled={choice === 'local' && !output.trim()} label={choice === 'local' ? 'Check the model setting' : 'This is my choice'}/>
  </>;
}
