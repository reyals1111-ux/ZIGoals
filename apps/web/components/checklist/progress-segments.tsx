'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';

/**
 * Session AG Polish 2 (ADR-031; owner Part 3, pointers D-path 5 and P 9): today's progress bar, calmer and built from the
 * day's own nodes. A slim glass track holds one segment per counted item, in path order, each in its node's own neon
 * colour, its ends flowing into its neighbours' colours like the neon line between nodes. A segment stays matte (its
 * node's unreached tint, faint) until its item is done; it lights in the same render as its node and its stretch of line,
 * with a short fade (at once under reduced motion and Motion Off), and dims again on Undo. Items done out of order light
 * their own segment, so the bar shows which, not just how many. The sparkle rests at the end of the last lit segment; a
 * light sweeps once along a segment that has just lit (`.checklist-progress-shine`). The words beside it stay the honest
 * count ("5 of 13 planets today"); the bar is a progressbar with the same values.
 */
export type ProgressSegment = {id: string; colour: string; lit: boolean};

export function ProgressSegments({segments, done, total, valueText, ready}: {segments: readonly ProgressSegment[]; done: number; total: number; valueText: string; ready: boolean}) {
  const n = segments.length, lastLit = segments.reduce((at, s, i) => s.lit ? i : at, -1);
  // (A segment that has just lit gets one sweep of light — never on the first paint.)
  const seen = useRef<Set<string> | null>(null), [shine, setShine] = useState<{id: string; run: number} | null>(null);
  const litKey = segments.filter(s => s.lit).map(s => s.id).join('|');
  useEffect(() => {
    const now = new Set(litKey ? litKey.split('|') : []), before = seen.current; seen.current = now;
    if (!before || !ready) return;
    const fresh = [...now].filter(id => !before.has(id));
    if (fresh.length) setShine(s => ({id: fresh.at(-1)!, run: (s?.run ?? 0) + 1}));
  }, [litKey, ready]);
  const shineAt = shine ? segments.findIndex(s => s.id === shine.id) : -1;
  return <div className="glass-track checklist-progress-bar checklist-progress-segments" role="progressbar" aria-label="Planets lit today" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-valuetext={valueText} data-empty={lastLit < 0 ? '' : undefined} data-ready={ready ? '' : undefined}>
    <span className="checklist-progress-track" aria-hidden="true">
      {segments.map((s, i) => <span key={s.id} className="checklist-progress-seg" data-step={s.id} data-lit={s.lit ? '' : undefined}
        style={{'--seg': s.colour, '--seg-prev': segments[i - 1]?.colour ?? s.colour, '--seg-next': segments[i + 1]?.colour ?? s.colour} as CSSProperties}/>)}
    </span>
    {shine && shineAt >= 0 && segments[shineAt]?.lit && <span key={shine.run} className="checklist-progress-shine" aria-hidden="true" style={{left: `${shineAt / n * 100}%`, width: `${100 / n}%`}}/>}
    {lastLit >= 0 && <span className="checklist-progress-spark" aria-hidden="true" style={{left: `${(lastLit + 1) / n * 100}%`}}/>}
  </div>;
}
