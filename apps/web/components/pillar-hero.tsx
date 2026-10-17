import type {ReactNode} from 'react';
import {NebulaFlow} from './nebula-flow';
import {PillarMark, type Pillar} from './pillars';
import {PageMinorActions} from './page-actions';
import './pillar-hero.css';
// Session AE (Part 4, ADR-027 G5): the header art's placement and its one-time entrance, Habits' orbit included.
import './header-art/header-art.css';

/**
 * Session AB-Design Phase 2, Part 2a (owner requests 21, 28; critique 8, 12): the one header of the four pillar pages and
 * the Journey, cut from Habits' approved header. Eyebrow with the pillar's fold mark; the title across the row in the
 * white→nebula heading whose end leans to the pillar's accent; then the one-line lede, and beside it the actions in fixed
 * places — the buttons (the primary last, at the right end), the shared Ask ZIGi / Back up row under them. An optional art
 * column at the right (Habits' constellation). The lock, Gamify and the page's tools stay in the status row above.
 */
export function PillarHero({pillar, titleId, eyebrow, title, lede, buttons, about, art, mark, className = '', actionsClass = '', children}: {
  pillar: Pillar | 'journey'; titleId: string; eyebrow: ReactNode; title: ReactNode; lede?: ReactNode; buttons?: ReactNode;
  about?: string; art?: ReactNode; mark?: ReactNode; className?: string; actionsClass?: string; children?: ReactNode;
}) {
  return <section className={`pillar-hero${art ? ' has-art' : ''} ${className}`.trim()} data-pillar={pillar} aria-labelledby={titleId}>
    <p className="eyebrow page-eyebrow pillar-hero-eyebrow">{mark ?? (pillar !== 'journey' && <PillarMark pillar={pillar} size={16}/>)}<NebulaFlow identity={`${titleId}-eyebrow`}>{eyebrow}</NebulaFlow></p>
    <h1 id={titleId} className="pillar-hero-title"><NebulaFlow identity={`${titleId}-title`}>{title}</NebulaFlow></h1>
    {lede && <p className="page-lede pillar-hero-lede">{lede}</p>}
    {(buttons || about) && <div className={`pillar-hero-actions ${actionsClass}`.trim()}>{buttons && <div className="pillar-hero-buttons">{buttons}</div>}{about && <PageMinorActions about={about}/>}</div>}
    {art && <div className="pillar-hero-art" aria-hidden="true">{art}</div>}
    {children}
  </section>;
}
