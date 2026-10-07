'use client';
import {Suspense, lazy, useCallback, useEffect, useMemo, useState} from 'react';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {Platform} from '../../lib/positions';
import type {MarketQuote} from '../../lib/market-quotes';
import type {LocalGoal} from '../../lib/local-ledger';
import type {GoalMetadata} from '@zigoals/shared-types';
import {getAppStorage} from '../../lib/showcase-storage';
import {dismissWhatsNew, whatsNewSeen} from '../../lib/whats-new';
import {reviewState, reviewWindow, weekSummary} from '../../lib/weekly-review/engine';
import {wealthMoney} from '../platform/wealth-view';
import {useFasting} from '../health/use-fasting';
import {useWeeklyReview} from '../weekly-review/use-weekly-review';
import {useHealthGoals} from '../health-goals/use-health-goals';
import {useHabitHealthLinks} from '../habits/use-habit-health-links';
import {useInsightCards, InsightsCard} from '../insights/insights-card';
import {HealthGoalsCard} from '../health-goals/health-goals-card';
import {WeeklyReviewCard} from '../weekly-review/weekly-review-card';
import {FastingLine} from './fasting-line';
import {WhatsNewCard} from './whats-new-card';
import {ForYou, type ForYouCard} from './for-you';
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
import {intentionFrom, wrapUpDay, wrapUpDue} from '../../lib/wrap-up/engine';
import {localClock} from '../../lib/reminders/due';
import {addLocalDays} from '../../lib/local-date';
import {usePagesView} from '../pages/use-pages-view';
import {isShown} from '../../lib/pages/visibility';

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
export function TodayForYou({habits, health, platform, localGoals, metadata, quotes, now, today, financial, showcase}: {habits: HabitData; health: HealthData; platform: Platform; localGoals: readonly LocalGoal[]; metadata: Record<string, GoalMetadata>; quotes: readonly MarketQuote[]; now: number; today: string; financial: boolean; showcase: boolean}) {
  const fasting = useFasting(), review = useWeeklyReview(), healthGoals = useHealthGoals(), links = useHabitHealthLinks(), guide = useGuide(), reminders = useReminders();
  const settings = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), zonePrompt = useDeviceRecord(W_REMINDERS);
  const insights = useInsightCards({habits, health, links: links.loaded && !links.unreadable ? links.data : undefined});
  const [whatsNew, setWhatsNew] = useState<boolean | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const launcher = useLauncherRecord(), [brief, setBrief] = useState<DayBrief | null>(null);
  // Session W Part 13: the evening wrap-up follows this device's clock, checked every half minute.
  const pagesView = usePagesView(), [clock, setClock] = useState<Date | null>(null);
  useEffect(() => { const tick = () => setClock(new Date()); queueMicrotask(tick); const id = setInterval(tick, 30_000); return () => clearInterval(id); }, []);
  const zigiOn = launcher.loaded && launcher.record.enabled && !launcher.record.launcherHidden;
  useEffect(() => { let active = true; queueMicrotask(() => { if (!active) return; try { setWhatsNew(!whatsNewSeen(getAppStorage())); } catch { setWhatsNew(false); } }); return () => { active = false; }; }, [showcase]);
  const dismissNew = useCallback(() => { let ok = false; try { ok = dismissWhatsNew(getAppStorage()); } catch { ok = false; } if (ok) setWhatsNew(false); return ok; }, []);
  const window = useMemo(() => reviewWindow(review.data.weekday, today), [review.data.weekday, today]);
  const summary = useCallback(() => weekSummary({...window, habits, health, platform, localGoals, metadata, quotes, now, financial, review: review.data}), [window, habits, health, platform, localGoals, metadata, quotes, now, financial, review.data]);
  // The Guide (ADR-011): one nudge a day from what Today already loaded, and the review's summary paragraph, only while it is on.
  const guideOn = guide.loaded && !guide.unreadable && guide.data.enabled, reviewOpen = review.loaded && !review.unreadable ? reviewState(review.data, window.weekStart) : 'done';
  const nudge = useMemo(() => {
    if (!guideOn || !reminders.loaded) return null;
    const clock = new Date(now);
    return guideNudge({guide: guide.data, habits, health, reminders: reminders.data, goals: unifiedGoalSummaries(localGoals, metadata, platform, quotes, now), insights: insights.cards, review: {isReviewDay: localWeekday(today) === review.data.weekday, state: reviewOpen}, now: clock, today: habitCalendarDay(habits, clock)});
  }, [guideOn, guide.data, reminders.loaded, reminders.data, habits, health, localGoals, metadata, platform, quotes, now, insights.cards, today, review.data.weekday, reviewOpen]);
  const guideNote = useMemo(() => guideOn ? guideWeekSummary({...window, habits, health, platform, financial, review: review.data, now}) : undefined, [guideOn, window, habits, health, platform, financial, review.data, now]);
  const cards: ForYouCard[] = [];
  if (fasting.loaded && fasting.running) cards.push({id: 'fasting', priority: 1, node: <FastingLine running={fasting.running} now={fasting.now} />});
  if (whatsNew) cards.push({id: 'whats-new', priority: 2, node: <WhatsNewCard onDismiss={dismissNew} />});
  if (review.loaded && !review.unreadable) { const state = reviewState(review.data, window.weekStart); if (state === 'due' || state === 'draft') cards.push({id: 'weekly-review', priority: 3, node: <WeeklyReviewCard store={review} weekStart={window.weekStart} weekEnd={window.weekEnd} summary={summary} financial={financial} formatWealth={formatWealth} onDone={setReviewNote} guideNote={guideNote} />}); }
  if (nudge) cards.push({id: 'guide', priority: 4, node: <GuideCard nudge={nudge} today={habitCalendarDay(habits, new Date(now))} onNotToday={guide.dismiss} />});
  if (healthGoals.loaded && !healthGoals.unreadable && healthGoals.data.goals.some(g => g.status === 'active')) cards.push({id: 'health-goals', priority: 5, node: <HealthGoalsCard goals={healthGoals.data} health={health} />});
  if (insights.cards.length) cards.push({id: 'insights', priority: 6, node: <InsightsCard {...insights} />});
  if (zigiOn && brief) cards.push({id: 'zigi-brief', priority: 7, node: <Suspense fallback={null}><BriefCard {...brief} /></Suspense>});
  // Session W Part 17 (T2-A): once Habits or Health count days in this device's zone and none is written down, offer it once.
  const zoneMatters = habits.habits.length > 0 || health.diary.length > 0 || health.weights.length > 0 || health.activity.length > 0 || dailyData(health).water.length > 0;
  if (!showcase && zoneMatters && settings.loaded && !settings.error && !settings.data.journalTimeZone && !habits.timeZone && !dailyData(health).preferences.timezone && zonePrompt.loaded && !zonePrompt.unreadable && !zonePrompt.data.dismissed[JOURNAL_ZONE_PROMPT])
    cards.push({id: 'journal-zone', priority: 8, node: <JournalZoneCard zone={deviceTimeZone()} onUse={() => settings.update(current => withJournalZone(current, deviceTimeZone())).then(() => undefined)} onLater={() => { try { zonePrompt.update(r => ({...r, dismissed: {...r.dismissed, [JOURNAL_ZONE_PROMPT]: today}})); return true; } catch { return false; } }} />});
  // Session W Part 13: the evening wrap-up, once its time has come and until the day is wrapped up; below the open card.
  if (settings.loaded && !settings.error && clock && wrapUpDue(settings.data, today, localClock(clock)))
    cards.push({id: 'wrap-up', priority: 9, node: <WrapUpCard habits={habits} health={health} now={clock.getTime()} showHabits={isShown(pagesView, 'habits')} showHealth={isShown(pagesView, 'health')} onWrap={intention => settings.update(current => wrapUpDay(current, today, intention, new Date().toISOString())).then(() => true, () => false)} />});
  const intention = settings.loaded && !settings.error ? intentionFrom(settings.data, addLocalDays(today, -1)) : null;
  return <>{zigiOn && <Suspense fallback={null}><BriefProbe onBrief={setBrief} /></Suspense>}<ForYou cards={cards} status={reviewNote} note={intention ? <p className="for-you-intention"><span>Your intention for today</span> {intention}</p> : null} /></>;
}
