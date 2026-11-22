import {nextRepeat, repeatWords, repeatsOf} from '../../tasks/repeat-projects';
import type {TaskTemplates} from '../../tasks/templates';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (rest: the last "built in part" remainders): NOVA's and ZIGi's on-device answers, in English and
 * Dutch, to what those features hold. Each reads the feature's own pure function, under its area's switch.
 * - Repeating projects (LEDGER #17): which projects come round, how often and when next (Today's switch: Tasks).
 * The records come in `extra` or from the env (`nova.taskTemplates`); without them the answer says where the choice lives.
 */
export type Av2RestExtra = {templates?: TaskTemplates | null};
type Ask = Asked & {extra: Av2RestExtra};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];

export function av2RestAnswer(question: string, env: ToolEnv, extra: Av2RestExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskTemplates?: TaskTemplates | null}) | null | undefined;
  const ask: Ask = {...a, extra: {templates: extra.templates ?? nova?.taskTemplates ?? null}};
  for (const one of [repeatingProjects]) {
    const r = one(ask);
    if (r) return r;
  }
  return null;
}

/** "which projects repeat", "what are my repeating projects", "welke projecten herhalen zich", "mijn terugkerende projecten". */
function repeatingProjects(a: Ask): LocalReply | null {
  const en = /\b(?:repeating|recurring) projects?\b|\bprojects?\b.*\b(?:repeat|repeats|recur|recurs|come round|comes round)\b/.test(a.f);
  const nl = /\b(?:terugkerende|herhalende) projecten?\b|\bprojecten?\b.*\b(?:herhalen|herhaalt|terug(?:komen|komt|keren|keert))\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const repeats = repeatsOf(a.extra.templates ?? {});
  if (!repeats.length) return answer(say(a.lang, 'No project repeats yet. In Tasks → Areas and templates, choose a template and set “Repeats” to every week, every month or every few days: the project is then made each time its day comes round.',
    'Er herhaalt zich nog geen project. Kies in Tasks → Areas and templates een sjabloon en zet “Repeats” op elke week, elke maand, om de paar dagen: het project wordt dan elke keer gemaakt als de dag komt.'), TASK_CALLS);
  const lines = repeats.map(r => `• ${clean(r.name, 60)}: ${repeatWords(r, a.lang)}${r.paused ? say(a.lang, ' (paused)', ' (gepauzeerd)') : say(a.lang, `, next ${dayIn('en', nextRepeat(r, a.today), a.today)}`, `, volgende ${dayIn('nl', nextRepeat(r, a.today), a.today)}`)}`);
  return answer([say(a.lang, `${count(repeats.length, 'en', ['project repeats', 'projects repeat'], ['', ''])}:`, `${count(repeats.length, 'nl', ['', ''], ['project herhaalt zich', 'projecten herhalen zich'])}:`), ...lines].join('\n'), TASK_CALLS);
}
