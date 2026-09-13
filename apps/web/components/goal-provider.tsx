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
import { loadMetadata, saveMetadata, importMetadata } from "../lib/storage";
import {
  connectKeplr,
  readBalance,
  readGoals,
  quoteExecute,
  executeQuote,
  CONTRACT_ADDRESS,
  type Quote,
} from "../lib/wallet";
import {
  TransactionFailure,
  type TransactionDetails,
} from "../lib/transaction";
const LEDGER_KEY = "zigoals:local-ledger:v1";
type Pending = { action: LocalAction; quote?: Quote; metadata?: GoalMetadata };
type TransactionOutcome = TransactionDetails & {
  id: number;
  owner: string;
  chain: string;
  action: LocalAction["kind"];
  state: TransactionState;
  note?: string;
};
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
  const transactionId = useRef(0);
  const actionBusy = useRef(false);
  const ledger = useRef<LocalLedger | null>(null);
  const activeScope = useRef({ mode, owner });
  activeScope.current = { mode, owner };
  const chain = mode === "local" ? LOCAL_CHAIN : TESTNET.chainId;
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
      setMetadata(loadMetadata(localStorage, LOCAL_CHAIN, LOCAL_OWNER));
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
  async function refresh() {
    const current = revision.current;
    if (mode === "local") {
      localLoad();
      try {
        setMetadata(loadMetadata(localStorage, chain, owner));
      } catch (e) {
        setError(
          "Goal plans could not be read. Financial controls remain available. " +
            String(e),
        );
      }
      return;
    }
    if (!owner) return;
    const [g, b] = await Promise.all([readGoals(owner), readBalance(owner)]);
    if (current !== revision.current) return;
    setGoals(g);
    setBalance(b);
    try {
      setMetadata(loadMetadata(localStorage, chain, owner));
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
        setMetadata(loadMetadata(localStorage, TESTNET.chainId, address));
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
      setMetadata(loadMetadata(localStorage, LOCAL_CHAIN, LOCAL_OWNER));
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
        applyLocal(ledger.current, action, new Date().toISOString());
        setPending({ action, metadata: plan });
      } else {
        if (!window.keplr || walletState !== "CONNECTED")
          throw Error("Reconnect your wallet first.");
        const quote = await quoteExecute(
          window.keplr,
          owner,
          current,
          executeMessage(action),
          action.kind === "deposit" ? action.amount : "0",
        );
        if (current !== revision.current)
          throw Error("Account changed. Review again.");
        setPending({ action, quote, metadata: plan });
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
            id: ++transactionId.current,
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
        if (!ledger.current) throw Error(LOCAL_LEDGER_ERROR);
        const next = applyLocal(
          ledger.current,
          action,
          new Date().toISOString(),
        );
        localStorage.setItem(LEDGER_KEY, JSON.stringify(next));
        ledger.current = next;
        setGoals(next.goals);
        setBalance(next.balance);
        setActivity(next.activity);
        if (action.kind === "create") createdId = next.goals.at(-1)?.id;
        setStatus("SUCCESS");
        setMessage(
          "Local simulation completed. No onchain transaction was sent.",
        );
      } else {
        if (!pending.quote || !window.keplr)
          throw Error("Review the transaction again.");
        const tx = await executeQuote(
          window.keplr,
          pending.quote,
          () => revision.current,
          updateTransaction,
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
        try {
          const saved = saveMetadata(
            localStorage,
            scope.chain,
            scope.owner,
            createdId,
            plan,
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
  function recover(id: string, plan: GoalMetadata) {
    try {
      const saved = saveMetadata(localStorage, chain, owner, id, plan);
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
  function importPlans(raw: string) {
    try {
      const imported = importMetadata(localStorage, raw, chain, owner);
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
    transactionOutcomes,
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
