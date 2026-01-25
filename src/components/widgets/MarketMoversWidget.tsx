/**
 * Market Movers Widget Component
 * Displays top gainers, losers, and most active stocks
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { useWidgetData } from '@/hooks/useWidgetData';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WidgetConfig, MarketGainer } from '@/types/widget';

interface MarketMoversWidgetProps {
  widget: WidgetConfig;
}

type TabType = 'gainers' | 'losers' | 'active';

export function MarketMoversWidget({ widget }: MarketMoversWidgetProps) {
  const { data, loading, error, lastFetched, refetch } = useWidgetData(widget);
  const [activeTab, setActiveTab] = useState<TabType>('gainers');

  const gainers = data?.gainers as MarketGainer[] | undefined;
  const losers = data?.losers as MarketGainer[] | undefined;
  const mostActive = data?.mostActive as MarketGainer[] | undefined;

  const tabData: Record<TabType, { data: MarketGainer[] | undefined; icon: React.ReactNode; label: string }> = {
    gainers: { data: gainers, icon: <TrendingUp className="h-3.5 w-3.5" />, label: 'Gainers' },
    losers: { data: losers, icon: <TrendingDown className="h-3.5 w-3.5" />, label: 'Losers' },
    active: { data: mostActive, icon: <Activity className="h-3.5 w-3.5" />, label: 'Most Active' },
  };

  const currentData = tabData[activeTab].data;
  const hasMovers = !!currentData && currentData.length > 0;

  const formatPercent = (value: string) => {
    const num = parseFloat(value.replace('%', ''));
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const formatVolume = (value: string) => {
    const num = parseInt(value);
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return value;
  };

  return (
    <WidgetCard
      widget={widget}
      loading={loading}
      error={error}
      lastFetched={lastFetched}
      onRefresh={refetch}
      hasData={hasMovers}
    >
      <div className="space-y-3">
        {/* Tabs */}
        <div className="flex rounded-lg bg-muted p-0.5">
          {(Object.entries(tabData) as [TabType, typeof tabData[TabType]][]).map(([key, { icon, label }]) => (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              className={`flex-1 h-8 gap-1.5 text-xs ${
                activeTab === key ? 'bg-background shadow-sm' : ''
              } ${key === 'gainers' ? 'text-gain' : key === 'losers' ? 'text-loss' : ''}`}
              onClick={() => setActiveTab(key)}
            >
              {icon}
              {label}
            </Button>
          ))}
        </div>

        {/* Table */}
        <ScrollArea className="h-[280px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-8 text-xs">Symbol</TableHead>
                <TableHead className="h-8 text-right text-xs">Price</TableHead>
                <TableHead className="h-8 text-right text-xs">Change</TableHead>
                <TableHead className="h-8 text-right text-xs hidden sm:table-cell">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData?.slice(0, 8).map((stock, index) => {
                const isPositive = !stock.change_percentage.startsWith('-');
                return (
                  <TableRow key={stock.ticker} className="group">
                    <TableCell className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-medium">
                          {index + 1}
                        </span>
                        <span className="font-medium">{stock.ticker}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm">
                      ${parseFloat(stock.price).toFixed(2)}
                    </TableCell>
                    <TableCell className={`py-2 text-right font-mono text-sm ${isPositive ? 'text-gain' : 'text-loss'}`}>
                      {formatPercent(stock.change_percentage)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm text-muted-foreground hidden sm:table-cell">
                      {formatVolume(stock.volume)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!currentData || currentData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </WidgetCard>
  );
}
