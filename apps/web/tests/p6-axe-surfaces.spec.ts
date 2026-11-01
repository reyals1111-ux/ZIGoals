import {expect, test, type Locator, type Page} from '@playwright/test';
import {applyTheme, axe, mockModel, fence, note, seedDevice as seed, settle, THEMES, type Findings} from './p6-helpers';

/**
 * Session AK, owner follow-up 4 (P6): axe (WCAG 2.0/2.1/2.2 A and AA) on the surfaces a route visit alone does not show,
 * in Nebula, Light and Dark, desktop at 1440 px and phone at 390 px: NOVA with its left panel open, folded to icons and
 * hidden, Behind the intelligence (the right panel), every panel sheet, Your day, Make it yours, the phone's Quick access
 * and the conversation; the NOVA and Hermes guides at each planet; Notes' views with the graph and its list; Tasks; and
 * the confirm cards (proposed with an estimate, a safety note, a form, a first note; NOVA's own cards; a plan's head; a
 * card refused in plain words; a card being edited; a kept card's receipt with Undo; a dismissed card) in ZIGi's panel and
 * NOVA's chat. Every reply is a MOCK: the local OpenAI-compatible server on 127.0.0.1:1234 is answered by page.route (as
 * tests/nova-chat.spec.ts does); the app's /api answers 503 and every other host is aborted. The records are the
 * Showcase's fictional ones, written as the person's own.
 */
/** The replies, in order: each card variant the one card component (components/ai/proposal-card.tsx) draws. */
const REPLIES = [
  // Health, habits and money: an estimate, the fasting safety note, a form that opens, a device write that applies, a first Remember.
  ['Fictional cards for your evening.', fence([
    {kind: 'log-water', glasses: 2},
    {kind: 'log-food', name: 'Two eggs', meal: 'Breakfast', estimate: {kcal: 140, protein_g: 12}},
    {kind: 'check-in', habit: 'h4', minutes: 5},
    {kind: 'create-habit', title: 'Evening stretch', type: 'build', measurement: 'minutes', target: 10, schedule: 'daily', timeOfDay: 'evening'},
    {kind: 'start-fast', targetHours: 16},
    {kind: 'remember', text: 'Prefers to train before work', category: 'schedule'},
    {kind: 'log-expense', amount: 12.5, category: 'Food', note: 'Fictional lunch'},
  ])].join('\n\n'),
  // NOVA's own five cards.
  ['Five fictional things, each for you to confirm.', fence([
    {kind: 'add-task', title: 'Fictional call to the library', due: 'tomorrow', time: '10:30'},
    {kind: 'log-workout', name: 'Fictional swim', type: 'cardio', minutes: 30},
    {kind: 'capture-note', text: 'Fictional idea: a reading corner by the window', title: 'Reading corner'},
    {kind: 'file-note', note: 'Fictional rail pass question', to: 'topic', title: 'Fictional travel'},
    {kind: 'start-focus', minutes: 25},
  ])].join('\n\n'),
  // A plan's head with its steps; a card refused in plain words; a block that is not valid JSON (one calm note).
  ['A fictional plan you can add step by step.', fence({kind: 'plan-bundle', title: 'Your 10k plan', goal: {name: 'Run 10 km', type: 'PROJECT', milestones: ['5 km', '8 km', '10 km']}, habits: [{title: 'Run', measurement: 'minutes', target: 30}], checklist: ['Lay out running shoes']}),
    fence({kind: 'remember', text: 'Has asthma', category: 'health'}), fence('{"kind": "log-water", "glasses": ')].join('\n\n'),
];
async function begin(page: Page, theme: (typeof THEMES)[number], isMobile: boolean) {
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await mockModel(page, REPLIES);
  await applyTheme(page, theme);
}
async function scan(page: Page, findings: Findings, label: string, scope?: Locator) {
  await page.evaluate(() => Promise.race([Promise.all(document.getAnimations().filter(a => a.playState === 'running' && a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))), new Promise(r => setTimeout(r, 3_000))]));
  note(findings, label, await axe(page, scope));
}
const planetButtons = (page: Page) => page.locator('.nova-guide-path').getByRole('button', {name: /^[^:]{2,40}: /});

for (const theme of THEMES) {
  test(`axe: NOVA's panels, sheets and conversation, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(300_000);
    await begin(page, theme, isMobile);
    await seed(page);
    const findings: Findings = {};
    const nova = async (hash = '') => { await page.goto(`/app/nova${hash}`); await settle(page); await expect(page.locator('.nova-frame[data-opening]')).not.toHaveAttribute('data-opening', /play|waiting/, {timeout: 15_000}); };
    await nova(); await scan(page, findings, 'NOVA');
    if (!isMobile) {
      // The left panel: open (1440 px), folded to icons, hidden, then open again; Behind the intelligence shown.
      const left = page.locator('aside.nova-left');
      await left.getByRole('button', {name: 'Fold the left panel to icons'}).click(); await expect(left).toHaveAttribute('data-state', 'rail'); await scan(page, findings, 'NOVA, left panel as icons');
      await left.getByRole('button', {name: 'Hide the left panel'}).click(); await expect(left).toHaveCount(0); await scan(page, findings, 'NOVA, left panel hidden');
      await page.getByRole('button', {name: 'Show the left panel'}).click(); await expect(left).toBeVisible();
      const show = page.getByRole('button', {name: 'Show Behind the intelligence'});
      if (await show.isVisible()) await show.click();
      await expect(page.locator('aside.nova-right:not([aria-busy])')).toBeVisible(); await scan(page, findings, 'NOVA, Behind the intelligence');
    }
    for (const id of ['memory', 'permissions', 'activity', 'workflows', 'cost', 'models']) {
      await nova(`#nova-${id}`);
      const sheet = page.getByRole('dialog').filter({hasText: 'Memory, permissions'}).first();
      await expect(sheet).toBeVisible(); await settle(page); await scan(page, findings, `NOVA panel ${id}`);
    }
    await nova('#briefs'); await expect(page.getByRole('dialog', {name: /Your day/})).toBeVisible(); await settle(page); await scan(page, findings, 'NOVA, Your day');
    await nova();
    if (isMobile) { await page.getByRole('button', {name: 'Quick access'}).click(); await page.getByRole('dialog', {name: 'Quick access'}).getByRole('button', {name: 'Customize'}).click(); }
    else await page.getByRole('button', {name: /^Customize: make .* yours$/}).or(page.getByRole('button', {name: 'Customize the view', exact: true})).first().click();
    await expect(page.getByRole('dialog', {name: /^Make .* yours$/})).toBeVisible(); await settle(page); await scan(page, findings, 'NOVA, Make it yours');
    if (isMobile) { await nova(); await page.getByRole('button', {name: 'Quick access'}).click(); await expect(page.getByRole('dialog', {name: 'Quick access'})).toBeVisible(); await scan(page, findings, 'NOVA, Quick access'); }
    // The conversation with NOVA's own cards (the second reply).
    await nova();
    const field = page.getByRole('textbox', {name: /What.s on your mind|Message/}).first();
    await field.fill('Fictional: give me cards'); await field.press('Enter');
    const chat = page.locator('section.nova-chat');
    await expect(chat).toBeVisible();
    await expect(chat.locator('.ai-card').first()).toBeVisible({timeout: 20_000});
    await scan(page, findings, 'NOVA conversation with cards');
    expect(findings).toEqual({});
  });

  test(`axe: the NOVA and Hermes guides at every planet, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(300_000);
    await begin(page, theme, isMobile);
    await seed(page, {guide: true});
    const findings: Findings = {};
    for (const [path, panel] of [['/app/nova/setup', 'data-setup-panel'], ['/app/nova/hermes', 'data-hermes-panel']] as const) {
      await page.goto(path); await settle(page);
      await expect(planetButtons(page).first()).toBeVisible({timeout: 15_000});
      await scan(page, findings, `${path}, the path`);
      const names = await planetButtons(page).evaluateAll(buttons => buttons.map(b => b.getAttribute('aria-label') ?? b.textContent ?? ''));
      expect(names.length, path).toBeGreaterThanOrEqual(10);
      for (const name of names) {
        const button = page.locator('.nova-guide-path').getByRole('button', {name, exact: true}).first();
        if (await page.locator(`[${panel}]`).count()) { /* a planet's button toggles its guide: close the open one first */ await page.goto(path); await settle(page); }
        await button.click();
        await expect(page.locator(`[${panel}]`)).toBeVisible();
        await scan(page, findings, `${path}, ${name.split(':')[0]}`);
      }
    }
    expect(findings).toEqual({});
  });

  test(`axe: Notes (every view, the graph and its list, a note) and Tasks, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(240_000);
    await begin(page, theme, isMobile);
    await seed(page);
    const findings: Findings = {};
    for (const view of ['inbox', 'notes', 'today', 'files', 'graph']) { await page.goto(`/app/notes?view=${view}`); await settle(page); await scan(page, findings, `Notes ${view}`); }
    await expect(page.getByRole('button', {name: 'List', exact: true})).toBeVisible();
    await page.getByRole('button', {name: 'List', exact: true}).click();
    await expect(page.getByRole('list', {name: 'Notes, goals and habits and their links'})).toBeVisible();
    await scan(page, findings, 'Notes graph as a list');
    await page.goto('/app/notes?view=notes'); await settle(page);
    const first = page.locator('main').getByRole('link').filter({hasText: /\w/}).first();
    const href = await page.locator('main a[href*="/app/notes?note="]').first().getAttribute('href').catch(() => null) ?? await first.getAttribute('href');
    if (href) { await page.goto(href); await settle(page); await scan(page, findings, 'Notes, one note'); }
    await page.goto('/app/tasks'); await settle(page); await scan(page, findings, 'Tasks');
    expect(findings).toEqual({});
  });

  test(`axe: every confirm card variant in ZIGi's panel, ${theme}`, async ({page, isMobile}) => {
    test.setTimeout(240_000);
    await begin(page, theme, isMobile);
    await seed(page);
    const findings: Findings = {};
    await page.goto('/app/habits'); await settle(page);
    await page.getByRole('button', {name: /Open ZIGi/}).first().click();
    const panel = page.locator('dialog.ai-chat[open]');
    await expect(panel.locator('.ai-greeting-text')).toBeVisible();
    const send = async (words: string) => { await panel.getByLabel('Message to your AI').fill(words); await panel.getByRole('button', {name: 'Send', exact: true}).click(); };
    // Each reply's cards are checked while they are the live ones (a new message folds the earlier cards away).
    await send('Fictional: my evening');
    await expect(panel.getByTestId('ai-proposals').last().getByRole('article').first()).toBeVisible({timeout: 20_000});
    await scan(page, findings, 'ZIGi\'s cards: estimate, safety note, form, first note', panel);
    // A card being edited, a kept card's receipt with its Undo, and a dismissed card.
    const water = panel.locator('.ai-card[data-kind="log-water"]').first();
    await water.getByRole('button', {name: 'Edit', exact: true}).click();
    await expect(water.locator('form.ai-card-edit')).toBeVisible(); await scan(page, findings, 'A card being edited', panel);
    await water.getByRole('button', {name: 'Cancel', exact: true}).click();
    await water.getByRole('button', {name: 'Add', exact: true}).click();
    await expect(panel.getByRole('button', {name: /^Undo/}).first()).toBeVisible(); await scan(page, findings, 'A kept card with Undo', panel);
    await panel.locator('.ai-card[data-kind="create-habit"]').first().getByRole('button', {name: 'Dismiss', exact: true}).click();
    await scan(page, findings, 'A dismissed card', panel);
    await send('Fictional: put these in order');
    await expect(panel.locator('.ai-card[data-kind="add-task"]')).toBeVisible({timeout: 20_000});
    await scan(page, findings, 'NOVA\'s own cards', panel);
    await send('Fictional: a 10k plan');
    await expect(panel.locator('.ai-card-refused').last()).toBeVisible({timeout: 20_000});
    await scan(page, findings, 'A plan, a refused card and a calm note', panel);
    expect(findings).toEqual({});
  });
}
