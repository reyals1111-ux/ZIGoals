"use client";
import { APP_ENVIRONMENT, FINANCIAL_EXECUTION_ALLOWED } from "../lib/app-environment";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
import { useGoals } from "./goal-provider";
import { ExplorerLinks } from "./explorer-links";
export function Shell({ children }: { children: ReactNode }) {
  const s = useGoals();
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (s.pending) dialog.current?.showModal();
  }, [s.pending]);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="network-banner">
        <strong>ZIGCHAIN TESTNET · PUBLIC ALPHA</strong>
        <span>{FINANCIAL_EXECUTION_ALLOWED ? "Testnet assets have no monetary value." : "Simulation + wallet connection only. No blockchain transactions or financial signatures."}</span>
      </div>
      <header>
        <Link href="/app" className="brand" aria-label="ZIGoals home">
          ZIG<span>oals</span>
          <small>ALPHA</small>
        </Link>
        <nav aria-label="Main navigation">
          {[
            ["/app", "Goals"],
            ["/app/activity", "Activity"],
            ["/app/settings", "Settings"],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href!}
              aria-current={path === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="wallet">
          <button
            className="quiet"
            onClick={s.useLocal}
            disabled={s.busy}
            aria-pressed={s.mode === "local"}
          >
            Local demo
          </button>
          <button
            className="secondary"
            onClick={() => void s.connect()}
            disabled={
              s.busy || ["CONNECTING", "ADDING_TESTNET"].includes(s.walletState)
            }
          >
            {s.walletState === "CONNECTING"
              ? "Connecting…"
              : s.walletState === "ADDING_TESTNET"
                ? "Adding testnet…"
                : s.walletState === "CONNECTED"
                  ? `${s.owner.slice(0, 8)}…${s.owner.slice(-4)}`
                  : "Connect Keplr"}
          </button>
        </div>
      </header>
      <div className="workspace">
        <div className="mode-strip">
          <span className="mode-dot" />
          {s.mode === "local"
            ? "LOCAL SIMULATION · Mode: this tab · Stored in this browser · No blockchain transactions"
            : `KEPLR TESTNET · Mode: this tab · ${FINANCIAL_EXECUTION_ALLOWED ? "Testnet" : "CONNECTION ONLY · Financial actions unavailable"} · ${s.walletState.replaceAll("_", " ").toLowerCase()}`}
          <span className="wallet-balance">
            {formatUnits(s.balance, TESTNET.nativeAsset.decimals)} ZIG{" "}
            {s.mode === "local" ? "demo balance" : "wallet balance"}
          </span>
        </div>
        {s.error && (
          <div role="alert" className="alert">
            {s.error}
            <button
              className="quiet"
              onClick={() => s.setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
        {s.message && (
          <div role="status" className="notice">
            {s.message}
          </div>
        )}
        {s.journalWarnings.map((warning) => (
          <div key={warning} className="notice" role="alert">
            {warning}
          </div>
        ))}
        {s.transactionOutcomes.length > 0 && (
          <section aria-label="Testnet transaction outcomes" aria-live="polite">
            {s.transactionOutcomes.map((tx) => (
              <div className="notice" key={tx.id}>
                <div>
                  <strong>
                    {tx.action[0]!.toUpperCase() + tx.action.slice(1)}{" "}
                    transaction · {tx.chain}
                  </strong>
                  <p style={{ overflowWrap: "anywhere" }}>
                    Submitting wallet: {tx.owner}
                  </p>
                  <p>
                    {tx.state === "SUCCESS"
                      ? `Confirmed on testnet at block ${tx.height}.`
                      : tx.uncertain
                        ? `Confirmation is uncertain. Funds may have moved. Check ${tx.hash ? "this transaction" : "your wallet history"} before trying again. ${tx.message ?? ""}`
                        : tx.state === "REJECTED"
                          ? "Cancelled in your wallet. No transaction was broadcast."
                          : (tx.message ??
                            tx.state.replaceAll("_", " ").toLowerCase())}
                  </p>
                  {tx.hash && (
                    <div>
                      <p style={{ overflowWrap: "anywhere" }}>
                        Transaction {tx.hash}
                      </p>
                      <ExplorerLinks
                        chainId={tx.chain}
                        kind="transaction"
                        identifier={tx.hash}
                      />
                    </div>
                  )}
                  {tx.note && <p>{tx.note}</p>}
                  {tx.storageWarning && <p role="alert">{tx.storageWarning}</p>}
                </div>
              </div>
            ))}
          </section>
        )}
        <main id="main">{children}</main>
        <footer>
          <span>Your goals. Onchain. · {APP_ENVIRONMENT}</span>
          <span>
            Independent project · Unaudited alpha · Idle strategy only
          </span>
          <span><a href="https://github.com/reyals1111-ux/ZIGoals/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer">Report a bug</a> · <a href="mailto:hello@zigoals.app">Private security contact</a> · Never share secrets, private backups or wallet details.</span>
        </footer>
      </div>
      {s.pending && (
        <dialog
          ref={dialog}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (!first || !last) {
              event.preventDefault();
              return;
            }
            if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            }
          }}
          onCancel={(e) => {
            e.preventDefault();
            if (!s.busy) s.cancel();
          }}
          aria-labelledby="review-title"
          className="dialog"
        >
          <h2 id="review-title">
            Review{" "}
            {s.pending.action.kind === "create"
              ? "new goal"
              : s.pending.action.kind === "close"
                ? "goal closure"
                : s.pending.action.kind}
          </h2>
          <p>
            {s.mode === "local"
              ? "This changes only the local simulation. No wallet signature or network fee is involved."
              : "Your wallet will ask you to approve this testnet transaction."}
          </p>
          {"amount" in s.pending.action && (
            <p className="large-number">
              {formatUnits(
                s.pending.action.amount,
                TESTNET.nativeAsset.decimals,
              )}{" "}
              ZIG
            </p>
          )}
          {s.pending.metadata && (
            <p>
              {s.pending.metadata.name} · Private plan will be saved on this
              device after confirmation.
            </p>
          )}
          <dl className="metrics">
            <div>
              <dt>Network</dt>
              <dd>{s.chain}</dd>
            </div>
            <div>
              <dt>Estimated network fee</dt>
              <dd>
                {s.pending.quote
                  ? formatUnits(
                      s.pending.quote.feeAmount,
                      TESTNET.nativeAsset.decimals,
                    )
                  : "0"}{" "}
                ZIG
              </dd>
            </div>
            <div>
              <dt>Available after fee reserve</dt>
              <dd>
                {s.pending.quote
                  ? formatUnits(
                      s.pending.quote.safeMax,
                      TESTNET.nativeAsset.decimals,
                    )
                  : formatUnits(s.balance, TESTNET.nativeAsset.decimals)}{" "}
                ZIG
              </dd>
            </div>
          </dl>
          <div role="status" aria-live="polite">
            {s.busy
              ? s.status.replaceAll("_", " ").toLowerCase()
              : s.mode === "testnet"
                ? "Estimate includes a 30% simulated gas margin."
                : ""}
          </div>
          <div className="actions">
            <button
              autoFocus
              className="secondary"
              onClick={s.cancel}
              disabled={s.busy}
            >
              Cancel
            </button>
            <button
              className="primary"
              onClick={() => void s.confirm()}
              disabled={s.busy}
            >
              {s.busy
                ? "Processing…"
                : s.mode === "local"
                  ? "Confirm simulation"
                  : "Approve in Keplr"}
            </button>
          </div>
        </dialog>
      )}
    </>
  );
}
