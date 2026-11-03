'use client';
import {useHealth} from '../../health/use-health';
import {useLocalToday} from '../../use-local-today';
import {balanceWords, dailySeries, sleepBalance, BALANCE_MIN_NIGHTS} from '../../../lib/sleep/engine';
import {durationWords} from '../../../lib/nova/widgets/words';
import {NovaEmpty, NovaReading, NovaUnread} from './empty';

/** "Sleep balance": the nights against the person's own sleep goal, over two weeks, in kind words (lib/sleep/engine.ts). */
export default function SleepWidget() {
  const health = useHealth(), today = useLocalToday();
  if (!health.loaded) return <NovaReading/>;
  if (health.error) return <NovaUnread what="Your sleep log"/>;
  const sleep = health.data.sleep;
  if (!sleep || !sleep.nights.length) return <NovaEmpty pillar="health" href="/app/health?view=sleep" action="Log a night">No nights logged yet. Log a night, and set a sleep goal to see your balance.</NovaEmpty>;
  const balance = sleepBalance(sleep, today), last = dailySeries(sleep, today, 1)[0]?.asleep ?? null;
  return <div className="nova-sleep">
    {balance ? <p className="nova-big"><span className="nova-figure nova-figure-words">{balanceWords(balance, durationWords)}</span></p>
      : <p className="nova-line">{sleep.goal ? `Your balance shows after ${BALANCE_MIN_NIGHTS} logged nights in two weeks.` : 'Set a sleep goal on Health to see your balance.'}</p>}
    {last !== null && <p className="nova-line">Last night: {durationWords(last)} asleep.</p>}
  </div>;
}
