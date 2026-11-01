import {formatDate} from '../../visual-format';
import type {ToolEnv} from '../tools/env';
import {HEALTH_CLOSED} from '../tools/format';
import {runTool} from '../tools/registry';
import type {LocalReply} from './engine';

/**
 * Owner follow-up 2 (G8, "tools for G1"): three plain questions about BUILD list 2's records answered on this device with
 * no AI request, from the same read-only tools the models read (g1-tools.ts), so ZIGi and NOVA answer them before any
 * model is connected: the last blood pressure reading (Health gate; the numbers only, never a judgement), today's
 * ratings on the person's own scales, and the lowest point of cash ahead (labelled a model, per currency). English lookups
 * only; advice, plans and anything that also asks for a change stay the model's. Unknown is never "none".
 */
const NOT_HERE = /\b(?:should|recommend|advi[cs]e|suggest|good|bad|okay|ok|normal|healthy|worry|worried|plan|why)\b|\b(?:and|then|also)\s+(?:also\s+)?(?:log|add|set|rate|move|put|remind|plan|start)\b|^(?:log|add|rate|move|set|put)\b/i;
const DUTCH = /\b(?:wat|wanneer|welke|hoeveel|mijn|ik|heb|ben|vandaag|bloeddruk)\b/i;
const BP_ASK = /\b(?:what|when) (?:was|is) my (?:last|latest|most recent) (?:blood pressure|bp)(?: reading)?\b|\bmy (?:last|latest) (?:blood pressure|bp)\b/i;
const SCALES_ASK = /\bhow did i rate (?:my )?(?:own )?scales?(?: today)?\b|\bwhat (?:are|were) my (?:own )?scales? (?:today|at)\b/i;
const CASH_ASK = /\bwhen (?:is|will) my cash (?:be )?(?:at )?(?:its |the )?lowest\b|\bhow (?:low|much) (?:will|does) my cash (?:go|get|look)\b|\bmy cash (?:forecast|ahead)\b|\bcash (?:over|for) the next (?:60|sixty) days\b/i;
type Data = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function answer(tool: string, env: ToolEnv, words: (d: Data) => string): LocalReply {
  const result = runTool(tool, {}, env), calls = [{tool, args: {}, label: result.label}];
  if (!result.ok) return {kind: 'refusal', text: result.refusal, calls};
  return {kind: 'answer', text: words(result.data as Data), calls};
}
export function g1LocalAnswer(question: string, env: ToolEnv): LocalReply | null {
  const q = question.trim().replace(/\s+/g, ' ');
  if (!q || q.length > 160 || NOT_HERE.test(q) || DUTCH.test(q)) return null;
  if (BP_ASK.test(q)) {
    if (!env.health || !env.areas.health) return {kind: 'refusal', text: HEALTH_CLOSED, calls: [{tool: 'your_numbers', args: {}, label: 'Your numbers'}]};
    return answer('your_numbers', env, d => {
      const last = (d.bloodPressure as Data[] | undefined)?.at(-1);
      if (!last) return d.note ?? 'No blood pressure reading is kept yet (Health → Your numbers).';
      return `Your last reading: ${last.reading}${last.pulse ? `, pulse ${last.pulse}` : ''}, on ${formatDate(last.day)}. ${d.readings === 1 ? 'It is your only reading.' : `${d.readings} readings are kept.`} Your readings, not a diagnosis.`;
    });
  }
  if (SCALES_ASK.test(q)) return answer('your_scales', env, d => {
    if (!d.scales?.length) return d.note ?? 'No scale yet.';
    return ['Today, on your own scales:', ...(d.scales as Data[]).map(s => `• ${s.scale}: ${s.today}`)].join('\n');
  });
  if (CASH_ASK.test(q)) return answer('cash_forecast', env, d => {
    if (!d.currencies?.length) return d.note ?? 'This needs a cash or savings account with its balance.';
    return [`${d.model}`, ...(d.currencies as Data[]).map(c => c.line ? `• ${c.currency}: ${c.line}.` : `• ${c.currency}: about ${c.today} today; lowest about ${c.lowest.amount} around ${formatDate(c.lowest.day)}; about ${c.end.amount} on ${formatDate(c.end.day)}.`)].join('\n');
  });
  return null;
}
