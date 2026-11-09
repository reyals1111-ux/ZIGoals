import {latestHabitRule} from '../../habits';
import type {ToolEnv} from '../tools/env';
import {summaries} from '../tools/goals';
import {text as clean} from '../tools/format';
import type {OPEN_PAGES} from '../actions/schema';
import {examplesFor} from './examples';
import {healthGoalLine, healthGoalProgress} from '../../health-goals/progress';
import {localAnswer, type LocalReply, type ToolCallRecord} from './engine';

/**
 * Session AL final pass (lane L7; Lisbon N-LA-01, Berlin BN-053): what the device says when none of its lookups read the
 * question, with no model to ask. It was always the same examples list; now it is the closest answer the device has, when
 * one is close enough, and the list only otherwise.
 *
 * - `helpReply`: a question about one of the pages Help explains ("What is on the Ecosystem page, and what does Chess have
 *   to do with ZIGoals?") gets Help's own words for each part, with Help's question named and the page to open.
 * - `closestReply`: a message that shares the words of a question the device answers ("I didn't drink water today" with a
 *   habit called Drink water) gets that answer, under a line that names the question it was read as.
 *
 * Help's words are copied from components/help/help-page.tsx (the id named); al-final.test.ts holds them equal to it.
 */
type Lang = 'en' | 'nl';
type HelpEntry = {id: string; question: string; answer: string; re: RegExp; page?: (typeof OPEN_PAGES)[number]};
export const HELP_ENTRIES: readonly HelpEntry[] = [
  {id: 'al-ecosystem', question: 'What is the Ecosystem page?', page: 'ecosystem', re: /\becosystem\b/i,
    answer: 'A directory of projects on ZIGChain: what each does, its category and status, the sources it was checked against and when. Search and the category chips narrow the list. Links open the project’s own site in a new tab. Being listed is not an endorsement, and nothing here is advice.'},
  {id: 'al-chess', question: 'What does the Chess page do?', page: 'chess', re: /\bchess\b/i,
    answer: 'Add your public Lichess or Chess.com username and ZIGoals reads your public ratings and recent games; it never needs a password for that. You can set rating goals (a whole number from 100 to 4000) and open the daily puzzle. Playing a game happens on Lichess, after you sign in there. Chess is off until you switch it on in Settings → Your pages & buttons.'},
  {id: 'af-earn', question: 'What is the Earn page?', page: 'earn', re: /\bearn page\b|\bwhat is earn\b/i,
    answer: 'Earn explains every way to earn in the ZIG Finance ecosystem, in plain words, and helps you start: what each way is and who runs it, its live numbers with their source and when they were read (or “unavailable” with the reason), its fees, lockups and risks, and the steps you take on that app’s own site. Ecosystem apps open in a new tab through verified links. ZIGoals never ranks them by rate, never holds your money and never signs for you.'},
  {id: 'ab-point-tell', question: 'What is Point & tell?', re: /\bpoint (?:&|and) tell\b/i,
    answer: 'A way to tell us exactly what you mean. Settings → Help & diagnostics → “Show the Point & tell button”. Press the pin button, then tap the part of the page you mean (with a keyboard, Tab to it and press Enter); the tap opens a note instead of the page. Your notes are numbered and stay on this device until you copy, download or email them. Esc always cancels.'},
];
const ABOUT = /\b(?:what|how|where|why|which|does|do|is|are|can|tell me|explain)\b/i;
const open = (page: (typeof OPEN_PAGES)[number]) => `\n\n\`\`\`zigoals-action\n${JSON.stringify({kind: 'open-page', page})}\n\`\`\``;
/** Help's words for each page the question asks about (at most two parts), or null. */
export function helpReply(question: string, lang: Lang): LocalReply | null {
  const q = question.trim();
  if (lang !== 'en' || !q || q.length > 300 || !ABOUT.test(q)) return null;
  const parts = q.split(/,?\s+\band\b\s+(?=what|how|where|why|which|does|do|is|are|can)/i).slice(0, 3);
  const found: HelpEntry[] = [];
  for (const part of parts) { const hit = HELP_ENTRIES.find(e => e.re.test(part) && !found.includes(e)); if (hit) found.push(hit); }
  if (!found.length) return null;
  const text = found.slice(0, 2).map(e => `From Help, “${e.question}”: ${e.answer}`).join('\n\n');
  const pages = found.slice(0, 2).flatMap(e => e.page ? [open(e.page)] : []).join('');
  return {kind: 'answer', text: text + pages, calls: []};
}

const STOP = new Set(['i', 'me', 'my', 'mine', 'a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'did', 'do', 'does', 'didn', 'didnt', 'don', 'dont', 't', 's', 'not', 'no', 'what', 'whats', 'how', 'much', 'many', 'which', 'who', 'when', 'why', 'where', 'have', 'has', 'had', 'it', 'this', 'that', 'please', 'can', 'you', 'your', 'with', 'so', 'far', 'am', 'any', 'some', 'there', 'just', 'zigi', 'nova', 'tell', 'show', 'about']);
const contentWords = (text: string) => new Set((text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(w => w.length > 1 && !STOP.has(w)).map(w => w.replace(/(?:ing|ed|s)$/, '') || w));
/** The questions the device answers from these records: the examples, and each active habit and goal by name. */
function candidates(env: ToolEnv): {ask: string; must?: Set<string>}[] {
  const habits = env.habits.habits.filter(h => latestHabitRule(h).state === 'active').slice(0, 30);
  return [
    ...habits.map(h => ({ask: `Did I do ${clean(h.title, 60)} today?`, must: contentWords(h.title)})),
    ...summaries(env).filter(g => g.status === 'active').slice(0, 30).map(g => ({ask: `How far am I on my ${clean(g.name, 60)} goal?`, must: contentWords(g.name)})),
    ...examplesFor(env, 12).map(ask => ({ask})),
  ];
}
/** The device's answer to the closest question it answers, when the message shares enough of its words; else null. */
export function closestReply(question: string, env: ToolEnv | null, lang: Lang): LocalReply | null {
  if (!env || lang !== 'en') return null;
  const said = contentWords(question);
  if (!said.size || question.length > 300) return null;
  let best: {ask: string; score: number} | null = null;
  for (const c of candidates(env)) {
    const words = contentWords(c.ask);
    if (c.must && (!c.must.size || c.must.size > 4 || [...c.must].some(w => !said.has(w)))) continue;
    const shared = [...said].filter(w => words.has(w)).length;
    // Close enough: two words of substance in common, and at least half of what the message says.
    const score = shared / said.size;
    if (shared >= 2 && score >= 0.5 && (!best || score > best.score)) best = {ask: c.ask, score};
  }
  if (!best) return null;
  let reply: LocalReply = {kind: 'none'};
  try { reply = localAnswer(best.ask, env); } catch { return null; }
  if (reply.kind !== 'answer' && reply.kind !== 'refusal') return null;
  return {...reply, text: `I’m not sure I read that right. The closest question I can answer here is “${best.ask}”:\n\n${reply.text}`};
}

/**
 * Session AL final pass (Z-025): "What is my Walk goal progress?" with a habit called Walk and a Health goal called “Walk
 * more” answered only the habit. A question that says "goal" and names a Health goal by one of its own words gets that
 * goal's progress as Goals → Health goals shows it, and the habit of that name beside it, each said for what it is.
 * Health goals are in the environment only while Health is shared (lib/ai/tools/env.ts), so nothing else is read.
 */
const GOAL_WORDS = new Set(['goal', 'goals', 'progres', 'progress', 'status', 'more', 'less', 'showcase', 'daily', 'day', 'week', 'month', 'target']);
export function healthGoalAsk(question: string, env: ToolEnv): LocalReply | null {
  if (!/\bgoals?\b/i.test(question) || question.length > 200) return null;
  const said = contentWords(question), named = (name: string) => [...contentWords(name)].filter(w => !GOAL_WORDS.has(w)).some(w => said.has(w));
  if (!env.health) {
    // Health closed: Health goals are not read, so a habit answered for a "goal" question says which record it is.
    const habit = env.areas.habits && !summaries(env).some(g => g.status === 'active' && named(g.name)) ? env.habits.habits.find(h => latestHabitRule(h).state === 'active' && contentWords(h.title).size > 0 && [...contentWords(h.title)].every(w => said.has(w))) : undefined;
    if (!habit) return null;
    let r: LocalReply = {kind: 'none'};
    try { r = localAnswer(question.replace(/\bgoals?\b/gi, 'habit'), env); } catch { return null; }
    return r.kind === 'answer' ? {...r, text: `${r.text}\n\nThis is your habit “${clean(habit.title, 60)}”. A Health goal (Goals → Health goals) is read only while Health is shared with ZIGi, so none is counted here.`} : null;
  }
  if (!env.healthGoals?.length) return null;
  const goals = env.healthGoals.filter(g => g.status === 'active' && named(g.name)).slice(0, 2);
  if (!goals.length || summaries(env).some(g => g.status === 'active' && named(g.name))) return null;
  const goalLines = goals.map(g => { let line = 'progress unknown'; try { line = healthGoalLine(g, healthGoalProgress(g, env.health!, env.healthDay)); } catch { /* unknown, never zero */ } return `Health goal “${clean(g.name, 60)}” (Goals → Health goals): ${line === 'No data yet' ? 'no data yet' : line}.`; });
  const habit = env.areas.habits ? env.habits.habits.find(h => latestHabitRule(h).state === 'active' && [...contentWords(h.title)].length > 0 && [...contentWords(h.title)].every(w => said.has(w))) : undefined;
  let habitText: string | null = null, calls: ToolCallRecord[] = [];
  if (habit) { try { const r = localAnswer(question.replace(/\bgoals?\b/gi, 'habit'), env); if (r.kind === 'answer') { habitText = r.text; calls = r.calls; } } catch { /* the goal alone */ } }
  const text = habitText ? `Two of your records match “${clean(habit!.title, 40)}”, so here are both:\n• ${goalLines.join('\n• ')}\n• Habit “${clean(habit!.title, 60)}”: ${habitText}` : goalLines.join('\n');
  return {kind: 'answer', text, calls};
}
