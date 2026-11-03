import {formatClock, formatDate, formatNumber} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED} from '../tools/format';
import {runTool} from '../tools/registry';
import type {LocalReply} from './engine';

/**
 * Owner follow-up 2 (N2 "works from minute one", N4): the plain questions about tasks, focus, workouts and budgets answered
 * on this device with no AI request and nothing sent, from the same read-only tools NOVA's model reads (nova-tools.ts), so
 * NOVA and ZIGi answer them before any model is connected. Asked after F9's answers (engine.ts). English lookups only (a
 * Dutch question stays the model's, as the engine's rule); advice, plans and anything that also asks for a change are
 * never answered here. Unknown is never "none": a record not read or unreadable says so.
 */
const NOT_HERE = /\b(?:should|recommend|advi[cs]e|suggest|better|worth|cut|reduce|plan|which (?:one|to) (?:do|pick) first)\b|\b(?:and|then|also)\s+(?:also\s+)?(?:log|add|set|mark|start|keep|put|remind|plan|tick|move|finish|delete)\b/i;
const DUTCH = /\b(?:wat|wanneer|welke|hoeveel|mijn|ik|heb|ben|staat|vandaag|taken)\b/i;
const TASKS_ASK = /\b(?:what|which|any|how many)\b.{0,30}\b(?:tasks?|to-?dos?)\b|\b(?:my|the) (?:tasks?|to-?do(?: list)?)\b.{0,20}\b(?:today|due|left|open|overdue)\b|\bwhat(?:'s| is) on my (?:task|to-?do) list\b|\bwhat do i (?:have|need) to do today\b/i;
const FOCUS_ASK = /\bhow (?:much|long|many (?:minutes|sessions))\b.{0,30}\b(?:focus(?:ed)?|deep work|pomodoros?)\b|\b(?:my )?focus (?:sessions?|time|minutes|garden)\b.{0,30}\b(?:this week|today|lately|so far)\b/i;
const WORKOUT_ASK = /\bhow many (?:workouts?|training sessions|gym sessions)\b|\b(?:my )?workouts? (?:this week|so far|lately)\b|\bwhen (?:was|did i do) my last workout\b/i;
const BUDGET_ASK = /\b(?:am i|are we) (?:over|under|within|on) (?:any |my )?budgets?\b|\bhow (?:are|is) my budgets?\b|\b(?:what(?:'s| is)|how much(?: is)?) left (?:in|of) my (.{2,30}?) budget\b|\bbudgets? (?:this month|so far)\b/i;
const plural = (n: number, one: string, many = `${one}s`) => `${formatNumber(n)} ${n === 1 ? one : many}`;
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function novaLocalAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 200 || NOT_HERE.test(q) || DUTCH.test(q)) return null;
  if (TASKS_ASK.test(q)) return answer('tasks', {}, env, d => {
    if (!d.open?.length) return d.note ?? 'No task is open.';
    const c = d.counts as {open: number; overdue: number; today: number};
    const lines = (d.open as Data[]).slice(0, 6).map(t => `• ${t.task}${t.due ? ` — ${t.state === 'overdue' ? 'overdue since' : 'due'} ${formatDate(t.due)}${t.time ? ` at ${formatClock(t.time)}` : ''}` : ''}${t.priority === 'high' ? ' (high)' : ''}${t.goal ? `, for ${t.goal}` : ''}`);
    return [`${plural(c.open, 'open task')}: ${formatNumber(c.today)} due today, ${formatNumber(c.overdue)} overdue.`, ...lines, ...(c.open > 6 ? [`…and ${plural(c.open - 6, 'more')}.`] : [])].join('\n');
  });
  if (FOCUS_ASK.test(q)) return answer('focus_sessions', {}, env, d => {
    if (!d.garden) return d.note ?? 'No focus session is kept yet.';
    const g = d.garden as {grown: number; withered: number; weekMinutes: number; weekSessions: number};
    return `In the last 7 days: ${plural(g.weekSessions, 'focus session')}, ${plural(g.weekMinutes, 'focused minute')}. Your garden holds ${formatNumber(g.grown)} grown and ${formatNumber(g.withered)} withered; every session counts.`;
  });
  if (WORKOUT_ASK.test(q)) {
    if (!env.health || !env.areas.health) return {kind: 'refusal', text: HEALTH_CLOSED, calls: [{tool: 'workouts', args: {}, label: 'Workouts'}]};
    return answer('workouts', {}, env, d => {
      if (!d.recent?.length) return d.note ?? 'No workout is logged yet.';
      const last = (d.recent as Data[])[0]!;
      return `This week: ${plural(d.thisWeek.workouts, 'workout')}, ${plural(d.thisWeek.minutes, 'minute')}${d.inProgress ? `; ${d.inProgress} is in progress` : ''}. The last one: ${last.workout} on ${formatDate(last.day)}, ${plural(last.minutes, 'minute')}.`;
    });
  }
  const budget = BUDGET_ASK.exec(q);
  if (budget) return answer('budgets', {}, env, d => {
    if (!d.budgets?.length) return d.note ?? 'No budget is set yet.';
    const named = budget[1]?.toLowerCase(), rows = (d.budgets as Data[]).filter(r => !named || String(r.category).toLowerCase().includes(named));
    if (!rows.length) return `No budget is called "${budget[1]}". Your budgets: ${(d.budgets as Data[]).map(r => r.category).join(', ')}.`;
    const over = rows.filter(r => r.over);
    return [`This month, from your own entries (per currency, never converted):`, ...rows.slice(0, 8).map(r => `• ${r.category}: ${r.spent} of ${r.available}${r.over ? ' — over' : `, ${r.left} left`}`), ...(named ? [] : [over.length ? `${plural(over.length, 'budget')} over.` : 'None is over.'])].join('\n');
  });
  return null;
}
function answer(tool: string, args: Record<string, unknown>, env: ToolEnv, words: (d: Data) => string): LocalReply {
  const result = runTool(tool, args, env), calls = [{tool, args, label: result.label}];
  if (!result.ok) return {kind: 'refusal', text: result.refusal, calls};
  return {kind: 'answer', text: words(result.data as Data), calls};
}
