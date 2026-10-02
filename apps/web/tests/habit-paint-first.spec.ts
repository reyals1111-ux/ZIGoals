import {expect, test, type Page} from '@playwright/test';

// Session I, Part 9: a check-in paints first, then saves. If the save fails, the check-in is taken back visibly and the
// coded storage message says why: a check-in never stays shown as saved when it was not (owner's Addition 1).
const HABITS = 'zigoals:habits:v1';
async function oneHabit(page: Page, template = 'budget', title = 'Fictional review') {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Start from template').selectOption(template);
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  const card = page.getByRole('article', {name: title, exact: true});
  await expect(card).toBeVisible();
  return card;
}
/** Records, in page time, each state the check-in button shows and each write of the Habits key (or its refusal). */
async function watch(page: Page, refuse: boolean) {
  await page.evaluate(({key, refuse}) => {
    const log: [string, number][] = [];
    (window as unknown as {checkInLog: typeof log}).checkInLog = log;
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k === key) { log.push([refuse ? 'refused' : 'write', performance.now()]); if (refuse) throw new DOMException('Fixture quota', 'QuotaExceededError'); }
      return write.call(this, k, v);
    };
    const card = document.querySelector('article.habit-card')!;
    const state = () => card.querySelector('button[aria-pressed]')?.getAttribute('aria-pressed') ?? 'none';
    let last = state();
    new MutationObserver(() => { const now = state(); if (now !== last) { last = now; log.push([`pressed:${now}`, performance.now()]); } }).observe(card, {subtree: true, attributes: true, childList: true});
  }, {key: HABITS, refuse});
}
const events = (page: Page) => page.evaluate(() => (window as unknown as {checkInLog: [string, number][]}).checkInLog.map(([name]) => name));

test('a check-in shows as done before it is written, and the write follows', async ({page}) => {
  const card = await oneHabit(page);
  await watch(page, false);
  await card.getByRole('button', {name: 'Complete Fictional review', exact: true}).click();
  await expect(card.getByRole('button', {name: 'Undo completion for Fictional review', exact: true})).toBeVisible();
  await expect.poll(() => events(page)).toEqual(['pressed:true', 'write']);
  // The tap's own frame already shows the result (the button never reads "Saving…" for a check-in it can paint).
  await expect(card.getByRole('button', {name: 'Undo completion for Fictional review', exact: true})).toHaveText('✓ Done');
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS))!).habits[0].entries.map((e: {count: number}) => e.count)).toEqual([1]);
  await page.reload();
  await expect(page.getByRole('article', {name: 'Fictional review', exact: true}).getByRole('button', {name: 'Undo completion for Fictional review', exact: true})).toBeVisible();
});

test('when storage refuses the save, the painted check-in is taken back and the coded reason is shown', async ({page}) => {
  const card = await oneHabit(page);
  const before = await page.evaluate(key => localStorage.getItem(key), HABITS);
  await watch(page, true);
  await card.getByRole('button', {name: 'Complete Fictional review', exact: true}).click();
  const alert = card.getByRole('alert');
  await expect(alert).toContainText('The check-in was not saved and is shown as before.');
  await expect(alert).toContainText('(STORAGE_FULL)');
  // Shown, refused, then visibly back to not done.
  await expect.poll(() => events(page)).toEqual(['pressed:true', 'refused', 'pressed:false']);
  await expect(card.getByRole('button', {name: 'Complete Fictional review', exact: true})).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(key => localStorage.getItem(key), HABITS)).toBe(before);
  await page.reload();
  await expect(page.getByRole('article', {name: 'Fictional review', exact: true}).getByRole('button', {name: 'Complete Fictional review', exact: true})).toBeVisible();
});

// Session K, QA sweep 2: paint-first keeps the buttons enabled while a check-in saves, so the card looks ready, but a
// second tap in that moment used to be ignored without a word: two quick taps on "+" added one.
/** Taps twice: the second tap lands after the first one has painted and before its save has started. Returns the count shown in between. */
const tapTwice = (button: ReturnType<Page['getByRole']>) => button.evaluate(async element => {
  const count = element.closest('article')!.querySelector('.habit-count strong')!;
  const before = count.textContent;
  (element as HTMLButtonElement).click();
  for (let i = 0; i < 50 && count.textContent === before; i++) await Promise.resolve();
  const between = count.textContent;
  (element as HTMLButtonElement).click();
  return between;
});

test('a second quick tap while the first check-in saves counts too, on screen and in storage', async ({page}) => {
  const card = await oneHabit(page, 'water', 'Fictional water');
  const count = card.locator('.habit-count strong');
  await expect(count).toHaveText('0');
  expect(await tapTwice(card.getByRole('button', {name: 'Add one to Fictional water', exact: true}))).toBe('1');
  await expect(count).toHaveText('2');
  await expect(card.getByRole('button', {name: 'Add one to Fictional water', exact: true})).not.toHaveAttribute('aria-busy', 'true');
  expect(JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS))!).habits[0].entries.map((e: {count: number}) => e.count)).toEqual([2]);
  await page.reload();
  await expect(page.getByRole('article', {name: 'Fictional water', exact: true}).locator('.habit-count strong')).toHaveText('2');
});

test('when storage refuses the save, every quick tap it carried is taken back with the coded reason', async ({page}) => {
  const card = await oneHabit(page, 'water', 'Fictional water');
  const before = await page.evaluate(key => localStorage.getItem(key), HABITS);
  await watch(page, true);
  await tapTwice(card.getByRole('button', {name: 'Add one to Fictional water', exact: true}));
  await expect(card.getByRole('alert')).toContainText('(STORAGE_FULL)');
  await expect(card.locator('.habit-count strong')).toHaveText('0');
  expect(await page.evaluate(key => localStorage.getItem(key), HABITS)).toBe(before);
});
