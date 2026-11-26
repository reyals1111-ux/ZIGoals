import {localDate} from './local-date';
import {activateShowcase,currentShowcase,noteShowcaseUndo} from './showcase-storage';
export {isShowcase,getAppStorage,showcaseDay,showcaseStorageKey,exitShowcase,undoShowcaseReset,readShowcaseUndo,markShowcaseUndoOffered} from './showcase-storage';
/**
 * Session AM (design review AM-D25): NOVA's example requests are stamped from the moment the Showcase is loaded (2 and 3
 * hours, a day and two days ago), never in the future. The builder itself depends on its day alone, so the stamp is laid
 * over its record here, at the click.
 */
async function stampedStage(day:string):Promise<Record<string,string>>{try{const {NOVA_STAGE_KEY,showcaseStage}=await import('./nova/stage/record');return {[NOVA_STAGE_KEY]:JSON.stringify(showcaseStage(day,Date.now()))};}catch{return {};}}
/**
 * Loads (or resets) the Showcase for a day. Session W Part 22: its builder (every fictional record) loads only now, on the
 * person's click, instead of with every page: the shell was carrying it, and the server evaluated it on every cold start.
 * Session AW (showcase): the example task timer is stamped at the click too (showcaseStamps: it started 12 minutes before).
 */
export async function loadShowcase(day=localDate(new Date())):Promise<void>{const {buildShowcase,showcaseChoices,showcaseStamps}=await import('./showcase-data');const data=buildShowcase(day);activateShowcase(window.sessionStorage,data.day,{...data.records,...showcaseChoices(data.records,data.day),...await stampedStage(data.day),...showcaseStamps(data.records,Date.now())});}
/**
 * Session AH Part 3 (DS4): a reset keeps the Showcase it replaces in this tab until the next load, reset or exit, so the
 * page that opens next can offer a labelled Undo (components/shell/showcase-undo.tsx).
 */
export async function resetShowcase(day=localDate(new Date())):Promise<void>{const {buildShowcase,showcaseChoices,showcaseStamps}=await import('./showcase-data');const data=buildShowcase(day),session=window.sessionStorage,previous=currentShowcase(session);activateShowcase(session,data.day,{...data.records,...showcaseChoices(data.records,data.day),...await stampedStage(data.day),...showcaseStamps(data.records,Date.now())},crypto.randomUUID(),previous?.generation);if(previous)noteShowcaseUndo(session,previous);}
