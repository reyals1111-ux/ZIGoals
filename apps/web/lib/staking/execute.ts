import {REVOKE_NEEDS_DIRECT, assertNativeStakingAllowed} from '../app-environment';
import {STAKING_NETWORKS} from '@zigoals/chain-config/networks';
import type {OfflineSigner} from '@cosmjs/proto-signing';
import {runTransaction, TransactionFailure, type Confirmed, type TransactionUpdate} from '../transaction';
import {newStakingEntry, updateStakingJournal, withStakingEntry, withStakingTransition, type NewStakingEntry} from './journal';
import {STAKING_TYPE_URLS, liquidSpend, validatorsOf, type StakingMessage} from './messages';
import {readStakingPrefs, realConfirmedAtOf} from './prefs';
import {txHash, verifySignedFee, verifySignedMessages, verifyStakingReceipt, type ChainTx} from './receipt';
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
 *
 * Session AF chunk 3: every check passes the transaction's own context (its chain id, its memo — empty for staking, a
 * practice badge's code — and whether a Ledger signs), so a bank send can be signed only as a testnet practice badge and a
 * revoke only by a direct signer; the signed bytes and the receipt must carry the reviewed memo exactly.
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
  sign(address: string, messages: readonly StakingMessage[], fee: StakingQuote['fee'], memo: string): Promise<Uint8Array>;
  broadcastTxSync(bytes: Uint8Array): Promise<string>;
  getTx(hash: string): Promise<ChainTx | null>;
  disconnect(): void;
}
async function cosmjsSigningChain(rpcUrl: string, signer: OfflineSigner): Promise<SigningChain> {
  const [{SigningStargateClient}, {TxRaw}] = await Promise.all([import('@cosmjs/stargate'), import('cosmjs-types/cosmos/tx/v1beta1/tx')]);
  const client = await SigningStargateClient.connectWithSigner(rpcUrl, signer);
  return {
    getChainId: () => client.getChainId(),
    sign: async (address, messages, fee, memo) => TxRaw.encode(await client.sign(address, [...messages], {amount: [...fee.amount], gas: fee.gas}, memo)).finish(),
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
    case STAKING_TYPE_URLS.revoke: return {...base, amount: '0', grantee: first.value.grantee, msgTypeUrl: first.value.msgTypeUrl};
    case STAKING_TYPE_URLS.attest: return {...base, amount: '1', memo: quote.memo, ...(quote.attestation ? {attestation: {...quote.attestation}} : {})};
  }
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export async function executeSigned(ticket: SignTicket, keplr: KeplrSigner, onState: TransactionUpdate, deps: StakingDeps): Promise<StakingReceipt> {
  assertNativeStakingAllowed(ticket.messages, ticket);
  const quote = redeemSignTicket(ticket);
  assertNativeStakingAllowed(quote.messages, quote);
  const config = STAKING_NETWORKS[quote.network];
  if (!config || config.chainId !== quote.chainId) throw new StakingFailure(plainWords(Error('Network or denomination changed.'), {chainId: quote.chainId}), 'FAILED', false);
  const storage = deps.storage();
  if (quote.network === 'real' && !realConfirmedAtOf(readStakingPrefs(storage).data)) throw new StakingFailure({kind: 'other', message: REAL_CONFIRM_FIRST, links: []}, 'FAILED', false);
  const entry = newStakingEntry(journalFields(quote));
  updateStakingJournal(storage, record => withStakingEntry(record, entry));
  let signer: OfflineSigner, chain: SigningChain;
  try {
    signer = await keplr.getOfflineSignerAuto(quote.chainId, {preferNoSetFee: true});
    // A revoke has no Ledger (amino) format in CosmJS 0.38: only a direct signer may sign it (H45).
    if (quote.messages.some(m => m.typeUrl === STAKING_TYPE_URLS.revoke) && typeof (signer as {signDirect?: unknown}).signDirect !== 'function') throw new StakingFailure({kind: 'other', message: REVOKE_NEEDS_DIRECT, links: []}, 'FAILED', false);
    chain = await (deps.connect ?? cosmjsSigningChain)(config.rpcUrl, signer);
  } catch (error) {
    const plain = error instanceof StakingFailure ? error.plain : plainWords(error, {chainId: quote.chainId});
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
      hash: async bytes => { await verifySignedMessages(quote.messages, bytes, quote.memo); await verifySignedFee(quote.fee, bytes); return (signedHash = await txHash(bytes)); },
      persist: async (state, details) => {
        if (state === 'AWAITING_SIGNATURE') return;
        const saved = updateStakingJournal(storage, record => withStakingTransition(record, entry.operationId, {state, ...(details?.hash ? {hash: details.hash} : {}), ...(details?.height ? {height: String(details.height)} : {}), ...(details?.code !== undefined ? {code: details.code} : {})}));
        if (state === 'BROADCASTING' && saved.entries?.find(e => e.operationId === entry.operationId)?.state !== 'BROADCASTING') throw Error('This action cannot be broadcast again.');
      },
      sign: async () => {
        assertNativeStakingAllowed(quote.messages, quote);
        if (Date.now() >= quote.expiresAt) throw Error('The fee estimate expired before signing. Review again; nothing was signed.');
        return chain.sign(quote.address, quote.messages, quote.fee, quote.memo);
      },
      broadcast: async bytes => {
        assertNativeStakingAllowed(quote.messages, quote);
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
          if (tx) { if ((await chain.getChainId()) !== quote.chainId) throw Error('Wrong RPC network during confirmation.'); return (outcome = await verifyStakingReceipt(quote.messages, hash, tx, quote.memo)); }
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

/**
 * Session AK (AFL9, owner amendment A7; `TIER 3 (wallet)`): Keplr Mobile signing over WalletConnect, as a KeplrSigner for
 * executeSigned — the same one signer path, after the same review sheet, sign ticket, mainnet one-time confirm, v6 fee
 * quote and signed-bytes checks. It exists only when this tab's WalletConnect session (lib/wallets/walletconnect.ts) holds
 * an account on the quote's own chain (`cosmos:<chainId>`) AND the wallet approved `cosmos_signDirect` for it; otherwise
 * null, and phones keep Keplr's own browser or read-only linking (Keplr Mobile's support for ZIGChain over WalletConnect
 * is unproven until a real-phone test, docs/research/session-ak/WALLETS.md). The wallet signs exactly the document sent:
 * a `signed` document that differs in any byte (chain, account number, body or fee) is refused before anything is
 * broadcast, and executeSigned's verifySignedMessages / verifySignedFee check the bytes once more. No AI and no other
 * caller reaches it; the review sheet's submit handler is its only user.
 */
export const WC_STAKING_METHODS = Object.freeze(['cosmos_getAccounts', 'cosmos_signDirect'] as const);
type WcLive = {client: unknown; session: {topic: string; namespaces: unknown} | null} | null;
type WcRequester = {request(args: {topic: string; chainId: string; request: {method: string; params: unknown}}): Promise<unknown>};
const b64 = (bytes: Uint8Array) => { let text = ''; for (const byte of bytes) text += String.fromCharCode(byte); return btoa(text); };
const unb64 = (text: unknown) => { if (typeof text !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(text) || text.length > 8192) throw Error('The wallet answered in a form ZIGoals does not read. Nothing was signed.'); let raw: string; try { raw = atob(text); } catch { throw Error('The wallet answered in a form ZIGoals does not read. Nothing was signed.'); } const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; };
export function walletConnectKeplr(live: WcLive, chainId: string): KeplrSigner | null {
  const session = live?.session;
  if (!session || typeof session.topic !== 'string' || !/^[a-z0-9-]{1,64}$/.test(chainId)) return null;
  const caip = `cosmos:${chainId}`, cosmos = (session.namespaces as Record<string, {accounts?: unknown; methods?: unknown}> | null)?.cosmos;
  const methods = Array.isArray(cosmos?.methods) ? cosmos.methods : [], accounts = Array.isArray(cosmos?.accounts) ? cosmos.accounts : [];
  if (!methods.includes('cosmos_signDirect') || !accounts.some(a => typeof a === 'string' && a.startsWith(`${caip}:`))) return null;
  const client = live!.client as WcRequester, ask = (method: string, params: unknown) => client.request({topic: session.topic, chainId: caip, request: {method, params}});
  const read = async () => {
    const answer = await ask('cosmos_getAccounts', {});
    const list = Array.isArray(answer) ? answer as {address?: unknown; algo?: unknown; pubkey?: unknown}[] : [];
    const first = list[0];
    if (!first || typeof first.address !== 'string' || first.algo !== 'secp256k1') throw Error('The wallet shared no ZIGChain account. Nothing was signed.');
    return [{address: first.address, algo: 'secp256k1' as const, pubkey: unb64(first.pubkey)}];
  };
  const signer = {
    getAccounts: read,
    signDirect: async (signerAddress: string, signDoc: {chainId: string; accountNumber: bigint; authInfoBytes: Uint8Array; bodyBytes: Uint8Array}) => {
      const sent = {chainId: signDoc.chainId, accountNumber: signDoc.accountNumber.toString(), authInfoBytes: b64(signDoc.authInfoBytes), bodyBytes: b64(signDoc.bodyBytes)};
      if (sent.chainId !== chainId) throw Error('Wrong network. Nothing was signed.');
      const answer = await ask('cosmos_signDirect', {signerAddress, signDoc: sent}) as {signed?: Record<string, unknown>; signature?: {pub_key?: {type?: unknown; value?: unknown}; signature?: unknown}} | null;
      const signed = answer?.signed, signature = answer?.signature;
      if (!signed || String(signed.chainId) !== sent.chainId || String(signed.accountNumber) !== sent.accountNumber || signed.authInfoBytes !== sent.authInfoBytes || signed.bodyBytes !== sent.bodyBytes)
        throw Error('The wallet changed what it was asked to sign (the network, the account, the actions or the fee). Nothing was broadcast.');
      if (!signature || typeof signature.signature !== 'string' || typeof signature.pub_key?.value !== 'string' || unb64(signature.signature).length !== 64) throw Error('The wallet answered in a form ZIGoals does not read. Nothing was signed.');
      return {signed: signDoc, signature: {pub_key: {type: String(signature.pub_key.type ?? 'tendermint/PubKeySecp256k1'), value: signature.pub_key.value}, signature: signature.signature}};
    },
  };
  return {getKey: async () => ({bech32Address: (await read())[0]!.address}), getOfflineSignerAuto: async () => signer as unknown as OfflineSigner};
}
