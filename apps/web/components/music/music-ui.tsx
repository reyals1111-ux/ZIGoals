'use client';
import type {ReactNode} from 'react';

/** Minutes and seconds of a position in a track ("3:07"), hours when it has them. */
export function trackTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
/**
 * The record-style circle of the music panel (Session W Part 20, the NOVA look): a decorative disc with grooves, and in its
 * middle the artwork the service sent, square and uncropped with softly rounded corners (Spotify's rule: never crop or
 * reshape artwork), or a glyph when there is none.
 */
export function Disc({artwork, glyph, small = false, spinning = false}: {artwork?: string | null; glyph?: ReactNode; small?: boolean; spinning?: boolean}) {
  return <div className={`music-disc${small ? ' music-disc-small' : ''}`} data-spinning={spinning ? '' : undefined} aria-hidden="true">
    <span className="music-disc-grooves"/>
    {/* Spotify's artwork as sent (no image service in between, which would also need its own content-policy origin). */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {artwork ? <img className="music-disc-art" src={artwork} alt="" width={small ? 28 : 128} height={small ? 28 : 128} referrerPolicy="no-referrer" decoding="async"/> : <span className="music-disc-glyph">{glyph ?? <NoteGlyph/>}</span>}
  </div>;
}
export const NoteGlyph = () => <svg viewBox="0 0 24 24" width="28" height="28" focusable="false" aria-hidden="true"><path d="M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0m11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M9 10l11-2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const PATHS = {play: 'M8 5.5v13l11-6.5z', pause: 'M7 5h4v14H7zM13 5h4v14h-4z', previous: 'M6 5v14M19 5.5v13L8.5 12z', next: 'M18 5v14M5 5.5v13L15.5 12z', stop: 'M6.5 6.5h11v11h-11z'} as const;
export function ControlIcon({name, size = 22}: {name: keyof typeof PATHS; size?: number}) {
  return <svg viewBox="0 0 24 24" width={size} height={size} focusable="false" aria-hidden="true"><path d={PATHS[name]} fill="currentColor" stroke="currentColor" strokeWidth={name === 'previous' || name === 'next' ? 1.6 : 0} strokeLinejoin="round"/></svg>;
}
/** Previous, the large play or pause, next: the panel's one row of controls (each at least 44 px, named for a screen reader). */
export function Controls({playing, playLabel, onPlay, onPrevious, onNext, previousLabel, nextLabel, disabled, stop = false}: {playing: boolean; playLabel: string; onPlay: () => void; onPrevious?: () => void; onNext?: () => void; previousLabel: string; nextLabel: string; disabled?: boolean; stop?: boolean}) {
  return <div className="music-controls">
    <button type="button" className="music-step" aria-label={previousLabel} disabled={disabled || !onPrevious} onClick={onPrevious}><ControlIcon name="previous"/></button>
    <button type="button" className="music-play" aria-label={playLabel} disabled={disabled} onClick={onPlay}><ControlIcon name={playing ? (stop ? 'stop' : 'pause') : 'play'} size={30}/></button>
    <button type="button" className="music-step" aria-label={nextLabel} disabled={disabled || !onNext} onClick={onNext}><ControlIcon name="next"/></button>
  </div>;
}
/** The progress line with the elapsed and total times; the words say it for a screen reader. */
export function Progress({progressMs, durationMs}: {progressMs: number; durationMs: number}) {
  const share = durationMs > 0 ? Math.min(100, Math.max(0, (progressMs / durationMs) * 100)) : 0;
  return <div className="music-progress">
    <span className="music-time" aria-hidden="true">{trackTime(progressMs)}</span>
    <span className="music-bar" aria-hidden="true"><span style={{width: `${share}%`}}/></span>
    <span className="music-time" aria-hidden="true">{trackTime(durationMs)}</span>
    <span className="sr-only">{trackTime(progressMs)} of {trackTime(durationMs)}</span>
  </div>;
}
