'use client';
import {useEffect, useId, useMemo, useState} from 'react';
import type {Journal} from '../../lib/journal/schema';
import type {BookChoice} from '../../lib/journal/books';
import {dayStrip, stripCount, stripMonths, type StripDay} from '../../lib/journal/day-photo';
import {getJournalMedia} from '../../lib/journal/media';
import {photoScope} from '../../lib/health-aa/photos';
import {formatDate, formatMonth} from '../../lib/visual-format';

/**
 * Session AW (x3; LEDGER #445, The Five Minute Journal's photo of the day): "A photo a day" inside Journal → Photos and
 * voice notes — one month's days as a strip of their photos of the day (the one marked "Photo of the day" on an entry,
 * else the day's first photo), paged by month, each opening that day's entries. A day without a photo is left blank and
 * never counted as missed. Letters still folded away and the journals not chosen stay out, as the grid above leaves
 * them out. Read from this device's journal media store; nothing moves (no animation).
 */
function Cell({day, onOpen}: {day: StripDay; onOpen: (day: string) => void}) {
  const [url, setUrl] = useState<string | null | undefined>(undefined), n = Number(day.date.slice(8));
  const mediaId = day.photo?.mediaId;
  useEffect(() => {
    if (!mediaId) return;
    let live = true, made: string | null = null;
    void getJournalMedia(photoScope(), mediaId).then(m => { if (!live) return; if (m && m.kind === 'photo') { made = URL.createObjectURL(m.blob); setUrl(made); } else setUrl(null); }, () => { if (live) setUrl(null); });
    return () => { live = false; if (made) URL.revokeObjectURL(made); };
  }, [mediaId]);
  const words = formatDate(day.date, {weekday: true, year: false});
  if (!day.photo) return <li className={`journal-day-strip-cell is-blank${day.future ? ' is-future' : ''}`}><span aria-hidden="true">{n}</span><span className="sr-only">{words}</span></li>;
  return <li className="journal-day-strip-cell">
    <button type="button" className="journal-day-strip-open" aria-label={`Photo of the day, ${words}: open that day’s entries`} onClick={() => onOpen(day.date)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a local blob of the person's own photo */}
      {url ? <img src={url} alt="" loading="lazy"/> : <span className="fine" aria-hidden="true">{url === null ? '—' : '…'}</span>}
      <span className="journal-day-strip-n" aria-hidden="true">{n}</span>
    </button>
  </li>;
}
export default function DayStrip({journal, today, book, onOpen}: {journal: Journal; today: string; book: BookChoice; onOpen: (day: string) => void}) {
  const id = useId(), months = useMemo(() => stripMonths(journal, today, book), [journal, today, book]);
  const [month, setMonth] = useState(today.slice(0, 7)), shown = months.includes(month) ? month : months.at(-1)!;
  const strip = useMemo(() => dayStrip(journal, today, shown, book), [journal, today, shown, book]), {withPhoto} = stripCount(strip);
  const at = months.indexOf(shown), prev = at > 0 ? months[at - 1]! : null, next = at < months.length - 1 ? months[at + 1]! : null;
  const name = formatMonth(shown);
  return <section className="journal-day-strip" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>A photo a day</h3>
    <div className="journal-day-strip-nav">
      <button type="button" className="quiet" disabled={!prev} aria-label={prev ? `The month before: ${formatMonth(prev)}` : 'The month before (no photos before this month)'} onClick={() => prev && setMonth(prev)}><span aria-hidden="true">←</span></button>
      <strong className="journal-day-strip-month">{name}</strong>
      <button type="button" className="quiet" disabled={!next} aria-label={next ? `The month after: ${formatMonth(next)}` : 'The month after (this is the latest month)'} onClick={() => next && setMonth(next)}><span aria-hidden="true">→</span></button>
    </div>
    <p className="fine" role="status">{withPhoto ? `A photo on ${withPhoto === 1 ? '1 day' : `${withPhoto} days`} of ${name}. A day without one stays blank.` : `No photo in ${name} yet. Add a photo to an entry under Write; the day's first photo stands for it, or press Photo of the day on the one you like best.`}</p>
    <ol className="journal-day-strip-days" aria-label={`A photo a day, ${name}`}>{strip.map(d => <Cell key={d.date} day={d} onOpen={onOpen}/>)}</ol>
  </section>;
}
