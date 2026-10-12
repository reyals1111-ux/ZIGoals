'use client';
import {registerSlotCard, registerProgressCard} from './slot-local';
import {registerHabitTimeCard} from '../habits/habit-time-card';
import {registerCoachCard} from '../health/coach-card';
import {GameSetting} from './game-setting';
import {RemindersLinkCard} from '../reminders/reminders-link-card';
import {ActivityGameCard, HabitsGameCard, HealthGameCard, MarketsGameCard, PortfolioGameCard, TodayGameCard, WealthGameCard} from './progress-card';

/** Registers the game cards in every page's progress slot and Today's `today:game` place (once per page load). */
let done = false;
export function registerGameCards() {
  if (done) return; done = true;
  registerSlotCard('today:game', TodayGameCard); registerHabitTimeCard(); registerCoachCard();
  registerSlotCard('settings:your-app', GameSetting); registerSlotCard('settings:reminders', RemindersLinkCard); // AA-Cloud's two Settings places (its Gate A entry)
  // ADR-022 B53: no card in Goals' slot — AA-Cloud's Goals header is a pinned compact layout (logo-quickadd-goals-header.spec.ts); an owner item for the UI-polish run.
  registerProgressCard('habits', HabitsGameCard); registerProgressCard('health', HealthGameCard); registerProgressCard('wealth', WealthGameCard);
  registerProgressCard('markets', MarketsGameCard); registerProgressCard('portfolio', PortfolioGameCard); registerProgressCard('activity', ActivityGameCard);
}
