'use client';
import {useState} from 'react';
import {BRIEF_DEFAULTS, briefPrefs, ZIGI, type BriefPrefs} from '../../lib/ai/store/records';
import {Switch} from './ai-switch';
import {useDeviceRecord} from './use-device-record';

/**
 * Settings → ZIGi · Your day (Session AF, L4, P8.2): the morning brief on Today, the evening recap and its time, the
 * earning line, and whether a brief asked for with /brief or by voice is read aloud. Kept in `zigoals:zigi:v1` `brief`
 * (a display choice of this device, never synced); written only when the person changes one; loaded when its card opens.
 */
export default function AiYourDay() {
  const zigi = useDeviceRecord(ZIGI), prefs = briefPrefs(zigi.data), [note, setNote] = useState('');
  const save = (change: Partial<BriefPrefs>, words: string) => {
    try { zigi.update(current => ({...current, brief: {...(current.brief ?? {}), ...change}})); setNote(words); }
    catch { setNote('Not saved on this device.'); }
  };
  if (!zigi.loaded) return <p className="ai-note" role="status">Reading your choices…</p>;
  return <div className="ai-pack-body ai-your-day">
    <Switch checked={prefs.morning} onChange={next => save({morning: next}, next ? 'The morning brief shows on Today.' : 'No morning brief on Today; /brief still shows it in the chat.')} label="Morning brief on Today"
      note="What is open today, your Checklist planets, meals planned, timers running, goal steps this week, the earning line and a note you keep, made on this device from your records."/>
    <Switch checked={prefs.evening} onChange={next => save({evening: next}, next ? `The evening recap shows from ${prefs.eveningTime}.` : 'No evening recap on Today; /recap still shows it in the chat.')} label="Evening recap on Today"
      note="What you did today, the streaks you kept, Health's counts while Health is shared, your Checklist, the earning line and one for tomorrow."/>
    <label className="field">Evening recap from<input type="time" value={prefs.eveningTime} disabled={!prefs.evening} onChange={e => { const v = e.target.value; if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v)) save({eveningTime: v}, `The evening recap shows from ${v}.`); }}/></label>
    <Switch checked={prefs.earning} onChange={next => save({earning: next}, next ? 'The earning line is in the brief.' : 'No earning line in the brief.')} label="Earning line"
      note="Your tracked staking (practice money labelled), rewards waiting and the next unbonding, with the staking figures the Earn page read, each with its source and time. Never a figure ZIGi made."/>
    <Switch checked={prefs.readAloud} onChange={next => save({readAloud: next}, next ? 'A brief you ask for is read aloud.' : 'A brief is read aloud only when you tap Read aloud.')} label="Read aloud a brief I ask for"
      note="With /brief or /recap. Never by itself, never while ZIGi is muted; the Read aloud button on each brief works either way."/>
    {JSON.stringify(prefs) !== JSON.stringify(BRIEF_DEFAULTS) && <div className="ai-card-actions"><button type="button" className="text-link" onClick={() => save({...BRIEF_DEFAULTS}, 'Back to the defaults.')}>Back to the defaults</button></div>}
    {note && <p className="ai-note" role="status">{note}</p>}
  </div>;
}
