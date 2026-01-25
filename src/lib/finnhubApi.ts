/**
 * Finnhub API Service
 * Primary API for US stocks with WebSocket support for real-time data
 * Rate limit: 60 calls/minute
 */

import { FINNHUB_API_KEY, FINNHUB_BASE_URL, FINNHUB_WS_URL, CACHE_DURATION, STORAGE_KEYS } from './constants';
import type { StockQuote, TimeSeriesData, WidgetField } from '@/types/widget';

// Enhanced cache with localStorage persistence
interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

class ApiCache {
  private memoryCache = new Map<string, CacheEntry>();
  private storageKey = STORAGE_KEYS.cache;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, CacheEntry>;
        const now = Date.now();
        Object.entries(parsed).forEach(([key, entry]) => {
          if (entry.expiresAt > now) {
            this.memoryCache.set(key, entry);
          }
        });
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      const obj: Record<string, CacheEntry> = {};
      this.memoryCache.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(obj));
    } catch {
      // Storage full or unavailable
    }
  }

  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (entry) {
      return entry.data as T;
    }
    return null;
  }

  set(key: string, data: unknown, duration: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + duration,
    };
    this.memoryCache.set(key, entry);
    this.saveToStorage();
  }

  clear(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.storageKey);
  }

  getStats(): { entries: number; oldestEntry: number | null } {
    let oldest: number | null = null;
    this.memoryCache.forEach((entry) => {
      if (!oldest || entry.timestamp < oldest) {
        oldest = entry.timestamp;
      }
    });
    return { entries: this.memoryCache.size, oldestEntry: oldest };
  }
}

export const cache = new ApiCache();

/**
 * Fetch with error handling for Finnhub API
 */
async function fetchFinnhub(url: string, cacheKey?: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Handle explicit status codes
      if (response.status === 403) {
        throw new Error('FINNHUB_FORBIDDEN');
      }

      // On rate limit, try to return cached data
      if (response.status === 429 && cacheKey) {
        const cached = cache.get<Record<string, unknown>>(cacheKey);
        if (cached) {
          console.info(`Rate limited for ${cacheKey}, returning cached data`);
          return cached;
        }
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      // On error, try cached data
      if (cacheKey) {
        const cached = cache.get<Record<string, unknown>>(cacheKey);
        if (cached) {
          console.log(`Error in response for ${cacheKey}, returning cached data`);
          return cached;
        }
      }
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    if ((error as Error).message === 'FINNHUB_FORBIDDEN') {
      // Return cached or empty object silently
      return cache.get<Record<string, unknown>>(cacheKey || '') || {};
    }
    // On any network error, try to return cached data
    if (cacheKey) {
      const cached = cache.get<Record<string, unknown>>(cacheKey);
      if (cached) {
        console.info(`Network error for ${cacheKey}, returning cached data`);
        return cached;
      }
    }
    throw error;
  }
}

/**
 * Get stock quote from Finnhub
 */
export async function getFinnhubQuote(symbol: string): Promise<StockQuote> {
  const cacheKey = `finnhub-quote-${symbol}`;
  const cached = cache.get<StockQuote>(cacheKey);
  if (cached) return cached;

  const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
  try {
    const data = await fetchFinnhub(url, cacheKey);

    if (!data.c || data.c === 0) {
      throw new Error(`No data found for symbol: ${symbol}`);
    }

    console.info(`✓ Fetched real-time data for ${symbol} from Finnhub`);

    const result: StockQuote = {
      symbol,
      price: data.c as number,
      change: data.d as number || 0,
      changePercent: data.dp as number || 0,
      high: data.h as number,
      low: data.l as number,
      open: data.o as number,
      previousClose: data.pc as number,
      volume: 0, // Finnhub quote doesn't include volume
      latestTradingDay: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, CACHE_DURATION.quote);
    return result;
  } catch (error) {
    const cached = cache.get<StockQuote>(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Get candlestick data from Finnhub
 */
export async function getFinnhubCandles(
  symbol: string,
  resolution: 'D' | 'W' | 'M' = 'D',
  days = 100
): Promise<TimeSeriesData[]> {
  const cacheKey = `finnhub-candles-${symbol}-${resolution}`;
  const cached = cache.get<TimeSeriesData[]>(cacheKey);
  if (cached) return cached;

  const to = Math.floor(Date.now() / 1000);
  const from = to - (days * 24 * 60 * 60);

  const url = `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`;
  try {
    const data = await fetchFinnhub(url, cacheKey);

    if (data.s === 'no_data' || !data.c) {
      throw new Error(`No candlestick data found for symbol: ${symbol}`);
    }

    const closes = data.c as number[];
    const highs = data.h as number[];
    const lows = data.l as number[];
    const opens = data.o as number[];
    const volumes = data.v as number[];
    const timestamps = data.t as number[];

    const result: TimeSeriesData[] = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toISOString().split('T')[0],
      open: opens[i],
      high: highs[i],
      low: lows[i],
      close: closes[i],
      volume: volumes[i],
    }));

    cache.set(cacheKey, result, CACHE_DURATION.timeSeries);
    return result;
  } catch (error) {
    const cached = cache.get<TimeSeriesData[]>(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Get market news from Finnhub
 */
export async function getFinnhubNews(): Promise<Array<{
  headline: string;
  source: string;
  datetime: number;
  url: string;
  summary: string;
}>> {
  const cacheKey = 'finnhub-news';
  const cached = cache.get<Array<{
    headline: string;
    source: string;
    datetime: number;
    url: string;
    summary: string;
  }>>(cacheKey);
  if (cached) return cached;

  const url = `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`;
  try {
    const data = await fetchFinnhub(url) as unknown as Array<Record<string, unknown>>;

    const result = (Array.isArray(data) ? data : []).slice(0, 20).map(item => ({
      headline: item.headline as string,
      source: item.source as string,
      datetime: item.datetime as number,
      url: item.url as string,
      summary: item.summary as string,
    }));

    cache.set(cacheKey, result, CACHE_DURATION.gainersLosers);
    return result;
  } catch (error) {
    const cached = cache.get<Array<{ headline: string; source: string; datetime: number; url: string; summary: string }>>(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Search for stock symbols
 */
export async function searchFinnhubSymbols(query: string): Promise<Array<{
  symbol: string;
  description: string;
  type: string;
}>> {
  const cacheKey = `finnhub-search-${query}`;
  const cached = cache.get<Array<{
    symbol: string;
    description: string;
    type: string;
  }>>(cacheKey);
  if (cached) return cached;

  const url = `${FINNHUB_BASE_URL}/search?q=${encodeURIComponent(query)}&token=${FINNHUB_API_KEY}`;
  try {
    const data = await fetchFinnhub(url);

    const result = ((data.result || []) as Array<Record<string, unknown>>).slice(0, 10).map(item => ({
      symbol: item.symbol as string,
      description: item.description as string,
      type: item.type as string,
    }));

    cache.set(cacheKey, result, CACHE_DURATION.timeSeries);
    return result;
  } catch (error) {
    const cached = cache.get<Array<{ symbol: string; description: string; type: string }>>(cacheKey);
    if (cached) return cached;
    throw error;
  }
}

/**
 * WebSocket Manager for real-time Finnhub data
 */
class FinnhubWebSocket {
  private socket: WebSocket | null = null;
  private subscribers: Map<string, Set<(data: { s: string; p: number; v: number; t: number }) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.socket = new WebSocket(`${FINNHUB_WS_URL}?token=${FINNHUB_API_KEY}`);

    this.socket.onopen = () => {
      console.log('Finnhub WebSocket connected');
      this.reconnectAttempts = 0;
      // Re-subscribe to all symbols
      this.subscribers.forEach((_, symbol) => {
        this.socket?.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'trade' && data.data) {
          data.data.forEach((trade: { s: string; p: number; v: number; t: number }) => {
            const callbacks = this.subscribers.get(trade.s);
            callbacks?.forEach(callback => callback(trade));
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.socket.onclose = () => {
      console.log('Finnhub WebSocket closed');
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Finnhub WebSocket error:', error);
    };
  }

  subscribe(symbol: string, callback: (data: { s: string; p: number; v: number; t: number }) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: 'subscribe', symbol }));
      }
    }

    this.subscribers.get(symbol)!.add(callback);

    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscribers.delete(symbol);
          if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          }
        }
      }
    };
  }

  disconnect(): void {
    this.socket?.close();
    this.socket = null;
    this.subscribers.clear();
  }
}

export const finnhubWS = new FinnhubWebSocket();

/**
 * Clear cache
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { entries: number; oldestEntry: number | null } {
  return cache.getStats();
}
