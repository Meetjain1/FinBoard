/**
 * Stock Chart Widget Component
 * Displays time series data as line or candlestick chart
 */

import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
} from 'recharts';
import { WidgetCard } from './WidgetCard';
import { useWidgetData } from '@/hooks/useWidgetData';
import { formatNumber } from '@/lib/api';
import { Button } from '@/components/ui/button';
import type { WidgetConfig, TimeSeriesData } from '@/types/widget';

interface StockChartWidgetProps {
  widget: WidgetConfig;
}

type ChartView = 'line' | 'area' | 'candlestick';

export function StockChartWidget({ widget }: StockChartWidgetProps) {
  const { data, loading, error, lastFetched, refetch } = useWidgetData(widget);
  const [chartView, setChartView] = useState<ChartView>(widget.chartType === 'candlestick' ? 'candlestick' : 'area');

  // Extract timeSeries from various possible data structures
  const timeSeries = useMemo(() => {
    if (!data) return undefined;

    // Direct array
    if (Array.isArray(data)) {
      return data.filter(item => item && typeof item === 'object' && 'close' in item) as TimeSeriesData[];
    }

    // Nested in timeSeries property
    if (data.timeSeries && Array.isArray(data.timeSeries)) {
      return data.timeSeries.filter(item => item && typeof item === 'object' && 'close' in item) as TimeSeriesData[];
    }

    // Alpha Vantage format: Time Series (Daily) or similar
    const tsKeys = Object.keys(data).filter(k => k.toLowerCase().includes('time series'));
    if (tsKeys.length > 0) {
      const tsData = data[tsKeys[0]];
      if (tsData && typeof tsData === 'object') {
        const entries = Object.entries(tsData).map(([date, values]: [string, any]) => ({
          date,
          open: parseFloat(values['1. open'] || values.open || 0),
          high: parseFloat(values['2. high'] || values.high || 0),
          low: parseFloat(values['3. low'] || values.low || 0),
          close: parseFloat(values['4. close'] || values.close || 0),
          volume: parseFloat(values['5. volume'] || values.volume || 0),
        })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return entries;
      }
    }

    return undefined;
  }, [data]);

  const chartData = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    return timeSeries.slice(-30).map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));
  }, [timeSeries]);

  const priceChange = useMemo(() => {
    if (!chartData.length || chartData.length < 2) return null;
    const first = chartData[0].close;
    const last = chartData[chartData.length - 1].close;
    const change = last - first;
    const percentChange = (change / first) * 100;
    return { change, percentChange, isPositive: change >= 0 };
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="mb-2 font-medium text-foreground">{label}</p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-mono">{formatNumber(data.open, 'currency')}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="font-mono text-gain">{formatNumber(data.high, 'currency', widget.currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-mono text-loss">{formatNumber(data.low, 'currency', widget.currency)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-mono font-medium">{formatNumber(data.close, 'currency', widget.currency)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <WidgetCard
      widget={widget}
      loading={loading}
      error={error}
      lastFetched={lastFetched}
      onRefresh={refetch}
      hasData={chartData.length > 0}
    >
      {chartData.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-muted-foreground">No chart data available</p>
          <button
            onClick={refetch}
            className="mt-3 text-xs text-primary hover:underline"
          >
            Refresh
          </button>
        </div>
      )}
      {chartData.length > 0 && (
        <div className="space-y-4">
          {/* Chart Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {priceChange && (
                <div className={priceChange.isPositive ? 'text-gain' : 'text-loss'}>
                  <span className="font-mono text-lg font-semibold">
                    {priceChange.isPositive ? '+' : ''}{formatNumber(priceChange.change, 'currency', widget.currency)}
                  </span>
                  <span className="ml-2 text-sm">
                    ({formatNumber(priceChange.percentChange, 'percent')})
                  </span>
                </div>
              )}
              {error && (
                <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                  Demo Data
                </span>
              )}
            </div>
            <div className="flex rounded-lg bg-muted p-0.5">
              {(['area', 'line', 'candlestick'] as const).map((view) => (
                <Button
                  key={view}
                  variant="ghost"
                  size="sm"
                  className={`h-7 px-2 text-xs capitalize ${chartView === view ? 'bg-background shadow-sm' : ''
                    }`}
                  onClick={() => setChartView(view)}
                >
                  {view}
                </Button>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={priceChange?.isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={priceChange?.isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatNumber(value, 'compact', widget.currency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={priceChange?.isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                    fill={`url(#gradient-${widget.id})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : chartView === 'line' ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatNumber(value, 'compact', widget.currency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={['dataMin - 2', 'dataMax + 2']}
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatNumber(value, 'compact', widget.currency)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="stepAfter"
                    dataKey="high"
                    stroke="hsl(var(--gain))"
                    strokeWidth={1}
                    dot={false}
                    opacity={0.5}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="low"
                    stroke="hsl(var(--loss))"
                    strokeWidth={1}
                    dot={false}
                    opacity={0.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
