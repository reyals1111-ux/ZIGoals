import {
  CosmWasmClient,
  SigningCosmWasmClient,
} from "@cosmjs/cosmwasm-stargate";
import { calculateFee, GasPrice } from "@cosmjs/stargate";
import { fromBech32, toUtf8 } from "@cosmjs/encoding";
import type { OfflineSigner, EncodeObject } from "@cosmjs/proto-signing";
import { MsgExecuteContract } from "cosmjs-types/cosmwasm/wasm/v1/tx";
import { TxRaw } from "cosmjs-types/cosmos/tx/v1beta1/tx";
import {
  TESTNET,
  verifyNetwork,
  keplrChainInfo,
  safeMaximum,
  formatUnits,
} from "@zigoals/chain-config";
import type { ExecuteMsg, Goal } from "@zigoals/shared-types/contract";
import {
  runTransaction,
  type Confirmed,
  type TransactionUpdate,
} from "./transaction";
import {
  newOperation,
  recoveryCandidates,
  TransactionJournal,
  type JournalRecord,
} from "./transaction-journal";
import {
  signedTransactionHash,
  verifySignedOperation,
  verifyReceipt,
  reconcileKnownReceipt,
  receiptDeadline,
} from "./receipt-reconciliation";
export interface Keplr {
  enable(chain: string): Promise<void>;
  experimentalSuggestChain(
    info: ReturnType<typeof keplrChainInfo>,
  ): Promise<void>;
  getKey(chain: string): Promise<{ bech32Address: string }>;
  getOfflineSignerAuto(chain: string): Promise<OfflineSigner>;
}
declare global {
  interface Window {
    keplr?: Keplr;
  }
}
import { verifyContractEvidence } from "./contract-evidence";
import {
  deployedManifest,
  requireConfiguredDeployment,
} from "./deployment-config";
export const CONTRACT_ADDRESS = deployedManifest?.contractAddress ?? "";
export async function connectKeplr(
  keplr: Keplr,
  onAdding: () => void,
  assertCurrent: () => void,
) {
  assertCurrent();
  await verifyNetwork();
  assertCurrent();
  onAdding();
  assertCurrent();
  await keplr.experimentalSuggestChain(keplrChainInfo());
  assertCurrent();
  await keplr.enable(TESTNET.chainId);
  assertCurrent();
  const key = await keplr.getKey(TESTNET.chainId);
  assertCurrent();
  if (fromBech32(key.bech32Address, 90).prefix !== TESTNET.addressPrefix)
    throw Error("Wrong wallet network. Reconnect to ZIGChain Testnet.");
  return key.bech32Address;
}
export async function readBalance(address: string): Promise<string> {
  const response = await fetch(
    `${TESTNET.restUrl}/cosmos/bank/v1beta1/balances/${encodeURIComponent(address)}/by_denom?denom=${TESTNET.nativeAsset.baseDenom}`,
    { signal: AbortSignal.timeout(12000) },
  );
  if (!response.ok) throw Error("Testnet balance is unavailable.");
  const data = await response.json();
  if (
    !data.balance ||
    data.balance.denom !== TESTNET.nativeAsset.baseDenom ||
    !/^\d+$/.test(data.balance.amount)
  )
    throw Error("Testnet returned an invalid balance.");
  return data.balance.amount;
}
async function verifiedClient() {
  const manifest = requireConfiguredDeployment();
  await verifyNetwork(TESTNET, fetch, manifest.chainVersion);
  const client = await CosmWasmClient.connect(TESTNET.rpcUrl);
  try {
    if ((await client.getChainId()) !== TESTNET.chainId)
      throw Error("Wrong RPC network.");
    if (fromBech32(CONTRACT_ADDRESS, 90).prefix !== "zig")
      throw Error("Invalid Goal Manager address.");
    await verifyContractEvidence(client, manifest);
    return client;
  } catch (e) {
    client.disconnect();
    throw e;
  }
}
export async function readGoals(owner: string): Promise<Goal[]> {
  if (!CONTRACT_ADDRESS) return [];
  const client = await verifiedClient();
  try {
    const goals: Goal[] = [];
    let start_after: string | undefined;
    for (let page = 0; page < 100; page++) {
      const response = (await client.queryContractSmart(CONTRACT_ADDRESS, {
        goals_by_owner: { owner, start_after, limit: 100 },
      })) as { goals: Goal[] };
      if (
        !Array.isArray(response.goals) ||
        response.goals.some(
          (g) =>
            g.owner !== owner ||
            g.base_denom !== TESTNET.nativeAsset.baseDenom ||
            !/^\d+$/.test(g.position_units),
        )
      )
        throw Error("Invalid Goal Manager response.");
      goals.push(...response.goals);
      if (response.goals.length < 100) return goals;
      start_after = response.goals.at(-1)?.id;
    }
    throw Error("Goal list is too large to load completely.");
  } finally {
    client.disconnect();
  }
}
export interface Quote {
  fee: { amount: readonly { denom: string; amount: string }[]; gas: string };
  feeAmount: string;
  safeMax: string;
  balance: string;
  message: EncodeObject;
  owner: string;
  revision: number;
  expiresAt: number;
}
export async function quoteExecute(
  keplr: Keplr,
  owner: string,
  revision: number,
  msg: ExecuteMsg,
  amount = "0",
): Promise<Quote> {
  const check = await verifiedClient();
  check.disconnect();
  const key = await keplr.getKey(TESTNET.chainId);
  if (key.bech32Address !== owner)
    throw Error("Account changed. Reconnect before continuing.");
  const signer = await keplr.getOfflineSignerAuto(TESTNET.chainId);
  const client = await SigningCosmWasmClient.connectWithSigner(
    TESTNET.rpcUrl,
    signer,
  );
  try {
    if ((await client.getChainId()) !== TESTNET.chainId)
      throw Error("Wrong RPC network.");
    const message = {
      typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
      value: MsgExecuteContract.fromPartial({
        sender: owner,
        contract: CONTRACT_ADDRESS,
        msg: toUtf8(JSON.stringify(msg)),
        funds:
          BigInt(amount) > 0n
            ? [{ denom: TESTNET.nativeAsset.baseDenom, amount }]
            : [],
      }),
    };
    const gas = await client.simulate(owner, [message], "");
    if (!Number.isSafeInteger(gas) || gas <= 0)
      throw Error("Invalid transaction simulation.");
    const fee = calculateFee(
      Math.ceil(gas * 1.3),
      GasPrice.fromString(TESTNET.gasPrice + TESTNET.nativeAsset.baseDenom),
    );
    const feeAmount = fee.amount[0]?.amount;
    if (!feeAmount) throw Error("No fee estimate available.");
    const balance = await readBalance(owner);
    if (BigInt(balance) < BigInt(feeAmount) + BigInt(amount))
      throw Error(
        "Keep enough ZIG in your wallet for this action and its network fee. " +
          `Estimated network fee: ${formatUnits(feeAmount, TESTNET.nativeAsset.decimals)} ZIG. ` +
          `Available after fee reserve: ${formatUnits(safeMaximum(balance, feeAmount), TESTNET.nativeAsset.decimals)} ZIG.`,
      );
    return {
      fee,
      feeAmount,
      safeMax: safeMaximum(balance, feeAmount),
      balance,
      message,
      owner,
      revision,
      expiresAt: Date.now() + 60000,
    };
  } finally {
    client.disconnect();
  }
}
export async function executeQuote(
  keplr: Keplr,
  quote: Quote,
  currentRevision: () => number,
  onState: TransactionUpdate,
  operationId?: string,
): Promise<Confirmed> {
  const assertCurrent = () => {
    if (currentRevision() !== quote.revision || Date.now() > quote.expiresAt)
      throw Error("Wallet or fee estimate changed. Review the action again.");
  };
  assertCurrent();
  const execute = quote.message.value as MsgExecuteContract;
  const message = JSON.parse(
    new TextDecoder().decode(execute.msg),
  ) as ExecuteMsg;
  if (!(
    "create_goal" in message ||
    "deposit" in message ||
    "withdraw" in message ||
    "close_goal" in message
  ))
    throw Error("This action is not supported by the transaction journal.");
  const action =
    "create_goal" in message
      ? "create"
      : "deposit" in message
        ? "deposit"
        : "withdraw" in message
          ? "withdraw"
          : "close";
  const operation = newOperation({
    chainId: TESTNET.chainId,
    wallet: quote.owner,
    contract: execute.contract,
    action,
    goalId:
      "create_goal" in message
        ? undefined
        : "deposit" in message
          ? message.deposit.goal_id
          : "withdraw" in message
            ? message.withdraw.goal_id
            : message.close_goal.goal_id,
    amount:
      "withdraw" in message
        ? message.withdraw.amount
        : (execute.funds[0]?.amount ?? "0"),
    denom: TESTNET.nativeAsset.baseDenom,
  });
  if (operationId) operation.operationId = operationId;
  const journal = new TransactionJournal();
  await journal.create(operation);
  const signer = await keplr.getOfflineSignerAuto(TESTNET.chainId);
  assertCurrent();
  const client = await SigningCosmWasmClient.connectWithSigner(
    TESTNET.rpcUrl,
    signer,
  );
  const fresh = async () => {
    assertCurrent();
    const key = await keplr.getKey(TESTNET.chainId);
    assertCurrent();
    const accounts = await signer.getAccounts();
    assertCurrent();
    if (
      key.bech32Address !== quote.owner ||
      accounts[0]?.address !== quote.owner
    )
      throw Error("Account changed. Reconnect before continuing.");
    if ((await client.getChainId()) !== TESTNET.chainId)
      throw Error("Wrong RPC network.");
    assertCurrent();
  };
  try {
    return await runTransaction(
      {
        assertFresh: fresh,
        hash: async (bytes) => {
          verifySignedOperation(operation, bytes);
          return signedTransactionHash(bytes);
        },
        persist: async (state, details) => {
          if (state === "AWAITING_SIGNATURE") return;
          const saved = await journal.transition(operation.operationId, {
            state,
            ...details,
          });
          if (state === "BROADCASTING" && saved.state !== "BROADCASTING")
            throw Error("This operation cannot be broadcast again.");
        },
        sign: async () => {
          const verified = await verifiedClient();
          verified.disconnect();
          await fresh();
          return TxRaw.encode(
            await client.sign(quote.owner, [quote.message], quote.fee, ""),
          ).finish();
        },
        broadcast: (bytes) => client.broadcastTxSync(bytes),
        confirm: async (hash) => {
          const end = Date.now() + 60000;
          while (Date.now() < end) {
            const tx = await receiptDeadline(client.getTx(hash));
            if (tx) {
              if (
                (await receiptDeadline(client.getChainId())) !==
                operation.chainId
              )
                throw Error("Wrong RPC network during confirmation.");
              return verifyReceipt({ ...operation, hash }, tx);
            }
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          throw Error(
            "Confirmation is taking longer than expected. Check the explorer before trying again.",
          );
        },
      },
      onState,
    );
  } finally {
    client.disconnect();
  }
}

/** Bounded, read-only receipt recovery. Never signs or broadcasts. */
export async function reconcileTransactions(
  records: JournalRecord[],
  journal = new TransactionJournal(),
) {
  const candidates = recoveryCandidates(records);
  if (!candidates.length)
    return { records: [] as JournalRecord[], warnings: [] as string[] };
  const recovered: JournalRecord[] = [];
  const warnings: string[] = [];
  const client = await receiptDeadline(CosmWasmClient.connect(TESTNET.rpcUrl));
  try {
    for (const record of candidates) {
      if (record.chainId !== TESTNET.chainId) continue;
      const patch = await reconcileKnownReceipt(record, client);
      try {
        recovered.push(await journal.transition(record.operationId, patch));
      } catch {
        recovered.push({ ...record, ...patch });
        warnings.push(
          "Receipt status was not saved. Keep the transaction hash; stored history may be older than the proven receipt.",
        );
      }
    }
  } finally {
    client.disconnect();
  }
  return { records: recovered, warnings };
}
