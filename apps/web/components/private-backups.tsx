"use client";
import { useRef, useState } from "react";
import type { z } from "zod";
import { habitDataSchema } from "../lib/habits";
import { usePlatform } from "./platform/use-platform";
import { platformSchema } from "../lib/positions";
import { healthSchema } from "../lib/health";

import { useHabits } from "./habits/use-habits";
import { useHealth } from "./health/use-health";

type BackupStore = { importLimit:number; loaded: boolean; error: string; exportData: () => Promise<string>; importData: (raw: string) => Promise<void>; refresh: () => void };
function ModuleBackup<T>({ name, schema, store, describe }: { name: string; schema: z.ZodType<T>; store: BackupStore; describe: (value: T) => string }) {
  const [raw, setRaw] = useState("");
  const [summary, setSummary] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const selection = useRef(0);
  async function download() {
    try {
      const url = URL.createObjectURL(new Blob([await store.exportData()], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = name === "Health" ? "zigoals-health-v1.json" : `zigoals-${name.toLowerCase()}-backup.json`;
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("Backup download started. Keep this file private."); setError("");
    } catch { setError("The original data could not be read. Check browser storage access."); }
  }
  async function selectFile(file?: File) {
    const current = ++selection.current;
    setRaw(""); setSummary(""); setConfirmed(false); setError(""); setMessage("");
    if (!file) return;
    try {
      if (file.size > store.importLimit) throw Error();
      const text = await file.text();
      if(new TextEncoder().encode(text).length>store.importLimit)throw Error();
      const data = schema.parse(JSON.parse(text));
      if (current !== selection.current) return;
      setRaw(text); setSummary(describe(data));
    } catch { if (current === selection.current) setError(`Choose a valid supported backup for this module, under ${store.importLimit/1_000_000} MB. Existing data was not changed.`); }
  }
  async function restore() {
    if (!confirmed || !raw || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await store.importData(raw);
      setRaw(""); setSummary(""); setConfirmed(false);
      setMessage(`${name} restored. Previous stored bytes were preserved in a local recovery record.`);
    } catch { setError("Restore failed. Existing data was preserved. A newer stored version cannot be replaced by this app."); }
    finally { setBusy(false); }
  }
  return <section className="panel module-backup" aria-label={`${name} backup`}>
    <p className="eyebrow">{name.toUpperCase()} · PRIVATE BROWSER DATA</p><h3>{name} backup</h3>
    <p>Export all {name.toLowerCase()} records, including history. These files contain personal information and no wallet credentials.</p>
    {store.error && <p className="notice">Stored data needs attention. Export its available stored data before restoring. If the database cannot be read, keep it intact and use a separate protected backup. <button className="text-link" onClick={store.refresh}>Retry reading</button></p>}
    <button className="secondary" disabled={!store.loaded || busy} onClick={download}>Export {name}</button>
    <details className="backup-restore"><summary>Restore {name} from a file</summary><p className="fine">This replaces this module only. Export a separate copy first. Other modules are kept.</p>
      <label>Choose {name} backup<input type="file" accept="application/json,.json" disabled={busy} onChange={event => void selectFile(event.target.files?.[0])}/></label>
      {raw && <><p className="backup-preview">Valid supported backup · {summary}</p><label className="checkbox"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={busy}/>Replace my {name.toLowerCase()} with this backup.</label><button className="primary" disabled={!confirmed || busy} onClick={() => void restore()}>{busy ? "Restoring…" : `Restore ${name}`}</button></>}
    </details>
    {message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}
  </section>;
}
export function PrivateBackups() {
  const habits = useHabits(), health = useHealth(), platform = usePlatform();
  return <div className="private-backup-grid">
    <ModuleBackup name="Positions and Goals" schema={platformSchema} store={platform} describe={data => `${data.goals.length} goals · ${data.positions.length} positions · ${data.allocations.length} allocations · plans and snapshots included`}/>
    <ModuleBackup name="Habits" schema={habitDataSchema} store={habits} describe={data => `${data.habits.length} habits · ${data.habits.reduce((sum, habit) => sum + habit.entries.length, 0)} check-ins`}/>
    <ModuleBackup name="Health" schema={healthSchema} store={health} describe={data => `${data.foods.length} foods · ${data.recipes.length} recipes · ${data.diary.length} meals · ${data.weights.length} weights · ${data.activity.length} activities`}/>
  </div>;
}
