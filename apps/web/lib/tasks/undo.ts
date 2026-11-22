import {restoreTasks} from './engine';
import type {Tasks} from './schema';

/**
 * Session AL (A7; integrator decision (a)): the Undo of one change on a surface that keeps its own status line (a goal's
 * next actions, the Agenda, NOVA's widget, Today's card). Given the record before and after the change, it returns the
 * reverse to run on the LATEST record: the tasks this change touched go back exactly as they were, the ones it added go,
 * and projects, sections and saved filters come back only when this change altered them. Anything changed since by
 * something else is kept. Pure, so the restore itself is tested (lib/tasks/al-second-pass.test.ts).
 */
export function undoOfChange(before: Tasks, after: Tasks): (latest: Tasks) => Tasks {
  const touched = before.tasks.filter(t => { const now = after.tasks.find(x => x.id === t.id); return !now || JSON.stringify(now) !== JSON.stringify(t); });
  const added = after.tasks.filter(t => !before.tasks.some(x => x.id === t.id)).map(t => t.id);
  const metaChanged = JSON.stringify([before.projects, before.sections, before.filters]) !== JSON.stringify([after.projects, after.sections, after.filters]);
  // Session AV lane 2 (r6-plan, LEDGER #397): a label group made, changed or removed comes back with the Undo too.
  const groupsChanged = JSON.stringify(before.labelGroups) !== JSON.stringify(after.labelGroups);
  return latest => {
    const back = restoreTasks(latest, touched, added), meta = metaChanged ? {...back, projects: before.projects, sections: before.sections, filters: before.filters} : back;
    if (!groupsChanged) return meta;
    const {labelGroups: _g, ...rest} = meta; void _g;
    return before.labelGroups ? {...rest, labelGroups: before.labelGroups} : rest;
  };
}
