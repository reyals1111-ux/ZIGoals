import {expect, test} from 'vitest';
import {DETAILS_MAX, browserName, deviceDetails, feedbackHref, systemName} from './feedback';

// Session X Part 11: the feedback email's optional device details are coarse, shown in full and the person's to edit.
const UA = {
  chromeMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  edgeWin: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 Edg/148.0.0.0',
  safariIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1',
  safariMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15',
  chromeIphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/148.0.0.0 Mobile/15E148 Safari/604.1',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:151.0) Gecko/20100101 Firefox/151.0',
  samsungAndroid: 'Mozilla/5.0 (Linux; Android 15; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/140.0.0.0 Mobile Safari/537.36',
};

test('the browser by its own brand list first, else its user agent; major version only; "unknown" otherwise', () => {
  expect(browserName(UA.chromeMac, [{brand: 'Not)A;Brand', version: '99'}, {brand: 'Google Chrome', version: '148'}, {brand: 'Chromium', version: '148'}])).toBe('Chrome 148');
  expect(browserName(UA.edgeWin, [{brand: 'Microsoft Edge', version: '148'}, {brand: 'Chromium', version: '148'}, {brand: 'Not.A/Brand', version: '24'}])).toBe('Microsoft Edge 148');
  expect(browserName('', [{brand: 'Chromium', version: '148'}, {brand: 'Not_A Brand', version: '8'}])).toBe('Chromium 148');
  expect(browserName(UA.chromeMac)).toBe('Chrome 148');
  expect(browserName(UA.edgeWin)).toBe('Edge 148');
  expect(browserName(UA.safariIphone)).toBe('Safari 26');
  expect(browserName(UA.safariMac)).toBe('Safari 26');
  expect(browserName(UA.chromeIphone)).toBe('Chrome 148');
  expect(browserName(UA.firefoxLinux)).toBe('Firefox 151');
  expect(browserName(UA.samsungAndroid)).toBe('Samsung Internet 29');
  expect(browserName('curl/8')).toBe('unknown');
});

test('the system family only, never its build', () => {
  expect(systemName(UA.safariIphone)).toBe('iOS or iPadOS');
  expect(systemName(UA.samsungAndroid)).toBe('Android');
  expect(systemName(UA.chromeMac)).toBe('macOS');
  expect(systemName(UA.edgeWin)).toBe('Windows');
  expect(systemName(UA.firefoxLinux)).toBe('Linux');
  expect(systemName('Mozilla/5.0 (X11; CrOS x86_64 16000.0.0) Chrome/148.0.0.0')).toBe('ChromeOS');
  expect(systemName('', 'macOS')).toBe('macOS');
  expect(systemName('')).toBe('unknown');
});

test('the details block: six plain lines, no id, no version beyond the major one', () => {
  const details = deviceDetails({userAgent: UA.safariIphone, width: 390.4, height: 664, pixelRatio: 3, reducedMotion: true, motionOff: false, installed: true, timeZone: 'Europe/Brussels'});
  expect(details.split('\n')).toEqual([
    'Browser: Safari 26',
    'System: iOS or iPadOS',
    'Window: 390 × 664 px, pixel ratio 3',
    'Motion: follows the device; the device asks for reduced motion: yes',
    'Installed app: yes',
    'Time zone: Europe/Brussels',
  ]);
  expect(details).not.toMatch(/15E148|605\.1|26_0/);
  const other = deviceDetails({userAgent: UA.firefoxLinux, width: 1440, height: 900, pixelRatio: 1.25, reducedMotion: false, motionOff: true, installed: false});
  expect(other).toContain('Motion: Off in ZIGoals; the device asks for reduced motion: no');
  expect(other).toContain('Installed app: no, in a browser tab');
  expect(other).toContain('Time zone: unknown');
});

test('the mail link: the same template as before without details; the person\'s own block, trimmed and capped, with them', () => {
  const plain = feedbackHref('1.2.3 · abc1234', null);
  expect(plain.startsWith('mailto:contact@zigoals.app?subject=ZIGoals%20Alpha%20feedback&body=')).toBe(true);
  // Byte-for-byte the body Help sent before Session X.
  expect(decodeURIComponent(plain.split('&body=')[1])).toBe('What happened:\n\nWhat you expected:\n\nDevice and browser:\n\nApp version: 1.2.3 · abc1234\n\n(Please leave out codes, your recovery secret, and personal money or health details.)');
  expect(feedbackHref('x', '   ')).toBe(feedbackHref('x', null));
  const withDetails = decodeURIComponent(feedbackHref('x', '  Browser: Safari 26\nTime zone: edited by me \n').split('&body=')[1]);
  expect(withDetails).toContain('Device and browser:\nBrowser: Safari 26\nTime zone: edited by me\n\nApp version: x');
  const long = decodeURIComponent(feedbackHref('x', 'a'.repeat(DETAILS_MAX + 50)).split('&body=')[1]);
  expect(long).toContain('a'.repeat(DETAILS_MAX) + '\n\nApp version');
  expect(long).not.toContain('a'.repeat(DETAILS_MAX + 1));
  // Anything a person types stays inside the body: no extra header can be added to the mail link.
  const sneaky = feedbackHref('x', 'line&cc=someone@example.com\r\nbcc: other');
  expect(sneaky.split('&')).toHaveLength(2);
});
