'use client';
import type {ReactNode} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {HowRead} from './how-read';
import {usePhoneActive} from '../phone/use-phone-layout';
import type {GlanceTag} from '../../lib/earn/glance';

/**
 * Session AF (L1, ADR-028 H84): one earning option, always in the same order of parts, so options can be compared side
 * by side without ZIGoals ranking them: the one-sentence summary and "best for", who runs it, its live/beta state and
 * who holds the funds, the live numbers, fees, lockups and minimums, risks with their sources, who can use it, and the
 * numbered steps of what the person will do on the app's own site.
 *
 * Session AF chunk 2: a `notice` (a closure, a wind-down, a pause, with its source and date) is read before anything
 * else; the steps say how long they take; `illustration` is the redrawn "what you'll see" of the app's page (lazy).
 */
// (Session AL fifth pass, C-BN-07: the labels themselves live in lib/earn/glance.ts, shared with the comparison table.)
export type Tag = GlanceTag;
export function OptionSection({id, eyebrow, title, lede, logo, tags, facts, figures, figuresNote, mine, columns, steps, stepsTitle = 'What you’ll do there', stepsTime, stepsOpen = false, notice, illustration, actions, children}: {
  id: string; eyebrow: string; title: string; lede: ReactNode; logo: {src?: string; alt: string; glyph?: ReactNode};
  tags: Tag[]; facts: {label: string; value: ReactNode}[]; figures: ReactNode; figuresNote?: ReactNode;
  columns: {title: string; body: ReactNode}[]; steps: {text: ReactNode; sign?: ReactNode; how?: ReactNode}[]; stepsTitle?: string; actions: ReactNode; children?: ReactNode;
  /** Session AF chunk 2: how long the steps take, in plain words. */
  stepsTime?: ReactNode;
  /** Session AF chunk 2: a fact to read before anything else (a closure, a wind-down, a pause), with its source and date. */
  notice?: ReactNode;
  /** Session AF chunk 2: the redrawn "what you'll see" screens of the app's own page (a lazy chunk per app). */
  illustration?: ReactNode;
  /** Session AF (L1c, P1.23): the person's own position here, from the page's relay reads (nothing without a wallet). */
  mine?: ReactNode;
  /** Session AL fifth pass (N-BN-05): steps that stay open on a phone (Zignaly's "How to withdraw", a deadline). */
  stepsOpen?: boolean;
}) {
  // Session AL fifth pass (N-BN-05): on a phone the parts every option repeats in the same shape — its fees, lockups and
  // minimums, and the steps on the app's own site — fold to one row each, so Earn is shorter to scan; the risks, the
  // labels, the facts and the live numbers stay open. Nothing is removed; wider screens are as before.
  const phone = usePhoneActive();
  const column = (c: {title: string; body: ReactNode}) => <div key={c.title} className="earn-column"><h3 className="earn-subhead">{c.title}</h3>{c.body}</div>;
  const plain = columns.filter(c => c.title !== 'Risks'), risks = columns.filter(c => c.title === 'Risks');
  const plainNames = plain.map(c => c.title.toLowerCase()), plainLabel = plainNames.length > 1 ? `${plainNames.slice(0, -1).join(', ')} and ${plainNames.at(-1)}` : plainNames[0] ?? '';
  const stepList = <><ol>{steps.map((s, i) => <li key={i}><span className="earn-step-n" aria-hidden="true">{i + 1}</span><div><p>{s.text}</p>{s.sign && <p className="earn-step-sign"><b>What you sign:</b> {s.sign}</p>}{s.how && <HowRead>{s.how}</HowRead>}</div></li>)}</ol>
      {stepsTime && <p className="earn-steps-time fine"><b>How long:</b> {stepsTime}</p>}</>;
  return <section id={id} className="earn-option panel" aria-labelledby={`${id}-title`} data-option={id}>
    <header className="earn-option-head">
      <span className="earn-medallion" aria-hidden={logo.src ? undefined : true}>{logo.src ? <>{/* CI14 (weights): the same element next/image wrote for an unoptimized 56 px icon (its attributes, in its order), without the image component's code on the Earn page. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={logo.alt} loading="lazy" width={56} height={56} decoding="async" data-nimg="1" style={{color: 'transparent'}} src={logo.src}/></> : logo.glyph}</span>
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
    {mine}
    <div className="earn-columns">{phone && plain.length ? <details className="earn-more" data-earn-more="columns"><summary>{plainLabel.charAt(0).toUpperCase() + plainLabel.slice(1)}</summary>{plain.map(column)}</details> : plain.map(column)}{risks.map(column)}</div>
    {children}
    <div className="earn-steps">
      {phone && !stepsOpen ? <details className="earn-more" data-earn-more="steps"><summary>{stepsTitle} · {steps.length} {steps.length === 1 ? 'step' : 'steps'}</summary>{stepList}</details>
        : <><h3 className="earn-subhead">{stepsTitle}</h3>{stepList}</>}
    </div>
    {illustration}
    <div className="earn-option-actions">{actions}</div>
  </section>;
}
