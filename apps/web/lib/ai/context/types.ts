import type {PageArea} from '../settings';

/** A short per-reply name for one of the person's records (h1, g2, f3, r1): the AI only ever sees the handle. */
export type Handle = {handle: string; kind: 'habit' | 'goal' | 'food' | 'recipe'; id: string; label: string};
/** What a page attaches to the next message: plain text the AI reads as data, the handle map kept on the device, and what was left out. */
export type PageContext = {
  area: PageArea;
  /** The exact text placed between the data marks; empty when nothing is attached. */
  text: string;
  handles: Handle[];
  /** Section titles that were included, for the preview. */
  included: string[];
  /** What was left out and why, in plain words, for the preview ("Health: not shared"). */
  omitted: string[];
  estimatedTokens: number;
};
