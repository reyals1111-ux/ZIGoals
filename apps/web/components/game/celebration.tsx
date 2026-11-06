'use client';
import {useEffect, useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {zigiSignals} from '../zigi/bus';
import {firstSight, goalCelebration, goalFinishedToday, pendingCelebrations, type Celebration} from '../../lib/game/celebrate';
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
/**
 * Session AL (P-NB-02; NB-050): every host on a page (the Journey page and a page's progress card) shares one claimed
 * set, so one tap never opens two stacked cards; what is due at the same moment shows together on ONE card.
 */
const CLAIMED = new Set<string>();
const eyebrowOf = (c: Celebration) => c.kind === 'level' ? 'Level up' : c.kind === 'badge' ? 'A new badge' : c.kind === 'streak' ? 'A streak' : c.kind === 'fast' ? 'Fasting' : c.kind === 'checklist' ? 'Your orbit' : 'A goal';
const GOAL_SIGNALS = new Set(['goal_milestone_reached', 'goal_funded', 'goal_finished', 'achievement_unlocked']);
export function CelebrationHost({game, fasting}: {game: GameState; fasting?: Parameters<typeof pendingCelebrations>[4]}) {
  const [queue, setQueue] = useState<Celebration[]>([]);
  const {celebrations, derived, enabled, today} = game;
  const seenReady = celebrations.loaded && !celebrations.unreadable;
  // Session AL fourth pass (DV-118, M-140, G-031, T-039): a celebration that follows something the person did on this
  // page (a tap, a key) opens as the card it always was. One found on arrival, for what was done elsewhere (a milestone
  // ticked on a goal, then Activity opened), is a quiet card in the corner: no backdrop, the focus stays where it is, and
  // the page can be read and used around it.
  const acted = useRef(false), queueLength = useRef(0), [quiet, setQuiet] = useState(false);
  queueLength.current = queue.length;
  useEffect(() => {
    const mark = (e: Event) => { if (e.isTrusted) acted.current = true; };
    document.addEventListener('pointerdown', mark, true); document.addEventListener('keydown', mark, true);
    return () => { document.removeEventListener('pointerdown', mark, true); document.removeEventListener('keydown', mark, true); };
  }, []);
  const claim = (list: Celebration[]) => { const mine = list.filter(c => !CLAIMED.has(c.id)); for (const c of mine) CLAIMED.add(c.id); if (!mine.length) return; if (!queueLength.current) setQuiet(!acted.current); queueLength.current += mine.length; setQueue(q => [...q, ...mine]); };
  useEffect(() => {
    if (!enabled || !derived || !seenReady || !game.game.loaded) return;
    const due = pendingCelebrations(game.stores, game.game.data, celebrations.data.seen, today, fasting);
    // What the layer sees first is remembered (the level and every badge already earned), so only what comes after celebrates.
    if (game.game.data.levelSeen === undefined) { const sight = firstSight(game.stores, today); try { game.game.update(g => { let next = markLevelSeen(g, sight.level); for (const id of sight.badgeIds) next = markBadgeSeen(next, id, today); return next; }); } catch { /* next time */ } return; }
    claim(due);
  }, [enabled, derived, seenReady, today, fasting]); // eslint-disable-line react-hooks/exhaustive-deps
  const storesRef = useRef(game.stores); storesRef.current = game.stores;
  useEffect(() => {
    if (!enabled || !seenReady) return;
    return zigiSignals.on(signal => {
      if (!signal.validated || !GOAL_SIGNALS.has(signal.type)) return;
      // Session AL (P-NB-02): `achievement_unlocked` is also what a badge card, a first check-in and a mood check-in send;
      // it means "A goal finished" only when the records show a goal reached today. Goals sends `goal_finished` itself.
      const type = signal.type === 'achievement_unlocked' || signal.type === 'goal_finished' ? (goalFinishedToday(storesRef.current, today) || signal.type === 'goal_finished' ? 'goal_finished' : null) : signal.type as 'goal_milestone_reached' | 'goal_funded';
      if (!type) return;
      const c = goalCelebration(type, celebrations.data.seen, today);
      if (c) claim([c]);
    });
  }, [enabled, seenReady, celebrations.data.seen, today]);
  const ids = queue.map(c => c.id).join('|');
  // Session AL (P-DVR-84; G-031, T-039): a celebration waits while the person is typing in a field (a log form, a note),
  // so it never takes the focus mid-entry; it opens a moment after they leave the field. A button tap opens it at once.
  const [calm, setCalm] = useState(false);
  useEffect(() => {
    if (!queue.length) { setCalm(false); return; }
    const typing = () => !!(document.activeElement as HTMLElement | null)?.closest?.('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable="true"]');
    if (!typing()) { setCalm(true); return; }
    const timer = window.setInterval(() => { if (!typing()) { window.clearInterval(timer); setCalm(true); } }, 600);
    return () => window.clearInterval(timer);
  }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!queue.length || !calm) return;
    try { celebrations.update(n => { const seen = {...n.seen}; for (const c of queue) seen[c.id] ??= today; return {...n, seen}; }); } catch { /* shown once in this session anyway */ }
    try { for (const c of queue) { if (c.kind === 'level') game.game.update(g => markLevelSeen(g, Math.max(g.levelSeen ?? 0, Number(c.id.split(':')[1])))); if (c.kind === 'badge') game.game.update(g => markBadgeSeen(g, c.id.split(':')[1]!, today)); } } catch { /* the seen map above holds it */ }
    // ZIGi joins once for the card. A badge's semantic is `achievement_unlocked`; the listener above no longer reads it as a goal.
    const lead = queue[0]!;
    if (lead.semantic) { try { zigiSignals.emitValidated(lead.semantic); } catch { /* decoration */ } }
    else { try { zigiSignals.emitValidated('journey_step'); } catch { /* decoration */ } } // Session AK Part 12: a Journey step (streak, fast, Checklist orbit), a Studio-4 reaction once its art lands
  }, [ids, calm]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = queue[0];
  // The quiet card is said once to a screen reader (it takes no focus); the status line stays mounted so it is heard.
  const [said, setSaid] = useState('');
  useEffect(() => { if (!current || !calm || !quiet) { setSaid(''); return; } const t = requestAnimationFrame(() => setSaid(`${current.title}. ${current.line}`)); return () => cancelAnimationFrame(t); }, [current?.id, calm, quiet]); // eslint-disable-line react-hooks/exhaustive-deps
  const status = <p className="sr-only" role="status">{said}</p>;
  if (!current || !calm) return status;
  const still = !motionAllowed(), rest = queue.slice(1), close = () => setQueue([]);
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  if (quiet) return <>{status}<div className="celebration-quiet" role="dialog" aria-modal="false" aria-labelledby="celebration-title" data-still={still || undefined} onKeyDown={onKeyDown}>
    <section className="celebration-card">
      <span className="celebration-symbol" aria-hidden="true">{current.symbol}</span>
      <p className="eyebrow">{eyebrowOf(current)}</p>
      <h2 id="celebration-title">{current.title}</h2>
      <p className="celebration-line">{current.line}</p>
      {rest.length > 0 && <ul className="celebration-also" aria-label="Also today">{rest.map(c => <li key={c.id}><span aria-hidden="true">{c.symbol} </span>{c.title}</li>)}</ul>}
      <button type="button" className="primary" onClick={close}>Lovely</button>
    </section>
  </div></>;
  return <div className="celebration-backdrop" role="dialog" aria-modal="true" aria-labelledby="celebration-title" data-still={still || undefined} onKeyDown={onKeyDown}>
    <section className="celebration-card">
      {!still && <div className="celebration-particles" aria-hidden="true">{Array.from({length: PARTICLES}, (_, i) => <i key={i} style={{'--i': i, '--a': `${(i * 137) % 360}deg`, '--d': `${70 + (i * 53) % 90}px`, '--t': `${900 + (i * 97) % 500}ms`} as React.CSSProperties} />)}</div>}
      <span className="celebration-symbol" aria-hidden="true">{current.symbol}</span>
      <p className="eyebrow">{eyebrowOf(current)}</p>
      <h2 id="celebration-title"><NebulaFlow identity={`celebration:${current.id}`}>{current.title}</NebulaFlow></h2>
      <p className="celebration-line">{current.line}</p>
      {rest.length > 0 && <ul className="celebration-also" aria-label="Also today">{rest.map(c => <li key={c.id}><span aria-hidden="true">{c.symbol} </span>{c.title}</li>)}</ul>}
      <button type="button" className="primary" autoFocus onClick={close}>Lovely</button>
    </section>
  </div>;
}
