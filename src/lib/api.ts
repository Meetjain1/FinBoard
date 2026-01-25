/**
 * Unified API Service for FinBoard
 * Combines Finnhub, IndianAPI, and Alpha Vantage with intelligent caching
 */

import { ALPHA_VANTAGE_API_KEY, ALPHA_VANTAGE_BASE_URL, CACHE_DURATION, STORAGE_KEYS, FINNHUB_API_KEY, INDIAN_API_KEY } from './constants';
import { getFinnhubQuote, getFinnhubCandles, getFinnhubNews, searchFinnhubSymbols, cache } from './finnhubApi';
import { getIndianStocks, getIndianStockDetails, getTrendingStocks, getIPOs, getMutualFunds } from './indianApi';
import type { StockQuote, TimeSeriesData, MarketGainer, ApiTestResult, WidgetField } from '@/types/widget';

// Re-export cache functions
export { cache, clearCache, getCacheStats } from './finnhubApi';

// Re-export Finnhub functions
export { getFinnhubQuote, getFinnhubCandles, getFinnhubNews, searchFinnhubSymbols, finnhubWS } from './finnhubApi';

// Re-export IndianAPI functions  
export { getIndianStocks, getIndianStockDetails, getTrendingStocks, getIPOs, getMutualFunds } from './indianApi';

/**
 * Crypto time series via Alpha Vantage DIGITAL_CURRENCY_DAILY
 */
export async function getCryptoTimeSeries(symbol: string): Promise<TimeSeriesData[]> {
  const cacheKey = `alphavantage-crypto-series-${symbol}`;
  const cached = cache.get<TimeSeriesData[]>(cacheKey);
  if (cached) return cached;

  const url = `${ALPHA_VANTAGE_BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${ALPHA_VANTAGE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    const fb = cache.get<TimeSeriesData[]>(cacheKey);
    if (fb) return fb;
    throw new Error(`AlphaVantage HTTP ${response.status}`);
  }
  const json = await response.json();
  const series = json['Time Series (Digital Currency Daily)'] || {};
  const result: TimeSeriesData[] = Object.entries(series).slice(0, 100).map(([date, v]: [string, any]) => ({
    date,
    open: parseFloat(v['1a. open (USD)'] || '0') || 0,
    high: parseFloat(v['2a. high (USD)'] || '0') || 0,
    low: parseFloat(v['3a. low (USD)'] || '0') || 0,
    close: parseFloat(v['4a. close (USD)'] || '0') || 0,
    volume: parseFloat(v['5. volume'] || '0') || 0,
  }));
  cache.set(cacheKey, result, CACHE_DURATION.timeSeries);
  return result;
}

export function sanitizeErrorMessage(message: string): string {
  const keys = [ALPHA_VANTAGE_API_KEY, FINNHUB_API_KEY, INDIAN_API_KEY].filter(Boolean) as string[];
  let clean = message || 'Unexpected error';
  keys.forEach((key) => {
    const escaped = key.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    clean = clean.replace(new RegExp(escaped, 'g'), '***');
  });
  clean = clean.replace(/apikey=([A-Za-z0-9]+)/gi, 'apikey=***');
  return clean;
}

/**
 * Unified stock quote function - uses Finnhub for US stocks
 */
export async function getStockQuote(symbol: string): Promise<StockQuote> {
  try {
    return await getFinnhubQuote(symbol);
  } catch (primaryErr) {
    // Fallback to Alpha Vantage Global Quote
    try {
      const cacheKey = `alphavantage-quote-${symbol}`;
      const cached = cache.get<StockQuote>(cacheKey);
      if (cached) return cached;

      const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`AlphaVantage HTTP ${response.status}`);
      const json = await response.json();
      const q = json['Global Quote'] || {};
      const quote: StockQuote = {
        symbol,
        price: parseFloat(q['05. price'] || '0') || 0,
        change: parseFloat(q['09. change'] || '0') || 0,
        changePercent: parseFloat((q['10. change percent'] || '0%').replace('%','')) || 0,
        high: parseFloat(q['03. high'] || '0') || 0,
        low: parseFloat(q['04. low'] || '0') || 0,
        open: parseFloat(q['02. open'] || '0') || 0,
        previousClose: parseFloat(q['08. previous close'] || '0') || 0,
        volume: parseFloat(q['06. volume'] || '0') || 0,
        latestTradingDay: q['07. latest trading day'] || new Date().toISOString().split('T')[0],
      };
      cache.set(cacheKey, quote, CACHE_DURATION.quote);
      return quote;
    } catch (fallbackErr) {
      throw new Error(sanitizeErrorMessage((fallbackErr as Error).message || (primaryErr as Error).message));
    }
  }
}

/**
 * Crypto quote using Coinbase spot price
 */
export async function getCryptoQuote(symbol: string): Promise<StockQuote> {
  const cacheKey = `crypto-quote-${symbol}`;
  const cached = cache.get<StockQuote>(cacheKey);
  if (cached) return cached;

  const base = symbol.toUpperCase().replace(/-USD$/, '');
  const response = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`);
  if (!response.ok) {
    const fallback = cache.get<StockQuote>(cacheKey);
    if (fallback) return fallback;
    throw new Error(`Failed to fetch ${base} price (${response.status})`);
  }

  const payload = await response.json();
  const price = parseFloat(payload?.data?.amount ?? '0');
  if (Number.isNaN(price) || price === 0) {
    throw new Error(`No price available for ${base}`);
  }

  const quote: StockQuote = {
    symbol: base,
    price,
    change: 0,
    changePercent: 0,
    high: price,
    low: price,
    open: price,
    previousClose: price,
    volume: 0,
    latestTradingDay: new Date().toISOString().split('T')[0],
  };

  cache.set(cacheKey, quote, CACHE_DURATION.quote);
  return quote;
}

/**
 * Get time series data - uses Finnhub candles
 */
export async function getTimeSeries(
  symbol: string,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<TimeSeriesData[]> {
  const resolutionMap: Record<string, 'D' | 'W' | 'M'> = {
    daily: 'D',
    weekly: 'W',
    monthly: 'M',
  };
  
  // Try Finnhub first
  try {
    const result = await getFinnhubCandles(symbol, resolutionMap[interval]);
    if (result && result.length > 0) {
      return result;
    }
  } catch (finnhubErr) {
    console.warn(`Finnhub failed for ${symbol}:`, (finnhubErr as Error).message);
  }
  
  // Try Alpha Vantage as fallback (but expect rate limits)
  try {
    const func = interval === 'daily' ? 'TIME_SERIES_DAILY' : interval === 'weekly' ? 'TIME_SERIES_WEEKLY' : 'TIME_SERIES_MONTHLY';
    const cacheKey = `alphavantage-series-${symbol}-${interval}`;
    const cached = cache.get<TimeSeriesData[]>(cacheKey);
    if (cached) return cached;
    
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=${func}&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`AlphaVantage HTTP ${response.status}`);
    }
    
    const json = await response.json();
    
    // Check for API errors or rate limits
    if (json['Error Message'] || json['Note'] || json['Information']) {
      throw new Error('AlphaVantage API limit reached');
    }
    
    // Find the Time Series key
    const timeSeriesKey = Object.keys(json).find(k => k.toLowerCase().includes('time series'));
    if (!timeSeriesKey) {
      throw new Error('Invalid Alpha Vantage response');
    }
    
    const series = json[timeSeriesKey];
    if (!series || typeof series !== 'object' || Object.keys(series).length === 0) {
      throw new Error('Empty Alpha Vantage data');
    }
    
    const result: TimeSeriesData[] = Object.entries(series).slice(0, 100).map(([date, v]: [string, any]) => ({
      date,
      open: parseFloat(v['1. open'] || v.open || '0') || 0,
      high: parseFloat(v['2. high'] || v.high || '0') || 0,
      low: parseFloat(v['3. low'] || v.low || '0') || 0,
      close: parseFloat(v['4. close'] || v.close || '0') || 0,
      volume: parseFloat(v['5. volume'] || v.volume || '0') || 0,
    }));
    
    if (result.length > 0) {
      cache.set(cacheKey, result, CACHE_DURATION.timeSeries);
      return result;
    }
  } catch (alphaErr) {
    console.warn(`Alpha Vantage failed for ${symbol}:`, (alphaErr as Error).message);
  }
  
  // Last resort: return demo data
  console.info(`Using demo data for ${symbol} chart`);
  const demoData = generateDemoTimeSeries(symbol, interval === 'daily' ? 30 : interval === 'weekly' ? 52 : 24);
  return demoData;
}

/**
 * Generate demo time series data for fallback
 */
function generateDemoTimeSeries(symbol: string, days: number = 30): TimeSeriesData[] {
  const data: TimeSeriesData[] = [];
  const now = Date.now();
  const basePrice = symbol === 'AAPL' ? 248 : symbol === 'MSFT' ? 465 : symbol === 'TSLA' ? 449 : 150;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now - i * 24 * 60 * 60 * 1000);
    const randomFactor = 0.98 + Math.random() * 0.04;
    const open = basePrice * randomFactor;
    const close = open * (0.97 + Math.random() * 0.06);
    const high = Math.max(open, close) * (1 + Math.random() * 0.02);
    const low = Math.min(open, close) * (1 - Math.random() * 0.02);
    const volume = Math.floor(50000000 + Math.random() * 50000000);
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume,
    });
  }
  
  return data;
}

/**
 * Get top gainers and losers - uses IndianAPI for Indian stocks
 */
export async function getTopGainersLosers(): Promise<{
  gainers: MarketGainer[];
  losers: MarketGainer[];
  mostActive: MarketGainer[];
}> {
  try {
    const stocks = await getIndianStocks();
    const sorted = [...stocks].sort((a, b) => b.change_percentage - a.change_percentage);

    const formatStock = (stock: typeof stocks[0]): MarketGainer => ({
      ticker: stock.company,
      price: String(stock.price),
      change_amount: String((stock.price * stock.change_percentage / 100).toFixed(2)),
      change_percentage: `${stock.change_percentage.toFixed(2)}%`,
      volume: stock.market_cap,
    });

    const payload = {
      gainers: sorted.slice(0, 10).filter((s) => s.change_percentage > 0).map(formatStock),
      losers: sorted.slice(-10).reverse().filter((s) => s.change_percentage < 0).map(formatStock),
      mostActive: stocks.slice(0, 10).map(formatStock),
    };
    cache.set('indian-trending', payload, CACHE_DURATION.indianStocks);
    return payload;
  } catch (error) {
    const fallback = cache.get<{
      gainers: MarketGainer[];
      losers: MarketGainer[];
      mostActive: MarketGainer[];
    }>('indian-trending');
    if (fallback) return fallback;
    console.error('Failed to fetch market movers:', error);
    return { gainers: [], losers: [], mostActive: [] };
  }
}

/**
 * Search for stock symbols - uses Finnhub
 */
export async function searchSymbols(keywords: string): Promise<Array<{
  symbol: string;
  name: string;
  type: string;
  region: string;
}>> {
  const results = await searchFinnhubSymbols(keywords);
  return results.map(r => ({
    symbol: r.symbol,
    name: r.description,
    type: r.type,
    region: 'US',
  }));
}

/**
 * Fetch data from custom API with caching
 */
export async function fetchCustomApi(url: string, cacheKey?: string, headers?: Record<string, string>): Promise<Record<string, unknown>> {
  const key = cacheKey || `custom-${url}`;
  const cached = cache.get<Record<string, unknown>>(key);
  if (cached) return cached;

  try {
    const response = await fetch(url, headers ? { headers } : undefined);
    if (!response.ok) {
      // return cached for any non-OK response if available
      if (cached) return cached;
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    cache.set(key, data, CACHE_DURATION.custom);
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    const fallback = cache.get<Record<string, unknown>>(key);
    if (fallback) return fallback;
    throw new Error(sanitizeErrorMessage(message));
  }
}

/**
 * Test any API endpoint and extract available fields
 */
export async function testApiEndpoint(url: string, headers?: Record<string, string>): Promise<ApiTestResult> {
  try {
    const response = await fetch(url, headers ? { headers } : undefined);
    if (!response.ok) {
      return { success: false, error: sanitizeErrorMessage(`HTTP ${response.status}: ${response.statusText}`) };
    }
    
    const data = await response.json();
    
    // Check for common error formats
    if (data.error) {
      return { success: false, error: data.error };
    }
    if (data['Error Message'] || data['Note'] || data['Information']) {
      return {
        success: false,
        error: data['Error Message'] || data['Note'] || data['Information'],
      };
    }
    
    const fields = extractFields(data);
    const arrayFields = fields.filter(f => f.type === 'array');
    
    // Cache the test result
    cache.set(`custom-${url}`, data, CACHE_DURATION.custom);
    
    return {
      success: true,
      data,
      fields,
      arrayFields,
    };
  } catch (error) {
    return {
      success: false,
      error: sanitizeErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred'),
    };
  }
}

/**
 * Recursively extract fields from JSON data
 */
export function extractFields(data: unknown, prefix = '', depth = 0): WidgetField[] {
  if (depth > 5) return [];
  
  const fields: WidgetField[] = [];
  
  if (data === null || data === undefined) return fields;
  
  if (Array.isArray(data)) {
    fields.push({
      path: prefix || 'root',
      label: prefix || 'root',
      type: 'array',
      value: data.length > 0 ? `Array[${data.length}]` : 'Empty Array',
    });
    
    if (data.length > 0 && typeof data[0] === 'object') {
      const subFields = extractFields(data[0], `${prefix}[0]`, depth + 1);
      fields.push(...subFields);
    }
  } else if (typeof data === 'object') {
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (Array.isArray(value)) {
        fields.push({
          path,
          label: key,
          type: 'array',
          value: `Array[${value.length}]`,
        });
        if (value.length > 0 && typeof value[0] === 'object') {
          const subFields = extractFields(value[0], `${path}[0]`, depth + 1);
          fields.push(...subFields);
        }
      } else if (typeof value === 'object' && value !== null) {
        fields.push({
          path,
          label: key,
          type: 'object',
        });
        const subFields = extractFields(value, path, depth + 1);
        fields.push(...subFields);
      } else {
        fields.push({
          path,
          label: key,
          type: typeof value as 'string' | 'number' | 'boolean',
          value,
        });
      }
    });
  }
  
  return fields;
}

/**
 * Get value from nested object using dot notation path
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  
  return current;
}

/**
 * Get array data from path
 */
export function getArrayByPath(obj: unknown, path: string): unknown[] {
  const value = getValueByPath(obj, path);
  if (Array.isArray(value)) return value;
  return [];
}

/**
 * Format number for display
 */
export function formatNumber(value: number, type?: 'currency' | 'percent' | 'compact', currency = 'USD'): string {
  if (isNaN(value)) return '-';
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    case 'compact':
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short',
      }).format(value);
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
  }
}
