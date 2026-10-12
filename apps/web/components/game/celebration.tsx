'use client';
import {useEffect, useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {zigiSignals} from '../zigi/bus';
import {firstSight, goalCelebration, pendingCelebrations, type Celebration} from '../../lib/game/celebrate';
import {markBadgeSeen, markLevelSeen} from '../../lib/game/schema';
import {motionAllowed} from '../zigi/motion';
import type {GameState} from './use-game';
import './game.css';

/**
 * S10: the ONE celebration renderer of the app (ADR-022, owner edit 4). It shows what `pendingCelebrations` derives
 * (a level, a badge, a 100-day streak, a fasting milestone) and what AA-Cloud emits through ZIGi's bus (a goal reached),
 * each exactly once on this device through `zigoals:celebrations:v1`. Nebula particles play once; reduced motion and
 * Motion Off get a still card. ZIGi joins in through its own validated events (the daily cap stays the controller's).
 */
const PARTICLES = 22;
export function CelebrationHost({game, fasting}: {game: GameState; fasting?: Parameters<typeof pendingCelebrations>[4]}) {
  const [queue, setQueue] = useState<Celebration[]>([]), shown = useRef(new Set<string>());
  const {celebrations, derived, enabled, today} = game;
  const seenReady = celebrations.loaded && !celebrations.unreadable;
  useEffect(() => {
    if (!enabled || !derived || !seenReady || !game.game.loaded) return;
    const due = pendingCelebrations(game.stores, game.game.data, celebrations.data.seen, today, fasting).filter(c => !shown.current.has(c.id));
    // What the layer sees first is remembered (the level and every badge already earned), so only what comes after celebrates.
    if (game.game.data.levelSeen === undefined) { const sight = firstSight(game.stores, today); try { game.game.update(g => { let next = markLevelSeen(g, sight.level); for (const id of sight.badgeIds) next = markBadgeSeen(next, id, today); return next; }); } catch { /* next time */ } return; }
    if (due.length) { for (const c of due) shown.current.add(c.id); setQueue(q => [...q, ...due]); }
  }, [enabled, derived, seenReady, today, fasting]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!enabled || !seenReady) return;
    return zigiSignals.on(signal => {
      if (!signal.validated || (signal.type !== 'goal_milestone_reached' && signal.type !== 'goal_funded')) return;
      const c = goalCelebration(signal.type, celebrations.data.seen, today);
      if (c && !shown.current.has(c.id)) { shown.current.add(c.id); setQueue(q => [...q, c]); }
    });
  }, [enabled, seenReady, celebrations.data.seen, today]);
  const current = queue[0];
  useEffect(() => {
    if (!current) return;
    try { celebrations.update(n => ({...n, seen: {...n.seen, [current.id]: today}})); } catch { /* shown once in this session anyway */ }
    try { if (current.kind === 'level') game.game.update(g => markLevelSeen(g, Number(current.id.split(':')[1]))); if (current.kind === 'badge') game.game.update(g => markBadgeSeen(g, current.id.split(':')[1]!, today)); } catch { /* the seen map above holds it */ }
    if (current.semantic) { try { zigiSignals.emitValidated(current.semantic); } catch { /* decoration */ } }
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!current) return null;
  const still = !motionAllowed();
  return <div className="celebration-backdrop" role="dialog" aria-modal="true" aria-labelledby="celebration-title" data-still={still || undefined}>
    <section className="celebration-card">
      {!still && <div className="celebration-particles" aria-hidden="true">{Array.from({length: PARTICLES}, (_, i) => <i key={i} style={{'--i': i, '--a': `${(i * 137) % 360}deg`, '--d': `${70 + (i * 53) % 90}px`, '--t': `${900 + (i * 97) % 500}ms`} as React.CSSProperties} />)}</div>}
      <span className="celebration-symbol" aria-hidden="true">{current.symbol}</span>
      <p className="eyebrow">{current.kind === 'level' ? 'Level up' : current.kind === 'badge' ? 'A new badge' : current.kind === 'streak' ? 'A streak' : current.kind === 'fast' ? 'Fasting' : 'A goal'}</p>
      <h2 id="celebration-title"><NebulaFlow identity={`celebration:${current.id}`}>{current.title}</NebulaFlow></h2>
      <p className="celebration-line">{current.line}</p>
      <button type="button" className="primary" autoFocus onClick={() => setQueue(q => q.slice(1))}>{queue.length > 1 ? 'Next' : 'Lovely'}</button>
    </section>
  </div>;
}
