'use client';
import Link from 'next/link';
import {useMemo, useRef, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {formatDate} from '../../lib/visual-format';
import {localDate} from '../../lib/local-date';
import {type Note} from '../../lib/notes/schema';
import {NOTE_CARDS, NEW_CARDS_A_DAY, RATINGS, allCards, daysFor, dueToday, rateCard, type Rating} from '../../lib/notes/cards';
import {noteHref} from '../../lib/notes/links';

/**
 * Session AV lane 2 (r5-notes; LEDGER #365, Logseq's flashcards): Notes → Notes → Review cards (lazy, loaded when its fold
 * opens). The cards due today one at a time: the question, Show the answer, then Again, Hard, Good or Easy, each saying
 * when the card comes back. Plain words: no streak, no score, nothing "missed"; Stop for now at any time. The review days
 * are kept on this device (`zigoals:note-cards:v1`); a card from a locked or archived note is never shown.
 */
const WORDS: Record<Rating, string> = {again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy'};
const when = (days: number) => days <= 1 ? 'tomorrow' : `in ${days} days`;
export default function NotesCards({notes}: {notes: readonly Note[]}) {
  const record = useDeviceRecord(NOTE_CARDS), today = localDate();
  const cards = useMemo(() => allCards(notes), [notes]);
  // The cards of this sitting are fixed when it starts, so a rating never reshuffles what is on screen.
  const [sitting, setSitting] = useState<string[] | null>(null), [at, setAt] = useState(0), [shown, setShown] = useState(false), [said, setSaid] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const focusCard = () => requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('.note-card-face')?.focus());
  if (!record.loaded) return <p className="fine">Opening…</p>;
  if (record.unreadable) return <p role="alert">The review days on this device could not be read; they are not written over.</p>;
  const plan = dueToday(cards, record.data, today), byId = new Map(cards.map(c => [c.id, c]));
  if (!cards.length) return <div className="note-cards"><p className="fine">No cards yet. Write a line as <code>question :: answer</code> in any note (for example <code>hola :: hello</code>), or end a line with <code>#card</code> and put its answer on the indented lines under it. Each becomes a card here, shown again on a gentle schedule.</p></div>;
  const start = () => { setSitting(plan.due.map(c => c.id)); setAt(0); setShown(false); setSaid(''); focusCard(); };
  const list = sitting?.filter(id => byId.has(id)) ?? null, card = list ? byId.get(list[at] ?? '') : undefined;
  const rate = (r: Rating) => {
    if (!card) return;
    try { const prev = record.data.reviews.find(x => x.id === card.id); record.update(d => rateCard(d, card.id, r, today)); setSaid(`${WORDS[r]}: this card comes back ${when(daysFor(prev, r, today))}.`); }
    catch { setSaid('This could not be saved on this device.'); return; }
    setAt(i => i + 1); setShown(false); focusCard();
  };
  const next = plan.next ? formatDate(plan.next) : null;
  return <div className="note-cards" ref={box}>
    {!list ? <>
      <p>{plan.due.length ? `${plan.due.length} ${plan.due.length === 1 ? 'card' : 'cards'} to look at today` : 'Nothing to look at today.'} <span className="fine">· {cards.length} {cards.length === 1 ? 'card' : 'cards'} in your notes{next ? `; the next ones come back ${next}` : ''}</span></p>
      {plan.due.length > 0 && <button type="button" className="primary" onClick={start}>Review cards</button>}
      <p className="fine">New cards: at most {NEW_CARDS_A_DAY} a day, so a long list never piles up. The review days stay on this device.</p>
    </> : card ? <section className="note-card" aria-label={`Card ${at + 1} of ${list.length}`}>
      <p className="fine">Card {at + 1} of {list.length} · from <Link className="text-link" href={noteHref(card.noteId)}>{card.noteName}</Link></p>
      <div className="note-card-face" tabIndex={-1}>
        <p className="note-card-question"><span className="sr-only">Question: </span>{card.question}</p>
        {shown && <p className="note-card-answer"><span className="sr-only">Answer: </span>{card.answer.split('\n').map((l, i) => <span key={i}>{i > 0 && <br/>}{l}</span>)}</p>}
      </div>
      {!shown ? <div className="note-actions"><button type="button" className="secondary" onClick={() => { setShown(true); requestAnimationFrame(() => box.current?.querySelector<HTMLElement>('.note-card-rate button')?.focus()); }}>Show the answer</button>
        <button type="button" className="quiet" onClick={() => setSitting(null)}>Stop for now</button></div>
        : <div className="note-actions note-card-rate" role="group" aria-label="How well did you know it?">{RATINGS.map(r => { const prev = record.data.reviews.find(x => x.id === card.id); return <button key={r} type="button" className={r === 'good' ? 'primary' : 'secondary'} onClick={() => rate(r)}>{WORDS[r]} <span className="fine">· {when(daysFor(prev, r, today))}</span></button>; })}</div>}
    </section> : <div className="note-card-done">
      <p>That is all for today.{next ? ` The next cards come back ${next}.` : ''}</p>
      <button type="button" className="quiet" onClick={() => setSitting(null)}>Back</button>
    </div>}
    {said && <p className="fine" role="status">{said}</p>}
  </div>;
}
