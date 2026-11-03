import {expect, test} from 'vitest';
import {catchInstallPrompt, installState, promptInstall, subscribeInstall} from './prompt-store';

// Session AK Part 3: the browser's install offer is kept for Settings and Help; one stable snapshot per change.
test('the offer is caught once, shown, used once; the snapshot is stable between changes', async () => {
  const target = new EventTarget() as unknown as Window, seen: number[] = [];
  const stop = catchInstallPrompt(target), unsubscribe = subscribeInstall(() => seen.push(1));
  expect(installState()).toBe(installState());
  expect(installState().available).toBe(false);
  const event = Object.assign(new Event('beforeinstallprompt', {cancelable: true}), {prompt: async () => {}, userChoice: Promise.resolve({outcome: 'accepted' as const})});
  target.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(installState().available).toBe(true); expect(installState()).toBe(installState());
  expect(await promptInstall()).toBe('accepted');
  expect(installState().available).toBe(false);
  expect(await promptInstall()).toBe('unavailable');
  target.dispatchEvent(new Event('appinstalled'));
  expect(installState().installed).toBe(true);
  expect(seen.length).toBeGreaterThanOrEqual(3);
  unsubscribe(); stop();
});
