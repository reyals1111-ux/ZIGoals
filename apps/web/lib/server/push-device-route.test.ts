import {expect, test, vi} from 'vitest';
vi.mock('server-only', () => ({}));
const {pushDeviceRequest, SWITCHING_ON} = await import('./push-device-route');

// Session AK Part 2 (ADR-036 Q3): /api/push-device forwards only checked bodies, only when switched on, same-origin only.
const ORIGIN = 'https://alpha.test', WORKER = 'https://push-device.test', KEY = 'B'.repeat(87);
const on = {enabled: true, publicKey: KEY, workerOrigin: WORKER}, off = {enabled: false, publicKey: null, workerOrigin: null};
const who = {id: '11111111-1111-4111-8111-111111111111', secret: 'a'.repeat(43)};
const registration = {...who, endpoint: 'https://fcm.googleapis.com/wp/abc', zone: 'Europe/Brussels', quiet: {from: '22:00', to: '07:00'}, wakes: [{m: 480, d: 127}], once: [], skips: []};
const req = (method: string, body?: unknown, headers: Record<string, string> = {}) => new Request(`${ORIGIN}/api/push-device`, {method, headers: {origin: ORIGIN, 'content-type': 'application/json', ...headers}, ...(body ? {body: JSON.stringify(body)} : {})});
test('switched off: GET says so, writes answer 503 "being switched on", nothing is forwarded', async () => {
  const fetcher = vi.fn();
  expect(await (await pushDeviceRequest(new Request(`${ORIGIN}/api/push-device`), off, fetcher)).json()).toEqual({enabled: false, ...SWITCHING_ON});
  const put = await pushDeviceRequest(req('PUT', registration), off, fetcher);
  expect(put.status).toBe(503); expect(await put.json()).toEqual(SWITCHING_ON);
  expect(fetcher).not.toHaveBeenCalled();
  // The committed switch alone is not enough: the Worker's origin must be set too.
  expect((await pushDeviceRequest(req('PUT', registration), {...on, workerOrigin: null}, fetcher)).status).toBe(503);
});
test('switched on: the key; a checked registration is forwarded with this origin; anything else is refused', async () => {
  const fetcher = vi.fn(async () => Response.json({registered: true}));
  expect(await (await pushDeviceRequest(new Request(`${ORIGIN}/api/push-device`), on, fetcher)).json()).toEqual({enabled: true, publicKey: KEY});
  const put = await pushDeviceRequest(req('PUT', registration), on, fetcher as unknown as typeof fetch);
  expect(put.status).toBe(200);
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe(`${WORKER}/v1/device`); expect(init.method).toBe('PUT');
  expect(JSON.parse(String(init.body))).toEqual(registration);
  expect((init.headers as Record<string, string>).origin).toBe(ORIGIN);
  for (const bad of [{...registration, label: 'Walk'}, {...registration, wakes: [{m: 480, d: 127, kind: 'habit'}]}, {...registration, endpoint: 'http://x.test'}, {...registration, secret: 'short'}, {...registration, wakes: Array.from({length: 49}, (_, i) => ({m: i, d: 1}))}])
    expect((await pushDeviceRequest(req('PUT', bad), on, fetcher as unknown as typeof fetch)).status, JSON.stringify(bad).slice(0, 80)).toBe(400);
  expect((await pushDeviceRequest(req('PUT', registration, {origin: 'https://evil.test'}), on, fetcher as unknown as typeof fetch)).status).toBe(403);
  expect((await pushDeviceRequest(req('PUT', registration, {'content-type': 'text/plain'}), on, fetcher as unknown as typeof fetch)).status).toBe(415);
  expect((await pushDeviceRequest(req('PATCH', registration), on, fetcher as unknown as typeof fetch)).status).toBe(405);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
test('DELETE and the test send carry the identity only; DELETE still reaches the Worker after the switch goes off', async () => {
  const fetcher = vi.fn(async () => Response.json({deleted: true}));
  await pushDeviceRequest(req('POST', who), on, fetcher as unknown as typeof fetch);
  expect((fetcher.mock.calls[0] as unknown as [string])[0]).toBe(`${WORKER}/v1/device/test`);
  expect((await pushDeviceRequest(req('DELETE', {...who, extra: 1}), on, fetcher as unknown as typeof fetch)).status).toBe(400);
  const del = await pushDeviceRequest(req('DELETE', who), {enabled: false, publicKey: null, workerOrigin: WORKER}, fetcher as unknown as typeof fetch);
  expect(del.status).toBe(200);
  expect((fetcher.mock.calls[1] as unknown as [string, RequestInit])[1].method).toBe('DELETE');
});
