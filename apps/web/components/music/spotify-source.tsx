'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {SPOTIFY_HOME, SPOTIFY_LOGO} from '../../lib/music/brand';
import {useShowcase} from '../showcase-controls';
import {useSpotifyClientId} from './music-config';
import {Controls, Disc, Progress} from './music-ui';
import {useSpotify} from './use-spotify';

/** Whether the owner's copy of Spotify's logo loads; Spotify's music is shown only with it (lib/music/brand.ts). */
function useLogo(wanted: boolean): ['loading' | 'ok' | 'missing', (img: HTMLImageElement | null) => void, () => void, () => void] {
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  // A logo already loaded before React listened (from the cache) is read from the element itself.
  const seen = useCallback((img: HTMLImageElement | null) => { if (img?.complete) setState(img.naturalWidth > 0 ? 'ok' : 'missing'); }, []);
  useEffect(() => { if (!wanted) queueMicrotask(() => setState('loading')); }, [wanted]);
  return [state, seen, () => setState('ok'), () => setState('missing')];
}
/** Where Spotify plays, in words ("on Kitchen speaker"). */
const onDevice = (name?: string) => name ? `on ${name}` : '';
/**
 * Spotify in the music panel (Session W Part 20): connect (PKCE, a full-page visit to Spotify), then what plays, with
 * previous / play or pause / next, the progress line, "Open Spotify", and under More controls the device, shuffle,
 * repeat, volume, position and Disconnect. Asked only while the panel is open and the page visible. Honest states:
 * not set up on this site, the Showcase, a locked account, no Premium, no device, Spotify asking to wait.
 */
export function SpotifySource({active}: {active: boolean}) {
  const showcase = useShowcase(), config = useSpotifyClientId(), spotify = useSpotify({clientId: config.clientId, active});
  const connected = spotify.available && spotify.connected === true, [logo, seen, loaded, failed] = useLogo(connected);
  const playback = spotify.playback, [clock, setClock] = useState(() => Date.now()), [base, setBase] = useState({progress: 0, at: 0});
  // Each answer from Spotify resets the line to its own position; between answers it moves with the clock.
  useEffect(() => { queueMicrotask(() => { const now = Date.now(); setBase({progress: playback?.progressMs ?? 0, at: now}); setClock(now); }); }, [playback]);
  // The line moves once a second while a track plays and the page shows; nothing runs otherwise.
  useEffect(() => {
    if (!active || !playback?.playing) return;
    const timer = setInterval(() => { if (document.visibilityState === 'visible') setClock(Date.now()); }, 1000);
    return () => clearInterval(timer);
  }, [active, playback?.playing]);
  const progress = playback ? Math.min(playback.durationMs, base.progress + (playback.playing ? Math.max(0, clock - base.at) : 0)) : 0;
  const pending = useRef<number | null>(null);
  const later = (work: () => void) => { if (pending.current) clearTimeout(pending.current); pending.current = window.setTimeout(() => { pending.current = null; work(); }, 450); };
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);
  const open = <a className="music-open" href={playback?.link ?? SPOTIFY_HOME} target="_blank" rel="noopener noreferrer">Open Spotify ↗</a>;

  if (showcase) return <div className="music-source-body"><Disc/><h2 className="music-title">Spotify</h2><p className="music-sub">The Showcase connects nothing. With your own account, Spotify plays here once the site’s owner has set it up.</p>{open}</div>;
  if (!config.loaded) return <div className="music-source-body"><Disc/><p className="music-sub" role="status">Checking whether Spotify is set up…</p></div>;
  if (!config.clientId) return <div className="music-source-body"><Disc/><h2 className="music-title">Spotify</h2><p className="music-sub">Spotify isn’t set up on this site yet: its owner needs to register a Spotify app first. You can still open Spotify.</p>{open}</div>;
  if (!spotify.scope) return <div className="music-source-body"><Disc/><h2 className="music-title">Spotify</h2><p className="music-sub">Unlock your account to use Spotify here. Nothing about Spotify is kept while it is locked.</p>{open}</div>;
  if (spotify.connected === null) return <div className="music-source-body"><Disc/><p className="music-sub" role="status">Checking your Spotify connection…</p></div>;
  if (!spotify.connected) return <div className="music-source-body">
    <Disc/><h2 className="music-title">Connect Spotify</h2>
    <p className="music-sub">Control what Spotify plays on your phone, computer or speaker. Controlling playback needs Spotify Premium; while ZIGoals is in Spotify’s development mode, only accounts its owner listed can connect.</p>
    <button type="button" className="primary music-connect" onClick={() => void spotify.connect()}>Connect Spotify</button>
    <p className="fine">You go to Spotify to agree, then come back. The sign-in stays sealed on this device: never synced, exported or in an address.</p>
    {spotify.problem && <p className="music-problem" role="alert">{spotify.problem}</p>}
  </div>;
  return <div className="music-source-body">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img ref={seen} className="music-brand" src={SPOTIFY_LOGO} alt="Spotify" height={24} onLoad={loaded} onError={failed} hidden={logo === 'missing'}/>
    {logo === 'missing' ? <><Disc/><p className="music-sub">Spotify is connected, but this site lacks Spotify’s logo, which Spotify asks for whenever its music is shown, so its tracks stay in Spotify for now.</p>{open}</>
      : logo === 'loading' ? <Disc/>
      : <>
        <Disc artwork={playback?.artwork?.url ?? null} spinning={!!playback?.playing}/>
        {playback ? <><h2 className="music-title">{playback.title}</h2><p className="music-sub">{[playback.subtitle, onDevice(playback.device?.name)].filter(Boolean).join(' · ')}</p><Progress progressMs={progress} durationMs={playback.durationMs}/></>
          : <><h2 className="music-title">Nothing playing</h2><p className="music-sub">Start something in Spotify, or choose a device under More controls.</p></>}
        <Controls playing={!!playback?.playing} playLabel={playback?.playing ? 'Pause Spotify' : 'Play on Spotify'} disabled={spotify.busy} previousLabel="Previous track" nextLabel="Next track"
          onPlay={() => void spotify.act(p => playback?.playing ? p.pause() : p.play())} onPrevious={() => void spotify.act(p => p.previous())} onNext={() => void spotify.act(p => p.next())}/>
        {open}
        <details className="music-more" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open && !spotify.devices) void spotify.loadDevices(); }}>
          <summary>More controls</summary>
          <div className="music-more-body">
            <fieldset className="music-devices"><legend>Play on</legend>
              {!spotify.devices ? <p className="fine">Looking for your devices…</p> : !spotify.devices.length ? <p className="fine">No device is available. Open Spotify on a phone, computer or speaker first.</p>
                : spotify.devices.map(d => <button key={d.id} type="button" className="ambient-chip" aria-pressed={d.active} disabled={spotify.busy} onClick={() => void spotify.act(p => p.transfer(d.id, true))}>{d.name}<span className="sr-only"> · {d.type}</span></button>)}
              <button type="button" className="text-link" disabled={spotify.busy} onClick={() => void spotify.loadDevices()}>Look again</button>
            </fieldset>
            {playback && <>
              <button type="button" className="ambient-chip" aria-pressed={playback.shuffle} disabled={spotify.busy} onClick={() => void spotify.act(p => p.shuffle(!playback.shuffle))}>Shuffle</button>
              <label className="field">Repeat<select value={playback.repeat} disabled={spotify.busy} onChange={e => { const mode = e.target.value as 'off' | 'track' | 'context'; void spotify.act(p => p.repeat(mode)); }}><option value="off">Off</option><option value="context">This album or playlist</option><option value="track">This track</option></select></label>
              {playback.device?.volume != null && <label className="field">Volume on {playback.device.name}<input type="range" min={0} max={100} step={5} defaultValue={playback.device.volume} key={`v-${playback.device.id}`} onChange={e => { const v = Number(e.target.value); later(() => void spotify.act(p => p.volume(v))); }}/></label>}
              <label className="field">Position<input type="range" min={0} max={Math.max(1, Math.round(playback.durationMs / 1000))} step={1} defaultValue={Math.round(playback.progressMs / 1000)} key={`s-${playback.title}`} onChange={e => { const s = Number(e.target.value); later(() => void spotify.act(p => p.seek(s * 1000))); }}/></label>
            </>}
            <button type="button" className="secondary" onClick={() => void spotify.disconnect()}>Disconnect Spotify</button>
            <p className="fine">Disconnecting removes the sign-in from this device. To remove ZIGoals from your Spotify account too, use Spotify’s account page → Manage apps.</p>
          </div>
        </details>
      </>}
    {spotify.problem && <p className="music-problem" role="alert">{spotify.problem}</p>}
  </div>;
}
