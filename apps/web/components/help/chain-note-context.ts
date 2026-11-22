'use client';
import {createContext} from 'react';

/**
 * Session AV lane 2 (PK-10): true inside a chain answer that shows only because a link opened it while the chain is not
 * chosen (components/help/chain-help.tsx); components/help/help-question.tsx then puts the note at the top of its answer.
 * Its own module, so HelpQuestion never imports the chain-choice hook.
 */
export const ChainNoteContext = createContext(false);
