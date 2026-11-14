'use client';
import {useMemo} from 'react';
import {useHealth} from '../../health/use-health';
import {useHealthToday} from '../../health/use-health-today';
import {dailyData} from '../../../lib/health-daily';
import {stepsCard, stepsRows} from '../../../lib/nova/cards/steps';
import {shortDate} from '../../../lib/nova/cards/weight';
import {formatNumber} from '../../../lib/visual-format';
import {CardFoot, CardNotice, Columns, Fact, Gauge, HeartMark, HeartTrace, Hero, TrendArea, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread, NotShared} from '../holo/parts';
import {useHealthShared, usePillarShown} from '../holo/use-hud-data';
import '../cards/health-cards.css';

/**
 * Session AM (ADR-038 D1–D5; art direction §4): "Steps", made on request. Today's steps against the person's own step
 * target (a meter, and how many are left or that it is reached); the last seven days as a field of columns, or a longer
 * range as one line, with the target as the dashed line through it; and the average of the logged days. Every figure is
 * the Health page's own (lib/nova/cards/steps.ts); a day without steps is an empty slot or a gap, never a zero. Small:
 * today. Medium: with the chart. Large: with the average, the days logged, the best day and the days at the target.
 * AM-2: today against the target is a ring gauge with a heart in it (magenta, a tick bezel, a lit end); the week is a
 * field of glowing columns in glass tubes with the newest day's tube lit; a heartbeat rule divides the two (ornament).
 */
export default function StepsWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('health'), shared = useHealthShared(), health = useHealth(), ready = health.loaded && !health.error;
  const day = useHealthToday(ready ? dailyData(health.data).preferences.timezone : null), range = params?.range;
  const card = useMemo(() => { if (!ready) return null; try { return stepsCard(health.data, day, range); } catch { return null; } }, [ready, health.data, day, range]);
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!health.loaded) return <HoloReading/>;
  if (health.error || !card) return <HoloUnread what="Your Health journal"/>;
  if (!card.latest) return <CardNotice kind="empty" title="No steps logged yet" href="/app/health?view=activity" action="Log your steps">{size === 'S' ? null : 'Add today’s steps on Health and your days show here.'}</CardNotice>;
  const {today, target, average, best, logged} = card, week = card.window.range === 'week';
  const ring = size === 'L' ? 124 : size === 'S' ? 36 : 96;
  return <div className="nc-body nc-steps" data-size={size}>
    <div className="nc-steps-top">
      {/* The ring is today's share of the target (decoration: the words beside it say it); without a target there is no ring to fill. */}
      {today.share !== null ? <Gauge share={today.share} size={ring} spin className="nc-steps-ring">{size === 'S' ? null : <HeartMark size={ring * .4}/>}</Gauge> : <span className="nc-steps-ring nc-steps-heart" aria-hidden="true"><HeartMark size={size === 'S' ? 36 : ring * .56}/></span>}
      <Hero value={today.text} unit={target ? `of ${target.text}` : today.steps === null ? undefined : 'steps'} label="Steps today">
        {today.note && <p className="nc-steps-note" data-tone={today.steps !== null && today.share === 1 ? 'good' : undefined}>{today.note}</p>}
      </Hero>
    </div>
    {size === 'L' && <HeartTrace className="nc-health-rule"/>}
    {size !== 'S' && (average ? <div className="nc-steps-chart">
      {size === 'L' && <p className="nc-steps-cap">Average <b>{average.text}</b> a day · {logged.text}</p>}
      {week ? <Columns values={card.values} labels={card.weekdays} line={target?.steps ?? null} lineLabel={target ? `Target ${target.text}` : null} height={size === 'L' ? 104 : 52} mark={card.values.length - 1}/>
        : <TrendArea values={card.values} height={size === 'L' ? 120 : 52} minLabel={card.edges.min} maxLabel={card.edges.max} labels={card.edges.dates} target={target?.steps ?? null} targetLabel={target ? `Target ${target.text}` : null}/>}
    </div> : <p className="nc-steps-note">No steps logged in {card.window.words}.</p>)}
    {size === 'L' && <div className="nc-facts">
      {best && <Fact label="Most in a day" value={`${best.text} · ${shortDate(best.date, day)}`}/>}
      {logged.atTarget !== null ? <Fact label="Days at your target" value={logged.days ? `${formatNumber(logged.atTarget)} of ${formatNumber(logged.days)} logged` : '—'}/> : <Fact label="Your step target" value="Not set"/>}
    </div>}
    {!shared && size !== 'S' && <NotShared/>}
    <HoloTable caption={`Your steps, ${card.window.words}`} rows={stepsRows(card, day)}/>
    <CardFoot source="Your Health records" asOf={card.asOf}/>
  </div>;
}
