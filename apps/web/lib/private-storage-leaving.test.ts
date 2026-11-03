// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import * as z from "zod";
import { updatePrivateStore } from "./private-storage";

// Session AK (journey 1 on the phone, after G4): a save that started before the page is left and still waits for the
// cross-tab lock is written on pagehide, once and in order; outside that moment every save still waits for the lock.
const schema = z.object({ schemaVersion: z.literal(1), kind: z.literal("test"), count: z.number().int().nonnegative() }).strict();
const empty = () => ({ schemaVersion: 1 as const, kind: "test" as const, count: 0 });
const key = "zigoals:habits:v1";
const count = () => JSON.parse(localStorage.getItem(key) ?? JSON.stringify(empty())).count as number;
/** A cross-tab lock granted only when the test says so (another tab holds it), one holder at a time, in order. */
function heldLock() {
  const queue: (() => void)[] = [];
  const request = vi.fn((_key: string, action: () => unknown) => new Promise((resolve, reject) => { queue.push(() => { Promise.resolve().then(action).then(resolve, reject); }); }));
  vi.stubGlobal("navigator", { ...navigator, locks: { request } });
  return { request, grantAll: async () => { while (queue.length) { queue.shift()!(); await new Promise(r => setTimeout(r, 0)); } } };
}
const leave = () => window.dispatchEvent(new PageTransitionEvent("pagehide"));
const back = () => window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
beforeEach(() => { localStorage.clear(); localStorage.setItem(key, JSON.stringify(empty())); });
afterEach(() => { back(); vi.unstubAllGlobals(); });

test("a save still waiting for the lock is written on pagehide, in that task, and is not applied again when the lock comes", async () => {
  const lock = heldLock(), change = vi.fn((d: ReturnType<typeof empty>) => ({ ...d, count: d.count + 1 }));
  const saving = updatePrivateStore(localStorage, key, schema, empty, change);
  await new Promise(r => setTimeout(r, 0));
  expect(lock.request).toHaveBeenCalledTimes(1);
  expect(change).not.toHaveBeenCalled();
  expect(count()).toBe(0);
  leave();
  expect(count()).toBe(1);
  await expect(saving).resolves.toEqual({ ...empty(), count: 1 });
  // Back from the back/forward cache, the lock comes after all: nothing is applied a second time.
  back(); await lock.grantAll();
  expect(change).toHaveBeenCalledTimes(1);
  expect(count()).toBe(1);
});

test("waiting saves run on pagehide in the order they were asked, and a save chained on one is written at once too", async () => {
  const lock = heldLock();
  const first = updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: d.count * 10 + 1 }));
  const chained = first.then(() => updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: d.count * 10 + 3 })));
  const second = updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: d.count * 10 + 2 }));
  leave();
  expect(count()).toBe(12);
  await Promise.all([first, second, chained]);
  expect(count()).toBe(123);
  expect(lock.request).toHaveBeenCalledTimes(2); // the chained save, asked while the page is left, did not wait for the lock
  back(); await lock.grantAll();
  expect(count()).toBe(123);
});

test("outside pagehide the cross-tab lock is kept: nothing is read or written before its grant, and again after pageshow", async () => {
  const lock = heldLock(), change = vi.fn((d: ReturnType<typeof empty>) => ({ ...d, count: d.count + 5 }));
  const saving = updatePrivateStore(localStorage, key, schema, empty, change);
  await new Promise(r => setTimeout(r, 0));
  expect(change).not.toHaveBeenCalled();
  expect(count()).toBe(0);
  await lock.grantAll();
  await expect(saving).resolves.toEqual({ ...empty(), count: 5 });
  // A save the lock already wrote is not written again on a later pagehide.
  leave(); back();
  expect(change).toHaveBeenCalledTimes(1);
  expect(count()).toBe(5);
  const later = updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: d.count + 1 }));
  await new Promise(r => setTimeout(r, 0));
  expect(count()).toBe(5);
  await lock.grantAll(); await later;
  expect(count()).toBe(6);
});

test("a refused save stays refused: an invalid change rejects on pagehide without a write; without Web Locks nothing is applied later", async () => {
  heldLock();
  const invalid = updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: -1 }));
  leave();
  await expect(invalid).rejects.toThrow();
  expect(count()).toBe(0);
  back();
  vi.stubGlobal("navigator", { ...navigator, locks: undefined });
  await expect(updatePrivateStore(localStorage, key, schema, empty, d => ({ ...d, count: 9 }))).rejects.toThrow("Safe cross-tab storage");
  leave();
  expect(count()).toBe(0);
});
