'use client';
import {useMemo, type ReactNode} from 'react';
import {useHealth} from './health/use-health';
import {useHabits} from './habits/use-habits';
import {useUnifiedGoals} from './use-unified-goals';
import {ProposalList} from './ai/proposal-list';
import {useProposals} from './ai/use-proposals';
import {SafeText} from './ai/safe-text';
import {latestHabitRule} from '../lib/habits';
import {exerciseData} from '../lib/health-counters';
import {dailyData} from '../lib/health-daily';
import {parseReply} from '../lib/ai/actions/parse';
import {quickLogReply, type QuickLogContext} from '../lib/quick-log/multi';

/**
 * Session AI (J10): Quick add's one line, several items: each understood item is one of ZIGi's cards (the same cards, the
 * same validation and plausibility limits, the same Add and Undo), saved one by one; nothing is written before Add.
 * Made on this device with no AI. Loaded only when a line holds more than one item or Quick add's own reader had none.
 */
export default function QuickLogCards({line, lang = 'en', fallback = null}: {line: string; lang?: 'en' | 'nl'; fallback?: ReactNode}) {
  const health = useHealth(), habits = useHabits(), goals = useUnifiedGoals(), runner = useProposals();
  const ctx = useMemo<QuickLogContext>(() => {
    const preferences = dailyData(health.data).preferences;
    return {
      habits: habits.data.habits.filter(h => latestHabitRule(h).state === 'active').map(h => { const rule = latestHabitRule(h); return {id: h.id, title: h.title, unit: 'unit' in rule.measurement ? rule.measurement.unit : 'done', kind: rule.measurement.kind, target: rule.target}; }),
      counters: exerciseData(health.data).counters.map(c => ({id: c.id, name: c.name})), waterUnit: preferences.waterUnit, weightUnit: preferences.weightUnit,
      goals: goals.goals.filter(g => g.status === 'active').map(g => g.name), foods: health.data.foods.map(f => f.name), expenses: true, now: new Date(),
    };
  }, [health.data, habits.data, goals.goals]);
  const parsed = useMemo(() => { const reply = quickLogReply(line, ctx, lang); return reply ? parseReply(reply.text) : null; }, [line, ctx, lang]);
  if (!health.loaded || !habits.loaded) return null;
  if (!parsed || !parsed.proposals.length) return <>{fallback}</>;
  return <div className="quick-log-cards" aria-live="polite">
    {parsed.text && <SafeText className="fine" text={parsed.text}/>}
    <ProposalList proposals={parsed.proposals} rejected={parsed.rejected} handles={[]} runner={runner}/>
  </div>;
}
