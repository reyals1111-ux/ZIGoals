// Session AM (TIER 3 (verifier), ADR-038): the hosted verifier's NOVA stage, number 13, appended after every existing
// stage (no stage is renumbered). Browser-local: three requests are typed into NOVA's own command field on a profile
// that never arranged NOVA. No model, no wallet, nothing written to a server, and Weather stays off.
//
// It checks what AM ships (D1–D7, D12–D15): /app/nova takes the whole window; the stage is calm (no widget, the star,
// the command field, the one-tap requests); "Show my habits this week" makes its widget on this device, with NOVA's line
// under the star and the polite announcement; the widget has Pin, Hide and Close (Hide leaves a dock chip that brings it
// back, Close offers Undo and the stage is calm again); "What's the weather?" makes the weather widget in its off state,
// naming MET Norway, and no request goes to api.met.no at any time; "clear the stage" leaves no made widget; the page's
// connect-src names https://api.met.no exactly once and nothing the reviewed list does not; and every request of the
// stage stays on the origins the verifier allows the app's pages.
//
// Three lists under report.nova. `absent`: a part that was not found, or a step that could not be done. It never throws;
// it becomes one review reason (report.review), so a run that could not check NOVA never ends PASS. `problems`: a part
// that is there but wrong; any problem fails the stage, as in the AK and AL stages. `notes`: what a check did not apply
// to (a development server's policy), for information. Only a page that does not load throws at once.
// `expect` is not used (every wait here is the locator's own). No import.meta and no top-level await: the browser spec
// loads this file too.
import assert from 'node:assert/strict';
import {connectSources} from '../../apps/web/lib/csp-compose.mjs';
import {TESTNET} from '../../packages/chain-config/src/index.ts';
import {connectSrc} from './hosted-alpha-ak.mjs';

export const NOVA_PATH = '/app/nova';
/** The one outside service AM added (lib/egress-policy.json csp.app.connect; ADR-038 D12). */
export const MET_ORIGIN = 'https://api.met.no';
/** What the stage types, word for word (lib/nova/summon/summon.ts: a plain "show", a stage-only question, a stage command). */
export const NOVA_REQUESTS = Object.freeze({habits: 'Show my habits this week', weather: 'What\'s the weather?', clear: 'clear the stage'});
/** The made widgets the stage asks for: their catalogue id and title (lib/nova/widgets/catalog.ts). */
export const NOVA_WIDGETS = Object.freeze({habits: Object.freeze({id: 'habit-week', title: 'Habits this week'}), weather: Object.freeze({id: 'weather', title: 'Weather'})});
const widgetAt = id => `.nova-widget[data-widget="${id}"]`;
const HABITS = widgetAt(NOVA_WIDGETS.habits.id), HABITS_TITLE = NOVA_WIDGETS.habits.title;
/** Every selector the stage reads, as the app writes them (components/nova, components/ui/undo-toast.tsx). */
export const NOVA_SELECTORS = Object.freeze({
  hydrated: 'html[data-app-hydrated]',
  root: '.nova-root',
  fullWindow: 'html[data-nova-view="on"]',
  sidebar: 'aside.app-sidebar',
  frame: '.nova-frame',
  stage: '.nova-frame[data-stage]',
  calm: '.nova-frame[data-stage="calm"]',
  set: '.nova-frame[data-stage="set"]',
  widget: '.nova-widget',
  made: '.nova-widget[data-made]',
  star: '.nova-orb-button',
  command: '.nova-command input',
  oneTap: '[role="group"][aria-label="One-tap requests"]',
  answer: '.ns-answer',
  status: '.nova-frame [role="status"]',
  habits: HABITS,
  weather: widgetAt(NOVA_WIDGETS.weather.id),
  inlineActions: `${HABITS} .ns-actions`,
  moreButton: `${HABITS} button[aria-label="More for ${HABITS_TITLE}"]`,
  moreItem: `${HABITS} .ns-more-list .ns-more-item`,
  dockChip: `button[aria-label="Show ${HABITS_TITLE} again"]`,
  toast: '.aa-toast',
  toastUndo: '.aa-toast .aa-toast-undo',
});
/** Pin, Hide and Close: the inline button's name, and the same action's words under "More". */
export const NOVA_ACTIONS = Object.freeze({
  pin: Object.freeze({inline: `Pin ${HABITS_TITLE}`, more: 'Pin'}),
  hide: Object.freeze({inline: `Hide ${HABITS_TITLE} in the dock`, more: 'Hide in the dock'}),
  close: Object.freeze({inline: `Close ${HABITS_TITLE}`, more: 'Close'}),
});
/** The words each part must show (lib/nova/summon/words.ts, stage-parts.tsx, widgets/weather.tsx, stage/use-stage.ts). */
export const NOVA_WORDS = Object.freeze({
  // Session AM (design review AM-D2, deliberate): the answer is the widget's own line ("Habits this week: …"), not "On the
  // stage: <title>", and the announcement carries it ("Habits this week is on the stage: …").
  answer: Object.freeze([`${HABITS_TITLE}`, 'no AI used']),
  announced: `${HABITS_TITLE} is on the stage`,
  weatherOff: Object.freeze(['Weather is off', 'MET Norway']),
  closed: `${HABITS_TITLE} left the stage.`,
});
const S = NOVA_SELECTORS;
/** The page and its shell (as every stage waits), NOVA's own chunk, a widget a request makes, and a small part of one. */
const LOAD_MS = 20_000, STAGE_MS = 20_000, MAKE_MS = 30_000, APPEAR_MS = 10_000;
/** A narrow panel hides the inline group and shows "More" instead: the group is given this long before "More" is tried. */
const INLINE_MS = 1500;

/** The origins the verifier allows the app's pages (verify-hosted-alpha.mjs): the base and the Testnet's two endpoints. */
export function appOrigins(base) {
  return [base, new URL(TESTNET.rpcUrl).origin, new URL(TESTNET.restUrl).origin];
}
/**
 * What the stage's requests say. `weather`: every request to MET Norway (its address without the query, so no place is
 * recorded); `foreign`: every other origin outside appOrigins(base); `origins`: every origin asked. data: and about:
 * addresses are not requests; an address that cannot be read counts as foreign (fail closed).
 */
export function requestFindings(urls, base) {
  const allowed = appOrigins(base), weather = [], foreign = new Set(), origins = new Set();
  for (const raw of urls) {
    let url; try { url = new URL(raw); } catch { foreign.add(String(raw).slice(0, 80)); continue; }
    if (url.protocol === 'data:' || url.protocol === 'about:') continue;
    if (url.hostname === 'met.no' || url.hostname.endsWith('.met.no')) { weather.push(`${url.protocol}//${url.host}${url.pathname}`); continue; }
    origins.add(url.origin);
    if (!allowed.includes(url.origin)) foreign.add(url.origin);
  }
  return {weather, foreign: [...foreign], origins: [...origins]};
}
const DEV_SOCKET = /^ws:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?$/;
/**
 * The page's connect-src against what AM allows: MET Norway's origin exactly once, and no source the reviewed list
 * (`known`: connectSources(egressPolicy, 'app'); omitted where the run has no policy) does not have. On an http://
 * loopback base a development server adds its own refresh socket: that is a note, and never accepted on any other base.
 */
export function connectFindings(csp, {known, base = ''} = {}) {
  const list = connectSrc(csp), problems = [], notes = [];
  if (!list.length) return {read: false, problems, notes};
  const met = list.filter(source => source === MET_ORIGIN).length;
  if (met !== 1) problems.push(met ? `connect-src names ${MET_ORIGIN} ${met} times` : `connect-src lacks ${MET_ORIGIN}`);
  if (!known) {
    // Without the reviewed list, at least no second way to MET Norway (a bare or wildcard host).
    for (const source of list.filter(source => source !== MET_ORIGIN && /(?:^|[./*])met\.no\b/.test(source))) problems.push(`connect-src has another MET Norway source: ${source}`);
    notes.push('connect-src against the reviewed list: not compared (this run has no egress policy); stage 1 compares it on the owner\'s run');
    return {read: true, problems, notes};
  }
  const local = base.startsWith('http://');
  for (const source of [...new Set(list.filter(source => !known.includes(source)))]) {
    if (local && DEV_SOCKET.test(source)) notes.push(`connect-src has ${source}: a development server's refresh socket (not in a production build)`);
    else problems.push(`connect-src has a source the reviewed list does not: ${source}`);
  }
  return {read: true, problems, notes};
}

const waits = (locator, state, ms) => locator.first().waitFor({state, timeout: ms}).then(() => true, () => false);
const appears = (locator, ms = APPEAR_MS) => waits(locator, 'attached', ms);
const shows = (locator, ms = APPEAR_MS) => waits(locator, 'visible', ms);
const leaves = (locator, ms = APPEAR_MS) => waits(locator, 'detached', ms);
const firstLine = error => String(error instanceof Error ? error.message : error).split('\n')[0].replace(/\s+/g, ' ').trim().slice(0, 200);
const quoted = text => `"${String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, 160)}"`;

/** Types the words into NOVA's command field and presses Enter (nothing is sent before Enter; the field then empties). */
async function ask(page, words) {
  const field = page.locator(S.command).first();
  await field.fill(words);
  await field.press('Enter');
}
/** Waits until the part shows every one of the words; otherwise records it: absent when the part is not there, a problem when it reads something else. */
async function says(page, out, selector, words, what, ms = APPEAR_MS) {
  let part = page.locator(selector);
  for (const text of words) part = part.filter({hasText: text});
  if (await appears(part, ms)) return true;
  if (await page.locator(selector).count()) out.problems.push(`${what} does not say ${words.map(quoted).join(' and ')}; it reads ${quoted(await page.locator(selector).first().innerText().catch(() => ''))}`);
  else out.absent.push(`${what} (${selector})`);
  return false;
}
/** How the widget's Pin, Hide and Close are reached now: the inline group, or the "More" button (opened here); null: neither. */
async function reachActions(page) {
  if (await shows(page.locator(S.inlineActions), INLINE_MS)) return kind => page.locator(`${S.inlineActions} button[aria-label="${NOVA_ACTIONS[kind].inline}"]`);
  if (!(await shows(page.locator(S.moreButton)))) return null;
  await page.locator(S.moreButton).first().click();
  return kind => page.locator(S.moreItem).filter({hasText: NOVA_ACTIONS[kind].more});
}

async function nova(page, {base, report, egressPolicy}) {
  const out = report.nova = {absent: [], problems: [], notes: [], requests: 0, requestOrigins: []};
  const seen = [], watch = request => { try { seen.push(request.url()); } catch { /* a request that is already gone */ } };
  /** One numbered check: a step that cannot be done (a click that never lands) is recorded, never thrown. */
  const part = async (label, run) => { try { await run(); } catch (error) { out.absent.push(`${label}: ${firstLine(error)}`); } };
  // The page first (every browser stage opens its own page first). The request watch is attached in the same tick, before
  // the navigation can send anything, so the whole stage is watched.
  const opened = page.goto(base + NOVA_PATH);
  page.on('request', watch);
  try {
    const response = await opened;
    await page.locator(S.hydrated).waitFor({state: 'attached', timeout: LOAD_MS});
    await page.locator(S.root).first().waitFor({state: 'attached', timeout: LOAD_MS});
    await page.setViewportSize({width: 1280, height: 900});

    // 1. NOVA opens full-window: its root and frame, the app's sidebar out of sight, the title.
    await part('1. NOVA full-window', async () => {
      const title = await page.title();
      if (!title.startsWith('NOVA')) out.problems.push(`the page title does not start with NOVA: ${quoted(title)}`);
      if (!(await appears(page.locator(S.frame)))) out.absent.push(`NOVA's frame (${S.frame})`);
      if (!(await appears(page.locator(S.fullWindow)))) out.absent.push(`NOVA's full-window mode (${S.fullWindow})`);
      else if (!(await waits(page.locator(S.sidebar), 'hidden', APPEAR_MS))) out.problems.push(`the app's sidebar (${S.sidebar}) is still visible behind NOVA`);
    });

    // 2. The stage is calm. A build without the made-on-request stage is recorded and the rest is skipped.
    const hasStage = await appears(page.locator(S.stage), STAGE_MS);
    if (!hasStage) out.absent.push(`the made-on-request stage (${S.stage}): not in this build, so its requests, widgets and connect-src were not checked`);
    let canAsk = false;
    if (hasStage) await part('2. the calm stage', async () => {
      if (!(await appears(page.locator(S.calm)))) out.problems.push(`the stage is not calm on a profile without an arrangement: data-stage=${quoted(await page.locator(S.stage).first().getAttribute('data-stage'))}`);
      const widgets = await page.locator(S.widget).count();
      if (widgets) out.problems.push(`the calm stage shows ${widgets} widget${widgets === 1 ? '' : 's'}`);
      if (!(await shows(page.locator(S.star)))) out.absent.push(`the star's button (${S.star})`);
      if (!(await appears(page.locator(S.oneTap)))) out.absent.push(`the one-tap requests (${S.oneTap})`);
      canAsk = await shows(page.locator(S.command));
      if (!canAsk) out.absent.push(`the command field (${S.command}), so no request was typed`);
    });

    // 3. A request makes its widget on this device.
    let made = false;
    if (canAsk) await part('3. a request makes its widget', async () => {
      await ask(page, NOVA_REQUESTS.habits);
      made = await appears(page.locator(S.habits), MAKE_MS);
      if (!made) { out.absent.push(`the ${HABITS_TITLE} widget (${S.habits}) after "${NOVA_REQUESTS.habits}"`); return; }
      if (!(await appears(page.locator(S.set)))) out.problems.push(`a widget is on the stage but the frame is not ${S.set}`);
      await says(page, out, S.answer, NOVA_WORDS.answer, 'NOVA\'s line under the star');
      const announced = page.locator(S.status).filter({hasText: NOVA_WORDS.announced});
      if (!(await appears(announced))) out.absent.push(`the polite announcement "${NOVA_WORDS.announced}" (${S.status})`);
    });

    // 4. Pin, Hide and Close: Hide leaves a dock chip that brings the widget back; Close offers Undo and the stage is calm.
    if (made) await part('4. Pin, Hide and Close', async () => {
      let action = await reachActions(page);
      if (!action) { out.absent.push(`the widget's Pin, Hide and Close (neither ${S.inlineActions} nor ${S.moreButton} is visible)`); return; }
      for (const kind of ['pin', 'hide', 'close']) if (!(await shows(action(kind)))) out.absent.push(`${kind[0].toUpperCase()}${kind.slice(1)} on the ${HABITS_TITLE} widget`);
      await action('hide').first().click();
      const chip = page.locator(S.dockChip);
      if (!(await shows(chip))) { out.absent.push(`the dock chip "Show ${HABITS_TITLE} again" (${S.dockChip})`); return; }
      if (!(await leaves(page.locator(S.habits)))) out.problems.push(`${HABITS_TITLE} is in the dock and still on the stage`);
      await chip.first().click();
      if (!(await appears(page.locator(S.habits)))) { out.absent.push(`${HABITS_TITLE} back on the stage after its dock chip`); return; }
      action = await reachActions(page);
      if (!action) { out.absent.push(`Close on the ${HABITS_TITLE} widget after it came back`); return; }
      await action('close').first().click();
      if (await says(page, out, S.toast, [NOVA_WORDS.closed], 'the toast after Close') && !(await shows(page.locator(S.toastUndo)))) out.absent.push(`Undo in the toast (${S.toastUndo})`);
      if (!(await appears(page.locator(S.calm)))) out.problems.push('the stage is not calm again after Close');
    });

    // 5. Weather stays off, and says so honestly (no request to MET Norway: read at the end, over the whole stage).
    if (canAsk) await part('5. the weather widget, off', async () => {
      await ask(page, NOVA_REQUESTS.weather);
      if (!(await appears(page.locator(S.weather), MAKE_MS))) { out.absent.push(`the weather widget (${S.weather}) after "${NOVA_REQUESTS.weather}"`); return; }
      await says(page, out, S.weather, NOVA_WORDS.weatherOff, 'the weather widget');
    });

    // 6. A stage command: nothing made stays.
    if (canAsk) await part('6. clear the stage', async () => {
      await ask(page, NOVA_REQUESTS.clear);
      if (!(await leaves(page.locator(S.made)))) out.problems.push(`"${NOVA_REQUESTS.clear}" left ${await page.locator(S.made).count()} made widget(s) on the stage`);
    });

    // 7. The connect-src this page was served with: MET Norway exactly once, nothing the reviewed list does not have.
    if (hasStage) await part('7. connect-src', async () => {
      // The page's own answer first. Where that carries no policy (an answer handed over without its headers), the same
      // address is read once more with Node's fetch, outside the page, as the AK stage reads /app's.
      let csp = response?.headers?.()['content-security-policy'];
      if (!csp) csp = (await fetch(base + NOVA_PATH, {cache: 'no-store'})).headers.get('content-security-policy');
      const found = connectFindings(csp, {known: egressPolicy ? connectSources(egressPolicy, 'app') : undefined, base});
      if (!found.read) out.absent.push(`${NOVA_PATH}'s Content-Security-Policy connect-src (no policy in the page's own answer, nor in a second read)`);
      out.problems.push(...found.problems); out.notes.push(...found.notes);
    });
  } finally { page.off('request', watch); }

  // 8. Nothing left the device, and MET Norway was never asked (the switch is off).
  const requests = requestFindings(seen, base);
  out.requests = seen.length; out.requestOrigins = requests.origins;
  if (requests.weather.length) out.problems.push(`${requests.weather.length} request(s) to MET Norway while Weather is off: ${[...new Set(requests.weather)].join(', ')}`);
  for (const origin of requests.foreign) out.problems.push(`a request left the app's own origins: ${origin}`);
  if (out.absent.length && Array.isArray(report.review)) report.review.push(`stage 13 (NOVA): ${out.absent.length} part(s) could not be checked: ${out.absent.join('; ')}`.slice(0, 900));
  assert.deepEqual(out.problems, [], 'NOVA stage');
}

export const NOVA_STAGE = {number: 13, key: 'nova', name: 'NOVA: the calm stage, a request makes its widget, weather stays off', browser: true, liveOnly: false, reportsItself: false, run: nova};
