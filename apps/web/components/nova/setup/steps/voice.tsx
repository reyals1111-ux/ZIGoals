'use client';
import {useState, useSyncExternalStore} from 'react';
import {browserSpeechDisclosure, detectBrowser, speechLanguage} from '../../../../lib/ai/voice';
import {checkVoice, pickVoice, type SpeechVoiceLike} from '../../../../lib/nova/setup-checks';
import {deviceSettingFailureMessage} from '../../../../lib/storage-error-copy';
import {useAiSettings} from '../../../ai/use-ai-settings';
import {CheckRow} from '../check-row';
import type {SetupState} from '../use-setup';

const LINE = 'Hello. I am NOVA, speaking on this device.';
const subscribeNothing = () => () => undefined;
/** Speaks one line with the best voice for the language (a local one in Strict) and resolves when it ended or failed. */
function speakTest(language: string, localOnly: boolean): Promise<{spoke: boolean; voice: SpeechVoiceLike | null; error?: string}> {
  const synth = typeof window === 'undefined' ? undefined : window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve({spoke: false, voice: null, error: 'this browser has no speech output'});
  const voices = synth.getVoices(), voice = pickVoice(voices, language, localOnly);
  if (!voice) return Promise.resolve({spoke: false, voice: null});
  return new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(LINE), real = voices.find(v => v.name === voice.name) ?? null;
    u.lang = language; u.voice = real;
    const timer = setTimeout(() => { synth.cancel(); resolve({spoke: false, voice, error: 'it did not finish within 15 seconds'}); }, 15_000);
    u.onend = () => { clearTimeout(timer); resolve({spoke: true, voice}); };
    u.onerror = event => { clearTimeout(timer); resolve({spoke: false, voice, error: (event as SpeechSynthesisErrorEvent).error ?? 'unknown'}); };
    synth.cancel(); synth.speak(u);
  });
}
/**
 * Planet 7 (optional): speech output on the device (Speech Synthesis; in Strict only a voice the device says is its own),
 * and speech input with the honest note of where this browser sends the audio. Both off by default.
 */
export default function VoiceStep({setup}: {setup: SetupState}) {
  const settings = useAiSettings(), s = settings.data, [error, setError] = useState('');
  const ua = useSyncExternalStore(subscribeNothing, () => navigator.userAgent, () => '');
  const lang = useSyncExternalStore(subscribeNothing, () => speechLanguage(s.voice.language, navigator.language), () => 'en-GB');
  const strict = (setup.record.unreadable ? 'strict' : setup.record.data.privacyMode) === 'strict', browser = detectBrowser(ua);
  const set = (change: Parameters<typeof settings.update>[0]) => { try { settings.update(change); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <>
    <p>Voice is optional and off until you choose it. NOVA reads answers aloud with your device’s own speech; you can talk to it where your browser allows.</p>
    <label className="ai-check"><input type="checkbox" checked={s.voice.readAloud} onChange={e => set(c => ({...c, voice: {...c.voice, readAloud: e.target.checked}}))}/> Read answers aloud <small>{strict ? 'Strict: only voices that run on this device.' : 'With this device’s voices; some browsers offer online voices too.'}</small></label>
    <label className="ai-check"><input type="checkbox" checked={s.voice.transcription === 'browser'} disabled={strict && s.voice.transcription !== 'browser'} onChange={e => set(c => ({...c, voice: {...c.voice, transcription: e.target.checked ? 'browser' : 'off'}}))}/> Talk to NOVA (speech input) <small>{browserSpeechDisclosure(browser, false)}</small></label>
    {strict && <p className="nova-note" role="note">In Strict, speech input stays off here: most browsers send the audio to their maker’s speech service. Type, or use your keyboard’s own dictation.</p>}
    {error && <p role="alert" className="fine">{error}</p>}
    <CheckRow id="voice" setup={setup} run={async () => checkVoice(await speakTest(lang, strict), strict)} label="Play a test line"/>
  </>;
}
