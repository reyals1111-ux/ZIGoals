import {localDate} from './local-date';
import {activateShowcase,currentShowcase,noteShowcaseUndo} from './showcase-storage';
export {isShowcase,getAppStorage,showcaseDay,showcaseStorageKey,exitShowcase,undoShowcaseReset,readShowcaseUndo,markShowcaseUndoOffered} from './showcase-storage';
/**
 * Loads (or resets) the Showcase for a day. Session W Part 22: its builder (every fictional record) loads only now, on the
 * person's click, instead of with every page: the shell was carrying it, and the server evaluated it on every cold start.
 */
export async function loadShowcase(day=localDate(new Date())):Promise<void>{const {buildShowcase,showcaseChoices}=await import('./showcase-data');const data=buildShowcase(day);activateShowcase(window.sessionStorage,data.day,{...data.records,...showcaseChoices(data.records,data.day)});}
/**
 * Session AH Part 3 (DS4): a reset keeps the Showcase it replaces in this tab until the next load, reset or exit, so the
 * page that opens next can offer a labelled Undo (components/shell/showcase-undo.tsx).
 */
export async function resetShowcase(day=localDate(new Date())):Promise<void>{const {buildShowcase,showcaseChoices}=await import('./showcase-data');const data=buildShowcase(day),session=window.sessionStorage,previous=currentShowcase(session);activateShowcase(session,data.day,{...data.records,...showcaseChoices(data.records,data.day)},crypto.randomUUID(),previous?.generation);if(previous)noteShowcaseUndo(session,previous);}
