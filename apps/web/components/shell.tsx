"use client";
import "./platform/run92-product.css";
import "./navigation.css";
import { FINANCIAL_EXECUTION_ALLOWED } from "../lib/app-environment";
import Link from "next/link";
import { navPrefetch } from "./nav-prefetch";
import { usePathname } from "next/navigation";
import { Fragment, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { setJournalTimeZone } from "../lib/journal-zone";
import { setSyncedPages } from "../lib/pages/view-store";
import { homeHref, isShown, pageIdForPath } from "../lib/pages/visibility";
import { settingsGroupIn } from "../lib/vault/w-homes";
import { usePagesView } from "./pages/use-pages-view";
import { useStartPage } from "./pages/use-start-page";
import { HiddenPageBanner } from "./pages/hidden-page-banner";
import { useDisplayLocaleKey } from "./display-locale";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
import { useGoals } from "./goal-provider";
import { ExplorerLinks } from "./explorer-links";
import { LogoMark, Wordmark } from "./brand-mark";
import { AppIcon } from "./app-icon";
import {useShowcase} from "./showcase-controls";
import { ShowcaseChip } from "./shell/showcase-chip";
import { AlphaNotice } from "./shell/alpha-notice";
import { pillarOfHref } from "../lib/pillar-route";
import "./pillar-hero.css";
import "./ui/card-header.css";
import "./charts/charts.css";
import { LazyThemeSwitch as ThemeSwitch } from "./shell/theme-switch-lazy";
import { AlphaFacts } from "./alpha/alpha-facts";
import { GamifyButton } from "./game/gamify-button";
import { PHONE_STATUS_EVENT } from "./phone/phone-status-event";
import {useWorkspaceSelection} from './workspace-status';
import {usePrivateStore} from './use-private-store';
import {retryPrivateReads,usePrivateReadDelay} from './private-read-delay';
import {DASHBOARD_SETTINGS_KEY,dashboardSettingsSchema,emptyDashboardSettings,visibleDomains} from '../lib/dashboard-settings';
import {QuickAdd} from "./quick-add";
import { AppNav } from "./app-nav";
import { LogoIntro } from "./logo-intro";
import { PageMark } from "./page-mark";
import { PageArrival } from "./page-arrival";
import { LiquidGlass } from "./liquid-glass";
import { LAYOUT_LOCK_SLOT, PAGE_TOOLS_SLOT } from "./layout-edit";
import { PhoneTabBar, PhoneTopBar } from "./phone/phone-chrome";
import { OfflineNotice, OfflinePill } from "./offline-notice";
import { UndoToastHost } from "./ui/undo-toast";
import { SearchButton, SearchHost } from "./search/search-trigger";
import { ShortcutHost } from "./shortcut-host";
import { AiLauncher } from "./ai/ai-launcher";
import { GameRegistrar } from "./game/registrar"; // Session AA-Local, merged second (ADR-022 B52): the game cards and Journey's nav entry, once for every page
import { LoadBoundary } from "./load-boundary";
import { AmbientPill } from "./audio/ambient-pill";
import { MusicLauncher } from "./music/music-launcher";
import { ChecklistLauncher } from "./checklist/checklist-launcher"; // Session AF (L3): the Checklist button between Music and ZIGi, and its navigation entry
import { PointTellMount } from "./point-tell/mount";
import { formatPlainDecimal } from "../lib/visual-format";
import { HealthDocumentLinks } from "./health-document-links";
import { WalletMoreButton } from "./wallet/wallet-more-button";
/** Session Z-Cloud Part 4.2: the phone's "Status" sheet, loaded on its first tap. */
const PhoneStatusSheet = lazy(() => import("./phone/phone-status-sheet"));
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
export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  // Session AB-Design: the root says when the shell has hydrated (`<html data-app-hydrated>`). A tap before hydration is replayed by React after it, which toggles a <details> shut again; the specs wait for this mark before opening card details.
  useEffect(() => { document.documentElement.dataset.appHydrated = ""; return () => { delete document.documentElement.dataset.appHydrated; }; }, []);
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
  // Session W Part 2: the pages and buttons that show, from the same settings read, for the whole shell at once (a
  // layout effect, so the sidebar and tab bar change in the same frame as the settings arrive); unreadable settings show
  // every page. A bare /app may move to the person's start page before Today renders (use-start-page.ts).
  const pagesState=preferences.loaded?(preferences.error?"unreadable":"ready"):"pending",pagesGroup=pagesState==="ready"?settingsGroupIn(preferences.data,"pages"):undefined;
  useLayoutEffect(()=>{setSyncedPages(pagesState==="ready"?{state:"ready",pages:pagesGroup}:{state:pagesState});},[pagesState,pagesGroup]);
  const pagesView=usePagesView(),startHold=useStartPage(pagesState,pagesView),pathname=usePathname();
  const hiddenPage=pagesState==="ready"?pageIdForPath(pathname):null,showQuickAdd=isShown(pagesView,"quick-add");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (s.pending) dialog.current?.showModal();
  }, [s.pending]);
  // Session Z-Cloud Part 4.3 (persona item 3): plain words until a person chooses crypto (Keplr connected); the testnet's
  // own words return with the wallet. Part 4.2 (item 2): on a phone one 44 px status line opens the full notices.
  const plain = s.mode === "local" && s.walletState !== "CONNECTED";
  const [statusOpen, setStatusOpen] = useState(false);
  useEffect(() => { const open = () => setStatusOpen(true); window.addEventListener(PHONE_STATUS_EVENT, open); return () => window.removeEventListener(PHONE_STATUS_EVENT, open); }, []);
  const networkLabel = plain ? "PRACTICE MONEY (NO REAL VALUE) · PUBLIC ALPHA" : "ZIGCHAIN TESTNET · PUBLIC ALPHA";
  // Session AF (ADR-028 H19, H62; `TIER 3 (public-safety labels)`): native staking signs in the person's own wallet on both networks.
  const networkSentence = FINANCIAL_EXECUTION_ALLOWED ? "Testnet assets have no monetary value." : "Staking and votes sign in your own wallet (practice or real, your choice). Nothing else moves, and ZIGoals never holds keys.";
  const modeText = s.mode === "local"
    ? "LOCAL SIMULATION · Mode: this tab · Stored in this browser · Only staking signs, in your own wallet"
    : `KEPLR TESTNET · Mode: this tab · ${FINANCIAL_EXECUTION_ALLOWED ? "Testnet" : "CONNECTION ONLY · Financial actions unavailable"} · ${s.walletState.replaceAll("_", " ").toLowerCase()}`;
  const alphaFacts = {network: {label: networkLabel, sentence: networkSentence}, mode: modeText, financial: banners};
  const walletButtons = <>
          <button
            className="quiet"
            onClick={s.useLocal}
            disabled={s.busy}
            aria-pressed={s.mode === "local"}
          >
            {plain ? "Demo records" : "Local demo"}
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
  </>;
  return (
    <>
      <RouteFocusFallback />
      <HealthDocumentLinks />
      <a className="skip" href="#main">
        Skip to content
      </a>
      <PhoneTopBar />
      <aside className="app-sidebar" aria-label="Application sidebar">
        <Link href={homeHref(pagesView)} className="brand" aria-label="ZIGoals home">
          <LogoMark />
          <LogoIntro host="sidebar" />
          <Wordmark />
        </Link>
        <p className="product-descriptor">Your Financial Orbit</p>
        <AppNav />
        {/* Session AA-Cloud Part 4: search, on computers right under the navigation (tablets carry it beside Quick add). */}
        <div className="sidebar-search"><SearchButton className="search-trigger is-wide" label/><OfflinePill/></div>
        {/* The tablet header shows Quick add below the navigation, so it follows it in tab order too (hidden on desktop). */}
        <div className="sidebar-actions">{showQuickAdd&&<QuickAdd/>}<SearchButton/></div>
        {/* Above the planet: this page's mark, or the wordmark (Session I). The "Shape & Fold" tagline now lives in the Today swan's artwork. */}
        <div className="sidebar-destination">
          <div className="sidebar-horizon" aria-hidden="true" />
          <PageMark />
          <span className="sidebar-star" aria-hidden="true" />
        </div>
        {/* Session AB-Design (owner request 5, owner follow-up): the theme bar is the sidebar's last thing, below the complete artwork. */}
        <ThemeSwitch/>
      </aside>
      <div className="app-content">
      {/* Session AB-Design (owner request 8, ADR-024 D7): pages start with their header. One compact first-visit notice replaces the Alpha box, the Showcase bar, the storage line and the mode strip; the same facts stay in the footer's disclaimer line, the Showcase chip stays in the status row, and the phone's Status & wallet sheet (More) keeps every notice in full. */}
      {banners&&<AlphaNotice label={networkLabel} sentence={networkSentence} mode={s.mode === "local" ? "local" : "keplr"} stalled={slowRead&&settingsPending}/>}
      {banners&&statusOpen&&<Suspense fallback={null}><PhoneStatusSheet onClose={() => { setStatusOpen(false); requestAnimationFrame(() => { if (document.activeElement === document.body) document.querySelector<HTMLElement>(".phone-more-top")?.focus(); }); }} label={networkLabel} sentence={networkSentence} mode={modeText} showcase={showcase}>{walletButtons}</PhoneStatusSheet></Suspense>}
      {slowRead&&<section className="panel private-read-delay" role="status" aria-label="Private data is still opening">
        <h2>Your private data is taking longer than usual to open.</h2>
        <p>Nothing has been changed, and saving is paused until it opens. Another ZIGoals tab may be using browser storage: close other ZIGoals tabs, then retry. Reloading this page is also safe.</p>
        <div className="actions">
          <button type="button" className="secondary" onClick={retryPrivateReads}>Retry</button>
          {settingsPending?<span className="fine">Your backups are in Settings once your data opens.</span>:<Link className="text-link" href="/app/settings#privacy" prefetch={navPrefetch("/app/settings#privacy")}>Backups in Settings →</Link>}
        </div>
      </section>}
      <div className="workspace" aria-busy={!selection.ready||!preferences.loaded||startHold} style={{visibility:selection.ready&&preferences.loaded&&!startHold?undefined:"hidden"}}>
        {/* The status row (Session AB-Design): the Showcase chip on the left; the wallet buttons (computers; phones reach them in More → Status & wallet), the page's own tools, Gamify and the layout lock on the right.
            Session AE (Part 1, ADR-027; owner): the demo balance is no longer repeated here or in the phone's Status sheet; Today's wallet card shows the simulated balance. */}
        <div className="status-row">
        <ShowcaseChip/>
        {/* Session AE (Part 6, ADR-027): the ▾ opens the other wallet choices (read-only links, Disconnect); its menu is a lazy chunk. */}
        {banners&&<div className="wallet status-wallet">{walletButtons}<WalletMoreButton disabled={showcase}/></div>}
        <div className="page-tools-slot" id={PAGE_TOOLS_SLOT}/>
        <GamifyButton/>
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
        <SearchHost/><ShortcutHost/><UndoToastHost /><GameRegistrar />
        {hiddenPage&&!isShown(pagesView,hiddenPage)&&<HiddenPageBanner page={hiddenPage}/>}
        <main id="main" data-pillar={pillarOfHref(pathname ?? "") ?? undefined} style={slowRead&&settingsPending?{display:"none"}:undefined}><Fragment key={localeKey}><AlphaFacts value={alphaFacts}>{startHold?null:children}</AlphaFacts></Fragment></main><PageArrival key={localeKey} /><LiquidGlass /><LoadBoundary quiet><AiLauncher /></LoadBoundary><LoadBoundary quiet><AmbientPill /></LoadBoundary><LoadBoundary quiet><MusicLauncher /></LoadBoundary><LoadBoundary quiet><ChecklistLauncher /></LoadBoundary><LoadBoundary quiet><PointTellMount /></LoadBoundary>
      </div>
      {/* Session AB-Design (owner request 2): one full-width footer banner, outside the workspace's 1600 px column. */}
      {/* Phase 2 (weights; no-JavaScript honesty): the footer banner is a server component from the app layout. Session AC:
          it ends after its link columns; the honesty values reach Settings' About block through AlphaFacts instead. */}
      {footer}
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
