import {LABEL_GROUP_MAX, LABEL_GROUP_NAME_MAX, LABEL_PATTERN, MAX_LABEL_GROUPS, tasksSchema, type LabelGroup, type Tasks} from './schema';

/**
 * Session AV lane 2 (r6-plan, LEDGER #397; OmniFocus 4.7's mutually exclusive tags): a label group ("Where": @home, @office,
 * @errand) across all projects. Giving a task one label of the group takes the others away (lib/tasks/engine.ts
 * oneOfEachGroup, in every add and edit, quick add too). A label sits in one group at most. Making a group changes no task:
 * the tasks that already carry two of its labels are counted, and each keeps one at its next change. Pure.
 */
const clean = (l: string) => l.trim().replace(/^@/, '');
/** The labels typed for a group ("@home, office errand"), cleaned and unique. */
export const groupLabels = (text: string): string[] => [...new Set(text.split(/[\s,]+/).map(clean).filter(Boolean))];
/** Adds or replaces a group (by id); refuses a nameless group, fewer than two labels, a label that is not one word, or one already in another group. */
export function setLabelGroup(record: Tasks, group: {id: string; name: string; labels: readonly string[]}): Tasks {
  const name = group.name.trim().replace(/\s+/g, ' '), labels = [...new Set(group.labels.map(clean).filter(Boolean))];
  if (!name) throw new Error('Give the group a name, such as “Where”.');
  if (name.length > LABEL_GROUP_NAME_MAX) throw new Error(`A group name can be at most ${LABEL_GROUP_NAME_MAX} characters.`);
  const bad = labels.find(l => !LABEL_PATTERN.test(l));
  if (bad) throw new Error(`“${bad}” is not one word: a label is letters, numbers, “_” or “-”, up to 40.`);
  if (labels.length < 2) throw new Error('A group needs two labels or more, such as @home and @office.');
  if (labels.length > LABEL_GROUP_MAX) throw new Error(`A group holds up to ${LABEL_GROUP_MAX} labels.`);
  const groups = record.labelGroups ?? [], other = groups.filter(g => g.id !== group.id);
  for (const l of labels) { const taken = other.find(g => g.labels.includes(l)); if (taken) throw new Error(`@${l} is already in “${taken.name}”. A label sits in one group.`); }
  if (other.some(g => g.name.toLowerCase() === name.toLowerCase())) throw new Error(`There is already a group called “${name}”.`);
  if (!groups.some(g => g.id === group.id) && groups.length >= MAX_LABEL_GROUPS) throw new Error(`You have ${MAX_LABEL_GROUPS} label groups, the most kept.`);
  const next: LabelGroup = {id: group.id, name, labels};
  return tasksSchema.parse({...record, labelGroups: groups.some(g => g.id === group.id) ? groups.map(g => g.id === group.id ? next : g) : [...groups, next]});
}
/** Removes a group; its labels stay on the tasks, as free labels. */
export function removeLabelGroup(record: Tasks, id: string): Tasks {
  const left = (record.labelGroups ?? []).filter(g => g.id !== id), next: Record<string, unknown> = {...record};
  if (left.length) next.labelGroups = left; else delete next.labelGroups;
  return tasksSchema.parse(next);
}
/** The group a label is in, if any. */
export const groupOf = (record: Pick<Tasks, 'labelGroups'>, label: string): LabelGroup | undefined => record.labelGroups?.find(g => g.labels.includes(clean(label)));
/** Open tasks that carry two or more labels of a group (left as they are until their next change). */
export const tasksWithSeveral = (record: Tasks, group: Pick<LabelGroup, 'labels'>): number => record.tasks.filter(t => !t.doneAt && (t.labels ?? []).filter(l => group.labels.includes(l)).length > 1).length;
