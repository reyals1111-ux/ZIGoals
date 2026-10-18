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
]);
export const NATIVE_STAKING_REFUSED =
  "Staking is unavailable in this build. Nothing was signed.";
export const NOT_A_STAKING_MESSAGE =
  "Only staking, claiming rewards and votes can be signed here. Nothing was signed.";
/** Throws unless this build may sign native staking and every message given is one of the five allowed types. */
export function assertNativeStakingAllowed(
  messages: readonly { typeUrl: string }[] = [],
) {
  if (!NATIVE_STAKING_SIGNING_ALLOWED) throw Error(NATIVE_STAKING_REFUSED);
  for (const message of messages)
    if (!NATIVE_STAKING_TYPE_URLS.includes(message?.typeUrl))
      throw Error(NOT_A_STAKING_MESSAGE);
}
