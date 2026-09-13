// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import Settings from "../app/app/settings/page";
const api = vi.hoisted(() => ({
  read: vi.fn(),
  state: {
    chain: "zig-test-2",
    owner: "zig1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    balance: "0",
    loaded: true,
  },
}));
vi.mock("./diagnostics", async (original) => ({
  ...(await original<typeof import("./diagnostics")>()),
  readDiagnostics: api.read,
}));
vi.mock("../components/goal-provider", () => ({ useGoals: () => api.state }));
let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  container?.remove();
  vi.clearAllMocks();
});
test("a previous account's pending diagnostics cannot update the new account panel", async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  let resolve!: (value: unknown) => void;
  api.read.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root!.render(createElement(Settings)));
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Check connection",
  )!;
  await act(async () => button.click());
  api.state.owner = "zig1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  await act(async () => root!.render(createElement(Settings)));
  await act(async () =>
    resolve({
      checkedAt: "OLD ACCOUNT RESULT",
      rpc: { ok: true, detail: "Old RPC" },
      rest: { ok: true, detail: "Old REST" },
    }),
  );
  expect(container.textContent).toContain("zig1bbbb…bbbbbb");
  expect(container.textContent).not.toContain("OLD ACCOUNT RESULT");
  expect(container.textContent).not.toContain(api.state.owner);
  expect(container.textContent).toContain("Not checked");
});
