'use client';
import {useMemo} from 'react';
import {usePathname} from 'next/navigation';
import {formatUnits} from '@zigoals/chain-config';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings, visibleDomains} from '../../lib/dashboard-settings';
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
import {useGoals} from '../goal-provider';
import {useHabits} from '../habits/use-habits';
import {useFasting} from '../health/use-fasting';
import {useHealth} from '../health/use-health';
import {usePlatform} from '../platform/use-platform';
import {useMarketQuotes} from '../platform/use-market-quotes';
import {usePortfolios} from '../portfolio/use-portfolios';
import {usePrivateStore} from '../use-private-store';
import {useHealthConsent} from './use-health-consent';

/**
 * What ZIGi may see on this page (ADR-012, Part 4 wiring): the specialist's area from the pathname, the consent gates
 * (the page's share switch; Health only with the device-level Health choice, "Include Health" and, with an account, its
 * Health permission), then the context built from the same stores the page reads. Nothing is read on sensitive screens
 * or on Settings. The preview is the exact text that would be attached next.
 */
export type AiContextState = {area: PageArea; pathname: string; attaches: boolean; consent: Consent; context: PageContext | null; preview: Preview | null; ready: boolean};
const NO_REQUESTS: MarketQuoteRequest[] = [];
export function useAiContext(settings: AiSettings, providerName: string, sensitive: boolean): AiContextState {
  const pathname = usePathname() ?? '/app', area = pageArea(pathname), attaches = attachesContext(pathname);
  const platform = usePlatform(), habits = useHabits(), health = useHealth(), fasting = useFasting(), portfolios = usePortfolios(), legacy = useGoals();
  const dashboard = usePrivateStore(DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema, emptyDashboardSettings), healthConsent = useHealthConsent();
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
    const priceOf = (coin: string): string | undefined => {
      const entry = refs.get(coin); if (!entry) return undefined;
      if (portfolios.showcase) return entry.currency === 'USD' ? SHOWCASE_PRICES[coin] : undefined;
      const quote = referenceQuote(entry.ref as Parameters<typeof referenceQuote>[0], entry.currency, portfolioMarket.quotes, portfolioMarket.now);
      return quote ? formatUnits(quote.price, quote.priceDecimals) : undefined;
    };
    try {
      return buildPageContext({area, pathname, consent: gates, now, habitDay, healthDay: hDay, habits: habits.data, health: health.data, fasting: fasting.data, platform: platform.data, localGoals: legacy.goals, metadata: legacy.metadata?.goals ?? {}, quotes: market.quotes, portfolio: wealthView(pathname) === 'portfolio' ? {data: portfolios.data, priceOf} : null});
    } catch { return null; }
  }, [reads, area, pathname, gates, habits.data, health.data, fasting.data, platform.data, legacy.goals, legacy.metadata, market.quotes, portfolios.data, portfolios.showcase, portfolioMarket.quotes, portfolioMarket.now]);
  const preview = useMemo(() => context ? previewContext(context, {provider: providerName}) : null, [context, providerName]);
  return {area, pathname, attaches, consent: gates, context, preview, ready};
}
