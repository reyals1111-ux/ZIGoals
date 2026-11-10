import {TASK_TITLE_MAX} from '../tasks/schema';
/**
 * Session AL fifth pass (lane L7-5b; Lisbon #337/338): the longest text one record of each kind holds, in one table, so a
 * message that is too long gets the same numbers the forms and the cards' schemas enforce. The schemas stay the source:
 * a task title (lib/tasks/schema.ts `TASK_TITLE_MAX`), a habit name (lib/habits.ts and the create-habit card, `title` max 100), a Checklist item of
 * your own (lib/ai/actions/schema.ts `checklist-add-custom`, text(60)) and a note ZIGi keeps (lib/ai/memory.ts, 500).
 * lib/ai/al-fifth-pass.test.ts checks each number against its schema.
 */
export const TEXT_LIMITS = {taskTitle: TASK_TITLE_MAX, habitTitle: 100, checklistItem: 60, memoryNote: 500} as const;
/** The longest thing an "add …" can become (a task, a habit or a Checklist item): beyond this, none of them holds it. */
export const ADD_TEXT_MAX = Math.max(TEXT_LIMITS.taskTitle, TEXT_LIMITS.habitTitle, TEXT_LIMITS.checklistItem);
