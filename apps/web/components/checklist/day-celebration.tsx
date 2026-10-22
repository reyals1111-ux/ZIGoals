'use client';
import {useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent} from 'react';
import {useEscapeLayer} from './escape-layers';
import {holdToast} from '../ui/undo-toast';
import {FlameMark} from './checklist-marks';
import {celebrationEnvironment, takeCelebrationVideo} from './celebration-clip';
import {CELEBRATION_CLIP, READY_MS, decideCelebration} from '../../lib/checklist/celebration-clip';
import './day-celebration.css';

/**
 * Session AG Polish 2 (ADR-031 K13; owner Part 7, reference 14): the day's celebration is the owner's own video — ZIGi with
 * the day's planets orbiting (lib/checklist/celebration-clip.ts, one constant). It plays once, muted and inline, and rests
 * on its last frame; at about 7.3 s our own words fade in over its lower part on a soft dark gradient: "All N planets lit!"
 * (the real count, "lit!" in the nebula gradient), the honest line (or the Perfect-orbit line), the glass streak chip with
 * the warm flame and the real streak, and a nebula Continue — never the video's own baked-in words.
 *
 * - On a phone the clip fills the screen (cover, the subject centred); on a computer or a tablet it stands at full height
 *   in the middle, the sides filled by a blurred, darkened copy of the same frames (a small canvas mirror), so no hard edge.
 * - Not ready to play within 1.5 s, autoplay refused, a source failing, reduced motion, Motion Off or Save-Data: the
 *   last frame and the words at once, and the clip never starts late.
 * - A tap anywhere (or Space or Enter) before the words skips to the last frame with the words; Escape and Continue close
 *   it; focus is held inside and returns to the path; the title, line and streak are its name and description; the media
 *   is aria-hidden.
 * - No Undo while it is open: the last tick's toast is held (hidden, its time standing still) and comes back for the time
 *   it had left after Continue.
 * The same in every theme: media, with our words on its own dark gradient. Its own chunk, loaded when it plays.
 */
type Phase = 'loading' | 'playing' | 'rest';

export default function DayCelebration({streak, grew = false, perfect, total, onClose}: {streak: number; grew?: boolean; perfect: boolean; total: number; onClose: () => void}) {
  const ref = useRef<HTMLDialogElement>(null), button = useRef<HTMLButtonElement>(null), host = useRef<HTMLDivElement>(null), mirror = useRef<HTMLCanvasElement>(null);
  const [decision] = useState(() => decideCelebration(celebrationEnvironment()));
  const [phase, setPhase] = useState<Phase>(decision.play ? 'loading' : 'rest'), [words, setWords] = useState(!decision.play);
  const skip = useRef<() => void>(() => undefined);
  useEscapeLayer(true, onClose);
  // Into the top layer; the toast held while it is open.
  useLayoutEffect(() => {
    const d = ref.current; if (!d) return;
    const back = document.activeElement as HTMLElement | null;
    try { d.showModal(); } catch { /* shown in place */ }
    button.current?.focus({preventScroll: true});
    const release = holdToast();
    return () => { release(); try { if (d.open) d.close(); } catch { /* gone */ } if (back?.isConnected) back.focus({preventScroll: true}); };
  }, []);
  // The clip: play once if it is ready within READY_MS, else the still; the words at uiAt; rest on the last frame.
  useEffect(() => {
    const box = host.current; if (!decision.play || !box) return;
    const video = takeCelebrationVideo(); box.appendChild(video);
    let started = false, over = false, frame = 0;
    const timers: number[] = [];
    const draw = () => {
      const c = mirror.current, x = c?.getContext('2d');
      if (x && c && video.readyState >= 2) { try { x.drawImage(video, 0, 0, c.width, c.height); } catch { /* not drawable yet */ } }
      if (!over && !video.paused && !video.ended) frame = requestAnimationFrame(draw);
    };
    const finish = () => { if (over) return; over = true; cancelAnimationFrame(frame); setPhase('rest'); setWords(true); };
    const stopLoading = () => { video.pause(); for (const s of [...video.querySelectorAll('source')]) s.remove(); video.removeAttribute('src'); try { video.load(); } catch { /* gone */ } };
    const start = () => {
      if (started || over) return; started = true;
      video.play()?.then(() => { if (over) return; setPhase('playing'); frame = requestAnimationFrame(draw); }).catch(() => { finish(); stopLoading(); });
    };
    const onTime = () => { if (video.currentTime >= CELEBRATION_CLIP.uiAt) setWords(true); };
    const onEnded = () => finish();
    const onError = () => { if (!started) { finish(); stopLoading(); } };
    video.addEventListener('timeupdate', onTime); video.addEventListener('ended', onEnded); video.addEventListener('error', onError, true);
    if (video.readyState >= 3) start(); else video.addEventListener('canplay', start, {once: true});
    // (Not ready in time: the still and the words now, and the clip is let go — never a late start.)
    timers.push(window.setTimeout(() => { if (!started) { finish(); stopLoading(); } }, READY_MS));
    skip.current = () => { if (over) return; video.pause(); finish(); };
    return () => { over = true; cancelAnimationFrame(frame); timers.forEach(t => window.clearTimeout(t)); video.removeEventListener('timeupdate', onTime); video.removeEventListener('ended', onEnded); video.removeEventListener('error', onError, true); video.removeEventListener('canplay', start); video.pause(); video.remove(); };
    // one clip per opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // At rest (or as a still), the sides' mirror shows the last frame.
  useEffect(() => {
    if (phase !== 'rest') return;
    const c = mirror.current, x = c?.getContext('2d'); if (!c || !x) return;
    const img = new Image(); img.decoding = 'async'; img.src = CELEBRATION_CLIP.still;
    img.onload = () => { try { x.drawImage(img, 0, 0, c.width, c.height); } catch { /* not drawable */ } };
  }, [phase]);
  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => { if (!words && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); skip.current(); } };
  const word = total === 1 ? 'planet' : 'planets';
  return <dialog ref={ref} className="checklist-celebration" data-phase={phase} data-words={words ? '' : undefined} data-media={decision.play ? 'video' : 'still'}
    aria-labelledby="checklist-celebration-title" aria-describedby="checklist-celebration-line checklist-celebration-streak" onCancel={e => e.preventDefault()} onKeyDown={onKeyDown} onClick={() => { if (!words) skip.current(); }}>
    <canvas ref={mirror} className="checklist-celebration-mirror" width={36} height={64} aria-hidden="true"/>
    <div className="checklist-celebration-frame">
      <div className="checklist-celebration-media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- the owner's clip's own last frame: the still it rests on */}
        <img className="checklist-celebration-still" src={CELEBRATION_CLIP.still} alt="" width={CELEBRATION_CLIP.width} height={CELEBRATION_CLIP.height} decoding="async"/>
        <div ref={host} className="checklist-celebration-clip"/>
      </div>
      <section className="checklist-celebration-words">
        <h2 id="checklist-celebration-title" className="checklist-celebration-title">All {total} {word} <span className="checklist-celebration-lit">lit!</span></h2>
        <p id="checklist-celebration-line" className="checklist-celebration-line">{perfect ? 'Every planet today, in path order — a Perfect orbit!' : 'Every planet today, in your own order.'}</p>
        <p id="checklist-celebration-streak" className="checklist-celebration-streak" data-grew={grew && decision.play ? '' : undefined}><span className="checklist-celebration-flame"><FlameMark lit/></span><span className="checklist-celebration-streak-rule" aria-hidden="true"/><strong>{streak} day streak</strong></p>
        <button ref={button} type="button" className="checklist-celebration-go" onClick={e => { e.stopPropagation(); if (!words) { skip.current(); return; } onClose(); }}>Continue</button>
      </section>
    </div>
  </dialog>;
}
