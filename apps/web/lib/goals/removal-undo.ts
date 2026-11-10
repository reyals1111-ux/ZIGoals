/**
 * Session AL fourth pass (DV-019a, DV-040h, M-104): how long the Undo after a removal in Goals and Activity stays (a
 * milestone, a goal, an average goal, an Activity row). Removal asks no question first, so its Undo stays longer than the
 * 8 s default (showUndo's own timeoutMs option, components/ui/undo-toast.tsx); a pointer or focus on it still holds it.
 */
export const REMOVAL_UNDO_MS = 12_000;
