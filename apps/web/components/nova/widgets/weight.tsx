'use client';
import {useId, useMemo} from 'react';
import {useHealth} from '../../health/use-health';
import {useHealthToday} from '../../health/use-health-today';
import {dailyData} from '../../../lib/health-daily';
import {LOG_WEIGHT_HREF} from '../../../lib/health-aa/coach-slot';
import {logDayWords, shortDate, weightCard, weightRows} from '../../../lib/nova/cards/weight';
import {HEART_PATH, clamp01} from '../../../lib/nova/holo/geometry';
import {CardFoot, CardNotice, Delta, Fact, HeartMark, HeartTrace, Hero, TrendArea, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread, NotShared} from '../holo/parts';
import {useHealthShared, usePillarShown} from '../holo/use-hud-data';
import '../cards/health-cards.css';

/**
 * Session AM (ADR-038 D1–D5; art direction §4): "Weight", made on request ("What's my weight progress this month?").
 * The latest weigh-in with its unit and day; the change since the first weigh-in in the range (whether down is good is
 * said only when the person set a weight goal: toward it is good); the readings as one line with a heart at the newest,
 * the lowest and highest named, the weight goal as the dashed line; and a row of hearts that fills by the share of days
 * with a weigh-in. Every figure is the Health page's own, in the person's unit (lib/nova/cards/weight.ts); a day without
 * a reading is a gap in the line, never a zero. Small: the figure and its change. Medium: with the line and the hearts.
 * Large: with the lowest, highest and average of the range.
 * AM-2: Health is magenta with hearts — the figure under its label, the change as a lit chip, a glass heart with the
 * heartbeat running into it (ornament, never a reading), the line on a fine grid with a heart at its lead.
 */

/** Hearts for the days logged: `filled` of them lit from the left (a part heart is cut at that share); the count is beside them in words. */
function LoggedHearts({of, filled, text}: {of: number; filled: number; text: string}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <div className="nc-weight-logged">
    <span className="nc-weight-hearts" aria-hidden="true">{Array.from({length: of}, (_, i) => {
      const share = clamp01(filled - i);
      return <svg key={i} viewBox="0 0 24 24" focusable="false">
        {share > 0 && share < 1 && <defs><clipPath id={`${id}h${i}`}><rect x="0" y="0" width={(24 * share).toFixed(2)} height="24"/></clipPath></defs>}
        <path className="holo-heart-shell" d={HEART_PATH}/>
        {share > 0 && <path className="holo-heart-fill" d={HEART_PATH} clipPath={share < 1 ? `url(#${id}h${i})` : undefined}/>}
      </svg>;
    })}</span>
    <span className="nc-weight-logged-text">{text}</span>
  </div>;
}

/** "down 1.2 kg since 12 Oct" breaks only before "since" (the amount and the day each stay whole). */
const twoLines = (text: string) => text.split(' since ').map(part => part.replaceAll(' ', '\u00a0')).join(' since\u00a0');

export default function WeightWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('health'), shared = useHealthShared(), health = useHealth(), ready = health.loaded && !health.error;
  // The Health journal's day, as the Health page reads it.
  const day = useHealthToday(ready ? dailyData(health.data).preferences.timezone : null), range = params?.range;
  const card = useMemo(() => { if (!ready) return null; try { return weightCard(health.data, day, range); } catch { return null; } }, [ready, health.data, day, range]);
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (!health.loaded) return <HoloReading/>;
  if (health.error || !card) return <HoloUnread what="Your Health journal"/>;
  if (!card.latest || !card.hero) return <CardNotice kind="empty" title="No weight logged yet" href={LOG_WEIGHT_HREF} action="Log your weight">{size === 'S' ? null : 'Add a weigh-in on Health and your progress shows here.'}</CardNotice>;
  const drawn = card.readings.length > 0;
  return <div className="nc-body nc-weight" data-size={size}>
    <div className="nc-weight-top">
      <Hero value={card.hero.value} unit={card.hero.unit} label={`Logged ${logDayWords(card.latest.date, day)}`}>
        {card.change ? <Delta text={twoLines(card.change.text)} direction={card.change.direction} good={card.change.good}/> : size !== 'S' && card.note ? <p className="nc-weight-note">{card.note}</p> : null}
      </Hero>
      {size !== 'S' && <div className="nc-weight-side" aria-hidden="true"><HeartTrace/><HeartMark size={size === 'L' ? 56 : 44}/></div>}
    </div>
    {size !== 'S' && drawn && <div className="nc-weight-chart">
      {/* Medium has no room for the dates under the line: the change beside the figure names the first day, the figure's label the last. */}
      <TrendArea values={card.values} marker="heart" height={size === 'L' ? 128 : 56} minLabel={card.edges.min} maxLabel={card.edges.max} labels={size === 'L' ? card.edges.dates ?? undefined : undefined}
        target={card.target?.grams ?? null} targetLabel={card.target ? `Goal ${card.target.text}` : null}/>
    </div>}
    {size !== 'S' && <LoggedHearts of={card.logged.hearts.of} filled={card.logged.hearts.filled} text={card.logged.text}/>}
    {size === 'L' && card.lowest && card.highest && card.average && <div className="nc-facts">
      <Fact label="Lowest" value={`${card.lowest.text} · ${shortDate(card.lowest.date, day)}`}/>
      <Fact label="Highest" value={`${card.highest.text} · ${shortDate(card.highest.date, day)}`}/>
      <Fact label={`Average of ${card.readings.length === 1 ? 'one weigh-in' : `${card.readings.length} weigh-ins`}`} value={card.average.text}/>
    </div>}
    {!shared && size !== 'S' && <NotShared/>}
    <HoloTable caption={`Your weight, ${card.window.words}`} rows={weightRows(card, day)}/>
    <CardFoot source="Your Health records" asOf={card.asOf}/>
  </div>;
}
