import type {GoalMetadata} from '@zigoals/shared-types';
import type {Fasting} from '../../fasting/schema';
import type {HabitData} from '../../habits';
import type {HealthData} from '../../health';
import type {Activity as LedgerActivity, LocalGoal} from '../../local-ledger';
import type {MarketQuote} from '../../market-quotes';
import type {PortfolioData} from '../../portfolio/schema';
import type {Platform} from '../../positions';
import type {WeeklyReview} from '../../weekly-review/schema';
import type {Gates} from '../gates';
import {Handles} from '../handles';
import {HEALTH_NOTE_CATEGORIES} from '../store/records';
import type {PageArea} from '../settings';
import {CHARS_DEFAULT, ROWS_DEFAULT} from './types';

/**
 * The records a tool may read for one reply, built once from the gates (Session V Part 2). `health` and `fasting` are
 * null whenever the Health gate is closed for this purpose (sending to the person's AI, or answering on the device), so
 * a Health tool has nothing to read, and the habit tools hold back values that a Health link filled in. Every area the
 * person's switches keep closed is simply not readable. Prices come with their source and the time they were observed.
 */
/** A coin's price in one currency (the portfolio's own), with where it came from and when; undefined when there is none. */
export type PriceOf = (coin: string, currency: string) => {price: string; source: string; observedAt: string | null} | undefined;
export type MemoryNote = {text: string; category: string};
export type ToolSources = {
  now: Date; habitDay: string; healthDay: string; habitZone: string; healthZone: string;
  habits: HabitData; health: HealthData; fasting: Fasting | null;
  platform: Platform; localGoals: readonly LocalGoal[]; metadata: Record<string, GoalMetadata>; quotes: readonly MarketQuote[];
  /** The Local Demo ledger's deposits and withdrawals (amounts in the native asset's base units), when the app runs it. */
  localActivity?: readonly LedgerActivity[] | null;
  portfolio: {data: PortfolioData; priceOf: PriceOf} | null;
  weekly: WeeklyReview | null;
  /** The person's own notes for ZIGi, only when "Use my notes" is on (Part 8); health-tagged notes need the Health gate. */
  notes?: readonly MemoryNote[] | null;
  showcase: boolean;
};
export type ToolEnv = Omit<ToolSources, 'health' | 'fasting' | 'notes'> & {
  health: HealthData | null; fasting: Fasting | null; notes: readonly MemoryNote[] | null;
  areas: Record<PageArea, boolean>;
  handles: Handles;
  limits: {rows: number; chars: number};
};
/** `purpose`: 'provider' when the result may leave the device (the person's AI, a browser agent, the hosted relay), 'local' when it is shown here only. */
export function toolEnv(sources: ToolSources, gates: Gates, purpose: 'provider' | 'local', handles = new Handles(), limits = {rows: ROWS_DEFAULT, chars: CHARS_DEFAULT}): ToolEnv {
  const areas = purpose === 'provider' ? gates.areas : gates.local, health = purpose === 'provider' ? gates.health : gates.localHealth;
  const notes = sources.notes ? sources.notes.filter(note => health || !HEALTH_NOTE_CATEGORIES.includes(note.category)) : null;
  return {...sources, health: health ? sources.health : null, fasting: health ? sources.fasting : null, notes, areas: {...areas, health}, handles, limits};
}
