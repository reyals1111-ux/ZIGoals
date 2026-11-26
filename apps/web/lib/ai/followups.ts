/**
 * Follow-up chips after an answer (Session V Part 10), made on the device from what the answer looked at: the same
 * habit last week or its streak, yesterday's water, last week's steps, the goals, the holdings without a price. They
 * are questions the person can tap; most are answered on the device. Never more than three, never the question just
 * asked, never anything from records the answer did not already use.
 */
export type FollowupCall = {tool: string; args?: Record<string, unknown>};
const str = (value: unknown) => typeof value === 'string' && value.trim() ? value.replace(/\s+/g, ' ').trim().slice(0, 60) : null;
/** Session AW (fr-answers, FR-AW-10): each chip in the conversation's language, so a Dutch chat never gets English chips. */
export type FollowupLang = 'en' | 'nl';
function forCall(call: FollowupCall, lang: FollowupLang): string[] {
  const args = call.args ?? {}, habit = str(args.habit), goal = str(args.goal), range = str(args.range)?.toLowerCase() ?? '';
  const say = (en: string, nl: string) => lang === 'nl' ? nl : en, week = range.includes('this week') || range.includes('deze week');
  switch (call.tool) {
    case 'habit_stats': case 'habit_checkins':
      if (!habit) return [];
      return [range.includes('last week') || range.includes('vorige week') ? say(`How many times did I check in ${habit} this week?`, `Hoe vaak heb ik ${habit} deze week gedaan?`) : say(`How many times did I check in ${habit} last week?`, `Hoe vaak heb ik ${habit} vorige week gedaan?`), say(`What's my longest ${habit} streak?`, `Wat is mijn langste reeks voor ${habit}?`)];
    case 'goal_progress': return goal ? [say('How far am I on my goals?', 'Hoe ver ben ik met mijn doelen?')] : [];
    case 'list_goals': return [say('How far am I on my goals?', 'Hoe ver ben ik met mijn doelen?')];
    case 'water': return [range.includes('yesterday') || range.includes('gisteren') ? say('How much water did I drink today?', 'Hoeveel water heb ik vandaag gedronken?') : say('How much water did I drink yesterday?', 'Hoeveel water heb ik gisteren gedronken?')];
    case 'steps': return [range.includes('last week') || range.includes('vorige week') ? say('How many steps did I walk today?', 'Hoeveel stappen heb ik vandaag gezet?') : say('Average steps last week?', 'Hoeveel stappen zette ik gemiddeld vorige week?')];
    case 'nutrient_totals': return [say('Did I hit my protein target this week?', 'Heb ik deze week mijn eiwitdoel gehaald?'), say('What did I eat yesterday?', 'Wat heb ik gisteren gegeten?')];
    case 'diary_entries': return [range.includes('yesterday') || range.includes('gisteren') ? say('What did I eat today?', 'Wat heb ik vandaag gegeten?') : say('What did I eat yesterday?', 'Wat heb ik gisteren gegeten?')];
    case 'holdings': case 'totals_per_currency': return [say('What is my net worth?', 'Wat is mijn vermogen?')];
    // Session W Part 21: the new tools' follow-ups, each answered on the device from the same records.
    case 'sleep_nights': return [say('What is my sleep debt?', 'Wat is mijn slaaptekort?'), week ? say('How did I sleep last night?', 'Hoe heb ik vannacht geslapen?') : say('How did I sleep this week?', 'Hoe heb ik deze week geslapen?')];
    case 'sleep_summary': return [say('How did I sleep last night?', 'Hoe heb ik vannacht geslapen?'), say('How consistent is my bedtime?', 'Hoe regelmatig is mijn bedtijd?')];
    case 'meditation_sessions': case 'meditation_summary': return [week ? say('How many mindful minutes this month?', 'Hoeveel minuten heb ik deze maand gemediteerd?') : say('How many mindful minutes this week?', 'Hoeveel minuten heb ik deze week gemediteerd?')];
    case 'vitals': return [week ? say('What was my resting heart rate this month?', 'Wat was mijn rusthartslag deze maand?') : say('What was my resting heart rate this week?', 'Wat was mijn rusthartslag deze week?')];
    case 'net_worth': return [say('What do I owe?', 'Wat ben ik schuldig?')];
    case 'milestones': return [say('How far am I on my goals?', 'Hoe ver ben ik met mijn doelen?')];
    case 'chess_ratings': return [say('How many chess games did I play this month?', 'Hoeveel schaakpartijen heb ik deze maand gespeeld?')];
    case 'chess_games': return [say('What are my chess ratings?', 'Wat zijn mijn schaakratings?')];
    default: return [];
  }
}
export function followupsFor(calls: readonly FollowupCall[], asked: string, max = 3, lang: FollowupLang = 'en'): string[] {
  const seen = new Set([asked.trim().toLowerCase()]), out: string[] = [];
  for (const call of calls) for (const q of forCall(call, lang)) { const key = q.toLowerCase(); if (!seen.has(key)) { seen.add(key); out.push(q); } }
  return out.slice(0, max);
}
