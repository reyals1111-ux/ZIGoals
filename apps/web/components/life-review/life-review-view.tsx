'use client';
import Link from 'next/link';
import {useMemo, useState} from 'react';
import {lifeReview, reviewPeriod, type Period} from '../../lib/life-review/engine';
import {LIFE_REVIEW, previousFocus, setFocus, setPeriod} from '../../lib/life-review/store';
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

      <CrossInsightsCard habits={habits.error ? {...habits.data, habits: []} : habits.data} health={health.data} today={today} />

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
