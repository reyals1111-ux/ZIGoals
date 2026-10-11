'use client';
import type {ReactNode} from 'react';
import {NebulaFlow} from '../nebula-flow';

/**
 * The one section heading (Session AA-Cloud premium pass): a small eyebrow, a white title whose nebula colour flows from
 * its middle to its end (NebulaFlow, one sweep the first time it is seen, static under reduced motion and Motion Off),
 * an optional lede and an optional action on the right.
 */
export function SectionHeading({id, eyebrow, title, lede, action, level = 2}: {id?: string; eyebrow?: string; title: string; lede?: ReactNode; action?: ReactNode; level?: 2 | 3}) {
  const Title = level === 2 ? 'h2' : 'h3';
  return <div className="aa-section-heading">
    <div>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <Title id={id}><NebulaFlow identity={`heading-${id ?? title}`}>{title}</NebulaFlow></Title>
      {lede && <p className="aa-lede">{lede}</p>}
    </div>
    {action}
  </div>;
}
