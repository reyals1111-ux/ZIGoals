'use client';
import {useId, useState, useSyncExternalStore} from 'react';
import {LAYER_LABELS, MIX_ORDER, TONES_NOTE} from '../../lib/audio/ambient-labels';
import {playMix, setAmbientVolume, setLayerLevel, stopAmbient} from '../../lib/audio/ambient';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {MAX_MIX_LAYERS, SOUNDSCAPE_PRESETS, SOUNDSCAPE_PRESET_IDS, TIMER_CHOICES, mixVolume, normalizeMix, savedLayers, setLayerLevelIn, toggleLayer, withMix, type MixLayer, type SoundscapePreset} from '../../lib/audio/mix';
import type {SoundLayer} from '../../lib/music/mix-store';
import type {MusicPrefs} from '../../lib/music/schema';
import {SilentSwitchChoice} from './silent-switch';
import type {MusicMixState} from './use-music-mix';
import './music-mix.css';

const pct = (level: number) => Math.round(level * 100);
const presetLine = (id: SoundscapePreset) => { const p = SOUNDSCAPE_PRESETS[id]; return `${p.layers.map(l => LAYER_LABELS[l.sound]).join(' + ')}${p.timerMin ? ` · ${p.timerMin} min` : ''}`; };
/**
 * The mix (Session AK, owner decision MUSIC): layer up to three sounds made on this device, each with its own level, under
 * the mix's volume; start from Focus, Wind down or Sleep; a sleep timer with a gentle 30 s fade. The mix's choices are
 * kept in their own device record (`zigoals:music-mix:v1`, components/music/use-music-mix.ts); the player's record
 * (`zigoals:music:v1`) is only read here (its volume until the mix has its own) and, on the full page, its "stop when I
 * leave" switch. `compact` (the panel) leaves "stop when I leave" and the silent switch to the panel's More controls.
 * The small level bars move only while the mix plays and motion is welcome (not under reduced motion or Motion Off).
 */
export default function MixPlayer({music, saveMusic, mix, compact = false}: {music: MusicPrefs; saveMusic: (change: (m: MusicPrefs) => MusicPrefs) => boolean; mix: MusicMixState; compact?: boolean}) {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), [note, setNote] = useState(''), [error, setError] = useState('');
  const id = useId(), record = mix.data, layers = savedLayers(record), timerMin = record.timerMin, volume = mixVolume(record, music);
  const mixPlaying = state.playing && !!state.layers;
  async function play(next: readonly MixLayer[] = layers) {
    setError('');
    if (!next.length) { setNote('Choose at least one sound first.'); return; }
    if (!(await playMix({layers: next, volume, ...(timerMin ? {timerMin} : {}), stopOnHide: music.ambient.stopOnHide, playOnSilent: !!record.playOnSilent}))) setError('This browser cannot play sounds made on the device. Nothing else changed.');
  }
  const keep = (next: MixLayer[]) => mix.save(m => withMix(m, next, m.mix?.active ?? false));
  function toggle(sound: SoundLayer) {
    const result = toggleLayer(layers, sound);
    if (result.full) { setNote(`Up to ${MAX_MIX_LAYERS} sounds: take one out first.`); return; }
    setNote(result.layers.length > layers.length ? `${LAYER_LABELS[sound]} added.` : `${LAYER_LABELS[sound]} taken out.`);
    if (!keep(result.layers)) return;
    if (mixPlaying) { if (result.layers.length) void play(result.layers); else stopAmbient(); }
  }
  function level(sound: SoundLayer, value: number) { if (keep(setLayerLevelIn(layers, sound, value)) && mixPlaying) setLayerLevel(sound, value); }
  function preset(pick: SoundscapePreset) {
    const p = SOUNDSCAPE_PRESETS[pick];
    if (!mix.save(m => ({...withMix(m, normalizeMix(p.layers), true), preset: pick, ...(p.timerMin ? {timerMin: p.timerMin} : {})}))) return;
    setNote(`${p.label}: ${presetLine(pick)}. Press Play this mix.`);
  }
  function playNow() { if (mix.save(m => withMix(m, layers, true))) void play(); }
  return <div className="music-mix" data-playing={mixPlaying ? '' : undefined}>
    <fieldset className="music-mix-presets"><legend>Start from</legend>
      {SOUNDSCAPE_PRESET_IDS.map(p => <button key={p} type="button" className="music-mix-preset" aria-pressed={record.preset === p} onClick={() => preset(p)}><strong>{SOUNDSCAPE_PRESETS[p].label}</strong><span>{presetLine(p)}</span></button>)}
    </fieldset>
    <fieldset className="music-mix-sounds"><legend>Sounds in your mix · {layers.length} of {MAX_MIX_LAYERS}</legend>
      {MIX_ORDER.map(s => <button key={s} type="button" className="ambient-chip music-mix-chip" data-sound={s} aria-pressed={layers.some(l => l.sound === s)} aria-describedby={s === 'tones' ? `${id}-tones` : undefined} onClick={() => toggle(s)}>{LAYER_LABELS[s]}</button>)}
    </fieldset>
    <p className="music-mix-hint" id={`${id}-tones`}>{TONES_NOTE}.</p>
    {layers.length > 0 && <div className="music-mix-levels">
      {layers.map(l => <div key={l.sound} className="music-mix-level" data-sound={l.sound}>
        <label className="field">{LAYER_LABELS[l.sound]} level · {pct(l.level)}%
          <input type="range" min={0} max={100} step={5} value={pct(l.level)} aria-valuetext={`${pct(l.level)} percent`} onChange={e => level(l.sound, Number(e.target.value) / 100)}/>
        </label>
        <span className="music-mix-meter" aria-hidden="true"><span style={{width: `${pct(l.level)}%`}}/></span>
      </div>)}
    </div>}
    <div className="music-mix-master">
      <label className="field">Mix volume · {volume}<input type="range" min={0} max={100} step={5} value={volume} aria-valuetext={`${volume} percent`} onChange={e => { const v = Number(e.target.value); if (mix.save(m => ({...m, master: v})) && mixPlaying) setAmbientVolume(v); }}/></label>
      <label className="field">Sleep timer<select value={timerMin ?? 0} onChange={e => { const v = Number(e.target.value); mix.save(m => ({...m, timerMin: v || undefined})); }}>
        <option value={0}>Off</option>{TIMER_CHOICES.map(t => <option key={t} value={t}>{t} min</option>)}
      </select></label>
      <p className="music-mix-hint">The timer fades the mix out gently over its last 30 seconds. A change applies from the next Play.</p>
      {!compact && <>
        <label className="checkbox"><input type="checkbox" checked={music.ambient.stopOnHide} onChange={e => { const on = e.target.checked; saveMusic(m => ({...m, ambient: {...m.ambient, stopOnHide: on}})); }}/><span>Stop when I leave ZIGoals (another tab or app)</span></label>
        <SilentSwitchChoice mix={mix}/>
      </>}
    </div>
    <div className="music-mix-actions">
      {mixPlaying ? <button type="button" className="primary" onClick={stopAmbient}>Stop the mix</button>
        : <button type="button" className="primary" disabled={!layers.length} onClick={playNow}>Play this mix</button>}
      <span className="music-mix-viz" aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <span key={i}/>)}</span>
    </div>
    <p className="music-mix-note" aria-live="polite">{note}</p>
    {mix.unreadable && <p className="music-mix-hint">This device’s mix could not be read, so nothing shows as chosen; a change saves a new one.</p>}
    {(error || mix.error) && <p className="music-problem" role="alert">{error || mix.error}</p>}
  </div>;
}
