'use client';
import Link from 'next/link';
import {useEffect, useState} from 'react';
import {GlassBar} from '../progress/glass-progress';
import {nudgeDue, nudgeText} from '../../lib/checklist/nudges';
import {markNudged, todayOf} from '../../lib/checklist/day';
import {CHECKLIST_ROUTE} from '../../lib/af-checklist-keys';
import {useChecklist} from './use-checklist';
import {ChecklistMark, FlameMark} from './checklist-marks';
import './today-checklist.css';

/**
 * The Today card's body (P7.21, P7.14): "4 of 6 dots today", the bar, the next dot, the streak, and — at most three times
 * a day, never in the quiet hours, only while dots wait and nudges are on — one gentle line ("2 dots still waiting on
 * your path"). In the app only: nothing is sent. Opening the path counts the nudge as seen.
 */
export default function TodayChecklistBody() {
  const state = useChecklist(), {summary, streak, loaded, date} = state;
  const [slot, setSlot] = useState<string | null>(null);
  const waiting = summary ? summary.total - summary.done : 0, nudgedKey = date ? todayOf(state.days.data, date).nudged.join(',') : '';
  useEffect(() => {
    if (!loaded) return;
    const check = () => setSlot(nudgeDue(new Date(), {on: state.prefs.nudges, waiting, nudged: nudgedKey ? nudgedKey.split(',') : [], quiet: state.quiet}));
    check(); const t = window.setInterval(check, 60_000); return () => window.clearInterval(t);
  }, [loaded, state.prefs.nudges, waiting, nudgedKey, state.quiet]);
  const seen = () => { if (slot && date) { try { state.days.update(d => markNudged(d, date, slot)); } catch { /* the nudge shows again next time */ } } };
  if (!loaded || !summary) return <><p className="eyebrow" id="today-checklist-title">Checklist</p><p className="today-checklist-line">Reading your path…</p></>;
  const empty = state.dots.length === 0, next = summary.next;
  return <>
    <div className="today-checklist-head"><span className="today-checklist-mark" aria-hidden="true"><ChecklistMark size={26}/></span><p className="eyebrow" id="today-checklist-title">Checklist</p>
      {!empty && <span className="today-checklist-streak" aria-label={`${streak?.current ?? 0}-day streak`}><FlameMark lit={!!streak?.todayComplete}/><span aria-hidden="true">{streak?.current ?? 0}</span></span>}</div>
    {empty ? <>
      <h2 className="today-checklist-title">Your day as a path of dots</h2>
      <p className="today-checklist-line">Star a habit, a glass of water or a goal step on its page, and tick it here each day.</p>
    </> : <>
      <h2 className="today-checklist-title">{summary.total ? `${summary.done} of ${summary.total} ${summary.total === 1 ? 'dot' : 'dots'} today` : 'Nothing counted today'}</h2>
      <GlassBar identity="today-checklist" className="today-checklist-bar" value={summary.total ? summary.done / summary.total : 0} role="progressbar" aria-label="Checklist dots done today" aria-valuemin={0} aria-valuemax={summary.total} aria-valuenow={summary.done}/>
      <p className="today-checklist-line">{next ? <>Next: <strong>{next.label}</strong></> : summary.total ? 'All dots lit. See you tomorrow.' : 'Every dot rests today.'}</p>
      {slot && <p className="today-checklist-nudge" role="status">{nudgeText(waiting)}</p>}
    </>}
    <Link className="text-link today-checklist-open" href={CHECKLIST_ROUTE} onClick={seen}>{empty ? 'Build your path →' : 'Open your path →'}</Link>
  </>;
}
