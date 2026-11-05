// @vitest-environment jsdom
import {act, createElement} from 'react';
import {hydrateRoot} from 'react-dom/client';
import {renderToString} from 'react-dom/server';
import {afterEach, expect, it, vi} from 'vitest';
import {useDayNow, useLocalToday} from '../components/use-local-today';

(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; delete document.documentElement.dataset.serverDay; delete document.documentElement.dataset.appHydrated; });

function Day() { const today = useLocalToday(), now = useDayNow(); return createElement('p', null, `${today} ${new Date(now).toISOString().slice(0, 10)}`); }

// CI9 (React #418 on Ecosystem): a Suspense boundary (loading.tsx) hydrates after the shell has set data-app-hydrated.
// The first render must still be the server's day, then the browser's own day.
it('a late-hydrating component renders the server day first, then the browser day, without a mismatch', async () => {
  vi.useFakeTimers({now: new Date('2026-11-05T16:00:00Z'), toFake: ['Date']});
  const html = renderToString(createElement(Day));
  expect(html).toContain('2026-11-05 2026-11-05');
  vi.setSystemTime(new Date('2026-09-15T12:00:00Z'));
  document.documentElement.dataset.serverDay = '2026-11-05';
  document.documentElement.dataset.appHydrated = '';
  const host = document.createElement('div'); host.innerHTML = html; document.body.append(host);
  const errors: unknown[] = [];
  await act(async () => { hydrateRoot(host, createElement(Day), {onRecoverableError: e => errors.push(e)}); });
  expect(errors).toEqual([]);
  expect(host.textContent).toBe('2026-09-15 2026-09-15');
});
it('a fresh browser render starts from the browser day at once', async () => {
  vi.useFakeTimers({now: new Date('2026-09-15T12:00:00Z'), toFake: ['Date']});
  document.documentElement.dataset.serverDay = '2026-11-05';
  const {createRoot} = await import('react-dom/client');
  const host = document.createElement('div'); document.body.append(host);
  await act(async () => { createRoot(host).render(createElement(Day)); });
  expect(host.textContent).toBe('2026-09-15 2026-09-15');
});
