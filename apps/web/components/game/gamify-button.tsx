'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {GAME, setGameEnabled} from '../../lib/game/schema';
import './gamify-button.css';

const Rocket = () => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><defs><linearGradient id="gamify-rocket-g" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#6fe6f6"/><stop offset=".6" stopColor="#a3a0ff"/><stop offset="1" stopColor="#f08bd6"/></linearGradient></defs><g fill="none" stroke="url(#gamify-rocket-g)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 3.5c3 .3 5.7 3 6 6-2.4 4.6-5.8 7.6-9.3 9.1l-5.8-5.8c1.5-3.5 4.5-6.9 9.1-9.3z"/><path d="M8.6 15.4 5 19M9.2 7.9 6 8.3l-3 3 3.6.6M16.1 14.8l-.4 3.2-3 3-.6-3.6"/><circle cx="14.6" cy="9.4" r="1.6"/></g></svg>;

/**
 * Session AB-Design (owner request 9, ADR-024 D8): the Gamify button beside every page's layout lock. A small rocket
 * that widens on hover or focus to say "Gamify" (static under reduced motion and Motion Off), with a small menu:
 * "Gamify: on/off" (the game layer's own device record, the same switch Settings shows) and "Open your Journey →".
 * Session AH (SE8; D-218, M-006): one name everywhere, "Game layer" (it had been "Gamify" here and "Game layer" in Settings).
 * With the game layer off the game cards, XP and quests show nowhere; streaks stay a plain habit feature.
 */
export function GamifyButton() {
  const game = useDeviceRecord(GAME), [open, setOpen] = useState(false), [error, setError] = useState(''), root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (!open) return; const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close); }, [open]);
  const on = game.loaded && !game.unreadable && game.data.enabled;
  const toggle = () => { try { game.update(g => setGameEnabled(g, !on)); setError(''); } catch { setError('This device refused to save that choice.'); } };
  return <div ref={root} className="gamify" data-on={on || undefined} onKeyDown={e => { if (e.key === 'Escape' && open) { e.preventDefault(); setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className="gamify-trigger" aria-label={`Game layer: ${on ? 'on' : 'off'}`} aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(v => !v)}>
      <Rocket/><span className="gamify-word" aria-hidden="true">Game layer</span>
    </button>
    {open && <div className="gamify-menu" role="group" aria-label="Game layer options">
      <button type="button" role="switch" aria-checked={on} className="gamify-switch" onClick={toggle}><span>Game layer</span><span className="gamify-state">{on ? 'On' : 'Off'}</span></button>
      <p className="gamify-note">{on ? 'XP, quests and badges show at the bottom of pages and on your Journey.' : 'Streaks stay. No XP, quests or badges until you switch it on.'}</p>
      <Link className="gamify-journey" href="/app/journey" onClick={() => setOpen(false)}>Open your Journey →</Link>
      {error && <p role="alert" className="gamify-note">{error}</p>}
    </div>}
  </div>;
}
