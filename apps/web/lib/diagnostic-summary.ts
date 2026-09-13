import { parseAppEnvironment } from "./app-environment";
/** Explicit safe fields only; never pass state, errors, account or plan objects. */
export function diagnosticSummary(input: {
  environment: string; version: string; commit: string; scope: string;
  rpc: string; rest: string; checkedAt?: string;
}) {
  const health = (value: string) => ["healthy", "unavailable", "not checked"].includes(value) ? value : "not checked";
  const checked = input.checkedAt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(input.checkedAt) && Number.isFinite(Date.parse(input.checkedAt)) ? input.checkedAt : "Not checked";
  return ["ZIGoals Alpha diagnostics", `Build mode: ${parseAppEnvironment(input.environment)}`,
    `Version: ${/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(input.version) ? input.version : "Unknown"}`,
    `Commit: ${/^[a-f0-9]{40}$/.test(input.commit) ? input.commit : "Unknown"}`,
    `Session: ${input.scope === "local" ? "Local simulation" : input.scope === "testnet" ? "Keplr testnet connection" : "Unknown"}`,
    `RPC: ${health(input.rpc)}`, `REST: ${health(input.rest)}`, `Checked UTC: ${checked}`,
    "No account, balance, goal, backup or raw error data included."].join("\n");
}
