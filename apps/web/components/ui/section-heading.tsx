'use client';
import type {ReactNode} from 'react';
import {NebulaFlow} from '../nebula-flow';
import {PillarMark} from '../pillars';
import type {Pillar} from '../../lib/pillar-route';

/**
 * The one section heading (Session AA-Cloud premium pass): a small eyebrow, a white title whose nebula colour flows from
 * its middle to its end (NebulaFlow, one sweep the first time it is seen, static under reduced motion and Motion Off),
 * an optional lede and an optional action on the right. Phase 2, Part 3 (owner request 29): `pillar` puts that pillar's
 * fold mark at the start of the eyebrow — the icon of the one card header (card-header.css).
 */
export function SectionHeading({id, eyebrow, title, lede, action, level = 2, pillar}: {id?: string; eyebrow?: string; title: string; lede?: ReactNode; action?: ReactNode; level?: 2 | 3; pillar?: Pillar}) {
  const Title = level === 2 ? 'h2' : 'h3';
  return <div className="aa-section-heading">
    <div>
      {eyebrow && <p className={pillar ? 'eyebrow aa-eyebrow-mark' : 'eyebrow'}>{pillar && <PillarMark pillar={pillar} size={13}/>}{eyebrow}</p>}
      <Title id={id}><NebulaFlow identity={`heading-${id ?? title}`}>{title}</NebulaFlow></Title>
      {lede && <p className="aa-lede">{lede}</p>}
    </div>
    {action}
  </div>;
}
