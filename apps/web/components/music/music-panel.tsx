'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {AMBIENT_LABELS, TIMER_CHOICES, playAmbient, playMix, setAmbientVolume, stepSound, stopAmbient} from '../../lib/audio/ambient';
import {LAYER_LABELS, playingLabel} from '../../lib/audio/ambient-labels';
import {ambientState, serverAmbientState, subscribeAmbient} from '../../lib/audio/ambient-state';
import {mixIsActive, mixVolume, savedLayers, withMix} from '../../lib/audio/mix';
import {APPLE_MUSIC_HOME} from '../../lib/music/brand';
import {MUSIC, MUSIC_SOURCES, type AmbientSound, type MusicPrefs} from '../../lib/music/schema';
import {isShown} from '../../lib/pages/visibility';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {usePagesView} from '../pages/use-pages-view';
import {formatTime} from '../../lib/visual-format';
import {Controls, Disc} from './music-ui';
import {SpotifySource} from './spotify-source';
import {SilentSwitchChoice} from './silent-switch';
import {useMusicMix} from './use-music-mix';
import './music-panel.css';
import './music-mix.css';

const MixPlayer = lazy(() => import('./mix-player'));
const PlaylistLinks = lazy(() => import('./playlist-links'));
/** Session AK: a fold whose body loads the first time it opens (the mix, the playlist links). */
export function LazyFold({summary, children}: {summary: string; children: ReactNode}) {
  const [opened, setOpened] = useState(false);
  return <details className="music-more" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) setOpened(true); }}>
    <summary>{summary}</summary>
    <div className="music-more-body">{opened && <Suspense fallback={<p className="fine">Loading…</p>}>{children}</Suspense>}</div>
  </details>;
}

const SOURCE_LABEL: Record<MusicPrefs['source'], string> = {ambient: 'Focus sounds', spotify: 'Spotify', apple: 'Apple Music'};
const clock = (ms: number) => formatTime(ms);
const WaveGlyph = () => <svg viewBox="0 0 24 24" width="30" height="30" focusable="false" aria-hidden="true"><path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;

/**
 * Focus sounds in the panel: the same player as Meditation's (Part 6), with previous and next stepping through the sounds.
 * Session AK (owner decision MUSIC): the mix of up to three sounds folds in under "Mix up to 3 sounds"; once played, the
 * big button plays the mix until previous or next picks one sound again. `full` (the /app/music page) leaves the mix and
 * the settings to the page's own sections.
 */
export function AmbientSource({prefs, save, full = false}: {prefs: MusicPrefs; save: (change: (m: MusicPrefs) => MusicPrefs) => boolean; full?: boolean}) {
  const state = useSyncExternalStore(subscribeAmbient, ambientState, serverAmbientState), [error, setError] = useState(''), mixRecord = useMusicMix();
  const health = isShown(usePagesView(), 'health'), {sound, timerMin, stopOnHide} = prefs.ambient, playOnSilent = !!mixRecord.data.playOnSilent;
  const mix = savedLayers(mixRecord.data), mixMode = state.playing ? !!state.layers : mixIsActive(mixRecord.data);
  // In mix mode, the volume and the timer are the mix's own (`zigoals:music-mix:v1`); otherwise the player's.
  const volume = mixMode ? mixVolume(mixRecord.data, prefs) : prefs.volume, timer = mixMode ? mixRecord.data.timerMin : timerMin;
  const current: AmbientSound = state.playing && !state.layers ? state.sound as AmbientSound : sound;
  const title = state.playing && state.layers ? playingLabel(state) : mixMode ? mix.map(l => LAYER_LABELS[l.sound]).join(' + ') : AMBIENT_LABELS[current];
  const cannot = () => setError('This browser cannot play sounds made on the device. Nothing else changed.');
  async function play(next: AmbientSound = current) {
    setError('');
    if (!(await playAmbient({sound: next, volume: prefs.volume, ...(timerMin ? {timerMin} : {}), stopOnHide, playOnSilent}))) cannot();
  }
  async function playTheMix() {
    setError('');
    if (!(await playMix({layers: mix, volume, ...(timer ? {timerMin: timer} : {}), stopOnHide, playOnSilent}))) cannot();
  }
  function step(direction: 1 | -1) {
    const next = stepSound(current, direction);
    save(m => ({...m, ambient: {...m.ambient, sound: next}}));
    if (mixRecord.data.mix?.active) mixRecord.save(m => withMix(m, savedLayers(m), false));
    if (state.playing) void play(next);
  }
  const setVolume = (v: number) => { if (mixMode ? mixRecord.save(m => ({...m, master: v})) : save(m => ({...m, volume: v}))) setAmbientVolume(v); };
  const setTimer = (v: number) => mixMode ? mixRecord.save(m => ({...m, timerMin: v || undefined})) : save(m => ({...m, ambient: {sound: m.ambient.sound, stopOnHide: m.ambient.stopOnHide, ...(v ? {timerMin: v} : {})}}));
  const playLabel = mixMode ? (state.playing ? 'Stop your mix' : 'Play your mix') : state.playing ? `Stop ${AMBIENT_LABELS[current]}` : `Play ${AMBIENT_LABELS[current]}`;
  return <div className="music-source-body">
    <Disc glyph={<WaveGlyph/>} spinning={state.playing}/>
    <h2 className="music-title">{title}</h2>
    <p className="music-sub" role="status">{state.playing ? `Playing${state.endsAt ? ` · stops at ${clock(state.endsAt)}` : ' · until you stop it'}` : 'Made on this device · nothing is downloaded'}</p>
    <Controls playing={state.playing} stop playLabel={playLabel} onPlay={() => state.playing ? stopAmbient() : void (mixMode ? playTheMix() : play())}
      previousLabel={`Previous sound: ${AMBIENT_LABELS[stepSound(current, -1)]}`} nextLabel={`Next sound: ${AMBIENT_LABELS[stepSound(current, 1)]}`} onPrevious={() => step(-1)} onNext={() => step(1)}/>
    {health && <><a className="music-open" href="/app/health?view=meditation">Breathe in Meditation</a>{/* eslint-disable-line @next/next/no-html-link-for-pages -- a full load: Health's camera and Bluetooth policy applies to its own document */}</>}
    {!full && <LazyFold summary="Mix up to 3 sounds"><MixPlayer music={prefs} saveMusic={save} mix={mixRecord} compact/></LazyFold>}
    {!full && <details className="music-more"><summary>More controls</summary>
      <div className="music-more-body">
        <label className="field">{mixMode ? 'Mix volume' : 'Volume'} · {volume}<input type="range" min={0} max={100} step={5} value={volume} onChange={e => setVolume(Number(e.target.value))}/></label>
        <label className="field">Stop after<select value={timer ?? 0} onChange={e => setTimer(Number(e.target.value))}>
          <option value={0}>No timer</option>{TIMER_CHOICES.map(t => <option key={t} value={t}>{t} min</option>)}
        </select></label>
        <label className="checkbox"><input type="checkbox" checked={stopOnHide} onChange={e => save(m => ({...m, ambient: {...m.ambient, stopOnHide: e.target.checked}}))}/><span>Stop when I leave ZIGoals (another tab or app)</span></label>
        <SilentSwitchChoice mix={mixRecord}/>
        <p className="fine">A change of timer or of “stop when I leave” applies from the next Play. The timer fades the sound out over its last 30 seconds.</p>
      </div>
    </details>}
    {error && <p className="music-problem" role="alert">{error}</p>}
  </div>;
}
/** Apple Music: a link only (lib/music/brand.ts says why), never a pretend player. */
export function AppleSource() {
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
  const prefs = useDeviceRecord(MUSIC), [error, setError] = useState(''), panel = useRef<HTMLElement>(null), onMusicPage = usePathname() === '/app/music';
  const save = (change: (m: MusicPrefs) => MusicPrefs) => { try { prefs.update(change); setError(''); return true; } catch (err) { setError(`Not saved on this device. ${deviceSettingFailureMessage(err)}`); return false; } };
  // Session X (music.spec:75, 1 run in 5): the panel draws only once this device's settings are read, so focus moves
  // in then; an effect keyed on `open` alone could run while nothing was drawn and never run again.
  const ready = open && prefs.loaded;
  useEffect(() => {
    if (!ready) return;
    const first = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('.music-sources [aria-pressed="true"]')?.focus({preventScroll: true}));
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented) { event.preventDefault(); onClose(); } };
    window.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(first); window.removeEventListener('keydown', onKey); };
  }, [ready, onClose]);
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
    <LazyFold summary="Playlists in Spotify, Apple Music or YouTube Music"><PlaylistLinks/></LazyFold>
    {!onMusicPage && <Link className="music-full-link" href="/app/music" onClick={onClose}>Open the full music page</Link>}
    {prefs.unreadable && <p className="fine">This device’s music choices could not be read, so the defaults show; a change saves new ones.</p>}
    {error && <p className="music-problem" role="alert">{error}</p>}
    <p className="music-footer">{source === 'ambient' ? 'Calm sounds, made right here.' : source === 'spotify' ? 'Spotify plays; ZIGoals only passes on your taps.' : 'Your music, in its own app.'}</p>
  </section>;
}
