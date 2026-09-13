import { expect, test } from "vitest";
import { TxBody, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { newOperation } from "./transaction-journal";
import {
  signedTransactionHash,
  verifyReceipt,
  reconcileKnownReceipt,
} from "./receipt-reconciliation";
const identity = {
  chainId: "zig-test-2",
  wallet: "zig1alice",
  contract: "zig1contract",
  action: "deposit" as const,
  goalId: "7",
  amount: "123",
  denom: "azig",
};
function bytes(overrides: Record<string, unknown> = {}) {
  const msg = MsgExecuteContract.fromPartial({
    sender: identity.wallet,
    contract: identity.contract,
    msg: new TextEncoder().encode(
      JSON.stringify({ deposit: { goal_id: "7" } }),
    ),
    funds: [{ denom: "azig", amount: "123" }],
    ...overrides,
  });
  return TxRaw.encode(
    TxRaw.fromPartial({
      bodyBytes: TxBody.encode(
        TxBody.fromPartial({
          messages: [
            {
              typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
              value: MsgExecuteContract.encode(msg).finish(),
            },
          ],
        }),
      ).finish(),
      signatures: [new Uint8Array([1])],
    }),
  ).finish();
}
async function fixture(overrides = {}) {
  const tx = bytes(overrides);
  const hash = await signedTransactionHash(tx);
  return {
    record: { ...newOperation(identity), state: "BROADCASTING" as const, hash },
    receipt: { hash, tx, code: 0, height: 12, events: [] },
  };
}
test("hash is SHA256 of the signed TxRaw bytes", async () => {
  expect(await signedTransactionHash(new TextEncoder().encode("abc"))).toBe(
    "BA7816BF8F01CFEA414140DE5DAE2223B00361A396177A9CB410FF61F20015AD",
  );
});
test("matching signed execution verifies success and nonzero execution failure", async () => {
  const { record, receipt } = await fixture();
  await expect(verifyReceipt(record, receipt)).resolves.toMatchObject({
    code: 0,
    height: 12,
  });
  await expect(
    verifyReceipt(record, { ...receipt, code: 9 }),
  ).resolves.toMatchObject({ code: 9 });
});
test.each([
  ["sender", { sender: "zig1bob" }],
  ["contract", { contract: "zig1other" }],
  ["message", { msg: new TextEncoder().encode('{"deposit":{"goal_id":"8"}}') }],
  ["funds", { funds: [{ denom: "azig", amount: "124" }] }],
  [
    "extra message field",
    {
      msg: new TextEncoder().encode(
        '{"deposit":{"goal_id":"7"},"notes":"private"}',
      ),
    },
  ],
])("a receipt with mismatching %s never confirms", async (_, overrides) => {
  const { record, receipt } = await fixture(overrides);
  await expect(verifyReceipt(record, receipt)).rejects.toThrow(/identity/i);
});
test("claimed hash does not override actual receipt bytes", async () => {
  const { record, receipt } = await fixture();
  await expect(
    verifyReceipt(record, { ...receipt, tx: new Uint8Array([1]) }),
  ).rejects.toThrow();
  await expect(
    verifyReceipt(record, { ...receipt, hash: "B".repeat(64) }),
  ).rejects.toThrow();
});
test.each(["missing", "timeout", "wrong network", "malformed"])(
  "%s stays uncertain without replay",
  async (scenario) => {
    const { record, receipt } = await fixture();
    const result = await reconcileKnownReceipt(record, {
      getChainId: async () =>
        scenario === "wrong network" ? "mainnet" : identity.chainId,
      getTx: async () => {
        if (scenario === "timeout") throw Error("timeout");
        return scenario === "missing"
          ? null
          : scenario === "malformed"
            ? { ...receipt, tx: new Uint8Array([1]) }
            : receipt;
      },
    });
    expect(result.state).toBe("UNKNOWN_AFTER_BROADCAST");
  },
);

test("a hung RPC is bounded and remains uncertain", async () => {
  const { record } = await fixture();
  await expect(
    reconcileKnownReceipt(
      record,
      { getChainId: () => new Promise(() => {}), getTx: async () => null },
      10,
    ),
  ).resolves.toMatchObject({ state: "UNKNOWN_AFTER_BROADCAST" });
});
