# Handoff: Session X-Local → Session X-Cloud

Items in X-Cloud's lane that X-Local needs or found. X-Local never edits those areas. Each item says what, why, and the evidence. Dated entries, newest last.

## 2026-10-07 — opened
- Nothing yet. X-Local's lane: `apps/web/components/zigi/**`, `apps/web/lib/ai/**`, `apps/web/public/brand/figures/zigi/**` (+ the old `zigi-placeholder*` files), the manifest, the ZIGi docs/specs/golden set, Settings → ZIGi groups, Help's ZIGi topic, Meet ZIGi, `/api/zigi` client side.
- **Lane note:** ZIGi's chat, launcher, proposals and Customize live in `apps/web/components/ai/**`; X-Local treats them as ZIGi's (they are the surfaces the brief's Parts 4–6 change) and keeps launcher-shell edits minimal (one lazy import of `components/zigi/alive.ts`, the figure box size and the optical offset in `ai-launcher.css`). If X-Cloud's performance work touches `components/ai/ai-launcher.tsx` or `ai-launcher.css`, whoever merges second resolves; nothing else in the shell is edited by X-Local.
- Shared files X-Local will touch minimally: `docs/STATUS.md` (its own entry only), What's new (ZIGi section, one release-id bump, see below), `scripts/weight-budgets.json` (ZIGi entries only, with reasons). X-Local never records deploy #32 or the coordinator.
