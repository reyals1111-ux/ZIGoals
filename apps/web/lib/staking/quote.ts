import {formatUnits, safeMaximum} from '@zigoals/chain-config';
import {STAKING_NETWORKS, UNBONDING_SECONDS, assertNetworkEvidence, feeModelFor, type StakingNetwork} from '@zigoals/chain-config/networks';
import {BASE_FEE_ABCI_PATH, BASE_FEE_UNREADABLE, decodeBaseFeeResponse, parseBaseFee, quotedGasPrice, type FeeModel} from '@zigoals/chain-config/reviewed-versions';
import {toBase64} from '@cosmjs/encoding';
import {assertSigningMessages} from '../app-environment';
import {STAKING_TYPE_URLS, assertStakingMessages, liquidSpend, type StakingActionKind, type StakingMessage} from './messages';
import {registerQuote} from './sign-gate';

/**
 * Session AF (ADR-028 H37, H61, H74; `TIER 3 (wallet/signing)`): the fee quote before the review screen. Simulation only:
 * it reads the chain through the RPC the browser later signs through (rpc.zigchain.com or testnet-rpc.zigchain.com) and
 * asks the wallet for nothing but its public key (`getKey`), so no signer exists until the person presses Sign
 * (lib/staking/execute.ts). The CosmJS read client loads here, on the first Review press, never with the page.
 *
 * Before any number is shown the chain's own evidence is checked (chain id, a reviewed version, bond denom azig, 21-day
 * unbonding, the 18-decimal display unit; fails closed). The fee is ceil(simulated gas × 1.3) × the gas price, in azig.
 * Session AJ (ADR-035 P3, A1, A2; `TIER 3 (wallet)`): the gas price follows the version the node reports AT THIS QUOTE
 * (never a value kept from page load, so a v5→v6 upgrade while the page is open can never sign with the old model):
 * v5.1 → the fixed 2.5 Gazig minimum; v6.0 → max(2.5 Gazig, ceil(base fee × 1.5)), the base fee read through the same
 * RPC (`abci_query` of x/feemarket's BaseFee); an unreadable base fee refuses the quote. The fee quoted is the fee
 * signed: the signer is asked with `preferNoSetFee`, and the signed bytes must carry exactly this fee (receipt.ts), so
 * a wallet that changes it is refused before anything is sent. The liquid balance must cover the fee, plus the amount
 * for a delegation; `safeMax` is the balance with the fee kept back. A quote lives 60 seconds and is registered with the
 * sign gate, so only a quote made here can ever be signed.
 */
export const QUOTE_TTL_MS = 60_000;
export const GAS_MULTIPLIER = 1.3;
export const MAX_GAS = 10_000_000;
export type StakingQuote = Readonly<{
  network: StakingNetwork;
  chainId: string;
  address: string;
  action: StakingActionKind;
  messages: readonly StakingMessage[];
  /** Simulated gas, and the limit signed: ceil(gas × 1.3). */
  gasUsed: number;
  gasLimit: number;
  fee: Readonly<{amount: readonly Readonly<{denom: 'azig'; amount: string}>[]; gas: string}>;
  feeAmount: string;
  /** The gas price signed, in azig per gas (Session AJ: from the fee model of the version read at this quote). */
  gasPrice: string;
  /** The fee model of that version, and on v6 the base fee read at this quote (azig per gas). */
  feeModel: FeeModel;
  baseFee?: string;
  balance: string;
  safeMax: string;
  /** ZIG leaving the liquid balance (delegations), in azig. */
  spend: string;
  unbondingSeconds: number;
  isLedger: boolean;
  /** The transaction memo: empty for every staking action; a practice badge's code (Session AF chunk 3, D4). */
  memo: string;
  /** A practice badge's own record for this device's journal (its note and salt never leave the device). */
  attestation?: Readonly<{kind: 'commitment' | 'badge'; note: string; salt?: string}>;
  version: string;
  revision: number;
  quotedAt: number;
  expiresAt: number;
}>;
/** The reads a quote needs; the default is CosmJS's read-only StargateClient over the network's RPC. */
export interface QuoteChain {
  getChainId(): Promise<string>;
  evidence(): Promise<{version: unknown; bondDenom: unknown; unbondingSeconds: unknown; metadata: unknown}>;
  getSequence(address: string): Promise<number>;
  getBalance(address: string): Promise<string>;
  simulate(messages: readonly StakingMessage[], pubKey: Uint8Array, sequence: number, memo?: string): Promise<number>;
  /** v6's x/feemarket base fee as the chain stores it (a LegacyDec scaled by 10^18), read at this quote. */
  baseFee(): Promise<string>;
  disconnect(): void;
}
/** The one wallet call a quote makes: the connected account's public key. */
export type KeplrKeyReader = {getKey(chainId: string): Promise<{bech32Address?: unknown; pubKey?: unknown; algo?: unknown; isNanoLedger?: unknown}>};
export class QuoteRefused extends Error {}

/** The node's application version from its own `/abci_info` (CosmJS's Comet client drops that field); a plain GET. */
async function abciVersion(rpcUrl: string): Promise<unknown> {
  const response = await fetch(`${rpcUrl}/abci_info`, {method: 'GET', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12_000)});
  if (!response.ok) throw new QuoteRefused('The network did not answer just now. Nothing was signed.');
  const text = await response.text();
  if (text.length > 100_000) throw new QuoteRefused('The network answer was too large. Nothing was signed.');
  return (JSON.parse(text) as {result?: {response?: {version?: unknown}}} | null)?.result?.response?.version;
}
async function cosmjsQuoteChain(rpcUrl: string): Promise<QuoteChain> {
  const [{StargateClient, defaultRegistryTypes}, {Registry}] = await Promise.all([import('@cosmjs/stargate'), import('@cosmjs/proto-signing')]);
  const client = await StargateClient.connect(rpcUrl);
  // StargateClient keeps its query and Comet clients protected; these reads are its own, over the same connection.
  const inner = client as unknown as {
    forceGetQueryClient(): {
      bank: {denomMetadata(denom: string): Promise<{base: string; display: string; denomUnits: {denom: string; exponent: number}[]}>};
      staking: {params(): Promise<{params?: {bondDenom: string; unbondingTime?: {seconds: bigint}}}>};
      tx: {simulate(messages: readonly unknown[], memo: string, signer: {type: string; value: string}, sequence: number): Promise<{gasInfo?: {gasUsed: bigint}}>};
      queryAbci(path: string, request: Uint8Array): Promise<{value: Uint8Array}>;
    };
  };
  const registry = new Registry(defaultRegistryTypes);
  return {
    getChainId: () => client.getChainId(),
    async evidence() {
      const query = inner.forceGetQueryClient();
      const [version, params, metadata] = await Promise.all([abciVersion(rpcUrl), query.staking.params(), query.bank.denomMetadata('azig')]);
      const seconds = params.params?.unbondingTime?.seconds;
      return {version, bondDenom: params.params?.bondDenom, unbondingSeconds: typeof seconds === 'bigint' ? Number(seconds) : Number.NaN,
        metadata: {base: metadata.base, display: metadata.display, denom_units: metadata.denomUnits.map(u => ({denom: u.denom, exponent: u.exponent}))}};
    },
    getSequence: async address => (await client.getSequence(address)).sequence,
    getBalance: async address => (await client.getBalance(address, 'azig')).amount,
    async simulate(messages, pubKey, sequence, memo = '') {
      const response = await inner.forceGetQueryClient().tx.simulate(messages.map(m => registry.encodeAsAny(m)), memo, {type: 'tendermint/PubKeySecp256k1', value: toBase64(pubKey)}, sequence);
      return Number(response.gasInfo?.gasUsed ?? 0n);
    },
    async baseFee() {
      const answer = await inner.forceGetQueryClient().queryAbci(BASE_FEE_ABCI_PATH, new Uint8Array());
      return decodeBaseFeeResponse(answer.value);
    },
    disconnect: () => client.disconnect(),
  };
}
export type QuoteInput = {network: StakingNetwork; address: string; action: StakingActionKind; messages: readonly StakingMessage[]; keplr: KeplrKeyReader; revision: number; memo?: string; attestation?: StakingQuote['attestation']};
export async function quoteStaking(input: QuoteInput, connect: (rpcUrl: string) => Promise<QuoteChain> = cosmjsQuoteChain): Promise<StakingQuote> {
  const config = STAKING_NETWORKS[input.network];
  if (!config) throw new QuoteRefused('Choose the practice or the real network first.');
  assertStakingMessages(input.messages, input.address);
  // Session AF chunk 3 (H60): a rewards sweep is exactly one delegation, to a validator the rewards wait with.
  if (input.action === 'sweep' && (input.messages.length !== 1 || input.messages[0]!.typeUrl !== STAKING_TYPE_URLS.delegate)) throw new QuoteRefused('A restake of rewards is one delegation. Nothing was signed.');
  // Session AF chunk 3: a revoke or a practice badge only as its own action; the build's own gate (the signer runs it
  // again) refuses a badge off the practice network, to anyone else, of any other amount or with any other memo.
  if ((input.action === 'revoke') !== input.messages.some(m => m.typeUrl === STAKING_TYPE_URLS.revoke) || (input.action === 'attest') !== input.messages.some(m => m.typeUrl === STAKING_TYPE_URLS.attest)) throw new QuoteRefused('Nothing to sign.');
  const memo = input.memo ?? '';
  assertSigningMessages(input.messages, {chainId: config.chainId, memo});
  const key = await input.keplr.getKey(config.chainId);
  if (key?.bech32Address !== input.address) throw new QuoteRefused('Your wallet switched accounts. Connect again before reviewing.');
  if (!(key.pubKey instanceof Uint8Array) || key.pubKey.length !== 33 || (key.algo !== undefined && key.algo !== 'secp256k1')) throw new QuoteRefused('This wallet account cannot sign ZIGChain staking here.');
  assertSigningMessages(input.messages, {chainId: config.chainId, memo, isLedger: key.isNanoLedger === true});
  const chain = await connect(config.rpcUrl);
  try {
    if ((await chain.getChainId()) !== config.chainId) throw new QuoteRefused('Wrong RPC network. Nothing was signed.');
    const evidence = await chain.evidence();
    const version = assertNetworkEvidence(input.network, {chainId: config.chainId, ...evidence});
    // A2: the fee model of the version just read, and on v6 the base fee read now (never cached between quotes).
    const feeModel = feeModelFor(input.network, version);
    let baseFee: bigint | undefined;
    if (feeModel === 'base-fee') {
      let raw: string;
      try { raw = await chain.baseFee(); } catch { throw new QuoteRefused(BASE_FEE_UNREADABLE); }
      try { baseFee = parseBaseFee(raw, 'scaled'); } catch (error) { throw new QuoteRefused(error instanceof Error ? error.message : BASE_FEE_UNREADABLE); }
    }
    const gasPrice = quotedGasPrice(feeModel, baseFee).toString();
    const sequence = await chain.getSequence(input.address);
    const gasUsed = await chain.simulate(input.messages, key.pubKey, sequence, memo);
    if (!Number.isSafeInteger(gasUsed) || gasUsed <= 0 || gasUsed > MAX_GAS) throw new QuoteRefused('The simulation did not give a usable gas estimate. Nothing was signed.');
    const gasLimit = Math.ceil(gasUsed * GAS_MULTIPLIER);
    const feeAmount = (BigInt(gasLimit) * BigInt(gasPrice)).toString();
    const balance = await chain.getBalance(input.address);
    if (!/^\d{1,78}$/.test(balance)) throw new QuoteRefused('The balance read was not usable. Nothing was signed.');
    // A sweep's ZIG comes from the rewards the chain pays out in the same transaction (the delegation claims them first),
    // so only the fee must be in the balance; the simulation above already ran the whole transaction against the chain.
    const spend = input.action === 'sweep' ? 0n : liquidSpend(input.messages);
    const decimals = config.nativeAsset.decimals;
    if (BigInt(balance) < BigInt(feeAmount) + spend)
      throw new QuoteRefused(`Keep enough ZIG for this and its network fee. Network fee: about ${formatUnits(feeAmount, decimals)} ZIG. Available after the fee: ${formatUnits(safeMaximum(balance, feeAmount), decimals)} ZIG.`);
    const quotedAt = Date.now();
    return registerQuote(Object.freeze({
      network: input.network, chainId: config.chainId, address: input.address, action: input.action,
      messages: Object.freeze([...input.messages]), gasUsed, gasLimit,
      fee: Object.freeze({amount: Object.freeze([Object.freeze({denom: 'azig' as const, amount: feeAmount})]), gas: String(gasLimit)}),
      feeAmount, gasPrice, feeModel, ...(baseFee !== undefined ? {baseFee: baseFee.toString()} : {}), balance, safeMax: safeMaximum(balance, feeAmount), spend: spend.toString(),
      unbondingSeconds: UNBONDING_SECONDS, isLedger: key.isNanoLedger === true, memo, ...(input.attestation ? {attestation: Object.freeze({...input.attestation})} : {}), version, revision: input.revision,
      quotedAt, expiresAt: quotedAt + QUOTE_TTL_MS,
    }));
  } finally { chain.disconnect(); }
}
