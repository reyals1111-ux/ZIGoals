import type {Confirmed} from '../transaction';
import {STAKING_TYPE_URLS, type StakingMessage} from './messages';

/**
 * Session AF (ADR-028 H4, H61; `TIER 3 (wallet/signing)`): what the wallet signed and what the chain recorded must be the
 * reviewed messages, byte for byte. Checked twice: on the signed bytes before anything is broadcast (a wallet that
 * changed a message is refused), and on the receipt (its hash is the SHA-256 of the signed bytes, its body the reviewed
 * messages, and a successful one carries each message's own staking event). The fee is not compared: the wallet may
 * raise it, and the review says so. cosmjs-types and the registry load with the signer, never with the page.
 */
export async function txHash(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const equalBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((v, i) => v === b[i]);
export const SIGNED_DIFFERENT = 'The wallet signed something other than what you reviewed, so it was not sent.';
/** The signed TxRaw's body is exactly the reviewed messages: same types, same encoded values, no memo, no extensions. */
export async function verifySignedMessages(expected: readonly StakingMessage[], txRawBytes: Uint8Array): Promise<void> {
  const [{TxRaw, TxBody}, {Registry}, {defaultRegistryTypes}] = await Promise.all([import('cosmjs-types/cosmos/tx/v1beta1/tx'), import('@cosmjs/proto-signing'), import('@cosmjs/stargate')]);
  if (!(txRawBytes instanceof Uint8Array) || txRawBytes.length > 1024 * 1024) throw Error(SIGNED_DIFFERENT);
  let body;
  try { body = TxBody.decode(TxRaw.decode(txRawBytes).bodyBytes); } catch { throw Error(SIGNED_DIFFERENT); }
  const registry = new Registry(defaultRegistryTypes);
  const wanted = expected.map(m => registry.encodeAsAny(m));
  if (body.memo !== '' || body.timeoutHeight !== 0n || body.extensionOptions.length || body.nonCriticalExtensionOptions.length || body.messages.length !== wanted.length) throw Error(SIGNED_DIFFERENT);
  body.messages.forEach((m, i) => { if (m.typeUrl !== wanted[i]!.typeUrl || !equalBytes(m.value, wanted[i]!.value)) throw Error(SIGNED_DIFFERENT); });
}
export type ChainTx = {hash: string; height: number; code: number; tx: Uint8Array; events: readonly {type: string; attributes: readonly {key: string; value: string}[]}[]};
/** The event each message leaves when it succeeds, and the attribute that names its validator or proposal. */
function expectedEvent(m: StakingMessage): {type: string; key: string; value: string} {
  switch (m.typeUrl) {
    case STAKING_TYPE_URLS.delegate: return {type: 'delegate', key: 'validator', value: m.value.validatorAddress};
    case STAKING_TYPE_URLS.undelegate: return {type: 'unbond', key: 'validator', value: m.value.validatorAddress};
    case STAKING_TYPE_URLS.redelegate: return {type: 'redelegate', key: 'destination_validator', value: m.value.validatorDstAddress};
    case STAKING_TYPE_URLS.claim: return {type: 'withdraw_rewards', key: 'validator', value: m.value.validatorAddress};
    case STAKING_TYPE_URLS.vote: return {type: 'proposal_vote', key: 'proposal_id', value: m.value.proposalId.toString()};
  }
}
export const RECEIPT_MISMATCH = 'The chain\'s record of this transaction does not match what you signed. Check it on the explorer.';
export async function verifyStakingReceipt(expected: readonly StakingMessage[], hash: string, receipt: ChainTx): Promise<Confirmed> {
  if (!/^[0-9A-F]{64}$/.test(hash) || typeof receipt?.hash !== 'string' || receipt.hash.toUpperCase() !== hash || !(receipt.tx instanceof Uint8Array) || (await txHash(receipt.tx)) !== hash) throw Error(RECEIPT_MISMATCH);
  if (!Number.isSafeInteger(receipt.height) || receipt.height <= 0 || !Number.isSafeInteger(receipt.code) || receipt.code < 0 || receipt.code > 0xffffffff) throw Error(RECEIPT_MISMATCH);
  await verifySignedMessages(expected, receipt.tx).catch(() => { throw Error(RECEIPT_MISMATCH); });
  if (!Array.isArray(receipt.events) || receipt.events.length > 2000) throw Error(RECEIPT_MISMATCH);
  type Attribute = {key: unknown; value: unknown};
  const events = receipt.events.map(e => {
    const attributes: readonly Attribute[] = Array.isArray(e.attributes) ? e.attributes.slice(0, 64) : [];
    return {type: String(e.type), attributes: attributes.map(a => ({key: String(a.key), value: String(a.value)}))};
  });
  // A failed transaction applied nothing, so it has no module events to check; its code is reported as the outcome.
  if (receipt.code === 0) for (const m of expected) {
    const want = expectedEvent(m);
    if (!events.some(e => e.type === want.type && e.attributes.some((a: {key: string; value: string}) => a.key === want.key && a.value === want.value))) throw Error(RECEIPT_MISMATCH);
  }
  return {hash, height: receipt.height, code: receipt.code, events};
}
