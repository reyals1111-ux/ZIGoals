'use client';
import {useState, useSyncExternalStore, type ReactNode} from 'react';
import {useChainChoice} from '../chain/use-chain-choice';
import {ChainNoteContext} from './chain-note-context';

/**
 * Session AV lane 2 (PK-10, owner decision 21 Nov): consumer first, chain invisible, in Help too. A chain answer
 * (lib/help/chain-help.ts CHAIN_HELP_IDS) shows once this person chose the chain (lib/chain-choice.ts, read with the one
 * hook every surface asks). Until then it is left out of the page, except when the address names it
 * (`/app/help#help-<id>`, from Search, What's new, a page's own link or Known limitations): then it shows, opens as every
 * linked answer does, and carries the note on how to choose the chain at the top of its answer. Once shown that way it
 * stays for the visit, so following another link never pulls the page from under the reader.
 *
 * `id` is the wrapped HelpQuestion's id; without one (a plain question nothing links to) the answer simply waits for
 * the choice. Reads the address and the chain choice only; writes nothing.
 */
const subscribe = (change: () => void) => { window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); };
const hashNow = () => window.location.hash, noHash = () => '';

export function ChainHelp({id, children}: {id?: string; children: ReactNode}) {
  const chosen = useChainChoice().chosen, hash = useSyncExternalStore(subscribe, hashNow, noHash);
  const [linked, setLinked] = useState(false);
  // Adjusting state while rendering (React's pattern for state that follows an outside value): once named, kept.
  if (id && !linked && hash === `#help-${id}`) setLinked(true);
  if (!chosen && !linked) return null;
  // The same tree either way, so the answer never remounts (and closes) when the choice loads after a link opened it.
  return <ChainNoteContext.Provider value={!chosen}>{children}</ChainNoteContext.Provider>;
}

/** A heading's words: the chain words once the chain is chosen, the plain ones until then (CHAIN_HELP_PLAIN). */
export function ChainText({chosen: chainWords, plain}: {chosen: string; plain: string}) {
  return <>{useChainChoice().chosen ? chainWords : plain}</>;
}
