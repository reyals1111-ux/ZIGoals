import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {openSettings} from '../../settings-open';

/**
 * Release review AL "as if 1.0" (docs/review/session-al/RELEASE_REVIEW_AL.md), the ZIGi, NOVA, Tasks, restore and Undo
 * findings: one test per finding at the review's width, on the Showcase with a fixed clock where dates matter.
 */
test.use({timezoneId: 'Europe/Brussels'});
/** The review's evening: Sunday 8 November 2026, 21:45 in Brussels. */
const EVENING = new Date('2026-11-08T20:45:00.000Z');
const desktopOnly = () => test.skip(({isMobile}) => isMobile, 'computer width: runs in the desktop project');
const phoneOnly = () => test.skip(({isMobile}) => !isMobile, 'phone width: runs in the mobile project');

async function showcase(page: Page) {
  await offlineApi(page);
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings'); /* Session AP: a seed only writes storage here; no group needs opening */
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await loadShowcase(page);
}
async function askZigi(page: Page, question: string) {
  const before = await zigiPanel(page).locator('.ai-turn-local').count();
  await sendToZigi(page, question);
  await expect(zigiPanel(page).locator('.ai-turn-local')).toHaveCount(before + 1, {timeout: 10_000});
  return zigiPanel(page).locator('.ai-turn-local').last();
}

test.describe('RR-4', () => {
  desktopOnly();
  test('RR-4: ZIGi\'s "At this pace" is the goal page\'s pace forecast, in its date format, and the plan\'s date is named as the plan\'s', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await page.goto('/app/goals'); await hydrated(page);
    await page.getByRole('link', {name: /Emergency fund/}).first().click();
    const headline = (await page.locator('#goal-forecast-title').textContent())!.trim();
    expect(headline).toMatch(/^At this pace: about [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    const plan = (await page.locator('.intelligence-metrics div').filter({hasText: 'With your plan'}).locator('dd').first().textContent())!.trim();
    expect(plan).toMatch(/^About [A-Z][a-z]{2} \d{1,2}, \d{4}$/);
    await openZigi(page);
    const answer = (await (await askZigi(page, 'Am I on track for my emergency fund?')).locator('.ai-local-answer').textContent())!;
    expect(answer).toContain(headline);
    expect(answer).toContain(`With your plan: ${plan.replace(/^About/, 'about')}.`);
    expect(answer).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(answer).not.toMatch(/completes around/);
  });
});

test.describe('RR-13', () => {
  desktopOnly();
  test('RR-13: a Health question gets one tap to ZIGi\'s Health switches; "missed yesterday" is answered from the habits', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await openZigi(page);
    const water = await askZigi(page, 'How much water did I drink today?');
    await expect(water.locator('.ai-local-answer')).toContainText('Include Health');
    const missed = await askZigi(page, 'Which habits did I miss yesterday?');
    await expect(missed.locator('.ai-local-answer')).toContainText(/^Yesterday \(Sat, Nov 7\) /);
    await expect(missed.locator('.ai-local-answer')).not.toContainText('isn’t something I can answer');
    const sleep = await askZigi(page, 'How did I sleep this week?');
    const open = sleep.getByRole('button', {name: 'Open Settings → ZIGi → Privacy & data'});
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/\/app\/settings#zigi-page-share-title$/);
    await expect(page.getByRole('switch', {name: 'Health page data'}).first()).toBeInViewport({timeout: 10_000});
    await expect(page.getByRole('switch', {name: 'Include Health'}).first()).toBeInViewport({timeout: 10_000});
  });
});

test.describe('RR-9', () => {
  desktopOnly();
  test('RR-9: at 1440 × 900 every row of NOVA\'s Health HUD shows its whole value and target', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await page.goto('/app/nova'); await hydrated(page);
    const hud = page.getByRole('article', {name: 'Health HUD', exact: true});
    await expect(hud.locator('.holo-meter').first()).toBeVisible({timeout: 15_000});
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
    const rows = await hud.locator('.holo-meter').evaluateAll(els => els.map(el => {
      const value = el.querySelector<HTMLElement>('.holo-meter-value')!, v = value.getBoundingClientRect(), body = el.closest('.nova-widget-body')!.getBoundingClientRect(), widget = el.closest('.nova-widget')!.getBoundingClientRect();
      return {label: el.querySelector('.holo-meter-label')?.textContent ?? '', text: value.textContent ?? '', cut: value.scrollWidth > value.clientWidth + 1, right: v.right, limit: Math.min(body.right, widget.right)};
    }));
    expect(rows.find(r => r.label === 'Water')?.text, JSON.stringify(rows)).toMatch(/mL \/ 2,000 mL$/);
    for (const r of rows) { expect(r.cut, `${r.label} "${r.text}" is whole`).toBe(false); expect(r.right, `${r.label} "${r.text}" inside the panel`).toBeLessThanOrEqual(r.limit + 0.5); }
  });
});

test.describe('RR-10', () => {
  phoneOnly();
  test('RR-10: at 390 an Undo toast never covers NOVA\'s message box, and it leaves once the person types the next thing', async ({page}) => {
    await showcase(page);
    await page.goto('/app/nova'); await hydrated(page);
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
    await page.getByRole('button', {name: /^Quick actions: Health/}).first().click();
    await page.getByRole('button', {name: /250 mL/}).first().click();
    const toast = page.locator('.aa-toast');
    await expect(toast).toContainText('Water logged');
    await page.keyboard.press('Escape');
    await page.getByRole('button', {name: /Talk to NOVA/}).first().click();
    const box = page.getByRole('textbox', {name: 'Message NOVA'});
    await expect(box).toBeFocused();
    const overlap = async () => {
      if (!await toast.count()) return false;
      const [t, b] = [await toast.boundingBox(), await box.boundingBox()];
      return !!t && !!b && t.y < b.y + b.height && t.y + t.height > b.y && t.x < b.x + b.width && t.x + t.width > b.x;
    };
    expect(await overlap(), 'the toast is clear of the focused message box').toBe(false);
    // Typing the next question after the toast's first moments: the person moved on, and the toast goes.
    await page.waitForTimeout(1_600);
    await box.pressSequentially('How');
    await expect(toast).toHaveCount(0, {timeout: 2_000});
  });
});

test.describe('RR-8', () => {
  desktopOnly();
  test('RR-8: at 21:45 the side list, the header, the list and Today count the same overdue tasks (a task due today at 10:30 included)', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    const today = page.getByRole('region', {name: 'Tasks due today'});
    await expect(today).toBeVisible();
    const onToday = Number(/· (\d+) overdue/.exec((await today.textContent()) ?? '')?.[1]);
    await page.goto('/app/tasks?view=today'); await hydrated(page);
    const nav = Number(await page.getByRole('navigation', {name: 'Task views'}).getByRole('button', {name: /^Overdue/}).locator('small').textContent());
    const head = Number(/(\d+) overdue in all/.exec((await page.locator('#tasks-view-title').textContent()) ?? '')?.[1]);
    const group = Number(await page.locator('.tasks-group[data-state=overdue] h3 small').textContent());
    expect({onToday, nav, head, group}).toEqual({onToday: 2, nav: 2, head: 2, group: 2});
  });
});

test.describe('RR-18', () => {
  desktopOnly();
  test('RR-18: a task row has one box, the one that marks it done; selecting is a mode, its boxes named, and bulk Done still works', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await page.goto('/app/tasks?view=all'); await hydrated(page);
    const rows = page.locator('.tasks-main li.task');
    await expect(rows.first()).toBeVisible();
    const n = await rows.count();
    for (let i = 0; i < n; i++) {
      await expect(rows.nth(i).locator(':scope > label input[type=checkbox]')).toHaveCount(1);
      await expect(rows.nth(i).locator(':scope > label').getByRole('checkbox', {name: /^Mark “.+” (?:not )?done$/})).toHaveCount(1);
    }
    await expect(page.getByRole('checkbox', {name: /^Select “/})).toHaveCount(0);
    const select = page.locator('.tasks-main').getByRole('button', {name: 'Select', exact: true});
    await select.click();
    await expect(select).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('checkbox', {name: /^Mark “/})).toHaveCount(0);
    const boxes = page.getByRole('checkbox', {name: /^Select “/});
    await expect(boxes).toHaveCount(n);
    const titles = await rows.locator('.task-title').allTextContents();
    await boxes.nth(0).check(); await boxes.nth(1).check();
    const bar = page.getByRole('toolbar', {name: '2 selected'});
    await expect(bar).toBeVisible();
    await bar.getByRole('button', {name: 'Done'}).click();
    await expect(page.locator('.aa-toast')).toContainText('Done: 2 tasks');
    await expect(select).toHaveAttribute('aria-pressed', 'false');
    for (const title of titles.slice(0, 2)) await expect(page.locator('.tasks-main .task-title', {hasText: title})).toHaveCount(0);
    await expect(page.getByRole('checkbox', {name: /^Mark “/}).first()).toBeVisible();
  });
});

test.describe('RR-7', () => {
  desktopOnly();
  test('RR-7: a backup restored seconds after it was made says no part is from an earlier version', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    // The person's own records (the Showcase lives in this tab's session): copied to the device, as after a welcome.
    await page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); const prefix = `zigoals:showcase:v1:${marker.generation}:`; for (const [k, v] of Object.entries(sessionStorage)) if (k.startsWith(prefix)) localStorage.setItem(k.slice(prefix.length), v); sessionStorage.clear(); });
    await openSettings(page); await hydrated(page);
    const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
    await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
    const waiting = page.waitForEvent('download');
    await section.getByRole('button', {name: 'Export everything', exact: true}).click();
    const file = await waiting, chunks: Buffer[] = [];
    for await (const chunk of await file.createReadStream()) chunks.push(Buffer.from(chunk));
    await page.goto('/app/settings/data'); await hydrated(page);
    const region = page.getByRole('region', {name: 'Restore from a backup'});
    await region.getByLabel('Export everything ZIP').setInputFiles({name: 'zigoals-export-2026-11-08.zip', mimeType: 'application/zip', buffer: Buffer.concat(chunks)});
    const preview = region.getByLabel('What this backup holds');
    await expect(preview).toContainText('Exported Nov 8, 2026');
    for (const part of ['Goals and Wealth', 'Habits', 'Health']) await expect(preview.getByRole('group', {name: part})).toBeVisible();
    await expect(preview).not.toContainText('Saved by an earlier version of ZIGoals');
  });
});
