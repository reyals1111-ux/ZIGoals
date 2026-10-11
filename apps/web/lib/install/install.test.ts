import {expect, test, vi} from 'vitest';
import {installContext} from './platform';
import {readKeep, requestKeep} from './persist';

const media = (matching: string[]) => (query: string) => ({matches: matching.includes(query)});

test('an installed app is recognised from Apple\'s own flag or the display mode', () => {
  expect(installContext({navigator: {standalone: true}, matchMedia: media([])})).toBe('installed');
  expect(installContext({navigator: {}, matchMedia: media(['(display-mode: standalone)'])})).toBe('installed');
  // An installed iPhone app reports fullscreen; that counts only where Apple's flag exists.
  expect(installContext({navigator: {standalone: false}, matchMedia: media(['(display-mode: fullscreen)'])})).toBe('installed');
  expect(installContext({navigator: {}, matchMedia: media(['(display-mode: fullscreen)'])})).toBe('other');
});

test('an Apple browser that can add to the Home Screen is told apart from every other browser', () => {
  expect(installContext({navigator: {standalone: false}, matchMedia: media([])})).toBe('apple-browser');
  expect(installContext({navigator: {standalone: undefined}, matchMedia: media([])})).toBe('apple-browser');
  expect(installContext({navigator: {}, matchMedia: media([])})).toBe('other');
});

test('missing or failing features never break detection', () => {
  expect(installContext({})).toBe('other');
  expect(installContext({navigator: null, matchMedia: null})).toBe('other');
  expect(installContext({navigator: {standalone: false}, matchMedia: () => { throw Error('unsupported'); }})).toBe('apple-browser');
});

test('reading the state asks for nothing', async () => {
  const persist = vi.fn(async () => true);
  expect(await readKeep({persist, persisted: async () => true})).toBe('kept');
  expect(await readKeep({persist, persisted: async () => false})).toBe('not-kept');
  expect(await readKeep({persist})).toBe('unknown');
  expect(await readKeep({persist, persisted: async () => { throw Error('denied'); }})).toBe('unknown');
  expect(await readKeep({})).toBe('unsupported');
  expect(await readKeep(null)).toBe('unsupported');
  expect(persist).not.toHaveBeenCalled();
});

test('the request reports the browser\'s honest answer', async () => {
  expect(await requestKeep({persist: async () => true})).toBe('kept');
  expect(await requestKeep({persist: async () => false})).toBe('not-kept');
  expect(await requestKeep({persist: async () => { throw Error('failed'); }})).toBe('error');
  expect(await requestKeep({persisted: async () => false})).toBe('unsupported');
  expect(await requestKeep(undefined)).toBe('unsupported');
});
