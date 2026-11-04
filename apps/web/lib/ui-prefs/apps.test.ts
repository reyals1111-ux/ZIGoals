import {describe, expect, it} from 'vitest';
import {APPS_PREFS, appShown, appsExtrasShown, appsPrefsSchema, emptyAppsPrefs, sidebarFolded, withAppShown, withSidebarFolded} from './apps';
import {readDeviceRecord} from '../device-record';

const store = (raw: string | null) => ({getItem: () => raw});
const on = {zigi: true, music: true, earn: true, checklist: true};

describe('zigoals:apps:v1 (Session AL, O3/O4)', () => {
  it('starts with every app shown and the sidebar group open', () => {
    const prefs = emptyAppsPrefs();
    expect(appsExtrasShown({prefs, ...on})).toEqual(['zigi', 'nova', 'checklist', 'tasks', 'notes', 'journal', 'agenda', 'earn', 'music']);
    expect(sidebarFolded(prefs)).toBe(false);
  });
  it('follows the switches that live elsewhere for ZIGi, Music, Earn and the Checklist', () => {
    expect(appsExtrasShown({prefs: emptyAppsPrefs(), zigi: false, music: false, earn: false, checklist: false})).toEqual(['nova', 'tasks', 'notes', 'journal', 'agenda']);
  });
  it('hides and shows an app page, and refuses the ones switched elsewhere', () => {
    const off = withAppShown(emptyAppsPrefs(), 'tasks', false);
    expect(off).toEqual({version: 1, hidden: ['tasks']});
    expect(appShown(off, 'tasks')).toBe(false);
    expect(appsExtrasShown({prefs: off, ...on})).not.toContain('tasks');
    expect(withAppShown(off, 'tasks', true)).toEqual({version: 1});
    expect(() => withAppShown(off, 'zigi', false)).toThrow();
  });
  it('remembers the fold, and only stores it while folded', () => {
    const folded = withSidebarFolded(emptyAppsPrefs(), true);
    expect(folded).toEqual({version: 1, sidebarFolded: true});
    expect(withSidebarFolded(folded, false)).toEqual({version: 1});
  });
  it('reads tolerantly: unknown fields and ids kept, a bad value dropped, bad bytes read as the defaults', () => {
    const newer = readDeviceRecord(store(JSON.stringify({version: 1, hidden: ['notes', 'future-app'], sidebarFolded: 'yes', extra: 1})), APPS_PREFS);
    expect(newer.unreadable).toBe(false);
    expect(newer.data).toEqual({version: 1, hidden: ['notes', 'future-app'], extra: 1});
    expect(appShown(newer.data, 'notes')).toBe(false);
    expect(withAppShown(newer.data, 'notes', true).hidden).toEqual(['future-app']);
    expect(readDeviceRecord(store('{nope'), APPS_PREFS)).toEqual({data: {version: 1}, unreadable: true});
    expect(appsPrefsSchema.safeParse({version: 2}).success).toBe(false);
  });
});
