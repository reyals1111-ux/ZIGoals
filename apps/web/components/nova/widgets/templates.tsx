'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import {templatesCard, templatesRows} from '../../../lib/nova/cards/life-insights';
import {CATALOGUE_AREAS, TEMPLATE_CATALOGUE} from '../../../lib/templates/library';
import {formatNumber} from '../../../lib/visual-format';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, Hero, type CardProps} from '../cards/kit';
import {HoloTable} from '../holo/parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-039 backlog #15): "Templates" in violet — the library of goal templates
 * and habit ideas (lib/templates/library.ts, a static list that ships with the app and loads with this widget only;
 * figures in lib/nova/cards/life-insights.ts). It reads nothing of the person's, so it has no switch. Three goal
 * templates to start from, which change with the day: each is a link that opens the form the Goal templates page opens
 * for it (the goal creator filled from it, the average-goal form, or Health goals for a weight); nothing is created by a
 * tap. Its head link opens Goal templates; habit ideas open on Habits. At Large the areas are meters by how many ideas
 * each holds.
 */
const PICKS = {S: 0, M: 2, L: 3} as const;
export default function TemplatesWidget({size = 'M'}: Partial<CardProps>) {
  const today = useLocalToday();
  const card = useMemo(() => templatesCard(TEMPLATE_CATALOGUE.map(e => ({kind: e.kind, id: e.id, area: e.area, title: e.title, ...(e.kind === 'goal' ? {goalKind: e.goal.kind} : {})})), CATALOGUE_AREAS, today, 3), [today]);
  const picks = card.picks.slice(0, PICKS[size]), areas = card.areas.slice(0, 8);
  return <div className="nc-body nx-card" data-size={size} data-lay="hero">
    <div className="nx-top"><Hero value={formatNumber(card.total)} unit="ideas" label="In the library">
      {size !== 'S' && <p className="nx-note">{formatNumber(card.goals)} goal templates · {formatNumber(card.habits)} habit ideas</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main nx-grid2" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">Ideas in each area</p>}
      <Bars extra={Math.max(0, card.areas.length - areas.length)} more={(hidden, shown) => `+${hidden} more ${hidden === 1 ? 'area' : 'areas'}${shown ? '' : ' in the library'}`} rows={areas.map(a => ({key: a.id, label: a.label, share: a.share, value: String(a.total)}))}/>
      {size === 'L' && picks.length > 0 && <p className="nx-cap">Start a goal from one of these</p>}
      {size === 'L' && picks.length > 0 && <ul className="nx-rows" aria-label="Goal templates to start from">{picks.map(p => <li key={p.id} className="nx-row nx-row-linked">
        <Link className="nx-row-link" href={p.href} prefetch={false} aria-label={`Start a goal from the template ${p.title}`}>
          <i className="nx-row-node" aria-hidden="true"/><span className="nx-row-name">{p.title}</span><span className="nx-row-sub">{p.area}</span><span className="nx-row-go" aria-hidden="true">→</span>
        </Link>
      </li>)}</ul>}
      {size === 'L' && <div className="nx-keys"><Link className="nc-action" href="/app/habits?add=habit" prefetch={false}>Browse habit ideas<span aria-hidden="true"> →</span></Link></div>}
    </div>}
    <CardFoot source="The ZIGoals library" asOf="ships with the app"/>
    <HoloTable caption="Templates" rows={templatesRows(card, 5)}/>
  </div>;
}
