/** Session AK (T1, T2): the Agenda's newer kinds of item (lib/agenda/time-items.ts), in a module with no imports. */
export const EXTRA_SOURCES = ['task', 'event'] as const;
export type ExtraSource = (typeof EXTRA_SOURCES)[number];
export const EXTRA_LABEL: Record<ExtraSource, string> = {task: 'Tasks', event: 'Imported calendars'};
