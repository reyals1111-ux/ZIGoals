"use client";
import { DataHome } from "../../../components/bottom-sections";
import { SendFeedback } from "../../../components/help/send-feedback";
import { AboutThisAlpha } from "../../../components/alpha/about-this-alpha";
import { PointTellSetting } from "../../../components/point-tell/point-tell-setting";
import { exportFileName } from "../../../lib/showcase-detect";
import "../../../components/life-pages.css";
import {getAppStorage,isShowcase} from "../../../lib/showcase-storage";
import Link from "next/link";
import {VaultSyncControls} from "../../../components/vault-sync-panel";
import {PrivateVaultTools} from "../../../components/private-vault-tools";
import {MotionPreference} from "../../../components/motion-preference";
import {LazyThemeSwitch as ThemeSwitch} from "../../../components/shell/theme-switch-lazy";
import {ShowcaseControls} from "../../../components/showcase-controls";
import { PrivateBackups } from "../../../components/private-backups";
import { ExportEverything } from "../../../components/export-everything";
import { SwitchImport } from "../../../components/import/switch-import";
import { WeeklyReviewDay } from "../../../components/weekly-review/weekly-review-day";
import { PushRemindersPanel } from "../../../components/push/push-reminders-panel";
import { Slot } from "../../../components/progress/slot";
import { GuideSettings } from "../../../components/coach/guide-settings";
import { AiSettingsSection } from "../../../components/ai/ai-settings-section";
import {LoadBoundary} from '../../../components/load-boundary';
import { deployment } from "../../../lib/deployment-config";
import { useState, type ReactNode } from "react";
import { useGoals } from "../../../components/goal-provider";
import { ConnectionDiagnostics } from "../../../components/connection-diagnostics";
import { shortAccount } from "../../../lib/diagnostics";
import { loadMetadata } from "../../../lib/storage";
import { NebulaFlow } from "../../../components/nebula-flow";
import { HeaderArtCorner, OrbitArt } from "../../../components/header-art/orbit-art";
import { SettingsGlyph } from "../../../components/header-art/glyphs/settings";
import { PhoneSettingsList } from "../../../components/phone/phone-settings";
import { TimeZoneSettings } from "../../../components/settings/time-zone-settings";
import { KeepSettingsJump } from "../../../components/settings/keep-jump";
import { WrapUpSettings } from "../../../components/settings/wrap-up-settings";
import { ChessSettings } from "../../../components/settings/chess-settings";
import { LinksSettings } from "../../../components/links/links-settings";
import { MusicSettings } from "../../../components/music/music-settings";
import { PagesSettings } from "../../../components/settings/pages-settings";
import { AfChecklistSection } from "../../../components/settings/af-checklist-section";
import { AfEarnSection } from "../../../components/settings/af-earn-section";
import { AfSigningSection } from "../../../components/settings/af-signing-section";
import { AfExtrasSection } from "../../../components/settings/af-extras-section";
/**
 * Session W Part 24: Settings in six labelled groups, Data & privacy first (backups stay on a phone's first screen, as
 * Session E chose). The chips and the phone's list jump to them; every section keeps its own id and content.
 */
const SETTINGS_GROUPS: [id: string, title: string][] = [["settings-data", "Data & privacy"], ["settings-app", "Your app"], ["settings-areas", "Your areas"], ["settings-account", "Account & devices"], ["settings-zigi", "ZIGi"], ["settings-help", "Help & diagnostics"]];
/** Session AB-Design (owner request 36): one small line icon per Settings group, before its title. */
const GROUP_ICON: Record<string, ReactNode> = {
  'settings-data': <path d="M4 7h16M4 12h16M4 17h10"/>,
  'settings-app': <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 17h6"/></>,
  'settings-areas': <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  'settings-account': <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  'settings-zigi': <><circle cx="12" cy="12" r="8"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/><path d="M9 15.5c1.5 1.5 4.5 1.5 6 0"/></>,
  'settings-help': <><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></>,
};
function SettingsGroup({id, title, children}: {id: string; title: string; children: ReactNode}) {
  const icon = GROUP_ICON[id];
  return <div className="settings-group" id={id} role="group" aria-labelledby={`${id}-title`}><p className="settings-group-title" id={`${id}-title`}>{icon && <svg className="settings-group-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>}{title}</p>{children}</div>;
}
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
      a.download = exportFileName(`zigoals-${s.chain}-goals.json`, isShowcase());
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      s.setError(String(e));
    }
  }
  return (
    <div className="settings-page">
      <div className="page-heading header-art-host">
        <div>
          <p className="eyebrow page-eyebrow"><NebulaFlow identity="settings-eyebrow">Keep your plans with you</NebulaFlow></p>
          <h1><NebulaFlow identity="settings-title">Your data. Your control.</NebulaFlow></h1>
          <p className="page-lede">
            Goal plans stay on this device. Your wallet controls onchain funds.
          </p>
          <p><Link className="text-link" href="/app/help" style={{display: "inline-flex", alignItems: "center", minHeight: 44}}>Help: install on iPhone, keep your data safe, send feedback →</Link></p>
        </div>
        <HeaderArtCorner><OrbitArt glyph={SettingsGlyph} spin={12}/></HeaderArtCorner>
      </div>
      <PhoneSettingsList/>
      <KeepSettingsJump/>
      <nav className="settings-sections" aria-label="Settings sections">{SETTINGS_GROUPS.map(([id, title]) => <a href={`#${id}`} key={id}>{title}</a>)}</nav>
      <section className="settings-safety-summary" aria-label="How your data is stored"><div><strong>Private by default</strong><p>Personal Goals, Habits, Health and portfolio records stay in this browser.</p></div><div><strong>Back up what matters</strong><p>Export a copy before clearing site data or moving to another device.</p></div><div><strong>A separate space to explore</strong><p>Showcase uses fictional records in this tab. Your usual saved records remain separate.</p></div></section>
      <SettingsGroup id="settings-data" title="Data & privacy">
        <section className="privacy-intro" id="privacy"><p className="eyebrow">YOUR RECORDS</p><h2>Keep a copy of your progress.</h2><p>Private plans, habits and health logs stay in this browser. Account sync requires separate email setup and vault unlock below. No analytics or health data onchain. Browser storage is not encrypted: anyone using this browser profile may read it.</p><p className="fine">Separate versioned backups preserve the existing Goal recovery format. Clearing site data removes local records. Wallet credentials and secrets are never included.</p></section>
        {/* Session AA-Cloud Part 6: the Data health page (where each part lives, what this device holds, what ZIGi sees). */}
        <Link className="panel data-health-door" href="/app/settings/data"><span><strong>Your data</strong><small>Where each part lives, what this device holds and what ZIGi can see.</small></span><span aria-hidden="true">→</span></Link>
        <PrivateVaultTools/>
        <PrivateBackups/>
        <ExportEverything/>
        <SwitchImport/>
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
            <p className="fine">
              This older format holds local simulation Goal plans only. Tracked Goals and Wealth are in the Positions and
              Goals backup above, and Today preferences only in the encrypted backup.
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
      </SettingsGroup>
      <SettingsGroup id="settings-app" title="Your app">
        <ShowcaseControls/>
        <PagesSettings/>
        <AfChecklistSection/>
        <AfEarnSection/>
        <AfSigningSection/>
        <AfExtrasSection/>
        {/* Session AA-Cloud: a named place for Session AA-Local's game-layer switch (components/progress/slot.tsx). */}
        <Slot place="settings:your-app"/>
        <TimeZoneSettings/>
        <WrapUpSettings/>
        <section className="panel" id="appearance" aria-label="Appearance"><p className="eyebrow">APPEARANCE</p><h2>Theme</h2><p className="fine">How ZIGoals looks on this device. Your choice stays here and is never synced.</p><ThemeSwitch compact/><h2>Motion</h2><MotionPreference/></section>
        <MusicSettings/>
        <LinksSettings/>
      </SettingsGroup>
      <SettingsGroup id="settings-areas" title="Your areas">
        <div className="settings-module-links"><section id="habits-settings"><p className="eyebrow">HABITS</p><h2>Your rhythm.</h2><p>Schedules and targets are chosen per Habit. A reminder time is optional and kept on this device only: after it, Today shows a reminder card in the app. Review streaks and your saved check-in history.</p><Link href="/app/habits" className="text-link">Manage habits →</Link><WeeklyReviewDay /></section><section id="health-settings"><p className="eyebrow">HEALTH</p><h2>Your own targets.</h2><p>Optional nutrition, weight and step targets. You choose every value.</p><Link href="/app/health" className="text-link">Open Health →</Link></section></div>
        <ChessSettings/>
        <GuideSettings/>
        <PushRemindersPanel/>
        {/* Session AA-Cloud: a named place for Session AA-Local's reminders plan link. */}
        <Slot place="settings:reminders"/>
        <section className="panel settings-market-data" id="market-data"><p className="eyebrow">MARKET DATA</p><h2>Know where each value comes from.</h2><p>Supported automatic market prices come from CoinGecko. Public asset identifiers and your quote currency are used to request market data; private holdings, quantities, Goals and Health records are not sent.</p><div className="settings-data-types"><div><strong>Automatic references</strong><p>Supported assets show price source and freshness. Missing or stale quotes remain labelled.</p></div><div><strong>Your manual values</strong><p>Cash, property, custom assets and unsupported markets use values you enter. Manual values are never presented as live quotes.</p></div></div><Link className="text-link" href="/app/markets">Explore market references →</Link></section>
      </SettingsGroup>
      <SettingsGroup id="settings-account" title="Account & devices">
        <VaultSyncControls/>
        <div className="settings-overview">
          <section className="panel" id="account"><p className="eyebrow">ACCOUNT</p><h2>Your space.</h2><p>{s.mode === "local" ? "Local Demo · no account needed" : "Keplr · explicitly connected for this session"}</p><code>{shortAccount(s.owner)}</code><p className="fine">Habits and Health belong to this browser, independently of the active wallet. Switching wallets does not hide or move them.</p></section>
          <section className="panel" id="network"><p className="eyebrow">NETWORK</p><h2>ZIGChain Testnet.</h2><p>zig-test-2 · ZIG (18 decimals)</p><span className="badge">Testnet Alpha</span><p className="fine">Connect or reconnect explicitly with the wallet control above. Reload returns to Local Demo.</p></section>
          <section className="panel" id="contract"><p className="eyebrow">GOALS / CONTRACT</p><h2>The financial layer.</h2><p>Goal Manager: {deployment.success && deployment.data.status === "DEPLOYED" ? "See deployment diagnostics" : "NOT DEPLOYED"}</p><p>Code ID: {deployment.success ? deployment.data.codeId ?? "NOT DEPLOYED" : "Configuration invalid"}</p><p className="fine">Idle strategy. Contract execution is disabled in the public Alpha.</p></section>
        </div>
      </SettingsGroup>
      <SettingsGroup id="settings-zigi" title="ZIGi">
        <LoadBoundary label="ZIGi’s settings"><AiSettingsSection/></LoadBoundary>
      </SettingsGroup>
      <SettingsGroup id="settings-help" title="Help & diagnostics">
        <details className="advanced-diagnostics" id="diagnostics"><summary>Advanced Diagnostics</summary>
        <ConnectionDiagnostics
          key={`${s.chain}:${s.owner}`}
          chain={s.chain}
          owner={s.owner}
          balance={s.balance}
        />
        </details>
        {/* Session X Part 11: the same feedback email as Help, where diagnostics live. */}
        <section className="panel" id="send-feedback" aria-labelledby="send-feedback-title">
          <p className="eyebrow">SEND FEEDBACK</p>
          <h2 id="send-feedback-title">Tell us what you think</h2>
          <SendFeedback />
        </section>
        {/* Session AB-Cloud Part 6 (ADR-023 C23): the Point & tell switch. */}
        <section className="panel" id="point-tell" aria-labelledby="point-tell-title"><p className="eyebrow">POINT &amp; TELL</p><h2 id="point-tell-title">Point at it, say what you think</h2><PointTellSetting /></section>
        <section className="panel" id="about-this-alpha" aria-labelledby="about-this-alpha-title">
          <h2 id="about-this-alpha-title">About this alpha</h2>
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
          {/* Session AC (owner finding 3): the facts the footer used to carry, live, with the build environment. */}
          <AboutThisAlpha />
        </section>
      </SettingsGroup>
      <DataHome />
    </div>
  );
}
