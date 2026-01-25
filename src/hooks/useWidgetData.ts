/**
 * Custom hook for fetching and managing widget data
 * Supports Finnhub, IndianAPI, and custom endpoints with WebSocket real-time updates
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useDashboardStore } from '@/store/dashboardStore';
import { 
  getStockQuote, 
  getTimeSeries, 
  getTopGainersLosers, 
  getValueByPath,
  finnhubWS,
  sanitizeErrorMessage,
  fetchCustomApi,
  getCryptoQuote,
} from '@/lib/api';
import { getIndianStocks, getIndianStockDetails } from '@/lib/indianApi';
import { INDIAN_API_KEY } from '@/lib/constants';
import type { WidgetConfig, StockQuote } from '@/types/widget';

// WebSocket trade data type
interface WSTradeData {
  s: string;
  p: number;
  v: number;
  t: number;
}

export function useWidgetData(widget: WidgetConfig) {
  const { setWidgetData, setWidgetLoading, setWidgetError, widgetData, currentDashboardType } = useDashboardStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const data = widgetData[widget.id];

  const scrubSecrets = useCallback((value: unknown): unknown => {
    if (typeof value === 'string') return sanitizeErrorMessage(value);
    if (Array.isArray(value)) return value.map((v) => scrubSecrets(v));
    if (value && typeof value === 'object') {
      const next: Record<string, unknown> = {};
      Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        next[k] = scrubSecrets(v);
      });
      return next;
    }
    return value;
  }, []);

  const fetchData = useCallback(async () => {
    setWidgetLoading(widget.id, true);
    
    try {
      let result: Record<string, unknown> = {};
      
      // Stock quote widget using Finnhub
      if (widget.symbol && widget.type === 'card' && widget.apiProvider !== 'indianapi') {
        const quote = await getStockQuote(widget.symbol);
        result = { quote };
      }
      // Chart widget using Finnhub
      else if (widget.symbol && widget.type === 'chart') {
        let timeSeries: any[] = [];
        if (widget.apiProvider === 'crypto' || currentDashboardType === 'crypto') {
          try {
            // Use Alpha Vantage crypto series
            const { getCryptoTimeSeries } = await import('@/lib/api');
            timeSeries = await getCryptoTimeSeries(widget.symbol);
          } catch {
            timeSeries = await getTimeSeries(widget.symbol, widget.timeInterval || 'daily');
          }
        } else {
          timeSeries = await getTimeSeries(widget.symbol, widget.timeInterval || 'daily');
        }
        result = { timeSeries };
      }
      // Market movers table using IndianAPI
      else if (widget.apiUrl?.includes('TOP_GAINERS_LOSERS') || widget.name?.includes('Market Movers')) {
        const gainersLosers = await getTopGainersLosers();
        result = gainersLosers;
      }
      // IndianAPI endpoints
      else if (widget.apiProvider === 'indianapi' || widget.apiUrl?.includes('indianapi')) {
        const nameFromUrl = widget.apiUrl ? (() => {
          try {
            const parsed = new URL(widget.apiUrl, 'https://placeholder.local');
            return parsed.searchParams.get('name');
          } catch {
            return null;
          }
        })() : null;

        if (widget.symbol || nameFromUrl || widget.name) {
          const identifier = widget.symbol || nameFromUrl || widget.name;
          const stock = await getIndianStockDetails(identifier);

          if (widget.selectedFields.length > 0) {
            widget.selectedFields.forEach((field) => {
              result[field.label] = getValueByPath(stock, field.path);
            });
          } else {
            result = {
              Company: stock.companyName,
              'NSE Price': stock.currentPrice.NSE || stock.currentPrice.BSE,
              'Change %': stock.percentChange,
              '52W High': stock.yearHigh,
              '52W Low': stock.yearLow,
            };
          }
        } else {
          const stocks = await getIndianStocks();
          result = { stocks };
        }
      }
      // Table widget with symbols: build rows per symbol based on provider
      else if (widget.type === 'table' && Array.isArray(widget.symbols) && widget.symbols.length > 0) {
        const rows: Array<Record<string, unknown>> = [];
        for (const sym of widget.symbols) {
          try {
            if (currentDashboardType === 'crypto' || widget.apiProvider === 'crypto') {
              const q = await getCryptoQuote(sym);
              rows.push({ Symbol: q.symbol, Price: q.price, Change: q.change, 'Change %': q.changePercent, High: q.high, Low: q.low });
            } else if (currentDashboardType === 'indian-market' || (widget.apiProvider as string) === 'indianapi') {
              const s = await getIndianStockDetails(sym);
              rows.push({ Company: s.companyName, NSE: s.currentPrice.NSE, 'Change %': s.percentChange, '52W High': s.yearHigh, '52W Low': s.yearLow });
            } else {
              const q = await getStockQuote(sym);
              rows.push({ Symbol: q.symbol, Price: q.price, Change: q.change, 'Change %': q.changePercent, High: q.high, Low: q.low, Open: q.open, PrevClose: q.previousClose });
            }
          } catch (e) {
            rows.push({ Symbol: sym, Error: (e as Error).message });
          }
        }
        result = { rows };
      }
      // Custom API endpoint with optional headers
      else if (widget.apiUrl) {
        const headers: Record<string, string> = {};
        if (widget.apiUrl.includes('indianapi')) {
          headers['X-Api-Key'] = INDIAN_API_KEY;
        }
        
        const jsonRaw = await fetchCustomApi(widget.apiUrl, widget.id, headers);
        const json = scrubSecrets(jsonRaw) as Record<string, unknown>;
        
        // Extract selected fields
        if (widget.selectedFields.length > 0) {
          widget.selectedFields.forEach((field) => {
            result[field.label] = getValueByPath(json, field.path);
          });
        } else {
          result = json;
        }
      }
      
      setWidgetData(widget.id, { data: result, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch data';
      const sanitized = sanitizeErrorMessage(message);
      console.warn(`Widget ${widget.id} (${widget.name}) error:`, sanitized);
      setWidgetError(widget.id, sanitized);
    }
  }, [widget.id, widget.symbol, widget.type, widget.apiUrl, widget.apiProvider, widget.timeInterval, widget.selectedFields, widget.name, currentDashboardType, setWidgetData, setWidgetLoading, setWidgetError, scrubSecrets]);

  // Initial fetch and set up interval
  useEffect(() => {
    fetchData();
    
    if (widget.refreshInterval > 0) {
      intervalRef.current = setInterval(fetchData, widget.refreshInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, widget.refreshInterval]);

  // WebSocket realtime updates for stock cards
  useEffect(() => {
    if (widget.type !== 'card' || !widget.symbol || !widget.enableWebSocket || widget.apiProvider !== 'finnhub') return;
    const unsubscribe = finnhubWS.subscribe(widget.symbol, (trade: WSTradeData) => {
      const quote: StockQuote = {
        symbol: trade.s,
        price: trade.p,
        change: 0,
        changePercent: 0,
        high: trade.p,
        low: trade.p,
        open: trade.p,
        previousClose: trade.p,
        volume: trade.v,
        latestTradingDay: new Date(trade.t).toISOString().split('T')[0],
      };
      setWidgetData(widget.id, { data: { quote }, loading: false, error: null });
    });
    return () => unsubscribe();
  }, [widget.type, widget.symbol, widget.enableWebSocket, widget.apiProvider, widget.id, setWidgetData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    data: data?.data,
    loading: data?.loading ?? true,
    error: data?.error,
    lastFetched: data?.lastFetched,
    refetch,
  };
}

/**
 * Hook for real-time stock quote with WebSocket support (Finnhub)
 */
export function useStockQuote(symbol: string | undefined, refreshInterval = 30, enableWebSocket = false) {
  const { setWidgetData, setWidgetLoading, setWidgetError, widgetData } = useDashboardStore();
  const widgetId = `quote-${symbol}`;
  const data = widgetData[widgetId];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [realtimePrice, setRealtimePrice] = useState<number | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!symbol) return;
    
    setWidgetLoading(widgetId, true);
    
    try {
      const quote = await getStockQuote(symbol);
      setWidgetData(widgetId, { data: { quote }, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch quote';
      setWidgetError(widgetId, message);
    }
  }, [symbol, widgetId, setWidgetData, setWidgetLoading, setWidgetError]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!symbol || !enableWebSocket) return;

    const unsubscribe = finnhubWS.subscribe(symbol, (trade: WSTradeData) => {
      setRealtimePrice(trade.p);
    });

    return () => {
      unsubscribe();
    };
  }, [symbol, enableWebSocket]);

  useEffect(() => {
    if (symbol) {
      fetchQuote();
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(fetchQuote, refreshInterval * 1000);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, refreshInterval, fetchQuote]);

  const quote = data?.data?.quote as StockQuote | undefined;
  
  return {
    quote: realtimePrice && quote ? { ...quote, price: realtimePrice } : quote,
    loading: data?.loading ?? true,
    error: data?.error,
    lastFetched: data?.lastFetched,
    refetch: fetchQuote,
    isRealtime: !!realtimePrice,
  };
}

/**
 * Hook for fetching time series data
 */
export function useTimeSeries(
  symbol: string | undefined,
  interval: 'daily' | 'weekly' | 'monthly' = 'daily',
  refreshInterval = 300
) {
  const { setWidgetData, setWidgetLoading, setWidgetError, widgetData } = useDashboardStore();
  const widgetId = `timeseries-${symbol}-${interval}`;
  const data = widgetData[widgetId];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTimeSeries = useCallback(async () => {
    if (!symbol) return;
    
    setWidgetLoading(widgetId, true);
    
    try {
      const timeSeries = await getTimeSeries(symbol, interval);
      setWidgetData(widgetId, { data: { timeSeries }, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch time series';
      setWidgetError(widgetId, message);
    }
  }, [symbol, interval, widgetId, setWidgetData, setWidgetLoading, setWidgetError]);

  useEffect(() => {
    if (symbol) {
      fetchTimeSeries();
      
      if (refreshInterval > 0) {
        intervalRef.current = setInterval(fetchTimeSeries, refreshInterval * 1000);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, interval, refreshInterval, fetchTimeSeries]);

  return {
    timeSeries: data?.data?.timeSeries,
    loading: data?.loading ?? true,
    error: data?.error,
    lastFetched: data?.lastFetched,
    refetch: fetchTimeSeries,
  };
}

/**
 * Hook for fetching market gainers/losers (uses IndianAPI)
 */
export function useMarketMovers(refreshInterval = 120) {
  const { setWidgetData, setWidgetLoading, setWidgetError, widgetData } = useDashboardStore();
  const widgetId = 'market-movers';
  const data = widgetData[widgetId];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMovers = useCallback(async () => {
    setWidgetLoading(widgetId, true);
    
    try {
      const movers = await getTopGainersLosers();
      setWidgetData(widgetId, { data: movers, loading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch market movers';
      setWidgetError(widgetId, message);
    }
  }, [widgetId, setWidgetData, setWidgetLoading, setWidgetError]);

  useEffect(() => {
    fetchMovers();
    
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchMovers, refreshInterval * 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refreshInterval, fetchMovers]);

  return {
    gainers: data?.data?.gainers,
    losers: data?.data?.losers,
    mostActive: data?.data?.mostActive,
    loading: data?.loading ?? true,
    error: data?.error,
    lastFetched: data?.lastFetched,
    refetch: fetchMovers,
  };
}

/**
 * Hook for real-time WebSocket trade data
 */
export function useRealtimeTrades(symbols: string[]) {
  const [trades, setTrades] = useState<Record<string, { symbol: string; price: number; volume: number; timestamp: number }>>({});

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    symbols.forEach(symbol => {
      const unsubscribe = finnhubWS.subscribe(symbol, (trade: WSTradeData) => {
        setTrades(prev => ({
          ...prev,
          [symbol]: {
            symbol: trade.s,
            price: trade.p,
            volume: trade.v,
            timestamp: trade.t,
          },
        }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [symbols.join(',')]);

  return trades;
}
