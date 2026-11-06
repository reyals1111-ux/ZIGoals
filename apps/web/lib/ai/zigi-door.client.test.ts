// @vitest-environment jsdom
import {afterEach, expect, it, vi} from 'vitest';
import {ZIGI_OPEN_EVENT, openZigiPanel} from '../../components/zigi-door';

/**
 * CI17 (CI 1569, WebKit, ⌘/Ctrl+Shift+Z on Today): the request to open ZIGi's panel. With nothing private or open on the
 * screen it opens at once (it used to wait three frames, and a busy page drew them after its two-second limit); while a
 * dialog shows it waits for the screen to be calm, and gives up only after two seconds and at least twelve frames.
 */
let frames: FrameRequestCallback[] = [];
const runFrame = () => { const due = frames; frames = []; for (const f of due) f(performance.now()); };
const listen = () => { const seen = vi.fn(); window.addEventListener(ZIGI_OPEN_EVENT, seen); return seen; };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = ''; frames = []; });
const stubFrames = () => vi.stubGlobal('requestAnimationFrame', (f: FrameRequestCallback) => { frames.push(f); return frames.length; });

it('opens at once, in the same task, when nothing private or open shows', async () => {
  stubFrames();
  const seen = listen();
  const result = openZigiPanel();
  expect(seen).toHaveBeenCalledTimes(1);
  expect(frames).toHaveLength(0);
  await expect(result).resolves.toBe(true);
});

it('waits for an open dialog to close, then opens after three calm frames', async () => {
  stubFrames();
  document.body.innerHTML = '<dialog open class="apps-extras-sheet"></dialog>';
  const seen = listen();
  const result = openZigiPanel();
  runFrame(); runFrame();
  expect(seen).not.toHaveBeenCalled();
  document.body.innerHTML = '';
  runFrame(); runFrame();
  expect(seen).not.toHaveBeenCalled();
  runFrame();
  expect(seen).toHaveBeenCalledTimes(1);
  await expect(result).resolves.toBe(true);
});

it('a slow page (frames seconds apart) is not mistaken for a private form that stays', async () => {
  stubFrames();
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  document.body.innerHTML = '<dialog open></dialog>';
  const seen = listen();
  const result = openZigiPanel();
  now = 2500; runFrame(); // the first frame comes after the two seconds: still waiting
  document.body.innerHTML = '';
  now = 4000; runFrame(); now = 5000; runFrame(); now = 6000; runFrame();
  expect(seen).toHaveBeenCalledTimes(1);
  await expect(result).resolves.toBe(true);
});

it('gives up (false) when a private form or dialog stays for two seconds and twelve frames', async () => {
  stubFrames();
  let now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  document.body.innerHTML = '<dialog open></dialog>';
  const seen = listen();
  const result = openZigiPanel();
  for (let i = 0; i < 11; i++) { now += 300; runFrame(); }
  expect(frames).toHaveLength(1); // eleven frames: still waiting although the two seconds have passed
  now += 300; runFrame();
  expect(frames).toHaveLength(0);
  expect(seen).not.toHaveBeenCalled();
  await expect(result).resolves.toBe(false);
});

it('a focused password field keeps ZIGi out too', async () => {
  stubFrames();
  document.body.innerHTML = '<input type="password">';
  document.querySelector('input')!.focus();
  const seen = listen();
  void openZigiPanel();
  expect(seen).not.toHaveBeenCalled();
  expect(frames).toHaveLength(1);
});
