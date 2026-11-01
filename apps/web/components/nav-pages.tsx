'use client';
import {useEffect} from 'react';
import {registerNavExtra} from './nav-extras';

/**
 * Session AK G2 (RELEASE_REVIEW_2 R2-10; WIRING_AUDIT's proposal): Tasks, Notes and the Journal are navigation entries,
 * added the way NOVA's and the Checklist's are (components/nav-extras.ts), as 'compact' entries: the tablet rail, the
 * phone's More sheet and the search palette list them before Settings (never as a phone tab); the desktop sidebar does
 * not, so its PROTECTED design keeps every destination in a 900 px window (the lead's decision; the sidebar is the
 * owner's call). Music is no entry: its player and search open it. Fixed entries like Settings and Help, so the synced
 * page switches, whose strict schema older builds read, are unchanged. Mounted once by the shell; renders nothing.
 */
export function NavPages() {
  useEffect(() => {
    const off = [registerNavExtra(['/app/tasks', 'Tasks', 'tasks', 'compact']), registerNavExtra(['/app/notes', 'Notes', 'notes', 'compact']), registerNavExtra(['/app/journal', 'Journal', 'journal', 'compact'])];
    return () => { for (const remove of off) remove(); };
  }, []);
  return null;
}
