'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useDeviceRecord} from '../ai/use-device-record';
import {GAME, setGameEnabled, markLevelSeen} from '../../lib/game/schema';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import './game.css';

/**
 * The "Game layer" switch (ADR-022 B2): under Settings → Your pages & buttons (AA-Cloud mounts it) and on the Journey
 * page. Off for real people until they turn it on; on in the Showcase. It writes only `zigoals:game:v1`.
 */
export function GameSetting() {
  const game = useDeviceRecord(GAME), [error, setError] = useState('');
  const on = game.loaded && !game.unreadable && game.data.enabled;
  return <div className="game-setting">
    <label className="game-setting-row"><input type="checkbox" role="switch" aria-checked={on} checked={on} disabled={!game.loaded || game.unreadable} onChange={e => { try { game.update(g => { const next = setGameEnabled(g, e.target.checked); return next.enabled && next.levelSeen === undefined ? next : next; }); setError(''); } catch (cause) { setError(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`); } }} /><span><strong>Game layer</strong><small>Levels, daily quests and badges from the check-ins and logs you already make. Optional, calm, never a punishment; kept on this device and, with an account, in your encrypted extras.</small></span></label>
    {on && <p className="fine"><Link className="text-link" href="/app/journey">Open your Journey →</Link></p>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
export {markLevelSeen};
