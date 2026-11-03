// @vitest-environment jsdom
import {afterEach, expect, test, vi} from 'vitest';
import {forgetOfflineCaches} from './register';

// Session AK (journey bug J6-1): Erase everything left a running worker that refilled "zigoals-static-v1" at once.
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function device({script = '/sw.js?v=abc123', answers = true}: {script?: string; answers?: boolean} = {}) {
  const order: string[] = [], names = new Set(['zigoals-static-v1', 'zigoals-pages-abc123', 'other-app']);
  const worker = {scriptURL: `https://app.test${script}`, postMessage: (message: {type: string}, ports: MessagePort[]) => { order.push(`message:${message.type}`); if (answers) ports[0]!.postMessage({type: 'zigoals:sw-forgotten'}); }};
  const registration = {active: worker, waiting: null, installing: null, unregister: async () => { order.push('unregister'); return true; }};
  vi.stubGlobal('isSecureContext', true);
  Object.defineProperty(navigator, 'serviceWorker', {configurable: true, value: {controller: worker, getRegistration: async () => registration}});
  vi.stubGlobal('caches', {keys: async () => [...names], delete: async (name: string) => { order.push(`delete:${name}`); names.delete(name); return true; }});
  return {order, names};
}

test('the worker is told to stop caching (and answers) and is unregistered before the page deletes the caches', async () => {
  const {order, names} = device();
  await forgetOfflineCaches();
  expect(order).toEqual(['message:zigoals:sw-forget', 'unregister', 'delete:zigoals-static-v1', 'delete:zigoals-pages-abc123']);
  expect([...names]).toEqual(['other-app']);
});

test('an older worker that does not answer is waited for briefly; ADR-010\'s account worker is never unregistered', async () => {
  const silent = device({answers: false});
  await forgetOfflineCaches({wait: 10});
  expect(silent.order).toEqual(['message:zigoals:sw-forget', 'unregister', 'delete:zigoals-static-v1', 'delete:zigoals-pages-abc123']);
  const account = device({script: '/push-sw.js'});
  await forgetOfflineCaches({wait: 10});
  expect(account.order).toEqual(['delete:zigoals-static-v1', 'delete:zigoals-pages-abc123']);
});
