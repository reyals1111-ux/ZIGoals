import type {HealthGoal} from '../../health-goals/schema';
import type {AverageGoal} from '../../average-goals/store';
import type {GoalMetadata} from '@zigoals/shared-types';
import type {Fasting} from '../../fasting/schema';
import type {HabitData} from '../../habits';
import type {HealthData} from '../../health';
import type {Activity as LedgerActivity, LocalGoal} from '../../local-ledger';
import type {MarketQuote} from '../../market-quotes';
import type {PortfolioData} from '../../portfolio/schema';
import type {Platform} from '../../positions';
import type {WeeklyReview} from '../../weekly-review/schema';
import type {Accounts} from '../../accounts/schema';
import type {MilestoneDates} from '../../goals/milestone-dates';
import type {ChessCache, ChessSettings} from '../../skills/chess/schema';
import type {Gates} from '../gates';
import {Handles} from '../handles';
import {HEALTH_NOTE_CATEGORIES} from '../store/records';
import type {PageArea} from '../settings';
import {CHARS_DEFAULT, ROWS_DEFAULT} from './types';
import type {Checklist, ChecklistDays} from '../../checklist/schema';
import type {EarnSnapshot} from '../../earn/snapshot';
import type {PageView} from '../context/page-view';
import type {ZigiPlans} from '../store/plans';
import type {MoneyLog} from '../../money-log/schema';
import type {Journal} from '../../journal/schema';
import type {Energy} from '../../energy/schema';
import type {HealthCoach} from '../../health-aa/coach-schema';
import type {AkToolSources} from './ak-tools';
import type {NovaToolSources} from './nova-tools';

import type {StageInfo} from './nova-stage';
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
  /**
   * Session W Part 21: the device records the new tools read (each behind its own area switch, like every tool): the
   * accounts and debts (Wealth), milestone dates (Goals), chess as this device last read it (Today), and only the number
   * of My links (their names and addresses never reach a tool).
   */
  accounts?: Accounts | null;
  /** Session AI: the expense and income log on this device (Wealth's area switch). */
  moneyLog?: MoneyLog | null;
  /** Session AI: the journal (its entries reach the person's AI only when they turned journal sharing on) and the daily energy (the Health gate). */
  journal?: Journal | null;
  energy?: Energy | null;
  /** Session AJ (item 9): the weekly coach check-in's answers on this device (the Health gate), for coach_checkin. */
  coach?: HealthCoach | null;
  milestoneDates?: MilestoneDates | null;
  chess?: {settings: ChessSettings | null; cache: ChessCache} | null;
  linksCount?: number | null;
  showcase: boolean;
  /**
   * Session AF (L4): the Checklist's two records on this device and its day (the brief's dots, the quick commands); the
   * Earn snapshot the Earn page read in this visit (public figures with their source and "as of"; ZIGi never fetches
   * one); and the page the person is looking at, as card ids and titles only (never a value; null on Settings and on a
   * private screen; Health cards only with the gate).
   */
  checklist?: {record: Checklist; days: ChecklistDays; date: string; unreadable: boolean} | null;
  earn?: EarnSnapshot | null;
  pageView?: PageView | null;
  /** Session AF (L4): the plans ZIGi proposed as bundles and their steps' outcomes (titles only). */
  plans?: ZigiPlans | null;
  /** Session AK (Part 12): the auto-complete rules (Habits), the bills and the price alerts (Wealth) on this device, for ak-tools.ts. */
  ak?: AkToolSources | null;
  /** Owner follow-up 2 (N4): tasks, focus sessions, budgets and (only under NOVA's Notes scope) the notes, for nova-tools.ts. */
  nova?: NovaToolSources | null;
  /** Session AL Part 14 (Denver DV-027c): the Health goals on this device (Goals → Health goals); Health data, so only with the Health gate. */
  healthGoals?: readonly HealthGoal[] | null;
  /**
   * Session AL (Part 13, L7): the average goals on this device (Goals → Keep an average), counted with the others as
   * Today and Goals count them (lib/numbers/counts.ts). A measure Health records reads its days only with the Health gate.
   */
  averageGoals?: readonly AverageGoal[] | null;
};
export type ToolEnv = Omit<ToolSources, 'health' | 'fasting' | 'notes'> & {
  health: HealthData | null; fasting: Fasting | null; notes: readonly MemoryNote[] | null;
  areas: Record<PageArea, boolean>;
  handles: Handles;
  limits: {rows: number; chars: number};
  /**
   * Release review 2 (lane RA): NOVA with its Today permission off but Notes or the Journal on keeps the Today area open
   * for those two only: then just these Today-area tools run (lib/ai/context-pack/nova.ts `novaToolEnv`). Absent (ZIGi,
   * and NOVA with Today on): every tool of an open area runs, as before.
   */
  todayTools?: ReadonlySet<string>;
  /** Session AM (ADR-038 A4): NOVA's stage, set on NOVA's own environment only (lib/ai/tools/nova-stage.ts). Absent: no stage tool runs. */
  stage?: StageInfo;
};
/** `purpose`: 'provider' when the result may leave the device (the person's AI, a browser agent, the hosted relay), 'local' when it is shown here only. */
export function toolEnv(sources: ToolSources, gates: Gates, purpose: 'provider' | 'local', handles = new Handles(), limits = {rows: ROWS_DEFAULT, chars: CHARS_DEFAULT}): ToolEnv {
  const areas = purpose === 'provider' ? gates.areas : gates.local, health = purpose === 'provider' ? gates.health : gates.localHealth;
  // Notes (Part 8): to the person's AI only where a page attaches data; on the device whenever nothing private shows.
  const notesOpen = purpose === 'provider' ? gates.notes : !gates.paused;
  const notes = notesOpen && sources.notes ? sources.notes.filter(note => health || !HEALTH_NOTE_CATEGORIES.includes(note.category)) : null;
  // Session AI: the daily energy is about how a person feels, so it follows the Health gate like the mood.
  // Owner follow-up 2 (G8): your numbers and the cycle log describe health too, so they are not even in the environment with the gate closed.
  const nova = !health && sources.nova ? {...sources.nova, healthNumbers: undefined, cycle: undefined} : sources.nova;
  return {...sources, nova, healthGoals: health ? sources.healthGoals ?? null : null, health: health ? sources.health : null, fasting: health ? sources.fasting : null, energy: health ? sources.energy ?? null : null, coach: health ? sources.coach ?? null : null, notes, areas: {...areas, health}, handles, limits};
}
