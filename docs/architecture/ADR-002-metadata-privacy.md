# ADR-002 — Private planning metadata

Accepted for alpha. Financial enforcement lives onchain; name, category, target, currency, dates, preferences and notes remain in localStorage. Keys bind schema version, chain ID and wallet address, with goal ID inside the envelope. Local simulation uses a distinct chain and owner namespace.

Version 1 backups are strict JSON, bounded to 1 MB of UTF-8 bytes and 1,000 goals, validated in full, including the merged result, before active replacement. Compact exports obey the same byte bound. Import matches network and owner; matching IDs replace plans and other plans remain. Unknown versions fail without mutation; a future migration must explicitly decode old data and return a versioned replacement.

Corrupt existing metadata is preserved byte-for-byte in a separate scoped quarantine key before a valid import or recreated plan replaces it; preservation failure stops recovery. No automatic financial-data reset occurs.

Missing metadata displays Goal #id, import/recreate options and retains financial controls. Private names never enter wallet memos or contract events. An optional 64-character commitment is disabled in normal UX because unsalted personal data hashes invite guessing.

This is device-local privacy, not encryption: browser extensions, same-origin XSS or another person using the device can read plans. Export files are sensitive. Browser clearing, storage quota and device loss can remove plans. No cloud sync or hidden analytics. A later encrypted portable store must preserve wallet-independent metadata recovery and explicit consent.
