/** Build-time only; URL, storage and wallet state never select this policy. */
export function parseAppEnvironment(value: unknown) {
  return value === "LOCAL_DEMO" ||
    value === "PUBLIC_ALPHA_UNDEPLOYED" ||
    value === "TESTNET_DEPLOYED"
    ? value : "INVALID_CONFIGURATION";
}
export const APP_ENVIRONMENT = parseAppEnvironment(
  process.env.NEXT_PUBLIC_APP_ENVIRONMENT,
);
export const FINANCIAL_EXECUTION_ALLOWED =
  APP_ENVIRONMENT === "TESTNET_DEPLOYED";
export function assertFinancialExecutionAllowed() {
  if (!FINANCIAL_EXECUTION_ALLOWED)
    throw Error(
      "Financial actions are unavailable in this build. Use local simulation; Keplr is connection-only.",
    );
}
/**
 * Session AF (ADR-028 H4, H46, H85; `TIER 3 (wallet/signing)`): native staking signs in the person's own wallet on both
 * networks, in every valid build (the public Alpha included). It gates exactly the native module messages below, and only
 * through the review screen (lib/staking/execute.ts, guarded by lib/staking/staking-guard.test.ts). Contract execution
 * (the Goal Manager path above, FINANCIAL_EXECUTION_ALLOWED) is unchanged and stays off on the Alpha; nothing that executes
 * a contract or leaves the chain is in this list.
 */
export const NATIVE_STAKING_SIGNING_ALLOWED =
  APP_ENVIRONMENT === "LOCAL_DEMO" ||
  APP_ENVIRONMENT === "PUBLIC_ALPHA_UNDEPLOYED" ||
  APP_ENVIRONMENT === "TESTNET_DEPLOYED";
export const NATIVE_STAKING_TYPE_URLS: readonly string[] = Object.freeze([
  "/cosmos.staking.v1beta1.MsgDelegate",
  "/cosmos.staking.v1beta1.MsgUndelegate",
  "/cosmos.staking.v1beta1.MsgBeginRedelegate",
  "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
  "/cosmos.gov.v1beta1.MsgVote",
  // Session AF chunk 3 (ADR-028 H45, H46): ending an authz grant the person gave; direct (non-Ledger) signers only.
  "/cosmos.authz.v1beta1.MsgRevoke",
]);
export const NATIVE_STAKING_REFUSED =
  "Staking is unavailable in this build. Nothing was signed.";
export const NOT_A_STAKING_MESSAGE =
  "Only staking, claiming rewards, votes and ending a permission you gave can be signed here. Nothing was signed.";
/**
 * Session AF chunk 3 (ADR-028 D4, H48; `TIER 3 (wallet/signing)`): practice badges. A bank send is NOT a staking message
 * and is refused everywhere, except as an attestation, which must be all of: the one message of its transaction, on
 * ZIGChain Testnet (zig-test-2) only, from the signer's address to the same address, of exactly 1 azig, with a memo that
 * is only a ZIGoals salted commitment (64 lowercase hex) or an opaque badge id (32 lowercase hex). Mainnet waits for the
 * owner's privacy review (H48). The lead records this testnet-only exception as an ADR-028 row.
 */
export const ATTESTATION_TYPE_URL = "/cosmos.bank.v1beta1.MsgSend";
export const ATTESTATION_CHAIN_ID = "zig-test-2";
export const ATTESTATION_MEMO = /^zigoals:att:v1:(?:c:[0-9a-f]{64}|b:[0-9a-f]{32})$/;
export const NOT_AN_ATTESTATION =
  "Only a practice badge can be sent here: 1 azig to your own address on the practice network, with a ZIGoals code as its memo. Nothing was signed.";
export const REVOKE_NEEDS_DIRECT =
  "A Ledger account cannot sign a revoke here: ZIGoals' signing library has no Ledger format for it. Nothing was signed.";
/** What the signature is for, beyond its messages: the network, the memo, and whether a Ledger signs. */
export type SigningContext = { readonly chainId?: unknown; readonly memo?: unknown; readonly isLedger?: unknown };
type SigningMessage = { readonly typeUrl: string; readonly value?: unknown };
/** Throws unless this build may sign native staking and every message given is one of the allowed types (and, for a
 *  practice badge, every one of its rules holds); a staking signature carries no memo. */
export function assertNativeStakingAllowed(
  messages: readonly SigningMessage[] = [],
  context: SigningContext = {},
) {
  if (!NATIVE_STAKING_SIGNING_ALLOWED) throw Error(NATIVE_STAKING_REFUSED);
  assertSigningMessages(messages, context);
}
/** The message rules alone, without the build check: the quote runs them before any number is shown; the signer runs
 *  them again inside assertNativeStakingAllowed (with the build check) at its start, its signature and its broadcast. */
export function assertSigningMessages(
  messages: readonly SigningMessage[] = [],
  context: SigningContext = {},
) {
  // Only sends, and nothing else: a practice badge's rules decide. A send beside anything else is not a staking message.
  if (messages.length > 0 && messages.every((m) => m?.typeUrl === ATTESTATION_TYPE_URL)) return assertAttestationAllowed(messages, context);
  if (context.memo !== undefined && context.memo !== "") throw Error(NOT_A_STAKING_MESSAGE);
  for (const message of messages)
    if (!NATIVE_STAKING_TYPE_URLS.includes(message?.typeUrl))
      throw Error(NOT_A_STAKING_MESSAGE);
  if (context.isLedger === true && messages.some((m) => m.typeUrl === "/cosmos.authz.v1beta1.MsgRevoke"))
    throw Error(REVOKE_NEEDS_DIRECT);
}
const ZIG_ACCOUNT = /^zig1[02-9ac-hj-np-z]{38}$/;
const keysOf = (value: object) => Object.keys(value).sort().join(",");
/** The practice badge's rules, all of them (see ATTESTATION_TYPE_URL); throws NOT_AN_ATTESTATION otherwise. */
export function assertAttestationAllowed(messages: readonly SigningMessage[], context: SigningContext) {
  const [message] = messages;
  const value = message?.value as { fromAddress?: unknown; toAddress?: unknown; amount?: unknown } | null | undefined;
  const coins = value?.amount;
  const coin = Array.isArray(coins) && coins.length === 1 ? (coins[0] as { denom?: unknown; amount?: unknown } | null) : null;
  if (
    messages.length !== 1 ||
    message?.typeUrl !== ATTESTATION_TYPE_URL ||
    context.chainId !== ATTESTATION_CHAIN_ID ||
    !value || typeof value !== "object" || keysOf(value) !== "amount,fromAddress,toAddress" ||
    typeof value.fromAddress !== "string" || !ZIG_ACCOUNT.test(value.fromAddress) ||
    value.toAddress !== value.fromAddress ||
    !coin || typeof coin !== "object" || keysOf(coin) !== "amount,denom" || coin.denom !== "azig" || coin.amount !== "1" ||
    typeof context.memo !== "string" || !ATTESTATION_MEMO.test(context.memo)
  )
    throw Error(NOT_AN_ATTESTATION);
}
