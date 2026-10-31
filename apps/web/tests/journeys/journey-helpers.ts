import {expect, test, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../lib/whats-new';

/**
 * Session AK F2 (full app testing): shared steps of the journey specs (tests/journeys/*.spec.ts). A journey uses the app as
 * a person would, over several simulated days (page.clock), with fictional records only. Every request to the app's own
 * /api routes answers from a fixture (503 unless a journey routes it), and every other host is either routed by the
 * journey or recorded as a stray request the journey fails on: no journey reaches the real network.
 */
export const ZONE = 'Europe/Brussels';
/** A moment in the journey's zone, as an instant: `at('2026-11-02', '09:00')` (Brussels is UTC+1 in November). */
export const at = (day: string, time = '09:00') => new Date(`${day}T${time}:00+01:00`);
/** The journeys run on the desktop project; one browser keeps CI time reasonable (journey 7 sets a phone width itself). */
export function desktopOnly() {
  test.beforeEach(({page: _page}, info) => { void _page; test.skip(info.project.name !== 'desktop', 'journeys run once, on the desktop project'); });
}
export const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
/** The app's own /api routes answer 503 unless a journey routes one (routes added later win). */
export const offlineApis = (page: Page) => page.route(url => url.pathname.startsWith('/api/') && ['127.0.0.1', 'localhost'].includes(url.hostname), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
/** Records every request to a host other than the app's own (data: and blob: aside); a journey asserts it stays as it expects. */
export function strayRequests(page: Page, allowed: (url: URL) => boolean = () => false) {
  const stray: string[] = [];
  page.on('request', r => { const u = new URL(r.url()); if (u.protocol.startsWith('http') && !['127.0.0.1', 'localhost'].includes(u.hostname) && !allowed(u)) stray.push(r.url()); });
  return stray;
}
/** Writes records on a same-origin page that runs no app code, before the app reads them. */
export async function seedRecords(page: Page, records: Record<string, unknown>, {clear = true, settings = 'balanced' as Parameters<typeof presetSettings>[0] | null} = {}) {
  await page.goto('/robots.txt');
  const values: Record<string, string> = {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...(settings ? {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings(settings), onboarded: true})} : {}),
  };
  for (const [k, v] of Object.entries(records)) values[k] = typeof v === 'string' ? v : JSON.stringify(v);
  await page.evaluate(({values, clear}) => { if (clear) { localStorage.clear(); sessionStorage.clear(); } for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {values, clear});
}
/** A device record, parsed (null when absent). */
export const stored = <T = any>(page: Page, key: string): Promise<T | null> => page.evaluate(k => { const raw = localStorage.getItem(k); return raw === null ? null : JSON.parse(raw); }, key); // eslint-disable-line @typescript-eslint/no-explicit-any
/** Today in the browser's own zone. */
export const browserToday = (page: Page) => page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
/** Moves the simulated clock to another moment and opens `path` fresh, as a person opening the app that day. */
export async function nextDay(page: Page, when: Date, path = '/app') {
  await page.clock.setSystemTime(when);
  await page.goto(path);
  await hydrated(page);
}
/** Every element that a person can operate inside `scope` has an accessible name (journey 11's screen-reader pass). */
export async function unnamedControls(page: Page, scope = 'main') {
  return page.locator(scope).evaluate(root => {
    const out: string[] = [];
    const named = (el: Element) => {
      const aria = el.getAttribute('aria-label')?.trim() || (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() ?? '').join(' ').trim();
      if (aria) return true;
      if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
        if (el instanceof HTMLInputElement && ['submit', 'button', 'reset'].includes(el.type)) return !!el.value.trim();
        if (el.labels && [...el.labels].some(l => l.textContent?.trim())) return true;
        return !!(el.getAttribute('title')?.trim() || (el as HTMLInputElement).placeholder?.trim());
      }
      return !!(el.textContent?.trim() || el.getAttribute('title')?.trim() || el.querySelector('img[alt]:not([alt=""]), svg[aria-label]'));
    };
    for (const el of root.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=switch], [role=checkbox], [role=tab], [role=menuitem]')) {
      const box = (el as HTMLElement).getBoundingClientRect(), style = getComputedStyle(el);
      if (!box.width || !box.height || style.visibility === 'hidden' || el.closest('[hidden], [aria-hidden="true"], [inert]')) continue;
      if (!named(el)) out.push(el.outerHTML.slice(0, 160));
    }
    return out;
  });
}
export {expect};
