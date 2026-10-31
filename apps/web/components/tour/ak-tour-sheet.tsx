'use client';
import Link from 'next/link';
import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {AK_TOUR, AK_TOUR_LENGTH, AK_TOUR_STOPS, finished, leftFrom, movedTo, openedAt, startStep} from '../../lib/tour/ak-tour';

/**
 * Session AK (A19): the "New in ZIGoals" tour, opened in place by TourOffer. One stop at a time: a title, one sentence and
 * "Show me" (a plain link to the feature). Back, Next and Finish move through it; Escape or "Close the tour" closes it and
 * focus returns to the button. It is part of the page, not a dialog: nothing behind it is covered or blocked, and there
 * is no motion at all, so reduced motion and Motion Off need nothing special.
 *
 * Opening it marks this device as having seen it (`seenAt` in `zigoals:ak-tour:v1`) and remembers the stop, so it opens
 * where the person left it; Finish starts it from the first stop next time. A refused write changes nothing on screen.
 */
export default function AkTourSheet({onClose}: {onClose: () => void}) {
  const tour = useDeviceRecord(AK_TOUR), id = useId(), heading = useRef<HTMLHeadingElement>(null), forward = useRef<HTMLButtonElement>(null);
  const [chosen, setChosen] = useState<number | null>(null);
  const opened = useRef(false);
  const step = chosen ?? startStep(tour.data), stop = AK_TOUR_STOPS[step]!, last = step === AK_TOUR_LENGTH - 1;
  const save = (change: Parameters<typeof tour.update>[0]) => { try { tour.update(change); } catch { /* a display mark: the tour works without it */ } };
  useEffect(() => {
    if (!tour.loaded || opened.current) return;
    opened.current = true;
    const at = startStep(tour.data);
    if (!tour.unreadable) save(t => openedAt(t, new Date().toISOString(), at));
    heading.current?.focus({preventScroll: true});
    heading.current?.scrollIntoView?.({block: 'nearest'});
    // Runs once, when the record is first read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour.loaded]);
  const go = (next: number) => {
    setChosen(next);
    if (!tour.unreadable) save(t => movedTo(t, next));
    // Back is disabled at the first stop, so focus moves to Next instead of falling to the page.
    if (next === 0) requestAnimationFrame(() => forward.current?.focus());
  };
  const finish = () => { if (!tour.unreadable) save(finished); onClose(); };
  const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
  if (!tour.loaded) return <p className="fine" role="status">Opening the tour…</p>;
  return <section className="ak-tour" aria-labelledby={`${id}-title`} onKeyDown={onKeyDown}>
    <div className="ak-tour-head">
      <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>New in ZIGoals</h3>
      <button type="button" className="quiet" onClick={onClose}>Close the tour</button>
    </div>
    <div className="ak-tour-stop" aria-live="polite" aria-atomic="true">
      <p className="fine ak-tour-count">Stop {step + 1} of {AK_TOUR_LENGTH}</p>
      <h4>{stop.title}</h4>
      <p>{stop.text}</p>
    </div>
    <div className="ak-tour-show"><Link className="text-link" href={stop.href} onClick={() => { if (!tour.unreadable) save(t => leftFrom(t, step)); }}>Show me in {stop.where}</Link></div>
    <div className="ak-tour-nav">
      <button type="button" className="secondary" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
      {/* One button that reads Next or Finish, so focus stays on it at the last stop. */}
      <button ref={forward} type="button" className="primary" onClick={() => last ? finish() : go(step + 1)}>{last ? 'Finish' : 'Next'}</button>
    </div>
  </section>;
}
