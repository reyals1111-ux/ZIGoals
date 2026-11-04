import {expect, test} from '@playwright/test';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {nova, seed, sendInNova} from './helpers';

/**
 * Session AL (lane L7, must-have 2): with no model, questions are answered from the pages' own stores, never turned into a
 * write preview, and ZIGi gives the answer NOVA gives. Showcase (the bots' Denver, Tokyo and Lisbon rounds used it), UTC.
 */
test.use({timezoneId: 'UTC', viewport: {width: 1280, height: 900}});
const last = (page: import('@playwright/test').Page) => zigiPanel(page).locator('.ai-turn-assistant').last();
test('ZI1/LA-018/MO-056/BN-068: a water question (EN and NL) gets an answer and no "Will save" preview', async ({page}) => {
  await seed(page, {showcase: true});
  await page.goto('/app/health');
  await openZigi(page);
  for (const ask of ['how much water did I drink today', 'Hoeveel water heb ik vandaag gedronken?', 'I didn\'t drink water today']) {
    await sendToZigi(page, ask);
    await expect(last(page)).toBeVisible();
    await expect(zigiPanel(page).getByText(/^Will save:/)).toHaveCount(0);
  }
});
test('TK-053: "Explain my P&L" never offers to save water', async ({page}) => {
  await seed(page, {showcase: true});
  await page.goto('/app/portfolio');
  await openZigi(page);
  await sendToZigi(page, 'Explain my P&L');
  await expect(last(page)).toContainText('profit and loss');
  await expect(zigiPanel(page).getByText(/Will save/)).toHaveCount(0);
  await expect(zigiPanel(page).getByText(/Water/)).toHaveCount(0);
});
test('DV-074/LA-005: ZIGi answers "How far am I on my goals?" and "What is due today?" as NOVA does, not with the examples list', async ({page}) => {
  await seed(page, {showcase: true});
  await page.goto('/app/goals');
  await openZigi(page);
  await sendToZigi(page, 'How far am I on my goals?');
  await expect(last(page)).toContainText('from your own records');
  await expect(last(page)).not.toContainText('For example');
  const zigiFirstLine = (await last(page).locator('.ai-local-answer').innerText()).split('\n')[0];
  await sendToZigi(page, 'What is due today?');
  await expect(last(page)).toContainText('Today (');
  await page.goto('/app/habits');
  await sendInNova(page, 'How far am I on my goals?');
  await expect(nova(page).locator('.nova-turn-assistant').last()).toContainText(zigiFirstLine!, {timeout: 20_000});
});
test('DV-061a: "list my goals", "How many goals do I have?" and "Which goals are behind?" are answered on the device', async ({page}) => {
  await seed(page, {showcase: true});
  await page.goto('/app/goals');
  await openZigi(page);
  await sendToZigi(page, 'list my goals');
  await expect(last(page)).toContainText('You have');
  await sendToZigi(page, 'How many goals do I have?');
  await expect(last(page)).toContainText('You have');
  await sendToZigi(page, 'Which goals are behind?');
  await expect(last(page)).not.toContainText('For example');
});
test('BN-059: "How do I export my data?" and "How do I erase everything?" are answered from Help, with no brain', async ({page}) => {
  await seed(page);
  await page.goto('/app');
  await openZigi(page);
  await sendToZigi(page, 'How do I export my data?');
  await expect(last(page)).toContainText('Export everything');
  await sendToZigi(page, 'How do I erase everything?');
  await expect(last(page)).toContainText('Erase everything on this device');
  await sendToZigi(page, 'How long is the voting period?');
  await expect(last(page)).toContainText('open Governance');
});
