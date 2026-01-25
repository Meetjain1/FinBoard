/**
 * Stock Quote Widget Component
 * Displays real-time stock price and key metrics
 */

import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { useWidgetData } from '@/hooks/useWidgetData';
import { formatNumber } from '@/lib/api';
import type { WidgetConfig, StockQuote } from '@/types/widget';

interface StockQuoteWidgetProps {
  widget: WidgetConfig;
}

export function StockQuoteWidget({ widget }: StockQuoteWidgetProps) {
  const { data, loading, error, lastFetched, refetch } = useWidgetData(widget);
  const quote = data?.quote as StockQuote | undefined;

  const isPositive = quote?.change !== undefined && quote.change >= 0;

  return (
    <WidgetCard
      widget={widget}
      loading={loading}
      error={error}
      lastFetched={lastFetched}
      onRefresh={refetch}
      hasData={!!quote}
    >
      {quote && (
        <div className="space-y-4">
          {/* Price */}
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-3xl font-bold text-foreground">
                {formatNumber(quote.price, 'currency', widget.currency)}
              </p>
              <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-gain' : 'text-loss'}`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-mono text-sm font-medium">
                  {isPositive ? '+' : ''}{formatNumber(quote.change, 'currency', widget.currency)} ({formatNumber(quote.changePercent, 'percent')})
                </span>
              </div>
            </div>
            <div className={`rounded-lg p-2 ${isPositive ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'}`}>
              {isPositive ? (
                <TrendingUp className="h-6 w-6" />
              ) : (
                <TrendingDown className="h-6 w-6" />
              )}
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetricItem label="Open" value={formatNumber(quote.open, 'currency', widget.currency)} />
            <MetricItem label="High" value={formatNumber(quote.high, 'currency', widget.currency)} />
            <MetricItem label="Low" value={formatNumber(quote.low, 'currency', widget.currency)} />
            <MetricItem label="Prev Close" value={formatNumber(quote.previousClose, 'currency', widget.currency)} />
          </div>

          {/* Volume */}
          <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
            <span className="text-sm text-muted-foreground">Volume</span>
            <span className="font-mono text-sm font-medium">{formatNumber(quote.volume, 'compact')}</span>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
