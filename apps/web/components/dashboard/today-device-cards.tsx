'use client';
import {Suspense, lazy, type ReactNode} from 'react';
import type {GoalSummary} from '../../lib/goal-summary';
import type {HabitData} from '../../lib/habits';
import type {HealthData} from '../../lib/health';
import type {MarketQuote} from '../../lib/market-quotes';
import type {Platform} from '../../lib/positions';
import {TODAY_CARD_IDS, type TodayCardId} from '../../lib/today-cards/store';
import {CalculatorCard} from '../calculator/calculator-card';
import {LifeBalanceCard} from '../goals/life-balance-card';
import {PaceForecastsCard} from '../goals/pace-forecasts-card';
import {LifeReviewTeaser} from '../life-review/life-review-teaser';
import {PhoneFold} from '../phone/phone-fold';
import {LoadBoundary} from '../load-boundary';
// Session AK Part 8.2 (lane X): the Daily orbit card loads on its own, only when the person keeps it on Today.
const OrbitCard = lazy(() => import('../orbit-card/orbit-card'));

export const TODAY_CARD_LABELS: Record<TodayCardId, {label: string; description: string}> = {
  balance: {label: 'Life balance', description: 'How each life area moved this month'},
  forecasts: {label: 'Pace forecasts', description: 'Estimated dates from each goal’s own pace'},
  calculator: {label: 'Compound interest calculator', description: 'A door to the calculator'},
  review: {label: 'Life review', description: 'Your week at a glance, here instead of in Updates'},
  orbit: {label: 'Daily orbit', description: 'Today across your pillars and what is next, with a door to the Checklist'},
};

/**
 * Today's cards kept on this device (Session AA-Cloud Part 8): life balance, pace forecasts, the calculator and the Life
 * review, in the order the person chose them while arranging Today. Loaded after the page (weights), folded on phones
 * like Today's other widgets. While Today is being arranged, a chooser turns each one on or off.
 */
export default function TodayDeviceCards({shown, customize, onToggle, platform, quotes, now, today, habits, health, goals}: {
  shown: readonly TodayCardId[]; customize: boolean; onToggle: (id: TodayCardId) => void;
  platform: Platform; quotes: readonly MarketQuote[]; now: number; today: string; habits: HabitData; health: HealthData; goals: readonly GoalSummary[];
}) {
  const card = (id: TodayCardId): ReactNode => {
    switch (id) {
      case 'balance': return <LifeBalanceCard compact />;
      case 'forecasts': return <PaceForecastsCard platform={platform} quotes={quotes} now={now} today={today} />;
      case 'calculator': return <CalculatorCard compact />;
      case 'review': return <LifeReviewTeaser habits={habits} health={health} platform={platform} goals={goals} today={today} />;
      case 'orbit': return <LoadBoundary quiet><Suspense fallback={null}><OrbitCard /></Suspense></LoadBoundary>;
    }
  };
  return <section className="today-device-cards" aria-label="Cards kept on this device">
    {customize && <div className="today-device-chooser" role="group" aria-labelledby="today-device-chooser-title">
      <h3 id="today-device-chooser-title">Cards kept on this device</h3>
      <p>These cards stay on this device: they are not part of your synced Today layout.</p>
      <div className="today-device-options">{TODAY_CARD_IDS.map(id => <button key={id} type="button" className="today-device-option" aria-pressed={shown.includes(id)} onClick={() => onToggle(id)}>
        <strong>{TODAY_CARD_LABELS[id].label}</strong><small>{TODAY_CARD_LABELS[id].description}</small>
      </button>)}</div>
    </div>}
    {shown.length > 0 && <div className="today-device-grid">{shown.map(id => <div key={id} className="today-device-card" data-card={id}><PhoneFold label={TODAY_CARD_LABELS[id].label}>{card(id)}</PhoneFold></div>)}</div>}
  </section>;
}
