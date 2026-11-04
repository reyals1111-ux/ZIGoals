import * as z from 'zod';
import type {DeviceRecordSpec} from '../device-record';

/**
 * Session AL (owner decisions O3, O4): the apps and extras that live outside the main pages. Below 901 px they are listed
 * in one "Apps & extras" sheet (no floating launchers there); on a computer NOVA, Tasks, Notes, the Journal and the Agenda
 * also form the sidebar's foldable "Apps" group. ZIGi, Music and Earn keep the switches they already had (Your pages &
 * buttons, Earn's device switch); the Checklist keeps its "Checklist button" choice (ui-prefs `checklist.launcher`).
 */
export type AppsExtraId = 'zigi' | 'nova' | 'checklist' | 'tasks' | 'notes' | 'journal' | 'agenda' | 'earn' | 'music';
/** The sheet's order (O3). */
export const APPS_EXTRAS_ORDER: readonly AppsExtraId[] = ['zigi', 'nova', 'checklist', 'tasks', 'notes', 'journal', 'agenda', 'earn', 'music'];
/** The pages that are apps (O4): the sidebar's Apps group, in this order. */
export const SIDEBAR_APP_IDS = ['nova', 'tasks', 'notes', 'journal', 'agenda'] as const;
export type SidebarAppId = typeof SIDEBAR_APP_IDS[number];
/** The apps whose switch is this record's (the others have theirs elsewhere, see above). */
export const SWITCHED_HERE: readonly AppsExtraId[] = SIDEBAR_APP_IDS;

export type AppsExtra = {id: AppsExtraId; label: string; icon: string; note: string; href?: string};
// Session AL (DV-162, DV-255): the one-line notes tell the Checklist, Tasks and Notes apart (the same words in More).
export const APPS_EXTRAS: Readonly<Record<AppsExtraId, AppsExtra>> = {
  zigi: {id: 'zigi', label: 'ZIGi', icon: 'star', note: 'Your Personal AI Companion'},
  nova: {id: 'nova', label: 'NOVA', icon: 'star', note: 'Your whole life on one screen', href: '/app/nova'},
  checklist: {id: 'checklist', label: 'Checklist', icon: 'checklist', note: 'Today’s short list: the few things you starred', href: '/app/checklist'},
  tasks: {id: 'tasks', label: 'Tasks', icon: 'tasks', note: 'Everything to do, by day, project or goal', href: '/app/tasks'},
  notes: {id: 'notes', label: 'Notes', icon: 'notes', note: 'Quick thoughts to keep and sort later', href: '/app/notes'},
  journal: {id: 'journal', label: 'Journal', icon: 'journal', note: 'How your days felt, in your words', href: '/app/journal'},
  agenda: {id: 'agenda', label: 'Agenda', icon: 'today', note: 'Your day, hour by hour', href: '/app/agenda'},
  earn: {id: 'earn', label: 'Earn', icon: 'earn', note: 'Every way to earn, with live numbers and risks', href: '/app/earn'},
  music: {id: 'music', label: 'Music', icon: 'music', note: 'Focus sounds, Spotify or Apple Music'},
};
export const SIDEBAR_APP_HREFS: readonly string[] = SIDEBAR_APP_IDS.map(id => APPS_EXTRAS[id].href!);

/**
 * `zigoals:apps:v1` (device-only, never synced): which of the five app pages are switched off on this device (`hidden`,
 * absent = every app shows) and whether the sidebar's Apps group is folded (`sidebarFolded`, absent = open). Loose and
 * tolerant like the other display records: an id this build does not know is kept but ignored, a value it cannot read is
 * dropped on the next write and never makes the record unreadable. No personal record lives here.
 */
export const APPS_PREFS_KEY = 'zigoals:apps:v1';
export const appsPrefsSchema = z.looseObject({
  version: z.literal(1),
  hidden: z.array(z.string().max(24)).max(32).optional().catch(undefined),
  sidebarFolded: z.boolean().optional().catch(undefined),
});
export type AppsPrefs = z.infer<typeof appsPrefsSchema>;
export const emptyAppsPrefs = (): AppsPrefs => ({version: 1});
export const APPS_PREFS: DeviceRecordSpec<AppsPrefs> = {key: APPS_PREFS_KEY, schema: appsPrefsSchema, empty: emptyAppsPrefs};

/** Whether one of the five app pages is switched on here (every app is, until the person turns it off). */
export const appShown = (prefs: AppsPrefs, id: AppsExtraId): boolean => !SWITCHED_HERE.includes(id) || !(prefs.hidden ?? []).includes(id);
/** The person's switch for one app page; unknown ids from a newer build are kept as they are. */
export function withAppShown(prefs: AppsPrefs, id: AppsExtraId, shown: boolean): AppsPrefs {
  if (!SWITCHED_HERE.includes(id)) throw Error('That app has its own switch.');
  const rest = (prefs.hidden ?? []).filter(h => h !== id), hidden = shown ? rest : [...rest, id];
  const next: AppsPrefs = {...prefs, version: 1};
  if (hidden.length) next.hidden = hidden; else delete next.hidden;
  return next;
}
export const sidebarFolded = (prefs: AppsPrefs): boolean => prefs.sidebarFolded === true;
export function withSidebarFolded(prefs: AppsPrefs, folded: boolean): AppsPrefs {
  const next: AppsPrefs = {...prefs, version: 1};
  if (folded) next.sidebarFolded = true; else delete next.sidebarFolded;
  return next;
}

/** What the person switched on, given the switches that live elsewhere. */
export type AppsSwitches = {prefs: AppsPrefs; zigi: boolean; music: boolean; earn: boolean; checklist: boolean};
export function appsExtrasShown(s: AppsSwitches): AppsExtraId[] {
  return APPS_EXTRAS_ORDER.filter(id => {
    if (id === 'zigi') return s.zigi;
    if (id === 'music') return s.music;
    if (id === 'earn') return s.earn;
    if (id === 'checklist') return s.checklist;
    return appShown(s.prefs, id);
  });
}
