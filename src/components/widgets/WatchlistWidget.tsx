/**
 * Watchlist Widget Component
 * Displays a list of tracked stocks with real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Plus, X, Search, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WidgetCard } from './WidgetCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDashboardStore } from '@/store/dashboardStore';
import { getStockQuote, getCryptoQuote, searchSymbols, formatNumber } from '@/lib/api';
import { POPULAR_SYMBOLS, POPULAR_CRYPTO } from '@/lib/constants';
import type { WidgetConfig, StockQuote, WatchlistItem } from '@/types/widget';

interface WatchlistWidgetProps {
  widget: WidgetConfig;
}

export function WatchlistWidget({ widget }: WatchlistWidgetProps) {
  const { updateWidget, widgetData, setWidgetData, setWidgetLoading, setWidgetError } = useDashboardStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const symbols = widget.symbols || [];
  const data = widgetData[widget.id];

  const isCryptoSymbol = useCallback(
    (sym: string) => widget.apiProvider === 'crypto' || POPULAR_CRYPTO.some((c) => c.symbol === sym.toUpperCase()),
    [widget.apiProvider]
  );

  const fetchQuotes = useCallback(async () => {
    if (symbols.length === 0) return;
    
    setWidgetLoading(widget.id, true);
    
    try {
      const quotes: Record<string, StockQuote> = {};
      
      // Fetch quotes one by one with delay to avoid rate limiting
      for (let i = 0; i < symbols.length; i++) {
        try {
          const fetchFn = isCryptoSymbol(symbols[i]) ? getCryptoQuote : getStockQuote;
          const quote = await fetchFn(symbols[i]);
          quotes[symbols[i]] = quote;
        } catch (err) {
          // Continue with other symbols if one fails
          console.error(`Failed to fetch ${symbols[i]}:`, err);
        }
        
        // Small delay between requests
        if (i < symbols.length - 1) {
          await new Promise(r => setTimeout(r, 200));
        }
      }
      
      setWidgetData(widget.id, { data: { quotes }, loading: false, error: null });
    } catch (error) {
      setWidgetError(widget.id, error instanceof Error ? error.message : 'Failed to fetch quotes');
    }
  }, [symbols, widget.id, isCryptoSymbol, setWidgetData, setWidgetLoading, setWidgetError]);

  useEffect(() => {
    fetchQuotes();
    
    if (widget.refreshInterval > 0) {
      const interval = setInterval(fetchQuotes, widget.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchQuotes, widget.refreshInterval]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    if (widget.apiProvider === 'crypto') {
      const results = POPULAR_CRYPTO.filter((c) => c.symbol.includes(query.toUpperCase()) || c.name.toLowerCase().includes(query.toLowerCase()));
      setSearchResults(results.slice(0, 6).map(r => ({ symbol: r.symbol, name: r.name })));
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchSymbols(query);
      setSearchResults(results.slice(0, 5).map(r => ({ symbol: r.symbol, name: r.name })));
    } catch {
      setSearchResults([]);
    }
    setIsSearching(false);
  }, [widget.apiProvider]);

  const handleAddSymbol = useCallback((symbol: string) => {
    if (!symbols.includes(symbol)) {
      updateWidget(widget.id, { symbols: [...symbols, symbol] });
    }
    setSearchQuery('');
    setSearchResults([]);
    setIsAddOpen(false);
  }, [symbols, widget.id, updateWidget]);

  const handleRemoveSymbol = useCallback((symbol: string) => {
    updateWidget(widget.id, { symbols: symbols.filter(s => s !== symbol) });
  }, [symbols, widget.id, updateWidget]);

  const quotes = (data?.data?.quotes || {}) as Record<string, StockQuote>;
  const hasQuotes = Object.keys(quotes).length > 0;

  return (
    <WidgetCard
      widget={widget}
      loading={data?.loading && Object.keys(quotes).length === 0}
      error={data?.error}
      lastFetched={data?.lastFetched}
      onRefresh={fetchQuotes}
      hasData={hasQuotes}
    >
      <div className="space-y-3">
        {/* Add Symbol Button */}
        <Popover open={isAddOpen} onOpenChange={setIsAddOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Symbol
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search symbols..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {isSearching && (
                <div className="flex justify-center py-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              
              {searchResults.length > 0 && (
                <div className="space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.symbol}
                      onClick={() => handleAddSymbol(result.symbol)}
                      className="w-full rounded-lg p-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{result.symbol}</span>
                      <span className="ml-2 text-muted-foreground text-xs truncate">{result.name}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {searchQuery.length < 2 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground mb-2">Popular {widget.apiProvider === 'crypto' ? 'crypto assets' : 'stocks'}:</p>
                  <div className="flex flex-wrap gap-1">
                    {(widget.apiProvider === 'crypto' ? POPULAR_CRYPTO : POPULAR_SYMBOLS).slice(0, 6).map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => handleAddSymbol(s.symbol)}
                        disabled={symbols.includes(s.symbol)}
                        className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                      >
                        {s.symbol}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Watchlist */}
        <ScrollArea className="h-[200px]">
          <AnimatePresence mode="popLayout">
            {symbols.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
              >
                <Star className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No symbols in watchlist</p>
                <p className="text-xs">Click "Add Symbol" to get started</p>
              </motion.div>
            ) : (
              <div className="space-y-1">
                {symbols.map((symbol) => {
                  const quote = quotes[symbol];
                  const isPositive = quote?.change !== undefined && quote.change >= 0;
                  
                  return (
                    <motion.div
                      key={symbol}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{symbol}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {quote ? (
                          <>
                            <span className="font-mono text-sm font-medium">
                              {formatNumber(quote.price, 'currency')}
                            </span>
                            <span className={`flex items-center gap-0.5 font-mono text-xs ${isPositive ? 'text-gain' : 'text-loss'}`}>
                              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {formatNumber(quote.changePercent, 'percent')}
                            </span>
                          </>
                        ) : (
                          <Skeleton className="h-4 w-16" />
                        )}
                        
                        <button
                          onClick={() => handleRemoveSymbol(symbol)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </WidgetCard>
  );
}
