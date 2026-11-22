import {nextRepeat, repeatWords, repeatsOf} from '../../tasks/repeat-projects';
import type {TaskTemplates} from '../../tasks/templates';
import type {TaskPlan} from '../../tasks/plan-record';
import {text as clean} from '../tools/format';
import type {ToolEnv} from '../tools/env';
import {answer, asked, closed, count, dayIn, isQuestion, say, type Asked} from './av-words';
import type {LocalReply} from './engine';

/**
 * Session AV lane 2 (rest: the last "built in part" remainders): NOVA's and ZIGi's on-device answers, in English and
 * Dutch, to what those features hold. Each reads the feature's own pure function, under its area's switch.
 * - Repeating projects (LEDGER #17): which projects come round, how often and when next (Today's switch: Tasks).
 * - Task versions (LEDGER #33): which tasks have earlier versions kept on this device (Today's switch: Tasks).
 * The records come in `extra` or from the env (`nova.taskTemplates`); without them the answer says where the choice lives.
 */
export type Av2RestExtra = {templates?: TaskTemplates | null; plan?: TaskPlan | null};
type Ask = Asked & {extra: Av2RestExtra};
const TASK_CALLS = [{tool: 'tasks', args: {}, label: 'Tasks'}];

export function av2RestAnswer(question: string, env: ToolEnv, extra: Av2RestExtra = {}): LocalReply | null {
  const a = asked(question, env);
  if (!a || !isQuestion(a)) return null;
  const nova = env.nova as (typeof env.nova & {taskTemplates?: TaskTemplates | null; taskPlan?: TaskPlan | null}) | null | undefined;
  const ask: Ask = {...a, extra: {templates: extra.templates ?? nova?.taskTemplates ?? null, plan: extra.plan ?? nova?.taskPlan ?? null}};
  for (const one of [repeatingProjects, taskVersions]) {
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

/** "which tasks have earlier versions", "welke taken hebben eerdere versies" (Notion's version history, for tasks). */
function taskVersions(a: Ask): LocalReply | null {
  const en = /\b(?:earlier|older|previous|past) versions?\b.*\btasks?\b|\btasks?\b.*\b(?:earlier|older|previous|past) versions?\b|\btask (?:version )?history\b/.test(a.f);
  const nl = /\b(?:eerdere|oudere|vorige) versies?\b.*\btaken?\b|\btaken?\b.*\b(?:eerdere|oudere|vorige) versies?\b|\btaakgeschiedenis\b/.test(a.f);
  if (!(en || nl)) return null;
  const shut = closed(a.env, 'today'); if (shut) return shut;
  const tasks = a.env.nova?.tasks?.tasks ?? [], versions = (a.extra.plan?.versions ?? []).filter(v => tasks.some(t => t.id === v.taskId));
  if (!versions.length) return answer(say(a.lang, 'No earlier versions of a task are kept yet. When you change a task’s title or notes and save, what it said before is kept in its editor under “Earlier versions”, up to ten, on this device.',
    'Er zijn nog geen eerdere versies van een taak bewaard. Als je een taak wijzigt (titel, notities) en bewaart, staat wat er eerst stond in de editor onder “Earlier versions”, tot tien, op dit apparaat.'), TASK_CALLS);
  const per = new Map<string, number>(); for (const v of versions) per.set(v.taskId, (per.get(v.taskId) ?? 0) + 1);
  const lines = [...per].map(([id, n]) => `• ${clean(tasks.find(t => t.id === id)!.title, 80)}: ${count(n, a.lang, ['version', 'versions'], ['versie', 'versies'])}`);
  return answer([say(a.lang, `${count(per.size, 'en', ['task has', 'tasks have'], ['', ''])} earlier versions on this device (open a task and “Earlier versions” to read or restore one):`,
    `${count(per.size, 'nl', ['', ''], ['taak heeft', 'taken hebben'])} eerdere versies op dit apparaat (open een taak en “Earlier versions” om er een te lezen en terug te zetten):`), ...lines].join('\n'), TASK_CALLS);
}
