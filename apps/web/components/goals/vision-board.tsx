'use client';
import Link from 'next/link';
import type {GoalSummary} from '../../lib/goal-summary';
import type {GoalExtras} from '../../lib/goal-extras/store';
import {GRADIENTS} from '../../lib/goal-extras/store';
import {ProgressRing} from '../platform/financial-ui';
import {VisionArt} from './vision-art';

/** A goal without a chosen vision still gets a calm picture: one of the gradients, picked from its key. */
const fallback = (key: string) => GRADIENTS[[...key].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % GRADIENTS.length]!;

/**
 * G3, the vision board: every goal as a picture (its photo, its gradient and emoji, or a calm default), in a masonry
 * grid, with its progress ring and name. A tap opens the goal, where its vision is chosen.
 */
export function VisionBoard({goals, extras}: {goals: readonly GoalSummary[]; extras: GoalExtras}) {
  if (!goals.length) return <div className="aa-empty"><h3>Your board fills as you plan.</h3><p>Every goal becomes a picture here. Create one, then give it a gradient, an emoji or your own photo.</p><Link className="primary" href="/app/goals/new">+ Create a goal</Link></div>;
  return <ul className="vision-board" aria-label="Vision board">
    {goals.map((g, i) => {
      const vision = extras.goals[g.key]?.vision ?? {kind: 'gradient' as const, gradient: fallback(g.key)};
      return <li key={g.key} className="vision-tile" data-tall={i % 3 === 0 ? '' : undefined}>
        <Link href={g.href} className="vision-tile-link">
          <VisionArt vision={vision} name={g.name} className="vision-tile-art" />
          <span className="vision-tile-body">
            <ProgressRing percent={g.progressBound === 'unavailable' ? null : g.progressPct} size={56} label={`${g.name} progress`} complete={g.status === 'completed'} identity={`board-${g.key}`} bound={g.progressBound} />
            <span><strong>{g.name}</strong><small>{g.status === 'completed' ? 'Finished' : g.progressBound === 'unavailable' ? 'Progress unknown' : `${Math.floor(Number(g.progressPct))}% of the way`}</small></span>
          </span>
        </Link>
      </li>;
    })}
  </ul>;
}
