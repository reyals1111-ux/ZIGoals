'use client';
import {useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {ZIGI_STORE_EVENT} from '../../lib/ai/store/keys';
import {GOAL_EXTRAS_KEY, readCardArt} from '../../lib/card-art/mirror';
import type {CardArt} from '../../lib/card-art/catalog';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {SHOWCASE_CARD_ART} from '../../lib/showcase/card-art';

/**
 * Session AB-Design (owner request 17): a goal card's chosen artwork — the person's choice (AB-Cloud's `cardArt`, read
 * through the mirror), else the Showcase's assignment for that goal, else null (the card keeps its default scene).
 * Read after mount, read again after a save anywhere on the page, a change in another tab or an account change.
 */
export function useCardArt(goalKey: string): CardArt | null {
  const [art, setArt] = useState<CardArt | null>(null);
  useEffect(() => {
    let active = true;
    const read = () => { let next: CardArt | null = null; try { next = readCardArt(getAppStorage(), goalKey) ?? (isShowcase() ? SHOWCASE_CARD_ART[goalKey] ?? null : null); } catch { next = null; } if (active) setArt(next); };
    queueMicrotask(read);
    const onSaved = (e: Event) => { const key = (e as CustomEvent<string>).detail; if (!key || key === GOAL_EXTRAS_KEY) read(); };
    const onStorage = (e: StorageEvent) => { if (!e.key || e.key.endsWith(GOAL_EXTRAS_KEY)) read(); };
    window.addEventListener(ZIGI_STORE_EVENT, onSaved); window.addEventListener('storage', onStorage); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { active = false; window.removeEventListener(ZIGI_STORE_EVENT, onSaved); window.removeEventListener('storage', onStorage); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, [goalKey]);
  return art;
}
