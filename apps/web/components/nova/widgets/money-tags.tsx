'use client';
import {useMemo} from 'react';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {MONEY_TAGS_RECORD} from '../../../lib/money-tags/schema';
import {moneyTagsCard, moneyTagsRows} from '../../../lib/nova/cards/money-insights';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Fact, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, "NOVA connected"; ADR-040 feature 2): "Spending by tag" in gold — what the person logged under
 * each of their own tags (this month so far unless the request names a range), with the Tags view's own totals
 * (lib/money-tags/tags.ts; figures in lib/nova/cards/money-insights.ts). Each tag is a meter against the largest tag: an
 * entry counts whole under each of its tags, so tags do not add up to a total, and the widget says so. Only entries the
 * money log still holds count. One currency leads; another is named apart, never converted. Read only.
 */
const SHOWN = {S: 0, M: 3, L: 6} as const;
export default function MoneyTagsWidget({size = 'M', params}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), tags = useDeviceRecord(MONEY_TAGS_RECORD), log = useDeviceRecord(MONEY_LOG), today = useLocalToday(), range = params?.range;
  const card = useMemo(() => moneyTagsCard(tags.data, log.data, today, range), [tags.data, log.data, today, range]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!tags.loaded || !log.loaded) return <HoloReading/>;
  if (tags.unreadable || log.unreadable) return <HoloUnread what="Your Wealth records"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No tags yet" href="/app/wealth#spending" action="Tag an entry">Add a tag such as “holiday” or “work” to an entry on Wealth, under Spending, Tags. Each tag’s total shows here.</CardNotice>;
  // The foot is always whole, so it carries the one caveat every size needs: tags overlap.
  const foot = <CardFoot source="Your Wealth records" asOf={card.lastDate ? `tags can overlap · last tagged entry ${formatDate(card.lastDate, {year: false})}` : null}/>, table = <HoloTable caption={`Spending by tag ${card.window.words}${card.currency ? `, in ${card.currency}` : ''}`} rows={moneyTagsRows(card, Math.max(SHOWN[size], 3))}/>;
  const top = card.rows[0];
  if (card.state === 'quiet' || !top) return <div className="nc-body nx-card" data-size={size}>
    <CardNotice kind="empty" ghost="bars" title={`No tagged entry ${card.window.words}`} href="/app/wealth#spending" action="Tag an entry">You use {card.tags} {card.tags === 1 ? 'tag' : 'tags'}; none is on an entry in this range.</CardNotice>
    {foot}{table}
  </div>;
  const rows = card.rows.slice(0, SHOWN[size]), more = card.rows.length - rows.length;
  return <div className="nc-body nx-card" data-size={size}>
    <div className="nx-top"><Hero value={top.text} label={size === 'S' ? `“${top.tag}”` : `Most: “${top.tag}” · ${card.window.words.replace(/^in /, '')}`}/></div>
    {rows.length > 0 && <div className="nx-main" data-fit="rows">
      {size === 'L' && <p className="nx-cap">Spent under each tag · {card.window.words.replace(/^in /, '')}</p>}
      <Bars rows={rows.map(r => ({key: r.tag, label: r.tag, share: r.cents > 0 ? r.share : null, value: r.cents > 0 ? `${r.text} · ${r.entries}` : r.received ? `${r.received} received` : r.text, ...(size === 'L' && r.cents > 0 && r.received ? {note: `${r.received} received`} : {})}))}/>
      {size === 'L' && more > 0 && <p className="nx-note">{more} more {more === 1 ? 'tag' : 'tags'} on Wealth.</p>}
    </div>}
    {size === 'L' && card.others.length > 0 && <div className="nc-facts">{card.others.slice(0, 2).map(o => <Fact key={o.currency} label={`Also tagged in ${o.currency}`} value={`${o.tags} ${o.tags === 1 ? 'tag' : 'tags'} · never converted`}/>)}</div>}
    {size === 'L' && <p className="nx-note">An entry counts under each of its tags, so tags do not add up to a total.</p>}
    {foot}{table}
  </div>;
}
