'use client';
import {registerSlotCard, registerProgressCard} from './slot-local';
import {registerHabitTimeCard} from '../habits/habit-time-card';
import {ActivityGameCard, GoalsGameCard, HabitsGameCard, HealthGameCard, MarketsGameCard, PortfolioGameCard, TodayGameCard, WealthGameCard} from './progress-card';

/** Registers the game cards in every page's progress slot and Today's `today:game` place (once per page load). */
let done = false;
export function registerGameCards() {
  if (done) return; done = true;
  registerSlotCard('today:game', TodayGameCard); registerHabitTimeCard();
  registerProgressCard('goals', GoalsGameCard); registerProgressCard('habits', HabitsGameCard); registerProgressCard('health', HealthGameCard); registerProgressCard('wealth', WealthGameCard);
  registerProgressCard('markets', MarketsGameCard); registerProgressCard('portfolio', PortfolioGameCard); registerProgressCard('activity', ActivityGameCard);
}
