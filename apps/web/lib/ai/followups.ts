/**
 * Follow-up chips after an answer (Session V Part 10), made on the device from what the answer looked at: the same
 * habit last week or its streak, yesterday's water, last week's steps, the goals, the holdings without a price. They
 * are questions the person can tap; most are answered on the device. Never more than three, never the question just
 * asked, never anything from records the answer did not already use.
 */
export type FollowupCall = {tool: string; args?: Record<string, unknown>};
const str = (value: unknown) => typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
function forCall(call: FollowupCall): string[] {
  const args = call.args ?? {}, habit = str(args.habit), goal = str(args.goal), range = str(args.range)?.toLowerCase() ?? '';
  switch (call.tool) {
    case 'habit_stats': case 'habit_checkins':
      if (!habit) return [];
      return [range.includes('last week') ? `How many times did I check in ${habit} this week?` : `How many times did I check in ${habit} last week?`, `What's my longest ${habit} streak?`];
    case 'goal_progress': return goal ? ['How far am I on my goals?'] : [];
    case 'list_goals': return ['How far am I on my goals?'];
    case 'water': return [range.includes('yesterday') ? 'How much water did I drink today?' : 'How much water did I drink yesterday?'];
    case 'steps': return [range.includes('last week') ? 'How many steps did I walk today?' : 'Average steps last week?'];
    case 'nutrient_totals': return ['Did I hit my protein target this week?', 'What did I eat yesterday?'];
    case 'diary_entries': return [range.includes('yesterday') ? 'What did I eat today?' : 'What did I eat yesterday?'];
    case 'holdings': case 'totals_per_currency': return ['What is my net worth?'];
    // Session W Part 21: the new tools' follow-ups, each answered on the device from the same records.
    case 'sleep_nights': return ['What is my sleep debt?', range.includes('this week') ? 'How did I sleep last night?' : 'How did I sleep this week?'];
    case 'sleep_summary': return ['How did I sleep last night?', 'How consistent is my bedtime?'];
    case 'meditation_sessions': case 'meditation_summary': return [range.includes('this week') ? 'How many mindful minutes this month?' : 'How many mindful minutes this week?'];
    case 'vitals': return [range.includes('this week') ? 'What was my resting heart rate this month?' : 'What was my resting heart rate this week?'];
    case 'net_worth': return ['What do I owe?'];
    case 'milestones': return ['How far am I on my goals?'];
    case 'chess_ratings': return ['How many chess games did I play this month?'];
    case 'chess_games': return ['What are my chess ratings?'];
    default: return [];
  }
}
export function followupsFor(calls: readonly FollowupCall[], asked: string, max = 3): string[] {
  const seen = new Set([asked.trim().toLowerCase()]), out: string[] = [];
  for (const call of calls) for (const q of forCall(call)) { const key = q.toLowerCase(); if (!seen.has(key)) { seen.add(key); out.push(q); } }
  return out.slice(0, max);
}
