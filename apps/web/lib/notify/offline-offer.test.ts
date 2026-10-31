import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import {offerFor, takeOfferedRead} from './offline-offer';

// Session AK security review F5, F6: the back-online offers and the lock's refresh in NotifySync.
const COMPONENTS = join(__dirname, '..', '..', 'components');
const sync = readFileSync(join(COMPONENTS, 'notify', 'notify-sync.tsx'), 'utf8');

test('F6: an exchange read is offered with a one-time link only this tab knows; nothing reads by itself', () => {
  const offer = offerFor({kind: 'exchange-refresh', value: 'kraken'})!;
  expect(offer.message).toBe('You’re back online. Read Kraken now?');
  expect(offer.link.label).toBe('Read now');
  const href = new URL(offer.link.href, 'https://app.test');
  expect(href.pathname).toBe('/app/portfolio');
  const token = href.searchParams.get('read');
  expect(token).toMatch(/^[0-9a-f-]{36}$/);
  expect(takeOfferedRead('kraken')).toBeNull(); // a typed or shared ?read= reads nothing
  expect(takeOfferedRead(token)).toBe('kraken');
  expect(takeOfferedRead(token)).toBeNull(); // once
  expect(takeOfferedRead(null)).toBeNull();
  expect(offerFor({kind: 'exchange-refresh', value: 'not-an-exchange'})).toBeNull();
  expect(offerFor({kind: 'food-lookup', value: '4006381333931'})).toEqual({message: 'You’re back online. Look up barcode 4006381333931 now?', link: {href: '/app/health?barcode=4006381333931', label: 'Look it up'}});
});

test('F6: NotifySync offers each job as a toast and removes it only after; it never fires a read itself', () => {
  const online = sync.slice(sync.indexOf('const onOnline'), sync.indexOf('const onLock'));
  expect(online).not.toMatch(/dispatchEvent|exchange-refresh/);
  expect(online.indexOf('showToast(offer)')).toBeGreaterThan(-1);
  expect(online.indexOf('showToast(offer)')).toBeLessThan(online.indexOf('removeJob'));
});

test('F5: NotifySync refreshes the snapshot on the device lock’s own event', () => {
  const lock = readFileSync(join(COMPONENTS, 'device-lock.tsx'), 'utf8');
  const name = /const LOCK_EVENT = '([^']+)'/.exec(lock)?.[1];
  expect(name).toBeTruthy();
  expect(sync).toContain(`const LOCK_EVENT = '${name}'`);
  expect(sync).toMatch(/window\.addEventListener\(LOCK_EVENT, onLock\)/);
  expect(sync).toMatch(/window\.removeEventListener\(LOCK_EVENT, onLock\)/);
  expect(sync).toMatch(/const onLock = \(\) => \{ void refresh\(\); \}/);
});
