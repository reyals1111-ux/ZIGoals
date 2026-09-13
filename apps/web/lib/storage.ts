import {
  metadataKey,
  parseBackup,
  type GoalBackup,
  type GoalMetadata,
  validateMetadata,
} from "@zigoals/shared-types";
export interface MetadataWriteResult {
  record: GoalBackup;
  recovery?: { quarantineKey: string };
}
function emptyMetadata(chain: string, owner: string): GoalBackup {
  return { schemaVersion: 1, chainId: chain, walletAddress: owner, goals: {} };
}
export function loadMetadata(
  storage: Storage,
  chain: string,
  owner: string,
): GoalBackup {
  const raw = storage.getItem(metadataKey(chain, owner));
  return raw === null
    ? emptyMetadata(chain, owner)
    : parseBackup(raw, chain, owner);
}
function mergeMetadata(
  storage: Storage,
  incoming: GoalBackup,
): MetadataWriteResult {
  const chain = incoming.chainId;
  const owner = incoming.walletAddress;
  const key = metadataKey(chain, owner);
  const previousRaw = storage.getItem(key);
  let previous = emptyMetadata(chain, owner);
  let damaged = false;
  if (previousRaw !== null) {
    try {
      previous = parseBackup(previousRaw, chain, owner);
    } catch {
      damaged = true;
    }
  }
  // Validate the complete result before either quarantine or active writes.
  const record = parseBackup(
    JSON.stringify({
      ...incoming,
      goals: { ...previous.goals, ...incoming.goals },
    }),
    chain,
    owner,
  );
  let recovery: MetadataWriteResult["recovery"];
  if (damaged && previousRaw !== null) {
    let suffix = 1;
    let quarantineKey = `${key}:quarantine:${suffix}`;
    while (storage.getItem(quarantineKey) !== null) {
      quarantineKey = `${key}:quarantine:${++suffix}`;
    }
    // Storage writes are atomic: if preserving these exact bytes fails, stop.
    storage.setItem(quarantineKey, previousRaw);
    recovery = { quarantineKey };
  }
  storage.setItem(key, JSON.stringify(record));
  return recovery ? { record, recovery } : { record };
}
export function saveMetadata(
  storage: Storage,
  chain: string,
  owner: string,
  id: string,
  metadata: GoalMetadata,
): MetadataWriteResult {
  if (!/^[1-9]\d{0,19}$/.test(id)) throw new Error("Invalid goal ID.");
  const incoming = parseBackup(
    JSON.stringify({
      ...emptyMetadata(chain, owner),
      goals: { [id]: validateMetadata(metadata) },
    }),
    chain,
    owner,
  );
  return mergeMetadata(storage, incoming);
}
export function importMetadata(
  storage: Storage,
  raw: string,
  chain: string,
  owner: string,
): MetadataWriteResult {
  const backup = parseBackup(raw, chain, owner);
  return mergeMetadata(storage, backup);
}
