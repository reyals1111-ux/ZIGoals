'use client';
import {useMemo, useState, type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {useHabits} from './habits/use-habits';
import {useDeviceRecord} from './ai/use-device-record';
import {parseGoalBundle} from '../lib/goals/nl-bundle';
import {GoalBundleReview, type ConfirmedBundle} from '../lib/goals/nl-bundle-review';
import {GOAL_WIZARD_DRAFT_KEY, bundleAutoRuleInput, bundleCreatedWords, bundleHabitInput, goalWizardDraft, offersBundle} from '../lib/goals/nl-bundle-create';
import {AUTO_RULES} from '../lib/auto-rules/schema';
import {newAutoRule, setAutoRule} from '../lib/auto-rules/engine';
import {deviceSettingFailureMessage} from '../lib/storage-error-copy';

/**
 * Session AK (6.1): Quick add's goal sentences ("save €5,000 for a trip by June and walk 8k steps most days"). Loaded only
 * for a line Quick add's own reader did not take; when the local parser finds a bundle, the review card shows every part
 * and creates only what the person confirms, through the existing flows: habits through the habits store's `create`, an
 * auto-complete rule through `setAutoRule` (this device), and the goal through the Goal wizard (its draft is filled in and
 * the wizard opens, so the goal and any ticked contribution plan are saved only when the person creates the Goal there).
 * No bundle → `otherwise` (ZIGi's cards or the usual hint), exactly as before.
 */
export default function QuickAddBundle({line, today, several = false, close, otherwise}: {line: string; today: string; several?: boolean; close?: () => void; otherwise: ReactNode}) {
  const habits = useHabits(), rules = useDeviceRecord(AUTO_RULES), router = useRouter();
  const bundle = useMemo(() => parseGoalBundle(line, today), [line, today]);
  const [done, setDone] = useState(''), [dismissed, setDismissed] = useState(false);
  if (done) return <p role="status" className="quick-add-line-saved">{done}</p>;
  if (dismissed || !offersBundle(bundle, {several, text: line})) return <>{otherwise}</>;
  async function confirm(parts: ConfirmedBundle) {
    if (parts.habits.length && (!habits.loaded || habits.error)) throw Error('Your habits are not ready yet. Try again in a moment.');
    let made = 0, ruled = 0;
    const notes: string[] = [];
    for (const habit of parts.habits) {
      const id = crypto.randomUUID();
      await habits.create(bundleHabitInput(habit, bundle?.lifeArea), id);
      made++;
      const input = bundleAutoRuleInput(habit, id);
      if (!input) continue;
      if (!rules.loaded || rules.unreadable) { notes.push(`The rule for ${habit.title} was not added: the rules on this device cannot be read.`); continue; }
      try { rules.update(current => setAutoRule(current, newAutoRule(input))); ruled++; } catch (cause) { notes.push(`The rule for ${habit.title} was not added. ${deviceSettingFailureMessage(cause)}`); }
    }
    if (parts.goal) {
      // The wizard reads its own draft once when it opens; the plan is only a pre-fill there, never saved by itself.
      try { sessionStorage.setItem(GOAL_WIZARD_DRAFT_KEY, JSON.stringify(goalWizardDraft(parts.goal, today, parts.contributionPlan))); } catch { notes.push('Fill in the goal form yourself: this browser did not keep the draft.'); }
    }
    setDone([bundleCreatedWords({habits: made, rules: ruled, goal: !!parts.goal}), ...notes].filter(Boolean).join(' '));
    if (parts.goal) { close?.(); router.push('/app/goals/new'); }
  }
  return <GoalBundleReview bundle={bundle} today={today} onConfirm={confirm} onDismiss={() => setDismissed(true)}/>;
}
