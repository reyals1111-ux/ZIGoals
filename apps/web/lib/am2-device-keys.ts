/**
 * Session AM-2 (owner's step 4, decision of 15 Nov: "NOVA as the person's own agent, outside the app"): this session's
 * device key and its rows for the shared registries, as literals in a module with no imports (the lib/ap-device-keys.ts
 * pattern), so the welcome check, Export everything, the data catalog and the account erase can name it without shipping
 * a schema; lib/am2-device-keys.test.ts proves the literal equals its owner's constant and that every registry carries
 * it. The record is device only, versioned, exported, restored, erased with the account and never synced (TIER 3 stored
 * format: an additive key only; older builds ignore it).
 * - `zigoals:nova-outbox:v1` (personal: it holds addresses and hosts): "Sent out from this device" — when, what kind
 *   and the target the confirm card showed, for each hand-off or agent tool call the person approved; at most 200, never
 *   a body (lib/nova/outbox/record.ts NOVA_OUTBOX).
 */
export const NOVA_OUTBOX_KEY_LITERAL = 'zigoals:nova-outbox:v1';
/**
 * Step 4c (personal: it holds addresses on the person's own computer and their own labels): the tool servers and the
 * agent the person connected — loopback addresses, labels and the names of the tools on "Ask every time"; never a token,
 * an argument or a result (lib/nova/agent-bridge/record.ts NOVA_AGENT). Never synced; a restore brings the addresses and
 * every tool Off (NOVA_AGENT_RESTORE).
 */
export const NOVA_AGENT_KEY_LITERAL = 'zigoals:nova-agent:v1';
/** Personal device records: a device holding one is not new (onboarding `DEVICE_RECORD_KEYS`). */
export const AM2_PERSONAL_KEYS: readonly string[] = [NOVA_OUTBOX_KEY_LITERAL, NOVA_AGENT_KEY_LITERAL];
/** Display records (onboarding `NON_PERSONAL_KEYS`): none this session. */
export const AM2_DISPLAY_KEYS: readonly string[] = [];
/** Export everything (`DEVICE_KEYS`): the name in everything.json. */
export const AM2_EXPORT_KEYS = {novaOutbox: NOVA_OUTBOX_KEY_LITERAL, novaAgent: NOVA_AGENT_KEY_LITERAL} as const;
/** The data catalog (`DEVICE_LABELS`): [label, area], home "device". */
export const AM2_CATALOG_LABELS = {
  novaOutbox: ['NOVA: sent out from this device (when, what kind and to which address or host; never the text)', 'NOVA'],
  novaAgent: ['NOVA: your own agent and tool servers on this computer (addresses, names and which tools ask every time; never a token)', 'NOVA'],
} as const;
/** The account erase (`lib/aa-device-forget.ts`): every key above. */
export const AM2_ERASE_KEYS: readonly string[] = [...AM2_PERSONAL_KEYS, ...AM2_DISPLAY_KEYS];
