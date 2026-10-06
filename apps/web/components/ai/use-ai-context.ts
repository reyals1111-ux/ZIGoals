'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {usePathname} from 'next/navigation';
import {formatUnits} from '@zigoals/chain-config';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, visibleDomains} from '../../lib/dashboard-settings';
import {reviewWindow} from '../../lib/weekly-review/engine';
import {emptyWeeklyReview, WEEKLY_REVIEW_KEY, type WeeklyReview} from '../../lib/weekly-review/schema';
import {readWeeklyReview} from '../../lib/weekly-review/store';
import {habitCalendarDay} from '../../lib/habits';
import {dailyData, healthDay} from '../../lib/health-daily';
import {coinKey} from '../../lib/portfolio/schema';
import {SHOWCASE_PRICES} from '../../lib/portfolio/showcase';
import {referenceQuote} from '../../lib/product-insights';
import {wealthMarketRequests} from '../../lib/wealth';
import type {MarketQuoteRequest} from '../../lib/market-assets';
import {buildPageContext} from '../../lib/ai/context/builders';
import {consent, type Consent} from '../../lib/ai/context/consent';
import {attachesContext, pageArea, wealthView} from '../../lib/ai/context/pages';
import {previewContext, type Preview} from '../../lib/ai/context/preview';
import type {PageContext} from '../../lib/ai/context/types';
import type {AiSettings, PageArea} from '../../lib/ai/settings';
import {aiGates, type Gates} from '../../lib/ai/gates';
import type {PriceOf, ToolSources} from '../../lib/ai/tools/env';
import {notesForAi} from '../../lib/ai/memory';
import {AI_MEMORY, AI_OPTIONS} from '../../lib/ai/store/records';
import {getAppStorage, isShowcase} from '../../lib/showcase-storage';
import {ACCOUNT_CHANGE} from '../../lib/account-session';
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useFasting} from '../health/use-fasting';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {usePortfolios} from '../portfolio/use-portfolios';
import {usePrivateStore} from '../use-private-store';
import {useDeviceRecord} from './use-device-record';
import {useHealthConsent} from './use-health-consent';

/**
 * What ZIGi may see on this page (ADR-012, Part 4 wiring): the specialist's area from the pathname, the consent gates
 * (the page's share switch; Health only with the device-level Health choice, "Include Health" and, with an account, its
 * Health permission), then the context built from the same stores the page reads. Nothing is read on sensitive screens
 * or on Settings. The preview is the exact text that would be attached next.
 */
/**
 * Session V Part 2/3: the same stores also feed ZIGi's tools. `toolSources()` builds them for one question at the time
 * it is asked (today is today), on every page but sensitive screens, whether or not an AI is connected; `gates` says
 * what each path may read (lib/ai/gates.ts). Prices are only those already on this page; nothing is fetched for a tool.
 */
export type AiContextState = {area: PageArea; pathname: string; attaches: boolean; consent: Consent; context: PageContext | null; preview: Preview | null; ready: boolean; gates: Gates; toolSources: () => ToolSources | null};
const NO_REQUESTS: MarketQuoteRequest[] = [];
/**
 * The weekly review on this device, read the way Today's review reads it while sync writes are off (the device record,
 * lib/weekly-review/store). T read it through the private store, which only knows the four journals and refused this key
 * on every device, so the review week never reached ZIGi (found by Session V Part 9's spec). Read only; read again when
 * the review changes in this tab (its own event) or in another one, and on an account change. If sync writes are ever
 * switched on, this read follows the review's own hook instead (ADR-014).
 */
const REVIEW_CHANGE = 'zigoals:weekly-review-change';
function useWeeklyRecord(): {data: WeeklyReview; loaded: boolean; error: string} {
  const [state, setState] = useState<{data: WeeklyReview; loaded: boolean; error: string}>(() => ({data: emptyWeeklyReview(), loaded: false, error: ''}));
  useEffect(() => {
    const read = () => {
      try { const found = readWeeklyReview(getAppStorage()); setState({data: found.data, loaded: true, error: found.unreadable ? 'unreadable' : ''}); }
      catch { setState({data: emptyWeeklyReview(), loaded: true, error: 'unreadable'}); }
    };
    read();
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.endsWith(WEEKLY_REVIEW_KEY)) read(); };
    window.addEventListener('storage', onStorage); window.addEventListener(REVIEW_CHANGE, read); window.addEventListener(ACCOUNT_CHANGE, read);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(REVIEW_CHANGE, read); window.removeEventListener(ACCOUNT_CHANGE, read); };
  }, []);
  return state;
}
export function useAiContext(settings: AiSettings, providerName: string, sensitive: boolean): AiContextState {
  const pathname = usePathname() ?? '/app', area = pageArea(pathname), attaches = attachesContext(pathname);
  const platform = usePlatform(), habits = useHabits(), health = useHealth(), fasting = useFasting(), portfolios = usePortfolios(), legacy = useGoals();
  const dashboard = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), healthConsent = useHealthConsent();
  const weekly = useWeeklyRecord();
  // Part 8: the person's notes, only while "Use my notes" is on; the gates decide per path where they may go.
  const memory = useDeviceRecord(AI_MEMORY), options = useDeviceRecord(AI_OPTIONS);
  const layoutHasHealth = dashboard.loaded && !dashboard.error && visibleDomains(dashboard.data).includes('health');
  const gates = useMemo(() => consent({settings, area, pathname, layoutHasHealth, accountActive: healthConsent.accountActive, accountHealthPermitted: healthConsent.accountHealthPermitted}), [settings, area, pathname, layoutHasHealth, healthConsent.accountActive, healthConsent.accountHealthPermitted]);
  const ready = platform.loaded && habits.loaded && health.loaded && fasting.loaded && portfolios.loaded && legacy.loaded && dashboard.loaded && healthConsent.loaded;
  const reads = attaches && !sensitive && gates.page && settings.enabled && ready;
  // Quotes only where the page itself shows them (Wealth, Portfolio): the same cached route the page uses, nothing else.
  const wealthRequests = useMemo(() => reads && area === 'wealth' ? wealthMarketRequests(platform.data) : NO_REQUESTS, [reads, area, platform.data]);
  const portfolioRequests = useMemo<MarketQuoteRequest[]>(() => {
    if (!reads || area !== 'wealth' || wealthView(pathname) !== 'portfolio' || portfolios.showcase) return NO_REQUESTS;
    const seen = new Set<string>(), out: MarketQuoteRequest[] = [];
    for (const p of portfolios.data.portfolios.slice(0, 3)) for (const c of p.coins) { const key = `${coinKey(c.ref)}:${p.currency}`; if (!seen.has(key)) { seen.add(key); out.push({marketRef: c.ref, currency: p.currency}); } }
    return out;
  }, [reads, area, pathname, portfolios.showcase, portfolios.data]);
  const market = useMarketQuotes(wealthRequests.length ? wealthRequests : false), portfolioMarket = useMarketQuotes(portfolioRequests.length ? portfolioRequests : false);
  const context = useMemo<PageContext | null>(() => {
    if (!reads) return null;
    const now = new Date();
    let hDay = now.toISOString().slice(0, 10), habitDay = hDay;
    try { hDay = healthDay(dailyData(health.data).preferences.timezone, now); } catch { /* an unknown zone falls back to the UTC date */ }
    try { habitDay = habitCalendarDay(habits.data, now); } catch { habitDay = hDay; }
    const refs = new Map<string, {ref: {provider: string; kind: string; id: string}; currency: 'USD' | 'EUR'}>();
    for (const p of portfolios.data.portfolios) for (const c of p.coins) { const key = coinKey(c.ref); if (!refs.has(key)) refs.set(key, {ref: c.ref, currency: p.currency}); }
    // A coin's price in the asking portfolio's own currency (Session V Part 4 fix: T used the first portfolio's currency
    // for every portfolio holding that coin, so a EUR portfolio could be valued with a USD price).
    const priceOf = (coin: string, currency: string): string | undefined => {
      const entry = refs.get(coin); if (!entry) return undefined;
      if (portfolios.showcase) return currency === 'USD' ? SHOWCASE_PRICES[coin] : undefined;
      const quote = referenceQuote(entry.ref as Parameters<typeof referenceQuote>[0], currency, portfolioMarket.quotes, portfolioMarket.now);
      return quote ? formatUnits(quote.price, quote.priceDecimals) : undefined;
    };
    try {
      return buildPageContext({area, pathname, consent: gates, now, habitDay, healthDay: hDay, habits: habits.data, health: health.data, fasting: fasting.data, platform: platform.data, localGoals: legacy.goals, metadata: legacy.metadata?.goals ?? {}, quotes: market.quotes, portfolio: wealthView(pathname) === 'portfolio' ? {data: portfolios.data, priceOf} : null, week: area === 'today' && weekly.loaded && !weekly.error ? (() => { const w = reviewWindow(weekly.data.weekday, habitDay); return {weekStart: w.weekStart, weekEnd: w.weekEnd, review: weekly.data}; })() : null});
    } catch { return null; }
  }, [reads, area, pathname, gates, habits.data, health.data, fasting.data, platform.data, legacy.goals, legacy.metadata, market.quotes, portfolios.data, portfolios.showcase, portfolioMarket.quotes, portfolioMarket.now, weekly.loaded, weekly.error, weekly.data]);
  const preview = useMemo(() => context ? previewContext(context, {provider: providerName}) : null, [context, providerName]);
  const toolGates = useMemo(() => aiGates({settings, area, pathname, layoutHasHealth, accountActive: healthConsent.accountActive, accountHealthPermitted: healthConsent.accountHealthPermitted, sensitive}), [settings, area, pathname, layoutHasHealth, healthConsent.accountActive, healthConsent.accountHealthPermitted, sensitive]);
  const toolSources = useCallback((): ToolSources | null => {
    if (!ready || sensitive || !memory.loaded || !options.loaded) return null;
    const now = new Date(), deviceZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let hDay = now.toISOString().slice(0, 10), habitDay = hDay;
    const healthZone = dailyData(health.data).preferences.timezone ?? deviceZone, habitZone = habits.data.timeZone ?? deviceZone;
    try { hDay = healthDay(dailyData(health.data).preferences.timezone, now); } catch { /* an unknown zone falls back to the UTC date */ }
    try { habitDay = habitCalendarDay(habits.data, now); } catch { habitDay = hDay; }
    const refs = new Map<string, {provider: string; kind: string; id: string}>();
    for (const p of portfolios.data.portfolios) for (const c of p.coins) refs.set(coinKey(c.ref), c.ref);
    // A coin's price in the portfolio's own currency, with its source and time; never another currency's.
    const priceOf: PriceOf = (coin, currency) => {
      const ref = refs.get(coin); if (!ref) return undefined;
      if (portfolios.showcase) { const price = currency === 'USD' ? SHOWCASE_PRICES[coin] : undefined; return price ? {price, source: 'Showcase example price', observedAt: null} : undefined; }
      const quote = referenceQuote(ref as Parameters<typeof referenceQuote>[0], currency, portfolioMarket.quotes, portfolioMarket.now);
      return quote ? {price: formatUnits(quote.price, quote.priceDecimals), source: quote.source, observedAt: quote.observedAt ?? quote.fetchedAt ?? null} : undefined;
    };
    return {now, habitDay, healthDay: hDay, habitZone, healthZone, habits: habits.data, health: health.data, fasting: fasting.data, platform: platform.data, localGoals: legacy.goals, metadata: legacy.metadata?.goals ?? {}, quotes: market.quotes,
      localActivity: legacy.mode === 'local' ? legacy.activity : null, portfolio: {data: portfolios.data, priceOf}, weekly: weekly.loaded && !weekly.error ? weekly.data : null, notes: notesForAi(options.data, memory.data), showcase: isShowcase()};
  }, [ready, sensitive, health.data, habits.data, fasting.data, platform.data, legacy.goals, legacy.metadata, legacy.mode, legacy.activity, market.quotes, portfolios.data, portfolios.showcase, portfolioMarket.quotes, portfolioMarket.now, weekly.loaded, weekly.error, weekly.data, options.data, options.loaded, memory.data, memory.loaded]);
  return {area, pathname, attaches, consent: gates, context, preview, ready, gates: toolGates, toolSources};
}
