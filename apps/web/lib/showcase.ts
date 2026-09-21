import {localDate} from './local-date';
import {buildShowcase} from './showcase-data';
import {activateShowcase} from './showcase-storage';
export {isShowcase,getAppStorage,showcaseDay,showcaseStorageKey,exitShowcase} from './showcase-storage';
export function loadShowcase(day=localDate(new Date())):void{const data=buildShowcase(day);activateShowcase(window.sessionStorage,data.day,data.records);}
export const resetShowcase=loadShowcase;
