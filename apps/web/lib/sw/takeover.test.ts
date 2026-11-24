// @vitest-environment jsdom
// Session AV lane 2 ([TIER 3] (PWA), owner follow-up 8, ADR-045 D-CI2016-J04): the page's requests wait while a new worker
// takes over, and "Reload" says how to finish by hand when the takeover has not happened in time.
import {afterEach, describe, expect, test, vi} from 'vitest';
import {holdPageRequests, startTakeover, TAKEOVER_NOTE, TAKEOVER_NOTE_MS} from './takeover';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('holdPageRequests', () => {
  test('a fetch made while held goes out only on release, as it was asked; one already under way is left alone', async () => {
    const calls: string[] = [];
    const fake = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => { calls.push(String(input)); return new Response('ok'); });
    vi.stubGlobal('fetch', fake);
    const before = window.fetch('/app/early');
    const release = holdPageRequests();
    const held = window.fetch('/app/settings?_rsc=1', {headers: {RSC: '1'}});
    await Promise.resolve();
    expect(calls).toEqual(['/app/early']);
    release();
    expect(await (await held).text()).toBe('ok');
    await before;
    expect(calls).toEqual(['/app/early', '/app/settings?_rsc=1']);
    expect(fake.mock.calls[1]![1]).toEqual({headers: {RSC: '1'}});
    expect(window.fetch).toBe(fake);
    release();
    expect(calls).toHaveLength(2);
  });
});

describe('startTakeover', () => {
  const container = () => { const target = new EventTarget(); return target as unknown as ServiceWorkerContainer; };
  const worker = () => ({postMessage: vi.fn()}) as unknown as ServiceWorker & {postMessage: ReturnType<typeof vi.fn>};

  test('the requests are held before the takeover message goes, and go on when the new worker controls the page', async () => {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => { calls.push(String(input)); return new Response(''); }));
    const sw = worker(), box = container(), done = vi.fn(), late = vi.fn();
    sw.postMessage.mockImplementation(() => { void window.fetch('/app/settings?_rsc=prefetch'); });
    startTakeover(sw, {done, late, container: box});
    expect(sw.postMessage).toHaveBeenCalledWith({type: 'zigoals:sw-reload'});
    await Promise.resolve();
    expect(calls).toEqual([]);
    box.dispatchEvent(new Event('controllerchange'));
    expect(done).toHaveBeenCalledTimes(1);
    expect(late).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(calls).toEqual(['/app/settings?_rsc=prefetch']);
  });

  test('no takeover in 5 s: "late" once, the requests go on, nothing reloads; a takeover after that changes nothing', () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn(async () => new Response('')));
    const box = container(), done = vi.fn(), late = vi.fn();
    startTakeover(worker(), {done, late, container: box});
    vi.advanceTimersByTime(TAKEOVER_NOTE_MS - 1);
    expect(late).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(late).toHaveBeenCalledTimes(1);
    box.dispatchEvent(new Event('controllerchange'));
    expect(done).not.toHaveBeenCalled();
    expect(TAKEOVER_NOTE).toBe('Almost there: close ZIGoals and open it again to finish the update.');
  });
});
