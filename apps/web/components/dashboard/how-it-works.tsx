'use client';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {AppIcon} from '../app-icon';
import {BullGlyph, ButterflyGlyph, HeartGlyph, LotusGlyph} from '../footer/pillar-glyphs';
import {IntroVideo} from './intro-video';
import './how-it-works.css';

const STEPS = [
  {n: '01', title: 'Goals', glyph: <LotusGlyph size={28}/>, body: 'Name what matters and give it a target: a sum, a date, or milestones.', how: 'Goals → + Create a goal. Pick a life area, write why, and link the wealth that funds it.', href: '/app/goals/new', cta: 'Create a goal'},
  {n: '02', title: 'Habits & Health', glyph: <><ButterflyGlyph size={28}/><HeartGlyph size={22}/></>, body: 'Take a small step each day and let the pattern build.', how: 'Habits → + New habit, then −/+ and Done on the card. Health → Log food or water, a weight, a night of sleep.', href: '/app/habits', cta: 'Open Habits'},
  {n: '03', title: '= Wealth', glyph: <BullGlyph size={28}/>, body: 'See everything you own and everything you are working toward in one view.', how: 'Wealth → + Add asset (cash, crypto, stocks, metals, property). Prices refresh on request; nothing moves and nothing is signed.', href: '/app/wealth', cta: 'Open Wealth'},
] as const;

/**
 * Session AB-Design (owner request 13, persona #21): "See how it works" opens a short how-to — the three steps of the
 * slogan with what to tap first — in place of the brand film, which stays one tap away inside ("Watch the film").
 */
export function HowItWorks() {
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLDialogElement>(null), [host, setHost] = useState<HTMLElement | null>(null), [open, setOpen] = useState(false), [mounted, setMounted] = useState(false);
  useEffect(() => setHost(document.body), []);
  // The dialog opens once its content is rendered, so focus lands on the first step's link, not on an empty dialog.
  useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); }, [open]);
  return <>
    <button ref={trigger} type="button" className="secondary" onClick={() => { setMounted(true); setOpen(true); }}><span className="play-medallion"><AppIcon name="play" luminous/></span> See how it works</button>
    {host && createPortal(<dialog ref={dialog} className="how-it-works-dialog" aria-labelledby="how-it-works-title" onClose={e => { if (e.target !== e.currentTarget) return; /* the film's own dialog closing inside must not close the how-to */ setOpen(false); trigger.current?.focus(); }} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
      {/* Mounted from the first open on (not only while open): the film's dialog inside keeps its paused, rewound video for the next open. */}
      {mounted && <div className="how-it-works-card">
        <div className="how-it-works-head"><div><p className="eyebrow">How it works</p><h2 id="how-it-works-title">Goals, Habits &amp; Health = Wealth</h2><p>Three steps, your pace. Everything stays private in this browser.</p></div><button type="button" className="quiet" aria-label="Close how it works" onClick={() => dialog.current?.close()}>×</button></div>
        <ol className="how-it-works-steps">
          {STEPS.map(s => <li key={s.n}>
            <span className="how-it-works-node" aria-hidden="true"><span className="how-it-works-glyph">{s.glyph}</span><span className="how-it-works-n">{s.n}</span></span>
            <div><strong>{s.title}</strong><p>{s.body}</p><p className="how-it-works-how">{s.how}</p><Link className="text-link" href={s.href} onClick={() => dialog.current?.close()}>{s.cta} →</Link></div>
          </li>)}
        </ol>
        <div className="how-it-works-foot"><IntroVideo label="Watch the film (16 s)"/><p className="fine">Practice money with no real value · nothing is placed onchain · browser storage is not a backup.</p></div>
      </div>}
    </dialog>, host)}
  </>;
}
