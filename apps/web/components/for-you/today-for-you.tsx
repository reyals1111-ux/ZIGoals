'use client';
import {Suspense, lazy, useCallback, useEffect, useMemo, useState, type ReactNode} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import type {LocalGoal} from '../../lib/local-ledger';
import type {GoalMetadata} from '@zigoals/shared-types';
import {getAppStorage} from '../../lib/showcase-storage';
import {dismissWhatsNew, whatsNewSeen} from '../../lib/whats-new';
import {reviewState, reviewWindow, weekSummary} from '../../lib/weekly-review/engine';
import {wealthMoney} from '../platform/wealth-money';
import {useFasting} from '../health/use-fasting';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {useHealthGoals} from '../health-goals/use-health-goals';
import {useHabitHealthLinks} from '../habits/use-habit-health-links';
import {useInsightCards, InsightsCard} from '../insights/insights-card';
import {HealthGoalsCard} from '../health-goals/health-goals-card';
import {WeeklyReviewCard} from '../weekly-review/weekly-review-card';
import {FastingLine} from './fasting-line';
// Session Z-Local (ADR-020 L60): the card and its link lists load on use (Today sat at 514.9 of its 515.0 kB), as the brief card does.
const WhatsNewCard = lazy(() => import('./whats-new-card').then(m => ({default: m.WhatsNewCard})));
// Session AA-Cloud Part 5: the Life review's door and the cross-pillar insights load after Today itself (weights).
const LifeReviewTeaser = lazy(() => import('../life-review/life-review-teaser').then(m => ({default: m.LifeReviewTeaser})));
const CrossInsightsCard = lazy(() => import('../insights/cross-insights-card').then(m => ({default: m.CrossInsightsCard})));
import {ForYou, TODAY_FOR_YOU_OPEN, type ForYouCard} from './for-you';
import {useGuide} from '../coach/use-guide';
import {useReminders} from '../reminders/use-reminders';
import {GuideCard} from '../coach/guide-card';
import {guideNudge} from '../../lib/coach/guide';
import {guideWeekSummary} from '../../lib/coach/summary';
import {unifiedGoalSummaries} from '../../lib/goal-summary';
import {habitCalendarDay} from '../../lib/habits';
import {localWeekday} from '../../lib/local-date';
import {useLauncherRecord} from '../ai/use-launcher-record';
import type {DayBrief} from '../ai/zigi-brief';
import {usePrivateStore} from '../use-private-store';
import {useDeviceRecord} from '../ai/use-device-record';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, withJournalZone} from '../../lib/dashboard-settings';
import {W_REMINDERS} from '../../lib/reminders/w-schema';
import {dailyData} from '../../lib/health-daily';
import {deviceTimeZone} from '../../lib/journal-zone';
import {JournalZoneCard} from './journal-zone-card';
import {WrapUpCard} from './wrap-up-card';
import {intentionFrom, wrapUpDay, wrapUpDue, wrapUpEnabled, wrappedUp} from '../../lib/wrap-up/engine';
import {localClock} from '../../lib/reminders/due';
import {addLocalDays} from '../../lib/local-date';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';
import {LoadBoundary} from '../load-boundary';
import {everyHalfMinute} from '../half-minute';
import {TodayEarnCard, useTodayEarnCard} from '../earn/today-earn-card';
import {TodayStoriesCard, useTodayStoriesCard} from '../stories/today-stories-card';
import {TodayTimelineCard} from '../timeline/today-timeline-card';
import {TodayUniverseCard} from '../universe/today-universe-card';
import {TodayJournalCard} from '../journal/today-journal-card';
import {TodayTasksCard} from '../tasks/today-tasks-card';

/** The key, in Session W's reminders record, that remembers "Not now" for the time zone card (lib/reminders/w-schema.ts). */
const JOURNAL_ZONE_PROMPT = 'journal-zone';

// Session V Part 9: ZIGi's morning brief, loaded only while ZIGi is on and its launcher shows.
const BriefProbe = lazy(() => import('../ai/zigi-brief').then(m => ({default: m.BriefProbe})));
const BriefCard = lazy(() => import('../ai/zigi-brief').then(m => ({default: m.BriefCard})));

const formatWealth = (s: {currency: string; value: bigint}) => wealthMoney(s.value, s.currency);
/**
 * Today's "For you" cards (Session P): the fasting line while a fast runs, the one-time "What's new", the weekly review
 * when due, the health goals and the insight cards; at most two open (components/for-you/for-you.tsx). Every card reads
 * this device's own key and writes only when the person acts on it.
 */
/** Where Today places each part (Session AA-Cloud Part 1): the fasting clock in "Today's focus", the cards for the day
 * after the widgets, and What's new, the weekly review and the wrap-up with the summaries at the end. */
export type ForYouParts = {focus: ReactNode; main: ReactNode; end: ReactNode};
// Session AH (TO2): once due, the wrap-up stands open in Today's focus (at the end it had folded away, on a phone always).
const END_CARDS = new Set(['whats-new', 'weekly-review', 'life-review']), FOCUS_CARDS = new Set(['fasting', 'wrap-up']);
export function TodayForYou({habits, health, platform, localGoals, metadata, quotes, now, today, financial, showcase, render, reviewOnToday = false}: {reviewOnToday?: boolean; habits: HabitData; health: HealthData; platform: Platform; localGoals: readonly LocalGoal[]; metadata: Record<string, GoalMetadata>; quotes: readonly MarketQuote[]; now: number; today: string; financial: boolean; showcase: boolean; render?: (parts: ForYouParts) => ReactNode}) {
  const fasting = useFasting(), review = useWeeklyReview(), healthGoals = useHealthGoals(), links = useHabitHealthLinks(), guide = useGuide(), reminders = useReminders();
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), zonePrompt = useDeviceRecord(W_REMINDERS);
  const insights = useInsightCards({habits, health, links: links.loaded && !links.unreadable ? links.data : undefined});
  const [whatsNew, setWhatsNew] = useState<boolean | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const launcher = useLauncherRecord(), [brief, setBrief] = useState<DayBrief | null>(null);
  // Session W Part 13: the evening wrap-up follows this device's clock, checked every half minute.
  const pagesView = usePagesView(), [clock, setClock] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setClock(new Date()); queueMicrotask(tick); return everyHalfMinute(tick); }, []);
  // Session AH (TO2): "Start the wrap-up now" in Settings opens Today with ?wrap-up=now, before its time.
  const [startNow, setStartNow] = useState(false);
  useEffect(() => { queueMicrotask(() => { try { setStartNow(new URLSearchParams(globalThis.location.search).get('wrap-up') === 'now'); } catch { setStartNow(false); } }); }, []);
  const zigiOn = launcher.loaded && launcher.record.enabled && !launcher.record.launcherHidden;
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; try { setWhatsNew(!whatsNewSeen(getAppStorage())); } catch { setWhatsNew(false); } }); return () => { active = false; }; }, [showcase]);
  const dismissNew = useCallback(() => { let ok = false; try { ok = dismissWhatsNew(getAppStorage()); } catch { ok = false; } if (ok) setWhatsNew(false); return ok; }, []);
  const window = useMemo(() => reviewWindow(review.data.weekday, today), [review.data.weekday, today]);
  const summary = useCallback(() => weekSummary({...window, habits, health, platform, localGoals, metadata, quotes, now, financial, review: review.data}), [window, habits, health, platform, localGoals, metadata, quotes, now, financial, review.data]);
  // The Guide (ADR-011): one nudge a day from what Today already loaded, and the review's summary paragraph, only while it is on.
  // Session X P2.1 (first week): a week that ended before the person began (nothing recorded in it, no habit due in it,
  // no Goal made by its end) is not offered for review: a new person was asked what went well in the week before they
  // started. Any later week is offered as before, and a draft always comes back.
  const weekBegun = useMemo(() => {
    if (!review.loaded || review.unreadable) return false;
    const s = summary(), w = s.wentWell;
    return w.habitCheckIns + w.healthEntries + w.goalContributions > 0 || s.habits.some(h => h.scheduled > 0) || platform.goals.some(g => g.createdAt.slice(0, 10) <= window.weekEnd);
  }, [review.loaded, review.unreadable, summary, platform.goals, window.weekEnd]);
  const reviewOpen = review.loaded && !review.unreadable ? ((state: ReturnType<typeof reviewState>) => state === 'due' && !weekBegun ? 'done' as const : state)(reviewState(review.data, window.weekStart)) : 'done';
  const guideOn = guide.loaded && !guide.unreadable && guide.data.enabled;
  const nudge = useMemo(() => {
    if (!guideOn || !reminders.loaded) return null;
    const clock = new Date(now);
    return guideNudge({guide: guide.data, habits, health, reminders: reminders.data, goals: unifiedGoalSummaries(localGoals, metadata, platform, quotes, now), insights: insights.cards, review: {isReviewDay: localWeekday(today) === review.data.weekday, state: reviewOpen}, now: clock, today: habitCalendarDay(habits, clock)});
  }, [guideOn, guide.data, reminders.loaded, reminders.data, habits, health, localGoals, metadata, platform, quotes, now, insights.cards, today, review.data.weekday, reviewOpen]);
  const guideNote = useMemo(() => guideOn ? guideWeekSummary({...window, habits, health, platform, financial, review: review.data, now}) : undefined, [guideOn, window, habits, health, platform, financial, review.data, now]);
  // Session AF (L1, P1.30; ADR-028 H104): the newcomer's "Learn to stake, earn and swap" card is a For you card, added
  // only while it shows (no position yet, not dismissed), so on a phone it folds behind the one open card like the others.
  const earnCard = useTodayEarnCard();
  // Session AF (L5b, H104's rule for Today on a phone): the Day Timeline and My Universe are For you cards, and Stories' door
  // joins only while the week's story is ready and unopened; on a phone they wait behind "Show more" like every For you card.
  const storiesCard = useTodayStoriesCard({habits, health, platform, today});
  const cards: ForYouCard[] = [];
  if (fasting.loaded && fasting.running) cards.push({id: 'fasting', priority: 1, node: <FastingLine running={fasting.running} now={fasting.now} />});
  if (whatsNew) cards.push({id: 'whats-new', priority: 2, node: <LoadBoundary quiet><Suspense fallback={null}><WhatsNewCard onDismiss={dismissNew} /></Suspense></LoadBoundary>});
  if (review.loaded && !review.unreadable) { const state = reviewOpen; if (state === 'due' || state === 'draft') cards.push({id: 'weekly-review', priority: 3, node: <WeeklyReviewCard store={review} weekStart={window.weekStart} weekEnd={window.weekEnd} summary={summary} financial={financial} formatWealth={formatWealth} onDone={setReviewNote} guideNote={guideNote} />}); }
  if (earnCard.state === 'shown') cards.push({id: 'earn-start', priority: 4.5, node: <TodayEarnCard />});
  cards.push({id: 'timeline', priority: 3.5, node: <TodayTimelineCard />});
  if (storiesCard.state === 'shown') cards.push({id: 'stories', priority: 4.6, node: <TodayStoriesCard loggedDays={storiesCard.loggedDays} />});
  cards.push({id: 'universe', priority: 6.5, node: <TodayUniverseCard />});
  // Session AI (feature 6): the journal and today's energy, with ZIGi's one question.
  cards.push({id: 'journal', priority: 6.6, node: <TodayJournalCard />});
  // Session AI (tasks with a priority and a due date): one-off things to do, overdue and today's first.
  cards.push({id: 'tasks', priority: 6.4, node: <TodayTasksCard />});
  if (nudge) cards.push({id: 'guide', priority: 4, node: <GuideCard nudge={nudge} today={habitCalendarDay(habits, new Date(now))} onNotToday={guide.dismiss} />});
  if (healthGoals.loaded && !healthGoals.unreadable && healthGoals.data.goals.some(g => g.status === 'active')) cards.push({id: 'health-goals', priority: 5, node: <HealthGoalsCard goals={healthGoals.data} health={health} />});
  if (insights.cards.length) cards.push({id: 'insights', priority: 6, node: <InsightsCard {...insights} />});
  if (habits.habits.length && (health.activity.length || (health.sleep?.nights.length ?? 0) > 0)) cards.push({id: 'cross-insights', priority: 6.5, node: <LoadBoundary quiet><Suspense fallback={null}><CrossInsightsCard habits={habits} health={health} today={today} compact /></Suspense></LoadBoundary>});
  if (zigiOn && brief) cards.push({id: 'zigi-brief', priority: 7, node: <LoadBoundary quiet><Suspense fallback={null}><BriefCard {...brief} /></Suspense></LoadBoundary>});
  // Session W Part 17 (T2-A): once Habits or Health count days in this device's zone and none is written down, offer it once.
  const zoneMatters = habits.habits.length > 0 || health.diary.length > 0 || health.weights.length > 0 || health.activity.length > 0 || dailyData(health).water.length > 0;
  if (!showcase && zoneMatters && settings.loaded && !settings.error && !settings.data.journalTimeZone && !habits.timeZone && !dailyData(health).preferences.timezone && zonePrompt.loaded && !zonePrompt.unreadable && !zonePrompt.data.dismissed[JOURNAL_ZONE_PROMPT])
    cards.push({id: 'journal-zone', priority: 8, node: <JournalZoneCard zone={deviceTimeZone()} onUse={() => settings.update(current => withJournalZone(current, deviceTimeZone())).then(() => undefined)} onLater={() => { try { zonePrompt.update(r => ({...r, dismissed: {...r.dismissed, [JOURNAL_ZONE_PROMPT]: today}})); return true; } catch { return false; } }} />});
  // Session W Part 13: the evening wrap-up, once its time has come and until the day is wrapped up; below the open card.
  if (settings.loaded && !settings.error && clock && (wrapUpDue(settings.data, today, localClock(clock)) || startNow && wrapUpEnabled(settings.data) && !wrappedUp(settings.data, today)))
    cards.push({id: 'wrap-up', priority: 9, node: <WrapUpCard habits={habits} health={health} now={clock.getTime()} showHabits={isShown(pagesView, 'habits')} showHealth={isShown(pagesView, 'health')} onWrap={intention => settings.update(current => wrapUpDay(current, today, intention, new Date().toISOString())).then(() => true, () => false)} />});
  // Session AA-Cloud Part 5: the Life review's door, with the summaries at the end, once there is something to review.
  // Not when the person keeps the Life review among Today's cards on this device (Part 8): it shows there instead.
  if (!reviewOnToday && (habits.habits.length || health.activity.length || health.diary.length || platform.goals.length)) cards.push({id: 'life-review', priority: 10, node: <LoadBoundary quiet><Suspense fallback={null}><LifeReviewTeaser habits={habits} health={health} platform={platform} goals={unifiedGoalSummaries(localGoals, metadata, platform, quotes, now)} today={today} /></Suspense></LoadBoundary>});
  const intention = settings.loaded && !settings.error ? intentionFrom(settings.data, addLocalDays(today, -1)) : null;
  const probe = zigiOn && <LoadBoundary quiet><Suspense fallback={null}><BriefProbe onBrief={setBrief} /></Suspense></LoadBoundary>;
  const note = intention ? <p className="for-you-intention"><span>Your intention for today</span> {intention}</p> : null;
  if (!render) return <>{probe}<ForYou cards={cards} status={reviewNote} note={note} /></>;
  const focus = cards.filter(c => FOCUS_CARDS.has(c.id)), end = cards.filter(c => END_CARDS.has(c.id)), main = cards.filter(c => !FOCUS_CARDS.has(c.id) && !END_CARDS.has(c.id));
  return <>{probe}{render({
    focus: focus.length ? <>{focus.map(c => <div key={c.id} id={`for-you-${c.id}`} className="for-you-slot" data-card={c.id}>{c.node}</div>)}</> : null,
    main: <ForYou cards={main} note={note} openCards={TODAY_FOR_YOU_OPEN} />,
    end: <ForYou cards={end} status={reviewNote} label="Updates and summaries" openCards={TODAY_FOR_YOU_OPEN} />,
  })}</>;
}
