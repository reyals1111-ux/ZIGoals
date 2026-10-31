import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
// @ts-expect-error: a plain ES module script without types (the importer); only its constants are read here.
import {PUSH_ART} from '../../../../scripts/zigi/import-studio.mjs';

/**
 * Session AK Part 12 (Studio-4 preparation): the notification's icon and badge come from ONE slot in public/sw.js
 * (PUSH_ART), equal to the importer's, so Studio-4's push images replace two paths and nothing else. Today the app icon
 * (192×192) and the monochrome badge (96×96), as before. The worker still loads no other script.
 */
const PUBLIC = join(__dirname, '..', '..', 'public');
const worker = readFileSync(join(PUBLIC, 'sw.js'), 'utf8');

test('the worker\'s one art slot equals the importer\'s, and today it is the app icon and the badge', () => {
  const slot = /^const PUSH_ART = \{icon: '([^']+)', badge: '([^']+)'\};$/m.exec(worker);
  expect(slot).not.toBeNull();
  expect({icon: slot![1], badge: slot![2]}).toEqual(PUSH_ART);
  expect(PUSH_ART).toEqual({icon: '/icons/zigoals-192.png', badge: '/icons/zigoals-badge-96.png'});
  expect(worker).toMatch(/^const ICON = PUSH_ART\.icon, BADGE = PUSH_ART\.badge;$/m);
  const png = (file: string) => { const b = readFileSync(join(PUBLIC, file)); expect(b.subarray(1, 4).toString('latin1'), file).toBe('PNG'); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  expect(existsSync(join(PUBLIC, PUSH_ART.icon))).toBe(true); expect(png(PUSH_ART.icon)).toEqual([192, 192]);
  expect(existsSync(join(PUBLIC, PUSH_ART.badge))).toBe(true); expect(png(PUSH_ART.badge)).toEqual([96, 96]);
});
test('every notification the worker shows takes its icon and badge from the slot, and no other image path is named', () => {
  const calls = [...worker.matchAll(/showNotification\([^;]*/g)].map(m => m[0]);
  expect(calls.length).toBeGreaterThanOrEqual(2);
  for (const call of calls) { expect(call, call.slice(0, 80)).toContain('icon: ICON'); expect(call, call.slice(0, 80)).toContain('badge: BADGE'); }
  expect(worker.match(/\/icons\/[a-z0-9-]+\.png/g)).toEqual(['/icons/zigoals-192.png', '/icons/zigoals-badge-96.png']);
  expect(worker.replace(/^const PUSH_ART = .*$/m, '')).not.toMatch(/\b(?:image|icon|badge)\s*:\s*['"]/);
  expect(worker).not.toMatch(/importScripts\s*\(/);
});
