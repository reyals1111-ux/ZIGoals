import {expect, test} from '@playwright/test';
import {createHabit as habitWith, emptyHabitData, HABITS_KEY, logHabitCount} from '../../../lib/habits';
import {emptyPlatform, privateGoalSchema, PLATFORM_KEY} from '../../../lib/positions';
import {emptyDevice, hydrated, offline, open, toast} from '../l3-helpers';
import {freshNova} from '../hud/hud-helpers';
import {CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {emptyChecklist} from '../../../lib/checklist/schema';
import {addFavourite} from '../../../lib/checklist/store';

/**
 * Session AL Part 14 (owner rule 10, 8 Nov): the earlier-scope rows (docs/review/session-al/EARLIER_SCOPE.md, "Part 14
 * results") that needed a browser to decide and had no spec of their own. Fresh profiles, fictional data, every /api request
 * answered 503 (except KL-checklist-offline, which needs the production build's service worker and goes offline itself).
 */
const ID = '59a35604-3696-4a78-b455-4015acb66885';
const seed = (page: import('@playwright/test').Page, records: Record<string, unknown>) => page.addInitScript(({records}) => {
  if (sessionStorage.getItem('p14-seeded')) return;
  localStorage.clear();
  localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
  for (const [k, v] of Object.entries(records)) localStorage.setItem(k, JSON.stringify(v));
  sessionStorage.setItem('p14-seeded', '1');
}, {records});

test('J3: completing a habit linked to a private Goal offers "Add to its Goal", which opens that Goal\'s funding form; nothing is added by itself', async ({page}) => {
  await offline(page);
  const before = new Date('2026-11-01T12:00:00Z');
  const habits = habitWith(emptyHabitData(), {title: 'Fictional no-spend day', category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, target: 1, goalLink: {chainId: 'private', owner: 'local', goalId: '77'}}, before, ID);
  const goal = privateGoalSchema.parse({id: '77', name: 'Fictional reserve', type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '100000', notes: '', createdAt: before.toISOString(), milestones: []});
  await seed(page, {[HABITS_KEY]: habits, [PLATFORM_KEY]: {...emptyPlatform(), goals: [goal]}});
  await open(page, '/app/habits');
  const card = page.getByRole('article', {name: 'Fictional no-spend day', exact: true});
  await card.getByRole('button', {name: 'Complete Fictional no-spend day', exact: true}).click();
  const offer = toast(page).getByRole('link', {name: 'Add to its Goal'});
  await expect(offer).toBeVisible();
  const platform = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), PLATFORM_KEY);
  expect(platform.contributions ?? []).toHaveLength(0); // the tick added no money
  await offer.click();
  // The Goal page acts on `?contribute=1` once and then takes it out of the address (ActionIntent), so only the path is checked.
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/77(?:\?contribute=1)?$/);
  await expect(page.getByRole('group', {name: 'Contribution mode'})).toBeVisible();
});

test('R18: the Journal says its days in words: no "2026-11-02" in an entry, its Remove label, or the energy bars\' tooltips and screen-reader text', async ({page}) => {
  await offline(page);
  await page.clock.setFixedTime(new Date('2026-11-04T10:00:00Z'));
  await seed(page, {'zigoals:journal:v1': {version: 1, shareWithAi: false, followUps: false, entries: [{id: 'jr_1', date: '2026-11-02', text: 'Fictional quiet walk.', createdAt: '2026-11-02T07:00:00.000Z'}]}});
  await open(page, '/app/journal');
  const entry = page.locator('.journal-entries li').first();
  await expect(entry.locator('.journal-entry-date')).toHaveText('Mon, Nov 2, 2026');
  await expect(entry.getByRole('button', {name: 'Remove the entry of Nov 2, 2026', exact: true})).toBeVisible();
  const iso = await page.evaluate(() => {
    const out: string[] = [], re = /\b\d{4}-\d{2}-\d{2}\b/;
    for (const el of document.querySelectorAll('.journal-page *')) {
      for (const a of ['title', 'aria-label']) { const v = el.getAttribute(a); if (v && re.test(v)) out.push(`${a}: ${v}`); }
      for (const n of el.childNodes) if (n.nodeType === Node.TEXT_NODE && re.test(n.textContent ?? '')) out.push(`text: ${n.textContent}`);
    }
    return out;
  });
  expect(iso).toEqual([]);
});

test('Q24: in its season (December) ZIGoals Wrapped\'s Today card shows for a person with three logged days, and opens', async ({page}) => {
  await offline(page);
  await page.setViewportSize({width: 1280, height: 900});
  await page.clock.setFixedTime(new Date('2026-12-05T10:00:00Z'));
  let habits = habitWith(emptyHabitData(), {title: 'Fictional stretch', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date('2026-11-20T12:00:00Z'), ID);
  for (const day of ['2026-12-01', '2026-12-02', '2026-12-03']) habits = logHabitCount(habits, ID, day, 1, '', new Date(`${day}T18:00:00Z`));
  await seed(page, {[HABITS_KEY]: habits});
  await open(page, '/app');
  const card = page.locator('.today-wrapped-card');
  await expect(card).toBeVisible({timeout: 15_000});
  await expect(card.getByRole('heading', {name: 'Your 2026, wrapped'})).toBeVisible();
  await card.getByRole('button', {name: 'Open Wrapped'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('H3: a first visit to Today shows one swan mark and no widget twice', async ({page}, info) => {
  await emptyDevice(page, {welcomeSeen: false});
  await page.goto('/app');
  await hydrated(page);
  await page.waitForTimeout(1500);
  const seen = await page.evaluate(() => {
    const visible = (el: Element) => { const r = el.getBoundingClientRect(), s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05; };
    // The sidebar mark is a <picture> whose <img> shows the chosen <source> (currentSrc); on a phone it draws nothing. Its
    // words ("ZIGoals" under the swan, /brand/words/today-swan.webp) are the same mark, so only swan figures are counted.
    const swans = [...document.querySelectorAll('img')].filter(el => /today-swan/.test(el.currentSrc || el.src) && !el.closest('.sidebar-mark-words') && visible(el)).length;
    const titles = [...document.querySelectorAll('main section h2, main [data-widget] h2, main article h2')].filter(visible).map(h => h.textContent!.trim()).filter(Boolean);
    const dup = titles.filter((t, i) => titles.indexOf(t) !== i);
    return {swans, titles, dup};
  });
  await info.attach('h3-first-visit.json', {body: JSON.stringify(seen, null, 2), contentType: 'application/json'});
  console.log(`H3 ${info.project.name}: ${JSON.stringify(seen)}`);
  expect(seen.titles.length).toBeGreaterThan(0); // Today drew its widgets (the check is not empty)
  expect(seen.swans).toBe(info.project.name === 'mobile' ? 0 : 1);
  expect(seen.dup).toEqual([]);
});

// KL-checklist-offline is still open (EARLIER_SCOPE "Part 14 results"): offline, a Checklist never opened online stays on
// "Loading your path…", because public/sw.js keeps only the files each install page names in its HTML and the path view is
// a lazy chunk (checklist-page.tsx `usePathView`). This reproduction runs only against a production build with
// P14_PRODUCTION=1 (a dev build's worker keeps no pages), so it is not in CI; it turns green with the fix.
test.describe('KL-checklist-offline (the production build\'s service worker)', () => {
  test.use({serviceWorkers: 'allow'});
  test('installed, then offline before the Checklist was ever opened: it opens from the install cache and a tick saves', async ({page, context}) => {
    test.skip(process.env.P14_PRODUCTION !== '1', 'needs the production build\'s service worker (P14_PRODUCTION=1)');
    test.setTimeout(120_000);
    let disconnected = false;
    await context.route(url => url.pathname.startsWith('/api/'), route => disconnected ? route.abort('internetdisconnected') : route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
    const created = new Date(Date.now() - 10 * 86_400_000), title = 'Fictional offline stretch';
    const habits = habitWith(emptyHabitData(), {title, category: 'Fictional', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, created, ID);
    await seed(page, {[HABITS_KEY]: habits, [CHECKLIST_KEY]: addFavourite(emptyChecklist(), {kind: 'habit', habitId: ID}, {id: 'ck_offline', at: created, section: 'morning'})});
    // Online: only Today is opened; the worker takes control and keeps the install pages (public/sw.js INSTALL_PAGES).
    await page.goto('/app');
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration('/'))?.active?.scriptURL ?? ''), {timeout: 30_000}).toMatch(/\/sw\.js/);
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 10_000}).toBe(true);
    await expect.poll(() => page.evaluate(async () => !!(await caches.match('/app/checklist'))), {timeout: 30_000}).toBe(true);
    disconnected = true; await context.setOffline(true);
    try {
      await page.goto('/app/checklist'); await hydrated(page);
      await page.getByRole('button', {name: `${title}: not done yet`, exact: true}).click();
      await expect(page.locator('.checklist-progress-line')).toContainText('1 of 1 planet today');
      await page.goto('/app/checklist'); await hydrated(page);
      await expect(page.getByRole('heading', {name: 'This page could not be shown.'})).toHaveCount(0);
      await expect(page.getByRole('button', {name: `${title}: 1 time: done`, exact: true})).toBeVisible();
    } finally { await context.setOffline(false); }
  });
});

test('SE10: Help has a contact and a private security address; Settings → Help & diagnostics shows the app version and build commit', async ({page}) => {
  await emptyDevice(page);
  await open(page, '/app/help');
  const mails = await page.locator('a[href^="mailto:"]').evaluateAll(as => as.map(a => a.getAttribute('href')));
  expect(mails.length).toBeGreaterThanOrEqual(1);
  expect(mails.every(m => /^mailto:[^@\s]+@[^@\s]+\.[a-z]{2,}/i.test(m ?? ''))).toBe(true);
  await open(page, '/app/settings');
  const row = page.locator('dt', {hasText: 'App version / build commit'});
  await row.scrollIntoViewIfNeeded().catch(() => undefined);
  await expect(row).toHaveCount(1);
  await expect(row.locator('xpath=following-sibling::dd[1]')).toHaveText(/\S+ · \S+/);
});

for (const [motion, mode] of [[undefined, 'zoom'], ['calm', 'fade'], ['off', null]] as const) {
  test(`N2: NOVA widget → its page with Motion ${motion ?? 'Full'}: ${mode ? `the ${mode} morph` : 'a plain navigation, no morph'}`, async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.setViewportSize({width: 1440, height: 900});
    await freshNova(page, {widgets: [{id: 'goals-hud', size: 'L'}], look: 'holo', ...(motion ? {motion} : {})});
    // Record every morph the root carries during the navigation (openWithMorph sets data-hud-morph for 1.5 s).
    await page.evaluate(() => { const w = window as unknown as {seen: string[]}; w.seen = []; new MutationObserver(() => { const m = document.documentElement.dataset.hudMorph; if (m) w.seen.push(m); }).observe(document.documentElement, {attributes: true, attributeFilter: ['data-hud-morph']}); });
    await page.locator('.nova-widget[data-widget="goals-hud"] .nova-widget-open').click();
    await expect(page).toHaveURL(/\/app\/goals$/);
    await expect(page.locator('main h1').first()).toBeVisible();
    const seen = await page.evaluate(() => (window as unknown as {seen: string[]}).seen);
    expect([...new Set(seen)]).toEqual(mode ? [mode] : []);
  });
}
