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
export interface TransactionDriver {
  assertFresh: () => Promise<void>;
  sign: () => Promise<Uint8Array>;
  broadcast: (bytes: Uint8Array) => Promise<string>;
  confirm: (hash: string) => Promise<Confirmed>;
}
export interface TransactionDetails {
  hash?: string;
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
  try {
    await driver.assertFresh();
    update("AWAITING_SIGNATURE");
    const bytes = await driver.sign();
    await driver.assertFresh();
    update("BROADCASTING");
    sent = true;
    hash = await driver.broadcast(bytes);
    update("CONFIRMING", { hash });
    const result = await driver.confirm(hash);
    if (result.code !== 0)
      throw new TransactionFailure(
        "The chain rejected this action. The deposit or withdrawal was not applied; a network fee may have been charged.",
        "FAILED",
        false,
        hash,
      );
    update("SUCCESS", { hash, height: result.height });
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
    update(failure.state, {
      hash: failure.hash,
      uncertain: failure.uncertain,
      message: failure.message,
    });
    throw failure;
  }
}
