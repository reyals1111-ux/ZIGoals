import {expect, test, type Page} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';
import {AI_OPTIONS_KEY} from '../lib/ai/store/keys';
import {NOVA_SETUP_KEY} from '../lib/nova/setup';
import {STRICT_REFUSAL} from '../lib/ai/privacy-mode';
import {answer, localModel, mockModel, seedDevice} from './wiring-2-helpers';

/**
 * Session AK, lane WB (WIRING_AUDIT_2.md Z1B-10): before a receipt or lab-sheet photo leaves the device, the person sees
 * the photo and where it goes, and nothing is sent until "Send to …" (components/ai/photo-send-confirm.tsx). With a MOCK
 * local model that reads photos, the receipt's sheet names "your local model on this computer", Cancel sends nothing, and
 * only Send makes the one request. In Strict with a cloud model, the lab sheet's sheet shows the reason instead of Send,
 * and no request reaches the provider (a MOCK answered by page.route). Fictional records; the photos are made here.
 */
test.skip(({isMobile}) => isMobile, 'one run is enough: the confirmation is the same component on a phone');
test.use({viewport: {width: 1440, height: 900}});
// An 8 × 8 violet PNG, made here: nothing is fetched.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=', 'base64');
async function choosePhoto(page: Page, scope: ReturnType<Page['locator']>, name: string) {
  const chooser = page.waitForEvent('filechooser');
  await scope.getByRole('button', {name: 'Choose a photo', exact: true}).click();
  await (await chooser).setFiles({name, mimeType: 'image/png', buffer: PNG});
}

test('Z1B-10: a receipt photo shows the photo and where it goes; Cancel sends nothing; only "Send to …" makes the request', async ({page}) => {
  const seen = await mockModel(page, () => answer('{"amount":"4.20","currency":"EUR","date":"2026-09-20","payee":"Fictional café"}'));
  const settings = localModel();
  await seedDevice(page, {[AI_SETTINGS_KEY]: {...settings, pageShare: {...settings.pageShare, wealth: true}}, [AI_OPTIONS_KEY]: {version: 1, visionDeclared: {'local:mock-chat': true}}});
  await page.goto('/app/wealth');
  await page.getByRole('group', {name: 'Money tools'}).getByRole('button', {name: 'Receipt photos'}).click();
  const panel = page.locator('.money-photos');
  await panel.getByRole('button', {name: 'Draft an entry from a receipt'}).click();
  const draft = panel.locator('.money-photos-draft');
  await choosePhoto(page, draft, 'fictional-receipt.png');
  const sheet = draft.locator('.photo-send-confirm');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('img', {name: 'The receipt photo you chose'})).toBeVisible();
  await expect(sheet).toContainText('This photo goes to your local model on this computer, with this one request. A receipt often shows a card number, an address or a name');
  const send = sheet.getByRole('button', {name: 'Send to your local model on this computer', exact: true});
  await expect(send).toBeVisible();
  // Nothing has left: not on choosing the photo, not while the sheet waits, not on Cancel.
  await page.waitForTimeout(1_000);
  expect(seen).toHaveLength(0);
  await sheet.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(seen).toHaveLength(0);
  // Chosen again and sent: exactly one request, with the photo.
  await choosePhoto(page, draft, 'fictional-receipt.png');
  await draft.locator('.photo-send-confirm').getByRole('button', {name: 'Send to your local model on this computer', exact: true}).click();
  await expect.poll(() => seen.length).toBe(1);
  expect(JSON.stringify(seen[0]!.messages)).toContain('data:image/');
});

test('Z1B-10: in Strict with a cloud model, a lab-sheet photo shows the reason instead of Send, and nothing is sent', async ({page}) => {
  const provider: string[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3}\/)(?!localhost:3\d{3}\/)(?!api\.openai\.com\/)/, route => route.abort());
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('https://api.openai.com/**', route => { provider.push(`${route.request().method()} ${route.request().url()}`); return route.fulfill({status: 200, contentType: 'text/event-stream', body: answer('MOCK cloud reply')}); });
  const base = defaultAiSettings();
  await seedDevice(page, {
    [AI_SETTINGS_KEY]: {...base, enabled: true, mode: 'api', provider: 'openai', model: 'gpt-mock', includeHealth: true, pageShare: {...base.pageShare, health: true}},
    [AI_OPTIONS_KEY]: {version: 1, visionDeclared: {'openai:gpt-mock': true}},
    [NOVA_SETUP_KEY]: {version: 1, privacyMode: 'strict'},
  }, {model: false});
  await page.goto('/app/health?tab=measurements');
  await page.getByText('Your numbers: blood pressure and lab values', {exact: true}).click();
  await page.getByText('Read my lab sheet from a photo (optional)').click();
  const scan = page.locator('.numbers-scan');
  await expect(scan.getByText('Read my lab sheet from a photo', {exact: true})).toBeVisible();
  const before = provider.length;
  await choosePhoto(page, scan, 'fictional-lab-sheet.png');
  const sheet = scan.locator('.photo-send-confirm');
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('img', {name: 'The lab sheet photo you chose'})).toBeVisible();
  await expect(sheet.getByRole('alert')).toHaveText(STRICT_REFUSAL);
  await expect(sheet.getByRole('button', {name: /^Send to/})).toHaveCount(0);
  await sheet.getByRole('button', {name: 'OK', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(provider.slice(before)).toEqual([]);
});
