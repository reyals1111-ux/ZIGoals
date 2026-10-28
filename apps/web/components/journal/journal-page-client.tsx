'use client';
import {useShowcase} from '../showcase-controls';
import {JournalPage} from './journal-page';
/** Session AI: the Journal page's client part (the Showcase label follows the Showcase switch). */
export function JournalPageClient() { const showcase = useShowcase(); return <JournalPage showcase={showcase}/>; }
