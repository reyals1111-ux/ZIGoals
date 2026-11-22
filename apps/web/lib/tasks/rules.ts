import {LABEL_PATTERN, MAX_RULES, MAX_TASKS, RULE_THEN, RULE_WHEN, TASK_LABELS_MAX, levelFields, tasksSchema, type Project, type Task, type TaskLevel, type Tasks} from './schema';

/**
 * Session AV lane 2 (tasks-r2, LEDGER #228; Any.do's automations, Trello's rules): simple rules on a project, run on this
 * device as part of the change that sets them off — so the change and what the rules did are one write with one Undo.
 * - When: a task is added to the project (`added`), a task enters a section (`section`, also a new task added there), or a
 *   task of the project is done (`done`; a repeating one each time it is finished).
 * - Then: set the priority (`level`), add a label (`label`), plan it for today (`today`), mark it done (`done`; not for a
 *   `done` rule, not for a repeating task), move it to a section (`move`), or create the next one (`next`: a copy of the
 *   task, open, with its title or the rule's, due `days` after today when set).
 * One pass: what a rule changes does not set off other rules (no loops). Assigning people is left out: nothing is shared
 * between people (a named rule). Rules are kept on the project, an additive, optional `rules` (TIER 3 (stored format);
 * the schema is in schema.ts). No schema here beyond the task list's own, so the add and Done paths stay light. Pure.
 */
export {MAX_RULES, RULE_THEN, RULE_WHEN};
export type RuleWhen = (typeof RULE_WHEN)[number];
export type RuleThen = (typeof RULE_THEN)[number];
export type ProjectRule = {id: string; when: RuleWhen; section?: string; then: RuleThen; level?: number; label?: string; to?: string; title?: string; days?: number};
export type RuleRun = {projectId: string; rule: ProjectRule; taskId: string; title: string; madeId?: string};

/** Whether a rule is whole: its trigger and its action carry what they need, and the pair makes sense. */
export function ruleProblem(rule: Pick<ProjectRule, 'when' | 'section' | 'then' | 'level' | 'label' | 'to' | 'title' | 'days'>, project?: Pick<Project, 'id'>, sections: readonly {id: string; projectId: string}[] = []): string | null {
  const inProject = (id?: string) => !!id && sections.some(s => s.id === id && (!project || s.projectId === project.id));
  if (rule.when === 'section' && !inProject(rule.section)) return 'Choose the section the rule watches.';
  if (rule.then === 'level' && !(rule.level === 1 || rule.level === 2 || rule.level === 3 || rule.level === 4)) return 'Choose the priority to set.';
  if (rule.then === 'label' && !(rule.label && LABEL_PATTERN.test(rule.label))) return 'Type the label to add: letters and digits, no spaces.';
  if (rule.then === 'move' && !inProject(rule.to)) return 'Choose the section to move it to.';
  if (rule.then === 'move' && rule.when === 'section' && rule.to === rule.section) return 'A task cannot move into the section it has just entered.';
  if (rule.then === 'done' && rule.when === 'done') return 'A finished task is already done: choose another step.';
  if (rule.then === 'next' && rule.when !== 'done') return '“Create the next one” follows a finished task: choose “When a task is done”.';
  if (rule.title !== undefined && (!rule.title.trim() || rule.title.trim().length > 140)) return 'The next task’s title is 1 to 140 characters.';
  if (rule.days !== undefined && !(Number.isInteger(rule.days) && rule.days >= 0 && rule.days <= 365)) return 'The next one is due 0 to 365 days later.';
  return null;
}
const rulesOf = (p: {rules?: unknown}): ProjectRule[] => Array.isArray(p.rules) ? p.rules as ProjectRule[] : [];
/** Whether any project holds a rule (the quick test before anything else runs). */
export const hasRules = (record: Tasks) => !!record.projects?.some(p => rulesOf(p).length);
const completions = (t?: Task) => t?.completions?.length ?? 0;

/**
 * The rules set off by going from `before` to `after`, applied to `after`. Returns the same `after` (and no runs) when no
 * rule applies. `today` is the app's day; `at` the moment; `newId` names a task a "next one" rule makes.
 */
export function runRules(before: Tasks, after: Tasks, {today, at, newId}: {today: string; at: Date; newId: () => string}): {record: Tasks; ran: RuleRun[]} {
  if (!hasRules(after)) return {record: after, ran: []};
  const projects = new Map((after.projects ?? []).filter(p => !p.archived && rulesOf(p).length).map(p => [p.id, {project: p, rules: rulesOf(p)}]));
  const was = new Map(before.tasks.map(t => [t.id, t])), sections = after.sections ?? [], stamp = at.toISOString();
  const ran: RuleRun[] = [], made: Task[] = [];
  let changed = false;
  const tasks = after.tasks.map(t => {
    const own = t.projectId ? projects.get(t.projectId) : undefined;
    if (!own) return t;
    const prev = was.get(t.id), added = !prev, entered = !!t.sectionId && (added || prev!.sectionId !== t.sectionId || prev!.projectId !== t.projectId);
    const finished = !!prev && ((!!t.doneAt && !prev.doneAt) || completions(t) > completions(prev));
    let next: Task = t;
    for (const rule of own.rules) {
      const fires = rule.when === 'added' ? added && !t.doneAt : rule.when === 'section' ? entered && t.sectionId === rule.section && !t.doneAt : finished;
      if (!fires || ruleProblem(rule, own.project, sections)) continue;
      const patch: Record<string, unknown> = {...next};
      switch (rule.then) {
        case 'level': Object.assign(patch, levelFields(rule.level as TaskLevel)); break;
        case 'label': { const labels = next.labels ?? []; if (labels.includes(rule.label!) || labels.length >= TASK_LABELS_MAX) continue; patch.labels = [...labels, rule.label!]; break; }
        case 'today': if (next.due === today) continue; patch.due = today; if (next.time && next.due !== today) delete patch.time; break;
        case 'done': if (next.recur || next.doneAt) continue; patch.doneAt = stamp; break;
        case 'move': if (next.sectionId === rule.to) continue; patch.sectionId = rule.to; break;
        case 'next': {
          if (after.tasks.length + made.length >= MAX_TASKS) continue;
          const id = newId(), copy: Record<string, unknown> = {id, title: (rule.title?.trim() || t.title).slice(0, 140), priority: t.priority, ...(t.level ? {level: t.level} : {}), projectId: t.projectId,
            ...(t.sectionId ? {sectionId: t.sectionId} : {}), ...(t.labels?.length ? {labels: t.labels} : {}), ...(t.minutes ? {minutes: t.minutes} : {}), ...(t.goal ? {goal: t.goal} : {}),
            ...(rule.days !== undefined ? {due: addDays(today, rule.days)} : {}), createdAt: stamp, updatedAt: stamp};
          made.push(copy as Task);
          ran.push({projectId: own.project.id, rule, taskId: t.id, title: t.title, madeId: id});
          continue;
        }
      }
      patch.updatedAt = stamp;
      next = patch as Task;
      ran.push({projectId: own.project.id, rule, taskId: t.id, title: t.title});
    }
    if (next !== t) changed = true;
    return next;
  });
  if (!changed && !made.length) return {record: after, ran: []};
  return {record: tasksSchema.parse({...after, tasks: [...tasks, ...made]}), ran};
}
/** Adds, changes (same id) or removes (`null`) a rule on a project; at most MAX_RULES, each whole (ruleProblem). */
export function setProjectRule(record: Tasks, projectId: string, rule: ProjectRule | {id: string; remove: true}): Tasks {
  const project = record.projects?.find(p => p.id === projectId);
  if (!project) throw new Error('That project is no longer on this device.');
  const list = rulesOf(project).filter(r => r.id !== rule.id);
  if (!('remove' in rule)) {
    const problem = ruleProblem(rule, project, record.sections ?? []);
    if (problem) throw new Error(problem);
    const at = rulesOf(project).findIndex(r => r.id === rule.id);
    if (at < 0 && list.length >= MAX_RULES) throw new Error(`A project keeps ${MAX_RULES} rules. Remove one first.`);
    const clean: ProjectRule = {id: rule.id, when: rule.when, then: rule.then, ...(rule.when === 'section' ? {section: rule.section} : {}), ...(rule.then === 'level' ? {level: rule.level} : {}), ...(rule.then === 'label' ? {label: rule.label} : {}),
      ...(rule.then === 'move' ? {to: rule.to} : {}), ...(rule.then === 'next' && rule.title?.trim() ? {title: rule.title.trim()} : {}), ...(rule.then === 'next' && rule.days !== undefined ? {days: rule.days} : {})};
    if (at < 0) list.push(clean); else list.splice(at, 0, clean);
  }
  return tasksSchema.parse({...record, projects: (record.projects ?? []).map(p => { if (p.id !== projectId) return p; const out: Record<string, unknown> = {...p}; if (list.length) out.rules = list; else delete out.rules; return out; })});
}
/** The rules of a project as stored. */
export const projectRules = (record: Tasks, projectId: string): ProjectRule[] => rulesOf(record.projects?.find(p => p.id === projectId) ?? {});
const addDays = (day: string, n: number) => { const d = new Date(`${day}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
/** One plain sentence for what the rules did ("A rule in “Kitchen” moved “Tiles” to “Done”."), or ''. */
export function rulesSaid(ran: readonly RuleRun[], record: Tasks): string {
  if (!ran.length) return '';
  const section = (id?: string) => record.sections?.find(s => s.id === id)?.name ?? 'a section';
  const one = (r: RuleRun) => {
    const what = `“${r.title}”`;
    switch (r.rule.then) {
      case 'level': return `set ${what} to P${r.rule.level}`;
      case 'label': return `added @${r.rule.label} to ${what}`;
      case 'today': return `planned ${what} for today`;
      case 'done': return `marked ${what} done`;
      case 'move': return `moved ${what} to “${section(r.rule.to)}”`;
      case 'next': return `made the next one of ${what}`;
    }
  };
  const project = record.projects?.find(p => p.id === ran[0]!.projectId)?.name ?? 'the project';
  const parts = ran.slice(0, 3).map(one), more = ran.length > 3 ? `, and ${ran.length - 3} more` : '';
  return `${ran.length === 1 ? 'A rule' : 'Rules'} in “${project}” ${parts.join(', ')}${more}.`;
}
