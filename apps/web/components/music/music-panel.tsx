'use client';
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {AMBIENT_LABELS, TIMER_CHOICES, playAmbient, setAmbientVolume, stepSound, stopAmbient} from '../../lib/audio/ambient';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {APPLE_MUSIC_HOME} from '../../lib/music/brand';
import {MUSIC, MUSIC_SOURCES, type AmbientSound, type MusicPrefs} from '../../lib/music/schema';
import {isShown} from '../../lib/pages/visibility';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {usePagesView} from '../pages/use-pages-view';
import {Controls, Disc} from './music-ui';
import {SpotifySource} from './spotify-source';
import './music-panel.css';

const SOURCE_LABEL: Record<MusicPrefs['source'], string> = {ambient: 'Focus sounds', spotify: 'Spotify', apple: 'Apple Music'};
const clock = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
const WaveGlyph = () => <svg viewBox="0 0 24 24" width="30" height="30" focusable="false" aria-hidden="true"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;

/** Focus sounds in the panel: the same player as Meditation's (Part 6), with previous and next stepping through the sounds. */
function AmbientSource({prefs, save}: {prefs: MusicPrefs; save: (change: (m: MusicPrefs) => MusicPrefs) => boolean}) {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), [error, setError] = useState('');
  const health = isShown(usePagesView(), 'health'), {sound, timerMin, stopOnHide} = prefs.ambient, current = state.playing ? state.sound : sound;
  async function play(next: AmbientSound = current) {
    setError('');
    if (!(await playAmbient({sound: next, volume: prefs.volume, ...(timerMin ? {timerMin} : {}), stopOnHide}))) setError('This browser cannot play sounds made on the device. Nothing else changed.');
  }
  function step(direction: 1 | -1) { const next = stepSound(current, direction); save(m => ({...m, ambient: {...m.ambient, sound: next}})); if (state.playing) void play(next); }
  return <div className="music-source-body">
    <Disc glyph={<WaveGlyph/>} spinning={state.playing}/>
    <h2 className="music-title">{AMBIENT_LABELS[current]}</h2>
    <p className="music-sub" role="status">{state.playing ? `Playing${state.endsAt ? ` · stops at ${clock(state.endsAt)}` : ' · until you stop it'}` : 'Made on this device · nothing is downloaded'}</p>
    <Controls playing={state.playing} stop playLabel={state.playing ? `Stop ${AMBIENT_LABELS[current]}` : `Play ${AMBIENT_LABELS[current]}`} onPlay={() => state.playing ? stopAmbient() : void play()}
      previousLabel={`Previous sound: ${AMBIENT_LABELS[stepSound(current, -1)]}`} nextLabel={`Next sound: ${AMBIENT_LABELS[stepSound(current, 1)]}`} onPrevious={() => step(-1)} onNext={() => step(1)}/>
    {health && <a className="music-open" href="/app/health?view=meditation">Breathe in Meditation</a>}
    <details className="music-more"><summary>More controls</summary>
      <div className="music-more-body">
        <label className="field">Volume · {prefs.volume}<input type="range" min={0} max={100} step={5} value={prefs.volume} onChange={e => { const v = Number(e.target.value); if (save(m => ({...m, volume: v}))) setAmbientVolume(v); }}/></label>
        <label className="field">Stop after<select value={timerMin ?? 0} onChange={e => { const v = Number(e.target.value); save(m => ({...m, ambient: {sound: m.ambient.sound, stopOnHide: m.ambient.stopOnHide, ...(v ? {timerMin: v} : {})}})); }}>
          <option value={0}>No timer</option>{TIMER_CHOICES.map(t => <option key={t} value={t}>{t} min</option>)}
        </select></label>
        <label className="checkbox"><input type="checkbox" checked={stopOnHide} onChange={e => save(m => ({...m, ambient: {...m.ambient, stopOnHide: e.target.checked}}))}/><span>Stop when I leave ZIGoals (another tab or app)</span></label>
        <p className="fine">A change of timer or of “stop when I leave” applies from the next Play.</p>
      </div>
    </details>
    {error && <p className="music-problem" role="alert">{error}</p>}
  </div>;
}
/** Apple Music: a link only (lib/music/brand.ts says why), never a pretend player. */
function AppleSource() {
  return <div className="music-source-body">
    <Disc/>
    <h2 className="music-title">Apple Music</h2>
    <p className="music-sub">Playing Apple Music inside ZIGoals needs an Apple Developer membership and a signed key, which this site doesn’t have. Apple Music opens in its own app or tab.</p>
    <a className="music-open" href={APPLE_MUSIC_HOME} target="_blank" rel="noopener noreferrer">Open Apple Music ↗</a>
  </div>;
}
/**
 * "Your soundtrack" (Session W Part 20, the owner's NOVA look): one panel above the music button, a sheet on phones. An
 * eyebrow, the source (Focus sounds, Spotify or Apple Music; one at a time), the record-style circle, a large title,
 * the progress line where a track has one, previous / play / next, an "Open …" outline button and a calm footer line;
 * the rest under More controls. Escape or × closes it; "Mini-bar" folds the player into a small bar instead of the button.
 */
export default function MusicPanel({open, onClose, phone}: {open: boolean; onClose: () => void; phone: boolean}) {
  const prefs = useDeviceRecord(MUSIC), [error, setError] = useState(''), panel = useRef<HTMLElement>(null);
  const save = (change: (m: MusicPrefs) => MusicPrefs) => { try { prefs.update(change); setError(''); return true; } catch (err) { setError(`Not saved on this device. ${deviceSettingFailureMessage(err)}`); return false; } };
  useEffect(() => {
    if (!open) return;
    const first = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('.music-sources [aria-pressed="true"]')?.focus({preventScroll: true}));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(first); window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  if (!open || !prefs.loaded) return null;
  const source = prefs.data.source;
  return <section ref={panel} className={`music-panel${phone ? ' music-panel-phone' : ''}`} role="dialog" aria-modal="false" aria-labelledby="music-panel-label">
    <div className="music-panel-head">
      <p className="music-eyebrow" id="music-panel-label">Your soundtrack</p>
      <div className="music-panel-tools">
        <button type="button" className="music-tool" aria-pressed={prefs.data.mini} onClick={() => save(m => ({...m, mini: !m.mini}))}>Mini-bar</button>
        <button type="button" className="music-tool music-close" aria-label="Close the music player" onClick={onClose}>×</button>
      </div>
    </div>
    <div className="music-sources" role="group" aria-label="Play from">
      {MUSIC_SOURCES.map(id => <button key={id} type="button" aria-pressed={source === id} onClick={() => save(m => ({...m, source: id}))}>{SOURCE_LABEL[id]}</button>)}
    </div>
    {source === 'ambient' ? <AmbientSource prefs={prefs.data} save={save}/> : source === 'spotify' ? <SpotifySource active={open}/> : <AppleSource/>}
    {prefs.unreadable && <p className="fine">This device’s music choices could not be read, so the defaults show; a change saves new ones.</p>}
    {error && <p className="music-problem" role="alert">{error}</p>}
    <p className="music-footer">{source === 'ambient' ? 'Calm sounds, made right here.' : source === 'spotify' ? 'Spotify plays; ZIGoals only passes on your taps.' : 'Your music, in its own app.'}</p>
  </section>;
}
