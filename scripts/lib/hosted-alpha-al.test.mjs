import {afterEach, expect, test, vi} from 'vitest';
import {AL_PATHS, AL_STAGE, EXTRAS_BUTTON, EXTRAS_DIALOG, PLANS_LINES, SIDEBAR_GROUP, htmlText, pageState, plansMissing, readAlPages} from './hosted-alpha-al.mjs';

// Session AL (TIER 3 (verifier)): stage 12's checks. Every part skips cleanly (report.al.absent) when the build lacks it.
const BASE = 'http://127.0.0.1:3101';
const PLANS_HTML = '<main><h1>Plans</h1><p>Placeholder prices</p><p>Nothing is charged during the Alpha&nbsp;— you can switch at any time.</p></main>';
const answer = (status, body = '') => new Response(status === 204 || (status >= 300 && status < 400) ? null : body, {status, headers: status >= 300 && status < 400 ? {location: '/app'} : {}});
const fetcherOf = map => vi.fn(async url => { const path = new URL(url).pathname; const [status, body] = map[path] ?? [404, '']; return answer(status, body); });

afterEach(() => vi.unstubAllGlobals());

test('stage 12 is appended after the AK stage and is a browser stage, local too', () => {
  expect([AL_STAGE.number, AL_STAGE.key, AL_STAGE.browser, AL_STAGE.liveOnly, AL_STAGE.reportsItself]).toEqual([12, 'al', true, false, false]);
});
test('a page answer: 200 present, 404 or a redirect absent, anything else a problem', () => {
  expect(pageState('/app/plans', 200)).toBe('present');
  expect(pageState('/app/plans', 404)).toBe('absent');
  expect(pageState('/app/plans', 307)).toBe('absent');
  expect(pageState('/app/plans', 500)).toBe('/app/plans: unexpected answer 500');
  expect(pageState('/app/tasks', 403)).toBe('/app/tasks: unexpected answer 403');
});
test('the plans lines are read from the HTML text, case and spacing aside', () => {
  expect(htmlText(PLANS_HTML)).toContain('Nothing is charged during the Alpha — you can switch');
  expect(plansMissing(htmlText(PLANS_HTML))).toEqual([]);
  expect(plansMissing('Placeholder\n prices only')).toEqual([PLANS_LINES[1]]);
  expect(plansMissing('')).toEqual([...PLANS_LINES]);
  expect(htmlText('<script>"Placeholder prices"</script><p>x</p>')).toBe('x');
});
test('both pages present with both lines: nothing absent, nothing wrong', async () => {
  const fetcher = fetcherOf({[AL_PATHS.plans]: [200, PLANS_HTML], [AL_PATHS.tasks]: [200, '<main>Tasks</main>']});
  expect(await readAlPages({base: BASE, fetcher})).toEqual({absent: [], problems: [], plansNeedPage: []});
  expect(fetcher.mock.calls.map(([url, options]) => [url, options.redirect])).toEqual([[BASE + '/app/plans', 'manual'], [BASE + '/app/tasks', 'manual']]);
});
test('an older build (no plans page, or one switched off by a redirect) skips cleanly', async () => {
  const none = await readAlPages({base: BASE, fetcher: fetcherOf({[AL_PATHS.tasks]: [200, 'ok']})});
  expect(none.problems).toEqual([]); expect(none.absent).toEqual(['/app/plans: not in this build or switched off (404)']);
  const off = await readAlPages({base: BASE, fetcher: fetcherOf({[AL_PATHS.plans]: [307], [AL_PATHS.tasks]: [200, 'ok']})});
  expect(off.problems).toEqual([]); expect(off.absent).toEqual(['/app/plans: not in this build or switched off (307)']);
});
test('a broken page is a problem; plans HTML without a line asks the rendered page', async () => {
  const broken = await readAlPages({base: BASE, fetcher: fetcherOf({[AL_PATHS.plans]: [500], [AL_PATHS.tasks]: [502]})});
  expect(broken.problems).toEqual(['/app/plans: unexpected answer 500', '/app/tasks: unexpected answer 502']);
  const partial = await readAlPages({base: BASE, fetcher: fetcherOf({[AL_PATHS.plans]: [200, '<p>Placeholder prices</p>'], [AL_PATHS.tasks]: [200, 'ok']})});
  expect(partial.plansNeedPage).toEqual([PLANS_LINES[1]]);
});

// A fake page: which parts the build has, and what the stage did with them.
function fakePage({group = true, button = true, dialogOpens = true, plansText = ''} = {}) {
  const calls = [];
  let open = false;
  const exists = {[SIDEBAR_GROUP]: group, [EXTRAS_BUTTON]: button};
  const locator = selector => {
    const self = {
      selector,
      first: () => self,
      waitFor: async ({timeout}) => { calls.push(['waitFor', selector]); if (selector in exists && !exists[selector]) throw Error(`timeout ${timeout}`); },
      click: async () => { calls.push(['click', selector]); if (selector === EXTRAS_BUTTON && dialogOpens) open = true; },
      innerText: async () => plansText,
      visible: () => selector === EXTRAS_DIALOG ? open : (exists[selector] ?? true),
    };
    return self;
  };
  const page = {
    goto: async url => calls.push(['goto', url]),
    setViewportSize: async size => calls.push(['viewport', size.width]),
    locator,
    keyboard: {press: async key => { calls.push(['key', key]); open = false; }},
  };
  const expectFn = target => ({
    toBeVisible: async () => { if (!target.visible()) throw Error(`${target.selector} not visible`); },
    toBeHidden: async () => { if (target.visible()) throw Error(`${target.selector} still visible`); },
  });
  return {page, calls, expect: expectFn};
}
const allPages = () => vi.stubGlobal('fetch', fetcherOf({[AL_PATHS.plans]: [200, PLANS_HTML], [AL_PATHS.tasks]: [200, 'ok']}));

test('the stage opens Today first, checks the sidebar at 1280, the dialog at 900, and ends at 1280', async () => {
  allPages();
  const {page, calls, expect: e} = fakePage();
  const report = {};
  await AL_STAGE.run(page, {base: BASE, expect: e, report});
  expect(calls[0]).toEqual(['goto', BASE + '/app']);
  expect(calls.filter(c => c[0] === 'viewport').map(c => c[1])).toEqual([1280, 900, 1280]);
  expect(calls).toContainEqual(['click', EXTRAS_BUTTON]);
  expect(calls).toContainEqual(['key', 'Escape']);
  expect(report.al).toEqual({absent: [], problems: []});
});
test('a build without the AL navigation records both parts as absent and passes', async () => {
  allPages();
  const {page, calls, expect: e} = fakePage({group: false, button: false});
  const report = {};
  await AL_STAGE.run(page, {base: BASE, expect: e, report});
  expect(report.al.absent).toHaveLength(2);
  expect(calls.some(c => c[0] === 'click')).toBe(false);
});
test('a button whose dialog does not open fails the stage', async () => {
  allPages();
  const {page, expect: e} = fakePage({dialogOpens: false});
  await expect(AL_STAGE.run(page, {base: BASE, expect: e, report: {}})).rejects.toThrow(/not visible/);
});
test('plans lines missing from both the HTML and the rendered page fail the stage', async () => {
  vi.stubGlobal('fetch', fetcherOf({[AL_PATHS.plans]: [200, '<main>Plans</main>'], [AL_PATHS.tasks]: [200, 'ok']}));
  const {page, calls, expect: e} = fakePage({plansText: 'Plans · Placeholder prices'});
  const report = {};
  await expect(AL_STAGE.run(page, {base: BASE, expect: e, report})).rejects.toThrow(/AL stage/);
  expect(calls).toContainEqual(['goto', BASE + AL_PATHS.plans]);
  expect(report.al.problems).toEqual([`${AL_PATHS.plans}: "nothing is charged during the Alpha" missing`]);
});
test('plans lines rendered only on the client pass once the page shows them', async () => {
  vi.stubGlobal('fetch', fetcherOf({[AL_PATHS.plans]: [200, '<main></main>'], [AL_PATHS.tasks]: [200, 'ok']}));
  const {page, expect: e} = fakePage({plansText: 'Placeholder prices. Nothing is charged during the Alpha.'});
  const report = {};
  await AL_STAGE.run(page, {base: BASE, expect: e, report});
  expect(report.al.problems).toEqual([]);
});
