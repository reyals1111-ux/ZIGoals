import {describe, expect, test} from 'vitest';
import {NAV_GROUP_START, NAV_ITEMS, navGroupOf} from '../../components/app-nav';
import {pagesSchema, type Pages} from './schema';
import {AVAILABLE_BUTTONS, AVAILABLE_PAGES, defaultView, everythingView, groupStarts, homeHref, hrefShown, isShown, pageIdForPath, phoneTabs, sameView, showEverything, startHref, startPage, viewOf, visiblePages, withChoice, withStart} from './visibility';

const AT = '2026-10-07T10:00:00.000Z', LATER = '2026-10-07T11:00:00.000Z';
const empty = (): Pages => ({version: 1, items: {}});
const hide = (...ids: Parameters<typeof withChoice>[1][]) => ids.reduce((p, id) => withChoice(p, id, false, AT), empty());
const nav = (pages: Pages | undefined, showcase = false) => NAV_ITEMS.filter(([href]) => hrefShown(viewOf(pages, showcase), href));
const labels = (items: readonly (readonly [string, string, ...unknown[]])[]) => items.map(item => item[1]);

describe('Your pages & buttons: the visible set (Session W Part 2)', () => {
  test('nothing chosen: exactly today\'s navigation, Chess and the music player hidden; Showcase shows everything', () => {
    expect(viewOf(undefined)).toEqual({version: 1, hidden: ['chess', 'music']});
    expect(viewOf(undefined, true)).toEqual({version: 1, hidden: []});
    // Session W Part 14: Chess is a page now; hidden by default, so the default navigation is exactly the one before it.
    const everyday = NAV_ITEMS.filter(([href]) => href !== '/app/chess');
    expect(everyday).toHaveLength(NAV_ITEMS.length - 1);
    expect(nav(undefined)).toEqual(everyday);
    expect(nav(undefined, true)).toEqual(NAV_ITEMS);
    expect(groupStarts(NAV_ITEMS, navGroupOf)).toEqual(NAV_GROUP_START);
    const {tabs, more} = phoneTabs(everyday);
    expect(labels(tabs)).toEqual(['Today', 'Goals', 'Habits', 'Health']);
    expect(labels(more)).toEqual(['Wealth', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Activity', 'Settings']);
    expect(groupStarts(more, navGroupOf)).toEqual(new Map([['/app/markets', 2], ['/app/ecosystem', 3]]));
    expect(labels(phoneTabs(NAV_ITEMS).more)).toEqual(['Wealth', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Chess', 'Activity', 'Settings']);
    expect(startHref(viewOf(undefined))).toBe('/app');
    expect(homeHref(viewOf(undefined))).toBe('/app');
  });
  test('only Habits and Health: two tabs, More holds Settings, Habits is the start page', () => {
    const pages = hide('today', 'goals', 'wealth', 'markets', 'staking', 'portfolio', 'ecosystem', 'activity');
    const items = nav(pages), {tabs, more} = phoneTabs(items);
    expect(labels(items)).toEqual(['Habits', 'Health', 'Settings']);
    expect(labels(tabs)).toEqual(['Habits', 'Health']);
    expect(labels(more)).toEqual(['Settings']);
    expect(groupStarts(items, navGroupOf)).toEqual(new Map([['/app/settings', 3]]));
    expect(groupStarts(more, navGroupOf)).toEqual(new Map());
    expect(startHref(viewOf(pages))).toBe('/app/habits');
    expect(homeHref(viewOf(pages))).toBe('/app/habits');
  });
  test('Today hidden: the first visible page opens and the home link follows; a chosen start page wins while it shows', () => {
    let pages = hide('today');
    expect(startHref(viewOf(pages))).toBe('/app/goals');
    pages = withStart(pages, 'health', AT);
    expect(startHref(viewOf(pages))).toBe('/app/health');
    expect(homeHref(viewOf(pages))).toBe('/app/health');
    // Hiding the chosen start page falls back to the first visible one without changing the choice.
    pages = withChoice(pages, 'health', false, LATER);
    expect(viewOf(pages).start).toBe('health');
    expect(startPage(viewOf(pages))).toBe('goals');
    // Back to "the first visible page" is a stamped choice too (null), never a removed field.
    pages = withStart(pages, null, LATER);
    expect(pages.start).toEqual({id: null, at: LATER});
    expect(pagesSchema.parse(pages)).toEqual(pages);
    expect(viewOf(pages).start).toBeUndefined();
  });
  test('every page hidden: only Settings is left, in More, and ZIGoals opens on Settings', () => {
    const pages = hide(...AVAILABLE_PAGES);
    const items = nav(pages), {tabs, more} = phoneTabs(items);
    expect(labels(items)).toEqual(['Settings']);
    expect(tabs).toEqual([]);
    expect(labels(more)).toEqual(['Settings']);
    expect(visiblePages(viewOf(pages))).toEqual([]);
    expect(startPage(viewOf(pages))).toBeNull();
    expect(startHref(viewOf(pages))).toBe('/app/settings');
    expect(homeHref(viewOf(pages))).toBe('/app/settings');
  });
  test('Settings and every address that is no page always show; Chess shows once switched on (Part 14)', () => {
    const view = viewOf(hide(...AVAILABLE_PAGES));
    for (const href of ['/app/settings', '/app/help', '/app/welcome', '/app/zigi']) expect(hrefShown(view, href)).toBe(true);
    expect(hrefShown(viewOf(empty()), '/app/chess')).toBe(false);
    expect(hrefShown(viewOf(withChoice(empty(), 'chess', true, AT)), '/app/chess')).toBe(true);
    expect(withStart(empty(), 'chess', AT).start).toEqual({id: 'chess', at: AT});
    expect(() => withChoice(empty(), 'settings' as never, false, AT)).toThrow('Choose a page or button ZIGoals has.');
  });
  test('"Show everything again" shows every page and button this build has, keeping the start page', () => {
    const pages = withStart(hide('today', 'goals', 'quick-add', 'zigi', 'wealth-shortcut'), 'health', AT);
    const shown = showEverything(pages, LATER);
    for (const id of [...AVAILABLE_PAGES, ...AVAILABLE_BUTTONS]) expect(shown.items[id]).toEqual({v: 'shown', at: LATER});
    expect(shown.start).toEqual({id: 'health', at: AT});
    expect(pagesSchema.parse(shown)).toEqual(shown);
    // The music player arrives with Part 20; Chess is shown with everything else since Part 14.
    expect(viewOf(shown).hidden).toEqual(['music']);
  });
  test('buttons: each switch is its own; the stored choice is stamped', () => {
    const pages = hide('quick-add', 'zigi');
    expect(pages.items).toEqual({'quick-add': {v: 'hidden', at: AT}, zigi: {v: 'hidden', at: AT}});
    const view = viewOf(pages);
    expect(isShown(view, 'quick-add')).toBe(false);
    expect(isShown(view, 'zigi')).toBe(false);
    expect(isShown(view, 'wealth-shortcut')).toBe(true);
    expect(isShown(viewOf(withChoice(pages, 'zigi', true, LATER)), 'zigi')).toBe(true);
  });
  test('a path belongs to its page, the old Staking address included; other addresses belong to none', () => {
    expect(pageIdForPath('/app')).toBe('today');
    expect(pageIdForPath('/app/goals/tracked/91')).toBe('goals');
    expect(pageIdForPath('/app/goals/positions')).toBe('staking');
    expect(pageIdForPath('/app/wealth/asset/x')).toBe('wealth');
    expect(pageIdForPath('/app/settings')).toBeNull();
    expect(pageIdForPath('/app/help')).toBeNull();
    expect(pageIdForPath('/app/goalsx')).toBeNull();
  });
  test('views compare by value; the defaults and "everything" are distinct', () => {
    expect(sameView(defaultView(), viewOf(undefined))).toBe(true);
    expect(sameView(defaultView(), everythingView())).toBe(false);
    expect(sameView(viewOf(withStart(empty(), 'goals', AT)), defaultView())).toBe(false);
  });
});
