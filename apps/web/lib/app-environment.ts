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
