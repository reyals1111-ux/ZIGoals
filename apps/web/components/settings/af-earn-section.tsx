'use client';
import Link from 'next/link';
import {useState} from 'react';
import {EARN_PATH, EARN_PREFS, earnPrefsOf, setEarnPref, setTodayCard} from '../../lib/earn/records';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import {useDeviceRecord} from '../ai/use-device-record';
import '../checklist/checklist-setting.css';

/**
 * Session AF chunk 2 (Part 5: P5.3, P1.30; ADR-028 H27, H72): the Earn switches on this device — the lead mounts it in
 * Settings beside "Your pages & buttons". The Earn dock (on by default; computers only, phones have the Earn page's strip
 * and More), whether it sits tucked into the screen's edge, and Today's Earn card. Display choices in
 * `zigoals:earn-prefs:v1` and the Today card's choice in `zigoals:earn-path:v1`; never in the synced pages record.
 */
export function AfEarnSection() {
  const prefs = useDeviceRecord(EARN_PREFS), path = useDeviceRecord(EARN_PATH), [error, setError] = useState('');
  const p = earnPrefsOf(prefs.data), usable = prefs.loaded && !prefs.unreadable, pathUsable = path.loaded && !path.unreadable;
  const write = (run: () => void) => { try { run(); setError(''); } catch (cause) { setError(deviceSettingFailureMessage(cause)); } };
  return <div className="af-checklist-setting af-earn-setting">
    <label className="af-checklist-setting-row"><input type="checkbox" role="switch" checked={usable && p.dockShown} disabled={!usable} onChange={e => write(() => prefs.update(r => setEarnPref(r, {dockShown: e.target.checked})))}/>
      <span><strong>Earn dock — on this device</strong><small>Off until you turn it on. A round button on the right edge, above music, that fans out the ecosystem apps. Computers only; on a phone the apps are at the top of the Earn page and in More.</small></span>
    </label>
    <label className="af-checklist-setting-row"><input type="checkbox" role="switch" checked={usable && p.dockFolded} disabled={!usable || !p.dockShown} onChange={e => write(() => prefs.update(r => setEarnPref(r, {dockFolded: e.target.checked})))}/>
      <span><strong>Keep the Earn dock tucked into the edge</strong><small>A small tab at the edge brings it back.</small></span>
    </label>
    <label className="af-checklist-setting-row"><input type="checkbox" role="switch" checked={pathUsable && path.data.todayCard !== 'dismissed'} disabled={!pathUsable} onChange={e => write(() => path.update(setTodayCard(e.target.checked ? 'auto' : 'dismissed')))}/>
      <span><strong>Earn card on Today</strong><small>“Learn to stake, earn and swap — in 30 minutes”, until you hold a stake.</small></span>
    </label>
    <p className="fine"><Link className="text-link" href="/app/earn">Open Earn →</Link></p>
    {error && <p role="alert">{error}</p>}
  </div>;
}
