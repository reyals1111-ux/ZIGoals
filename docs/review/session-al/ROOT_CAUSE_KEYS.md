# Session AL — root-cause group keys (A2)

Every ledger line carries exactly one primary key from this list (a second key may follow after a `+`, e.g. `UNDO+TOAST`). Helpers who need a new key propose it in their ledger file's "Proposed keys" section; the integrator adds it here. One AL row = one fix at one shared source; rows are grouped by key first, then by the shared source inside the key.

| Key | Meaning (the shared source it points at) |
|---|---|
| LIMITS | Plausibility / length limits differ or are missing per kind of value (one limits table: `lib/limits/plausibility.ts`) |
| FIELD-ERROR | Error shown far from its field, no focus, no aria-describedby, silent refusal |
| CONFIRM-DELETE | Destructive action with no confirm and no working Undo; missing delete/archive/rename |
| UNDO | An Undo that doesn't restore the record (store state) |
| TOAST | Toast pile-up, stale toast, wrong toast text, no toast, not dismissable |
| COUNTS | The same count computed differently in two places (one count function per thing) |
| NUMBERS-SOURCE | The same amount/value read from different stores or snapshots on different pages/ZIGi/NOVA |
| ROUNDING | Rounding / precision differs (99 vs 100 %, 0.24 vs 0.69) |
| UNITS | Unit mix-ups (kg/lb, cm/in, mL/fl oz, kcal, custom goal units, "20 ZIG") |
| DECIMAL-INPUT | Decimal comma / locale number typing dropped or misread |
| CURRENCY | Invented currency codes, wrong symbol, USD vs EUR mix |
| DATES | Date formats, date maths, past/future date rules, time-of-day defaults |
| TIMEZONE | Local vs UTC midnight, before-07:00, DST |
| PLURALS | "1 days", grammar of counts |
| COPY | Wording, contradictions, jargon, misleading or stale text (no logic change) |
| LAUNCHER-OVERLAP | Floating ZIGi/Earn/Music/Checklist launchers covering content below 901 px (O3) |
| LAYOUT-320 / LAYOUT-375 / LAYOUT-500 / LAYOUT-768 / LAYOUT-DESKTOP | Clipping, overflow, overlap, sideways scroll at that width (LAYOUT-500 = the ~480–610 px desktop window) |
| NAV | Sidebar / rail / phone nav, missing pages in nav (O4), header consistency, 404s, dead links |
| THEME | Light/Dark/Nebula parity, contrast in one theme |
| A11Y | Accessible names, keyboard, focus, contrast, target size |
| MOTION | Motion settings not respected, reduced motion |
| PERSISTENCE | Data not saved, lost on reload, wizard resets |
| CROSS-PAGE-SYNC | One page updates, another stays stale until reload |
| XP-BADGES | XP farmable, false badges/celebrations, journey maths |
| STREAKS | Streak / schedule / habit completion logic |
| FIRST-RUN | Fresh visit landing, welcome, onboarding wizard, empty states |
| BACKUP-RESTORE | Encrypted backup, readable export, restore round-trip, erase coverage |
| IMPORT-EXPORT | CSV/ICS/ZIP import or export content and errors |
| SEARCH | Global search / Ctrl+K / command palette |
| QUICK-ADD | Global Quick add parsing and routing |
| TASKS-FEATURE | Tasks capability gaps (AL_SCOPE C) |
| CHECKLIST | Checklist behaviour (protected orbit unchanged) |
| AI-SAFETY | Secrets, emergencies, distress, injection, false claims (deterministic guard) |
| AI-FACTS | ZIGi/NOVA answers wrong, canned, invented, differing from pages, question → write preview |
| AI-ACTIONS | ZIGi/NOVA actions (create/log) failing, confirm cards, Undo of AI actions |
| AI-CONNECTION | Ollama/LM Studio/provider detection, setup tutorial truthfulness, model size guidance |
| AI-STABILITY | Conversation loss, tab crash, memory growth, panel auto-close |
| HUD | NOVA dashboard visuals/widgets (Part 11) |
| PRICING | Premium/paywall/pricing surfaces (O2, Part 12) |
| CHAIN-DATA | Staking/Earn/Governance/Ecosystem data, stale dates, wrong chain figures |
| WALLET | Wallet connect/menu/remove/rename (signing paths unchanged) |
| SETTINGS | A Settings toggle not doing what it says |
| HELP | Help/Known limitations/What's new not matching the app |
| PERF | Slow loads, long tasks, jank |
| CRASH | Uncaught error, white screen, "Aw, Snap" with an app cause |
| STALE-DATA | Out-of-date deadlines, "read on" dates, prices labelled live when not |
| SECURITY-LOCK | PIN / screen lock / privacy lock behaviour |
| PRIVACY | Data sharing defaults, what AI can see, privacy copy truth |
| COMPETITOR-GAP | A "missing vs competitors" item (Part 15; one AL row each, A11) |
| ENV-ONLY | Caused by the test environment; still investigated for an app cause (R7) |
| POSITIVE | Keep-list (regression guard), not a defect |

## AL row ids
`AL-<KEY>-<nnn>` assigned by the integrator at merge time. Helpers propose rows as `P-<bot>-<nn>` with a key and a one-line fix at a named shared source; the integrator maps every `P-` row to exactly one `AL-` row (cross-bot merges by shared source).
