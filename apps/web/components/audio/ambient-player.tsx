'use client';
import {useState, useSyncExternalStore} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {AMBIENT_SOUNDS, MUSIC, type AmbientSound} from '../../lib/music/schema';
import {AMBIENT_LABELS, TIMER_CHOICES, playAmbient, setAmbientVolume, stopAmbient} from '../../lib/audio/ambient';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './ambient.css';

const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
/**
 * Ambient focus sounds (Session W Part 6): choose a sound, a volume and an optional timer, then play. The choices are
 * this device's (`zigoals:music:v1`); the sound is made here, nothing is downloaded or recorded. It keeps playing while
 * you move around ZIGoals (a Stop button follows you), unless you chose to stop it when you leave ZIGoals.
 */
export function AmbientPlayer() {
  const prefs = useDeviceRecord(MUSIC), state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState);
  const [error, setError] = useState('');
  const {sound, timerMin, stopOnHide} = prefs.data.ambient, volume = prefs.data.volume;
  const save = (change: Parameters<typeof prefs.update>[0]) => { try { prefs.update(change); return true; } catch (err) { setError(`Not saved on this device. ${deviceSettingFailureMessage(err)}`); return false; } };
  async function play(next: AmbientSound = sound) {
    setError('');
    if (!(await playAmbient({sound: next, volume, ...(timerMin ? {timerMin} : {}), stopOnHide}))) setError('This browser cannot play sounds made on the device. Nothing else changed.');
  }
  function choose(next: AmbientSound) { save(m => ({...m, ambient: {...m.ambient, sound: next}})); if (state.playing) void play(next); }
  if (!prefs.loaded) return null;
  return <section className="ambient-player" aria-labelledby="ambient-title">
    <h3 id="ambient-title">Focus sounds</h3>
    <fieldset className="ambient-sounds"><legend>Sound</legend>
      {AMBIENT_SOUNDS.map(s => <button key={s} type="button" className="ambient-chip" aria-pressed={sound === s} onClick={() => choose(s)}>{AMBIENT_LABELS[s]}</button>)}
    </fieldset>
    <label className="field ambient-volume">Volume · {volume}<input type="range" min={0} max={100} step={5} value={volume} onChange={e => { const v = Number(e.target.value); if (save(m => ({...m, volume: v}))) setAmbientVolume(v); }}/></label>
    <div className="ambient-row">
      <label className="field">Stop after<select value={timerMin ?? 0} onChange={e => { const v = Number(e.target.value); save(m => ({...m, ambient: {sound: m.ambient.sound, stopOnHide: m.ambient.stopOnHide, ...(v ? {timerMin: v} : {})}})); }}>
        <option value={0}>No timer</option>{TIMER_CHOICES.map(t => <option key={t} value={t}>{t} min</option>)}
      </select></label>
      <label className="checkbox ambient-check"><input type="checkbox" checked={stopOnHide} onChange={e => save(m => ({...m, ambient: {...m.ambient, stopOnHide: e.target.checked}}))}/><span>Stop when I leave ZIGoals (another tab or app)</span></label>
    </div>
    <div className="actions">{state.playing ? <button type="button" className="primary" onClick={stopAmbient}>Stop</button> : <button type="button" className="primary" onClick={() => void play()}>Play</button>}</div>
    <p className="ambient-status" role="status">{state.playing ? `Playing ${AMBIENT_LABELS[state.sound]}${state.endsAt ? ` · stops at ${clock(state.endsAt)}` : ''}` : 'Off'}</p>
    {error && <p role="alert">{error}</p>}
    <p className="fine">Made on this device: nothing is downloaded or recorded. A change of timer or of “stop when I leave” applies from the next Play. A reload stops the sound.</p>
  </section>;
}
