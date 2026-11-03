'use client';
import {useMemo, useState} from 'react';
import {ENERGY_WORDS} from '../../lib/energy/schema';
import {MOOD_WORDS} from '../../lib/wrap-up/engine';
import {formatDate} from '../../lib/visual-format';
import {onThisDay, preview} from '../../lib/on-this-day/on-this-day';
import {HIDE_FULL_NOTE, JOURNAL_DISPLAY, hideMemory, hideMemoryFull, onThisDayShown, setOnThisDay} from '../../lib/on-this-day/store';
import {useDeviceRecord} from '../ai/use-device-record';
import './on-this-day.css';

type Entry = {id: string; date: string; text: string};

/**
 * Session AK (BUILD list 2 #3): "On this day" at the top of the Journal — what the person wrote on this date in earlier
 * years (or about a month ago), with the day's energy and mood words when they were rated. Collapsible; away when
 * nothing matches or when the person hid it. "Not this one" sets one memory aside for good; the entry itself stays.
 * Loaded on its own after the Journal page; reads only, writes only the display key on the person's choice.
 */
export default function OnThisDay({entries, today, energy, moods}: {entries: readonly Entry[]; today: string; energy: Readonly<Record<string, {energy: number}>>; moods: Readonly<Record<string, number>>}) {
  const display = useDeviceRecord(JOURNAL_DISPLAY);
  const [open, setOpen] = useState<string | null>(null), [note, setNote] = useState('');
  const items = useMemo(() => onThisDay(entries, today, {hidden: display.data.hidden ?? []}), [entries, today, display.data.hidden]);
  const change = (fn: Parameters<typeof display.update>[0], said: string) => { try { display.update(fn); setNote(said); } catch { setNote('This choice could not be kept on this device.'); } };
  if (!display.loaded) return null;
  if (!onThisDayShown(display.data)) return note ? <p className="fine on-this-day-note" role="status">{note}</p> : null;
  if (!items.length) return note ? <p className="fine on-this-day-note" role="status">{note}</p> : null;
  return <details className="panel on-this-day" open>
    <summary><span className="on-this-day-title">On this day</span> <span className="fine">· {items[0]!.label.toLowerCase()}{items.length > 1 ? ` and ${items.length - 1} more` : ''}</span></summary>
    <ol className="on-this-day-list">{items.map(({entry, label}) => {
      const short = preview(entry.text), full = open === entry.id, e = energy[entry.date]?.energy, m = moods[entry.date];
      const words = [e ? `Energy: ${ENERGY_WORDS.en[e - 1]}` : null, m ? `Mood: ${MOOD_WORDS[m - 1]}` : null].filter(Boolean).join(' · ');
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
