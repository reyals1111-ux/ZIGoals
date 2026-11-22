/**
 * Session AV lane 2 (r4-mind; LEDGER #310): the Journal list's choices — Favourites only, a mood or a feeling word (its
 * days), and the order. Constants only, so the page's first chunk stays small (the choices load in their own chunk).
 */
export type ListOptions = {star: boolean; mood: string; days: string[] | null; order: 'newest' | 'oldest'};
export const NO_LIST_OPTIONS: ListOptions = {star: false, mood: '', days: null, order: 'newest'};
