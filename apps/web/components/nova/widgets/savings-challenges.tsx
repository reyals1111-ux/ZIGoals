'use client';
import {useMemo} from 'react';
import {MONEY_LOG} from '../../../lib/money-log/schema';
import {savingsChallengesCard, savingsChallengesRows} from '../../../lib/nova/cards/money-more';
import {SAVINGS_CHALLENGES} from '../../../lib/savings-challenges/challenges';
import {formatDate} from '../../../lib/visual-format';
import {useDeviceRecord} from '../../ai/use-device-record';
import {usePlatform} from '../../platform/use-platform';
import {useLocalToday} from '../../use-local-today';
import {CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import {NxRingCards} from './nx-parts';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Savings challenges" in gold — the challenges running on the person's goals (the
 * 52-week challenge, no-spend days, round-ups by hand) and how far along each is, worked out as the goal's own challenge
 * card works it out: from what was recorded toward the goal, the days they marked and their money log
 * (lib/savings-challenges/challenges.ts; figures in lib/nova/cards/money-more.ts). A challenge never moves money: the
 * person moves it and records it as always, and nothing is recorded from here. Read only.
 */
const SHOWN = {S: 0, M: 2, L: 5} as const;
export default function SavingsChallengesWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), store = useDeviceRecord(SAVINGS_CHALLENGES), platform = usePlatform(), log = useDeviceRecord(MONEY_LOG), today = useLocalToday();
  const ready = store.loaded && !store.unreadable && platform.loaded && !platform.error && log.loaded && !log.unreadable;
  const card = useMemo(() => { if (!ready) return null; try { return savingsChallengesCard(store.data, platform.data, log.data, today); } catch { return null; } }, [ready, store.data, platform.data, log.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!store.loaded || !platform.loaded || !log.loaded) return <HoloReading/>;
  if (!card) return <HoloUnread what="Your savings challenges"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="bars" title="No savings challenge running" href="/app/goals/templates" action="Start one from a template">A 52-week challenge, no-spend days or round-ups start from a goal template. Their progress then shows here.</CardNotice>;
  const lines = card.lines.slice(0, SHOWN[size]), n = card.lines.length, more = n - lines.length;
  const foot = <CardFoot source={card.lines.some(l => l.note) ? 'Your goals · example challenges' : 'Your goals and money log'} asOf={`as of today, ${formatDate(today, {year: false})}`}/>, table = <HoloTable caption="Savings challenges" rows={savingsChallengesRows(card)}/>;
  const percent = (share: number | null) => share === null ? '—' : `${Math.round(share * 100)}%`;
  if (size === 'S') return <div className="nc-body nx-card" data-size={size} data-lay="hero">
    <div className="nx-top"><Hero value={String(n)} unit={n === 1 ? 'challenge' : 'challenges'} label="Running on your goals"/></div>
    {foot}{table}
  </div>;
  return <div className="nc-body nx-card" data-size={size} data-lay="full">
    {size === 'L' && <p className="nx-cap">{n} {n === 1 ? 'challenge' : 'challenges'} running on your goals</p>}
    <NxRingCards label="Savings challenges" items={lines.map(l => ({key: l.goalId, share: l.share, figure: percent(l.share), name: l.goal, kind: l.title, words: l.words}))}/>
    {more > 0 && <p className="nx-note">+{more} more on Goals.</p>}
    {size === 'L' && <p className="nx-note">A challenge follows what you record toward its goal. Nothing here moves money or records anything.</p>}
    {foot}{table}
  </div>;
}
