'use client';
import {JOURNAL_DISPLAY, journalDisplaySchema, onThisDayShown, setOnThisDay, unhideAll} from '../../lib/on-this-day/store';
import {useDeviceRecord} from '../ai/use-device-record';

/**
 * Session AK (BUILD list 2 #3): the Journal's Privacy switch for "On this day" (on by default), and a way back for the
 * memories set aside with "Not this one". Written only when the person changes it (zigoals:journal-display:v1).
 */
export default function OnThisDaySwitch() {
  const display = useDeviceRecord(JOURNAL_DISPLAY);
  if (!display.loaded) return null;
  const setAside = display.data.hidden?.length ?? 0;
  const write = (fn: Parameters<typeof display.update>[0]) => { try { display.update(fn); } catch { /* the switch shows what the device holds */ } };
  return <>
    <label className="switch-row"><input type="checkbox" checked={onThisDayShown(display.data)} onChange={e => write(d => setOnThisDay(d, e.target.checked))}/> <span>Show “On this day”: what you wrote on this date in earlier years, a month ago and a week ago</span></label>
    {/* Session AV lane 2 (r4-mind; LEDGER #309, Journey's throwback notifications): off by default; says only how long ago. */}
    {onThisDayShown(display.data) && <label className="switch-row"><input type="checkbox" checked={display.data.memoryNotify === true} onChange={e => write(d => journalDisplaySchema.parse({...d, memoryNotify: e.target.checked}))}/> <span>Tell me in the morning when there is a memory (it says only “A memory from a year ago”, never your words; needs notifications on, under the Journal switch)</span></label>}
    <p className="fine">It appears at the top once an earlier entry shares today&rsquo;s date. Some memories are hard; hiding it keeps every entry.</p>
    {setAside > 0 && <p className="fine">{setAside} {setAside === 1 ? 'entry is' : 'entries are'} set aside from &ldquo;On this day&rdquo;. <button type="button" className="text-link" onClick={() => write(unhideAll)}>Show {setAside === 1 ? 'it' : 'them'} again</button></p>}
  </>;
}
