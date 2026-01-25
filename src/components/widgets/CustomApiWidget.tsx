/**
 * Custom API Widget Component
 * Displays data from any user-configured API endpoint
 */

import { WidgetCard } from './WidgetCard';
import { useWidgetData } from '@/hooks/useWidgetData';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { WidgetConfig } from '@/types/widget';

interface CustomApiWidgetProps {
  widget: WidgetConfig;
}

export function CustomApiWidget({ widget }: CustomApiWidgetProps) {
  const { data, loading, error, lastFetched, refetch } = useWidgetData(widget);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'number') {
      if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
      if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(2)}K`;

      // Handle floating point decimals
      if (Number.isInteger(value)) return value.toString();

      // If it looks like a price (positive, not too many leading zeros)
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);

    // Try to parse string as number if it looks like one
    if (typeof value === 'string' && !isNaN(parseFloat(value)) && isFinite(Number(value))) {
      return formatValue(parseFloat(value));
    }

    return String(value);
  };

  const entries = data ? Object.entries(data as Record<string, unknown>) : [];

  return (
    <WidgetCard
      widget={widget}
      loading={loading}
      error={error}
      lastFetched={lastFetched}
      onRefresh={refetch}
      hasData={entries.length > 0}
    >
      <ScrollArea className="h-[200px]">
        {widget.type === 'table' && entries.length > 0 ? (
          <div className="space-y-2">
            {Array.isArray(entries[0]?.[1]) ? (
              // Array data - render as table
              <div className="space-y-1">
                {(entries[0][1] as unknown[]).slice(0, 10).map((item, idx) => (
                  <div key={idx} className="rounded-lg bg-muted/50 p-2 text-sm">
                    {typeof item === 'object' && item !== null ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(item as Record<string, unknown>).slice(0, 4).map(([k, v]) => (
                          <div key={k} className="flex justify-between">
                            <span className="text-muted-foreground truncate">{k}:</span>
                            <span className="font-mono font-medium truncate ml-2">{formatValue(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono">{formatValue(item)}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              // Object data - render as key-value pairs
              <div className="space-y-2">
                {entries.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-sm text-muted-foreground truncate max-w-[40%]">{key}</span>
                    <span className="font-mono text-sm font-medium truncate max-w-[55%]">{formatValue(value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Card view - display selected fields
          <div className="grid gap-3">
            {entries.length > 0 ? (
              entries.map(([key, value]) => (
                <div key={key} className="rounded-lg bg-muted/50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{key}</p>
                  <p className="mt-1 font-mono text-lg font-semibold text-foreground">
                    {formatValue(value)}
                  </p>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No data to display</p>
                <p className="mt-1 text-xs">Configure fields to display or check the API endpoint</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </WidgetCard>
  );
}
