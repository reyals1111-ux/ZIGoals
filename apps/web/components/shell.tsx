"use client";
import "./platform/run92-product.css";
import "./navigation.css";
import { APP_ENVIRONMENT, FINANCIAL_EXECUTION_ALLOWED } from "../lib/app-environment";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { setJournalTimeZone } from "../lib/journal-zone";
import { useDisplayLocaleKey } from "./display-locale";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
import { useGoals } from "./goal-provider";
import { ExplorerLinks } from "./explorer-links";
import { LogoMark, Wordmark } from "./brand-mark";
import { AppIcon } from "./app-icon";
import {ShowcaseBanner,useShowcase} from "./showcase-controls";
import {WorkspaceStatus,useWorkspaceSelection} from './workspace-status';
import {usePrivateStore} from './use-private-store';
import {retryPrivateReads,usePrivateReadDelay} from './private-read-delay';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings,visibleDomains} from '../lib/dashboard-settings';
import {QuickAdd} from "./quick-add";
import { AppNav } from "./app-nav";
import { LogoIntro } from "./logo-intro";
import { PageMark } from "./page-mark";
import { PageArrival } from "./page-arrival";
import { LiquidGlass } from "./liquid-glass";
import { LAYOUT_LOCK_SLOT } from "./layout-edit";
import { PhoneTabBar, PhoneTopBar } from "./phone/phone-chrome";
import { OfflineNotice } from "./offline-notice";
import { AiLauncher } from "./ai/ai-launcher";
import { formatPlainDecimal } from "../lib/visual-format";
import { HealthDocumentLinks } from "./health-document-links";
/** After a route change, focus that fell to <body> (its link or trigger was unmounted, e.g. Quick add on Today) moves to the page's main region. */
function RouteFocusFallback() {
  const pathname = usePathname(), first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const frame = requestAnimationFrame(() => {
      if (document.activeElement && document.activeElement !== document.body) return;
      const main = document.getElementById("main");
      if (!main) return;
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
  return null;
}
export function Shell({ children }: { children: ReactNode }) {
  // Number, money and date formats follow the browser locale; this remounts the page content once after hydration
  // when that locale is not en-US (components/display-locale.ts, lib/visual-format.ts).
  const localeKey = useDisplayLocaleKey();
  const s = useGoals();
  const showcase=useShowcase();
  const selection=useWorkspaceSelection();
  const preferences=usePrivateStore(DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings);
  // The testnet bar and the mode strip follow the app mode. Only a readable choice hides them (a Health/Habits-only
  // Today, or a selected account); a store that is loading, unreadable, corrupt or from a newer build never does.
  const nonFinancialChoice=preferences.loaded&&!preferences.error&&!visibleDomains(preferences.data).some(d=>d==='wealth'||d==='goals');
  const accountView=selection.ready&&selection.selected&&!selection.error;
  const banners=!nonFinancialChoice&&!accountView;
  // A private read that is still pending after a while gets an honest notice instead of an endless blank page.
  // The page stays unrendered and writes stay blocked until a read succeeds; a late read renders normally.
  const slowRead=usePrivateReadDelay(),settingsPending=!preferences.loaded;
  // Session W Part 17 (T2-A): the journal zone for every Habits and Health day, set before any effect of this commit runs
  // (layout effects run before passive ones), so a day-dependent write never uses the device zone by mistake. An
  // unreadable settings record leaves no journal zone: days follow each module's zone, then the device's, as before.
  const journalZone=preferences.loaded&&!preferences.error?preferences.data.journalTimeZone??null:null;
  useLayoutEffect(()=>{setJournalTimeZone(journalZone,preferences.loaded);},[journalZone,preferences.loaded]);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (s.pending) dialog.current?.showModal();
  }, [s.pending]);
  return (
    <>
      <RouteFocusFallback />
      <HealthDocumentLinks />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <PhoneTopBar />
      <aside className="app-sidebar" aria-label="Application sidebar">
        <Link href="/app" className="brand" aria-label="ZIGoals home">
          <LogoMark />
          <LogoIntro host="sidebar" />
          <Wordmark />
        </Link>
        <p className="product-descriptor">Your Financial Orbit</p>
        <AppNav />
        {/* The tablet header shows Quick add below the navigation, so it follows it in tab order too (hidden on desktop). */}
        <div className="sidebar-actions"><QuickAdd/></div>
        {/* Above the planet: this page's mark, or the wordmark (Session I). The "Shape & Fold" tagline now lives in the Today swan's artwork. */}
        <div className="sidebar-destination">
          <div className="sidebar-horizon" aria-hidden="true" />
          <PageMark />
          <span className="sidebar-star" aria-hidden="true" />
        </div>
      </aside>
      <div className="app-content">
      {banners&&<header className="app-topbar">
        <div className="network-banner">
          <strong>ZIGCHAIN TESTNET · PUBLIC ALPHA</strong>
          <span>{FINANCIAL_EXECUTION_ALLOWED ? "Testnet assets have no monetary value." : "Simulation + wallet connection only. No blockchain transactions or financial signatures."}</span>
        </div>
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
            className="secondary wallet-connect"
            title={s.walletState === "CONNECTED" ? "Refresh your Keplr connection" : undefined}
            onClick={() => void s.connect()}
            disabled={
              showcase || s.busy || ["CONNECTING", "ADDING_TESTNET"].includes(s.walletState)
            }
          >
            <AppIcon name="wallet" size={24} luminous />
            <span className="wallet-identity">{s.walletState === "CONNECTING"
              ? "Connecting…"
              : s.walletState === "ADDING_TESTNET"
                ? "Adding testnet…"
                : s.walletState === "CONNECTED"
                  ? `${s.owner.slice(0, 8)}…${s.owner.slice(-4)}`
                  : s.walletReconnectHint
                    ? "Reconnect Keplr"
                    : "Connect Keplr"}
            {s.walletState === "CONNECTED" && <small aria-hidden="true">{formatPlainDecimal(formatUnits(s.balance, TESTNET.nativeAsset.decimals))} ZIG · Testnet</small>}</span>
            <AppIcon name={s.walletState === "CONNECTED" ? "chevron" : "arrow"} size={14}/>
          </button>
        </div>
      </header>}
      {slowRead&&<section className="panel private-read-delay" role="status" aria-label="Private data is still opening">
        <h2>Your private data is taking longer than usual to open.</h2>
        <p>Nothing has been changed, and saving is paused until it opens. Another ZIGoals tab may be using browser storage: close other ZIGoals tabs, then retry. Reloading this page is also safe.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={retryPrivateReads}>Retry</button>
          {settingsPending?<span className="fine">Your backups are in Settings once your data opens.</span>:<Link className="text-link" href="/app/settings#privacy">Backups in Settings →</Link>}
        </div>
      </section>}
      <div className="workspace" aria-busy={!selection.ready||!preferences.loaded} style={{visibility:selection.ready&&preferences.loaded?undefined:"hidden"}}>
        <ShowcaseBanner/>
        <WorkspaceStatus/>
        {/* The status row: the mode strip (an honesty label) and, on pages that can be rearranged, the layout lock right after the demo balance. The row keeps the lock's place when the strip is hidden. */}
        <div className="status-row">
        {banners&&<div className="mode-strip">
          <span className="mode-dot" />
          {s.mode === "local"
            ? "LOCAL SIMULATION · Mode: this tab · Stored in this browser · No blockchain transactions"
            : `KEPLR TESTNET · Mode: this tab · ${FINANCIAL_EXECUTION_ALLOWED ? "Testnet" : "CONNECTION ONLY · Financial actions unavailable"} · ${s.walletState.replaceAll("_", " ").toLowerCase()}`}
          <span className="wallet-balance">
            {formatPlainDecimal(formatUnits(s.balance, TESTNET.nativeAsset.decimals))} ZIG{" "}
            {s.mode === "local" ? "demo balance" : "wallet balance"}
          </span>
        </div>}
        <div className="layout-lock-slot" id={LAYOUT_LOCK_SLOT}/>
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
        {s.mode === "local" && s.walletReconnectHint && (
          <div role="status" className="notice">
            Reloads intentionally start in Local demo. Reconnect Keplr to
            restore your wallet view. Browser permission may be remembered,
            but Keplr may still prompt.
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
        <OfflineNotice />
        <main id="main" style={slowRead&&settingsPending?{display:"none"}:undefined}><Fragment key={localeKey}>{children}</Fragment></main><PageArrival key={localeKey} /><LiquidGlass /><AiLauncher />
        <footer>
          <div className="footer-brand"><Wordmark /><small>Same you. A brighter tomorrow.</small></div>
          <span>Your goals. Onchain. · {APP_ENVIRONMENT}</span>
          <span>
            Independent project · Unaudited alpha · Idle strategy only
          </span>
          <span><a href="https://github.com/reyals1111-ux/ZIGoals/issues/new?template=bug_report.yml" target="_blank" rel="noopener noreferrer">Report a bug</a> · <a href="mailto:hello@zigoals.app">Private security contact</a> · Never share secrets, private backups or wallet details.</span>
        </footer>
      </div>
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
              {formatPlainDecimal(formatUnits(
                s.pending.action.amount,
                TESTNET.nativeAsset.decimals,
              ))}{" "}
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
                  ? formatPlainDecimal(formatUnits(
                      s.pending.quote.feeAmount,
                      TESTNET.nativeAsset.decimals,
                    ))
                  : "0"}{" "}
                ZIG
              </dd>
            </div>
            <div>
              <dt>Available after fee reserve</dt>
              <dd>
                {s.pending.quote
                  ? formatPlainDecimal(formatUnits(
                      s.pending.quote.safeMax,
                      TESTNET.nativeAsset.decimals,
                    ))
                  : formatPlainDecimal(formatUnits(s.balance, TESTNET.nativeAsset.decimals))}{" "}
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
      <PhoneTabBar />
    </>
  );
}
