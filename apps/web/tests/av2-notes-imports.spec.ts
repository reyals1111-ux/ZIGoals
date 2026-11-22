import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';
import {buildStoredZip} from '../lib/export/zip';

/**
 * Session AV lane 2 (r4-notes; LEDGER #321, Bear's imports): Notes → Files reads Evernote's .enex and Bear's .bear2bk (a
 * ZIP of TextBundles) on the device, shows the plan, and imports with titles, days, tags and photos; Undo is in the
 * message. Fictional files made here. At 390 and 1440, Nebula, Light and Dark, axe-clean.
 */
test.use({timezoneId: 'UTC'});
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNYUPEfK2IYWhIAKxSFwScT0+MAAAAASUVORK5CYII=';
const ENEX = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export><note><title>Fictional Evernote trip</title><created>20261101T083000Z</created><tag>travel</tag>
<content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><div>Temples and <b>tea</b>.</div><div><en-todo/>pack</div><en-media type="image/png" hash="a"/></en-note>]]></content>
<resource><data encoding="base64">${PNG}</data><mime>image/png</mime></resource></note></en-export>`;
const BEAR = Buffer.from(buildStoredZip([
  {name: 'Fictional garden.textbundle/text.md', data: '# Fictional garden\n\nRoses for #home.', modified: new Date('2026-11-01T09:00:00Z')},
  {name: 'Fictional garden.textbundle/info.json', data: '{"net.shinyfrog.bear":{"creationDate":"2026-10-01T10:00:00Z"}}', modified: new Date('2026-11-01T09:00:00Z')}]));
for (const theme of THEMES) test(`${theme}: imports from Evernote and Bear`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/notes?view=files'); await hydrated(page);
  const files = page.locator('.note-files');
  await expect(files.getByRole('heading', {name: 'Import Markdown, Evernote or Bear'})).toBeVisible();
  await files.locator('input[type=file]').setInputFiles([{name: 'Fictional.enex', mimeType: 'application/xml', buffer: Buffer.from(ENEX)}, {name: 'Fictional.bear2bk', mimeType: 'application/zip', buffer: BEAR}]);
  const plan = files.getByRole('group', {name: 'What the import would do'});
  await expect(plan).toContainText('2 new notes');
  const findings = await axe(page, files);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await plan.getByRole('button', {name: 'Import'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Imported 2 notes with 1 photo'}).first()).toBeVisible();
  const stored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!) as {notes: {title: string; body: string; tags?: string[]; photoId?: string; createdAt: string}[]}, NOTES_KEY);
  const evernote = stored.notes.find(n => n.title === 'Fictional Evernote trip')!, bear = stored.notes.find(n => n.title === 'Fictional garden')!;
  expect(evernote).toMatchObject({tags: ['travel'], createdAt: '2026-11-01T08:30:00.000Z'});
  expect(evernote.body).toBe('Temples and **tea**.\n- [ ] pack');
  expect(evernote.photoId).toMatch(/^n-/);
  expect(bear).toMatchObject({body: 'Roses for #home.', createdAt: '2026-10-01T10:00:00.000Z'});
});
