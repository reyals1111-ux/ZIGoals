// @vitest-environment jsdom
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {afterEach, expect, test, vi} from 'vitest';
import {offlineQueue, resetOfflineQueueWarmth, warmOfflineQueue} from './warm';

// Session AK (journey bug J4-2): the queue's chunk was first asked for inside the offline branch, where it cannot load.
afterEach(() => { resetOfflineQueueWarmth(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const fakeModule = {enqueue: vi.fn(async () => true)} as unknown as typeof import('./queue');

test('online, the queue is loaded on an idle moment; offline, the remembered module answers without a new load', async () => {
  let idle: (() => void) | undefined;
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => { idle = cb; return 1; });
  vi.stubGlobal('cancelIdleCallback', () => {});
  const load = vi.fn(async () => fakeModule);
  warmOfflineQueue(load);
  expect(load).not.toHaveBeenCalled();
  idle!();
  expect(load).toHaveBeenCalledTimes(1);
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const failing = vi.fn(async (): Promise<typeof fakeModule> => { throw Error('ChunkLoadError'); });
  expect(await offlineQueue(failing)).toBe(fakeModule);
  expect(failing).not.toHaveBeenCalled();
});

test('offline it does not warm; a failed load is forgotten and tried again', async () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  const load = vi.fn(async () => fakeModule);
  warmOfflineQueue(load);
  await new Promise(r => setTimeout(r, 0));
  expect(load).not.toHaveBeenCalled();
  await expect(offlineQueue(async () => { throw Error('ChunkLoadError'); })).rejects.toThrow('ChunkLoadError');
  expect(await offlineQueue(load)).toBe(fakeModule);
});

test('no caller imports the queue for the first time inside its offline branch', () => {
  const web = join(__dirname, '..', '..');
  const barcode = readFileSync(join(web, 'components', 'health', 'barcode-food-lookup.tsx'), 'utf8');
  const exchanges = readFileSync(join(web, 'components', 'exchanges', 'exchanges-panel.tsx'), 'utf8');
  for (const source of [barcode, exchanges]) expect(source).not.toContain("import('../../lib/offline-queue/queue')");
  expect(barcode).toMatch(/^import \{enqueue as enqueueOffline\} from '\.\.\/\.\.\/lib\/offline-queue\/queue';$/m);
  expect(exchanges).toContain('warmOfflineQueue()');
});
