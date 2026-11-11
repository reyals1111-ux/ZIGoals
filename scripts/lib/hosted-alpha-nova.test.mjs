import {readFileSync} from 'node:fs';
import {afterEach, expect, test, vi} from 'vitest';
import {composeCsp, connectSources} from '../../apps/web/lib/csp-compose.mjs';
import {MET_ORIGIN, NOVA_ACTIONS, NOVA_PATH, NOVA_REQUESTS, NOVA_SELECTORS as S, NOVA_STAGE, NOVA_WIDGETS, NOVA_WORDS, appOrigins, connectFindings, requestFindings} from './hosted-alpha-nova.mjs';

// Session AM (TIER 3 (verifier), ADR-038): stage 13's checks. A part that is not found is recorded (report.nova.absent)
// and becomes one review reason; a part that is there but wrong, and any request to MET Norway, fails the stage.
const BASE = 'http://127.0.0.1:3101';
const egress = JSON.parse(readFileSync(new URL('../../apps/web/lib/egress-policy.json', import.meta.url), 'utf8'));
const web = path => readFileSync(new URL(`../../apps/web/${path}`, import.meta.url), 'utf8');
const NONCE = 'bm9uY2U=';
const servedCsp = (options = {}) => composeCsp(egress, {nonce: NONCE, https: false, pathname: NOVA_PATH, ...options});
const known = connectSources(egress, 'app');
/** Node's fetch, which the stage uses only for a second read of the policy: here it answers with this policy, or with none. */
const secondRead = csp => { const fetcher = vi.fn(async () => new Response('', {status: 200, headers: csp ? {'content-security-policy': csp} : {}})); vi.stubGlobal('fetch', fetcher); return fetcher; };
afterEach(() => vi.unstubAllGlobals());

test('stage 13 is appended after the AL stage and is a browser stage, local too', () => {
  expect([NOVA_STAGE.number, NOVA_STAGE.key, NOVA_STAGE.browser, NOVA_STAGE.liveOnly, NOVA_STAGE.reportsItself]).toEqual([13, 'nova', true, false, false]);
  expect(NOVA_STAGE.name).toBe('NOVA: the calm stage, a request makes its widget, weather stays off');
});

// The selectors and words are the app's own: each is read from the component that writes it, so a rename fails here
// instead of on the owner's live run.
test('every selector and every word the stage reads is written by the app', () => {
  const client = web('components/nova/nova-page-client.tsx'), dashboard = web('components/nova/nova-dashboard.tsx'), parts = web('components/nova/stage/stage-parts.tsx');
  expect(client).toContain('className="nova-root"');
  expect(client).toContain("NOVA_VIEW_ATTRIBUTE = 'novaView'"); // <html data-nova-view="on">
  expect(web('components/nova/nova-chrome.css')).toContain(':root[data-nova-view="on"] :is(.app-sidebar,');
  expect(web('components/shell.tsx')).toContain('<aside className="app-sidebar"');
  expect(web('app/app/nova/page.tsx')).toContain("title: 'NOVA'");
  expect(dashboard).toContain('className="nova-frame"');
  expect(dashboard).toContain("data-stage={stage.shown.length ? 'set' : 'calm'}");
  expect(dashboard).toContain('<p className="sr-only" role="status" aria-live="polite">{status}</p>');
  const grid = web('components/nova/widget-grid.tsx');
  expect(grid).toContain('className="nova-widget" data-widget={widget.id}');
  expect(grid).toContain("data-made={live ? (fresh ? 'fresh' : pinned ? undefined : 'made') : undefined}");
  expect(web('components/nova/nova-stage.tsx')).toContain('className="nova-orb-button"');
  expect(web('components/nova/nova-command.tsx')).toContain('<form className="nova-command zg-glass"');
  expect(parts).toContain('className="ns-onetap" role="group" aria-label="One-tap requests"');
  expect(parts).toContain('className="ns-answer"');
  expect(parts).toContain("'Answered on this device · no AI used'");
  expect(parts).toContain('className="ns-actions" role="group"');
  // Session AM-2 (ADR-038 "AM-2", F2, deliberate): the keys are in every widget's head; the app writes no "More" menu any more.
  expect(parts).not.toContain('More for');
  expect(parts).not.toContain('ns-more');
  expect(parts).toContain('label: `Pin ${title}`');
  expect(parts).toContain('aria-label={`Hide ${title} in the dock`}');
  expect(parts).toContain('aria-label={`Close ${title}`}');
  expect(parts).toContain('aria-label={`Show ${widgetTitle(w.id)} again`}');
  const words = web('lib/nova/summon/words.ts'), catalog = web('lib/nova/widgets/catalog.ts');
  // Session AM (design review AM-D2, deliberate): the words the stage checks are the widget's own line and the announcement that carries it.
  expect(words).toContain("is on the stage: ${lines[widgets[0]!.id]} ${count}`");
  expect(words).toContain('export function answerWords(');
  expect(words).toContain(`ask: 'Show my habits this week', widget: '${NOVA_WIDGETS.habits.id}'`);
  expect(catalog).toContain(`{id: '${NOVA_WIDGETS.habits.id}', title: '${NOVA_WIDGETS.habits.title}'`);
  expect(catalog).toContain(`{id: '${NOVA_WIDGETS.weather.id}', title: '${NOVA_WIDGETS.weather.title}'`);
  expect(web('components/nova/stage/use-stage.ts')).toContain('message: `${title} left the stage.`');
  const weather = web('components/nova/widgets/weather.tsx');
  expect(weather).toContain('title="Weather is off"');
  expect(weather).toContain('this device asks MET Norway');
  const toast = web('components/ui/undo-toast.tsx');
  expect(toast).toContain('className="aa-toast"');
  expect(toast).toContain('className="aa-toast-undo"');
  expect(NOVA_WORDS).toEqual({answer: ['Habits this week', 'no AI used'], announced: 'Habits this week is on the stage', weatherOff: ['Weather is off', 'MET Norway'], closed: 'Habits this week left the stage.'});
  expect(NOVA_ACTIONS).toEqual({pin: {inline: 'Pin Habits this week'}, hide: {inline: 'Hide Habits this week in the dock'}, close: {inline: 'Close Habits this week'}});
  expect(S.dockChip).toBe('button[aria-label="Show Habits this week again"]');
  expect(S.inlineActions).toBe('.nova-widget[data-widget="habit-week"] .ns-actions');
  expect(Object.keys(S).filter(k => /more/i.test(k))).toEqual([]); // AM-2 (F2, deliberate): no "More" selector is left to read
});

test('the requests: MET Norway is always a finding (without its query), another origin too; the app\'s own origins are not', () => {
  // The verifier's own allow-list for the app's pages: the base and the Testnet's two endpoints.
  expect(appOrigins(BASE)).toEqual([BASE, 'https://testnet-rpc.zigchain.com', 'https://testnet-api.zigchain.com']);
  const verifier = readFileSync(new URL('../verify-hosted-alpha.mjs', import.meta.url), 'utf8');
  expect(verifier).toContain("report.alphaRequestOrigins.every(o=>[alpha,'https://testnet-rpc.zigchain.com','https://testnet-api.zigchain.com'].includes(o))");
  const found = requestFindings([
    `${BASE}/app/nova`, `${BASE}/_next/static/chunk.js`, `blob:${BASE}/3f0c`, 'data:image/png;base64,AAAA', 'about:blank',
    'https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info',
    'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=52.37&lon=4.90', 'https://example.com/pixel.gif', 'not a url',
  ], BASE);
  expect(found.weather).toEqual(['https://api.met.no/weatherapi/locationforecast/2.0/compact']);
  expect(found.foreign).toEqual(['https://example.com', 'not a url']);
  expect(found.origins).toEqual([BASE, 'https://testnet-api.zigchain.com', 'https://example.com']);
  expect(requestFindings([`${BASE}/app/nova`], BASE)).toEqual({weather: [], foreign: [], origins: [BASE]});
});

test('connect-src: MET Norway exactly once and nothing the reviewed list lacks; a dev socket is a note on a loopback base only', () => {
  expect(known.filter(source => source === MET_ORIGIN)).toHaveLength(1);
  expect(connectFindings(servedCsp(), {known, base: BASE})).toEqual({read: true, problems: [], notes: []});
  // A development server adds its refresh socket: a note on an http:// loopback base, a problem anywhere else.
  const dev = connectFindings(servedCsp({development: true}), {known, base: BASE});
  expect(dev.problems).toEqual([]); expect(dev.notes).toEqual(['connect-src has ws://127.0.0.1:3100: a development server\'s refresh socket (not in a production build)']);
  expect(connectFindings(servedCsp({development: true}), {known, base: 'https://alpha.zigoals.app'}).problems).toEqual(['connect-src has a source the reviewed list does not: ws://127.0.0.1:3100']);
  expect(connectFindings(servedCsp().replace(` ${MET_ORIGIN}`, ''), {known, base: BASE}).problems).toEqual([`connect-src lacks ${MET_ORIGIN}`]);
  expect(connectFindings(servedCsp().replace(MET_ORIGIN, `${MET_ORIGIN} ${MET_ORIGIN}`), {known, base: BASE}).problems).toEqual([`connect-src names ${MET_ORIGIN} 2 times`]);
  expect(connectFindings(servedCsp().replace(MET_ORIGIN, `${MET_ORIGIN} https://api.open-meteo.com`), {known, base: BASE}).problems).toEqual(['connect-src has a source the reviewed list does not: https://api.open-meteo.com']);
  // Without the reviewed list (a browser spec): exactly once still holds, a second way to MET Norway is a problem, and the note says what was not compared.
  const bare = connectFindings(servedCsp().replace(MET_ORIGIN, `${MET_ORIGIN} https://*.met.no`));
  expect(bare.problems).toEqual(['connect-src has another MET Norway source: https://*.met.no']); expect(bare.notes).toHaveLength(1);
  expect(connectFindings(servedCsp()).problems).toEqual([]);
  expect(connectFindings(undefined, {known, base: BASE})).toEqual({read: false, problems: [], notes: []});
  expect(connectFindings("default-src 'self'", {known, base: BASE}).read).toBe(false);
});

/**
 * A fake NOVA: what this build has, and what the stage did with it. `has` switches a part off; `actions` is how Pin, Hide
 * and Close are reached ('inline' or 'none'); `asks` lists the outside addresses a weather question fetches.
 */
function fakeNova({loads = true, stage = true, actions = 'inline', has = {}, csp = servedCsp(), title = 'NOVA · ZIGoals Alpha', weatherText = 'Weather is off. Turn it on and this device asks MET Norway.', asks = [], sidebarHidden = true, startWith = []} = {}) {
  const part = {habits: true, weather: true, answer: true, announce: true, chip: true, toast: true, clear: true, command: true, ...has};
  const calls = [], listeners = new Set();
  const state = {widgets: new Set(startWith), docked: new Set(), answer: '', status: '', toast: ''};
  const emit = url => { for (const listener of [...listeners]) listener({url: () => url}); };
  const H = NOVA_WIDGETS.habits.id, W = NOVA_WIDGETS.weather.id;
  /** The elements a selector finds now: {text, visible, attrs}. */
  const find = selector => {
    const one = (text = '', visible = true, attrs = {}) => [{text, visible, attrs}];
    const inline = kind => `${S.inlineActions} button[aria-label="${NOVA_ACTIONS[kind].inline}"]`;
    if (selector === S.hydrated || selector === S.root || selector === S.frame) return loads ? one() : [];
    if (selector === S.fullWindow) return one();
    if (selector === S.sidebar) return one('Today Goals', !sidebarHidden);
    if (selector === S.stage) return stage ? one('', true, {'data-stage': state.widgets.size ? 'set' : 'calm'}) : [];
    if (selector === S.calm) return stage && !state.widgets.size ? one() : [];
    if (selector === S.set) return stage && state.widgets.size ? one() : [];
    if (selector === S.widget || selector === S.made) return [...state.widgets].flatMap(() => one());
    if (selector === S.star || selector === S.oneTap) return one();
    if (selector === S.command) return part.command ? one() : [];
    if (selector === S.answer) return state.answer ? one(state.answer) : [];
    if (selector === S.status) return one(state.status);
    if (selector === S.habits) return state.widgets.has(H) ? one('Habits this week') : [];
    if (selector === S.weather) return state.widgets.has(W) ? one(`Weather ${weatherText}`) : [];
    if (selector === S.inlineActions) return state.widgets.has(H) ? one('', actions === 'inline') : [];
    if (['pin', 'hide', 'close'].some(kind => selector === inline(kind))) return state.widgets.has(H) ? one('', actions === 'inline') : [];
    if (selector === S.dockChip) return state.docked.has(H) ? one('Habits this week') : [];
    if (selector === S.toast) return state.toast ? one(`${state.toast} Undo ×`) : [];
    if (selector === S.toastUndo) return state.toast ? one('Undo') : [];
    throw Error(`the fake has no ${selector}`);
  };
  const act = selector => {
    const is = kind => selector === `${S.inlineActions} button[aria-label="${NOVA_ACTIONS[kind].inline}"]`;
    if (is('hide')) { state.widgets.delete(H); if (part.chip) state.docked.add(H); }
    else if (is('close')) { state.widgets.delete(H); if (part.toast) state.toast = NOVA_WORDS.closed; }
    else if (selector === S.dockChip) { state.docked.delete(H); state.widgets.add(H); }
  };
  const enter = words => {
    if (words === NOVA_REQUESTS.habits && part.habits) {
      state.widgets.add(H);
      if (part.answer) state.answer = 'NOVA: Habits this week: You have no habits yet. Answered on this device · no AI used';
      if (part.announce) state.status = 'Habits this week is on the stage: You have no habits yet. 1 widget on the stage.';
    } else if (words === NOVA_REQUESTS.weather && part.weather) { state.widgets.add(W); for (const url of asks) emit(url); }
    else if (words === NOVA_REQUESTS.clear && part.clear) state.widgets.clear();
  };
  const locator = (selector, texts = []) => {
    const now = () => find(selector).filter(el => texts.every(text => el.text.toLowerCase().includes(text.toLowerCase())));
    let typed = '';
    const self = {
      first: () => self,
      filter: ({hasText}) => locator(selector, [...texts, hasText]),
      count: async () => now().length,
      waitFor: async ({state: wanted, timeout}) => {
        const els = now(), ok = wanted === 'attached' ? els.length > 0 : wanted === 'visible' ? els.some(el => el.visible) : wanted === 'hidden' ? !els.some(el => el.visible) : els.length === 0;
        if (!ok) throw Error(`Timeout ${timeout}ms exceeded waiting for ${selector} to be ${wanted}`);
      },
      getAttribute: async name => now()[0]?.attrs[name] ?? null,
      innerText: async () => now()[0]?.text ?? '',
      click: async () => { if (!now().some(el => el.visible)) throw Error(`click: ${selector} is not there`); calls.push(['click', selector, ...texts]); act(selector, texts[0]); },
      fill: async words => { if (!now().length) throw Error(`fill: ${selector} is not there`); typed = words; calls.push(['fill', words]); },
      press: async key => { calls.push(['press', key]); if (key === 'Enter') enter(typed); },
    };
    return self;
  };
  const page = {
    goto: async url => {
      calls.push(['goto', url]);
      if (!loads) throw Error('net::ERR_CONNECTION_REFUSED');
      await Promise.resolve();
      for (const path of [NOVA_PATH, '/_next/static/chunks/nova.js']) emit(BASE + path);
      return {headers: () => (csp === null ? {} : {'content-security-policy': csp})};
    },
    on: (name, listener) => { calls.push(['on', name]); listeners.add(listener); },
    off: (name, listener) => { calls.push(['off', name]); listeners.delete(listener); },
    setViewportSize: async size => calls.push(['viewport', size.width]),
    title: async () => title,
    locator: selector => locator(selector),
  };
  return {page, calls, state, listeners};
}
const run = async (options, {policy = egress, review = []} = {}) => {
  const fake = fakeNova(options), report = {review};
  let failure = null;
  await NOVA_STAGE.run(fake.page, {base: BASE, report, egressPolicy: policy, expect: () => { throw Error('expect is not used'); }}).catch(error => { failure = error; });
  return {...fake, report, failure};
};

test('a complete NOVA: the page first, the three requests as typed, nothing absent, nothing wrong, and the watch taken off', async () => {
  const {calls, report, failure, listeners} = await run();
  expect(failure).toBeNull();
  // The first page call is the goto; the request watch is attached right after it, before the page answers.
  expect(calls.slice(0, 2)).toEqual([['goto', BASE + NOVA_PATH], ['on', 'request']]);
  expect(calls.filter(c => c[0] === 'fill').map(c => c[1])).toEqual(['Show my habits this week', 'What\'s the weather?', 'clear the stage']);
  expect(calls.filter(c => c[0] === 'press')).toHaveLength(3);
  expect(calls.filter(c => c[0] === 'click').map(c => c[1])).toEqual([
    `${S.inlineActions} button[aria-label="Hide Habits this week in the dock"]`, S.dockChip, `${S.inlineActions} button[aria-label="Close Habits this week"]`,
  ]);
  expect(calls.at(-1)).toEqual(['off', 'request']); expect(listeners.size).toBe(0);
  expect(report.nova).toEqual({absent: [], problems: [], notes: [], requests: 2, requestOrigins: [BASE]});
  expect(report.review).toEqual([]);
});

test('AM-2 (F2, deliberate; was "a narrow panel reaches them through More"): the keys are pressed in the widget\'s head and nowhere else', async () => {
  const {calls, report, failure} = await run({});
  expect(failure).toBeNull();
  const clicks = calls.filter(c => c[0] === 'click').map(c => c[1]);
  expect(clicks).toEqual([`${S.inlineActions} button[aria-label="Hide Habits this week in the dock"]`, S.dockChip, `${S.inlineActions} button[aria-label="Close Habits this week"]`]);
  expect(clicks.some(c => /more/i.test(String(c)))).toBe(false);
  expect(report.nova.absent).toEqual([]); expect(report.review).toEqual([]);
});

test('a missing widget is a report item and one review reason, never an exception; the other checks still run', async () => {
  const {calls, report, failure} = await run({has: {habits: false}});
  expect(failure).toBeNull();
  expect(report.nova.absent).toEqual([`the Habits this week widget (${S.habits}) after "Show my habits this week"`]);
  expect(report.nova.problems).toEqual([]);
  expect(report.review).toHaveLength(1);
  expect(report.review[0]).toMatch(/^stage 13 \(NOVA\): 1 part\(s\) could not be checked: the Habits this week widget /);
  // No widget, so nothing to pin, hide or close; the weather and the stage command were still asked.
  expect(calls.some(c => c[0] === 'click')).toBe(false);
  expect(calls.filter(c => c[0] === 'fill').map(c => c[1])).toEqual(['Show my habits this week', 'What\'s the weather?', 'clear the stage']);
});

test('each smaller missing part is recorded the same way: the line, the announcement, the actions, the chip, the toast, the weather widget', async () => {
  for (const [options, absent] of [
    [{has: {answer: false}}, `NOVA's line under the star (${S.answer})`],
    [{has: {announce: false}}, `the polite announcement "Habits this week is on the stage" (${S.status})`],
    [{actions: 'none'}, `the widget's Pin, Hide and Close (${S.inlineActions} is not visible)`],
    [{has: {chip: false}}, `the dock chip "Show Habits this week again" (${S.dockChip})`],
    [{has: {toast: false}}, `the toast after Close (${S.toast})`],
    [{has: {weather: false}}, `the weather widget (${S.weather}) after "What's the weather?"`],
    [{has: {command: false}}, `the command field (${S.command}), so no request was typed`],
    [{csp: null}, '/app/nova\'s Content-Security-Policy connect-src (no policy in the page\'s own answer, nor in a second read)'],
  ]) {
    const fetcher = secondRead(null);
    const {report, failure} = await run(options);
    expect(fetcher.mock.calls.map(([url]) => url), absent).toEqual(options.csp === null ? [BASE + NOVA_PATH] : []);
    expect(failure, absent).toBeNull();
    expect(report.nova.absent, absent).toEqual([absent]);
    expect(report.review, absent).toHaveLength(1);
  }
});

test('an answer without its policy is read once more with Node\'s fetch, outside the page; that policy is checked the same way', async () => {
  const fetcher = secondRead(servedCsp());
  const fine = await run({csp: null});
  expect(fine.failure).toBeNull(); expect(fine.report.nova.absent).toEqual([]); expect(fine.report.nova.notes).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  // The second read is not the page's: the request watch never sees it.
  expect(fine.report.nova.requests).toBe(2);
  secondRead(servedCsp().replace(` ${MET_ORIGIN}`, ''));
  const lacking = await run({csp: null});
  expect(lacking.failure?.message).toMatch(/NOVA stage/); expect(lacking.report.nova.problems).toEqual([`connect-src lacks ${MET_ORIGIN}`]);
});

test('a build without the made-on-request stage is recorded and nothing is typed', async () => {
  const {calls, report, failure} = await run({stage: false, csp: servedCsp().replace(` ${MET_ORIGIN}`, '')});
  expect(failure).toBeNull();
  expect(report.nova.absent).toHaveLength(1);
  expect(report.nova.absent[0]).toMatch(/^the made-on-request stage \(\.nova-frame\[data-stage\]\): not in this build/);
  expect(report.nova.problems).toEqual([]);
  expect(calls.some(c => c[0] === 'fill' || c[0] === 'click')).toBe(false);
  expect(report.review).toHaveLength(1);
});

test('a request to api.met.no while Weather is off fails the stage, and the report names it without the place', async () => {
  const {report, failure} = await run({asks: ['https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=52.37&lon=4.90']});
  expect(failure).toMatchObject({name: 'AssertionError'});
  expect(failure.message).toMatch(/NOVA stage/);
  expect(report.nova.problems).toEqual(['1 request(s) to MET Norway while Weather is off: https://api.met.no/weatherapi/locationforecast/2.0/compact']);
  expect(JSON.stringify(report.nova)).not.toContain('52.37');
  expect(report.nova.absent).toEqual([]);
});

test('a request to any other outside origin fails the stage too', async () => {
  const {report, failure} = await run({asks: ['https://example.com/collect?x=1']});
  expect(failure?.message).toMatch(/NOVA stage/);
  expect(report.nova.problems).toEqual(['a request left the app\'s own origins: https://example.com']);
  expect(report.nova.requestOrigins).toEqual([BASE, 'https://example.com']);
});

test('a part that is there but wrong is a problem: a weather widget that is not off, a stage that is not calm, a visible sidebar, a wrong title, a stage command that clears nothing', async () => {
  for (const [options, problem] of [
    [{weatherText: '12 C, light rain. Data from MET Norway'}, /^the weather widget does not say "Weather is off" and "MET Norway"; it reads "Weather 12 C, light rain/],
    [{startWith: ['orbit']}, /^the stage is not calm on a profile without an arrangement: data-stage="set"$/],
    [{sidebarHidden: false}, /^the app's sidebar \(aside\.app-sidebar\) is still visible behind NOVA$/],
    [{title: 'Today · ZIGoals Alpha'}, /^the page title does not start with NOVA: "Today · ZIGoals Alpha"$/],
    [{has: {clear: false}}, /^"clear the stage" left 1 made widget\(s\) on the stage$/],
    [{csp: servedCsp().replace(` ${MET_ORIGIN}`, '')}, /^connect-src lacks https:\/\/api\.met\.no$/],
  ]) {
    const {report, failure} = await run(options);
    expect(failure?.message, String(problem)).toMatch(/NOVA stage/);
    expect(report.nova.problems[0], String(problem)).toMatch(problem);
  }
});

test('a page that does not load throws at once, and the watch is taken off', async () => {
  const {calls, failure, listeners} = await run({loads: false});
  expect(failure?.message).toMatch(/ERR_CONNECTION_REFUSED/);
  expect(calls).toEqual([['goto', BASE + NOVA_PATH], ['on', 'request'], ['off', 'request']]);
  expect(listeners.size).toBe(0);
});

test('without an egress policy (a browser spec) the list is not compared: a note, never a review reason; a report without a review list still works', async () => {
  const fake = fakeNova(), report = {};
  await NOVA_STAGE.run(fake.page, {base: BASE, report});
  expect(report.nova.absent).toEqual([]); expect(report.nova.problems).toEqual([]);
  expect(report.nova.notes).toEqual(['connect-src against the reviewed list: not compared (this run has no egress policy); stage 1 compares it on the owner\'s run']);
  expect(report.review).toBeUndefined();
  // A development server's policy on a loopback base: the socket is a note, the stage passes.
  const dev = await run({csp: servedCsp({development: true})});
  expect(dev.failure).toBeNull(); expect(dev.report.nova.notes).toHaveLength(1); expect(dev.report.review).toEqual([]);
});
