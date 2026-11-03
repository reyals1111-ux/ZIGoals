'use client';
import {useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {CYCLE, cycleOn} from '../../lib/cycle/store';
import {setCycleOn} from '../../lib/cycle/engine';

/**
 * Session AK (BUILD list 2 #16, lane G1a): the cycle log's switch in Settings → Your pages & buttons, under Health. Off
 * by default; on this device only (`on` in `zigoals:cycle:v1`, never the synced pages format). Turning it off hides the
 * log and keeps every entry.
 */
export default function CycleSwitch({healthShown}: {healthShown: boolean}) {
  const rec = useDeviceRecord(CYCLE), [said, setSaid] = useState('');
  if (!rec.loaded) return null;
  const on = cycleOn(rec.data);
  const change = (next: boolean) => { try { rec.update(r => setCycleOn(r, next)); setSaid(next ? 'The cycle log shows in Health → Diary.' : 'The cycle log is hidden. Your entries stay.'); } catch { setSaid('This choice could not be kept on this device.'); } };
  return <div className="pages-switch-row">
    <label className="pages-switch">
      <input type="checkbox" role="switch" checked={on} disabled={rec.unreadable || !healthShown} aria-describedby="pages-note-cycle" onChange={e => change(e.currentTarget.checked)}/>
      <span>Cycle log</span>
    </label>
    <small className="pages-switch-note" id="pages-note-cycle">Off unless you turn it on. On this device, inside Health. Information for you, not a contraceptive or a diagnosis.{said ? ` ${said}` : ''}</small>
  </div>;
}
