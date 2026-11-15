import {describe, expect, test} from 'vitest';
import {MORE_PAGES_OFF, moreSheetLabels, moreSheetRows} from './more-rows';

// Session AO (DV-274, NB-045): the phone's More sheet and Settings' preview of it come from one list.
type Item = readonly [string, string, string];
const MORE: Item[] = [['/app/activity', 'Activity', 'activity'], ['/app/nova', 'NOVA', 'star'], ['/app/journey', 'Journey', 'star'], ['/app/checklist', 'Checklist', 'check'], ['/app/settings', 'Settings', 'settings'], ['/app/help', 'Help', 'help']];

describe('the More sheet, row by row', () => {
  test('pages first (the navigation\'s Journey entry left out), then Journey, More pages, ZIGi, the soundtrack, Status & wallet, Settings and Help', () => {
    const rows = moreSheetRows(MORE, {view: {version: 1, hidden: ['chess']}, gameOn: true});
    expect(rows.map(row => row.kind)).toEqual(['page', 'page', 'page', 'journey', 'more-pages', 'zigi', 'music', 'status', 'page', 'page']);
    expect(moreSheetLabels(rows)).toEqual(['Activity', 'NOVA', 'Checklist', 'Journey', 'More pages', 'Your soundtrack', 'Status & wallet', 'Settings', 'Help']);
  });
  test('the game layer off, every page shown and the music player hidden: no Journey, no More pages, no soundtrack; Status & wallet always', () => {
    const rows = moreSheetRows(MORE, {view: {version: 1, hidden: ['music']}, gameOn: false});
    expect(moreSheetLabels(rows)).toEqual(['Activity', 'NOVA', 'Checklist', 'Status & wallet', 'Settings', 'Help']);
    expect(rows.filter(row => row.kind === 'zigi')).toHaveLength(1); // ZIGi's own row decides for itself; never named on a phone
  });
  test('"More pages" shows while any page that starts off is off', () => {
    for (const id of MORE_PAGES_OFF) expect(moreSheetLabels(moreSheetRows(MORE, {view: {version: 1, hidden: [id, 'music']}, gameOn: false})), id).toContain('More pages');
  });
});
