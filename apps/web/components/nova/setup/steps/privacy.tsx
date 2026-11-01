'use client';
import {useId, useState} from 'react';
import {isCloudTarget, targetName} from '../../../../lib/ai/privacy-mode';
import {PRIVACY_MODES, PRIVACY_WORDS, privacyMode, type PrivacyMode} from '../../../../lib/nova/privacy-mode';
import {setPrivacyMode} from '../../../../lib/nova/setup';
import {checkPrivacy} from '../../../../lib/nova/setup-checks';
import {localDate} from '../../../../lib/local-date';
import {deviceSettingFailureMessage} from '../../../../lib/storage-error-copy';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {AboutToSend} from '../about-to-send';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

const SAMPLE = 'Plan a birthday dinner for my sister Anna at 12 Abbey Road; my budget is €184.50.';
/**
 * Planet 2: Strict (the recommended default for a new NOVA), Guarded or Relaxed, enforced by the engine for NOVA and ZIGi
 * alike (lib/ai/privacy-mode.ts). A live preview shows what a cloud model would get from a message the person types.
 */
export default function PrivacyStep({setup}: {setup: SetupState}) {
  const settings = useAiSettings(), stored = setup.record.data.privacyMode ?? null, group = useId();
  const [choice, setChoice] = useState<PrivacyMode>(stored ?? 'strict'), [sample, setSample] = useState(SAMPLE), [error, setError] = useState('');
  const s = settings.data, connected = s.enabled && s.mode !== 'subscription' ? s.provider : null;
  const cloud = !!connected && isCloudTarget(connected, false, s.model), name = targetName(connected, false, s.model);
  // The preview always shows a cloud's view: a person on a local model sees what Guarded would do if they ever switch.
  const previewProvider = cloud ? connected : 'openai';
  const save = () => { try { setup.record.update(r => setPrivacyMode(r, choice, localDate())); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <>
    <fieldset className="nova-modes"><legend>How private should NOVA be?</legend>
      {PRIVACY_MODES.map(mode => <label key={mode} className="nova-mode" data-mode={mode}>
        <input type="radio" name={group} value={mode} checked={choice === mode} onChange={() => setChoice(mode)}/>
        <span><b>{PRIVACY_WORDS[mode].label}</b> <span className="nova-tag">{PRIVACY_WORDS[mode].tag}</span><br/>{PRIVACY_WORDS[mode].what} <span className="fine">{PRIVACY_WORDS[mode].sends}</span></span>
      </label>)}
    </fieldset>
    {choice === 'strict' && cloud && <p className="nova-warn" role="note">You are connected to {name}, a cloud model. With Strict, NOVA and ZIGi stop sending to it: connect a local model in the next step, or choose Guarded.</p>}
    {stored === null && <p className="fine">No mode is chosen yet, so ZIGi works as it always has. Choosing one applies to NOVA and ZIGi together.</p>}
    <div className="ai-card-actions"><button type="button" className="primary" onClick={save} disabled={choice === stored}>{choice === stored ? `${PRIVACY_WORDS[choice].label} is on` : `Use ${PRIVACY_WORDS[choice].label}`}</button></div>
    {error && <p role="alert" className="fine">{error}</p>}
    <details className="nova-try" open={choice === 'guarded'}>
      <summary>See what a cloud model would get</summary>
      <label className="field">Try a message<textarea rows={2} value={sample} maxLength={600} onChange={e => setSample(e.target.value)}/></label>
      <AboutToSend message={sample} mode={choice} provider={previewProvider}/>
    </details>
    <CheckRow id="privacy" setup={setup} run={() => checkPrivacy(stored, privacyMode())} disabled={stored === null} label="Check the mode holds"/>
  </>;
}
