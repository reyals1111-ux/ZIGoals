import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { TxBody, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { TransactionJournal } from "./transaction-journal";
import { signedTransactionHash } from "./receipt-reconciliation";
import { toBech32 } from "@cosmjs/encoding";
import { TESTNET } from "@zigoals/chain-config";
import type { Keplr } from "./wallet";
import { deployedFixture } from "../../../packages/shared-types/src/deployment.fixture";
vi.mock("./deployment-config", () => ({
  deployedManifest: deployedFixture(),
  requireConfiguredDeployment: () => deployedFixture(),
}));

const clients = vi.hoisted(() => ({
  read: vi.fn(),
  signing: vi.fn(),
}));
vi.mock("@cosmjs/cosmwasm-stargate", () => ({
  CosmWasmClient: { connect: clients.read },
  SigningCosmWasmClient: { connectWithSigner: clients.signing },
}));
const owner = toBech32("zig", new Uint8Array(20).fill(1));
const contract = toBech32("zig", new Uint8Array(32).fill(2));
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function wallet() {
  const prompts: string[] = [];
  const keplr: Keplr = {
    experimentalSuggestChain: async () => {
      prompts.push("suggest");
    },
    enable: async () => {
      prompts.push("enable");
    },
    getKey: async () => {
      prompts.push("key");
      return { bech32Address: owner };
    },
    getOfflineSignerAuto: async () => ({
      getAccounts: async () => [
        { address: owner, algo: "secp256k1", pubkey: new Uint8Array(33) },
      ],
      signDirect: async () => {
        throw Error("unused");
      },
    }),
  };
  return { keplr, prompts };
}
function networkResponse(url: string) {
  const data = url.includes("node_info")
    ? {
        default_node_info: { network: "zig-test-2" },
        application_version: { version: "v5.0.0-patch-1" },
      }
    : url.includes("staking")
      ? { params: { bond_denom: "azig" } }
      : url.includes("denoms_metadata")
        ? {
            metadata: {
              base: "azig",
              display: "ZIG",
              denom_units: [{ denom: "ZIG", exponent: 18 }],
            },
          }
        : { balance: { denom: "azig", amount: "2000000000000000000" } };
  return new Response(JSON.stringify(data), { status: 200 });
}
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubEnv("NEXT_PUBLIC_GOAL_MANAGER_ADDRESS", contract);
  vi.stubEnv("NEXT_PUBLIC_GOAL_MANAGER_CODE_ID", "7");
  vi.stubGlobal("fetch", async (url: string) => networkResponse(url));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("switching scope during network verification never opens a later wallet prompt", async () => {
  const network = deferred<void>();
  vi.stubGlobal("fetch", async (url: string) => {
    await network.promise;
    return networkResponse(url);
  });
  const { connectKeplr } = await import("./wallet");
  const { keplr, prompts } = wallet();
  let current = true;
  let adding = false;
  const connection = connectKeplr(
    keplr,
    () => {
      adding = true;
    },
    () => {
      if (!current) throw Error("Connection cancelled");
    },
  );
  current = false;
  network.resolve();
  await expect(connection).rejects.toThrow("Connection cancelled");
  expect(prompts).toEqual([]);
  expect(adding).toBe(false);
});

test.each(["suggest", "enable", "key"] as const)(
  "changing scope during %s stops the next wallet stage",
  async (stage) => {
    const paused = deferred<void>();
    const entered = deferred<void>();
    const { connectKeplr } = await import("./wallet");
    const { keplr, prompts } = wallet();
    const wait = async () => {
      prompts.push(stage);
      entered.resolve();
      await paused.promise;
    };
    if (stage === "suggest") keplr.experimentalSuggestChain = wait;
    else if (stage === "enable") keplr.enable = wait;
    else
      keplr.getKey = async () => {
        await wait();
        return { bech32Address: owner };
      };
    let current = true;
    const connection = connectKeplr(
      keplr,
      () => {},
      () => {
        if (!current) throw Error("Connection cancelled");
      },
    );
    await entered.promise;
    current = false;
    paused.resolve();
    await expect(connection).rejects.toThrow("Connection cancelled");
    expect(prompts).toEqual(
      stage === "suggest"
        ? ["suggest"]
        : stage === "enable"
          ? ["suggest", "enable"]
          : ["suggest", "enable", "key"],
    );
  },
);

test("network verification and Keplr approval return the actual account", async () => {
  const { connectKeplr } = await import("./wallet");
  const { keplr, prompts } = wallet();
  await expect(
    connectKeplr(
      keplr,
      () => {},
      () => {},
    ),
  ).resolves.toBe(owner);
  expect(prompts).toEqual(["suggest", "enable", "key"]);
});

test("wallet rejection stops before enabling or reading its account", async () => {
  const { connectKeplr } = await import("./wallet");
  const { keplr, prompts } = wallet();
  keplr.experimentalSuggestChain = async () => {
    throw Error("Request rejected");
  };
  await expect(
    connectKeplr(
      keplr,
      () => {},
      () => {},
    ),
  ).rejects.toThrow("Request rejected");
  expect(prompts).toEqual([]);
});

function readClient(overrides = {}) {
  return {
    getChainId: async () => "zig-test-2",
    getContract: async () => ({ codeId: 7, admin: undefined, creator: owner }),
    getCodeDetails: async () => ({ checksum: "ab".repeat(32) }),
    queryContractSmart: async (_: string, query: object) =>
      "config" in query
        ? { native_denom: "azig", admin: null }
        : { contract: "crates.io:zigoals-goal-manager", version: "0.1.0" },
    disconnect: vi.fn(),
    ...overrides,
  };
}
test.each([
  [
    "creator",
    { getContract: async () => ({ codeId: 7, creator: contract }) },
    "immutable code manifest",
  ],
  [
    "code checksum",
    { getCodeDetails: async () => ({ checksum: "cd".repeat(32) }) },
    "checksum mismatch",
  ],
  [
    "missing checksum",
    { getCodeDetails: async () => ({}) },
    "checksum mismatch",
  ],
  [
    "pause admin",
    {
      queryContractSmart: async () => ({ native_denom: "azig", admin: owner }),
    },
    "version or denomination mismatch",
  ],
  [
    "RPC network",
    { getChainId: async () => "zig-mainnet" },
    "Wrong RPC network",
  ],
  [
    "code ID",
    { getContract: async () => ({ codeId: 8 }) },
    "immutable code manifest",
  ],
  [
    "admin",
    { getContract: async () => ({ codeId: 7, admin: owner }) },
    "immutable code manifest",
  ],
  [
    "denomination",
    { queryContractSmart: async () => ({ native_denom: "uzig" }) },
    "version or denomination mismatch",
  ],
  [
    "version",
    {
      queryContractSmart: async (_: string, query: object) =>
        "config" in query
          ? { native_denom: "azig", admin: null }
          : { contract: "crates.io:zigoals-goal-manager", version: "99.0.0" },
    },
    "version or denomination mismatch",
  ],
] as const)(
  "%s mismatch prevents fee simulation",
  async (_, overrides, error) => {
    const read = readClient(overrides);
    clients.read.mockResolvedValue(read);
    const { quoteExecute } = await import("./wallet");
    await expect(
      quoteExecute(wallet().keplr, owner, 1, { create_goal: {} }),
    ).rejects.toThrow(error);
    expect(clients.signing).not.toHaveBeenCalled();
    expect(read.disconnect).toHaveBeenCalledOnce();
  },
);

test("an unaffordable deposit reports its exact fee and available amount", async () => {
  clients.read.mockResolvedValue(readClient());
  const signer = {
    getChainId: async () => TESTNET.chainId,
    simulate: async () => 100000,
    disconnect: vi.fn(),
  };
  clients.signing.mockResolvedValue(signer);
  const { quoteExecute } = await import("./wallet");
  await expect(
    quoteExecute(
      wallet().keplr,
      owner,
      1,
      { deposit: { goal_id: "1" } },
      "2000000000000000000",
    ),
  ).rejects.toThrow(
    "Estimated network fee: 0.000325 ZIG. Available after fee reserve: 1.999675 ZIG.",
  );
  expect(signer.disconnect).toHaveBeenCalledOnce();
});

test.each([
  ["prefix", toBech32("cosmos", new Uint8Array(20).fill(1))],
  ["checksum", owner.slice(0, -1) + "q"],
  ["length", toBech32("zig", new Uint8Array(80).fill(1), 200)],
])("connection rejects an invalid account %s", async (_, address) => {
  const { connectKeplr } = await import("./wallet");
  const { keplr } = wallet();
  keplr.getKey = async () => ({ bech32Address: address });
  await expect(
    connectKeplr(
      keplr,
      () => {},
      () => {},
    ),
  ).rejects.toThrow();
});

test("account change during the final RPC freshness read prevents broadcast", async () => {
  clients.read.mockResolvedValue(readClient());
  const finalCheck = deferred<void>();
  const reachedFinalCheck = deferred<void>();
  let revision = 1;
  let checks = 0;
  const signing = {
    getChainId: async () => {
      if (++checks === 4) {
        reachedFinalCheck.resolve();
        await finalCheck.promise;
      }
      return "zig-test-2";
    },
    simulate: async () => 100000,
    sign: async () => ({
      bodyBytes: new Uint8Array(),
      authInfoBytes: new Uint8Array(),
      signatures: [],
    }),
    broadcastTxSync: vi.fn(async () => "HASH"),
    getTx: async () => ({ height: 12, code: 0, events: [] }),
    disconnect: vi.fn(),
  };
  clients.signing.mockResolvedValue(signing);
  const { quoteExecute, executeQuote } = await import("./wallet");
  const keplr = wallet().keplr;
  const quote = await quoteExecute(keplr, owner, revision, { create_goal: {} });
  const execution = executeQuote(
    keplr,
    quote,
    () => revision,
    () => {},
  );
  await reachedFinalCheck.promise;
  revision = 2;
  finalCheck.resolve();
  await expect(execution).rejects.toThrow("Wallet or fee estimate changed");
  expect(signing.broadcastTxSync).not.toHaveBeenCalled();
});

test.each([
  "lost transport",
  "success",
  "bad receipt",
  "blocked storage",
  "altered signed action",
])("durable wallet execution: %s", async (scenario) => {
  clients.read.mockResolvedValue(readClient());
  let signedBytes = new Uint8Array();
  let sends = 0;
  const signing = {
    getChainId: async () => TESTNET.chainId,
    simulate: async () => 100000,
    sign: async (
      _: string,
      messages: {
        typeUrl: string;
        value: Parameters<typeof MsgExecuteContract.encode>[0];
      }[],
    ) => {
      const raw = TxRaw.fromPartial({
        bodyBytes: TxBody.encode(
          TxBody.fromPartial({
            messages: messages.map((message) => ({
              typeUrl: message.typeUrl,
              value: MsgExecuteContract.encode(
                scenario === "altered signed action"
                  ? { ...message.value, contract: "zig1othercontract" }
                  : message.value,
              ).finish(),
            })),
          }),
        ).finish(),
        signatures: [new Uint8Array([1])],
      });
      signedBytes = new Uint8Array(TxRaw.encode(raw).finish());
      return raw;
    },
    broadcastTxSync: async () => {
      sends++;
      if (scenario === "lost transport") throw Error("Lost transport");
      return signedTransactionHash(signedBytes);
    },
    getTx: async () => ({
      hash: await signedTransactionHash(signedBytes),
      tx: scenario === "bad receipt" ? new Uint8Array([2]) : signedBytes,
      height: 12,
      code: 0,
      events: [],
    }),
    disconnect: () => {},
  };
  clients.signing.mockResolvedValue(signing);
  const { quoteExecute, executeQuote } = await import("./wallet");
  const keplr = wallet().keplr;
  const quote = await quoteExecute(keplr, owner, 1, { create_goal: {} });
  if (scenario === "blocked storage") vi.stubGlobal("indexedDB", undefined);
  const execution = executeQuote(
    keplr,
    quote,
    () => 1,
    () => {},
  );
  if (scenario === "success")
    await expect(execution).resolves.toMatchObject({ height: 12 });
  else await expect(execution).rejects.toThrow();
  if (scenario === "blocked storage" || scenario === "altered signed action")
    expect(sends).toBe(0);
  else {
    const restored = await new TransactionJournal().load(
      TESTNET.chainId,
      owner,
    );
    expect(restored.records).toHaveLength(1);
    expect(restored.records[0]).toMatchObject({
      hash: await signedTransactionHash(signedBytes),
      state: scenario === "success" ? "CONFIRMED" : "UNKNOWN_AFTER_BROADCAST",
    });
  }
});

test("changed chain software blocks financial preflight before signer acquisition", async () => {
  vi.stubGlobal("fetch", async (url: string) =>
    url.includes("node_info")
      ? new Response(
          JSON.stringify({
            default_node_info: { network: "zig-test-2" },
            application_version: { version: "v6" },
          }),
        )
      : networkResponse(url),
  );
  const { quoteExecute } = await import("./wallet");
  await expect(
    quoteExecute(wallet().keplr, owner, 1, { create_goal: {} }),
  ).rejects.toThrow(/Network or denomination changed/);
  expect(clients.signing).not.toHaveBeenCalled();
});
