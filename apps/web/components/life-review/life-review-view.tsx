'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {lifeReview, reviewPeriod, type Period} from '../../lib/life-review/engine';
import {LIFE_REVIEW, MAX_VALUES, VALUE_SUGGESTIONS, previousFocus, rateValue, setFocus, setPeriod, setValues} from '../../lib/life-review/store';
import {yourDays} from '../../lib/life-review/your-days';
import {MONEY_LOG} from '../../lib/money-log/schema';
import {JOURNAL} from '../../lib/journal/schema';
import {ENERGY, ENERGY_WORDS} from '../../lib/energy/schema';
import {healthGroupIn} from '../../lib/vault/w-homes';
import {reviewState, reviewWindow, weekSummary} from '../../lib/weekly-review/engine';
import {wealthMarketRequests, wealthOverview} from '../../lib/wealth';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {formatMoney, formatSignedMoney} from '../../lib/visual-format';
import {drawShareCard, shareOrSave} from '../../lib/share-image';
import {isShown} from '../../lib/pages/visibility';
import {useDeviceRecord} from '../ai/use-device-record';
import {useHabits} from '../habits/use-habits';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useUnifiedGoals} from '../use-unified-goals';
import {useGoals} from '../goal-provider';
import {useAverageGoals} from '../goals/use-average-goals';
import {useGoalExtras} from '../goals/use-goal-extras';
import {useLocalToday} from '../use-local-today';
import {usePagesView} from '../pages/use-pages-view';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {WeeklyReviewCard} from '../weekly-review/weekly-review-card';
import {wealthMoney} from '../platform/wealth-money';
import {CrossInsightsCard} from '../insights/cross-insights-card';
import {Slot} from '../progress/slot';
import {SectionHeading} from '../ui/section-heading';
import {showToast} from '../ui/undo-toast';
import {formatDay} from '../goals/format';
import './life-review.css';
import { unitFor } from '../../lib/plural';

/**
 * The Life review (Session AA-Cloud Part 5, S2): a week or a month across Goals, Habits, Health and Wealth, beside the
 * period before it. Highlights, wins, streaks, the goals that moved, the plans behind them, Health's trends, each
 * currency's recorded change (never converted), the cross-pillar insights and one focus for the next period. The weekly
 * reflection (six steps, the person's own words) is kept as it was and opens from here too. A place stays for
 * Session AA-Local's coach card (`review:coach`). Nothing is sent anywhere; the share image is drawn on this device.
 */
export function LifeReviewView() {
  const record = useDeviceRecord(LIFE_REVIEW), today = useLocalToday();
  const habits = useHabits(), health = useHealth(), platform = usePlatform(), goals = useUnifiedGoals(), averages = useAverageGoals(), extras = useGoalExtras(), legacy = useGoals(), pages = usePagesView();
  const [chosen, setChosen] = useState<Period | null>(null), [now] = useState(() => Date.now());
  const market = useMarketQuotes(platform.error ? false : wealthMarketRequests(platform.data));
  const period: Period = chosen ?? (record.loaded ? record.data.period ?? 'week' : 'week');
  const window = useMemo(() => reviewPeriod(period, today), [period, today]);
  const ready = habits.loaded && health.loaded && platform.loaded && goals.loaded && averages.loaded && extras.loaded;
  const review = useMemo(() => !ready ? null : lifeReview({
    window, habits: habits.error ? {...habits.data, habits: []} : habits.data, health: health.data, platform: platform.data,
    goals: goals.goals.map(g => ({key: g.key, id: g.id, name: g.name, href: g.href, status: g.status})),
    averages: averages.unreadable ? [] : averages.data.goals, extras: extras.data,
    history: platform.error ? [] : wealthOverview(platform.data, now).history, today,
    current: platform.error ? [] : wealthOverview(platform.data, market.now || now, market.quotes).subtotals,
  }), [ready, window, habits.data, habits.error, health.data, platform.data, platform.error, goals.goals, averages.data, averages.unreadable, extras.data, today, now, market.now, market.quotes]);
  const [focusDraft, setFocusDraft] = useState<{key: string; text: string} | null>(null);
  const saved = record.loaded ? record.data.focus[window.key]?.text ?? '' : '';
  const focusText = focusDraft?.key === window.key ? focusDraft.text : saved;
  const last = record.loaded ? previousFocus(record.data, window.key) : null;
  const pick = (p: Period) => { setChosen(p); try { record.update(s => setPeriod(s, p)); } catch { /* the view still changes */ } };
  const saveFocus = () => {
    const before = saved;
    try {
      record.update(s => setFocus(s, window.key, focusText, new Date().toISOString()));
      showToast({message: focusText.trim() ? 'Your focus is saved on this device.' : 'Focus cleared.', undo: () => record.update(s => setFocus(s, window.key, before, new Date().toISOString())), undone: 'Focus put back.'});
    } catch { showToast({message: 'Your focus could not be saved on this device.'}); }
  };
  const share = async () => {
    if (!review) return;
    const lines = [...review.highlights.filter(l => !/[$€]|put in/.test(l)), ...review.wins.slice(0, 2)].slice(0, 5);
    try {
      const blob = await drawShareCard({eyebrow: `Life review · ${formatDay(window.start)} – ${formatDay(window.end)}`, title: period === 'week' ? 'My week' : 'My month', lines: lines.length ? lines : ['A quiet stretch, and that is fine.'], footer: 'Made on this device with ZIGoals'});
      const how = await shareOrSave(blob, `life-review-${window.key.replace(':', '-')}.png`, period === 'week' ? 'My week' : 'My month');
      showToast({message: how === 'shared' ? 'Shared.' : 'Image saved.'});
    } catch { showToast({message: 'The image could not be made on this device.'}); }
  };
  const financial = isShown(pages, 'wealth') || isShown(pages, 'goals');

  return <div className="life-review">
    <div className="life-review-period" role="group" aria-label="Review period">
      {(['week', 'month'] as const).map(p => <button key={p} type="button" aria-pressed={period === p} onClick={() => pick(p)}>{p === 'week' ? 'This week' : 'This month'}</button>)}
      <p>{formatDay(window.start)} – {formatDay(window.end)} · beside {formatDay(window.prevStart)} – {formatDay(window.prevEnd)}</p>
    </div>
    {!review ? <div className="aa-skeleton" aria-hidden="true"><i /><i /><i /></div> : <>
      <section className="panel life-review-hero life-review-cover" aria-labelledby="life-review-highlights">
        {/* Phase 2, Part 9 (owner request 35): the review as a small magazine — this cover, then one chapter per pillar. */}
        <p className="life-cover-kicker" aria-hidden="true">{period === 'week' ? 'Your week' : 'Your month'}, in {financial ? 'four' : 'three'} chapters.</p>
        <SectionHeading id="life-review-highlights" eyebrow={`${formatDay(window.start)} – ${formatDay(window.end)}`} title="Highlights" action={<button type="button" className="secondary" onClick={() => void share()}>Share as an image</button>} />
        {review.highlights.length ? <ul className="life-highlights">{review.highlights.map(h => <li key={h}>{h}</li>)}</ul> : <div className="aa-empty"><h3>A quiet {period}.</h3><p>Check in a habit, log a meal or water, or record a contribution, and your review fills from your own records.</p><Link className="primary" href="/app/habits">Open Habits</Link></div>}
        <dl className="life-counts">
          <div><dt>Habit check-ins</dt><dd>{review.counts.habitCheckIns}</dd></div>
          <div><dt>Days with Health records</dt><dd>{review.counts.healthDays}</dd></div>
          <div><dt>Goal contributions</dt><dd>{review.counts.contributions}</dd></div>
        </dl>
      </section>

      <div className="life-review-grid life-chapters">
        <section className="panel life-wins" aria-labelledby="life-review-wins">
          <SectionHeading id="life-review-wins" eyebrow="Worth noticing" title="Wins" level={3} />
          {review.wins.length ? <ul className="life-list">{review.wins.map(w => <li key={w}>{w}</li>)}</ul> : <p className="life-none">No finished goals or perfect habits in this {period} yet.</p>}
        </section>
        <section className="panel life-chapter" data-pillar="goals" data-chapter="1" aria-labelledby="life-review-goals">
          <SectionHeading id="life-review-goals" pillar="goals" eyebrow="Chapter 1 · Goals" title="Goals that moved" level={3} />
          {review.goalsMoved.length ? <ul className="life-list">{review.goalsMoved.map((g, i) => <li key={`${g.name}-${i}`}><Link href={g.href}>{g.name}</Link><span>{g.line}</span></li>)}</ul> : <p className="life-none">No contributions or milestones recorded in this {period}.</p>}
          {review.plans.length > 0 && <div className="life-plans"><p className="eyebrow">The plans behind them</p>{review.plans.map(p => <p key={p.name}><strong>{p.name}</strong>{p.why && <> · why: {p.why}</>}{p.ifThen && <> · if-then: {p.ifThen}</>}</p>)}</div>}
        </section>
        <section className="panel life-chapter" data-pillar="habits" data-chapter="2" aria-labelledby="life-review-streaks">
          <SectionHeading id="life-review-streaks" pillar="habits" eyebrow="Chapter 2 · Habits" title="Streaks" level={3} />
          {review.streaks.length ? <ul className="life-list">{review.streaks.map(s => <li key={s.title}><strong>{s.title}</strong><span>{s.streak} {unitFor(s.streak, s.unit)}</span></li>)}</ul> : <p className="life-none">No streak running yet.</p>}
        </section>
        <section className="panel life-chapter" data-pillar="health" data-chapter="3" aria-labelledby="life-review-health">
          <SectionHeading id="life-review-health" pillar="health" eyebrow="Chapter 3 · Health" title="Trends" level={3} />
          <table className="life-trends"><thead><tr><th scope="col">Measure</th><th scope="col">This {period}</th><th scope="col">Before</th></tr></thead>
            <tbody>{review.health.map(t => <tr key={t.label}><th scope="row">{t.label}<small>{t.detail}</small></th><td className={t.now ? 'nowrap' : undefined}>{t.now ?? 'Not recorded'}</td><td className={t.before ? 'nowrap' : undefined}>{t.before ?? 'Not recorded'}</td></tr>)}</tbody></table>
          <p className="fine">Averages of the days you recorded; a day without a record is left out, never counted as zero. Not advice.</p>
        </section>
        {financial && <section className="panel life-chapter" data-pillar="wealth" data-chapter="4" aria-labelledby="life-review-money">
          <SectionHeading id="life-review-money" pillar="wealth" eyebrow="Chapter 4 · Wealth" title="Tracked wealth, by currency" level={3} />
          {review.money.length ? <ul className="life-list">{review.money.map(m => <li key={m.currency}><strong>{m.currency}</strong><span>{m.change !== null ? `${formatSignedMoney(m.change, m.currency)} · ${formatMoney(m.start!, m.currency)} → ${formatMoney(m.end!, m.currency)}` : m.note}</span></li>)}</ul> : <p className="life-none">No recorded wealth values yet. Values recorded on Wealth show their change here, each in its own currency.</p>}
          <p className="fine">What Wealth tracks, each currency on its own, never converted; today&rsquo;s figure is the one Wealth shows today. Accounts and debts are in Wealth&rsquo;s net worth. A missing value is never filled in.</p>
        </section>}
      </div>

      <YourDaysChapter start={window.start} end={window.end} period={period} moods={health.loaded ? healthGroupIn(health.data, 'moods') ?? undefined : undefined} financial={financial} />
      <CrossInsightsCard habits={habits.error ? {...habits.data, habits: []} : habits.data} health={health.data} today={today} />
      {period === 'week' && <ValuesCheck weekKey={window.key} />}

      <section className="panel life-focus" aria-labelledby="life-review-focus">
        <SectionHeading id="life-review-focus" eyebrow={`Next ${period}`} title="One focus" level={3} lede={last ? <>Last {period} you chose: <q>{last.text}</q></> : 'One small thing to carry into the next ' + period + '.'} />
        <form onSubmit={e => { e.preventDefault(); saveFocus(); }}>
          <label className="field">Your focus<input value={focusText} maxLength={280} placeholder="For example: bed by 23:00 on weeknights" onChange={e => setFocusDraft({key: window.key, text: e.target.value})} /></label>
          <button type="submit" className="primary" disabled={!record.loaded || record.unreadable || focusText.trim() === saved.trim()}>Save focus</button>
        </form>
        <p className="fine">Kept on this device for now.</p>
      </section>

      <Slot place="review:coach" />
      {period === 'week' && <WeeklyReflection financial={financial} habits={habits.data} health={health.data} platform={platform.data} legacy={legacy} today={today} />}
    </>}
  </div>;
}

/** The weekly review's six-step reflection, exactly as Today offers it, so the review keeps everything it did. */
function WeeklyReflection({financial, habits, health, platform, legacy, today}: {financial: boolean; habits: Parameters<typeof weekSummary>[0]['habits']; health: Parameters<typeof weekSummary>[0]['health']; platform: Parameters<typeof weekSummary>[0]['platform']; legacy: ReturnType<typeof useGoals>; today: string}) {
  const store = useWeeklyReview(), [note, setNote] = useState(''), [now] = useState(() => Date.now());
  if (!store.loaded || store.unreadable) return null;
  const w = reviewWindow(store.data.weekday, today), state = reviewState(store.data, w.weekStart);
  const summary = () => weekSummary({...w, habits, health, platform, localGoals: legacy.goals, metadata: legacy.metadata?.goals ?? {}, now, financial, review: store.data});
  return <section className="life-reflection" aria-label="Your weekly reflection">
    {state === 'done' || state === 'skipped' ? <p className="fine">{note || (state === 'done' ? `Your reflection for ${formatDay(w.weekStart)} – ${formatDay(w.weekEnd)} is saved on this device.` : `You skipped the reflection for ${formatDay(w.weekStart)} – ${formatDay(w.weekEnd)}.`)}</p>
      : <WeeklyReviewCard store={store} weekStart={w.weekStart} weekEnd={w.weekEnd} summary={summary} financial={financial} formatWealth={s => wealthMoney(s.value, s.currency)} onDone={setNote} />}
  </section>;
}

/**
 * Session AI (G13): the newer records of the period across life — money spent and received (the expense log, each
 * currency on its own), journal entries, the average daily energy and evening mood, with the days behind each.
 */
function YourDaysChapter({start, end, period, moods, financial}: {start: string; end: string; period: string; moods?: {days: Record<string, {mood: number}>}; financial: boolean}) {
  const money = useDeviceRecord(MONEY_LOG), journal = useDeviceRecord(JOURNAL), energy = useDeviceRecord(ENERGY);
  const days = useMemo(() => yourDays({start, end, money: money.data, journal: journal.data, energy: energy.data, moods}), [start, end, money.data, journal.data, energy.data, moods]);
  const empty = !days.money.length && !days.journal && !days.energy && !days.mood;
  return <section className="panel life-chapter life-your-days" data-chapter="5" aria-labelledby="life-review-days">
    <SectionHeading id="life-review-days" eyebrow="Chapter 5 · Your days" title="Spending, journal, energy and mood" level={3} />
    {empty ? <p className="life-none">Nothing in the expense log, the journal, energy or mood this {period} yet.</p> : <ul className="life-list">
      {financial && days.money.map(m => <li key={m.currency}><strong>{m.currency}</strong><span>spent {formatMoney(m.spent.toFixed(2), m.currency)}{m.received ? ` · received ${formatMoney(m.received.toFixed(2), m.currency)}` : ''} · {m.entries} {m.entries === 1 ? 'entry' : 'entries'}</span></li>)}
      {days.journal > 0 && <li><strong>Journal</strong><span>{days.journal} {days.journal === 1 ? 'entry' : 'entries'}</span></li>}
      {days.energy && <li><strong>Energy</strong><span>{days.energy.average} of 5 on average ({ENERGY_WORDS.en[Math.round(days.energy.average) - 1]}), {days.energy.days} {days.energy.days === 1 ? 'day' : 'days'} rated</span></li>}
      {days.mood && <li><strong>Evening mood</strong><span>{days.mood.average} of 5 on average, {days.mood.days} {days.mood.days === 1 ? 'day' : 'days'} answered</span></li>}
    </ul>}
    <p className="fine">From your own records on this device; a day without a record is left out, never counted as zero. Never converted, not advice.</p>
  </section>;
}
/**
 * Session AI (feature 9, GO14): the values check — up to three values in the person's own words, and each week a 1–5
 * answer to "how much did this week reflect it?", beside last week's. Kept in the Life review's own record on this device.
 */
function ValuesCheck({weekKey}: {weekKey: string}) {
  const record = useDeviceRecord(LIFE_REVIEW), [draft, setDraft] = useState<string[] | null>(null), [own, setOwn] = useState(''), [note, setNote] = useState('');
  if (!record.loaded) return null;
  const values = record.data.values ?? [], editing = draft !== null || !values.length, chosen = draft ?? values;
  const ratings = record.data.valueChecks?.[weekKey]?.ratings ?? {};
  const previous = Object.keys(record.data.valueChecks ?? {}).filter(k => k.startsWith('week:') && k < weekKey).sort().at(-1);
  const before = previous ? record.data.valueChecks![previous]!.ratings : {};
  const toggle = (v: string) => setDraft(chosen.includes(v) ? chosen.filter(x => x !== v) : chosen.length < MAX_VALUES ? [...chosen, v] : chosen);
  const save = () => { try { record.update(s => setValues(s, chosen)); setDraft(null); setNote(chosen.length ? 'Your values are saved on this device.' : 'Your values are cleared.'); } catch (cause) { setNote(cause instanceof Error ? cause.message : 'This could not be saved.'); } };
  const rate = (v: string, n: number) => { try { record.update(s => rateValue(s, weekKey, v, n, new Date().toISOString())); setNote(`${v}: ${n} of 5 this week.`); } catch (cause) { setNote(cause instanceof Error ? cause.message : 'This could not be saved.'); } };
  return <section className="panel life-values" aria-labelledby="life-review-values">
    <SectionHeading id="life-review-values" eyebrow="Your values" title="Did this week reflect them?" level={3} lede={editing ? `Choose up to ${MAX_VALUES} that matter most to you, or write your own.` : undefined} />
    {editing ? <>
      <div className="life-value-chips" role="group" aria-label="Values to choose from">{[...new Set([...VALUE_SUGGESTIONS, ...chosen])].map(v => <button key={v} type="button" className="secondary" aria-pressed={chosen.includes(v)} onClick={() => toggle(v)}>{v}</button>)}</div>
      <form className="life-value-own" onSubmit={e => { e.preventDefault(); const word = own.trim(); if (word && chosen.length < MAX_VALUES && !chosen.includes(word)) { setDraft([...chosen, word]); setOwn(''); } }}>
        <label className="field">Your own word<input value={own} maxLength={40} onChange={e => setOwn(e.target.value)} placeholder="For example: Patience" /></label>
        <button type="submit" className="secondary" disabled={!own.trim() || chosen.length >= MAX_VALUES}>Add</button>
      </form>
      <div className="actions"><button type="button" className="primary" onClick={save} disabled={!chosen.length && !values.length}>Save values</button>{values.length > 0 && <button type="button" className="quiet" onClick={() => setDraft(null)}>Cancel</button>}</div>
    </> : <>
      {values.map(v => <fieldset key={v} className="life-value-rate"><legend>{v}{before[v] ? <small> · last week {before[v]} of 5</small> : null}</legend>
        {[1, 2, 3, 4, 5].map(n => <label key={n}><input type="radio" name={`value-${v}`} checked={ratings[v] === n} onChange={() => rate(v, n)} /><span>{n}</span></label>)}
      </fieldset>)}
      <p className="fine">1 not at all · 5 fully. Your own answer; nothing is scored or sent.</p>
      <button type="button" className="text-link" onClick={() => setDraft(values)}>Change your values</button>
    </>}
    {note && <p role="status" className="fine">{note}</p>}
  </section>;
}
