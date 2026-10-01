// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, createElement, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { z } from "zod";

// Session G, Part 2: a store instance that saves no longer parses its own write again when the change event (or the
// BroadcastChannel message) for it comes back, and instances on one page share one parse of the same bytes. Bytes
// written elsewhere (another tab) are always read again.
const reads = vi.hoisted(() => ({ count: 0 }));
vi.mock("./private-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./private-storage")>();
  return { ...actual, readPrivateStore: (...args: Parameters<typeof actual.readPrivateStore>) => { reads.count++; return actual.readPrivateStore(...args); } };
});
const { usePrivateStore } = await import("../components/use-private-store");
const KEY = "zigoals:settings:v1", schema = z.object({ name: z.string() }), empty = () => ({ name: "empty" });
type Store = ReturnType<typeof usePrivateStore<{ name: string }>>;
const stores: Store[] = [];
function Probe({ index }: { index: number }) { const store = usePrivateStore(KEY, schema, empty); useEffect(() => { stores[index] = store; }); return createElement("output", null, `${store.loaded}:${store.data.name}`); }
let root: Root, container: HTMLDivElement;
const settle = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); Object.defineProperty(navigator, "locks", { configurable: true, value: { request: (_key: string, write: () => unknown) => Promise.resolve().then(write) } }); localStorage.clear(); reads.count = 0; stores.length = 0; container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });

test("two instances share one parse, and a save is not parsed again by either of them", async () => {
  localStorage.setItem(KEY, JSON.stringify({ name: "first" }));
  await act(async () => root.render([createElement(Probe, { key: "a", index: 0 }), createElement(Probe, { key: "b", index: 1 })]));
  await settle();
  expect(container.textContent).toBe("true:firsttrue:first");
  expect(reads.count).toBe(1);

  await act(async () => { await stores[0]!.update(() => ({ name: "saved" })); });
  await settle();
  expect(container.textContent).toBe("true:savedtrue:saved");
  expect(reads.count).toBe(1);
});

test("bytes written elsewhere are always read again", async () => {
  localStorage.setItem(KEY, JSON.stringify({ name: "first" }));
  await act(async () => root.render(createElement(Probe, { index: 0 })));
  await settle();
  await act(async () => { await stores[0]!.update(() => ({ name: "saved" })); });
  await settle();
  const before = reads.count;
  localStorage.setItem(KEY, JSON.stringify({ name: "another tab" }));
  await act(async () => { window.dispatchEvent(new StorageEvent("storage", { key: null })); });
  await settle();
  expect(container.textContent).toBe("true:another tab");
  expect(reads.count).toBe(before + 1);
});
