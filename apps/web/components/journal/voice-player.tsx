'use client';
import {useEffect, useId, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {JOURNAL_DISPLAY} from '../../lib/on-this-day/store';
import {SKIP_SECONDS, VOICE_SPEEDS, skipTo, speedLabel, speedWords, timeLine, totalOf, voiceSpeedOf, withVoiceSpeed, type VoiceSpeed} from '../../lib/journal/voice-speed';

/**
 * Session AW (x3; LEDGER #442, Evernote's voice notes played faster): ZIGoals' own player for a journal voice note, the
 * same in every browser (Safari's own player has no speed) — Play or Pause, back and forward 15 seconds, the time played
 * of the whole, and 1×, 1.25×, 1.5× or 2×. The speed is remembered on this device (the journal display record) and used
 * by every voice note. Nothing moves on its own: no animation, so Motion Off and reduced motion are unaffected. The
 * recording stays on this device; it is never sent or transcribed. Loaded with the entry's media or the Photos view.
 */
export default function VoicePlayer({src, seconds, label}: {src: string; /** The entry's own length, used while the browser cannot say ("Infinity" for a browser recording). */ seconds?: number; label: string}) {
  const display = useDeviceRecord(JOURNAL_DISPLAY), speed = voiceSpeedOf(display.data), audio = useRef<HTMLAudioElement>(null), id = useId();
  const [playing, setPlaying] = useState(false), [current, setCurrent] = useState(0), [duration, setDuration] = useState(Number.NaN), [said, setSaid] = useState('');
  const total = totalOf(duration, seconds);
  useEffect(() => { const a = audio.current; if (a) { a.defaultPlaybackRate = speed; a.playbackRate = speed; } }, [speed, src]);
  // A recording made in Chrome (MediaRecorder WebM) says its length is "Infinity" and cannot be sought until the browser
  // has read it to its end: a seek far past the end makes it read the whole file once, then the player goes back to 0:00.
  const measuring = useRef(false);
  const read = () => { const a = audio.current; if (!a || measuring.current) return; setCurrent(a.currentTime); setDuration(a.duration); };
  const loaded = () => { const a = audio.current; if (a && a.duration === Number.POSITIVE_INFINITY) { measuring.current = true; a.currentTime = 1e101; } read(); };
  const lengthKnown = () => { const a = audio.current; if (a && measuring.current && Number.isFinite(a.duration)) { measuring.current = false; a.currentTime = 0; } read(); };
  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (a.paused) { a.playbackRate = speed; void a.play().catch(() => setSaid('This voice note could not play in this browser.')); } else a.pause();
  };
  const skip = (by: number) => { const a = audio.current; if (!a) return; a.currentTime = skipTo(a.currentTime, by, total); setCurrent(a.currentTime); };
  const choose = (s: VoiceSpeed) => {
    try { display.update(d => withVoiceSpeed(d, s)); setSaid(`Voice notes play at ${speedWords(s)}, on this device.`); } catch { setSaid('This choice could not be kept on this device.'); }
    const a = audio.current; if (a) a.playbackRate = s;
  };
  return <div className="voice-player" role="group" aria-label={label}>
    <audio ref={audio} src={src} preload="metadata" onLoadedMetadata={loaded} onDurationChange={lengthKnown} onTimeUpdate={read} onSeeked={read} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); read(); }}/>
    <div className="voice-player-row">
      <button type="button" className="secondary voice-player-play" onClick={toggle}>{playing ? 'Pause' : 'Play'}</button>
      <button type="button" className="quiet" aria-label={`Back ${SKIP_SECONDS} seconds`} onClick={() => skip(-SKIP_SECONDS)}><span aria-hidden="true">−{SKIP_SECONDS} s</span></button>
      <button type="button" className="quiet" aria-label={`Forward ${SKIP_SECONDS} seconds`} onClick={() => skip(SKIP_SECONDS)}><span aria-hidden="true">+{SKIP_SECONDS} s</span></button>
      <span className="voice-player-time" id={`${id}-time`}>{timeLine(current, total)}</span>
    </div>
    <div className="voice-player-speeds" role="group" aria-label="Playback speed">
      {VOICE_SPEEDS.map(s => <button key={s} type="button" className="quiet" aria-pressed={speed === s} onClick={() => choose(s)}>{speedLabel(s)}</button>)}
    </div>
    <p className="fine voice-player-said" role="status" aria-live="polite">{said}</p>
  </div>;
}
