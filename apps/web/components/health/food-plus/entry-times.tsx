'use client';
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import type {HealthData} from '../../../lib/health';
import {dailyData, healthZone} from '../../../lib/health-daily';
import {FOOD_PLUS} from '../../../lib/food-plus/schema';
import {eatenAt, eatingWindow, setEatenAt} from '../../../lib/food-plus/times';
import {useDeviceRecord} from '../../ai/use-device-record';
import {plainErrorMessage} from '../../../lib/plain-error';
import './food-plus.css';

/**
 * Session AV lane 2 (food, LEDGER #101; Cronometer's diary timestamps): each Diary entry shows when it was eaten — the time
 * it was logged on its own day, or the time you set — as a small button in its row; the button opens a time field to
 * change it, go back to the logged time, or take the time off. Under the meals, the day's eating window. The Diary rows
 * carry only an empty `data-food-time` slot (Health's first chunk stays as it was); this part fills each slot.
 * Kept on this device (`zigoals:food-plus:v1` `times`); nothing is estimated.
 */
export default function EntryTimes({data, date}: {data: HealthData; date: string}) {
  const record = useDeviceRecord(FOOD_PLUS), zone = healthZone(dailyData(data).preferences.timezone);
  const [slots, setSlots] = useState<HTMLElement[]>([]), [editing, setEditing] = useState<string | null>(null);
  const entries = data.diary.filter(e => e.date === date), key = entries.map(e => e.id).join(',');
  useLayoutEffect(() => {
    const find = () => setSlots(old => { const now = [...document.querySelectorAll<HTMLElement>('[data-food-time]')]; return now.length === old.length && now.every((n, i) => n === old[i]) ? old : now; });
    find();
    const root = document.querySelector('.health-meals'); if (!root) return;
    const watch = new MutationObserver(find); watch.observe(root, {childList: true, subtree: true});
    return () => watch.disconnect();
  }, [key]);
  if (!record.loaded) return null;
  const windowed = eatingWindow(data, record.data, zone, date);
  const byId = new Map(entries.map(e => [e.id, e]));
  return <>
    {slots.map(slot => { const entry = byId.get(slot.dataset.foodTime ?? ''); if (!entry) return null; const at = eatenAt(entry, record.data, zone);
      return createPortal(editing === entry.id
        ? <TimeEditor key={entry.id} name={entry.snapshot.name} clock={at?.clock ?? ''} set={!!at?.set} onClose={() => { setEditing(null); requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-food-time="${entry.id}"] button`)?.focus()); }}
            save={value => record.update(r => setEatenAt(r, entry.id, value, new Set(data.diary.map(e => e.id))))} />
        : <> · <button type="button" className="quiet food-plus-time" aria-label={at ? `${entry.snapshot.name}: eaten at ${at.clock}${at.set ? '' : ' (when it was logged)'}. Change the time` : `${entry.snapshot.name}: add the time it was eaten`} onClick={() => setEditing(entry.id)}>{at ? at.clock : 'Add time'}</button></>, slot, entry.id); })}
    {windowed && entries.length > 1 && <p className="fine food-plus-window" data-body-figure="">Eating window: {windowed.first} to {windowed.last} ({Math.floor(windowed.minutes / 60)} h {windowed.minutes % 60} min). Times are when each food was logged, or the time you set.</p>}
  </>;
}

function TimeEditor({name, clock, set, save, onClose}: {name: string; clock: string; set: boolean; save: (value: string | 'none' | null) => void; onClose: () => void}) {
  const [value, setValue] = useState(clock), [error, setError] = useState(''), field = useRef<HTMLInputElement>(null);
  useEffect(() => { field.current?.focus(); }, []);
  const run = (v: string | 'none' | null) => { try { save(v); onClose(); } catch (e) { setError(plainErrorMessage(e, 'This time could not be kept on this device.')); } };
  return <span className="food-plus-inline" role="group" aria-label={`Time ${name} was eaten`} onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } }}>
    <label className="field"><span>Eaten at</span><input ref={field} type="time" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); run(value || null); } }}/></label>
    {error && <span className="field-error" role="alert">{error}</span>}
    <span className="actions"><button type="button" className="primary" onClick={() => run(value ? value : null)}>Save time</button>{set && <button type="button" className="quiet" onClick={() => run(null)}>Use the logged time</button>}{(clock || set) && <button type="button" className="quiet" onClick={() => run('none')}>No time</button>}<button type="button" className="quiet" onClick={onClose}>Cancel</button></span>
  </span>;
}
