// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {RELOAD_GUARD_MS, RELOAD_MARK, UPDATE_WAITING, isStaleCodeError, pageBusy, recoverFromStaleCode, servedBuild, takeUpdatedNotice, watchEdits} from './update-recovery';

// Session AV Part 2 ([TIER 3] (PWA), ADR-045 D-PWA): after a deploy, code of the previous version that is gone reloads the
// page once into the newest version, never while the person is busy, never in a loop, never offline.
const OLD = 'a'.repeat(40), NEW = 'b'.repeat(40);
/** The app's own server, naming the build it serves now (or failing). */
const serving = (build: string | Error) => vi.fn(async () => { if (build instanceof Error) throw build; return new Response(null, {headers: build ? {'x-zigoals-build': build} : {}}); }) as unknown as typeof fetch;
function fakeWindow(online = true) {
  const reload = vi.fn(), events: string[] = [];
  const win = {navigator: {onLine: online}, document, sessionStorage: window.sessionStorage, location: {reload}, dispatchEvent: (e: Event) => { events.push(e.type); return true; }} as unknown as Window;
  return {win, reload, events};
}
beforeEach(() => { window.sessionStorage.clear(); document.body.innerHTML = ''; });
afterEach(() => { vi.useRealTimers(); });

describe('which failures are a removed version of the code', () => {
  it('knows every browser\'s words for a chunk or module that could not be loaded', () => {
    for (const e of [Object.assign(new Error('Loading chunk 123 failed.'), {name: 'ChunkLoadError'}), new Error('Failed to load chunk /_next/static/chunks/0a1b.js from module 4410'), new Error('Module 123 was instantiated because it was required from module 456, but the module factory is not available. It might have been deleted in an HMR update.'), new TypeError('Failed to fetch dynamically imported module: https://alpha.zigoals.app/_next/static/chunks/x.js'), new TypeError('error loading dynamically imported module: https://x/y.js'), new TypeError('Importing a module script failed.'), 'Loading CSS chunk 77 failed', new Error('Unable to preload CSS for /_next/static/chunks/a.css')]) expect(isStaleCodeError(e), String(e)).toBe(true);
  });
  it('leaves every other error alone', () => {
    for (const e of [new Error('Private data is still loading.'), new TypeError('Cannot read properties of undefined'), new Error('Failed to fetch'), null, undefined, 42]) expect(isStaleCodeError(e), String(e)).toBe(false);
  });
});

describe('one reload into the newest version, only after a deploy', () => {
  const at = (t: number) => () => t;
  it('reloads once when the server serves another version, and marks it so the reloaded page can say so', async () => {
    const {win, reload} = fakeWindow();
    expect(await recoverFromStaleCode(win, OLD, {now: at(1_000), fetcher: serving(NEW)})).toBe('reloading');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.sessionStorage.getItem(RELOAD_MARK)!)).toEqual({at: 1_000, from: OLD});
  });
  it('the same version (a network hiccup, a refused file) changes nothing: the part keeps its own words', async () => {
    for (const server of [serving(OLD), serving(OLD.toUpperCase()), serving(''), serving(new Error('offline'))]) {
      const {win, reload, events} = fakeWindow();
      expect(await recoverFromStaleCode(win, OLD, {fetcher: server})).toBe('same-version');
      expect(reload).not.toHaveBeenCalled(); expect(events).toEqual([]);
    }
  });
  it('a page without a build commit (a local build) never reloads by itself', async () => {
    const {win, reload} = fakeWindow(), server = serving(NEW);
    expect(await recoverFromStaleCode(win, 'dev', {fetcher: server})).toBe('same-version');
    expect(server).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled();
  });
  it('never twice in ten minutes: the second failure shows the "new version is ready" note instead (no loop)', async () => {
    const {win, reload, events} = fakeWindow();
    await recoverFromStaleCode(win, OLD, {now: at(1_000), fetcher: serving(NEW)});
    expect(await recoverFromStaleCode(win, OLD, {now: at(1_000 + RELOAD_GUARD_MS - 1), fetcher: serving(NEW)})).toBe('guarded');
    expect(reload).toHaveBeenCalledTimes(1);
    expect(events).toEqual([UPDATE_WAITING]);
    expect(await recoverFromStaleCode(win, OLD, {now: at(1_000 + RELOAD_GUARD_MS + 1), fetcher: serving(NEW)})).toBe('reloading');
  });
  it('offline it never reloads and asks nothing (the page keeps its own offline words)', async () => {
    const {win, reload, events} = fakeWindow(false), server = serving(NEW);
    expect(await recoverFromStaleCode(win, OLD, {fetcher: server})).toBe('offline');
    expect(server).not.toHaveBeenCalled(); expect(reload).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });
  it('without tab storage (no guard that survives a reload) it never reloads by itself', async () => {
    const {win, reload, events} = fakeWindow();
    Object.defineProperty(win, 'sessionStorage', {get() { throw new Error('denied'); }});
    expect(await recoverFromStaleCode(win, OLD, {fetcher: serving(NEW)})).toBe('guarded');
    expect(reload).not.toHaveBeenCalled(); expect(events).toEqual([UPDATE_WAITING]);
  });
  it('asks the server with a HEAD that is never stored', async () => {
    const server = serving(NEW);
    expect(await servedBuild(server)).toBe(NEW);
    expect(server).toHaveBeenCalledWith('/app', {method: 'HEAD', cache: 'no-store', credentials: 'same-origin'});
  });
});

describe('never while the person is in the middle of something', () => {
  it.each([
    ['an open dialog', '<div role="dialog" aria-label="Log a meal"></div>'],
    ['a modal sheet', '<div aria-modal="true"></div>'],
    ['a native dialog', '<dialog open></dialog>'],
    ['a confirm card', '<div role="alertdialog"></div>'],
    ['an import or a restore at work', '<section data-update-hold=""></section>'],
  ])('%s holds the reload; the note shows', async (_, html) => {
    document.body.innerHTML = html;
    const {win, reload, events} = fakeWindow();
    expect(await recoverFromStaleCode(win, OLD, {fetcher: serving(NEW)})).toBe('held');
    expect(reload).not.toHaveBeenCalled(); expect(events).toEqual([UPDATE_WAITING]);
    expect(window.sessionStorage.getItem(RELOAD_MARK)).toBeNull();
  });
  it('a field the person typed into holds it until it is sent or emptied; fields only drawn on the page do not', () => {
    const stop = watchEdits(document);
    document.body.innerHTML = '<form><input name="v" value="drawn"><select><option>a</option><option>b</option></select><textarea></textarea></form>';
    expect(pageBusy(document)).toBe(false);
    const field = document.querySelector('textarea')!;
    field.value = 'half a note'; field.dispatchEvent(new Event('input', {bubbles: true}));
    expect(pageBusy(document)).toBe(true);
    field.value = ''; expect(pageBusy(document)).toBe(false);
    field.value = 'again'; expect(pageBusy(document)).toBe(true);
    document.querySelector('form')!.dispatchEvent(new Event('submit', {bubbles: true}));
    expect(pageBusy(document)).toBe(false);
    const choice = document.querySelector('select')!;
    choice.value = 'b'; choice.dispatchEvent(new Event('change', {bubbles: true}));
    expect(pageBusy(document)).toBe(true);
    stop();
  });
});

describe('"Updated to the newest version." after the reload', () => {
  it('once, and only when the version really changed', () => {
    window.sessionStorage.setItem(RELOAD_MARK, JSON.stringify({at: 1_000, from: OLD}));
    expect(takeUpdatedNotice(window.sessionStorage, NEW, 2_000)).toBe(true);
    expect(takeUpdatedNotice(window.sessionStorage, NEW, 2_500)).toBe(false);
    // The mark stays (as shown): the guard still holds for its ten minutes.
    expect(JSON.parse(window.sessionStorage.getItem(RELOAD_MARK)!)).toEqual({at: 1_000, from: OLD, shown: true});
  });
  it('a reload into the same version says nothing; an old mark is dropped; no mark, nothing', () => {
    window.sessionStorage.setItem(RELOAD_MARK, JSON.stringify({at: 1_000, from: OLD}));
    expect(takeUpdatedNotice(window.sessionStorage, OLD, 2_000)).toBe(false);
    window.sessionStorage.setItem(RELOAD_MARK, JSON.stringify({at: 1_000, from: OLD}));
    expect(takeUpdatedNotice(window.sessionStorage, NEW, 1_000 + RELOAD_GUARD_MS + 1)).toBe(false);
    expect(window.sessionStorage.getItem(RELOAD_MARK)).toBeNull();
    expect(takeUpdatedNotice(window.sessionStorage, NEW)).toBe(false);
  });
});
