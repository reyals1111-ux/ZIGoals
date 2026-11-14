"use client";
import { useCallback, useState, useSyncExternalStore } from "react";
import { usePlatform } from "../../../components/platform/use-platform";
import { AppIcon } from "../../../components/app-icon";
import { ActivityFeed } from "../../../components/activity-feed-lazy"; // CI14: the list is its own chunk (weights)
import { useZigiActions } from "../../../components/activity/use-zigi-actions";
import Link from "next/link";
import { ExplorerLinks } from "../../../components/explorer-links";
import { useGoals } from "../../../components/goal-provider";
import { useChainChoice } from "../../../components/chain/use-chain-choice";
import {
  pendingDescription,
  isTerminal,
} from "../../../lib/transaction-journal";
import { formatUnits, TESTNET } from "@zigoals/chain-config";
import { LayoutLockButton, LayoutPage, LayoutRegion } from "../../../components/layout-edit";
import { NebulaFlow } from "../../../components/nebula-flow";
import { HeaderArtCorner, OrbitArt } from "../../../components/header-art/orbit-art";
import { ActivityGlyph } from "../../../components/header-art/glyphs/activity";
import { ProgressSlot } from "../../../components/progress/slot";
import {formatDateTime,formatPlainDecimal} from "../../../lib/visual-format";
import { activityTimeZone } from "../../../lib/life-intelligence";
const deviceZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "your device’s time zone"; } catch { return "your device’s time zone"; } };
const noChange = () => () => undefined;
/** Session AL (DV-046f, DV-054e, P-DV-78): the zone Activity's times are in, read on the device only (no server guess). */
function ActivityZone() {
  const zone = useSyncExternalStore(noChange, () => activityTimeZone() ?? deviceZone(), () => "");
  return zone ? <>Times are shown in {zone}. </> : null;
}
export default function ActivityPage() {
  const s = useGoals();
  // Release review R17: the simulation and testnet words only for a person who chose the chain (lib/chain-choice.ts).
  const chain = useChainChoice();
  const platform = usePlatform();
  const [category, setCategory] = useState("ALL");
  // Session V Part 7: the "Actions by ZIGi" filter appears once a ZIGi card was confirmed on this device.
  const zigi = useZigiActions();
  const [limit, setLimit] = useState(30), [counts, setCounts] = useState<Record<string, number>>({});
  const showMore = useCallback(() => setLimit(value => value + 30), []);
  // C-DVG-17 / PR-100: the search's words, with the kind filter; a new search starts the list from its top again.
  const [query, setQuery] = useState("");
  const search = useCallback((value: string) => { setQuery(value); setLimit(30); }, []);
  return (
    <LayoutPage page="activity"><div className="activity-page">
      <div className="page-heading header-art-host">
        <div>
          <p className="eyebrow page-eyebrow"><NebulaFlow identity="activity-eyebrow">Every step forward</NebulaFlow></p>
          <h1><NebulaFlow identity="activity-title">Activity.</NebulaFlow></h1>
          <p className="page-lede">
            {s.mode === "local"
              ? "Your Goals, wealth, habits and health — a private history of the steps you take."
              : "Known transactions saved on this device for this wallet and chain. This is incomplete history; other wallets, devices, and applications are not indexed."}
          </p>
        </div>
        <LayoutLockButton />
        <HeaderArtCorner><OrbitArt glyph={ActivityGlyph} spin={-30}/></HeaderArtCorner>
      </div>
      <LayoutRegion region="body" items={[
        {id: "activity:sources", label: "Your activity sources", node: <section className="activity-context" aria-label="Your current activity sources" tabIndex={0} /* Session AK P6 (axe scrollable-region-focusable): it scrolls sideways on a phone, so the keyboard can reach and scroll it */>{/* Session AL (DV-036d, P-DV-76): each source card shows its part of the list (they looked clickable and were not) */}<div><AppIcon name="goals" size={26}/><strong><button type="button" className="text-link activity-source-link" aria-pressed={category === "GOAL"} onClick={() => { setCategory("GOAL"); setLimit(30); }}>Goals & contributions</button></strong><span>Plans, funding and corrections</span></div><div><AppIcon name="wallet" size={26}/><strong><button type="button" className="text-link activity-source-link" aria-pressed={category === "WEALTH"} onClick={() => { setCategory("WEALTH"); setLimit(30); }}>Every kind of wealth</button></strong><span>Crypto, stocks, metals and cash</span></div><div><AppIcon name="health" size={26}/><strong>Your everyday progress</strong><span><button type="button" className="text-link activity-source-link" aria-pressed={category === "HABIT"} onClick={() => { setCategory("HABIT"); setLimit(30); }}>Habit check-ins</button> and <button type="button" className="text-link activity-source-link" aria-pressed={category === "HEALTH"} onClick={() => { setCategory("HEALTH"); setLimit(30); }}>Health logs</button></span></div></section>},
        // Session AA-Cloud Part 1: the feed (the page's items) comes before the favourites card.
        {id: "activity:timeline", label: "Your progress, in moments", node: <section className="panel activity-timeline" aria-label="Unified private activity"><div className="activity-filter-row"><div><p className="eyebrow">YOUR PROGRESS, IN MOMENTS</p><h2>One journey. Every step.</h2></div><nav className="tab-row view-tabs" aria-label="Activity categories">{["ALL", "GOAL", "WEALTH", "HABIT", "HEALTH", ...(zigi.actions.length ? ["ZIGI"] : [])].map(value => <button key={value} aria-pressed={category === value} onClick={() => { setCategory(value); setLimit(30); }}>{value === "ALL" ? "All" : value === "ZIGI" ? "Actions by ZIGi" : value[0] + value.slice(1).toLowerCase()}{counts[value] !== undefined && <span className="activity-filter-count" aria-hidden="true"> · {counts[value]}</span>}</button>)}</nav></div><ActivityFeed report limit={limit} category={category} onMore={showMore} onCounts={setCounts} query={query} onQuery={search}/><p className="fine">{/* Session AL (DV-046f, DV-054e, P-DV-78): the zone the times are shown in */}<ActivityZone/>Habit and Health entries reflect current saved logs. Corrections update this view; removing a log removes it here. {/* Session AL (DV-172, DV-206, P-DV-73): what is not listed, said (third pass: sleep nights, habit archiving and deleting are listed now) */}{/* fourth pass (PR-065): the money log is named too */}Not listed here: journal entries, notes, and the spending and income you log under Wealth; each keeps its history on its own page. A habit deleted for good shows without its name. {chain.chosen ? 'This is private browser history, separate from testnet receipts.' : 'Your history, kept on this device.'}</p></section>},
        platform.data.watchlist.length > 0 && {id: "activity:favourites", label: "Markets in your favourites", node: <aside className="activity-favourites"><AppIcon name="star" size={25}/><div><strong>{platform.data.watchlist.length} markets in your favourites</strong><p>{platform.data.watchlist.map(item => item.name).join(" · ")}</p><small>Current saved favourites. Follow dates are not recorded.</small></div><Link className="text-link" href="/app/markets">Explore favourites →</Link></aside>},
      ]}/>
      <div className="page-game-slot"><ProgressSlot page="activity"/></div>
      <p className="eyebrow">
        {/* Session X (first-week polish): the source in words, not its code (LOCAL_SIMULATION / TESTNET_CHAIN). */}
        {s.mode === "local"
          ? (chain.chosen ? "On this device · Local simulation history" : "On this device · Your history")
          : "ZIGChain testnet · Known local receipts only · Incomplete"}
      </p>
      {s.mode === "testnet" && s.owner && (
        <button
          className="button secondary"
          onClick={() =>
            void s.refresh().catch((error) => s.setError(String(error)))
          }
        >
          Check known receipts
        </button>
      )}
      {s.mode === "testnet" && (
        <section
          className="panel"
          aria-label="Saved testnet transaction history"
        >
          {s.journalRecords.length ? (
            s.journalRecords.map((record) => (
              <div className="activity-row" key={record.operationId}>
                <div>
                  <strong>
                    {record.action} · {record.state.replaceAll("_", " ")}
                  </strong>
                  <small>{formatDateTime(record.createdAt)}</small>
                  <p>
                    {!isTerminal(record.state)
                      ? pendingDescription(record)
                      : record.state === "CONFIRMED"
                        ? `Confirmed at block ${record.height}.`
                        : record.state === "REJECTED"
                          ? "Cancelled in wallet before broadcast."
                          : record.hash
                            ? "Execution failed; a network fee may have been charged."
                            : "Stopped before a broadcast was recorded."}
                  </p>
                </div>
                {record.goalId ? (
                  <Link href={`/app/goals/${record.goalId}`}>
                    {s.metadata?.goals[record.goalId]?.name ??
                      `Goal #${record.goalId}`}
                  </Link>
                ) : (
                  <span>Create goal</span>
                )}
                <span>
                  {record.amount !== "0"
                    ? `${formatPlainDecimal(formatUnits(record.amount, TESTNET.nativeAsset.decimals))} ZIG`
                    : ""}
                </span>
                {record.hash && (
                  <div>
                    <p style={{ overflowWrap: "anywhere" }}>
                      Transaction {record.hash}
                    </p>
                    <ExplorerLinks
                      chainId={record.chainId}
                      kind="transaction"
                      identifier={record.hash}
                    />
                  </div>
                )}
              </div>
            ))
          ) : (
            <p>
              No saved transactions for this wallet and chain. This does not
              prove the wallet has no onchain history.
            </p>
          )}
        </section>
      )}
      {s.mode === "local" && chain.chosen && (
        <details className="panel legacy-goal-history"><summary>Detailed Goal simulation history</summary>
          {s.activity.length ? (
            s.activity.map((a, i) => (
              <div className="activity-row" key={i}>
                <span className="activity-symbol" aria-hidden="true">
                  ↗
                </span>
                <div>
                  <strong>{a.action}</strong>
                  <small>{formatDateTime(a.timestamp)}</small>
                </div>
                <Link href={`/app/goals/${a.goalId}`}>
                  {s.metadata?.goals[a.goalId]?.name ?? `Goal #${a.goalId}`}
                </Link>
                <span>
                  {a.amount !== "0"
                    ? formatPlainDecimal(formatUnits(a.amount, TESTNET.nativeAsset.decimals)) +
                      " ZIG"
                    : ""}
                </span>
              </div>
            ))
          ) : (
            <div className="empty-small">
              <h2>Your next step starts here.</h2>
              <p>Creating and funding a goal will appear in your activity.</p>
              <Link href="/app/goals" className="text-link">
                Go to goals →
              </Link>
            </div>
          )}
        </details>
      )}
    </div></LayoutPage>
  );
}
