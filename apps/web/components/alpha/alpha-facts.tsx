'use client';
import {createContext, useContext, type ReactNode} from 'react';

/**
 * Session AC (owner finding 3 on Alpha #41, `TIER 3 (public-safety labels)`): the Alpha's live facts — the network's
 * label and sentence, the mode, and whether the money facts apply — as the shell already knows them. The footer used to
 * be their only reader; the page now ends after the footer's link columns, and Settings shows the facts instead
 * (about-this-alpha.tsx). The provider wraps the page, so any page part can read them on the server and in the browser.
 */
export type AlphaFactsValue = {network: {label: string; sentence: string}; mode: string; financial: boolean};
const AlphaFactsContext = createContext<AlphaFactsValue | null>(null);
export function AlphaFacts({value, children}: {value: AlphaFactsValue; children: ReactNode}) { return <AlphaFactsContext.Provider value={value}>{children}</AlphaFactsContext.Provider>; }
export const useAlphaFacts = () => useContext(AlphaFactsContext);
