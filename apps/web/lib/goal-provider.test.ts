// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { Goal } from "@zigoals/shared-types/contract";
import { GoalProvider, useGoals } from "../components/goal-provider";
import { Shell } from "../components/shell";
import {
  runTransaction,
  type Confirmed,
  type TransactionUpdate,
} from "./transaction";
import { LOCAL_OWNER } from "./local-ledger";

const api = vi.hoisted(() => ({
  connect: vi.fn(),
  quote: vi.fn(),
  execute: vi.fn(),
  readGoals: vi.fn(),
  readBalance: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: api.push }),
  usePathname: () => "/app",
}));
vi.mock("./wallet", () => ({
  connectKeplr: api.connect,
  quoteExecute: api.quote,
  executeQuote: api.execute,
  readGoals: api.readGoals,
  readBalance: api.readBalance,
  CONTRACT_ADDRESS: "zig1contract",
}));
const ownerA = "zig1originalwallet";
const ownerB = "zig1newwallet";
let root: Root;
let container: HTMLDivElement;
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function goal(owner: string, id: string): Goal {
  return {
    id,
    owner,
    base_denom: "azig",
    strategy_id: "idle",
    created_at: "2026-09-13T00:00:00.000Z",
    total_deposited: "0",
    total_withdrawn: "0",
    position_units: "0",
    status: "active",
    metadata_commitment: null,
  };
}
function Controls() {
  const s = useGoals();
  return createElement(
    "div",
    null,
    createElement(
      "output",
      { "data-testid": "scope" },
      JSON.stringify({
        mode: s.mode,
        owner: s.owner,
        balance: s.balance,
        goals: s.goals.map((g) => g.id),
        activity: s.activity,
        status: s.status,
      }),
    ),
    createElement(
      "button",
      { onClick: () => void s.prepare({ kind: "create" }) },
      "Prepare transaction",
    ),
  );
}
async function click(text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === text,
  );
  expect(button, `button ${text}`).toBeDefined();
  await act(async () => {
    button!.click();
  });
}
function scope() {
  return JSON.parse(
    container.querySelector('[data-testid="scope"]')!.textContent!,
  );
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  window.localStorage.clear();
  window.keplr = {} as NonNullable<Window["keplr"]>;
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  api.connect.mockResolvedValue(ownerA);
  api.readBalance.mockImplementation(async (owner: string) =>
    owner === ownerA ? "2000000000000000000" : "6000000000000000000",
  );
  api.readGoals.mockImplementation(async (owner: string) => [
    goal(owner, owner === ownerA ? "7" : "8"),
  ]);
  api.quote.mockResolvedValue({
    feeAmount: "325000000000000",
    safeMax: "1999675000000000000",
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(
        GoalProvider,
        null,
        createElement(Shell, null, createElement(Controls)),
      ),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  delete window.keplr;
  vi.unstubAllGlobals();
});

test("late connection status cannot disable reconnect after returning to local mode", async () => {
  const network = deferred<void>();
  api.connect.mockImplementation(
    async (
      _wallet: unknown,
      adding: () => void,
      assertCurrent?: () => void,
    ) => {
      await network.promise;
      // A late status callback is harmless even if a wallet adapter emits one.
      adding();
      assertCurrent?.();
      return ownerA;
    },
  );
  await click("Connect Keplr");
  await click("Local demo");
  await act(async () => network.resolve());
  expect(scope()).toMatchObject({ mode: "local", owner: LOCAL_OWNER });
  const button = [...container.querySelectorAll("button")].find(
    (b) => b.textContent === "Connect Keplr",
  );
  expect(button).toBeDefined();
  expect(button!.disabled).toBe(false);
});

test.each([
  ["success", "Confirmed on testnet at block 12."],
  ["chain failure", "The chain rejected this action."],
  ["uncertain", "Confirmation is uncertain. Funds may have moved."],
] as const)(
  "account changes preserve a scoped %s outcome without restoring old balances",
  async (result, notice) => {
    const confirmed = deferred<Confirmed>();
    const reachedConfirmation = deferred<void>();
    api.execute.mockImplementation(
      async (
        _wallet: unknown,
        _quote: unknown,
        _revision: unknown,
        update: TransactionUpdate,
      ) =>
        runTransaction(
          {
            assertFresh: async () => {},
            sign: async () => new Uint8Array([1]),
            broadcast: async () => "ORIGINALHASH",
            confirm: async () => {
              reachedConfirmation.resolve();
              const tx = await confirmed.promise;
              if (result === "uncertain") throw Error("RPC timeout");
              return tx;
            },
          },
          update,
        ),
    );
    await click("Connect Keplr");
    await click("Prepare transaction");
    await click("Approve in Keplr");
    await reachedConfirmation.promise;
    await act(async () =>
      window.dispatchEvent(new Event("keplr_keystorechange")),
    );
    expect(scope()).toMatchObject({ owner: "", balance: "0", goals: [] });
    expect(container.textContent).toContain("ORIGINALHASH");
    await act(async () =>
      confirmed.resolve({
        hash: "ORIGINALHASH",
        height: 12,
        code: result === "chain failure" ? 5 : 0,
        events: [],
      }),
    );
    expect(container.textContent).toContain(notice);
    const outcome = container.querySelector(
      '[aria-label="Testnet transaction outcomes"]',
    );
    expect(outcome?.textContent).toContain(ownerA);
    expect(outcome?.textContent).toContain("zig-test-2");
    expect(outcome?.textContent).toContain("ORIGINALHASH");
    expect(scope()).toMatchObject({
      owner: "",
      balance: "0",
      goals: [],
      activity: [],
    });
    expect(api.push).not.toHaveBeenCalled();
    api.connect.mockResolvedValue(ownerB);
    await click("Connect Keplr");
    expect(scope()).toMatchObject({
      owner: ownerB,
      balance: "6000000000000000000",
      goals: ["8"],
      activity: [],
    });
    expect(outcome?.textContent).toContain(ownerA);
    expect(outcome?.textContent).toContain(notice);
  },
);
