'use client';
import {useSyncExternalStore} from 'react';

/**
 * Session AV (owner follow-up 1, F-OWN-TEMPLATES; Day One): the language of the Journal's daily question, English or
 * Dutch, a display choice of this device (never synced or exported; registered in AH_DISPLAY_KEYS).
 */
export const QUESTION_LANG_KEY = 'zigoals:journal-question-lang';
const EVENT = 'zigoals-journal-question-lang';
const read = (): 'en' | 'nl' => { try { return localStorage.getItem(QUESTION_LANG_KEY) === 'nl' ? 'nl' : 'en'; } catch { return 'en'; } };
const subscribe = (fn: () => void) => { window.addEventListener('storage', fn); window.addEventListener(EVENT, fn); return () => { window.removeEventListener('storage', fn); window.removeEventListener(EVENT, fn); }; };
export const useQuestionLang = () => useSyncExternalStore(subscribe, read, () => 'en' as const);
export function setQuestionLang(lang: 'en' | 'nl') { try { if (lang === 'nl') localStorage.setItem(QUESTION_LANG_KEY, 'nl'); else localStorage.removeItem(QUESTION_LANG_KEY); } catch { return; } window.dispatchEvent(new Event(EVENT)); }
