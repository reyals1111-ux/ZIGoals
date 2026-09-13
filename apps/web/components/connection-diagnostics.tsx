"use client";
import { useEffect, useRef, useState } from "react";
import { TESTNET, formatUnits } from "@zigoals/chain-config";
import { APP_ENVIRONMENT } from "../lib/app-environment";
import { diagnosticSummary } from "../lib/diagnostic-summary";
import { deployment } from "../lib/deployment-config";
import {
  readDiagnostics,
  shortAccount,
  type Diagnostics,
} from "../lib/diagnostics";
import { explorers } from "@zigoals/ecosystem-registry";
export function ConnectionDiagnostics({
  chain,
  owner,
  balance,
}: {
  chain: string;
  owner: string;
  balance: string;
}) {
  const [result, setResult] = useState<Diagnostics | null>(null);
  const [checking, setChecking] = useState(false);
  const generation = useRef(0);
  const [copyStatus, setCopyStatus] = useState("");
  const [fallback, setFallback] = useState("");
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  async function refresh() {
    const id = ++generation.current;
    setChecking(true);
    try {
      const next = await readDiagnostics();
      if (id === generation.current) setResult(next);
    } finally {
      if (id === generation.current) setChecking(false);
    }
  }
  async function copySummary() {
    const summary = diagnosticSummary({
      environment: APP_ENVIRONMENT,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "",
      commit: process.env.NEXT_PUBLIC_APP_COMMIT ?? "",
      scope: chain === TESTNET.chainId ? "testnet" : "local",
      rpc: result ? result.rpc.ok ? "healthy" : "unavailable" : "not checked",
      rest: result ? result.rest.ok ? "healthy" : "unavailable" : "not checked",
      checkedAt: result?.checkedAt,
    });
    const id = generation.current;
    try {
      await navigator.clipboard.writeText(summary);
      if (id === generation.current) {
        setCopyStatus("Safe diagnostic summary copied.");
        setFallback("");
      }
    } catch {
      if (id === generation.current) {
        setFallback(summary);
        setCopyStatus("Clipboard unavailable. Select and copy the safe summary below.");
      }
    }
  }
  const manifest = deployment.success ? deployment.data : null;
  return (
    <section className="panel" aria-label="Connection diagnostics">
      <h2>Connection diagnostics</h2>
      <p>
        Read-only network checks. Mode selection applies to this tab. A healthy
        network does not enable an undeployed contract.
      </p>
      <dl className="metrics">
        <div>
          <dt>Environment</dt>
          <dd>{chain === TESTNET.chainId ? "TESTNET" : "LOCAL SIMULATION"}</dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>{shortAccount(owner)}</dd>
        </div>
        <div>
          <dt>
            {chain === TESTNET.chainId
              ? "Wallet balance"
              : "Simulated wallet balance"}
          </dt>
          <dd>{formatUnits(balance, 18)} ZIG</dd>
        </div>
        <div>
          <dt>Expected chain / asset</dt>
          <dd>zig-test-2 · azig · 18 decimals</dd>
        </div>
        <div>
          <dt>RPC</dt>
          <dd className="break-anywhere">
            {TESTNET.rpcUrl}
            <br />
            {result?.rpc.detail ?? "Not checked"}
          </dd>
        </div>
        <div>
          <dt>REST</dt>
          <dd className="break-anywhere">
            {TESTNET.restUrl}
            <br />
            {result?.rest.detail ?? "Not checked"}
          </dd>
        </div>
        <div>
          <dt>Goal Manager</dt>
          <dd className="break-anywhere">
            {!manifest
              ? "INVALID CONFIGURATION · actions disabled"
              : manifest.status === "DEPLOYED"
                ? manifest.contractAddress
                : "NOT DEPLOYED"}
          </dd>
        </div>
        <div>
          <dt>Code ID</dt>
          <dd>{manifest?.codeId ?? "NOT DEPLOYED"}</dd>
        </div>
        <div>
          <dt>Expected artifact SHA256</dt>
          <dd className="break-anywhere">
            {manifest?.wasmSha256 ?? "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Current chain checksum</dt>
          <dd>
            {manifest?.status === "DEPLOYED"
              ? (result?.contract.checksum ??
                result?.contract.detail ??
                "Not checked")
              : "NOT DEPLOYED"}
          </dd>
        </div>
        <div>
          <dt>Explorer providers</dt>
          <dd>{explorers.map((e) => e.name).join(" · ")}</dd>
        </div>
        <div>
          <dt>App version / build commit</dt>
          <dd className="break-anywhere">
            {process.env.NEXT_PUBLIC_APP_VERSION ?? "Development"} ·{" "}
            {process.env.NEXT_PUBLIC_APP_COMMIT ?? "Unknown"}
            {process.env.NEXT_PUBLIC_APP_DIRTY === "true"
              ? " (working changes)"
              : ""}
          </dd>
        </div>
        <div>
          <dt>Network verification time (UTC)</dt>
          <dd>{result?.checkedAt ?? "Not checked"}</dd>
        </div>
      </dl>
      <button
        className="secondary"
        onClick={() => void refresh()}
        disabled={checking}
      >
        {checking ? "Checking public endpoints…" : "Check connection"}
      </button>
      <button className="secondary" onClick={() => void copySummary()}>Copy safe diagnostics</button>
      <p role="status">{copyStatus}</p>
      {fallback && (
        <label>
          Safe diagnostic summary
          <textarea readOnly value={fallback} rows={11}
            onFocus={event => event.currentTarget.select()} />
        </label>
      )}
      <p className="fine" role="status">
        Checks query public RPC/REST endpoints. No wallet approval or
        transaction is requested. Endpoint responses are trusted observations,
        not independent consensus proofs.
      </p>
    </section>
  );
}
