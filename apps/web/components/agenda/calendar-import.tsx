'use client';
import {useEffect, useId, useRef, useState, type ChangeEvent} from 'react';
import {MAX_ICS_BYTES, readIcs, type IcsImportResult} from '../../lib/ics/import';
import {CALENDAR_IMPORT, MAX_CALENDAR_NAME, addCalendar, removeCalendar} from '../../lib/ics/calendar';
import {useDeviceRecord} from '../ai/use-device-record';
import {formatNumber} from '../../lib/visual-format';

/**
 * Import a calendar (Session AK, T2), loaded the first time the person opens it, next to "Export to a calendar". The
 * chosen .ics file is read here as text (lib/ics/import.ts): nothing in it is run, opened or followed, and nothing is
 * sent anywhere. A preview says what will be kept and what was left out; "Add to agenda" keeps the read-only events on
 * this device (`zigoals:calendar-import:v1`), with Undo. Importing a calendar of the same name again replaces it.
 */
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export default function CalendarImport({today, onClose, onAdded}: {today: string; onClose: () => void; onAdded: (text: string, undo: () => void) => void}) {
  const id = useId(), record = useDeviceRecord(CALENDAR_IMPORT), input = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<IcsImportResult | null>(null), [name, setName] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { input.current?.focus(); }, []);
  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setResult(null); setError('');
    if (!file) return;
    if (file.size > MAX_ICS_BYTES) { setError('This file is over 2 MB, more than ZIGoals reads. Export a shorter range from your calendar app.'); return; }
    setBusy(true);
    try {
      const text = await file.text();
      const read = readIcs(text, {fileName: file.name, today, id: `cal_${crypto.randomUUID()}`, at: new Date()});
      setResult(read); setName(read.calendar.name);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'This file could not be read.'); }
    finally { setBusy(false); }
  };
  const same = result ? (record.data.calendars.find(c => c.name === (name.trim() || result.calendar.name)) ?? null) : null;
  const add = () => {
    if (!result) return;
    if (record.unreadable) { setError('Your imported calendars on this device could not be read, so nothing was added.'); return; }
    const calendar = {...result.calendar, name: name.trim().slice(0, MAX_CALENDAR_NAME) || result.calendar.name};
    try {
      record.update(r => addCalendar(same ? removeCalendar(r, same.id) : r, calendar));
      onAdded(`${same ? 'Replaced' : 'Added'} “${calendar.name}” with ${plural(calendar.events.length, 'event')}.`, () => record.update(r => { const back = removeCalendar(r, calendar.id); return same ? addCalendar(back, same) : back; }));
      setResult(null);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The calendar could not be kept on this device.'); }
  };
  const left = result ? [result.skipped.past && `${plural(result.skipped.past, 'event')} that ended over 90 days ago`, result.skipped.cancelled && `${plural(result.skipped.cancelled, 'cancelled event')}`, result.skipped.unreadable && `${plural(result.skipped.unreadable, 'event')} ZIGoals could not read`, result.skipped.overCap && `${plural(result.skipped.overCap, 'event')} over the 1,000 kept from one file`].filter(Boolean) as string[] : [];
  return <div className="agenda-import" role="group" aria-labelledby={`${id}-t`}>
    <h3 id={`${id}-t`} className="sr-only">Import choices</h3>
    <label className="field agenda-import-file"><span>Choose an .ics file</span><input ref={input} type="file" accept=".ics,.ical,text/calendar" onChange={e => void choose(e)} disabled={busy} /></label>
    {busy && <p className="fine" role="status">Reading the file on this device…</p>}
    {result && <div className="agenda-import-preview">
      <p className="agenda-export-sum">{result.kept ? `${plural(result.kept, 'event')} to add, read-only: titles, days, times and repeats.` : 'No event in this file can be shown.'}</p>
      {left.length > 0 && <p className="fine">Left out: {left.join('; ')}.</p>}
      {result.firstOnly > 0 && <p className="fine">{plural(result.firstOnly, 'event')} {result.firstOnly === 1 ? 'repeats' : 'repeat'} in a way ZIGoals cannot read: only the first day is shown.</p>}
      {result.floatingZones > 0 && <p className="fine">{plural(result.floatingZones, 'time')} named a time zone this device does not know: shown as local times.</p>}
      <label className="field"><span>Calendar name</span><input value={name} maxLength={MAX_CALENDAR_NAME} onChange={e => setName(e.target.value)} /></label>
      {same && <p className="fine">You already have “{same.name}”: adding replaces it with this file.</p>}
      <div className="agenda-export-actions">
        <button type="button" className="primary" disabled={!result.kept} onClick={add}>{same ? 'Replace in agenda' : 'Add to agenda'}</button>
        <button type="button" className="quiet" onClick={onClose}>Cancel</button>
      </div>
    </div>}
    {!result && <div className="agenda-export-actions"><button type="button" className="quiet" onClick={onClose}>Close</button></div>}
    {error && <p role="alert">{error}</p>}
    <p className="fine">The file is read on this device and never sent anywhere. Only each event’s title, day, time, length and repeat are kept; descriptions, places, people, links and attachments are left out, and nothing in the file is opened or run. Events stay read-only here: change them in your calendar app, then import the file again.</p>
  </div>;
}
