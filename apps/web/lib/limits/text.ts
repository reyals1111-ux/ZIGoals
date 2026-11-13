import {PROJECT_NAME_MAX, TASK_TITLE_MAX} from '../tasks/schema';
/**
 * Session AL fifth pass (lane L7-5b; Lisbon #337/338): the longest text one record of each kind holds, in one table, so a
 * message that is too long gets the same numbers the forms and the cards' schemas enforce. A task title (lib/tasks/schema.ts
 * `TASK_TITLE_MAX`), a habit name (lib/habits.ts and the create-habit card, `title` max 100), a Checklist item of your own
 * (lib/checklist/store.ts `MAX_LABEL`; the create card's `checklist-add-custom`, text(60)) and a note ZIGi keeps
 * (lib/ai/memory.ts, 500). lib/ai/al-fifth-pass.test.ts checks each number against its schema.
 *
 * Session AO (M-011, LS-H29): every form's name or title field for these records reads its limit from here (the habit
 * form, the Checklist quick add and rename, the goal creator and goal details, Tasks' subtask, project, section and saved
 * filter names), and the habit and Checklist schemas take theirs from here too; no value changed. A goal's name is 80
 * (the shared goal metadata, packages/shared-types `metadataSchema`, holds 80); an average goal's and a Health goal's
 * names are their own records' 100 (lib/average-goals/store.ts, lib/positions.ts `healthGoalSchema`).
 */
export const TEXT_LIMITS = {
  goalName: 80, averageGoalName: 100, healthGoalName: 100,
  habitTitle: 100,
  taskTitle: TASK_TITLE_MAX, taskListName: PROJECT_NAME_MAX,
  checklistItem: 60,
  memoryNote: 500,
} as const;
/** The longest thing an "add …" can become (a task, a habit or a Checklist item): beyond this, none of them holds it. */
export const ADD_TEXT_MAX = Math.max(TEXT_LIMITS.taskTitle, TEXT_LIMITS.habitTitle, TEXT_LIMITS.checklistItem);
