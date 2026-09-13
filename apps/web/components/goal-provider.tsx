"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { TESTNET } from "@zigoals/chain-config";
import { metadataKey } from "@zigoals/shared-types";
import type {
  GoalMetadata,
  GoalBackup,
  TransactionState,
  WalletState,
} from "@zigoals/shared-types";
import type { ExecuteMsg } from "@zigoals/shared-types/contract";
import {
  applyLocal,
  initialLedger,
  parseLocalLedger,
  LOCAL_LEDGER_ERROR,
  LOCAL_CHAIN,
  LOCAL_OWNER,
  type LocalLedger,
  type LocalAction,
  type LocalGoal,
  type Activity,
} from "../lib/local-ledger";
import {
  loadMetadata,
  saveMetadata,
  importMetadata,
  withStorageLock,
} from "../lib/storage";
import {
  connectKeplr,
  readBalance,
  readGoals,
  reconcileTransactions,
  quoteExecute,
  executeQuote,
  CONTRACT_ADDRESS,
  type Quote,
} from "../lib/wallet";
import {
  TransactionFailure,
  type TransactionDetails,
} from "../lib/transaction";
import {
  JOURNAL_DATABASE,
  JOURNAL_SOURCE,
  journalRevision,
  TransactionJournal,
  pendingDescription,
  type JournalRecord,
} from "../lib/transaction-journal";
const LEDGER_KEY = "zigoals:local-ledger:v1";
type Pending = {
  action: LocalAction;
  quote?: Quote;
  metadata?: GoalMetadata;
  storageRevision: string | null;
  metadataRevision: string | null;
};
type TransactionOutcome = TransactionDetails & {
  id: string;
  owner: string;
  chain: string;
  action: LocalAction["kind"];
  state: TransactionState;
  note?: string;
};
function journalOutcome(record: JournalRecord): TransactionOutcome {
  return {
    id: record.operationId,
    owner: record.wallet,
    chain: record.chainId,
    action: record.action,
    state:
      record.state === "CONFIRMED"
        ? "SUCCESS"
        : record.state === "UNKNOWN_AFTER_BROADCAST"
          ? "FAILED"
          : record.state,
    hash: record.hash,
    height: record.height,
    uncertain: [
      "BROADCASTING",
      "CONFIRMING",
      "UNKNOWN_AFTER_BROADCAST",
    ].includes(record.state),
    message:
      record.state === "FAILED"
        ? record.hash
          ? "The chain rejected this action; a network fee may have been charged."
          : "This action stopped before a broadcast was recorded."
        : pendingDescription(record),
  };
}
function useGoalState() {
  const router = useRouter();
  const [mode, setMode] = useState<"local" | "testnet">("local");
  const [owner, setOwner] = useState(LOCAL_OWNER);
  const [walletState, setWalletState] = useState<WalletState>("DISCONNECTED");
  const [goals, setGoals] = useState<LocalGoal[]>([]);
  const [balance, setBalance] = useState("0");
  const [activity, setActivity] = useState<Activity[]>([]);
  const [transactionOutcomes, setTransactionOutcomes] = useState<
    TransactionOutcome[]
  >([]);
  const [metadata, setMetadata] = useState<GoalBackup>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<TransactionState>("IDLE");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Pending>();
  const [loaded, setLoaded] = useState(false);
  const [localLedgerHealthy, setLocalLedgerHealthy] = useState(false);
  const revision = useRef(0);
  const metadataRaw = useRef<string | null>(null);
  const [journalRecords, setJournalRecords] = useState<JournalRecord[]>([]);
  const [journalWarnings, setJournalWarnings] = useState<string[]>([]);
  const journalRefresh = useRef<() => Promise<void>>(async () => {});
  const actionBusy = useRef(false);
  const ledger = useRef<LocalLedger | null>(null);
  const activeScope = useRef({ mode, owner });
  activeScope.current = { mode, owner };
  const chain = mode === "local" ? LOCAL_CHAIN : TESTNET.chainId;
  function readPlans(planChain: string, planOwner: string) {
    metadataRaw.current = localStorage.getItem(
      metadataKey(planChain, planOwner),
    );
    return loadMetadata(localStorage, planChain, planOwner);
  }
  function invalidateReview() {
    revision.current++;
    setPending(undefined);
    setStatus("IDLE");
    setMessage(
      "This account's data changed in another tab. Review again before continuing.",
    );
  }
  function localLoad() {
    try {
      const raw = localStorage.getItem(LEDGER_KEY);
      const parsed = raw === null ? initialLedger() : parseLocalLedger(raw);
      ledger.current = parsed;
      setLocalLedgerHealthy(true);
      setGoals(parsed.goals);
      setBalance(parsed.balance);
      setActivity(parsed.activity);
    } catch (cause) {
      ledger.current = null;
      setLocalLedgerHealthy(false);
      setGoals([]);
      setBalance("0");
      setActivity([]);
      throw cause;
    }
  }
  useEffect(() => {
    try {
      localLoad();
    } catch (e) {
      setError(String(e));
    }
    try {
      setMetadata(readPlans(LOCAL_CHAIN, LOCAL_OWNER));
    } catch (e) {
      setError((previous) => `${previous} ${String(e)}`.trim());
    }
    setLoaded(true);
    const changed = () => {
      revision.current++;
      setPending(undefined);
      setStatus("IDLE");
      setWalletState("ACCOUNT_CHANGED");
      if (activeScope.current.mode === "testnet") {
        setGoals([]);
        setBalance("0");
        setActivity([]);
        setMetadata(undefined);
        setOwner("");
        setMessage("Account changed. Reconnect Keplr to reload your goals.");
      }
    };
    window.addEventListener("keplr_keystorechange", changed);
    return () => window.removeEventListener("keplr_keystorechange", changed);
  }, []);
  useEffect(() => {
    const changed = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return;
      const plansChanged =
        event.key === null || event.key === metadataKey(chain, owner);
      const ledgerChanged =
        mode === "local" && (event.key === null || event.key === LEDGER_KEY);
      if (!plansChanged && !ledgerChanged) return;
      invalidateReview();
      try {
        if (ledgerChanged) localLoad();
        if (plansChanged) setMetadata(readPlans(chain, owner));
      } catch (error) {
        if (plansChanged) setMetadata(undefined);
        setError(String(error));
      }
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [chain, mode, owner]);
  useEffect(() => {
    let stopped = false;
    let loading = false;
    let reloadRequested = false;
    let firstLoad = true;
    const journal = new TransactionJournal();
    const load = async (reconcile = false) => {
      if (stopped || mode !== "testnet" || !owner) return;
      if (loading) {
        reloadRequested = true;
        return;
      }
      loading = true;
      try {
        const loaded = await journal.load(chain, owner);
        if (stopped) return;
        setJournalRecords((previous) =>
          loaded.records.map((record) => {
            const proven = previous.find(
              (item) =>
                item.operationId === record.operationId &&
                (item.state === "CONFIRMED" || item.state === "FAILED"),
            );
            return proven ?? record;
          }),
        );
        if (firstLoad) {
          setJournalWarnings(loaded.warnings);
          firstLoad = false;
        } else
          setJournalWarnings((previous) => [
            ...new Set([...previous, ...loaded.warnings]),
          ]);
        if (reconcile) {
          const recovered = await reconcileTransactions(
            loaded.records,
            journal,
          );
          if (stopped) return;
          setJournalRecords((previous) =>
            previous.map(
              (record) =>
                recovered.records.find(
                  (item) => item.operationId === record.operationId,
                ) ?? record,
            ),
          );
          setJournalWarnings((previous) => [
            ...new Set([...previous, ...recovered.warnings]),
          ]);
        }
      } catch (error) {
        if (!stopped) {
          const warning =
            error instanceof Error
              ? error.message
              : "Transaction history is unavailable. Stored data was preserved.";
          // Only merge warnings after this scope has loaded its own history.
          // A first-load failure must replace any previous account's warnings.
          const resetWarnings = firstLoad;
          setJournalWarnings((previous) =>
            resetWarnings ? [warning] : [...new Set([...previous, warning])],
          );
        }
      } finally {
        loading = false;
        if (reloadRequested && !stopped) {
          reloadRequested = false;
          void load();
        }
      }
    };
    journalRefresh.current = () => load(true);
    void load(true);
    const changed = () => {
      void load();
    };
    window.addEventListener("zigoals:journal-change", changed);
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(JOURNAL_DATABASE)
        : undefined;
    if (channel)
      channel.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (
          data?.source === JOURNAL_SOURCE ||
          data?.chainId !== chain ||
          data?.wallet !== owner
        )
          return;
        if (mode === "testnet" && data.contract === CONTRACT_ADDRESS)
          invalidateReview();
        void load();
      };
    return () => {
      stopped = true;
      window.removeEventListener("zigoals:journal-change", changed);
      channel?.close();
    };
  }, [chain, mode, owner]);
  async function refresh() {
    const current = revision.current;
    if (mode === "local") {
      localLoad();
      try {
        setMetadata(readPlans(chain, owner));
      } catch (e) {
        setError(
          "Goal plans could not be read. Financial controls remain available. " +
            String(e),
        );
      }
      return;
    }
    if (!owner) return;
    await journalRefresh.current();
    const [g, b] = await Promise.all([readGoals(owner), readBalance(owner)]);
    if (current !== revision.current) return;
    setGoals(g);
    setBalance(b);
    try {
      setMetadata(readPlans(chain, owner));
    } catch (e) {
      setError(
        "Private plans need recovery. Your onchain funds are still accessible. " +
          String(e),
      );
    }
  }
  async function connect() {
    revision.current++;
    const current = revision.current;
    setMode("testnet");
    setOwner("");
    setGoals([]);
    setMetadata(undefined);
    setBalance("0");
    setActivity([]);
    setPending(undefined);
    setError("");
    setMessage("");
    setWalletState("CONNECTING");
    if (!window.keplr) {
      setWalletState("UNAVAILABLE");
      setError(
        "Install the Keplr browser extension, then reconnect. Local demo works without a wallet.",
      );
      return;
    }
    try {
      const address = await connectKeplr(
        window.keplr,
        () => {
          if (current === revision.current) setWalletState("ADDING_TESTNET");
        },
        () => {
          if (current !== revision.current)
            throw Error("Connection cancelled.");
        },
      );
      if (current !== revision.current) return;
      const [b, g] = await Promise.all([
        readBalance(address),
        readGoals(address),
      ]);
      if (current !== revision.current) return;
      setOwner(address);
      setBalance(b);
      setGoals(g);
      setWalletState("CONNECTED");
      try {
        setMetadata(readPlans(TESTNET.chainId, address));
      } catch (e) {
        setError("Private plans need recovery. " + String(e));
      }
      setMessage(
        CONTRACT_ADDRESS
          ? "Testnet connected."
          : "Testnet connected. Contract deployment is pending; no financial action is available yet.",
      );
    } catch (e) {
      if (current !== revision.current) return;
      const m = e instanceof Error ? e.message : String(e);
      setWalletState(
        /reject|denied/i.test(m)
          ? "REJECTED"
          : /network|denom/i.test(m)
            ? "WRONG_NETWORK"
            : "RPC_UNAVAILABLE",
      );
      setError(m);
    }
  }
  function useLocal() {
    revision.current++;
    setPending(undefined);
    setMode("local");
    setOwner(LOCAL_OWNER);
    setWalletState("DISCONNECTED");
    setError("");
    setMessage("Local simulation. No blockchain transaction will be sent.");
    setStatus("IDLE");
    try {
      localLoad();
    } catch (e) {
      setError(String(e));
    }
    try {
      setMetadata(readPlans(LOCAL_CHAIN, LOCAL_OWNER));
    } catch (e) {
      setMetadata(undefined);
      setError((previous) => `${previous} ${String(e)}`.trim());
    }
  }
  function executeMessage(action: LocalAction): ExecuteMsg {
    switch (action.kind) {
      case "create":
        return { create_goal: {} };
      case "deposit":
        return { deposit: { goal_id: action.id } };
      case "withdraw":
        return { withdraw: { goal_id: action.id, amount: action.amount } };
      case "close":
        return { close_goal: { goal_id: action.id } };
    }
  }
  async function prepare(action: LocalAction, plan?: GoalMetadata) {
    if (actionBusy.current) return;
    actionBusy.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const current = revision.current;
    try {
      if (mode === "local") {
        if (!ledger.current) throw Error(LOCAL_LEDGER_ERROR);
        const storageRevision = localStorage.getItem(LEDGER_KEY);
        const stored =
          storageRevision === null
            ? initialLedger()
            : parseLocalLedger(storageRevision);
        applyLocal(stored, action, new Date().toISOString());
        setPending({
          action,
          metadata: plan,
          storageRevision,
          metadataRevision: metadataRaw.current,
        });
      } else {
        if (!window.keplr || walletState !== "CONNECTED")
          throw Error("Reconnect your wallet first.");
        const records = await new TransactionJournal().load(chain, owner);
        const storageRevision = journalRevision(
          records.records,
          CONTRACT_ADDRESS,
        );
        const quote = await quoteExecute(
          window.keplr,
          owner,
          current,
          executeMessage(action),
          action.kind === "deposit" ? action.amount : "0",
        );
        if (current !== revision.current)
          throw Error("Account changed. Review again.");
        setPending({
          action,
          quote,
          metadata: plan,
          storageRevision,
          metadataRevision: metadataRaw.current,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (!pending || actionBusy.current) return;
    actionBusy.current = true;
    const action = pending.action;
    const plan = pending.metadata;
    const scope = { mode, owner, chain };
    const current = revision.current;
    setBusy(true);
    setError("");
    let createdId: string | undefined;
    let outcome: TransactionOutcome | undefined =
      scope.mode === "testnet"
        ? {
            id: crypto.randomUUID(),
            owner: scope.owner,
            chain: scope.chain,
            action: action.kind,
            state: "IDLE",
          }
        : undefined;
    const updateTransaction = (
      state: TransactionState,
      details?: TransactionDetails & { note?: string },
    ) => {
      if (outcome) {
        outcome = { ...outcome, state, ...details };
        const next = outcome;
        // Transaction results belong to the submitting wallet, even after the
        // active wallet changes. Only active financial views use revision guards.
        setTransactionOutcomes((old) => [
          next,
          ...old.filter((item) => item.id !== next.id),
        ]);
      }
      if (current === revision.current) setStatus(state);
    };
    try {
      if (scope.mode === "local") {
        await withStorageLock(LEDGER_KEY, () => {
          if (
            current !== revision.current ||
            localStorage.getItem(LEDGER_KEY) !== pending.storageRevision
          )
            throw Error(
              "Local data changed in another tab. Review again before confirming.",
            );
          const raw = localStorage.getItem(LEDGER_KEY);
          const stored = raw === null ? initialLedger() : parseLocalLedger(raw);
          const next = applyLocal(stored, action, new Date().toISOString());
          // Validate timestamps and conservation before persisting any bytes.
          parseLocalLedger(JSON.stringify(next));
          localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
          ledger.current = next;
          setGoals(next.goals);
          setBalance(next.balance);
          setActivity(next.activity);
          if (action.kind === "create") createdId = next.goals.at(-1)?.id;
        });
        setStatus("SUCCESS");
        setMessage(
          "Local simulation completed. No onchain transaction was sent.",
        );
      } else {
        if (!pending.quote || !window.keplr)
          throw Error("Review the transaction again.");
        const wallet = window.keplr;
        const quote = pending.quote;
        const tx = await withStorageLock(
          `${JOURNAL_DATABASE}:${scope.chain}:${scope.owner}:${CONTRACT_ADDRESS}`,
          async () => {
            const loaded = await new TransactionJournal().load(
              scope.chain,
              scope.owner,
            );
            if (
              current !== revision.current ||
              journalRevision(loaded.records, CONTRACT_ADDRESS) !==
                pending.storageRevision
            )
              throw Error(
                "Transaction history changed in another tab. Review again before signing.",
              );
            return executeQuote(
              wallet,
              quote,
              () => revision.current,
              updateTransaction,
              outcome?.id,
            );
          },
        );
        const attrs = tx.events
          .filter(
            (e) =>
              e.type === "wasm" &&
              e.attributes.some(
                (a) =>
                  a.key === "_contract_address" && a.value === CONTRACT_ADDRESS,
              ),
          )
          .flatMap((e) => e.attributes);
        if (action.kind === "create")
          createdId = attrs.find((a) => a.key === "goal_id")?.value;
        if (current === revision.current) {
          setActivity((old) => [
            {
              action:
                action.kind === "create"
                  ? "Goal created"
                  : action.kind === "deposit"
                    ? "Added funds"
                    : action.kind === "withdraw"
                      ? "Withdrew funds"
                      : "Goal closed",
              goalId: "id" in action ? action.id : (createdId ?? "unknown"),
              amount: "amount" in action ? action.amount : "0",
              hash: tx.hash,
              height: tx.height,
              timestamp: new Date().toISOString(),
              local: false,
            },
            ...old,
          ]);
          setMessage(`Confirmed on testnet at block ${tx.height}.`);
          try {
            await refresh();
          } catch {
            if (current === revision.current)
              setMessage(
                `Transaction confirmed at block ${tx.height}. Refresh to load the updated balance.`,
              );
          }
        }
      }
      if (createdId && plan) {
        const goalId = createdId;
        try {
          const saved = await withStorageLock(
            metadataKey(scope.chain, scope.owner),
            () =>
              saveMetadata(
                localStorage,
                scope.chain,
                scope.owner,
                goalId,
                plan,
                pending.metadataRevision,
              ),
          );
          if (current === revision.current)
            metadataRaw.current = localStorage.getItem(
              metadataKey(scope.chain, scope.owner),
            );
          if (current === revision.current) {
            setMetadata(saved.record);
            if (saved.recovery)
              setMessage(
                (previous) =>
                  `${previous} Previous stored plans were preserved on this device before recovery.`,
              );
          }
        } catch {
          const note =
            "Goal was created, but the private plan could not be saved. Keep a copy and use metadata recovery.";
          if (outcome) updateTransaction(outcome.state, { note });
          if (current === revision.current) setError(note);
        }
      }
      setPending(undefined);
      if (createdId && current === revision.current)
        router.push(`/app/goals/${createdId}`);
    } catch (e) {
      if (e instanceof TransactionFailure) {
        updateTransaction(e.state, {
          hash: e.hash,
          uncertain: e.uncertain,
          message: e.message,
        });
        if (current === revision.current)
          setError(
            e.uncertain
              ? `Confirmation is uncertain. Funds may have moved. Check ${e.hash ? "transaction " + e.hash : "your wallet history"} before trying again. ${e.message}`
              : e.state === "REJECTED"
                ? "Cancelled in your wallet. No transaction was broadcast."
                : e.message,
          );
      } else {
        const text = e instanceof Error ? e.message : String(e);
        updateTransaction("FAILED", { message: text });
        if (current === revision.current) setError(text);
      }
      setPending(undefined);
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  }
  async function recover(id: string, plan: GoalMetadata) {
    const expectedRaw = metadataRaw.current;
    const current = revision.current;
    try {
      const saved = await withStorageLock(metadataKey(chain, owner), () => {
        if (current !== revision.current)
          throw Error("Goal plans changed. Review again.");
        return saveMetadata(localStorage, chain, owner, id, plan, expectedRaw);
      });
      if (current !== revision.current) return;
      metadataRaw.current = localStorage.getItem(metadataKey(chain, owner));
      setMetadata(saved.record);
      setMessage(
        saved.recovery
          ? "Private goal plan saved. Previous stored plans were preserved on this device before recovery."
          : "Private goal plan saved on this device.",
      );
      setError(
        mode === "local" && !localLedgerHealthy ? LOCAL_LEDGER_ERROR : "",
      );
    } catch (e) {
      setError(String(e));
    }
  }
  async function importPlans(raw: string) {
    const expectedRaw = metadataRaw.current;
    const current = revision.current;
    try {
      const imported = await withStorageLock(metadataKey(chain, owner), () => {
        if (current !== revision.current)
          throw Error("Goal plans changed. Review again.");
        return importMetadata(localStorage, raw, chain, owner, expectedRaw);
      });
      if (current !== revision.current) return;
      metadataRaw.current = localStorage.getItem(metadataKey(chain, owner));
      setMetadata(imported.record);
      setMessage(
        imported.recovery
          ? "Goal plans imported. Previous stored plans were preserved on this device before recovery."
          : "Goal plans imported for this wallet and network.",
      );
      setError(
        mode === "local" && !localLedgerHealthy ? LOCAL_LEDGER_ERROR : "",
      );
    } catch (e) {
      setError("Import was not applied. " + String(e));
    }
  }
  return {
    mode,
    chain,
    owner,
    walletState,
    goals,
    balance,
    activity,
    transactionOutcomes: [
      ...transactionOutcomes.map((outcome) => {
        const proven = journalRecords.find(
          (record) =>
            record.operationId === outcome.id &&
            (record.state === "CONFIRMED" ||
              (record.state === "FAILED" && record.hash)),
        );
        return proven ? { ...outcome, ...journalOutcome(proven) } : outcome;
      }),
      ...journalRecords
        .filter(
          (record) =>
            mode === "testnet" &&
            record.wallet === owner &&
            record.chainId === chain &&
            !transactionOutcomes.some(
              (outcome) => outcome.id === record.operationId,
            ),
        )
        .map(journalOutcome),
    ],
    journalRecords: journalRecords.filter(
      (record) =>
        mode === "testnet" &&
        record.wallet === owner &&
        record.chainId === chain,
    ),
    journalWarnings: mode === "testnet" && owner ? journalWarnings : [],
    historySource:
      mode === "local"
        ? ("LOCAL_SIMULATION" as const)
        : ("TESTNET_CHAIN" as const),
    metadata,
    error,
    message,
    status,
    busy,
    pending,
    loaded,
    connect,
    useLocal,
    refresh,
    prepare,
    confirm,
    recover,
    importPlans,
    cancel: () => {
      setPending(undefined);
      setStatus("IDLE");
    },
    setError,
    canTransact:
      loaded &&
      (mode === "local"
        ? localLedgerHealthy
        : walletState === "CONNECTED" && !!CONTRACT_ADDRESS),
  };
}
type GoalContext = ReturnType<typeof useGoalState>;
const Context = createContext<GoalContext | null>(null);
export function GoalProvider({ children }: { children: ReactNode }) {
  const value = useGoalState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGoals() {
  const value = useContext(Context);
  if (!value) throw Error("GoalProvider missing");
  return value;
}
