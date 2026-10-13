'use client';
import {useState} from 'react';
import {habitArea, setHabitArea} from '../../lib/habits-extras/store';
import {areaLabel} from '../../lib/habits-extras/areas-mirror';
import {deviceSettingFailureMessage} from '../../lib/storage-error-copy';
import type {HabitExtrasState} from './use-habit-extras';

/** H6: a habit's life area (AA-Cloud's ids, owner edit 1), kept on this device by habit id; a chip on the card that opens a select. */
export function HabitAreaField({habitId, title, extras, keep}: {habitId: string; title: string; extras: HabitExtrasState; keep: ReadonlySet<string>}) {
  const current = extras.loaded && !extras.unreadable ? habitArea(extras.data, habitId) : null, [open, setOpen] = useState(false), [error, setError] = useState('');
  if (!extras.loaded) return null;
  const label = areaLabel(extras.areas, current);
  if (!open) return <button type="button" className={`quiet habit-area-chip${current ? ' habit-area-set' : ''}`} aria-label={`Area for ${title}: ${label ?? 'none'}`} onClick={() => setOpen(true)} disabled={extras.unreadable}>{label ? `◈ ${label}` : '◈ Area'}</button>;
  return <label className="field habit-area-select"><span>Area for {title}</span><select autoFocus value={current ?? ''} onChange={e => { try { extras.update(r => setHabitArea(r, habitId, e.target.value || null, keep)); setError(''); setOpen(false); } catch (cause) { setError(`Not saved on this device. ${deviceSettingFailureMessage(cause)}`); } }} onBlur={() => setOpen(false)}><option value="">No area</option>{extras.areas.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}</select>{error && <small role="alert">{error}</small>}</label>;
}
