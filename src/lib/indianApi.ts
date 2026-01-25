/**
 * IndianAPI Service
 * For Indian stock market data with higher rate limits
 */

import { INDIAN_API_KEY, INDIAN_API_BASE_URL, INDIAN_API_FALLBACK_BASES, CACHE_DURATION } from './constants';
import { cache } from './finnhubApi';

const FALLBACK_INDIAN_STOCKS = [
  { company: 'Reliance Industries', price: 2565.4, change_percentage: 0.82, sector: 'Energy', market_cap: '1.8T', pe_ratio: 23.1, week_52_high: 2800, week_52_low: 2180 },
  { company: 'Tata Consultancy Services', price: 3842.1, change_percentage: -0.35, sector: 'IT Services', market_cap: '1.4T', pe_ratio: 29.4, week_52_high: 4000, week_52_low: 3100 },
  { company: 'HDFC Bank', price: 1521.6, change_percentage: 0.58, sector: 'Banking', market_cap: '1.1T', pe_ratio: 21.8, week_52_high: 1700, week_52_low: 1400 },
  { company: 'Infosys', price: 1624.7, change_percentage: 0.14, sector: 'IT Services', market_cap: '667B', pe_ratio: 25.2, week_52_high: 1800, week_52_low: 1300 },
  { company: 'ICICI Bank', price: 983.2, change_percentage: -0.21, sector: 'Banking', market_cap: '694B', pe_ratio: 20.3, week_52_high: 1050, week_52_low: 850 },
  { company: 'Hindustan Unilever', price: 2431.3, change_percentage: 0.42, sector: 'FMCG', market_cap: '571B', pe_ratio: 32.5, week_52_high: 2600, week_52_low: 2250 },
];

// Common synonyms mapping for Indian stocks
const INDIAN_SYNONYMS: Record<string, string> = {
  RELIANCE: 'Reliance Industries',
  'RELIANCE INDUSTRIES': 'Reliance Industries',
  TCS: 'Tata Consultancy Services',
  'TATA CONSULTANCY SERVICES': 'Tata Consultancy Services',
  HDFCBANK: 'HDFC Bank',
  'HDFC BANK': 'HDFC Bank',
  INFY: 'Infosys',
  'INFOSYS': 'Infosys',
  ICICIBANK: 'ICICI Bank',
  'ICICI BANK': 'ICICI Bank',
  HINDUNILVR: 'Hindustan Unilever',
  'HINDUSTAN UNILEVER': 'Hindustan Unilever',
};

/**
 * Fetch with error handling for IndianAPI
 */
async function fetchIndianApi(endpoint: string, cacheKey?: string): Promise<unknown> {
  // Always try cache first
  const cached = cacheKey ? cache.get<unknown>(cacheKey) : null;

  if (!INDIAN_API_KEY) {
    if (cached) return cached;
    // Return offline fallback data instead of throwing
    console.warn('No Indian API key configured, using offline data');
    return { stocks: FALLBACK_INDIAN_STOCKS };
  }

  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const bases = Array.from(new Set([INDIAN_API_BASE_URL, ...INDIAN_API_FALLBACK_BASES])).filter(Boolean);
  let lastError: Error | null = null;

  for (const base of bases) {
    const url = `${base.replace(/\/$/, '')}${path}`;
    try {
      const response = await fetch(url, {
        headers: {
          'X-Api-Key': INDIAN_API_KEY,
        },
      }).catch(err => {
        // Silently catch fetch errors (like CORS) to avoid console noise
        if (err instanceof TypeError) {
          throw new Error('SILENT_FETCH_ERROR');
        }
        throw err;
      });

      if (!response.ok) {
        // Return cached or fallback on any error
        if (cached) return cached;
        lastError = new Error(`HTTP ${response.status}`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (cached) return cached;
        lastError = new Error('Invalid response format');
        continue;
      }

      const json = await response.json();
      if (cacheKey) {
        cache.set(cacheKey, json, CACHE_DURATION.indianStocks);
      }
      return json;
    } catch (error) {
      if ((error as Error).message !== 'SILENT_FETCH_ERROR') {
        console.warn(`Fetch issue for ${url}:`, error);
      }
      // Return cached on any error
      if (cached) return cached;
      lastError = error as Error;

      // If CORS or 429, don't try other bases to avoid compounding errors
      if (error instanceof TypeError || lastError.message?.includes('429')) {
        break;
      }
      continue;
    }
  }

  // Final fallback: return offline data/cache instead of failing
  if (cached) return cached;

  if (endpoint.includes('trending')) {
    return {
      trending_stocks: {
        top_gainers: FALLBACK_INDIAN_STOCKS.slice(0, 3),
        top_losers: FALLBACK_INDIAN_STOCKS.slice(3, 6)
      }
    };
  }

  // Try to find a matching stock in fallback data based on the query parameter
  const urlObj = new URL(path, 'http://dummy.com');
  const nameQuery = urlObj.searchParams.get('name')?.toLowerCase();

  if (nameQuery) {
    const match = FALLBACK_INDIAN_STOCKS.find(s =>
      s.company.toLowerCase().includes(nameQuery) ||
      nameQuery.includes(s.company.toLowerCase().split(' ')[0])
    );
    if (match) return match;
  }

  return FALLBACK_INDIAN_STOCKS[0];
}

/**
 * Get stock details by name
 */
export async function getIndianStockDetails(name: string): Promise<{
  tickerId: string;
  companyName: string;
  industry: string;
  currentPrice: { BSE: number; NSE: number };
  percentChange: number;
  yearHigh: number;
  yearLow: number;
}> {
  const canonicalName = INDIAN_SYNONYMS[name.toUpperCase()] || name;
  const cacheKey = `indian-stock-${canonicalName}`;

  // Check fallback data first
  const lookupKey = canonicalName.toLowerCase();
  const fallback = FALLBACK_INDIAN_STOCKS.find((stock) =>
    stock.company.toLowerCase().includes(lookupKey) ||
    name.toLowerCase().includes(stock.company.toLowerCase().split(' ')[0])
  );

  const cached = cache.get<{
    tickerId: string;
    companyName: string;
    industry: string;
    currentPrice: { BSE: number; NSE: number };
    percentChange: number;
    yearHigh: number;
    yearLow: number;
  }>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchIndianApi(`/stock?name=${encodeURIComponent(canonicalName)}`, cacheKey) as Record<string, unknown>;
    const payload = (data as Record<string, unknown>) || {};

    const result = {
      tickerId: (payload.tickerId || payload.ticker || payload.ticker_id || canonicalName) as string,
      companyName: (payload.companyName || payload.company_name || payload.company || canonicalName) as string,
      industry: (payload.industry || payload.mgIndustry || fallback?.sector || 'N/A') as string,
      currentPrice: (payload.currentPrice as { BSE: number; NSE: number }) || { BSE: Number(payload.price) || fallback?.price || 0, NSE: Number(payload.price) || fallback?.price || 0 },
      percentChange: parseFloat(String(payload.percentChange || payload.percent_change || payload.change_percentage || fallback?.change_percentage || 0)),
      yearHigh: parseFloat(String(payload.yearHigh || payload.year_high || payload['52_week_high'] || fallback?.week_52_high || 0)),
      yearLow: parseFloat(String(payload.yearLow || payload.year_low || payload['52_week_low'] || fallback?.week_52_low || 0)),
    };

    cache.set(cacheKey, result, CACHE_DURATION.quote);
    return result;
  } catch (error) {
    if (fallback) {
      const fallbackResult = {
        tickerId: fallback.company,
        companyName: fallback.company,
        industry: fallback.sector,
        currentPrice: { BSE: fallback.price, NSE: fallback.price },
        percentChange: fallback.change_percentage,
        yearHigh: fallback.week_52_high,
        yearLow: fallback.week_52_low,
      };
      cache.set(cacheKey, fallbackResult, CACHE_DURATION.quote);
      return fallbackResult;
    }
    const cached = cache.get<{
      tickerId: string;
      companyName: string;
      industry: string;
      currentPrice: { BSE: number; NSE: number };
      percentChange: number;
      yearHigh: number;
      yearLow: number;
    }>(cacheKey);
    if (cached) return cached;
    // Return a default fallback instead of throwing
    return {
      tickerId: name,
      companyName: name,
      industry: 'N/A',
      currentPrice: { BSE: 0, NSE: 0 },
      percentChange: 0,
      yearHigh: 0,
      yearLow: 0,
    };
  }
}

/**
 * Get trending stocks (mock using common stocks)
 */
export async function getIndianStocks(): Promise<Array<{
  company: string;
  price: number;
  change_percentage: number;
  sector: string;
  market_cap: string;
  pe_ratio: number;
  week_52_high: number;
  week_52_low: number;
}>> {
  const cacheKey = 'indian-stocks';
  const cached = cache.get<Array<{
    company: string;
    price: number;
    change_percentage: number;
    sector: string;
    market_cap: string;
    pe_ratio: number;
    week_52_high: number;
    week_52_low: number;
  }>>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchIndianApi('/trending', cacheKey) as Record<string, unknown>;

    // Robust mapping for varying API structures
    const trending = (data as Record<string, unknown>).trending_stocks as Record<string, unknown> | undefined;
    const gainers = (trending?.top_gainers || data.top_gainers || data.gainers || []) as Array<Record<string, unknown>>;
    const losers = (trending?.top_losers || data.top_losers || data.losers || []) as Array<Record<string, unknown>>;
    const stocks = (data.stocks || data.data || (Array.isArray(data) ? data : [])) as Array<Record<string, unknown>>;

    const combined = [...gainers, ...losers, ...stocks];

    const mapped = combined.map((item) => ({
      company: (item.company_name || item.name || item.company || item.ticker_id || item.ticker || 'N/A') as string,
      price: parseFloat(String(item.price ?? item.last_price ?? 0)),
      change_percentage: parseFloat(String(item.percent_change ?? item.change_percentage ?? item.net_change ?? item.change ?? 0)),
      sector: (item.industry || item.sector || 'N/A') as string,
      market_cap: String(item.market_cap || item.volume || 'N/A'),
      pe_ratio: parseFloat(String(item.pe_ratio || 0)),
      week_52_high: parseFloat(String(item.year_high || item['52_week_high'] || 0)),
      week_52_low: parseFloat(String(item.year_low || item['52_week_low'] || 0)),
    }));

    const result = mapped.filter((s) => !Number.isNaN(s.price));
    cache.set(cacheKey, result, CACHE_DURATION.indianStocks);
    return result;
  } catch (error) {
    const fallbackCached = cache.get<Array<{
      company: string;
      price: number;
      change_percentage: number;
      sector: string;
      market_cap: string;
      pe_ratio: number;
      week_52_high: number;
      week_52_low: number;
    }>>(cacheKey);
    if (fallbackCached) return fallbackCached;
    cache.set(cacheKey, FALLBACK_INDIAN_STOCKS, CACHE_DURATION.indianStocks);
    return FALLBACK_INDIAN_STOCKS;
  }
}

/**
 * Get trending stocks
 */
export async function getTrendingStocks(): Promise<Array<{
  name: string;
  symbol: string;
  price: number;
  change: number;
}>> {
  const stocks = await getIndianStocks();
  return stocks.map(s => ({
    name: s.company,
    symbol: s.company.split(' ')[0].toUpperCase(),
    price: s.price,
    change: s.change_percentage,
  }));
}

/**
 * Get IPO data (placeholder)
 */
export async function getIPOs(): Promise<Array<{
  company_name: string;
  open_date: string;
  close_date: string;
  issue_price: string;
  issue_size: string;
  status: string;
}>> {
  return [];
}

/**
 * Get mutual funds (placeholder)
 */
export async function getMutualFunds(): Promise<Array<{
  name: string;
  category: string;
  nav: number;
  returns_1y: number;
  returns_3y: number;
  aum: string;
}>> {
  return [];
}
