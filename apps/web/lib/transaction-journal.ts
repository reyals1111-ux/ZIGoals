import { z } from "zod";
export const JOURNAL_DATABASE = "zigoals:transaction-journal";
export const JOURNAL_LIMIT = 1000;
export const JOURNAL_SOURCE = crypto.randomUUID();
const states = [
  "AWAITING_SIGNATURE",
  "BROADCASTING",
  "CONFIRMING",
  "CONFIRMED",
  "FAILED",
  "REJECTED",
  "UNKNOWN_AFTER_BROADCAST",
] as const;
export type JournalState = (typeof states)[number];
const integer = z.string().regex(/^(0|[1-9][0-9]{0,77})$/);
const identifier = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9:._-]+$/);
const schema = z
  .object({
    version: z.literal(1),
    operationId: z.string().uuid(),
    chainId: identifier,
    wallet: identifier,
    contract: identifier,
    action: z.enum(["create", "deposit", "withdraw", "close"]),
    amount: integer,
    goalId: integer.optional(),
    denom: identifier,
    state: z.enum(states),
    hash: z
      .string()
      .regex(/^[A-F0-9]{64}$/)
      .optional(),
    height: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    code: z.number().int().nonnegative().max(0xffffffff).optional(),
    createdAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
    updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict()
  .superRefine((r, ctx) => {
    const invalid = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if ((r.action === "create") !== (r.goalId === undefined))
      invalid("Goal identity mismatch");
    if ((r.action === "create" || r.action === "close") && r.amount !== "0")
      invalid("Unexpected amount");
    if ((r.action === "deposit" || r.action === "withdraw") && r.amount === "0")
      invalid("Amount must be positive");
    if (
      [
        "BROADCASTING",
        "CONFIRMING",
        "CONFIRMED",
        "UNKNOWN_AFTER_BROADCAST",
      ].includes(r.state) &&
      !r.hash
    )
      invalid("Missing signed hash");
    if (r.state === "CONFIRMED" && (r.code !== 0 || !r.height))
      invalid("Missing receipt proof");
    if (r.state === "FAILED" && r.hash && (!r.code || !r.height))
      invalid("Missing failure receipt proof");
    if (r.state === "REJECTED" && r.hash)
      invalid("Signed transaction cannot be marked rejected");
  });
const patchSchema = z
  .object({
    state: z.enum(states),
    hash: z
      .string()
      .regex(/^[A-F0-9]{64}$/)
      .optional(),
    height: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    code: z.number().int().nonnegative().max(0xffffffff).optional(),
  })
  .strict();
export type JournalRecord = z.infer<typeof schema>;
export type OperationIdentity = Pick<
  JournalRecord,
  "chainId" | "wallet" | "contract" | "action" | "amount" | "goalId" | "denom"
>;
export type JournalPatch = Pick<JournalRecord, "state"> &
  Partial<Pick<JournalRecord, "hash" | "height" | "code">>;
export function newOperation(identity: OperationIdentity): JournalRecord {
  return schema.parse({
    ...identity,
    version: 1,
    operationId: crypto.randomUUID(),
    state: "AWAITING_SIGNATURE",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}
export function isTerminal(state: JournalState) {
  return state === "CONFIRMED" || state === "FAILED" || state === "REJECTED";
}
export function pendingDescription(record: JournalRecord): string {
  return record.state === "AWAITING_SIGNATURE"
    ? "No broadcast is recorded. A wallet prompt may still be open in another tab, or this action was interrupted. This is not proof of rejection."
    : "Confirmation is uncertain. Funds may have moved. Check the known transaction before trying again; this browser never replays it.";
}
const nextStates: Record<JournalState, readonly JournalState[]> = {
  AWAITING_SIGNATURE: ["BROADCASTING", "FAILED", "REJECTED"],
  BROADCASTING: [
    "CONFIRMING",
    "UNKNOWN_AFTER_BROADCAST",
    "CONFIRMED",
    "FAILED",
  ],
  CONFIRMING: ["UNKNOWN_AFTER_BROADCAST", "CONFIRMED", "FAILED"],
  UNKNOWN_AFTER_BROADCAST: ["CONFIRMED", "FAILED"],
  CONFIRMED: [],
  FAILED: [],
  REJECTED: [],
};
function announce(record: JournalRecord) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("zigoals:journal-change"));
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(JOURNAL_DATABASE);
    channel.postMessage({
      source: JOURNAL_SOURCE,
      chainId: record.chainId,
      wallet: record.wallet,
      contract: record.contract,
    });
    channel.close();
  }
}
export class TransactionJournal {
  constructor(private readonly factory?: IDBFactory) {}
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const factory = this.factory ?? globalThis.indexedDB;
      if (!factory) {
        reject(
          Error(
            "Durable transaction storage is unavailable. No transaction can be sent.",
          ),
        );
        return;
      }
      const request = factory.open(JOURNAL_DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("operations", {
          keyPath: "operationId",
        });
      };
      request.onerror = () =>
        reject(
          Error(
            "Transaction history could not be opened; existing data was preserved.",
          ),
        );
      request.onblocked = () =>
        reject(
          Error(
            "Transaction history is blocked by another tab. Close older tabs and retry.",
          ),
        );
      request.onsuccess = () => {
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
    });
  }
  async create(record: JournalRecord): Promise<void> {
    const parsed = schema.parse(record);
    if (parsed.state !== "AWAITING_SIGNATURE")
      throw Error("New operations must await signature");
    const db = await this.open();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("operations", "readwrite", {
          durability: "strict",
        });
        const store = tx.objectStore("operations");
        const count = store.count();
        let failure: Error | undefined;
        count.onsuccess = () => {
          if (count.result >= JOURNAL_LIMIT) {
            failure = Error(
              "Transaction history is full. No transaction was sent; preserve your history before recovery.",
            );
            tx.abort();
          } else store.add(parsed);
        };
        tx.oncomplete = () => resolve();
        tx.onabort = tx.onerror = () =>
          reject(
            failure ??
              Error("Transaction was not saved. No transaction was sent."),
          );
      });
    } finally {
      db.close();
    }
    announce(parsed);
  }
  async transition(
    operationId: string,
    patch: JournalPatch,
  ): Promise<JournalRecord> {
    patch = patchSchema.parse(patch);
    const db = await this.open();
    try {
      const result = await new Promise<JournalRecord>((resolve, reject) => {
        const tx = db.transaction("operations", "readwrite", {
          durability: "strict",
        });
        const store = tx.objectStore("operations");
        const request = store.get(operationId);
        let result: JournalRecord;
        let failure: unknown;
        request.onsuccess = () => {
          try {
            const previous = schema.parse(request.result);
            result = previous;
            if (
              isTerminal(previous.state) ||
              (previous.state !== patch.state &&
                !nextStates[previous.state].includes(patch.state))
            )
              return;
            if (previous.hash && patch.hash && previous.hash !== patch.hash)
              throw Error("Transaction identity cannot change");
            result = schema.parse({
              ...previous,
              ...patch,
              updatedAt: Math.max(Date.now(), previous.updatedAt),
            });
            // The scan and write share a readwrite transaction, serialized by
            // IndexedDB even across tabs. Include unreadable rows in identity
            // protection; a future schema must not lose its signed hash claim.
            if (result.hash) {
              const scan = store.openCursor();
              scan.onsuccess = () => {
                const cursor = scan.result;
                if (!cursor) {
                  store.put(result);
                  return;
                }
                const other = cursor.value;
                if (
                  other.operationId !== operationId &&
                  other.chainId === result.chainId &&
                  typeof other.hash === "string" &&
                  other.hash.toUpperCase() === result.hash
                ) {
                  failure = Error(
                    "This signed transaction hash already belongs to another operation. No duplicate broadcast is allowed.",
                  );
                  tx.abort();
                  return;
                }
                cursor.continue();
              };
            } else store.put(result);
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(result!);
        tx.onabort = tx.onerror = () =>
          reject(
            failure ??
              Error(
                "Transaction status was not saved. Keep the transaction hash and check its receipt.",
              ),
          );
      });
      announce(result);
      return result;
    } finally {
      db.close();
    }
  }
  async load(
    chainId: string,
    wallet: string,
  ): Promise<{ records: JournalRecord[]; warnings: string[] }> {
    const db = await this.open();
    try {
      return await new Promise((resolve, reject) => {
        const tx = db.transaction("operations");
        const request = tx.objectStore("operations").openCursor();
        const records: JournalRecord[] = [];
        const warnings = new Set<string>();
        let read = 0;
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if (++read > JOURNAL_LIMIT) {
            warnings.add(
              "History exceeds the recovery limit; only part of this device's history was read. Stored data was preserved.",
            );
            return;
          }
          const parsed = schema.safeParse(cursor.value);
          if (!parsed.success)
            warnings.add(
              "Unreadable or unsupported transaction records were preserved. History may be incomplete.",
            );
          else if (
            parsed.data.chainId === chainId &&
            parsed.data.wallet === wallet
          ) {
            records.push(parsed.data);
            if (!plausibleJournalTime(parsed.data))
              warnings.add(
                "Implausible transaction timestamps were preserved and excluded from automatic receipt recovery.",
              );
          }
          cursor.continue();
        };
        tx.oncomplete = () =>
          resolve({
            records: records.sort(
              (a, b) =>
                Number(plausibleJournalTime(b)) -
                  Number(plausibleJournalTime(a)) || b.createdAt - a.createdAt,
            ),
            warnings: [...warnings],
          });
        tx.onabort = tx.onerror = () =>
          reject(
            Error(
              "Transaction history could not be read. Stored data was preserved.",
            ),
          );
      });
    } finally {
      db.close();
    }
  }
}

export function plausibleJournalTime(
  record: JournalRecord,
  now = Date.now(),
): boolean {
  return (
    record.createdAt <= record.updatedAt && record.updatedAt <= now + 300000
  );
}
export function recoveryCandidates(
  records: JournalRecord[],
  limit = 20,
  now = Date.now(),
): JournalRecord[] {
  return records
    .filter(
      (record) =>
        !!record.hash &&
        !isTerminal(record.state) &&
        plausibleJournalTime(record, now),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}
// Order independent, scoped revision based on durable records, not notification timing.
export function journalRevision(
  records: JournalRecord[],
  contract: string,
): string {
  return JSON.stringify(
    records
      .filter((record) => record.contract === contract)
      .map((record) => [
        record.operationId,
        record.state,
        record.hash,
        record.updatedAt,
      ])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
  );
}
