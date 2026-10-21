import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test, type Locator, type Page, type Route} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';
import {AI_SETTINGS_KEY, defaultAiSettings, type AiSettings} from '../lib/ai/settings';

/**
 * Session Z-Cloud, ZIGi panel polish round 2 (the owner's rule, ADR-019): in ZIGi's panel no chrome wraps onto a second
 * line, at 320, 360, 390 and 430 (phone project) and 768, 1024 and 1440 (desktop project), in the panel, expanded and in
 * the mini window. The title, the status line, each reply's source line and action row, the share row and the chip row
 * are one line each; the header is one row whose controls never overlap; the composer's box and buttons share one centre
 * line; "Jump to the latest message" floats over the log. Every AI answer is a MOCK (a local OpenAI-compatible server
 * answered by page.route). `ZIGI_ONELINE_CAPTURES=<dir>` only writes the phone panel's pictures (before and after).
 */
const BASE = 'http://127.0.0.1:1234', DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const TITLE = 'ZIGi · Your Personal AI Companion';
const CAPTURES = process.env.ZIGI_ONELINE_CAPTURES ?? '';
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
const stream = (text: string) => [chunk({role: 'assistant', content: text}), chunk({}, 'stop'), 'data: [DONE]\n\n'].join('');
const LONG = 'MOCK: here is a longer answer about your day. '.repeat(14).trim();
const WITH_CARD = 'MOCK: noted, and a glass of water.\n\n```zigoals-action\n{"kind":"log-water","millilitres":300}\n```';
async function server(page: Page, reply: () => string = () => 'MOCK: noted, two things to try.') {
  await page.route(`${BASE}/**`, async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: stream(reply())});
    return route.fulfill({status: 404, body: ''});
  });
}
async function seed(page: Page, ai: Partial<AiSettings> | null) {
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  const base = defaultAiSettings();
  const values: Record<string, string> = {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})};
  if (ai) values[AI_SETTINGS_KEY] = JSON.stringify({...base, enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: BASE, ...ai});
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
  // Session AE Gate C: the next `goto` waits until this page's prefetches are done (WebKit's navigation stall, Session
  // AC's 8e930e93: "internal error" or a load that never ends when a navigation starts while they are in flight; CI on
  // c9b123c9 and c1db750e hit it after this seed in four specs).
  await page.waitForLoadState('networkidle');
}
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page, path = '/app/habits') { await page.goto(path); await page.getByRole('button', {name: /Open ZIGi/}).click(); await expect(panel(page)).toBeVisible(); }
async function say(page: Page, text: string) {
  const before = await panel(page).locator('.ai-turn-assistant').count();
  await panel(page).getByRole('textbox', {name: 'Message to your AI'}).fill(text);
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(before + 1);
}
/** Everything the owner's rule is about, measured in the panel. */
async function measure(root: Locator) {
  return root.evaluate(el => {
    const rect = (e: Element) => e.getBoundingClientRect();
    const shown = (e: Element) => { const r = rect(e), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !e.closest('[hidden]'); };
    const lineHeight = (e: Element) => { const cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight); return Number.isFinite(lh) ? lh : parseFloat(cs.fontSize) * 1.2; };
    /** A text element: one line when its height is at most its line height × 1.2 (a control: at most its own minimum height, 44 px, when that is taller). */
    const textLine = (e: Element) => { const cs = getComputedStyle(e), min = parseFloat(cs.minHeight) || 0, pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth); return {what: (e.className || e.tagName).toString().slice(0, 40), text: (e.textContent ?? '').slice(0, 60), h: Math.round(rect(e).height * 10) / 10, max: Math.round(Math.max(min, lineHeight(e) * 1.2 + pad) * 10) / 10}; };
    /** A row of controls: one line when every visible child's middle is within 2 px of the others and no child sits under another. */
    const row = (e: Element) => { const kids = [...e.querySelectorAll(':scope > *, :scope > * > *')].filter(shown).filter(k => getComputedStyle(k).position !== 'absolute'); const mids = kids.map(k => { const r = rect(k); return (r.top + r.bottom) / 2; }); return {what: (e.className || e.tagName).toString().slice(0, 40), spread: mids.length ? Math.round((Math.max(...mids) - Math.min(...mids)) * 10) / 10 : 0, h: Math.round(rect(e).height)}; };
    const title = el.querySelector('.ai-chat-title')!, range = document.createRange(); range.selectNodeContents(title);
    const tools = [...el.querySelectorAll('.ai-chat-tools > button, .ai-chat-tools > .ai-more > button')].filter(shown);
    const head = [el.querySelector('.ai-chat-head > .zigi'), el.querySelector('.ai-chat-identity'), ...tools].filter((e): e is Element => !!e && shown(e)).map(e => ({name: e.getAttribute('aria-label') ?? e.className.toString(), r: rect(e)}));
    const overlaps = (list: {name: string; r: DOMRect}[]) => { const out: string[] = []; for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { const a = list[i]!.r, b = list[j]!.r; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.push(`${list[i]!.name} × ${list[j]!.name}`); } return out; };
    const composer = [...el.querySelectorAll('.ai-composer > textarea, .ai-composer > button')].filter(shown).map(e => ({name: e.getAttribute('aria-label') ?? e.textContent ?? e.tagName, r: rect(e)}));
    const textLines = [title, ...el.querySelectorAll('.ai-chat-via-text, .ai-turn-source, .ai-share-scope, .ai-share-text, .ai-chip, .ai-jump-latest, .ai-reply-row .ai-turn-time, .ai-reply-row .ai-turn-stopped, .ai-setup-line-text, .ai-card-where, .ai-brief-label, .ai-history-open strong, .ai-history-open small')].filter((e): e is Element => !!e && shown(e)).map(textLine);
    const rows = [...el.querySelectorAll('.ai-reply-row, .ai-share-line, .ai-composer-modes, .ai-chat-tools, .ai-chat-via')].filter(shown).map(row);
    const titleBox = range.getBoundingClientRect(), toolsLeft = Math.min(...tools.map(t => rect(t).left));
    // Session Z-Local L57: with the overflow hidden (the 11 px floor from 360 up, L49/L57) the painted name ends at its box, with an
    // ellipsis; the text's own layout extent beyond it is not what the person sees. Visible overflow measures the text itself.
    const titleClipped = getComputedStyle(title).overflowX === 'hidden' || getComputedStyle(title).overflow === 'hidden', titleRight = titleClipped ? Math.min(titleBox.right, rect(title).right) : titleBox.right;
    // The Gate C audit: the name's own extent beyond its box (an ellipsis is drawn where this is true); allowed only in the wide-font test.
    const titleOverflows = titleBox.right > rect(title).right + 1;
    // A control past the panel's edge, unless a row that scrolls sideways holds it (the chips row may scroll, never wrap).
    const scrolled = (e: Element) => { for (let p = e.parentElement; p && p !== el; p = p.parentElement) if (/auto|scroll/.test(getComputedStyle(p).overflowX)) return true; return false; };
    const panelBox = rect(el), outside = [...el.querySelectorAll('.ai-chat-head *, .ai-reply-row, .ai-reply-row *, .ai-share-line, .ai-share-line *, .ai-composer *, .ai-card, .ai-card *, .ai-setup-line *, .ai-history-list *')].filter(shown).filter(e => !scrolled(e)).filter(e => { const r = rect(e); return r.right > panelBox.right + 1 || r.left < panelBox.left - 1; }).map(e => (e.className || e.tagName).toString().slice(0, 40));
    return {
      titleText: title.textContent, titleFont: parseFloat(getComputedStyle(title).fontSize), titleRight, titleClipped, titleOverflows, toolsLeft, titleWrapped: titleBox.height > lineHeight(title) * 1.2,
      tools: tools.map(t => t.getAttribute('aria-label')), toolMids: tools.map(t => { const r = rect(t); return (r.top + r.bottom) / 2; }),
      headOverlaps: overlaps(head), composerOverlaps: overlaps(composer), composerMids: composer.map(c => (c.r.top + c.r.bottom) / 2),
      textLines, rows, outside,
    };
  });
}
type Measured = Awaited<ReturnType<typeof measure>>;
function oneLine(m: Measured, where: string, {clipAllowed = false} = {}) {
  // The Gate C audit: with the overflow hidden from 360 up (L57), "stops before the buttons" reads the painted name, so the name
  // must also fit without an ellipsis wherever the design font is in play; only the wide-font test may clip at the floor.
  if (!clipAllowed) expect(m.titleOverflows, `the name fits without an ellipsis ${where}`).toBe(false);
  // Gate C (the test audit): the header's buttons were found, so the row, the title's edge and the overlaps below are
  // measured on something (an empty list would make them pass on nothing).
  expect(m.tools.length, `the header's buttons ${where}`).toBeGreaterThanOrEqual(3);
  expect(m.titleText, where).toBe(TITLE);
  expect(m.titleWrapped, `the title on one line ${where}`).toBe(false);
  expect(m.titleRight, `the title stops before the buttons ${where}`).toBeLessThanOrEqual(m.toolsLeft + 1);
  expect(Math.max(...m.toolMids) - Math.min(...m.toolMids), `one header row ${where}`).toBeLessThanOrEqual(1);
  expect(m.headOverlaps, `header controls apart ${where}`).toEqual([]);
  expect(m.composerOverlaps, `composer controls apart ${where}`).toEqual([]);
  if (m.composerMids.length) expect(Math.max(...m.composerMids) - Math.min(...m.composerMids), `the composer's centre line ${where}`).toBeLessThanOrEqual(1);
  for (const line of m.textLines) expect(line.h, `${line.what} "${line.text}" is one line ${where}`).toBeLessThanOrEqual(line.max);
  for (const r of m.rows) expect(r.spread, `${r.what} is one row ${where}`).toBeLessThanOrEqual(2);
  expect(m.outside, `nothing outside the panel ${where}`).toEqual([]);
}
const WIDTHS = {desktop: [768, 1024, 1440], mobile: [320, 360, 390, 430]} as const;
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('connected, two replies: title, status, source lines, action rows, share row, chips, a card and History are one line each at every width', async ({page}, info) => {
  test.setTimeout(180_000);
  let asked = 0;
  await server(page, () => ++asked % 2 === 0 ? WITH_CARD : 'MOCK: noted, two things to try.');
  await seed(page, {includeHealth: true, pageShare: {...defaultAiSettings().pageShare, health: true}});
  const widths = WIDTHS[info.project.name as keyof typeof WIDTHS], annotations: string[] = [];
  for (const width of widths) {
    await page.setViewportSize({width, height: 860});
    await openChat(page);
    await say(page, 'How did my habits go this week?');
    await say(page, 'And what should I try next?');
    if (CAPTURES) { mkdirSync(CAPTURES, {recursive: true}); await page.screenshot({path: join(CAPTURES, `panel-${info.project.name}-${width}.png`)}); await panel(page).getByRole('button', {name: 'Close ZIGi'}).click(); continue; }
    const where = `at ${width}`, m = await measure(panel(page));
    annotations.push(`${width}: title ${m.titleFont}px`);
    oneLine(m, where);
    expect(m.tools, where).toEqual(width >= 768 ? expect.arrayContaining(['New chat', 'Expand the chat', 'More: history, customize, settings and help', 'Close ZIGi']) : ['New chat', 'More: history, customize, settings and help', 'Close ZIGi']);
    if (width >= 360) expect(m.titleFont, `the title's size ${where}`).toBeGreaterThanOrEqual(width >= 768 ? 15 : 11);
    // The status: one line, the model in its tooltip and switcher.
    await expect(panel(page).locator('.ai-chat-via-text')).toHaveText('via your local server · mock-chat');
    await expect(panel(page).getByRole('button', {name: 'Model: mock-chat. Change model'}).or(panel(page).locator('summary[aria-label="Model: mock-chat. Change model"]'))).toBeVisible();
    // Who answered: one short line, the sentence for screen readers and in the tooltip.
    const latest = panel(page).locator('.ai-turn-assistant').last(), earlier = panel(page).locator('.ai-turn-assistant').first();
    await expect(latest.locator('.ai-turn-source > span[aria-hidden=true]')).toHaveText('From your AI · local server');
    await expect(latest.locator('.ai-turn-label')).toHaveText('Answer from your AI (your local server), not from ZIGoals.');
    await expect(latest.locator('.ai-turn-source')).toHaveAttribute('title', 'Answer from your AI (your local server), not from ZIGoals.');
    // The latest reply's buttons show; an earlier one's show on hover or focus.
    for (const name of ['Copy', 'Regenerate', 'Useful', 'Not useful', 'More for this reply']) {
      const button = latest.getByRole('button', {name, exact: true});
      await expect(button, `${name} ${where}`).toBeVisible();
      const box = (await button.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
      expect(await button.getAttribute('data-tip')).toBeTruthy();
    }
    // The time: one, in the row on the left; a reply narrower than its six buttons and the time shows it first in its source line.
    await expect(latest.locator('.ai-turn-time:visible')).toHaveCount(1);
    if (await latest.locator('.ai-reply-row > .ai-turn-time').isHidden()) await expect(latest.locator('.ai-turn-source-time')).toBeVisible();
    else expect((await latest.locator('.ai-reply-row > .ai-turn-time').boundingBox())!.x, `the time on the left ${where}`).toBeLessThan((await latest.getByRole('button', {name: 'Copy', exact: true}).boundingBox())!.x);
    await expect(latest.locator('.ai-card')).toHaveCount(1);
    await expect(earlier.getByRole('button', {name: 'Regenerate'})).toHaveCount(0);
    await page.mouse.move(1, 1);
    expect(await earlier.locator('.ai-reply-icons').evaluate(e => getComputedStyle(e).opacity)).toBe('0');
    await earlier.getByRole('button', {name: 'Copy', exact: true}).focus();
    await expect.poll(() => earlier.locator('.ai-reply-icons').evaluate(e => getComputedStyle(e).opacity)).toBe('1');
    // The share row: one line; the size is in "What your AI sees".
    const share = panel(page).getByRole('checkbox', {name: 'Share this page’s data', exact: true});
    await expect(share).toHaveAccessibleDescription(/^Habits( \+ Health)?$/);
    await panel(page).getByLabel('What your AI sees').click();
    await expect(panel(page).locator('.ai-share-sheet')).toContainText(/about [\d,]+ tokens/);
    await panel(page).getByLabel('What your AI sees').click();
    // History: each chat one line of title and one of details; Pin, Rename and Delete 44 px icons inside the panel.
    await panel(page).getByRole('button', {name: 'More: history, customize, settings and help'}).click();
    await panel(page).getByRole('button', {name: 'Chat history'}).click();
    const chat = panel(page).locator('.ai-history-list li').first();
    await expect(chat.locator('.ai-history-open')).toHaveAttribute('title', /^How did my habits go this week\?\n/);
    for (const name of ['Pin', 'Rename', 'Delete']) { const box = (await chat.getByRole('button', {name, exact: true}).boundingBox())!; expect(box.width, `${name} ${where}`).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44); }
    oneLine(await measure(panel(page)), `History ${where}`);
    await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  }
  info.annotations.push({type: 'title size', description: annotations.join('; ')});
});

test('the reply\'s "⋯": Copy as Markdown, Continue in my AI and the token count; no row of text links under a reply', async ({page}) => {
  test.skip(!!CAPTURES, 'pictures only');
  await server(page);
  await seed(page, {});
  await openChat(page);
  await say(page, 'How did my habits go this week?');
  const reply = panel(page).locator('.ai-turn-assistant').last();
  expect(await reply.locator('.ai-reply-row .text-link, .ai-reply-row a').count(), 'no text links in the row').toBe(0);
  await reply.getByRole('button', {name: 'More for this reply'}).click();
  const more = reply.getByRole('group', {name: 'More for this reply'});
  await expect(more.getByRole('button')).toHaveText(['Copy as Markdown', 'Continue in my AI']);
  await expect(more.getByRole('button', {name: 'Copy as Markdown'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(more).toBeHidden();
  await expect(reply.getByRole('button', {name: 'More for this reply'})).toBeFocused();
});

test('expanded and in the mini window: still one line each', async ({page, isMobile}) => {
  test.skip(isMobile || !!CAPTURES, 'computers only');
  await server(page);
  await seed(page, {});
  await page.setViewportSize({width: 1440, height: 900});
  await openChat(page);
  await say(page, 'How did my habits go this week?');
  await panel(page).getByRole('button', {name: 'Expand the chat'}).click();
  oneLine(await measure(panel(page)), 'expanded');
  await panel(page).getByRole('button', {name: 'Shrink the chat'}).click();
  // The mini window, where the browser offers it; elsewhere this part is not measured, and the test says so. Where it is
  // offered, "Pop out" must open it (Gate C, the test audit: a missing window used to pass).
  const real = await page.evaluate(() => typeof (window as unknown as {documentPictureInPicture?: {requestWindow?: unknown}}).documentPictureInPicture?.requestWindow === 'function');
  test.info().annotations.push({type: 'mini window', description: real ? "the browser's own" : 'none here: not measured'});
  if (!real) return;
  const [mini] = await Promise.all([page.context().waitForEvent('page', {timeout: 15_000}), panel(page).getByRole('button', {name: 'Pop out ZIGi into a mini window'}).click()]);
  const miniPanel = mini.locator('dialog.ai-chat, .ai-chat').first();
  await expect(miniPanel).toBeVisible();
  oneLine(await measure(miniPanel), 'in the mini window');
});

// Gate C: CI's WebKit has no Inter and drew the name wider than the size measured for it, into the buttons. A wider
// drawing of the same name (here 0.1 em between letters, about a fifth wider) must still stop before the buttons on one
// line: the header scales the name to its box; with the app's own spacing the size is the measured one.
test('a font that draws the name wider: still one line, before the buttons, at every width', async ({page}, info) => {
  test.skip(!!CAPTURES, 'measures only');
  await server(page);
  await seed(page, {});
  for (const width of WIDTHS[info.project.name as keyof typeof WIDTHS]) {
    await page.setViewportSize({width, height: 860});
    await openChat(page);
    const normal = (await measure(panel(page))).titleFont;
    await page.addStyleTag({content: '.ai-chat .ai-chat-title, .ai-chat .ai-chat-title * { letter-spacing: .1em !important; }'});
    // Session Z-Local L54: from 360 up the name never goes under 11 px (L49); where the unscaled name already sits within 5 % of the
    // floor (CI's fonts at 360: 11.19 px), "scaled down" means down to the floor. Above that, the 5 % holds as before.
    await expect.poll(async () => (await measure(panel(page))).titleFont, `the name scaled down at ${width}`).toBeLessThan(width >= 360 ? Math.max(normal * 0.95, 11.01) : normal * 0.95);
    const m = await measure(panel(page));
    oneLine(m, `with a wider font at ${width}`, {clipAllowed: true});
    expect(m.titleFont, `still a readable size at ${width}`).toBeGreaterThan(normal * 0.7);
  }
});

test('not connected: the status says so on one line; the chips row is one line; "Jump to the latest message" floats', async ({page}, info) => {
  test.skip(!!CAPTURES, 'pictures only');
  await server(page, () => LONG);
  await seed(page, null);
  for (const width of WIDTHS[info.project.name as keyof typeof WIDTHS]) {
    await page.setViewportSize({width, height: 760});
    await openChat(page);
    await expect(panel(page).locator('.ai-chat-via-text')).toHaveText('not connected yet');
    oneLine(await measure(panel(page)), `not connected at ${width}`);
    await panel(page).getByRole('button', {name: 'Close ZIGi'}).click();
  }
  // A long conversation, scrolled up: the pill floats over the log and moves nothing.
  await seed(page, {});
  await openChat(page);
  for (const q of ['One?', 'Two?', 'Three?']) await say(page, q);
  const log = panel(page).getByRole('log', {name: 'Conversation'}), before = (await log.boundingBox())!;
  await log.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
  const jump = panel(page).getByRole('button', {name: 'Jump to the latest message'});
  await expect(jump).toBeVisible();
  const pill = (await jump.boundingBox())!, after = (await log.boundingBox())!;
  expect(after.height, 'the log keeps its size').toBe(before.height);
  expect(pill.y + pill.height, 'the pill sits over the log').toBeLessThanOrEqual(after.y + after.height);
  expect(Math.abs(pill.x + pill.width / 2 - (after.x + after.width / 2)), 'bottom centre').toBeLessThanOrEqual(2);
  oneLine(await measure(panel(page)), 'with the pill');
  await jump.click();
  await expect(jump).toBeHidden();
});

// Gate C (CI on 001e363e, a11y-wcag-x 1.4.12): Settings' name is one line at every width by its size, never by nowrap, so a
// person's own text spacing wraps it instead of widening the page.
test('Settings: ZIGi\'s name is one line at every width, and wraps instead of widening the page under text spacing', async ({page}, info) => {
  test.skip(!!CAPTURES, 'pictures only');
  await seed(page, null);
  const title = page.locator('.ai-settings .ai-settings-title');
  for (const width of WIDTHS[info.project.name as keyof typeof WIDTHS]) {
    await page.setViewportSize({width, height: 760});
    await page.goto('/app/settings#your-ai');
    await expect(title).toHaveText(TITLE);
    const {height, line, wrap} = await title.evaluate(e => { const cs = getComputedStyle(e); return {height: e.getBoundingClientRect().height, line: parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2, wrap: cs.whiteSpace}; });
    expect(height, `one line at ${width}`).toBeLessThanOrEqual(line * 1.2);
    expect(wrap, 'wraps under text spacing rather than overflowing').not.toBe('nowrap');
    // Session AF (diagnostic only; WebKit cannot run on the owner's Mac, ADR-028 H114): name what sticks out past the
    // viewport outside any clipping box, so CI's WebKit job says which element widened the page.
    const wide = await page.evaluate(w => [...document.querySelectorAll('body *')].filter(el => { const r = el.getBoundingClientRect(); if (r.right <= w + 0.5 || r.width === 0) return false; for (let n = el.parentElement; n; n = n.parentElement) if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(n).overflowX)) return false; return getComputedStyle(el).position !== 'fixed'; }).slice(0, 8).map(el => { const host = el.closest('[id]'), parent = el.parentElement; return `${el.tagName.toLowerCase()}.${(el.getAttribute('class') ?? '').split(' ')[0]}:${Math.round(el.getBoundingClientRect().right)} in #${host?.id ?? '-'} under ${parent?.tagName.toLowerCase()}.${(parent?.getAttribute('class') ?? '').split(' ')[0]} "${(el.textContent ?? '').trim().slice(0, 32)}"`; }).join('; '), width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `no sideways scroll at ${width}${wide ? ` (past the edge: ${wide})` : ''}`).toBeLessThanOrEqual(width);
  }
  await page.addStyleTag({content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }'});
  expect(await page.evaluate(() => document.documentElement.scrollWidth), 'text spacing widens nothing').toBeLessThanOrEqual(page.viewportSize()!.width);
});
