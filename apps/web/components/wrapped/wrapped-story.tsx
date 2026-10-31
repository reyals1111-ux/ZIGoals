'use client';
import {useCallback, useEffect, useRef, useState, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {NebulaFlow} from '../nebula-flow';
import {useDeviceRecord} from '../ai/use-device-record';
import {WRAPPED, markWrappedOpened} from '../../lib/wrapped/store';
import {wrappedShareCard} from '../../lib/wrapped/share';
import type {Wrapped, WrappedCard} from '../../lib/wrapped/build';
import {useWrapped} from './use-wrapped';
import '../stories/stories.css';
import './wrapped.css';

/**
 * ZIGoals Wrapped's story (Session AK, F5d), loaded only when the person opens it: one card at a time over the page, a
 * stepper, never autoplay — Next and Previous, ← / →, Escape or Close. A card comes in with Stories' one short entrance,
 * a still under reduced motion and Motion Off (Stories' own rules). Sensitive numbers (money put in, average sleep and
 * steps) are hidden until the person shows them, and leave the device on a share image only with "Include numbers"
 * ticked for that share — off every time the story opens. Opening it is the one write: the day, so Today's card rests.
 */
export default function WrappedStory({onClose}: {onClose: () => void}) {
  const {loaded, failed, wrapped, today} = useWrapped(), record = useDeviceRecord(WRAPPED), marked = useRef(false);
  useEffect(() => {
    if (!wrapped || !record.loaded || marked.current) return;
    marked.current = true;
    try { record.update(r => markWrappedOpened(r, wrapped.year, today)); } catch { /* opened all the same; Today's card may show again */ }
  }, [wrapped, record, today]);
  return createPortal(<div className="story-player wrapped-player" role="dialog" aria-modal="true" aria-label={wrapped ? `ZIGoals Wrapped ${wrapped.year}` : 'ZIGoals Wrapped'}>
    {!loaded ? <p className="story-note" role="status">Gathering your year…</p>
      : failed || !wrapped ? <div className="story-frame wrapped-fallback"><p className="story-note" role="status">Some of your records could not be read on this device, so your Wrapped waits until they can.</p><button type="button" className="primary" onClick={onClose}>Close</button></div>
      : <WrappedPlayer wrapped={wrapped} onClose={onClose} />}
  </div>, document.body);
}

function WrappedPlayer({wrapped, onClose}: {wrapped: Wrapped; onClose: () => void}) {
  const [index, setIndex] = useState(0), [showNumbers, setShowNumbers] = useState(false), [includeNumbers, setInclude] = useState(false), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const card = wrapped.cards[index]!, last = index === wrapped.cards.length - 1, region = useRef<HTMLDivElement>(null);
  const title = `ZIGoals Wrapped ${wrapped.year}`;
  useEffect(() => { region.current?.focus(); }, []);
  useEffect(() => { const before = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = before; }; }, []);
  const go = useCallback((delta: number) => { setNote(''); setShowNumbers(false); setInclude(false); setIndex(i => Math.min(wrapped.cards.length - 1, Math.max(0, i + delta))); }, [wrapped.cards.length]);
  const next = () => { if (last) onClose(); else go(1); };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  const share = async (c: WrappedCard) => {
    setBusy(true);
    try {
      const spec = wrappedShareCard(wrapped, c, {sensitive: includeNumbers});
      const {drawShareCard, shareOrSave} = await import('../../lib/share-image');
      const how = await shareOrSave(await drawShareCard(spec), spec.fileName, title);
      setNote(how === 'shared' ? 'Shared.' : 'Image saved.');
    } catch { setNote('The image could not be made on this device.'); } finally { setBusy(false); }
  };
  return <div className="story-frame" onKeyDown={keys}>
    <div className="story-top">
      <ol className="story-progress" aria-label={`Card ${index + 1} of ${wrapped.cards.length}`}>{wrapped.cards.map((c, i) => <li key={c.id} data-state={i < index ? 'seen' : i === index ? 'current' : 'ahead'} />)}</ol>
      <button type="button" className="story-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
    </div>
    <div ref={region} className="story-stage" tabIndex={-1} aria-live="polite">
      <section key={card.id} className="story-card wrapped-card" data-card={card.id} data-pillar={card.pillar ?? undefined} aria-labelledby={`wrapped-card-${card.id}`}>
        <p className="eyebrow">{card.eyebrow}</p>
        {card.big && <p className="story-big" aria-hidden="true">{card.big}</p>}
        <h2 id={`wrapped-card-${card.id}`}><NebulaFlow identity={`wrapped:${wrapped.year}:${card.id}`}>{card.title}</NebulaFlow></h2>
        <ul className="story-lines">{card.lines.map(l => <li key={l}>{l}</li>)}{showNumbers && card.numbers.map(l => <li key={`n:${l}`} className="wrapped-number">{l}</li>)}</ul>
        {card.numbers.length > 0 && <button type="button" className="quiet wrapped-reveal" aria-pressed={showNumbers} onClick={() => setShowNumbers(v => !v)}>{showNumbers ? 'Hide the numbers' : 'Show the numbers'}</button>}
        <div className="wrapped-share">
          {card.numbers.length > 0 && <label className="wrapped-include"><input type="checkbox" checked={includeNumbers} onChange={e => setInclude(e.target.checked)} /><span>Include numbers in the image</span></label>}
          <button type="button" className="secondary story-share" disabled={busy} onClick={() => void share(card)} aria-label={`Share this card as an image: ${card.title}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            Share
          </button>
        </div>
      </section>
    </div>
    <div className="story-controls">
      <button type="button" className="secondary" disabled={index === 0} onClick={() => go(-1)}>Previous</button>
      <button type="button" className="primary" onClick={next}>{last ? 'Done' : 'Next'}</button>
    </div>
    <p className="story-note" role="status">{note}</p>
    <p className="fine story-fine">{wrapped.example ? 'Example: made from the Showcase’s fictional records. ' : 'Made on this device from your own records. '}Shared images show counts only unless you include the numbers.</p>
  </div>;
}
