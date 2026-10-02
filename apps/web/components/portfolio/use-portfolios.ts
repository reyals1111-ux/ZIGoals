'use client';
import {useCallback, useEffect, useState} from 'react';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {getAppStorage, isShowcase, showcaseDay} from '../../lib/showcase-storage';
import {PORTFOLIO_KEY, emptyPortfolioData, type PortfolioData} from '../../lib/portfolio/schema';
import {readPortfolios, updatePortfolios} from '../../lib/portfolio/store';
import {showcasePortfolios} from '../../lib/portfolio/showcase';

const EVENT = 'zigoals:portfolio-change';
type State = {data: PortfolioData; unreadable: boolean; loaded: boolean; showcase: boolean};
/**
 * This device's portfolios (lib/portfolio), read after mount and written only by the reader's own changes. In Showcase
 * the tab's storage is used, and until something is changed there the fictional Showcase portfolio is shown.
 */
export function usePortfolios() {
  const [state, setState] = useState<State>({data: emptyPortfolioData(), unreadable: false, loaded: false, showcase: false});
  const refresh = useCallback(() => {
    try {
      const showcase = isShowcase(), storage = getAppStorage(), read = readPortfolios(storage);
      const data = showcase && !read.unreadable && storage.getItem(PORTFOLIO_KEY) === null ? showcasePortfolios(showcaseDay() ?? new Date().toISOString().slice(0, 10)) : read.data;
      setState({data, unreadable: read.unreadable, loaded: true, showcase});
    } catch { setState({data: emptyPortfolioData(), unreadable: true, loaded: true, showcase: false}); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) refresh(); });
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(PORTFOLIO_KEY)) refresh(); };
    window.addEventListener('storage', onStorage); window.addEventListener(EVENT, refresh); window.addEventListener(ACCOUNT_CHANGE, refresh);
    return () => { active = false; window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener(ACCOUNT_CHANGE, refresh); };
  }, [refresh]);
  /** Throws, with nothing written, when storage refuses, the data is unreadable (unless replacing it) or the change is refused. */
  const update = useCallback((change: (current: PortfolioData) => PortfolioData, options: {replaceUnreadable?: boolean} = {}) => {
    const storage = getAppStorage();
    // In Showcase the fictional portfolio becomes the tab's own copy on the first change.
    const base = state.showcase && storage.getItem(PORTFOLIO_KEY) === null ? state.data : undefined;
    const next = updatePortfolios(storage, current => change(base ?? current), options);
    setState(previous => ({...previous, data: next, unreadable: false}));
    window.dispatchEvent(new Event(EVENT));
    return next;
  }, [state.showcase, state.data]);
  return {...state, update};
}
