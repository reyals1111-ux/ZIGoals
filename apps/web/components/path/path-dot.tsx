'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import {stepAriaLabel, type PathStep, type StepIntent} from '../../lib/path/model';
import {PathGlyph} from './path-glyphs';
import {OrbitNodeFace} from '../orbit-path/orbit-node';

/**
 * One dot (P7.4, P7.10): a large glowing planet in the step's own colour. Undone: a dark glass disc with a ring and the
 * step's mark; done: filled with its colour, a dark check, a soft glow and a lip beneath (a pressable planet); running:
 * a lit ring with its mark; locked: a dim disc with a lock, which is not a control. When a dot has just been done it fills
 * once (scale), a ring bursts and eight sparks fly (CSS, `data-just`); reduced motion and Motion Off show the final still.
 * A step that opens a page is a link; every other step is a button (`aria-pressed` = done; a value step says whether its
 * stepper is open). `data-path-point` lets the line find its centre.
 *
 * Session AG (ADR-029): with `orbit` (the Checklist's full-screen path) the dot is an orbit node
 * (components/orbit-path/orbit-node.tsx): unlit until done, lit once done, its ring blooming once on the tick. Decoration
 * inside the dot is aria-hidden; the dot's name says its state.
 */
/** `next`: the path's next node; `arrive`: the light a tick sent is on its way to it. */
export type OrbitDot = {next: boolean; arrive?: boolean};
export function PathDot({step, intent, just, expanded, onPress, orbit}: {step: PathStep; intent: StepIntent | null; just: boolean; expanded: boolean; onPress: (intent: StepIntent) => void; orbit?: OrbitDot}) {
  const style = {'--dot': PATH_COLOURS[step.colour].token, ...(orbit ? {'--node': PATH_COLOURS[step.colour].token} : {}), ...(step.partial !== undefined && step.state !== 'done' ? {'--partial': step.partial} : {})} as CSSProperties;
  const label = stepAriaLabel(step), done = step.state === 'done';
  // Session AG (owner pointers 1–2): the orbit look draws the footer banner's node — glass, a neon ring in the step's colour,
  // its line glyph — unlit until done, lit once done (the glyph stays; the name tab carries the check). A tick blooms the ring.
  const inner = orbit ? <>
    <OrbitNodeFace glyph={step.state === 'locked' ? 'lock' : step.glyph ?? 'star'} just={just}/>
    {step.partial !== undefined && !done && step.state !== 'locked' && <svg className="path-dot-ring" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="19.4" pathLength={1}/></svg>}
  </> : <>
    <span className="path-dot-core"><PathGlyph name={done ? 'check' : step.state === 'locked' ? 'lock' : step.glyph ?? 'sparkle'}/></span>
    {step.partial !== undefined && !done && step.state !== 'locked' && <svg className="path-dot-ring" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" pathLength={1}/></svg>}
    {just && <span className="path-dot-burst" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></span>}
  </>;
  const common = {className: orbit ? 'path-dot orbit-node' : 'path-dot', 'data-lit': orbit && done ? '' : undefined, 'data-state': step.state, 'data-just': just ? '' : undefined, 'data-arrive': orbit?.arrive && !done ? '' : undefined, 'data-partial': step.partial !== undefined && !done ? '' : undefined, 'data-next': orbit?.next && !done ? '' : undefined, 'data-path-point': step.id, 'data-step': step.id, style};
  if (!intent) return <span {...common} role="img" aria-label={label}>{inner}</span>;
  if (intent === 'open' && step.href) return <Link {...common} href={step.href} aria-label={label} onClick={() => onPress('open')}>{inner}</Link>;
  return <button type="button" {...common} aria-label={label} aria-pressed={done} aria-expanded={intent === 'value' ? expanded : undefined} onClick={() => onPress(intent)}>{inner}</button>;
}
