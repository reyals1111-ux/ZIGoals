'use client';
import {useRef, useState} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {startAgain, type GameRecord} from '../../lib/game/schema';
import {formatDate, formatNumber} from '../../lib/visual-format';
import {storageMessageOr} from '../../lib/storage-error-copy';
import {ConfirmInline} from '../ui/confirm-inline';
import type {DeviceRecordState} from '../ai/use-device-record';
import './av2-journey.css';

/**
 * Session AV lane 2 (habits; LEDGER #48, Habitica's Orb of Rebirth): start again at level 1. XP from today on counts
 * toward the level; every record, badge, freeze and the XP history stay. Asked once, in plain words, with Cancel first.
 * Loaded with the Journey's lower panels.
 */
export default function StartAgain({game, today, level}: {game: DeviceRecordState<GameRecord>; today: string; level: number}) {
  const [asking, setAsking] = useState(false), [said, setSaid] = useState(''), opener = useRef<HTMLButtonElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const rebirth = game.data.rebirth;
  const go = () => {
    try { game.update(g => startAgain(g, today)); setSaid('You are at level 1 again. Your badges and every record stay.'); }
    catch (cause) { setSaid(storageMessageOr(cause, 'Not saved on this device.')); }
    setAsking(false);
    // The button leaves with level 1; focus moves to the panel's heading, never to the page.
    requestAnimationFrame(() => (opener.current ?? heading.current)?.focus());
  };
  return <section className="panel journey-rebirth" aria-labelledby="journey-rebirth-title"><p className="eyebrow">A fresh start</p><h2 id="journey-rebirth-title" ref={heading} tabIndex={-1}><NebulaFlow identity="journey-rebirth">Start again at level 1</NebulaFlow></h2>
    <p>{rebirth ? `Counting from ${formatDate(rebirth.from)}${rebirth.times > 1 ? ` · started again ${formatNumber(rebirth.times)} times` : ''}. ` : ''}Starting again counts your level from today. Badges, freezes, streaks and every record stay as they are; only the level starts over.</p>
    {level > 1 && <button ref={opener} type="button" className="secondary" aria-expanded={asking} onClick={() => { setSaid(''); setAsking(true); }}>Start again at level 1…</button>}
    {level <= 1 && <p className="fine">You are at level 1 now, so there is nothing to start over yet.</p>}
    {asking && <ConfirmInline tone="neutral" title={`Start again at level 1 from level ${level}?`} confirmLabel="Start again" onConfirm={go} onCancel={() => { setAsking(false); opener.current?.focus(); }}>XP before today stays in your history but no longer counts toward your level.</ConfirmInline>}
    {said && <p className="fine" role="status">{said}</p>}
  </section>;
}
