import { TxBody, TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import type { Confirmed } from "./transaction";
import type { JournalRecord, JournalPatch } from "./transaction-journal";
export interface Receipt extends Confirmed {
  tx: Uint8Array;
}
export interface ReceiptReader {
  getChainId(): Promise<string>;
  getTx(hash: string): Promise<Receipt | null>;
}
export async function signedTransactionHash(
  bytes: Uint8Array,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
}
export function operationMessage(
  record: Pick<JournalRecord, "action" | "goalId" | "amount">,
) {
  switch (record.action) {
    case "create":
      return { create_goal: {} };
    case "deposit":
      return { deposit: { goal_id: record.goalId } };
    case "withdraw":
      return { withdraw: { goal_id: record.goalId, amount: record.amount } };
    case "close":
      return { close_goal: { goal_id: record.goalId } };
  }
}
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}
export async function verifyReceipt(
  record: JournalRecord,
  receipt: Receipt,
): Promise<Confirmed> {
  if (
    !record.hash ||
    !(receipt.tx instanceof Uint8Array) ||
    receipt.tx.length > 1024 * 1024 ||
    receipt.hash?.toUpperCase() !== record.hash ||
    (await signedTransactionHash(receipt.tx)) !== record.hash
  )
    throw Error("Receipt hash does not match signed transaction identity.");
  if (
    !Number.isSafeInteger(receipt.height) ||
    receipt.height <= 0 ||
    !Number.isSafeInteger(receipt.code) ||
    receipt.code < 0 ||
    receipt.code > 0xffffffff
  )
    throw Error("Malformed receipt outcome.");
  verifySignedOperation(record, receipt.tx);
  // Bounds apply across the receipt, not independently to each nested array.
  // Count array lengths before walking attributes and bound strings before encoding.
  const maxAttributes = 512;
  const maxTextBytes = 64 * 1024;
  let attributeCount = 0;
  let textBytes = 0;
  const encoder = new TextEncoder();
  const consumeText = (value: unknown, maxLength: number) => {
    if (typeof value !== "string" || value.length > maxLength)
      throw Error("Malformed receipt events.");
    if (value.length > maxTextBytes - textBytes)
      throw Error("Receipt event text limit exceeded.");
    textBytes += encoder.encode(value).byteLength;
    if (textBytes > maxTextBytes)
      throw Error("Receipt event text limit exceeded.");
  };
  if (!Array.isArray(receipt.events) || receipt.events.length > 1000)
    throw Error("Malformed receipt events.");
  for (const event of receipt.events) {
    consumeText(event.type, 256);
    if (!Array.isArray(event.attributes))
      throw Error("Malformed receipt events.");
    attributeCount += event.attributes.length;
    if (attributeCount > maxAttributes)
      throw Error("Receipt event attribute limit exceeded.");
    for (const attribute of event.attributes) {
      consumeText(attribute.key, 1024);
      consumeText(attribute.value, 65536);
    }
  }
  return {
    hash: record.hash,
    code: receipt.code,
    height: receipt.height,
    events: receipt.events,
  };
}
/** Refuse altered signer output before any broadcast, and recheck during recovery. */
export function verifySignedOperation(
  record: JournalRecord,
  bytes: Uint8Array,
) {
  if (bytes.length > 1024 * 1024)
    throw Error("Signed transaction is too large.");
  const body = TxBody.decode(TxRaw.decode(bytes).bodyBytes);
  if (
    body.messages.length !== 1 ||
    body.messages[0]?.typeUrl !== "/cosmwasm.wasm.v1.MsgExecuteContract"
  )
    throw Error("Receipt message identity mismatch.");
  const message = MsgExecuteContract.decode(body.messages[0].value);
  const expectedFunds =
    record.action === "deposit"
      ? [{ denom: record.denom, amount: record.amount }]
      : [];
  if (
    message.sender !== record.wallet ||
    message.contract !== record.contract ||
    canonical(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(message.msg)),
    ) !== canonical(operationMessage(record)) ||
    canonical(message.funds) !== canonical(expectedFunds)
  )
    throw Error("Receipt operation identity mismatch.");
}
export async function reconcileKnownReceipt(
  record: JournalRecord,
  reader: ReceiptReader,
  timeoutMs = 12000,
): Promise<JournalPatch> {
  if (
    !record.hash ||
    record.state === "CONFIRMED" ||
    record.state === "FAILED" ||
    record.state === "REJECTED" ||
    record.state === "AWAITING_SIGNATURE"
  )
    return { state: record.state };
  try {
    const receipt = await receiptDeadline(
      (async () => {
        if ((await reader.getChainId()) !== record.chainId)
          throw Error("Wrong RPC network.");
        return reader.getTx(record.hash!);
      })(),
      timeoutMs,
    );
    if (!receipt) return { state: "UNKNOWN_AFTER_BROADCAST" };
    const verified = await verifyReceipt(record, receipt);
    return {
      state: verified.code === 0 ? "CONFIRMED" : "FAILED",
      hash: verified.hash,
      height: verified.height,
      code: verified.code,
    };
  } catch {
    return { state: "UNKNOWN_AFTER_BROADCAST" };
  }
}

export async function receiptDeadline<T>(
  work: Promise<T>,
  timeoutMs = 12000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              Error("Receipt lookup timed out; outcome remains uncertain."),
            ),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
