import type {ToolCallRecord} from '../local-answers/engine';

/**
 * "Ask ZIGi about this" (Session V Part 9, "Explain this number"): a number's card (a Today widget, a Health total, the
 * Wealth total, a goal's progress, the habit history) hands ZIGi a question the person can send as it is, and the
 * records behind it as a removable chip. The question is one ZIGi answers on the device (no AI) where it can; with an AI
 * connected, "Ask my AI for more" or an edited question takes the chip along. Nothing is sent before Send. A card is
 * named by its kind and metric (the Today widget catalogue); a habit or goal also by its name, as the person sees it.
 */
export type Explain = {question: string; about: ToolCallRecord};
const call = (tool: string, args: Record<string, unknown>, label: string): ToolCallRecord => ({tool, args, label});
const named = (name: string | undefined) => name?.replace(/\s+/g, ' ').trim().slice(0, 80) || null;
export function explainFor(kind: string, metric: string, name?: string): Explain | null {
  const n = named(name);
  switch (kind) {
    case 'goal': case 'milestone':
      if (!n) return null;
      return {question: metric === 'next-contribution' || metric === 'next' ? `What is next for my ${n} goal?` : `How far am I on my ${n} goal?`, about: call('goal_progress', {goal: n}, `Goal · ${n}`)};
    case 'goals': return {question: 'How far am I on my goals?', about: call('list_goals', {}, 'Your goals')};
    case 'habit':
      if (!n) return null;
      return {question: metric === 'streak' ? `What's my longest ${n} streak?` : `How many times did I check in ${n} this week?`, about: call('habit_stats', {habit: n, range: 'this month'}, `${n} · this month`)};
    case 'habits': case 'streak': case 'checkins': return {question: 'Which habits are still open today?', about: call('habits_due', {}, 'Habits open today')};
    case 'health': switch (metric) {
      case 'kcal': return {question: 'How many calories did I eat today?', about: call('nutrient_totals', {range: 'today', nutrient: 'kcal'}, 'Calories · today')};
      case 'macros': case 'macros-ring': return {question: 'How much protein did I eat today?', about: call('nutrient_totals', {range: 'today', nutrient: 'protein'}, 'Protein · today')};
      case 'water': return {question: 'How much water did I drink today?', about: call('water', {range: 'today'}, 'Water · today')};
      case 'weight': return {question: 'What is my weight?', about: call('weight', {range: 'the last 30 days'}, 'Weight · the last 30 days')};
      case 'steps': case 'activity': return {question: 'How many steps did I walk today?', about: call('steps', {range: 'today'}, 'Steps · today')};
      case 'history': return {question: 'How many calories did I eat this week?', about: call('nutrient_totals', {range: 'this week', nutrient: 'kcal'}, 'Calories · this week')};
      default: return null;
    }
    case 'meal': case 'food-entry': return {question: 'What did I eat today?', about: call('diary_entries', {range: 'today'}, 'Diary · today')};
    case 'exercise': return {question: 'What did I count today?', about: call('counters', {range: 'today'}, 'Counters · today')};
    case 'wealth': return {question: 'What is my net worth?', about: call('totals_per_currency', {}, 'Wealth totals')};
    case 'habit-history': return {question: 'How many check-ins did I make in the last 30 days?', about: call('list_habits', {}, 'Your habits')};
    // Session W Part 21: the new Today widgets (Sleep and Meditation behind the Health gate, as every Health card).
    case 'sleep': return metric === 'week' ? {question: 'How did I sleep this week?', about: call('sleep_nights', {range: 'this week'}, 'Sleep · this week')} : {question: 'How did I sleep last night?', about: call('sleep_nights', {range: 'today'}, 'Sleep · last night')};
    case 'meditation': return metric === 'today' ? {question: 'How many mindful minutes today?', about: call('meditation_sessions', {range: 'today'}, 'Meditation · today')} : {question: 'How many mindful minutes this week?', about: call('meditation_sessions', {range: 'this week'}, 'Meditation · this week')};
    case 'chess': return {question: 'What are my chess ratings?', about: call('chess_ratings', {}, 'Chess ratings')};
    default: return null;
  }
}
