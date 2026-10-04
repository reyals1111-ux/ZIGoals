import {expect, test} from 'vitest';
import {deviceZone, pushSupport} from './support';

// ADR-010 "support.ts": feature detection only.
const chrome = {navigator: {userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/141', serviceWorker: {}}, PushManager: {}, Notification: {}, matchMedia: () => ({matches: false})};
test('a desktop browser with service workers, PushManager and Notification is available', () => { expect(pushSupport(chrome)).toBe('available'); });
test('a browser without one of the three is unsupported; no window is unsupported', () => {
  expect(pushSupport({...chrome, PushManager: undefined})).toBe('unsupported');
  expect(pushSupport({...chrome, Notification: undefined})).toBe('unsupported');
  expect(pushSupport({...chrome, navigator: {userAgent: chrome.navigator.userAgent}})).toBe('unsupported');
  expect(pushSupport(undefined)).toBe('unsupported');
});
test('an iPhone or iPad in a browser tab needs the Home Screen app first; the installed app is available', () => {
  const iphone = {navigator: {userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605.1.15', serviceWorker: {}}, PushManager: {}, Notification: {}, matchMedia: () => ({matches: false})};
  expect(pushSupport(iphone)).toBe('needs-install');
  expect(pushSupport({...iphone, navigator: {...iphone.navigator, standalone: true}})).toBe('available');
  expect(pushSupport({...iphone, matchMedia: () => ({matches: true})})).toBe('available');
  const ipad = {...iphone, navigator: {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5, serviceWorker: {}}};
  expect(pushSupport(ipad)).toBe('needs-install');
  // The installed iPhone app without the push objects (older iOS) stays unsupported, not "install first".
  expect(pushSupport({...iphone, navigator: {...iphone.navigator, standalone: true}, PushManager: undefined})).toBe('unsupported');
});
test('the device zone is an IANA name or UTC', () => { expect(deviceZone()).toMatch(/^[A-Za-z0-9_+\-/]+$/); });
