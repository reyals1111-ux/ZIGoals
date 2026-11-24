'use client';
import {useMoodLook} from '../mood-look/use-mood-look';
import {useEffect, useMemo, useState} from 'react';
import {ENERGY_WORDS} from '../../lib/energy/schema';
import {formatDate} from '../../lib/visual-format';
import {preview} from '../../lib/on-this-day/on-this-day';
// Session AV lane 2 (r4-mind; LEDGER #309, Journey): a week ago and a month ago beside the years (sealed letters left out).
import {onDate, onThisDayView, throwbacks} from '../../lib/on-this-day/throwback';
import {addLocalDays} from '../../lib/local-date';
import {HIDE_FULL_NOTE, JOURNAL_DISPLAY, hideMemory, hideMemoryFull, onThisDayShown, setOnThisDay} from '../../lib/on-this-day/store';
import {useDeviceRecord} from '../ai/use-device-record';
import './on-this-day.css';

type Entry = {id: string; date: string; text: string; opensOn?: string};

/**
 * Session AK (BUILD list 2 #3): "On this day" on the Journal (under Write since fr-layout, FR-L-6) — what the person wrote on this date in earlier
 * years, the same day a month ago and a week ago (Session AV lane 2, r4-mind; LEDGER #309), with the day's energy and mood
 * words when they were rated. Collapsible; away when
 * nothing matches or when the person hid it. "Not this one" sets one memory aside for good; the entry itself stays.
 * Loaded on its own after the Journal page; reads only, writes only the display key on the person's choice.
 */
export default function OnThisDay({entries, today, energy, moods, picked = null}: {entries: readonly Entry[]; today: string; energy: Readonly<Record<string, {energy: number}>>; moods: Readonly<Record<string, number>>; /** Session AV lane 2 (r6-notes; LEDGER #403): a day chosen on the journal calendar. */ picked?: string | null}) {
  const moodLook = useMoodLook(); // Session AV lane 2 (LEDGER #178): your own mood words, else ZIGoals'
  const display = useDeviceRecord(JOURNAL_DISPLAY);
  const [open, setOpen] = useState<string | null>(null), [note, setNote] = useState('');
  // Session AV lane 2 (r6-notes; LEDGER #403, Diarium): any day's date in earlier years — the arrows move a day, and a day
  // chosen on the journal calendar opens here too. Today keeps its week and month ago as before.
  const [day, setDay] = useState(today), other = day !== today;
  // Review b6n B6N-4: on a day with no memory, "On this day for another date" opens the panel with its arrows, so any
  // day is reachable; it stays open (Back to today included) until the page is left.
  const [browsing, setBrowsing] = useState(false);
  useEffect(() => { setDay(picked && picked !== today ? picked : today); }, [picked, today]);
  const items = useMemo(() => other ? onDate(entries, day, today, {hidden: display.data.hidden ?? []}) : throwbacks(entries, today, {hidden: display.data.hidden ?? []}), [entries, day, other, today, display.data.hidden]);
  const change = (fn: Parameters<typeof display.update>[0], said: string) => { try { display.update(fn); setNote(said); } catch { setNote('This choice could not be kept on this device.'); } };
  if (!display.loaded) return null;
  if (!onThisDayShown(display.data)) return note ? <p className="fine on-this-day-note" role="status">{note}</p> : null;
  const view = onThisDayView(items.length, other, browsing);
  if (view === 'entry') return <>
    {note && <p className="fine on-this-day-note" role="status">{note}</p>}
    <p className="on-this-day-another"><button type="button" className="text-link" onClick={() => { setBrowsing(true); requestAnimationFrame(() => document.querySelector<HTMLElement>('.on-this-day-days button')?.focus()); }}>On this day for another date</button> <span className="fine">· nothing from earlier years today</span></p>
  </>;
  const move = (by: number) => setDay(d => addLocalDays(d, by));
  return <details className="panel on-this-day" open>
    <summary><span className="on-this-day-title">{other ? `On ${formatDate(day, {year: false})}` : 'On this day'}</span> <span className="fine">· {items.length ? `${items[0]!.label.toLowerCase()}${items.length > 1 ? ` and ${items.length - 1} more` : ''}` : 'nothing in earlier years'}</span></summary>
    <div className="on-this-day-days" role="group" aria-label="Another day">
      <button type="button" className="quiet" aria-label={`The day before: ${formatDate(addLocalDays(day, -1), {weekday: true, year: false})}`} onClick={() => move(-1)}>←</button>
      <p className="fine" aria-live="polite">{other ? `${formatDate(day, {weekday: true, year: false})} in earlier years` : 'Today in earlier years, a month and a week ago'}</p>
      <button type="button" className="quiet" aria-label={`The day after: ${formatDate(addLocalDays(day, 1), {weekday: true, year: false})}`} onClick={() => move(1)}>→</button>
      {other && <button type="button" className="text-link" onClick={() => setDay(today)}>Back to today</button>}
    </div>
    {!items.length && <p className="fine">Nothing written on {formatDate(day, {year: false})} in the years before. Move a day, or choose one on the calendar under Search by date.</p>}
    <ol className="on-this-day-list">{items.map(({entry, label}) => {
      const short = preview(entry.text), full = open === entry.id, e = energy[entry.date]?.energy, m = moods[entry.date];
      const words = [e ? `Energy: ${ENERGY_WORDS.en[e - 1]}` : null, m ? `Mood: ${moodLook.words[m - 1]}` : null].filter(Boolean).join(' · ');
      return <li key={entry.id}>
        <p className="eyebrow">{label} · {formatDate(entry.date)}</p>
        <p className="on-this-day-text" id={`on-this-day-${entry.id}`}>{full ? entry.text : short.text}</p>
        {words && <p className="fine">{words}</p>}
        <div className="on-this-day-actions">
          {short.more && <button type="button" className="text-link" aria-expanded={full} aria-controls={`on-this-day-${entry.id}`} onClick={() => setOpen(full ? null : entry.id)}>{full ? 'Show less' : 'Read it all'}</button>}
          {/* Security review F10 (R1-F9): past 500 nothing is un-hidden; the person is told instead. */}
          <button type="button" className="text-link" onClick={() => { const ids = entries.map(x => x.id); if (hideMemoryFull(display.data, entry.id, ids)) setNote(HIDE_FULL_NOTE); else change(d => hideMemory(d, entry.id, ids), 'Set aside: it will not show here again. The entry stays in your journal.'); }}>Not this one</button>
        </div>
      </li>;
    })}</ol>
    <p className="on-this-day-actions"><button type="button" className="text-link" onClick={() => change(d => setOnThisDay(d, false), '“On this day” is hidden. Turn it back on under Privacy.')}>Hide “On this day”</button></p>
    {note && <p className="fine" role="status">{note}</p>}
  </details>;
}
