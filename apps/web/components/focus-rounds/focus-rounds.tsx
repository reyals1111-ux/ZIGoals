'use client';
import {useEffect} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {BELLS, ring} from '../../lib/meditation/bells';
import {BELL_SOUNDS} from '../../lib/meditation/schema';
import {startRoundsConductor} from '../../lib/focus-rounds/conductor';
import {FOCUS_ROUNDS, bellOf, quietBreaksOf, volumeOf} from '../../lib/focus-rounds/store';
import './focus-rounds.css';

/**
 * Session AK (BUILD list 2 #15, lane G1a): Focus intervals — what #15 adds to the Pomodoro rounds: a soft bell at each
 * change (start, each break, each block, the end), scheduled on the audio clock so it is on time in a background tab,
 * and the focus sound fading during breaks. Starts the page's one listener (lib/focus-rounds/conductor.ts). The
 * choices are kept in `zigoals:focus-rounds:v1`. Loaded with the Pomodoro panel; text only, no animation.
 */
const WORDS: Record<typeof BELL_SOUNDS[number], string> = {bowl: BELLS.bowl.label, chime: BELLS.chime.label, soft: BELLS.soft.label, silent: 'No bell'};
export default function FocusRounds({running}: {running: boolean}) {
  const rec = useDeviceRecord(FOCUS_ROUNDS);
  useEffect(() => { startRoundsConductor(); }, []);
  if (!rec.loaded) return null;
  const bell = bellOf(rec.data), volume = volumeOf(rec.data), quiet = quietBreaksOf(rec.data);
  const set = (patch: Partial<{bell: typeof bell; volume: number; quietBreaks: boolean}>) => { try { rec.update(r => ({...r, ...patch})); } catch { /* the choice shows what the device holds */ } };
  return <details className="focus-rounds">
    <summary>Bell and breaks: {bell === 'silent' ? 'no bell' : WORDS[bell].toLowerCase()}{quiet ? ', sound fades in breaks' : ''}</summary>
    <div className="focus-rounds-body">
      <label className="field"><span>A bell at each change</span>
        <select value={bell} onChange={e => set({bell: e.target.value as typeof bell})}>{BELL_SOUNDS.map(s => <option key={s} value={s}>{WORDS[s]}</option>)}</select>
      </label>
      {bell !== 'silent' && <label className="field"><span>Bell volume ({volume})</span><input type="range" min={0} max={100} step={5} value={volume} onChange={e => set({volume: Number(e.target.value)})}/></label>}
      {bell !== 'silent' && <button type="button" className="secondary" onClick={() => void ring(bell, volume)}>Hear the bell</button>}
      <label className="pomodoro-check"><input type="checkbox" checked={quiet} onChange={e => set({quietBreaks: e.target.checked})}/><span>Fade the focus sound during breaks</span></label>
      <p className="fine">The bell sounds when a run starts, at each break and block, and at the end; it is made on this device. Only focus blocks count toward your totals, never breaks.{running ? ' Changes apply from the next change.' : ''}</p>
    </div>
  </details>;
}
