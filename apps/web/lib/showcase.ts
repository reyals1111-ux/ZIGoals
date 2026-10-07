import {localDate} from './local-date';
import {activateShowcase} from './showcase-storage';
export {isShowcase,getAppStorage,showcaseDay,showcaseStorageKey,exitShowcase} from './showcase-storage';
/**
 * Loads (or resets) the Showcase for a day. Session W Part 22: its builder (every fictional record) loads only now, on the
 * person's click, instead of with every page: the shell was carrying it, and the server evaluated it on every cold start.
 */
export async function loadShowcase(day=localDate(new Date())):Promise<void>{const {buildShowcase}=await import('./showcase-data');const data=buildShowcase(day);activateShowcase(window.sessionStorage,data.day,data.records);}
export const resetShowcase=loadShowcase;
