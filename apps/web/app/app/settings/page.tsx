"use client";
import "../../../components/life-pages.css";
import {getAppStorage} from "../../../lib/showcase-storage";
import Link from "next/link";
import {VaultSyncControls} from "../../../components/vault-sync-controls";
import {PrivateVaultTools} from "../../../components/private-vault-tools";
import {MotionPreference} from "../../../components/motion-preference";
import {ShowcaseControls} from "../../../components/showcase-controls";
import { PrivateBackups } from "../../../components/private-backups";
import { deployment } from "../../../lib/deployment-config";
import { useState } from "react";
import { useGoals } from "../../../components/goal-provider";
import { ConnectionDiagnostics } from "../../../components/connection-diagnostics";
import { shortAccount } from "../../../lib/diagnostics";
import { loadMetadata } from "../../../lib/storage";
export default function Settings() {
  const s = useGoals();
  const [backup, setBackup] = useState("");
  function exportData() {
    try {
      const data = loadMetadata(getAppStorage(), s.chain, s.owner);
      const raw = JSON.stringify(data);
      const url = URL.createObjectURL(
        new Blob([raw], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `zigoals-${s.chain}-goals.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      s.setError(String(e));
    }
  }
  return (
    <div className="settings-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Keep your plans with you</p>
          <h1>Your data. Your control.</h1>
          <p>
            Goal plans stay on this device. Your wallet controls onchain funds.
          </p>
        </div>
      </div>
      <ShowcaseControls/>
      <nav className="settings-sections" aria-label="Settings sections">{[["Demo / Showcase", "showcase"], ["Backups & privacy", "privacy"], ["Market data", "market-data"], ["Account", "account"], ["Network", "network"], ["Goals / Contract", "contract"], ["Habits", "habits-settings"], ["Health", "health-settings"], ["Diagnostics", "diagnostics"]].map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
      <section className="settings-safety-summary" aria-label="How your data is stored"><div><strong>Private by default</strong><p>Personal Goals, Habits, Health and portfolio records stay in this browser.</p></div><div><strong>Back up what matters</strong><p>Export a copy before clearing site data or moving to another device.</p></div><div><strong>A separate space to explore</strong><p>Showcase uses fictional records in this tab. Your usual saved records remain separate.</p></div></section>
      <section className="panel settings-market-data" id="market-data"><p className="eyebrow">MARKET DATA</p><h2>Know where each value comes from.</h2><p>Supported automatic market prices come from CoinGecko. Public asset identifiers and your quote currency are used to request market data; private holdings, quantities, Goals and Health records are not sent.</p><div className="settings-data-types"><div><strong>Automatic references</strong><p>Supported assets show price source and freshness. Missing or stale quotes remain labelled.</p></div><div><strong>Your manual values</strong><p>Cash, property, custom assets and unsupported markets use values you enter. Manual values are never presented as live quotes.</p></div></div><Link className="text-link" href="/app/markets">Explore market references →</Link></section>
      <div className="settings-overview">
        <section className="panel" id="account"><p className="eyebrow">ACCOUNT</p><h2>Your space.</h2><p>{s.mode === "local" ? "Local Demo · no account needed" : "Keplr · explicitly connected for this session"}</p><code>{shortAccount(s.owner)}</code><p className="fine">Habits and Health belong to this browser, independently of the active wallet. Switching wallets does not hide or move them.</p></section>
        <section className="panel" id="network"><p className="eyebrow">NETWORK</p><h2>ZIGChain Testnet.</h2><p>zig-test-2 · ZIG (18 decimals)</p><span className="badge">Testnet Alpha</span><p className="fine">Connect or reconnect explicitly with the wallet control above. Reload returns to Local Demo.</p></section>
        <section className="panel" id="contract"><p className="eyebrow">GOALS / CONTRACT</p><h2>The financial layer.</h2><p>Goal Manager: {deployment.success && deployment.data.status === "DEPLOYED" ? "See deployment diagnostics" : "NOT DEPLOYED"}</p><p>Code ID: {deployment.success ? deployment.data.codeId ?? "NOT DEPLOYED" : "Configuration invalid"}</p><p className="fine">Idle strategy. Financial execution is disabled in the public Alpha.</p></section>
      </div>
      <div className="settings-module-links"><section id="habits-settings"><p className="eyebrow">HABITS</p><h2>Your rhythm.</h2><p>Schedules, targets and reminders are chosen per Habit. Review streaks and your saved check-in history.</p><Link href="/app/habits" className="text-link">Manage habits →</Link></section><section id="health-settings"><p className="eyebrow">HEALTH</p><h2>Your own targets.</h2><p>Optional nutrition, weight and step targets. You choose every value.</p><Link href="/app/health" className="text-link">Open Health & targets →</Link></section></div>
      <section className="privacy-intro" id="privacy"><p className="eyebrow">DATA & PRIVACY</p><h2>Keep a copy of your progress.</h2><p>Private plans, habits and health logs stay in this browser. Account sync requires separate email setup and vault unlock below. No analytics or health data onchain. Browser storage is not encrypted: anyone using this browser profile may read it.</p><p className="fine">Separate versioned backups preserve the existing Goal recovery format. Clearing site data removes local records. Wallet credentials and secrets are never included.</p></section>
      <VaultSyncControls/>
      <PrivateVaultTools/>
      <MotionPreference/>
      <PrivateBackups/>
      <div className="detail-grid">
        <section className="panel">
          <h2>Export Goal Data</h2>
          <p>
            Save a private backup of your goal names, targets, dates and
            preferences. Clearing browser storage removes these plans.
          </p>
          <p className="fine">
            Backups contain personal information. Store them somewhere private.
            Local demo and testnet backups are separate.
          </p>
          <button
            className="primary"
            onClick={exportData}
            disabled={!s.loaded || !s.owner}
          >
            Export Goal Data
          </button>
        </section>
        <section className="panel">
          <h2>Import Goal Data</h2>
          <p>
            Imports must match the current network and wallet. Matching goal IDs
            replace their saved plans; other plans are kept.
          </p>
          <label>
            Choose a backup file
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1000000) {
                  s.setError("Backup exceeds 1 MB.");
                  return;
                }
                setBackup(await file.text());
              }}
            />
          </label>
          <label>
            Or paste backup JSON
            <textarea
              value={backup}
              maxLength={1000000}
              rows={5}
              onChange={(e) => setBackup(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            onClick={() => s.importPlans(backup)}
            disabled={!backup || !s.owner}
          >
            Import backup
          </button>
        </section>
      </div>
      <details className="advanced-diagnostics" id="diagnostics"><summary>Advanced Diagnostics</summary>
      <ConnectionDiagnostics
        key={`${s.chain}:${s.owner}`}
        chain={s.chain}
        owner={s.owner}
        balance={s.balance}
      />
      </details>
      <section className="panel">
        <h2>About this alpha</h2>
        <dl className="metrics">
          <div>
            <dt>Selected environment</dt>
            <dd>{s.chain}</dd>
          </div>
          <div>
            <dt>Wallet / demo identity</dt>
            <dd>{shortAccount(s.owner)}</dd>
          </div>
          <div>
            <dt>Goal metadata</dt>
            <dd>Device-local · version 1 JSON</dd>
          </div>
          <div>
            <dt>Investment strategy</dt>
            <dd>Idle. External integrations pending verification.</dd>
          </div>
        </dl>
        <p>
          Funding Wealth assumes 0% future investment return. Scenario
          projections are illustrative. Testnet assets have no monetary value.
          This alpha is unaudited and does not support mainnet.
        </p>
      </section>
    </div>
  );
}
