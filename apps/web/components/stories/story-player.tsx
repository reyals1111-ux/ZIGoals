'use client';
import {useCallback, useEffect, useRef, useState, type KeyboardEvent} from 'react';
import {createPortal} from 'react-dom';
import {NebulaFlow} from '../nebula-flow';
import {drawShareCard, shareOrSave} from '../../lib/share-image';
import type {Story, StoryCard} from '../../lib/stories/build';
import type {StoryPillar} from '../../lib/stories/days';

/**
 * The Stories player (Session AF, L5b; P9.3, ADR-028 H55, H78): one card at a time, full screen, with a progress strip.
 * Tap the right or left side, use Next and Previous, or ← / → to move; Escape or Close leaves. It never advances by
 * itself (no timer to catch up with, nothing that loops). Each card comes in once — a short slide and fade, 400 ms —
 * and is a still under reduced motion and Motion Off. Every card has its own Share: the image is drawn on this device
 * from exactly the card's words (counts only) and handed to the share sheet or saved.
 */
const ACCENT: Record<StoryPillar, readonly [string, string, string]> = {
  habits: ['#23eaff', '#8fa6ff', '#c790f6'], health: ['#ff74be', '#c790f6', '#8fa6ff'],
  goals: ['#9273ff', '#c790f6', '#f08bd6'], wealth: ['#ffd27a', '#f08bd6', '#c790f6'],
};
export function StoryPlayer({story, title, onClose}: {story: Story; title: string; onClose: () => void}) {
  const [index, setIndex] = useState(0), [busy, setBusy] = useState(false), [note, setNote] = useState('');
  const card = story.cards[index]!, last = index === story.cards.length - 1;
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => { region.current?.focus(); }, []);
  useEffect(() => {
    const before = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = before; };
  }, []);
  const go = useCallback((delta: number) => { setNote(''); setIndex(i => Math.min(story.cards.length - 1, Math.max(0, i + delta))); }, [story.cards.length]);
  const next = () => { if (last) onClose(); else go(1); };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };
  const share = async (c: StoryCard) => {
    setBusy(true);
    try {
      const blob = await drawShareCard({eyebrow: c.eyebrow, title: c.big && c.id !== 'opener' ? `${c.big} · ${c.title}` : c.title, lines: c.lines, footer: 'Made on this device with ZIGoals', accent: c.pillar ? ACCENT[c.pillar] : undefined});
      const how = await shareOrSave(blob, `story-${story.key.replace(':', '-')}-${c.id}.png`, title);
      setNote(how === 'shared' ? 'Shared.' : 'Image saved.');
    } catch { setNote('The image could not be made on this device.'); } finally { setBusy(false); }
  };
  // On document.body: the page's own layers (the phone's top and tab bars) never cover the story.
  return createPortal(<div className="story-player" role="dialog" aria-modal="true" aria-label={title} onKeyDown={keys}>
    <div className="story-frame">
      <div className="story-top">
        <ol className="story-progress" aria-label={`Card ${index + 1} of ${story.cards.length}`}>{story.cards.map((c, i) => <li key={c.id} data-state={i < index ? 'seen' : i === index ? 'current' : 'ahead'} />)}</ol>
        <button type="button" className="story-close" onClick={onClose} aria-label={`Close ${title}`}>×</button>
      </div>
      <div ref={region} className="story-stage" tabIndex={-1} aria-live="polite">
        <button type="button" className="story-zone is-back" tabIndex={-1} aria-hidden="true" disabled={index === 0} onClick={() => go(-1)} />
        <section key={card.id} className="story-card" data-card={card.id} data-pillar={card.pillar ?? undefined} aria-labelledby={`story-card-${card.id}`}>
          <p className="eyebrow">{card.eyebrow}</p>
          {card.big && <p className="story-big" aria-hidden="true">{card.big}</p>}
          <h2 id={`story-card-${card.id}`}><NebulaFlow identity={`story:${story.key}:${card.id}`}>{card.title}</NebulaFlow></h2>
          <ul className="story-lines">{card.lines.map(l => <li key={l}>{l}</li>)}</ul>
          <button type="button" className="secondary story-share" disabled={busy} onClick={() => void share(card)} aria-label={`Share this card as an image: ${card.title}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
            Share
          </button>
        </section>
        <button type="button" className="story-zone is-next" tabIndex={-1} aria-hidden="true" onClick={next} />
      </div>
      <div className="story-controls">
        <button type="button" className="secondary" disabled={index === 0} onClick={() => go(-1)}>Previous</button>
        <button type="button" className="primary" onClick={next}>{last ? 'Done' : 'Next'}</button>
      </div>
      <p className="story-note" role="status">{note}</p>
      <p className="fine story-fine">Made on this device from your own records. Shared images show counts only: no amounts, prices or returns.</p>
    </div>
  </div>, document.body);
}
