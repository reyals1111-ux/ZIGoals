// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { newOperation, TransactionJournal } from "./transaction-journal";
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
import { applyLocal, initialLedger, LOCAL_OWNER } from "./local-ledger";

const api = vi.hoisted(() => ({
  connect: vi.fn(),
  quote: vi.fn(),
  execute: vi.fn(),
  readGoals: vi.fn(),
  readBalance: vi.fn(),
  reconcile: vi.fn(),
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
  reconcileTransactions: api.reconcile,
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
const privatePlan = {
  name: "Private trip",
  category: "Travel" as const,
  targetValue: "1200",
  currency: "ZIG" as const,
  targetDate: "2027-01-01",
  startingAmount: "0",
  monthlyContribution: "10",
  riskPreference: "Conservative" as const,
  liquidityPreference: "Anytime" as const,
  deadlineFlexible: false,
  notes: "",
};
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
      { onClick: () => void s.refresh() },
      "Refresh journal",
    ),
    createElement(
      "button",
      { onClick: () => void s.prepare({ kind: "create" }) },
      "Prepare transaction",
    ),
    createElement(
      "button",
      { onClick: () => void s.prepare({ kind: "create" }, privatePlan) },
      "Prepare private goal",
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
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}
function scope() {
  return JSON.parse(
    container.querySelector('[data-testid="scope"]')!.textContent!,
  );
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("indexedDB", new IDBFactory());
  Object.defineProperty(navigator, "locks", {
    configurable: true,
    value: {
      request: async (_key: string, callback: () => unknown) => callback(),
    },
  });
  api.reconcile.mockResolvedValue({ records: [], warnings: [] });
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

test("reconnect restores only its durable wallet history and keeps stale signatures honest", async () => {
  const journal = new TransactionJournal();
  await act(async () => {
    await journal.create(
      newOperation({
        chainId: "zig-test-2",
        wallet: ownerA,
        contract: "zig1contract",
        action: "create",
        amount: "0",
        denom: "azig",
      }),
    );
  });
  await click("Connect Keplr");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(container.textContent).toContain("No broadcast is recorded");
  expect(container.textContent).toContain(ownerA);
  api.connect.mockResolvedValue(ownerB);
  await act(async () => {
    window.dispatchEvent(new Event("keplr_keystorechange"));
  });
  await click("Connect Keplr");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
  });
  expect(container.textContent).not.toContain(ownerA);
  expect(container.textContent).not.toContain("No broadcast is recorded");
});

test("recovered receipt proof replaces a live uncertain outcome", async () => {
  const journal = new TransactionJournal();
  let record: ReturnType<typeof newOperation>;
  api.execute.mockImplementation(
    async (_wallet, _quote, _revision, update, operationId) => {
      record = {
        ...newOperation({
          chainId: "zig-test-2",
          wallet: ownerA,
          contract: "zig1contract",
          action: "create",
          amount: "0",
          denom: "azig",
        }),
        operationId,
      };
      await journal.create(record);
      await journal.transition(operationId, {
        state: "BROADCASTING",
        hash: "A".repeat(64),
      });
      return runTransaction(
        {
          assertFresh: async () => {},
          sign: async () => new Uint8Array([1]),
          broadcast: async () => "A".repeat(64),
          confirm: async () => {
            throw Error("RPC timeout");
          },
        },
        update,
      );
    },
  );
  await click("Connect Keplr");
  await click("Prepare transaction");
  await click("Approve in Keplr");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  expect(
    container.querySelector('[aria-label="Testnet transaction outcomes"]')
      ?.textContent,
  ).toContain("Confirmation is uncertain");
  api.reconcile.mockImplementation(async () => ({
    records: [
      await journal.transition(record.operationId, {
        state: "CONFIRMED",
        height: 12,
        code: 0,
      }),
    ],
    warnings: [],
  }));
  await click("Refresh journal");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  const result = container.querySelector(
    '[aria-label="Testnet transaction outcomes"]',
  )?.textContent;
  expect(result).toContain("Confirmed on testnet at block 12");
  expect(result).not.toContain("Confirmation is uncertain");
});

test.each(["available", "unavailable"])(
  "damaged history survives receipt lookup failure and resets warnings for a new %s scope",
  async (nextStorage) => {
    const journal = new TransactionJournal();
    const operation = newOperation({
      chainId: "zig-test-2",
      wallet: ownerA,
      contract: "zig1contract",
      action: "create",
      amount: "0",
      denom: "azig",
    });
    const damaged = {
      operationId: "future-record",
      version: 999,
      original: "preserve original content",
    };
    await act(async () => {
      await journal.create(operation);
      await journal.transition(operation.operationId, {
        state: "BROADCASTING",
        hash: "A".repeat(64),
      });
      await journal.transition(operation.operationId, {
        state: "UNKNOWN_AFTER_BROADCAST",
      });
      await journal.create(
        newOperation({
          chainId: "zig-test-2",
          wallet: ownerB,
          contract: "zig1contract",
          action: "create",
          amount: "0",
          denom: "azig",
        }),
      );
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("zigoals:transaction-journal", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction("operations", "readwrite");
        transaction.objectStore("operations").put(damaged);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    });
    api.reconcile.mockRejectedValueOnce(Error("Alice receipt lookup failed"));
    await click("Connect Keplr");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40));
    });
    expect(container.textContent).toContain("Unreadable or unsupported");
    expect(container.textContent).toContain("Alice receipt lookup failed");
    expect(container.textContent).toContain("Confirmation is uncertain");
    expect(container.textContent).toContain("A".repeat(64));
    const load =
      nextStorage === "unavailable"
        ? vi
            .spyOn(TransactionJournal.prototype, "load")
            .mockRejectedValue(Error("Bob journal unavailable"))
        : undefined;
    try {
      api.connect.mockResolvedValue(ownerB);
      await act(async () => {
        window.dispatchEvent(new Event("keplr_keystorechange"));
      });
      await click("Connect Keplr");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 40));
      });
      expect(container.textContent).not.toContain(
        "Alice receipt lookup failed",
      );
      if (nextStorage === "available")
        expect(container.textContent).toContain("Unreadable or unsupported");
      else {
        expect(container.textContent).toContain("Bob journal unavailable");
        expect(container.textContent).not.toContain(
          "Unreadable or unsupported",
        );
      }
    } finally {
      load?.mockRestore();
    }
    const retained = await journal.load("zig-test-2", ownerA);
    expect(retained.records).toMatchObject([
      {
        operationId: operation.operationId,
        state: "UNKNOWN_AFTER_BROADCAST",
        hash: "A".repeat(64),
      },
    ]);
    expect(retained.warnings.join(" ")).toContain("Unreadable or unsupported");
    expect(api.execute).not.toHaveBeenCalled();
  },
);

test("scoped external local writes reload balances and cancel a reviewed simulation", async () => {
  await click("Prepare transaction");
  expect(container.textContent).toContain("Confirm simulation");
  const next = applyLocal(
    initialLedger(),
    { kind: "create" },
    new Date().toISOString(),
  );
  await act(async () => {
    localStorage.setItem("zigoals:local-ledger:v1", JSON.stringify(next));
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "zigoals:local-ledger:v1",
        storageArea: localStorage,
      }),
    );
  });
  expect(scope().goals).toEqual(["1"]);
  expect(container.textContent).not.toContain("Confirm simulation");
});
test("confirmation checks stored revision even before another tab's event arrives", async () => {
  await click("Prepare transaction");
  const next = applyLocal(
    initialLedger(),
    { kind: "create" },
    new Date().toISOString(),
  );
  const raw = JSON.stringify(next);
  localStorage.setItem("zigoals:local-ledger:v1", raw);
  await click("Confirm simulation");
  expect(localStorage.getItem("zigoals:local-ledger:v1")).toBe(raw);
  expect(container.textContent).toMatch(/changed.*review/i);
});
test("unrelated storage scopes leave the active review intact", async () => {
  await click("Prepare transaction");
  await act(async () =>
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "zigoals:metadata:v1:other:wallet",
        storageArea: localStorage,
      }),
    ),
  );
  expect(container.textContent).toContain("Confirm simulation");
});
test("external same-scope journal intent cancels testnet review before signing", async () => {
  await click("Connect Keplr");
  await click("Prepare transaction");
  expect(container.textContent).toContain("Approve in Keplr");
  const channel = new BroadcastChannel("zigoals:transaction-journal");
  await act(async () => {
    channel.postMessage({
      chainId: "zig-test-2",
      wallet: ownerA,
      contract: "zig1contract",
    });
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  channel.close();
  expect(container.textContent).not.toContain("Approve in Keplr");
  expect(api.execute).not.toHaveBeenCalled();
});

test("private plan review describes a future save and storage failure does not claim success", async () => {
  await click("Prepare private goal");
  expect(container.textContent).toContain(
    "will be saved on this device after confirmation",
  );
  expect(
    localStorage.getItem(
      "zigoals:metadata:v1:local-simulation:local-demo-user",
    ),
  ).toBeNull();
  const original = Storage.prototype.setItem;
  const storage = vi
    .spyOn(Storage.prototype, "setItem")
    .mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith("zigoals:metadata:")) throw Error("Quota exceeded");
      return original.call(this, key, value);
    });
  try {
    await click("Confirm simulation");
    expect(scope().goals).toEqual(["1"]);
    expect(container.textContent).toContain("private plan could not be saved");
    expect(
      localStorage.getItem(
        "zigoals:metadata:v1:local-simulation:local-demo-user",
      ),
    ).toBeNull();
  } finally {
    storage.mockRestore();
  }
});
test("durable journal revisions stop signing even when the external event was missed", async () => {
  await click("Connect Keplr");
  await click("Prepare transaction");
  await act(async () => {
    await new TransactionJournal().create(
      newOperation({
        chainId: "zig-test-2",
        wallet: ownerA,
        contract: "zig1contract",
        action: "create",
        amount: "0",
        denom: "azig",
      }),
    );
  });
  // Same-document fixture writes deliberately omit the external notification.
  await click("Approve in Keplr");
  expect(container.textContent).toMatch(/history changed.*review again/i);
  expect(api.execute).not.toHaveBeenCalled();
});
