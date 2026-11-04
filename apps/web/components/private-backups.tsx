"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import { habitDataSchema } from "../lib/habits";
import { usePlatform } from "./platform/use-platform";
import { platformSchema } from "../lib/positions";
import { healthSchema } from "../lib/health";
import { isShowcase } from "../lib/showcase-storage";
import { localDate } from "../lib/local-date";
import { plural } from "../lib/plural";
const count = (n: number, one: string, many?: string) => `${n} ${plural(n, one, many)}`;
import { exportFileName, isShowcaseBackup, type ShowcaseModule } from "../lib/showcase-detect";
import { backupRefusal, backupRefusalMessage, blockedReadMessage } from "../lib/storage-error-copy";
import { CURRENT_VERSIONS } from "../lib/vault/versions";
/** The newest schemaVersion this app reads, per module: a newer backup is refused as such (QA-22). One table with sync's (Session W). */
const NEWEST: Record<ShowcaseModule, number> = { platform: CURRENT_VERSIONS.finance, habits: CURRENT_VERSIONS.habits, health: CURRENT_VERSIONS.health };

import { useHabits } from "./habits/use-habits";
import { useHealth } from "./health/use-health";
import {plainErrorMessage} from "../lib/plain-error";

type BackupStore = { importLimit:number; loaded: boolean; error: string; exportData: () => Promise<string>; importData: (raw: string) => Promise<void>; refresh: () => void };
/**
 * Session AL (P-BN-32/33; BN-020, BN-104, BN-106, BN-021, D-058, D-219): each card says what its file holds and what it
 * does not (so a restore's gaps are known before an erase), names the file it saves, never claims a save the browser has
 * not made (a browser may first ask where to save), shows a restore's refusal right under the file field, and only the
 * card used last speaks: earlier lines of the other cards are cleared, so messages never pile up.
 */
type Coverage = { holds: string; notHeld: string };
function ModuleBackup<T>({ name, module, schema, store, describe, coverage, speaking, onSpeak, slug = name.toLowerCase().replace(/\s+/g, "-") }: { name: string; module: ShowcaseModule; schema: z.ZodType<T>; store: BackupStore; describe: (value: T) => string; coverage: Coverage; speaking: boolean; onSpeak: () => void; /** The file name's part; kept when a name changes, so every copy of one module is named alike. */ slug?: string }) {
  const [raw, setRaw] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  // A Showcase demo file restored into real data needs its own confirmation (QA-17).
  const [demo, setDemo] = useState(false);
  const [demoConfirmed, setDemoConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [where, setWhere] = useState<"export" | "restore">("export");
  const selection = useRef(0);
  const fileName = `zigoals-${slug}-backup-${localDate()}.json`;
  async function download() {
    onSpeak(); setWhere("export");
    try {
      const url = URL.createObjectURL(new Blob([await store.exportData()], { type: "application/json" }));
      const anchor = document.createElement("a");
      // One pattern for the three modules (QA-26): zigoals-<module>-backup-<local date>.json, no spaces.
      const saved = exportFileName(fileName, isShowcase());
      anchor.href = url; anchor.download = saved;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      // The browser may first ask where to save: the copy exists only once it is saved (BN-104).
      setMessage(`Your browser is saving “${saved}”. If it asks where to save it, the copy exists once you choose a place. Keep this file private.`); setError("");
    } catch (error) { setError(blockedReadMessage(error) ?? "The original data could not be read. Check browser storage access."); }
  }
  async function selectFile(file?: File) {
    const current = ++selection.current;
    onSpeak(); setWhere("restore");
    setRaw(""); setSummary(""); setConfirmed(false); setDemo(false); setDemoConfirmed(false); setError(""); setMessage("");
    if (!file) return;
    let text = "";
    try {
      if (file.size > store.importLimit) throw Error();
      text = await file.text();
      if(new TextEncoder().encode(text).length>store.importLimit)throw Error();
      const data = schema.parse(JSON.parse(text));
      if (current !== selection.current) return;
      setRaw(text); setSummary(describe(data)); setDemo(!isShowcase() && isShowcaseBackup(module, data));
    } catch {
      if (current !== selection.current) return;
      // Each refusal says what is wrong with the file (QA-22): too large, not a backup, another module, newer, or damaged.
      const refusal = file.size > store.importLimit ? "TOO_LARGE" : backupRefusal(text, { module, newest: NEWEST[module], limit: store.importLimit });
      let kind: unknown; try { kind = (JSON.parse(text) as { kind?: unknown })?.kind; } catch { /* not JSON */ }
      setError(backupRefusalMessage(refusal, { module, kind, limit: store.importLimit }));
    }
  }
  async function restore() {
    if (!confirmed || !raw || busy || demo && !demoConfirmed) return;
    onSpeak(); setWhere("restore");
    setBusy(true); setError(""); setMessage("");
    try {
      await store.importData(raw);
      setRaw(""); setSummary(""); setConfirmed(false); setDemo(false); setDemoConfirmed(false);
      setMessage(`${name} restored. What this device held before is kept as a recovery copy in this browser. Not in this file, so not restored: ${coverage.notHeld}`);
    } catch (error) { setError(plainErrorMessage(error, "Restore failed. Existing data was preserved.")); }
    finally { setBusy(false); }
  }
  // Session AJ (item 19, SE3): each module's backup has its own anchor (#backup-health, #backup-habits, #backup-finance…).
  return <section className="panel module-backup" id={`backup-${module}`} aria-label={`${name} backup`}>
    <p className="eyebrow">{name.toUpperCase()} · PRIVATE BROWSER DATA</p><h3>{name} backup</h3>
    <p>Export all {name.toLowerCase()} records, including history. These files contain personal information and no wallet credentials.</p>
    <p className="fine backup-coverage"><strong>In this file:</strong> {coverage.holds} <strong>Not in it:</strong> {coverage.notHeld} Saved as <code>{fileName}</code>.</p>
    {store.error && <p className="notice">Stored data needs attention. Export its available stored data before restoring. If the database cannot be read, keep it intact and use a separate protected backup. <button className="text-link" onClick={store.refresh}>Retry reading</button></p>}
    <button className="secondary" disabled={!store.loaded || busy} onClick={download}>Export {name}</button>
    {speaking && where === "export" && (message ? <p role="status">{message}</p> : error ? <p role="alert">{error}</p> : null)}
    <details className="backup-restore"><summary>Restore {name} from a file</summary><p className="fine">This replaces this module only. Export a separate copy first. Other modules are kept.</p>
      <label>Choose {name} backup<input type="file" accept="application/json,.json" disabled={busy} onChange={event => void selectFile(event.target.files?.[0])}/></label>
      {/* D-058: a refused file is explained right under its field, not further down the page. */}
      {speaking && where === "restore" && error && <p role="alert">{error}</p>}
      {raw && <><p className="backup-preview">Valid supported backup · {summary}</p>{demo && <><p className="notice">This file is Showcase demo data: fictional examples, not your own records. Restoring it replaces your {name.toLowerCase()} with the demo examples.</p><label className="checkbox"><input type="checkbox" checked={demoConfirmed} onChange={event => setDemoConfirmed(event.target.checked)} disabled={busy}/>I understand this is Showcase demo data, not my records.</label></>}<label className="checkbox"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy}/>Replace my {name.toLowerCase()} with this backup.</label><button className="primary" aria-describedby={!confirmed || demo && !demoConfirmed ? `${module}-restore-hint` : undefined} disabled={!confirmed || demo && !demoConfirmed || busy} onClick={() => void restore()}>{busy ? "Restoring…" : `Restore ${name}`}</button>{/* Session AH Part 3 (DS8, N-049): why the button waits, next to it. */}{(!confirmed || demo && !demoConfirmed) && <p className="fine" id={`${module}-restore-hint`}>{demo && !demoConfirmed ? "Tick both boxes above to restore." : `Tick “Replace my ${name.toLowerCase()} with this backup.” above to restore.`}</p>}</>}
    </details>
    {speaking && where === "restore" && message && <p role="status">{message}</p>}
  </section>;
}
const NOT_ELSEWHERE = "“Export everything”, below, makes one file of every area.";
export function PrivateBackups() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform();
  const [speaker, setSpeaker] = useState<ShowcaseModule | null>(null);
  return <div className="private-backup-grid">
    {/* Session AK G2 (RELEASE_REVIEW_2 R2-16): "Goals and Wealth", the pages' own names (it was "Positions and Goals"); the
        file keeps its name, so earlier and later copies sort together. */}
    <ModuleBackup name="Goals and Wealth" slug="positions-and-goals" module="platform" schema={platformSchema} store={platform} describe={data => `${count(data.goals.length, "goal")} · ${count(data.positions.length, "position")} · ${count(data.allocations.length, "allocation")} · plans and snapshots included`} speaking={speaker === "platform"} onSpeak={() => setSpeaker("platform")} coverage={{ holds: "your goals with their plans and history, the positions and wallets you watch, allocations, snapshots and contributions.", notHeld: `your theme and page switches, Chess, Earn progress, Habits, Health, the Checklist and Tasks; accounts and debts are in Export everything. ${NOT_ELSEWHERE}` }}/>
    <ModuleBackup name="Habits" module="habits" schema={habitDataSchema} store={habits} describe={data => `${count(data.habits.length, "habit")} · ${count(data.habits.reduce((sum, habit) => sum + habit.entries.length, 0), "check-in")}`} speaking={speaker === "habits"} onSpeak={() => setSpeaker("habits")} coverage={{ holds: "your habits with every check-in.", notHeld: `Goals, Wealth, Health, the Checklist path, Tasks and your settings. ${NOT_ELSEWHERE}` }}/>
    <ModuleBackup name="Health" module="health" schema={healthSchema} store={health} describe={data => `${count(data.foods.length, "food")} · ${count(data.recipes.length, "recipe")} · ${count(data.diary.length, "meal")} · ${count(data.weights.length, "weight")} · ${count(data.activity.length, "activity", "activities")}`} speaking={speaker === "health"} onSpeak={() => setSpeaker("health")} coverage={{ holds: "your Health records: foods, recipes, meals, weights, activity and the other Health logs this version keeps in its Health store.", notHeld: `Goals, Wealth, Habits, the Checklist, photos and your settings. ${NOT_ELSEWHERE}` }}/>
  </div>;
}
