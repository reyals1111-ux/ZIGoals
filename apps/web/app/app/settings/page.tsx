"use client";
import { useState } from "react";
import { useGoals } from "../../../components/goal-provider";
import { loadMetadata } from "../../../lib/storage";
export default function Settings() {
  const s = useGoals();
  const [backup, setBackup] = useState("");
  function exportData() {
    try {
      const data = loadMetadata(localStorage, s.chain, s.owner);
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
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Keep your plans with you</p>
          <h1>Your data. Your control.</h1>
          <p>
            Goal plans stay on this device. Your wallet controls onchain funds.
          </p>
        </div>
      </div>
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
      <section className="panel">
        <h2>About this alpha</h2>
        <dl className="metrics">
          <div>
            <dt>Selected environment</dt>
            <dd>{s.chain}</dd>
          </div>
          <div>
            <dt>Wallet / demo identity</dt>
            <dd>{s.owner || "Disconnected"}</dd>
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
          Funding Health assumes 0% future investment return. Scenario
          projections are illustrative. Testnet assets have no monetary value.
          This alpha is unaudited and does not support mainnet.
        </p>
      </section>
    </>
  );
}
