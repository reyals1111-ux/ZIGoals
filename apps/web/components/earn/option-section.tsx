'use client';
import type {ReactNode} from 'react';
import Image from 'next/image';
import {NebulaFlow} from '../nebula-flow';

/**
 * Session AF (L1, ADR-028 H84): one earning option, always in the same order of parts, so options can be compared side
 * by side without ZIGoals ranking them: the one-sentence summary and "best for", who runs it, its live/beta state and
 * who holds the funds, the live numbers, fees, lockups and minimums, risks with their sources, who can use it, and the
 * numbered steps of what the person will do on the app's own site.
 *
 * Session AF chunk 2: a `notice` (a closure, a wind-down, a pause, with its source and date) is read before anything
 * else; the steps say how long they take; `illustration` is the redrawn "what you'll see" of the app's page (lazy).
 */
export type Tag = {tone: 'live' | 'beta' | 'paused' | 'keys' | 'contract' | 'third'; text: string};
export function OptionSection({id, eyebrow, title, lede, logo, tags, facts, figures, figuresNote, columns, steps, stepsTitle = 'What you’ll do there', stepsTime, notice, illustration, actions, children}: {
  id: string; eyebrow: string; title: string; lede: ReactNode; logo: {src?: string; alt: string; glyph?: ReactNode};
  tags: Tag[]; facts: {label: string; value: ReactNode}[]; figures: ReactNode; figuresNote?: ReactNode;
  columns: {title: string; body: ReactNode}[]; steps: {text: ReactNode; sign?: ReactNode}[]; stepsTitle?: string; actions: ReactNode; children?: ReactNode;
  /** Session AF chunk 2: how long the steps take, in plain words. */
  stepsTime?: ReactNode;
  /** Session AF chunk 2: a fact to read before anything else (a closure, a wind-down, a pause), with its source and date. */
  notice?: ReactNode;
  /** Session AF chunk 2: the redrawn "what you'll see" screens of the app's own page (a lazy chunk per app). */
  illustration?: ReactNode;
}) {
  return <section id={id} className="earn-option panel" aria-labelledby={`${id}-title`} data-option={id}>
    <header className="earn-option-head">
      <span className="earn-medallion" aria-hidden={logo.src ? undefined : true}>{logo.src ? <Image src={logo.src} alt={logo.alt} width={56} height={56} loading="lazy" unoptimized/> : logo.glyph}</span>
      <div className="earn-option-title">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-title`}><NebulaFlow identity={`earn-${id}-title`}>{title}</NebulaFlow></h2>
        <p className="earn-option-lede">{lede}</p>
        <ul className="earn-tags" aria-label="At a glance">{tags.map(t => <li key={t.text} className="earn-tag" data-tone={t.tone}>{t.text}</li>)}</ul>
      </div>
    </header>
    {notice && <div className="earn-notice" role="note" data-notice={id}>{notice}</div>}
    <dl className="earn-facts">{facts.map(f => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
    <div className="earn-live">
      <h3 className="earn-subhead">Live numbers</h3>
      <dl className="earn-figures">{figures}</dl>
      {figuresNote && <div className="earn-figures-note">{figuresNote}</div>}
    </div>
    <div className="earn-columns">{columns.map(c => <div key={c.title} className="earn-column"><h3 className="earn-subhead">{c.title}</h3>{c.body}</div>)}</div>
    {children}
    <div className="earn-steps">
      <h3 className="earn-subhead">{stepsTitle}</h3>
      <ol>{steps.map((s, i) => <li key={i}><span className="earn-step-n" aria-hidden="true">{i + 1}</span><div><p>{s.text}</p>{s.sign && <p className="earn-step-sign"><b>What you sign:</b> {s.sign}</p>}</div></li>)}</ol>
      {stepsTime && <p className="earn-steps-time fine"><b>How long:</b> {stepsTime}</p>}
    </div>
    {illustration}
    <div className="earn-option-actions">{actions}</div>
  </section>;
}
