'use client';
import {useMemo} from 'react';
import {milestonesCard, milestonesRows} from '../../../lib/nova/cards/plan-insights';
import {usePlatform} from '../../platform/use-platform';
import {Bars, CardFoot, CardNotice, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Goal milestones" in violet — the milestones the person ticked on their open goals,
 * goal by goal, with the next one still open on each (lib/positions.ts, the goals' own milestones; figures in
 * lib/nova/cards/plan-insights.ts). The ring is the share ticked (decoration over the words). Only the person's own
 * ticks count here: nothing is worked out from prices. Read only: a milestone is ticked on its goal's page.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function MilestonesWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('goals'), platform = usePlatform();
  const card = useMemo(() => { if (!platform.loaded || platform.error) return null; try { return milestonesCard(platform.data); } catch { return null; } }, [platform.loaded, platform.error, platform.data]);
  if (!shown) return <HoloHidden pillar="Goals"/>;
  if (!platform.loaded) return <HoloReading/>;
  if (platform.error || !card) return <HoloUnread what="Your goals"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No goals yet" href="/app/goals/new" action="Set a goal">Give a goal a few milestones and tick them off as you go. They add up here.</CardNotice>;
  if (card.state === 'none') return <CardNotice kind="empty" ghost="bars" title="No milestones yet" href="/app/goals" action="Add a milestone on a goal">None of your open goals has a milestone yet. Add one on a goal’s page and tick it when you get there.</CardNotice>;
  const rows = card.goals.slice(0, SHOWN[size]), more = card.goals.length - rows.length;
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={card.total ? card.done / card.total : null} figure={String(card.done)} caption={`of ${card.total}`} spin={size === 'L'}/>
    <NxHead label="Milestones ticked" title={`${card.done} of ${card.total}`} note={card.lead?.next ? `Next: ${card.lead.next}` : 'Every milestone is ticked.'}/>
    {rows.length > 0 && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">By goal</p>}
      <Bars extra={more} rows={rows.map(g => ({key: g.id, label: g.name, share: g.share, value: `${g.done} of ${g.total}`, ...(size === 'L' ? {note: g.next ? `Next: ${g.next}` : 'All ticked'} : {})}))}/>
    </div>}
    <CardFoot source="Your goals" asOf="your own ticks"/>
    <HoloTable caption="Goal milestones" rows={milestonesRows(card, Math.max(SHOWN[size], 3))}/>
  </div>;
}
