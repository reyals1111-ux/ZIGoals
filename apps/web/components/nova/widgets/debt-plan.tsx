'use client';
import {useMemo} from 'react';
import {ACCOUNTS} from '../../../lib/accounts/schema';
import {DEBT_PLANNER} from '../../../lib/debt-planner/store';
import {PLAN_RULE, debtPlanCard, debtPlanRows} from '../../../lib/nova/cards/money-more';
import {useDeviceRecord} from '../../ai/use-device-record';
import {useLocalToday} from '../../use-local-today';
import {Bars, CardFoot, CardNotice, Hero, type CardProps} from '../cards/kit';
import {HoloHidden, HoloReading, HoloTable, HoloUnread} from '../holo/parts';
import {usePillarShown} from '../holo/use-hud-data';
import '../cards/connect-cards.css';

/**
 * Session AM-2 (step 3, round 2): "Debt payoff plan" in gold — when the person's debts would be cleared with the figures
 * they kept for the payoff planner (their own rates, minimums and extra a month), highest rate first, smallest balance
 * first and minimums only (Wealth's planner, lib/debt-planner/plan.ts; figures in lib/nova/cards/money-more.ts).
 *
 * A projection, never a promise: every month here is "would", the foot says so at every size, and the widget states the
 * model's assumptions at Large. A missing figure is named, never guessed. Read only: the figures are kept on Wealth, and
 * nothing here pays, moves or schedules anything.
 */
export default function DebtPlanWidget({size = 'M'}: Partial<CardProps>) {
  const shown = usePillarShown('wealth'), accounts = useDeviceRecord(ACCOUNTS), planner = useDeviceRecord(DEBT_PLANNER), today = useLocalToday();
  const card = useMemo(() => { try { return debtPlanCard(accounts.data, planner.data, today); } catch { return null; } }, [accounts.data, planner.data, today]);
  if (!shown) return <HoloHidden pillar="Wealth"/>;
  if (!accounts.loaded || !planner.loaded) return <HoloReading/>;
  if (accounts.unreadable || planner.unreadable || !card) return <HoloUnread what="Your accounts and debts"/>;
  if (card.state === 'empty') return <CardNotice kind="empty" ghost="rows" title="No debt with a balance" href="/app/wealth#accounts-title" action="Add a debt">Add a debt on Wealth with what you owe. The payoff planner then works out when it would be cleared.</CardNotice>;
  const foot = <CardFoot source={card.note ? 'Showcase example figures' : 'Your kept figures'} asOf="a projection, not a promise"/>, table = <HoloTable caption="Debt payoff plan" rows={debtPlanRows(card)}/>;
  const lead = card.plans[0];
  if (card.state !== 'live' || !lead) return <CardNotice kind="empty" ghost="rows" title={card.state === 'unkept' ? 'No figures kept yet' : 'A figure is missing'} href="/app/wealth#accounts-title" action="Open the payoff planner">{card.state === 'unkept' ? `You owe ${card.owed} across ${card.debts} ${card.debts === 1 ? 'debt' : 'debts'}. Enter the minimums in the payoff planner on Wealth and keep them on this device.` : card.issue}</CardNotice>;
  const longest = Math.max(1, ...card.plans.map(p => p.months ?? 0));
  return <div className="nc-body nx-card" data-size={size} data-lay="hero">
    <div className="nx-top"><Hero value={lead.monthName ?? '100+ years'} label={size === 'S' ? 'Would be cleared by' : 'Debts would be cleared by'}>
      {size !== 'S' && <p className="nx-note">{card.owed} owed · {card.extra} extra a month</p>}
    </Hero></div>
    {size !== 'S' && <div className="nx-main" data-fit="rows" data-wr-limit="">
      {size === 'L' && <p className="nx-cap">Three ways to pay · {card.currency}</p>}
      {/* A payoff timeline: one bar a plan on one scale of months (the longest is the full width); a projection, said as one. */}
      <Bars rows={card.plans.map(p => ({key: p.strategy, label: p.title, share: p.months === null ? null : p.months / longest, value: p.months === null ? 'Not within 100 years' : `${p.monthName} · ${p.months} ${p.months === 1 ? 'month' : 'months'}`, ...(size === 'L' && p.months !== null ? {note: `${p.interest} interest on the way`} : {})}))}/>
      {size === 'L' && card.first && <p className="nx-note">The first debt cleared would be {card.first.name}, by {card.first.monthName}.</p>}
      {size === 'L' && <p className="nx-note">{PLAN_RULE}</p>}
    </div>}
    {foot}{table}
  </div>;
}
