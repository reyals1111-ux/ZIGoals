'use client';
import {useId, useState, type DragEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {showStatus, showUndo} from '../ui/undo-toast';
import {UI_PREFS} from '../../lib/ui-prefs/schema';
import {TASKS, MAX_TRAVEL, type Tasks} from '../../lib/tasks/schema';
import {TASK_PLAN, type TimeBlock} from '../../lib/tasks/plan-record';
import {blockProgress, blockTasks, blocksOn, dropIntoBlock, eventIdOf, eventTravel, leaveBy, setEventTravel, TRAVEL_CHOICES} from '../../lib/tasks/time-blocks';
import {restoreTasks} from '../../lib/tasks/engine';
import {LOOK_HEX} from '../../lib/tasks/look';
import {hourOf} from '../../lib/agenda/hour-grid';
import type {DayItem} from '../../lib/agenda/time-items';
import {zoneChoices, zoneClock, zoneDifference, zoneName} from '../../lib/agenda/second-zone';
import {minutesWords} from '../../lib/tasks/minutes';
import {formatClock, formatNumber} from '../../lib/visual-format';

/**
 * Session AV lane 2 (r5-plan; Akiflow), the Agenda hour grid's round 5 parts (loaded with the grid, which is its own chunk):
 * - time blocks (LEDGER #348) drawn at their hour, "2 of 4 done", a drop target for a dragged task (it joins the block);
 * - travel (LEDGER #353) before a timed task or an imported event, at the hour to leave ("Leave by 8:40"), and the travel
 *   minutes typed before an imported event;
 * - a second time zone (LEDGER #357) chosen once, its clock beside each hour.
 */
export const DRAG_TYPE = 'application/x-zigoals-task';
export type Travel = {id: string; title: string; leave: string; minutes: number};
export function useHourR5(date: string, items: readonly DayItem[]) {
  const prefs = useDeviceRecord(UI_PREFS), plan = useDeviceRecord(TASK_PLAN), tasks = useDeviceRecord(TASKS);
  const zone = prefs.loaded && !prefs.unreadable ? prefs.data.secondZone ?? null : null;
  const blocks = plan.loaded ? blocksOn(plan.data, date) : [];
  const travel: Travel[] = [];
  for (const i of items) {
    if (!i.time || i.state !== 'open') continue; // review B5L-3: nothing to leave for once closed (done or cancelled)
    const minutes = i.source === 'task' ? tasks.data.tasks.find(t => t.id === i.taskId)?.travel ?? 0 : i.source === 'event' ? eventTravel(plan.data, i.id) : 0;
    const leave = minutes ? leaveBy(i.time, minutes) : null;
    if (leave) travel.push({id: i.id, title: i.title, leave, minutes});
  }
  const write = (fn: (r: Tasks) => Tasks, before: Tasks['tasks'], message: string, undone: string) => {
    if (tasks.unreadable) { showStatus('Your tasks on this device could not be read, so nothing was changed.', {tone: 'error'}); return; }
    try { tasks.update(fn); showUndo({message, undone, restore: () => tasks.update(r => restoreTasks(r, before))}); } catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  const intoBlock = (taskId: string, b: TimeBlock) => {
    const t = tasks.data.tasks.find(x => x.id === taskId); if (!t) return;
    write(r => dropIntoBlock(r, taskId, b, date), [t], `“${t.title}” is in “${b.name}” (${formatClock(b.from)}–${formatClock(b.to)}). Plan my day places it inside the block.`, `“${t.title}” is out of the block again.`);
  };
  const setZone = (z: string | null) => { try { prefs.update(p => { const next = {...p}; if (z) next.secondZone = z; else delete next.secondZone; return next; }); showStatus(z ? `Second time zone: ${zoneName(z)}, beside the hours.` : 'One time zone again.'); } catch { showStatus('That choice could not be kept on this device.', {tone: 'error'}); } };
  const setTravel = (itemId: string, title: string, minutes: number | null) => {
    const eventId = eventIdOf(itemId); if (!eventId || plan.unreadable) return;
    // Review B5L-7: Undo puts back only this event's minutes, never the rest of the planning record.
    const was = plan.data.eventTravel?.[eventId] ?? null;
    try { plan.update(p => setEventTravel(p, eventId, minutes)); showUndo({message: minutes ? `${minutesWords(minutes)} of travel before “${title}”.` : `No travel before “${title}”.`, undone: 'As it was.', restore: () => plan.update(p => setEventTravel(p, eventId, was))}); }
    catch (e) { showStatus(e instanceof Error ? e.message : 'That could not be kept on this device.', {tone: 'error'}); }
  };
  const progress = (b: TimeBlock) => blockProgress(blockTasks(tasks.data, b, date));
  return {zone, blocks, travel, intoBlock, setZone, setTravel, progress, eventMinutes: (itemId: string) => eventTravel(plan.data, itemId),
    blocksAt: (hour: number) => blocks.filter(b => hourOf(b.from) === hour), travelAt: (hour: number) => travel.filter(x => hourOf(x.leave) === hour),
    zoneAt: (clock: string) => zone ? zoneClock(date, clock, zone) : null};
}
export type HourR5 = ReturnType<typeof useHourR5>;

/** The second zone's choice, once, above the grid. */
export function ZonePicker({r5, date}: {r5: HourR5; date: string}) {
  const id = useId(), [open, setOpen] = useState(false), [zones] = useState(() => zoneChoices());
  return <div className="agenda-zone">
    <p className="agenda-hours-help">{r5.zone ? <>Second time zone: <strong>{zoneName(r5.zone)}</strong> ({zoneDifference(date, r5.zone)}), beside each hour. </> : null}
      <button type="button" className="text-link" aria-expanded={open} aria-controls={`${id}-zone`} onClick={() => setOpen(o => !o)}>{r5.zone ? 'Change the second zone' : 'Show a second time zone'}</button></p>
    {open && <label id={`${id}-zone`} className="field"><span>Second time zone</span><select value={r5.zone ?? ''} onChange={e => { r5.setZone(e.target.value || null); setOpen(false); }}>
      <option value="">None</option>{zones.map(z => <option key={z} value={z}>{zoneName(z)} · {z}</option>)}</select></label>}
  </div>;
}
/** The second zone's clock beside an hour. */
export function ZoneClock({r5, clock, date}: {r5: HourR5; clock: string; date: string}) {
  const there = r5.zoneAt(clock);
  if (!there || !r5.zone) return null;
  return <small className="agenda-hour-zone" aria-label={`${formatClock(there.clock)} in ${zoneName(r5.zone)}${there.date !== date ? (there.date > date ? ', the next day' : ', the day before') : ''}`}>{formatClock(there.clock)}{there.date !== date ? (there.date > date ? ' +1' : ' −1') : ''}</small>;
}
/** A time block at its hour: a drop target for a dragged task. */
export function BlockRow({r5, block}: {r5: HourR5; block: TimeBlock}) {
  const [over, setOver] = useState(false), p = r5.progress(block);
  const drop = {
    onDragOver: (e: DragEvent<HTMLLIElement>) => { if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent<HTMLLIElement>) => { const taskId = e.dataTransfer.getData(DRAG_TYPE); setOver(false); if (taskId) { e.preventDefault(); e.stopPropagation(); r5.intoBlock(taskId, block); } },
  };
  return <li className="agenda-hour-item agenda-hour-block" data-drop={over || undefined} style={{['--block-colour' as string]: LOOK_HEX[block.colour]}} {...drop}>
    <span className="agenda-hour-text"><span className="agenda-item-title" dir="auto">{block.name}</span>
      <small>Time block · {formatClock(block.from)}–{formatClock(block.to)} · {p.total ? `${formatNumber(p.done)} of ${formatNumber(p.total)} done` : 'drag a task here, or choose the block in its editor'}</small></span>
  </li>;
}
export function TravelRow({travel}: {travel: Travel}) {
  return <li className="agenda-hour-item agenda-hour-travel">
    <span className="agenda-hour-text"><span className="agenda-item-title">Leave by {formatClock(travel.leave)}</span><small>Travel · {minutesWords(travel.minutes)} before “<span dir="auto">{travel.title}</span>”</small></span>
  </li>;
}
/** "Travel…" on an imported event: the minutes typed before it. */
export function EventTravel({r5, item}: {r5: HourR5; item: DayItem}) {
  const id = useId(), [open, setOpen] = useState(false), now = r5.eventMinutes(item.id), [value, setValue] = useState(now ? String(now) : '');
  if (item.source !== 'event' || !item.time || !eventIdOf(item.id)) return null;
  const n = Number(value), bad = value.trim() !== '' && !(Number.isInteger(n) && n >= 1 && n <= MAX_TRAVEL);
  return <>
    <button type="button" className="text-link agenda-hour-move" aria-expanded={open} aria-label={`Travel before “${item.title}”`} onClick={() => setOpen(o => !o)}>{now ? `Travel ${minutesWords(now)}` : 'Travel…'}</button>
    {open && <form className="agenda-task-move" aria-label={`Travel before “${item.title}”`} noValidate onSubmit={e => { e.preventDefault(); if (bad) return; r5.setTravel(item.id, item.title, value.trim() ? n : null); setOpen(false); }}>
      <label className="field"><span>Travel before (minutes)</span><input inputMode="numeric" list={`${id}-l`} value={value} placeholder="20" aria-invalid={bad || undefined} aria-describedby={`${id}-n`} onChange={e => setValue(e.target.value)} /></label>
      <datalist id={`${id}-l`}>{TRAVEL_CHOICES.map(c => <option key={c} value={c} />)}</datalist>
      <small id={`${id}-n`} className={bad ? 'tasks-field-error' : 'fine'} role={bad ? 'alert' : undefined}>{bad ? `Whole minutes from 1 to ${MAX_TRAVEL}.` : 'You type it; no route is looked up. Empty: no travel.'}</small>
      <button type="submit" className="secondary">Save</button>
      <button type="button" className="quiet" onClick={() => setOpen(false)}>Cancel</button>
    </form>}
  </>;
}
