'use client';
import {useState, type CSSProperties} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {motionAllowed} from '../zigi/motion';
import {storageMessageOr} from '../../lib/storage-error-copy';
import type {Milestone} from '../../lib/universe/model';
import '../game/game.css';

/**
 * A Universe milestone, celebrated once (Session AF, L5b; ADR-028 H55, H77) in the app's one celebration look — the card,
 * the symbol and the nebula particles of components/game/celebration.tsx — drawn in place inside the Universe instead
 * of over the page, so it hides nothing and works with Gamify off. The particles burst once; reduced motion and Motion
 * Off get the still card. Only the person's "Lovely" remembers the milestone (`zigoals:universe:v1`): seeing it writes
 * nothing, and it stays until acknowledged.
 */
const PARTICLES = 22;
const SYMBOL: Record<Milestone['kind'], string> = {ring: '◎', moon: '☾', staked: '✦', 'all-four': '✺'};
export function UniverseCelebration({milestones, onCelebrate}: {milestones: readonly Milestone[]; onCelebrate: (id: string) => void}) {
  const [error, setError] = useState(''), [still] = useState(() => !motionAllowed());
  const current = milestones[0];
  if (!current) return null;
  const lovely = () => { setError(''); try { onCelebrate(current.id); } catch (e) { setError(storageMessageOr(e, 'This milestone could not be remembered on this device.')); } };
  return <section className="celebration-card universe-celebration" aria-labelledby="universe-celebration-title" data-still={still || undefined} data-milestone={current.id}>
    {!still && <div key={current.id} className="celebration-particles" aria-hidden="true">{Array.from({length: PARTICLES}, (_, i) => <i key={i} style={{'--i': i, '--a': `${(i * 137) % 360}deg`, '--d': `${70 + (i * 53) % 90}px`, '--t': `${900 + (i * 97) % 500}ms`} as CSSProperties} />)}</div>}
    <span className="celebration-symbol" aria-hidden="true">{SYMBOL[current.kind]}</span>
    <p className="eyebrow">New in my universe</p>
    <h3 id="universe-celebration-title"><NebulaFlow identity={`universe-celebration:${current.id}`}>{current.title}</NebulaFlow></h3>
    <p className="celebration-line">{current.line}</p>
    <button type="button" className="primary" onClick={lovely}>{milestones.length > 1 ? 'Lovely, next' : 'Lovely'}</button>
    {milestones.length > 1 && <p className="fine">{milestones.length - 1} more {milestones.length === 2 ? 'milestone' : 'milestones'} after this one.</p>}
    {error && <p role="alert" className="fine">{error}</p>}
  </section>;
}
