'use client';
import {createContext, useContext, type ReactNode} from 'react';
import type {AutoRule} from '../../lib/auto-rules/schema';

/**
 * Session AK (5.6): what the Habits page's auto-complete rules give its cards and its rules section, provided once the
 * rules runner (auto-rules-keeper.tsx, its own chunk) is running. Null elsewhere (Today, a goal page): no badge there.
 */
export type AutoRulesApi = {
  rules: readonly AutoRule[];
  /** The record cannot be read on this device: nothing is shown or written. */
  unreadable: boolean;
  save: (rule: AutoRule) => void;
  remove: (ruleId: string) => void;
  pause: (rule: AutoRule, paused: boolean) => void;
  /** Today's automatic tick of a habit, as its badge with Undo; null when no rule ticked it today. */
  badge: (habitId: string, habitTitle: string) => ReactNode;
};
export const AutoRulesContext = createContext<AutoRulesApi | null>(null);
export const useAutoRulesContext = () => useContext(AutoRulesContext);
