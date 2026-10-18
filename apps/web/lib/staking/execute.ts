import {assertNativeStakingAllowed} from '../app-environment';
import {STAKING_NETWORKS} from '@zigoals/chain-config/networks';
import type {OfflineSigner} from '@cosmjs/proto-signing';
import {runTransaction, TransactionFailure, type Confirmed, type TransactionUpdate} from '../transaction';
import {newStakingEntry, updateStakingJournal, withStakingEntry, withStakingTransition, type NewStakingEntry} from './journal';
import {STAKING_TYPE_URLS, liquidSpend, validatorsOf, type StakingMessage} from './messages';
import {readStakingPrefs, realConfirmedAtOf} from './prefs';
import {txHash, verifySignedMessages, verifyStakingReceipt, type ChainTx} from './receipt';
import {redeemSignTicket, type SignTicket} from './sign-gate';
import {abciCode, plainWords, type PlainError} from './errors';
import type {StakingQuote} from './quote';

/**
 * Session AF (ADR-028 H4, H46, H61, H63; `TIER 3 (wallet/signing)`): THE signer path for native staking, the only one.
 * Reached only from the review sheet's submit handler with a ticket the sign gate issued for the person's own press
 * (staking-guard.test.ts pins both). In order: the build may sign these five message types (assertNativeStakingAllowed),
 * the ticket is redeemed once, a real-network action needs the person's first-real confirm, the journal records the
 * action, and only then is Keplr asked for a signer (`getOfflineSignerAuto`: amino for a Ledger, direct otherwise, with
 * the reviewed fee kept), the account and chain are re-checked, the signed bytes must be the reviewed messages, the
 * transaction is broadcast once (`broadcastTxSync`), and its receipt is polled for up to 60 seconds and verified. The
 * steps run through lib/transaction.ts's runTransaction, the pattern of lib/wallet.ts's executeQuote; nothing is retried.
 */
export const CONFIRM_TIMEOUT_MS = 60_000;
export const CONFIRM_POLL_MS = 1_500;
export const REAL_CONFIRM_FIRST = 'Confirm the real network first: this moves real ZIG. Nothing was signed.';
export type KeplrSigner = {
  getKey(chainId: string): Promise<{bech32Address?: unknown}>;
  getOfflineSignerAuto(chainId: string, options?: {preferNoSetFee?: boolean}): Promise<OfflineSigner>;
};
/** The signing client the default factory builds: CosmJS's SigningStargateClient over the network's RPC. */
export interface SigningChain {
  getChainId(): Promise<string>;
  sign(address: string, messages: readonly StakingMessage[], fee: StakingQuote['fee']): Promise<Uint8Array>;
  broadcastTxSync(bytes: Uint8Array): Promise<string>;
  getTx(hash: string): Promise<ChainTx | null>;
  disconnect(): void;
}
async function cosmjsSigningChain(rpcUrl: string, signer: OfflineSigner): Promise<SigningChain> {
  const [{SigningStargateClient}, {TxRaw}] = await Promise.all([import('@cosmjs/stargate'), import('cosmjs-types/cosmos/tx/v1beta1/tx')]);
  const client = await SigningStargateClient.connectWithSigner(rpcUrl, signer);
  return {
    getChainId: () => client.getChainId(),
    sign: async (address, messages, fee) => TxRaw.encode(await client.sign(address, [...messages], {amount: [...fee.amount], gas: fee.gas}, '')).finish(),
    broadcastTxSync: bytes => client.broadcastTxSync(bytes),
    getTx: async hash => { const tx = await client.getTx(hash); return tx ? {hash: tx.hash, height: tx.height, code: tx.code, tx: tx.tx, events: tx.events} : null; },
    disconnect: () => client.disconnect(),
  };
}
export type StakingDeps = {storage: () => Pick<Storage, 'getItem' | 'setItem'>; connect?: (rpcUrl: string, signer: OfflineSigner) => Promise<SigningChain>};
export type StakingReceipt = Confirmed & {operationId: string; chainId: string; network: StakingQuote['network']};
/** A staking action that stopped: the plain words (and explorer links) to show, and whether funds may have moved. */
export class StakingFailure extends Error {
  constructor(public plain: PlainError, public state: TransactionFailure['state'], public uncertain: boolean, public hash?: string) { super(plain.message); }
}
function journalFields(quote: StakingQuote): NewStakingEntry {
  const [first] = quote.messages as StakingMessage[];
  const base = {chainId: quote.chainId, wallet: quote.address, action: quote.action, amount: liquidSpend(quote.messages).toString()};
  if (!first) return base;
  switch (first.typeUrl) {
    case STAKING_TYPE_URLS.delegate: case STAKING_TYPE_URLS.undelegate: return {...base, validator: first.value.validatorAddress, amount: first.value.amount.amount};
    case STAKING_TYPE_URLS.redelegate: return {...base, validator: first.value.validatorSrcAddress, destination: first.value.validatorDstAddress, amount: first.value.amount.amount};
    case STAKING_TYPE_URLS.claim: return {...base, amount: '0', validators: validatorsOf(quote.messages), ...(quote.messages.length === 1 ? {validator: first.value.validatorAddress} : {})};
    case STAKING_TYPE_URLS.vote: return {...base, amount: '0', proposalId: first.value.proposalId.toString(), option: String(first.value.option)};
  }
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export async function executeSigned(ticket: SignTicket, keplr: KeplrSigner, onState: TransactionUpdate, deps: StakingDeps): Promise<StakingReceipt> {
  assertNativeStakingAllowed(ticket.messages);
  const quote = redeemSignTicket(ticket);
  assertNativeStakingAllowed(quote.messages);
  const config = STAKING_NETWORKS[quote.network];
  if (!config || config.chainId !== quote.chainId) throw new StakingFailure(plainWords(Error('Network or denomination changed.'), {chainId: quote.chainId}), 'FAILED', false);
  const storage = deps.storage();
  if (quote.network === 'real' && !realConfirmedAtOf(readStakingPrefs(storage).data)) throw new StakingFailure({kind: 'other', message: REAL_CONFIRM_FIRST, links: []}, 'FAILED', false);
  const entry = newStakingEntry(journalFields(quote));
  updateStakingJournal(storage, record => withStakingEntry(record, entry));
  let signer: OfflineSigner, chain: SigningChain;
  try {
    signer = await keplr.getOfflineSignerAuto(quote.chainId, {preferNoSetFee: true});
    chain = await (deps.connect ?? cosmjsSigningChain)(config.rpcUrl, signer);
  } catch (error) {
    const plain = plainWords(error, {chainId: quote.chainId});
    try { updateStakingJournal(storage, record => withStakingTransition(record, entry.operationId, {state: plain.kind === 'rejected' ? 'REJECTED' : 'FAILED'})); } catch { /* the entry stays awaiting; nothing was signed */ }
    throw new StakingFailure(plain, plain.kind === 'rejected' ? 'REJECTED' : 'FAILED', false);
  }
  let outcome: Confirmed | undefined, signedHash: string | undefined, refusedCode: number | undefined;
  const fresh = async () => {
    const key = await keplr.getKey(quote.chainId), accounts = await signer.getAccounts();
    if (key?.bech32Address !== quote.address || accounts[0]?.address !== quote.address) throw Error('Your wallet switched accounts. Connect again before continuing; nothing was sent.');
    if ((await chain.getChainId()) !== quote.chainId) throw Error('Wrong RPC network.');
  };
  try {
    const confirmed = await runTransaction({
      assertFresh: fresh,
      hash: async bytes => { await verifySignedMessages(quote.messages, bytes); return (signedHash = await txHash(bytes)); },
      persist: async (state, details) => {
        if (state === 'AWAITING_SIGNATURE') return;
        const saved = updateStakingJournal(storage, record => withStakingTransition(record, entry.operationId, {state, ...(details?.hash ? {hash: details.hash} : {}), ...(details?.height ? {height: String(details.height)} : {}), ...(details?.code !== undefined ? {code: details.code} : {})}));
        if (state === 'BROADCASTING' && saved.entries?.find(e => e.operationId === entry.operationId)?.state !== 'BROADCASTING') throw Error('This action cannot be broadcast again.');
      },
      sign: async () => {
        assertNativeStakingAllowed(quote.messages);
        if (Date.now() >= quote.expiresAt) throw Error('The fee estimate expired before signing. Review again; nothing was signed.');
        return chain.sign(quote.address, quote.messages, quote.fee);
      },
      broadcast: async bytes => {
        assertNativeStakingAllowed(quote.messages);
        try { return await chain.broadcastTxSync(bytes); }
        catch (error) {
          // The node's own check refused it (CosmJS BroadcastTxError: a code and a log): it never entered a block, so the
          // outcome is certain, not "may have moved". A lost connection stays uncertain.
          const code = abciCode(error);
          if (code === undefined || !(typeof (error as {code?: unknown}).code === 'number' || /failed with code \d+/.test(error instanceof Error ? error.message : ''))) throw error;
          refusedCode = code;
          throw new TransactionFailure(error instanceof Error ? error.message : 'Refused by the node.', 'FAILED', false, signedHash);
        }
      },
      confirm: async hash => {
        const end = Date.now() + CONFIRM_TIMEOUT_MS;
        while (Date.now() < end) {
          const tx = await chain.getTx(hash);
          if (tx) { if ((await chain.getChainId()) !== quote.chainId) throw Error('Wrong RPC network during confirmation.'); return (outcome = await verifyStakingReceipt(quote.messages, hash, tx)); }
          await sleep(CONFIRM_POLL_MS);
        }
        throw Error('Still confirming. Check the transaction on the explorer before trying again.');
      },
    }, onState);
    return {...confirmed, operationId: entry.operationId, chainId: quote.chainId, network: quote.network};
  } catch (error) {
    const failure = error instanceof TransactionFailure ? error : new TransactionFailure(error instanceof Error ? error.message : 'This did not go through.', 'FAILED', false);
    const code = outcome?.code || refusedCode || undefined;
    if (refusedCode !== undefined) try { updateStakingJournal(storage, record => withStakingTransition(record, entry.operationId, {state: 'FAILED', code: refusedCode})); } catch { /* the hash is shown; the journal keeps the broadcast state */ }
    throw new StakingFailure(plainWords(code ? Object.assign(Error(failure.message), {code}) : failure, {chainId: quote.chainId, hash: failure.hash, code}), failure.state, failure.uncertain, failure.hash);
  } finally { chain.disconnect(); }
}
