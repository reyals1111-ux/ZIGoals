'use client';
import {useMemo} from 'react';
import {MOOD_TAGS} from '../../../lib/mood-tags/schema';
import {TAG_MIN_DAYS} from '../../../lib/mood-tags/tags';
import {moodTagsCard, moodTagsRows} from '../../../lib/nova/cards/health-insights';
import {healthGroupIn} from '../../../lib/vault/w-homes';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useHealth} from '../../health/use-health';
import {Bars, CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {WidgetLocked} from '../stage/stage-parts';
import {useHealthDay, useHealthGate} from './use-health-gate';
import {NxDial, NxHead} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 1; owner addition 1, MERGE_REHEARSAL item 5): "Mood tags" in
 * Health's pink — what goes with the person's good days, from their own tags on mood check-ins, exactly as Health →
 * Insights counts it (lib/mood-tags/tags.ts goodDayTags; figures in lib/nova/cards/health-insights.ts): for a tag on at
 * least five days, how many of those days were Good or Great. Counts and "goes with", never a cause; a tag with too few
 * days waits and says how many it has.
 *
 * Health switches (ADR-037 Q14, Q16): the mood tags are health-type and were kept out of ZIGi and NOVA until wired
 * behind the Health switches. This widget is that wiring and nothing more: it is made locked unless NOVA's Health
 * permission and the device's Health switch are both on (the frame's gate), its body checks the permission again
 * (`useHealthGate`) and mounts the part that reads the records only once it is open, and a request for it is kept by the widget's name, never the
 * person's words (AM-S5). Read only: tags are added on Health.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function MoodTagsWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('health'), gate = useHealthGate();
  if (!shown) return <HoloHidden pillar="Health"/>;
  if (gate === 'locked') return <WidgetLocked id="mood-tags"/>;
  if (gate === 'reading') return <HoloReading/>;
  return <MoodTagsBody size={size}/>;
}
/** Mounted only once the Health switch is open: the moods and the tags are read here and nowhere before. */
function MoodTagsBody({size}: {size: CardProps['size']}) {
  const health = useHealth(), tags = useDeviceRecord(MOOD_TAGS), day = useHealthDay();
  const ready = health.loaded && !health.error && tags.loaded && !tags.unreadable;
  const card = useMemo(() => { if (!ready) return null; try { return moodTagsCard(healthGroupIn(health.data, 'moods')?.days ?? {}, tags.data, day); } catch { return null; } }, [ready, health.data, tags.data, day]);
  if (!health.loaded || !tags.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your Health records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No mood tags yet" href="/app/health" action="Tag a mood on Health">{size === 'S' ? null : 'After a mood check-in on Health, add a tag or two, such as “walk” or “friends”. What goes with your good days shows here.'}</CardNotice>;
  // The foot is always whole, so it carries the one caveat every size needs: counts, never causes.
  const foot = <CardFoot source="Your Health records" asOf={`the last ${card.windowDays} days · goes with, not a cause`}/>, table = <HoloTable caption="Mood tags: what goes with your good days" rows={moodTagsRows(card)}/>;
  const pending = card.pending.length > 0 && <ul className="nx-chips" aria-label="Tags that wait for more days">{card.pending.slice(0, size === 'L' ? 6 : 3).map(p => <li key={p.tag}>{p.tag} · <b>{p.days} of {p.need}</b> days</li>)}</ul>;
  const top = card.rows[0];
  if (!top) return <div className="nc-body nx-card" data-size={size} data-lay="hero">
    <div className="nx-top"><Hero value={String(card.tags)} unit={card.tags === 1 ? 'tag' : 'tags'} label="Waiting for more days"/></div>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">{pending}<p className="nx-note">A comparison needs {TAG_MIN_DAYS} tagged days and {TAG_MIN_DAYS} other days with a mood. {card.note}</p></div>}
    {foot}{table}
  </div>;
  const rows = card.rows.slice(0, SHOWN[size]);
  return <div className="nc-body nx-card" data-size={size} data-lay="dial">
    <NxDial share={top.share} figure={String(top.good)} caption={`of ${top.days}`} spin={size === 'L'}/>
    <NxHead pulse={size === 'L'} label={size === 'S' ? `Good with “${top.tag}”` : `Good or Great with “${top.tag}”`} title={`${top.good} of ${top.days} days`} note={size !== 'M' ? `Other days with a mood: ${top.otherGood} of ${top.otherDays}` : null}/>
    {rows.length > 0 && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">Good or Great days, by tag</p>}
      <Bars rows={rows.map(r => ({key: r.tag, label: r.tag, share: r.share, value: `${r.good} of ${r.days}`, ...(size === 'L' ? {note: `Other days with a mood: ${r.otherGood} of ${r.otherDays}`} : {})}))}/>
      {size === 'L' && pending}
      {size === 'L' && <p className="nx-note">{card.note} A tag needs {TAG_MIN_DAYS} days before it is compared.</p>}
    </div>}
    {foot}{table}
  </div>;
}
