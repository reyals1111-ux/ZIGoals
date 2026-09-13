import type { TransactionState } from "@zigoals/shared-types";
export interface Confirmed {
  hash: string;
  height: number;
  code: number;
  events: readonly {
    type: string;
    attributes: readonly { key: string; value: string }[];
  }[];
}
import type { JournalState } from "./transaction-journal";
export interface TransactionDriver {
  hash?: (bytes: Uint8Array) => Promise<string>;
  persist?: (
    state: JournalState,
    details?: TransactionDetails,
  ) => Promise<void>;
  assertFresh: () => Promise<void>;
  sign: () => Promise<Uint8Array>;
  broadcast: (bytes: Uint8Array) => Promise<string>;
  confirm: (hash: string) => Promise<Confirmed>;
}
export interface TransactionDetails {
  hash?: string;
  storageWarning?: string;
  code?: number;
  height?: number;
  uncertain?: boolean;
  message?: string;
}
export type TransactionUpdate = (
  state: TransactionState,
  details?: TransactionDetails,
) => void;
export class TransactionFailure extends Error {
  constructor(
    message: string,
    public state: TransactionState,
    public uncertain: boolean,
    public hash?: string,
  ) {
    super(message);
  }
}
export async function runTransaction(
  driver: TransactionDriver,
  update: TransactionUpdate,
): Promise<Confirmed> {
  let sent = false;
  let hash: string | undefined;
  let storageWarning: string | undefined;
  try {
    await driver.persist?.("AWAITING_SIGNATURE");
    await driver.assertFresh();
    update("AWAITING_SIGNATURE");
    const bytes = await driver.sign();
    await driver.assertFresh();
    hash = await driver.hash?.(bytes);
    await driver.persist?.("BROADCASTING", { hash });
    await driver.assertFresh();
    update("BROADCASTING", { hash });
    sent = true;
    const broadcastHash = await driver.broadcast(bytes);
    if (hash && broadcastHash.toUpperCase() !== hash)
      throw Error(
        "Broadcast returned a different transaction hash. Check the signed transaction before retrying.",
      );
    hash = hash ?? broadcastHash;
    try {
      await driver.persist?.("CONFIRMING", { hash });
    } catch {
      storageWarning =
        "Transaction status was not saved. Keep the signed hash and check its receipt.";
    }
    update("CONFIRMING", { hash, storageWarning });
    const result = await driver.confirm(hash);
    if (result.code !== 0) {
      try {
        await driver.persist?.("FAILED", {
          hash,
          height: result.height,
          code: result.code,
        });
      } catch {
        storageWarning =
          "Receipt proven, but its status was not saved. Keep the transaction hash.";
      }
      if (storageWarning)
        update("FAILED", { hash, height: result.height, storageWarning });
      throw new TransactionFailure(
        "The chain rejected this action. The deposit or withdrawal was not applied; a network fee may have been charged.",
        "FAILED",
        false,
        hash,
      );
    }
    try {
      await driver.persist?.("CONFIRMED", {
        hash,
        height: result.height,
        code: result.code,
      });
    } catch {
      storageWarning =
        "Receipt proven, but its status was not saved. Keep the transaction hash.";
    }
    update("SUCCESS", { hash, height: result.height, storageWarning });
    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Transaction could not be completed.";
    const failure =
      error instanceof TransactionFailure
        ? error
        : new TransactionFailure(
            message,
            !sent && /reject|denied|cancel/i.test(message)
              ? "REJECTED"
              : "FAILED",
            sent,
            hash,
          );
    try {
      if (!(sent && !failure.uncertain))
        await driver.persist?.(
          failure.uncertain
            ? "UNKNOWN_AFTER_BROADCAST"
            : failure.state === "REJECTED"
              ? "REJECTED"
              : "FAILED",
          failure.hash && sent ? { hash: failure.hash } : undefined,
        );
    } catch {
      storageWarning =
        "Transaction status was not saved. Keep the signed hash and check its receipt.";
    }
    update(failure.state, {
      hash: failure.hash,
      uncertain: failure.uncertain,
      message: failure.message,
      storageWarning,
    });
    throw failure;
  }
}
