'use client';
import Link from 'next/link';
import {useRef, useState} from 'react';
import {PageHeader} from '../page-header';
import {OrbitArt} from '../header-art/orbit-art';
import {ReviewGlyph} from '../header-art/glyphs/review';
import {formatDate, formatNumber} from '../../lib/visual-format';
import type {EnginePeriod} from '../../lib/life-review/engine';
import {STORY_MIN_DAYS} from '../../lib/stories/days';
import {STORY_PERIODS, rangeLabel, useStories} from './use-stories';
import {StoryPlayer} from './story-player';
import './stories.css';

/**
 * /app/stories (Session AF, L5b; P9.3, ADR-028 H78): the week, the month and the year as tap-through stories, built on
 * the Life review's engine (the Life review stays where it is). Each cover says how many days the story is made of and
 * when it was last opened; Open is the person's own choice and the one thing written (`zigoals:stories:v1`). Viewing
 * writes nothing.
 */
const NAME: Record<EnginePeriod, string> = {week: 'Your week', month: 'Your month', year: 'Your year'};
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
export function StoriesPage() {
  const {loaded, failed, stories, seen, opened, today} = useStories();
  const [open, setOpen] = useState<EnginePeriod | null>(null), [note, setNote] = useState('');
  const openers = useRef<Partial<Record<EnginePeriod, HTMLButtonElement | null>>>({});
  const start = (period: EnginePeriod) => {
    const story = stories?.[period]; if (!story) return;
    setNote('');
    try { opened(story.key); } catch { setNote('Opened. Which stories you opened could not be remembered on this device.'); }
    setOpen(period);
  };
  const close = () => { const p = open; setOpen(null); if (p) queueMicrotask(() => openers.current[p]?.focus()); };
  return <div className="stories-page" data-stories={!loaded ? 'loading' : 'ready'}>
    <PageHeader className="page-heading stories-hero" titleId="stories-title" eyebrow="Stories" title="Your week, month and year, told back to you"
      lede="A few cards from your own records: streaks, your best day, goals that moved, Health beside the time before, money working. Tap through, and share any card as an image made on this device."
      actions={<p className="stories-links"><Link className="text-link" href="/app/review">The Life review →</Link></p>}
      art={<OrbitArt glyph={ReviewGlyph} spin={22} />} />
    {!loaded ? <div className="stories-skeleton aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : failed || !stories ? <p role="status">Some of your records could not be read on this device, so your stories wait until they can.</p> : <>
      <ul className="stories-covers" aria-label="Your stories">{STORY_PERIODS.map(period => {
        const s = stories[period], when = seen[s.key];
        return <li key={period} className="panel stories-cover" data-period={period} data-ready={s.enough || undefined} data-pillar={s.style?.pillar ?? undefined}>
          <p className="eyebrow">{rangeLabel(s.start, s.end, period)}</p>
          <h2>{NAME[period]}</h2>
          <p className="stories-count">{s.enough ? `${plural(s.loggedDays, 'logged day')} · ${plural(s.cards.length, 'card')}` : `${plural(s.loggedDays, 'logged day')} of the ${STORY_MIN_DAYS} a story needs`}</p>
          {s.style && <p className="stories-style">Your style: {s.style.label}</p>}
          <button type="button" className={s.enough ? 'primary' : 'secondary'} ref={el => { openers.current[period] = el; }} onClick={() => start(period)} aria-label={`Open ${NAME[period].toLowerCase()}’s story`}>Open the story</button>
          <p className="fine">{when ? `Opened ${when === today ? 'today' : formatDate(when, {year: false})}.` : 'Not opened yet.'}</p>
        </li>;
      })}</ul>
      {note && <p role="status" className="fine">{note}</p>}
      <p className="fine stories-fine">Stories are drawn from your records each time you open one; nothing about them leaves this device. A week’s story follows the last seven days, a month’s and a year’s grow until they end.</p>
      {open && <StoryPlayer story={stories[open]} title={`${NAME[open]}’s story`} onClose={close} />}
    </>}
  </div>;
}
export default StoriesPage;
