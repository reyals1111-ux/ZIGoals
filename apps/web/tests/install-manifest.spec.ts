import {createHash} from 'node:crypto';
import {expect, test} from '@playwright/test';
import {securityPolicy} from '../lib/security-policy';

// The installed app (Session L): manifest, icons and the Home Screen title, and the security policy left unchanged.
const ICONS = [
  {src: '/icons/zigoals-192.png', sizes: '192x192', type: 'image/png', purpose: 'any'},
  {src: '/icons/zigoals-512.png', sizes: '512x512', type: 'image/png', purpose: 'any'},
  {src: '/icons/zigoals-maskable-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable'},
];
// Session AA-Cloud Part 7 ([TIER 3] (PWA/manifest), deliberate): four Home Screen shortcuts, each with a 96 px icon.
const shortcut = (name: string, short_name: string, description: string, url: string, icon: string) => ({name, short_name, description, url, icons: [{src: `/icons/shortcut-${icon}-96.png`, sizes: '96x96', type: 'image/png'}]});
const SHORTCUTS = [
  shortcut('Quick add', 'Quick add', 'Add a goal, an asset, a habit or a Health entry', '/app?shortcut=quick-add', 'quick-add'),
  shortcut('Log water', 'Water', 'Today\'s one-tap water, ready to log', '/app?shortcut=water', 'water'),
  shortcut('Check in a habit', 'Habits', 'Today\'s habits, ready to check in', '/app/habits', 'habit'),
  shortcut('Ask ZIGi', 'ZIGi', 'Open ZIGi with an empty question', '/app?shortcut=ask', 'ask'),
];
/** The exact bytes main 72ad872's metadata route served (Session X Part 5a); every later manifest begins with them. */
const MANIFEST_72AD872_SHA256 = '0d18e73e3b0b5d1a4dac1181820b5db35029e14ae0ffeab14ee505758d51eb92';

/** Width, height and whether a PNG can hold transparency (an alpha channel or a tRNS chunk). */
function png(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20), colorType = bytes[25];
  let transparency = colorType === 4 || colorType === 6;
  for (let at = 8; at < bytes.length;) {
    const length = bytes.readUInt32BE(at), type = bytes.subarray(at + 4, at + 8).toString('latin1');
    if (type === 'tRNS') transparency = true;
    at += 12 + length;
  }
  return {width, height, transparency};
}

test('the manifest describes the installed ZIGoals app', async ({request}) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  expect(await response.json()).toEqual({
    id: '/app', name: 'ZIGoals', short_name: 'ZIGoals',
    description: 'Plan, fund and track goals in a clearly labelled local demo or ZIGChain Testnet. Independent, unaudited alpha.',
    start_url: '/app', scope: '/', display: 'standalone', background_color: '#020918', theme_color: '#020918', icons: ICONS,
    shortcuts: SHORTCUTS,
  });
});

// Session X Part 5a: the manifest became a static file at the same address. Its bytes are exactly what main 72ad872's
// metadata route served (sha256 below, captured from that build), so apps already saved to a Home Screen keep the same
// id, start page, scope and icons. As a public file it bypasses middleware: no page policy, no no-store.
// Session AA-Cloud Part 7 (deliberate, as strict): the file grows by its new fields only. Everything 72ad872 served comes
// first, byte for byte (its bytes without the closing brace hash to the pin above once the brace is put back), and the
// whole file is pinned by its own hash.
test('the static manifest keeps 72ad872\'s bytes first, at the same address, and is pinned as a whole', async ({request}) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.status()).toBe(200);
  const body = await response.body(), text = body.toString('utf8'), prefix = text.slice(0, text.indexOf(',"shortcuts":'));
  expect(createHash('sha256').update(`${prefix}}`).digest('hex')).toBe(MANIFEST_72AD872_SHA256);
  expect(createHash('sha256').update(body).digest('hex')).toBe('234454efd3fc46d61058fc6658a7a561cf4f56b132521207879b64fec32d5058');
  expect(response.headers()['content-type']).toContain('application/manifest+json');
  expect(response.headers()['content-security-policy']).toBeUndefined();
  expect(response.headers()['cache-control'] ?? '').not.toContain('no-store');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('every icon is an opaque PNG of its declared size, including the Home Screen icon', async ({request}) => {
  for (const {src, sizes} of [...ICONS, {src: '/apple-touch-icon.png', sizes: '180x180'}, ...SHORTCUTS.map(s => s.icons[0]!)]) {
    const response = await request.get(src);
    expect(response.status(), src).toBe(200);
    expect(response.headers()['content-type'], src).toContain('image/png');
    const {width, height, transparency} = png(await response.body());
    expect(`${width}x${height}`, src).toBe(sizes);
    expect(transparency, src).toBe(false);
  }
});

test('pages link the manifest once, name the Home Screen app and keep the existing icons', async ({page}) => {
  await page.goto('/app');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'ZIGoals');
  // Title only: no capability meta was added.
  await expect(page.locator('meta[name="mobile-web-app-capable"], meta[name="apple-mobile-web-app-capable"]')).toHaveCount(0);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
});

test('the security policy is unchanged; a same-origin manifest needs no new directive', async ({request}) => {
  const csp = (await request.get('/app')).headers()['content-security-policy'] ?? '';
  expect(csp).not.toBe('');
  const withoutNonce = (value: string) => value.replace(/'nonce-[^']+'/, "'nonce'");
  expect(withoutNonce(csp)).toBe(withoutNonce(securityPolicy(false, false).csp));
  expect(csp).toContain("default-src 'self'");
  expect(csp).not.toContain('manifest-src');
});
