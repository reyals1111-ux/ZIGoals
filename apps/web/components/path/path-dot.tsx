'use client';
import Link from 'next/link';
import type {CSSProperties} from 'react';
import {PATH_COLOURS} from '../../lib/path/colours';
import {stepAriaLabel, type PathStep, type StepIntent} from '../../lib/path/model';
import {PathGlyph} from './path-glyphs';

/**
 * One dot (P7.4, P7.10): a large glowing planet in the step's own colour. Undone: a dark glass disc with a ring and the
 * step's mark; done: filled with its colour, a dark check, a soft glow and a lip beneath (a pressable planet); running:
 * a lit ring with its mark; locked: a dim disc with a lock, which is not a control. When a dot has just been done it fills
 * once (scale), a ring bursts and eight sparks fly (CSS, `data-just`); reduced motion and Motion Off show the final still.
 * A step that opens a page is a link; every other step is a button (`aria-pressed` = done; a value step says whether its
 * stepper is open). `data-path-point` lets the line find its centre.
 */
export function PathDot({step, intent, just, expanded, onPress}: {step: PathStep; intent: StepIntent | null; just: boolean; expanded: boolean; onPress: (intent: StepIntent) => void}) {
  const style = {'--dot': PATH_COLOURS[step.colour].token, ...(step.partial !== undefined && step.state !== 'done' ? {'--partial': step.partial} : {})} as CSSProperties;
  const label = stepAriaLabel(step), done = step.state === 'done';
  const inner = <>
    <span className="path-dot-core"><PathGlyph name={done ? 'check' : step.state === 'locked' ? 'lock' : step.glyph ?? 'sparkle'}/></span>
    {step.partial !== undefined && !done && step.state !== 'locked' && <svg className="path-dot-ring" viewBox="0 0 40 40" aria-hidden="true" focusable="false"><circle cx="20" cy="20" r="18.5" pathLength={1}/></svg>}
    {just && <span className="path-dot-burst" aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/><i/></span>}
  </>;
  const common = {className: 'path-dot', 'data-state': step.state, 'data-just': just ? '' : undefined, 'data-partial': step.partial !== undefined && !done ? '' : undefined, 'data-path-point': step.id, 'data-step': step.id, style};
  if (!intent) return <span {...common} role="img" aria-label={label}>{inner}</span>;
  if (intent === 'open' && step.href) return <Link {...common} href={step.href} aria-label={label} onClick={() => onPress('open')}>{inner}</Link>;
  return <button type="button" {...common} aria-label={label} aria-pressed={done} aria-expanded={intent === 'value' ? expanded : undefined} onClick={() => onPress(intent)}>{inner}</button>;
}
