'use client';
import {useId, useMemo, useState} from 'react';
import {useDeviceRecord} from '../ai/use-device-record';
import {GOAL_EXTRAS} from '../../lib/goal-extras/store';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {weekOf} from '../../lib/money-log/engine';
import {SAVINGS_CHALLENGES, WEEKS, challengeForTemplate, fiftyTwoWeek, noSpend, recordedSince, removeChallenge, roundUps, setChallenge, toggleNoSpendDay, weekAmount, yearTotal, type Challenge, type ChallengeKind, type GoalAmount, type SavingsChallenges} from '../../lib/savings-challenges/challenges';
import {eventValueForGoal} from '../../lib/goal-intelligence';
import type {ContributionEvent, PrivateGoal} from '../../lib/positions';
import {parseAmountInput} from '../../lib/amount-input';
import {formatGoalAmount} from '../../lib/goal-summary';
import {amount} from '../platform/common';
import {addLocalDays, localDate} from '../../lib/local-date';
import {calendarDay, formatDate, formatMoney, formatWeekday, isMoneyCurrency} from '../../lib/visual-format';
import {plainErrorMessage} from '../../lib/plain-error';
import {showToast} from '../ui/undo-toast';
import {LazyPillarArt} from '../illustrations/lazy-pillar-art';
import './challenge-card.css';

/**
 * Session AK (F5a, item 2): a savings challenge on its goal's page: the 52-week challenge, no-spend days or round-ups by
 * hand. Shown when the goal started from a challenge template (goal extras' `template`) or has a challenge set up
 * (`zigoals:savings-challenges:v1`). Its progress is read from the person's own records only: the contributions they
 * recorded toward this goal, the days they marked and their money log. It never moves money or records anything on the
 * goal; the person moves the money and records it as always. Lazy-loaded (components/goals/lazy.tsx).
 */
const TITLE: Record<ChallengeKind, string> = {'52-week': '52-week savings challenge', 'no-spend': 'No-spend days', 'round-up': 'Round-ups by hand'};
export function ChallengeCard({goal, events}: {goal: PrivateGoal; events: readonly ContributionEvent[]}) {
  const extras = useDeviceRecord(GOAL_EXTRAS), store = useDeviceRecord(SAVINGS_CHALLENGES);
  const challenge = store.loaded && !store.unreadable ? store.data.goals[goal.id] : undefined;
  const fromTemplate = extras.loaded && !extras.unreadable ? challengeForTemplate(extras.data.goals[`private:${goal.id}`]?.template) : null;
  const kind = challenge?.kind ?? fromTemplate;
  if (!kind || !store.loaded) return null;
  if (store.unreadable) return <section className="panel challenge-card"><h2>Savings challenge</h2><p role="alert">Your challenges on this device could not be read. Their bytes are kept; nothing was changed.</p></section>;
  return challenge ? <Running goal={goal} events={events} challenge={challenge} update={store.update}/> : <SetUp goal={goal} kind={kind} update={store.update}/>;
}
export default ChallengeCard;

type Update = (change: (current: SavingsChallenges) => SavingsChallenges) => unknown;
const goalMoney = (goal: PrivateGoal, units: bigint) => formatGoalAmount(amount((units < 0n ? -units : units).toString(), goal.decimals), goal.asset);

function SetUp({goal, kind, update}: {goal: PrivateGoal; kind: ChallengeKind; update: Update}) {
  const id = useId(), today = localDate();
  const [start, setStart] = useState(today), [step, setStep] = useState(''), [order, setOrder] = useState<'up' | 'down'>('up'), [roundTo, setRoundTo] = useState<1 | 5 | 10>(1), [target, setTarget] = useState('30'), [error, setError] = useState('');
  const stepUnits = useMemo(() => { try { const u = parseAmountInput(step, goal.decimals); return u > 0n ? u : null; } catch { return null; } }, [step, goal.decimals]);
  const moneyGoal = goal.type !== 'PROJECT';
  const begin = () => {
    try {
      let c: Challenge;
      if (kind === '52-week') { if (!stepUnits) throw Error(`Enter your step in ${goal.asset}, above zero (week 1 puts aside one step).`); c = {kind, startedOn: start, step: amount(stepUnits.toString(), goal.decimals), order}; }
      else if (kind === 'no-spend') { const n = Number(target); if (!Number.isInteger(n) || n < 1 || n > 366) throw Error('Aim for a whole number of days, from 1 to 366.'); c = {kind, startedOn: start, targetDays: n, noSpendDays: []}; }
      else c = {kind, startedOn: start, roundTo};
      update(r => setChallenge(r, goal.id, c)); setError('');
    } catch (cause) { setError(plainErrorMessage(cause, 'Not saved on this device.')); }
  };
  return <section className="panel challenge-card" aria-labelledby={`${id}-t`}>
    <div className="challenge-intro pillar-art-inline"><div>
    <p className="eyebrow">A SAVINGS CHALLENGE · FROM THE TEMPLATE</p>
    <h2 id={`${id}-t`}>{TITLE[kind]}</h2>
    {kind === '52-week' && <p>Each week you put aside one step more than the week before: one step in week 1, two in week 2, up to 52 in week 52. Counting down starts with the biggest week instead. You choose the step; this card follows what you record toward this goal.</p>}
    {kind === 'no-spend' && <p>A no-spend day is a day with nothing spent beyond what was already planned. You mark each one here; if your money log has a purchase that day, it is shown apart rather than counted. A day you did not mark is never guessed.</p>}
    {kind === 'round-up' && <p>Each purchase you log in your money log is rounded up to the next whole amount; the differences add up each week. Move that amount to savings yourself, then record it on this goal.</p>}
    </div><LazyPillarArt pillar="goals" size={104}/></div>
    {(kind !== 'no-spend' && !moneyGoal) ? <p className="fine">This challenge counts money recorded toward a savings goal; this goal counts milestones, so start it on a savings goal instead.</p> : <div className="challenge-form">
      <label className="field"><span>Starts on</span><input type="date" value={start} onChange={e => setStart(e.target.value || today)}/></label>
      {kind === '52-week' && <>
        <label className="field"><span>Your step ({goal.asset})</span><input inputMode="decimal" autoComplete="off" value={step} onChange={e => setStep(e.target.value)} placeholder="for example 1 or 5"/></label>
        <fieldset className="challenge-choice"><legend>Order</legend>
          <label><input type="radio" name={`${id}-order`} checked={order === 'up'} onChange={() => setOrder('up')}/> Smallest week first</label>
          <label><input type="radio" name={`${id}-order`} checked={order === 'down'} onChange={() => setOrder('down')}/> Biggest week first</label>
        </fieldset>
        {stepUnits && <p className="fine" aria-live="polite">With this step the year adds up to {goalMoney(goal, yearTotal(stepUnits))} (1,378 steps). This goal&rsquo;s target is {goalMoney(goal, BigInt(goal.target))}.</p>}
      </>}
      {kind === 'no-spend' && <label className="field"><span>Days to aim for</span><input inputMode="numeric" autoComplete="off" value={target} onChange={e => setTarget(e.target.value)}/></label>}
      {kind === 'round-up' && <label className="field"><span>Round each purchase up to the next</span><select value={roundTo} onChange={e => setRoundTo(Number(e.target.value) as 1 | 5 | 10)}><option value={1}>1</option><option value={5}>5</option><option value={10}>10</option></select></label>}
      <div className="challenge-actions"><button type="button" className="primary" onClick={begin}>Start the challenge</button></div>
      {error && <p role="alert">{error}</p>}
    </div>}
    <p className="fine">Kept on this device. Nothing here moves money.</p>
  </section>;
}

function Running({goal, events, challenge: c, update}: {goal: PrivateGoal; events: readonly ContributionEvent[]; challenge: Challenge; update: Update}) {
  const id = useId(), today = localDate(), log = useDeviceRecord(MONEY_LOG), [status, setStatus] = useState('');
  const weekStartsOn = log.loaded && !log.unreadable ? log.data.weekStartsOn : 'monday', entries = log.loaded && !log.unreadable ? log.data.entries : [];
  const amounts: GoalAmount[] = useMemo(() => events.filter(e => e.goalId === goal.id && e.goalScope === 'private' && e.provenance !== 'REWARD_INCOME').flatMap(e => { const u = eventValueForGoal(e, goal); return u === null ? [] : [{day: calendarDay(e.occurredAt), units: e.direction === 'IN' ? u : -u}]; }), [events, goal]);
  const recorded = recordedSince(amounts, c.startedOn, today);
  const stop = () => {
    try { update(r => removeChallenge(r, goal.id)); showToast({message: `${TITLE[c.kind]} stopped. Your goal and its records are unchanged.`, undo: () => update(r => setChallenge(r, goal.id, c)), undone: 'The challenge is back.'}); }
    catch (cause) { setStatus(plainErrorMessage(cause, 'Not saved on this device.')); }
  };
  const change = (fn: (x: Challenge) => Challenge, words: string) => { try { update(r => setChallenge(r, goal.id, fn(r.goals[goal.id] ?? c))); setStatus(words); } catch (cause) { setStatus(plainErrorMessage(cause, 'Not saved on this device.')); } };
  return <section className="panel challenge-card" aria-labelledby={`${id}-t`}>
    <p className="eyebrow">A SAVINGS CHALLENGE{c.note ? ` · ${c.note}` : ''}</p>
    <h2 id={`${id}-t`}>{TITLE[c.kind]}</h2>
    {c.kind === '52-week' && <FiftyTwo goal={goal} c={c} recorded={recorded} today={today}/>}
    {c.kind === 'no-spend' && <NoSpend c={c} today={today} log={entries} weekStart={weekOf(today, weekStartsOn).start} toggle={(d, on) => change(x => toggleNoSpendDay(x, d), on ? `${formatDate(d)} is no longer marked.` : `${formatDate(d)} marked as a no-spend day.`)}/>}
    {c.kind === 'round-up' && <RoundUps goal={goal} c={c} recorded={recorded} today={today} entries={entries} weekStartsOn={weekStartsOn} logReady={log.loaded}/>}
    <div className="challenge-actions"><button type="button" className="quiet" onClick={stop}>Stop this challenge</button></div>
    <p className="challenge-status" role="status" aria-live="polite">{status}</p>
  </section>;
}

function FiftyTwo({goal, c, recorded, today}: {goal: PrivateGoal; c: Challenge; recorded: bigint; today: string}) {
  let step = 0n; try { step = parseAmountInput(c.step ?? '', goal.decimals); } catch { /* shown below */ }
  if (step <= 0n) return <p>This challenge has no step yet. Stop it and start it again with your step.</p>;
  const order = c.order ?? 'up', p = fiftyTwoWeek(c.startedOn, today, step, order, recorded);
  return <>
    <p className="challenge-headline">{p.week === 0 ? <>Starts on {formatDate(c.startedOn)}.</> : p.week > WEEKS ? <>The 52 weeks are over.</> : <>Week <strong>{p.week}</strong> of 52 · this week: <strong>{goalMoney(goal, p.thisWeek)}</strong></>}</p>
    <p>Recorded toward this goal since {formatDate(c.startedOn)}: <strong>{goalMoney(goal, recorded)}</strong>. That covers <strong>{p.covered} of 52</strong> weeks{p.week >= 1 && p.week <= WEEKS ? <>; the schedule up to this week is {goalMoney(goal, p.expected)}, so you are {p.difference >= 0n ? <>ahead by {goalMoney(goal, p.difference)}</> : <>{goalMoney(goal, p.difference)} from it. Any week counts; there is no rush</>}</> : null}.</p>
    <ol className="challenge-weeks" aria-hidden="true">{Array.from({length: WEEKS}, (_, i) => <li key={i} data-covered={i < p.covered || undefined} data-now={i + 1 === p.week || undefined}/>)}</ol>
    <p className="fine">Each square is a week: filled when what you recorded covers it, outlined for this week.</p>
    <details className="challenge-schedule"><summary>The whole schedule</summary>
      <ol className="challenge-schedule-list">{Array.from({length: WEEKS}, (_, i) => <li key={i}>Week {i + 1}: {goalMoney(goal, weekAmount(i + 1, step, order))}{i < p.covered ? ' · covered' : ''}</li>)}</ol>
      <p className="fine">The year: {goalMoney(goal, yearTotal(step))}.</p>
    </details>
    <p className="fine">Move the money yourself, then record it on this goal as you always do. This card only reads what you record.</p>
  </>;
}

function NoSpend({c, today, log, weekStart, toggle}: {c: Challenge; today: string; log: readonly {date: string; kind: 'expense' | 'income'}[]; weekStart: string; toggle: (day: string, marked: boolean) => void}) {
  const p = noSpend(c, log, today, weekStart), marked = new Set(c.noSpendDays ?? []);
  const days = Array.from({length: 7}, (_, i) => addLocalDays(today, i - 6)).filter(d => d >= c.startedOn);
  const pct = Math.min(100, Math.round(p.counted / p.target * 100));
  return <>
    <p className="challenge-headline"><strong>{p.counted}</strong> of {p.target} no-spend days{p.run > 1 ? ` · ${p.run} in a row` : ''}{p.thisWeek ? ` · ${p.thisWeek} this week` : ''}</p>
    <div className="challenge-bar" role="img" aria-label={`${p.counted} of ${p.target} days`}><i style={{width: `${pct}%`}}/></div>
    {days.length > 0 ? <div className="challenge-days" role="group" aria-label="Mark the last seven days">{days.map(d => <button key={d} type="button" aria-pressed={marked.has(d)} aria-label={`${d === today ? 'Today, ' : ''}${formatDate(d, {weekday: true})}: ${marked.has(d) ? 'marked as a no-spend day' : 'not marked'}`} onClick={() => toggle(d, marked.has(d))}><span>{d === today ? 'Today' : formatWeekday(d)}</span><small>{marked.has(d) ? '✓' : '·'}</small></button>)}</div>
      : <p>The challenge starts on {formatDate(c.startedOn)}.</p>}
    {p.conflicts.length > 0 && <p className="fine">Marked, but your money log has a purchase that day, so not counted: {p.conflicts.map(d => formatDate(d)).join(', ')}.</p>}
    <p className="fine">Only the days you mark count; a day you did not mark is never guessed. Tick this goal&rsquo;s milestones yourself when you reach them.</p>
  </>;
}

function RoundUps({goal, c, recorded, today, entries, weekStartsOn, logReady}: {goal: PrivateGoal; c: Challenge; recorded: bigint; today: string; entries: readonly {date: string; kind: 'expense' | 'income'; amount: string; currency: string}[]; weekStartsOn: 'monday' | 'sunday'; logReady: boolean}) {
  const currency = isMoneyCurrency(goal.asset) ? goal.asset : null;
  if (!currency) return <p>Round-ups count purchases in a currency; this goal is in {goal.asset}. Start it on a savings goal in your currency instead.</p>;
  const r = roundUps(entries, currency, c.roundTo ?? 1, c.startedOn, today, d => weekOf(d, weekStartsOn).start), money = (cents: bigint) => formatMoney(`${cents / 100n}.${String(cents % 100n).padStart(2, '0')}`, currency);
  if (logReady && r.counted === 0) return <>
    <p>No purchases in {currency} logged since {formatDate(c.startedOn)} yet. Log your spending in Wealth → Spending; each purchase you log adds its round-up here.{r.otherCurrency ? ` (${r.otherCurrency} in other currencies are not counted; amounts are never converted.)` : ''}</p>
  </>;
  return <>
    <p className="challenge-headline">This week&rsquo;s round-ups: <strong>{money(r.thisWeek)}</strong></p>
    <p>Since {formatDate(c.startedOn)}: {money(r.total)} from {r.counted} {r.counted === 1 ? 'purchase' : 'purchases'}, each rounded up to the next {c.roundTo ?? 1}. Recorded toward this goal since then: <strong>{goalMoney(goal, recorded)}</strong>.</p>
    {r.weeks.length > 1 && <ul className="challenge-round-weeks" aria-label="Round-ups by week">{r.weeks.slice(-4).map(w => <li key={w.start}>Week of {formatDate(w.start)}: {money(w.cents)}</li>)}</ul>}
    {r.otherCurrency > 0 && <p className="fine">{r.otherCurrency} {r.otherCurrency === 1 ? 'purchase' : 'purchases'} in other currencies not counted; amounts are never converted.</p>}
    <p className="fine">Move the round-ups to savings yourself, then record them on this goal. This card only reads your money log and what you record.</p>
  </>;
}
