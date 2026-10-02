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
/** The newest schemaVersion this app reads, per module: a newer backup is refused as such (QA-22). */
const NEWEST: Record<ShowcaseModule, number> = { platform: 3, habits: 2, health: 1 };

import { useHabits } from "./habits/use-habits";
import { useHealth } from "./health/use-health";

type BackupStore = { importLimit:number; loaded: boolean; error: string; exportData: () => Promise<string>; importData: (raw: string) => Promise<void>; refresh: () => void };
function ModuleBackup<T>({ name, module, schema, store, describe }: { name: string; module: ShowcaseModule; schema: z.ZodType<T>; store: BackupStore; describe: (value: T) => string }) {
  const [raw, setRaw] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  // A Showcase demo file restored into real data needs its own confirmation (QA-17).
  const [demo, setDemo] = useState(false);
  const [demoConfirmed, setDemoConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selection = useRef(0);
  async function download() {
    try {
      const url = URL.createObjectURL(new Blob([await store.exportData()], { type: "application/json" }));
      const anchor = document.createElement("a");
      // One pattern for the three modules (QA-26): zigoals-<module>-backup-<local date>.json, no spaces.
      anchor.href = url; anchor.download = exportFileName(`zigoals-${name.toLowerCase().replace(/\s+/g, "-")}-backup-${localDate()}.json`, isShowcase());
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup download started. Keep this file private."); setError("");
    } catch (error) { setError(blockedReadMessage(error) ?? "The original data could not be read. Check browser storage access."); }
  }
  async function selectFile(file?: File) {
    const current = ++selection.current;
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
    setBusy(true); setError(""); setMessage("");
    try {
      await store.importData(raw);
      setRaw(""); setSummary(""); setConfirmed(false); setDemo(false); setDemoConfirmed(false);
      setMessage(`${name} restored. Previous stored bytes were preserved in a local recovery record.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Restore failed. Existing data was preserved."); }
    finally { setBusy(false); }
  }
  return <section className="panel module-backup" aria-label={`${name} backup`}>
    <p className="eyebrow">{name.toUpperCase()} · PRIVATE BROWSER DATA</p><h3>{name} backup</h3>
    <p>Export all {name.toLowerCase()} records, including history. These files contain personal information and no wallet credentials.</p>
    {store.error && <p className="notice">Stored data needs attention. Export its available stored data before restoring. If the database cannot be read, keep it intact and use a separate protected backup. <button className="text-link" onClick={store.refresh}>Retry reading</button></p>}
    <button className="secondary" disabled={!store.loaded || busy} onClick={download}>Export {name}</button>
    <details className="backup-restore"><summary>Restore {name} from a file</summary><p className="fine">This replaces this module only. Export a separate copy first. Other modules are kept.</p>
      <label>Choose {name} backup<input type="file" accept="application/json,.json" disabled={busy} onChange={event => void selectFile(event.target.files?.[0])}/></label>
      {raw && <><p className="backup-preview">Valid supported backup · {summary}</p>{demo && <><p className="notice">This file is Showcase demo data: fictional examples, not your own records. Restoring it replaces your {name.toLowerCase()} with the demo examples.</p><label className="checkbox"><input type="checkbox" checked={demoConfirmed} onChange={event => setDemoConfirmed(event.target.checked)} disabled={busy}/>I understand this is Showcase demo data, not my records.</label></>}<label className="checkbox"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy}/>Replace my {name.toLowerCase()} with this backup.</label><button className="primary" disabled={!confirmed || demo && !demoConfirmed || busy} onClick={() => void restore()}>{busy ? "Restoring…" : `Restore ${name}`}</button></>}
    </details>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
export function PrivateBackups() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform();
  return <div className="private-backup-grid">
    <ModuleBackup name="Positions and Goals" module="platform" schema={platformSchema} store={platform} describe={data => `${count(data.goals.length, "goal")} · ${count(data.positions.length, "position")} · ${count(data.allocations.length, "allocation")} · plans and snapshots included`}/>
    <ModuleBackup name="Habits" module="habits" schema={habitDataSchema} store={habits} describe={data => `${count(data.habits.length, "habit")} · ${count(data.habits.reduce((sum, habit) => sum + habit.entries.length, 0), "check-in")}`}/>
    <ModuleBackup name="Health" module="health" schema={healthSchema} store={health} describe={data => `${count(data.foods.length, "food")} · ${count(data.recipes.length, "recipe")} · ${count(data.diary.length, "meal")} · ${count(data.weights.length, "weight")} · ${count(data.activity.length, "activity", "activities")}`}/>
  </div>;
}
