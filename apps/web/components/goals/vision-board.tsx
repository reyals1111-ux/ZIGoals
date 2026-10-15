'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {formatGoalAmount, type GoalSummary} from '../../lib/goal-summary';
import type {GoalExtras} from '../../lib/goal-extras/store';
import {GRADIENTS} from '../../lib/goal-extras/store';
import {isShowcase} from '../../lib/showcase-storage';
import {SHOWCASE_VISION_ART} from '../../lib/showcase/vision-art';
import {ProgressRing} from '../platform/financial-ui';
import {VisionArt} from './vision-art';
import {ZigiFigure} from '../zigi/zigi-figure';
import './vision-board.css';

/** A goal without a chosen vision still gets a calm picture: one of the gradients, picked from its key. */
const fallback = (key: string) => GRADIENTS[[...key].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % GRADIENTS.length]!;
const progressWords = (g: GoalSummary) => g.status === 'completed' ? 'Finished' : g.progressBound === 'unavailable' ? 'Progress unknown' : `${Math.floor(Number(g.progressPct))}% of the way`;

/**
 * Session AB-Design (owner request 16): the vision board as a real mood board — big pictures in a collage, the goal's
 * name over the picture, its progress ring and its why, a full-screen view on tap, and an empty state that says what the
 * board is for. The Showcase's goals show the eight illustrations (lib/showcase/vision-art.ts); a real person's goals
 * show the gradient, emoji or photo they chose (never one of the Showcase's files). Hover lifts gently; no parallax.
 */
export function VisionBoard({goals, extras}: {goals: readonly GoalSummary[]; extras: GoalExtras}) {
  const [open, setOpen] = useState<string | null>(null), [showcase, setShowcase] = useState(false);
  useEffect(() => { queueMicrotask(() => setShowcase(isShowcase())); }, []);
  if (!goals.length) return <section className="vision-empty aa-empty" aria-label="Vision board">
    <span className="vision-empty-figure" aria-hidden="true"><ZigiFigure state="peek"/></span>
    <h3>See the life you’re building.</h3>
    <p>Every goal becomes a picture here: your own photo, a gradient or an emoji, with its progress and your why. Create a goal, then choose its picture on its page.</p>
    <Link className="primary" href="/app/goals/new">+ Create a goal</Link>
  </section>;
  const art = (g: GoalSummary) => showcase ? SHOWCASE_VISION_ART[g.key] : undefined;
  const current = open ? goals.find(g => g.key === open) : undefined;
  return <>
    <ul className="vision-board" aria-label="Vision board">
      {goals.map((g, i) => {
        const vision = extras.goals[g.key]?.vision ?? {kind: 'gradient' as const, gradient: fallback(g.key)}, why = extras.goals[g.key]?.why, picture = art(g);
        return <li key={g.key} className="vision-tile" data-size={i % 5 === 0 ? 'wide' : i % 3 === 1 ? 'tall' : undefined}>
          <button type="button" className="vision-tile-open" aria-label={`${g.name}: ${progressWords(g)}. Open full screen`} onClick={() => setOpen(g.key)}>
            {picture ? <span className="vision-art vision-tile-art vision-tile-photo" role="img" aria-label={picture.alt}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={picture.src} alt="" loading="lazy" decoding="async"/></span> : <VisionArt vision={vision} name={g.name} className="vision-tile-art" />}
            <span className="vision-tile-shade" aria-hidden="true"/>
            <span className="vision-tile-body">
              <span className="vision-tile-ring"><ProgressRing percent={g.progressBound === 'unavailable' ? null : g.progressPct} size={52} label={`${g.name} progress`} complete={g.status === 'completed'} identity={`board-${g.key}`} bound={g.progressBound} /></span>
              <span className="vision-tile-text"><strong>{g.name}</strong><small>{progressWords(g)}</small>{why && <em>“{why}”</em>}</span>
            </span>
          </button>
          <Link className="vision-tile-link-out text-link" href={g.href}>Open Goal →</Link>
        </li>;
      })}
    </ul>
    {current && <VisionFullScreen goal={current} extras={extras} picture={art(current)} fallbackGradient={fallback(current.key)} onClose={() => setOpen(null)} />}
  </>;
}

function VisionFullScreen({goal: g, extras, picture, fallbackGradient, onClose}: {goal: GoalSummary; extras: GoalExtras; picture?: {src: string; alt: string}; fallbackGradient: (typeof GRADIENTS)[number]; onClose: () => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const extra = extras.goals[g.key], vision = extra?.vision ?? {kind: 'gradient' as const, gradient: fallbackGradient};
  return createPortal(<dialog ref={dialog} className="vision-full" aria-labelledby="vision-full-title" onClose={onClose} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
    <div className="vision-full-art">{picture ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={picture.src} alt={picture.alt}/> : <VisionArt vision={vision} name={g.name} className="vision-full-vision" />}</div>
    <div className="vision-full-copy">
      <p className="eyebrow">{g.type}</p>
      <h2 id="vision-full-title">{g.name}</h2>
      <p className="vision-full-progress"><ProgressRing percent={g.progressBound === 'unavailable' ? null : g.progressPct} size={64} label={`${g.name} progress`} complete={g.status === 'completed'} identity={`full-${g.key}`} bound={g.progressBound} /><span>{progressWords(g)}{g.target ? ` · target ${formatGoalAmount(g.target, g.currency)}` : ''}</span></p>
      {extra?.why && <p className="vision-full-why">“{extra.why}”</p>}
      {extra?.ifThen && <p className="fine">{extra.ifThen}</p>}
      <div className="vision-full-actions"><Link className="primary" href={g.href} onClick={() => dialog.current?.close()}>Open Goal →</Link><button type="button" className="secondary" onClick={() => dialog.current?.close()}>Close</button></div>
    </div>
    <button type="button" className="vision-full-close quiet" aria-label="Close full screen" onClick={() => dialog.current?.close()}>×</button>
  </dialog>, document.body);
}
