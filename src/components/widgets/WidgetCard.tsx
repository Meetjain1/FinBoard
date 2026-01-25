/**
 * Base Widget Card Component
 * Wrapper for all widget types with drag handle, actions, and error handling
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Settings, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDashboardStore } from '@/store/dashboardStore';
import type { WidgetConfig } from '@/types/widget';

interface WidgetCardProps {
  widget: WidgetConfig;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  lastFetched?: number | null;
  onRefresh?: () => void;
  hasData?: boolean;
}

export function WidgetCard({ widget, children, loading, error, lastFetched, onRefresh, hasData }: WidgetCardProps) {
  const { removeWidget, setEditingWidget } = useDashboardStore();
  const [isHovered, setIsHovered] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatLastUpdated = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        className={`finance-card relative flex flex-col ${
          isDragging ? 'z-50 opacity-90 shadow-2xl scale-[1.02]' : ''
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            {...attributes}
            {...listeners}
            className="drag-handle touch-none rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h3 className="font-semibold text-foreground">{widget.name}</h3>
          {widget.symbol && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {widget.symbol}
            </span>
          )}
          {/* Show Cached badge when there's an error but we have old data */}
          {error && hasData && (
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              Cached
            </span>
          )}
          {/* Show Real-time badge when WebSocket is enabled and no error */}
          {!error && hasData && widget.enableWebSocket && (
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Real-time
            </span>
          )}
          {/* Show Fresh badge when data was recently fetched without WebSocket */}
          {!error && hasData && !widget.enableWebSocket && lastFetched && Date.now() - lastFetched < 60000 && (
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
              Fresh
            </span>
          )}
        </div>

        <div className={`flex items-center gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onRefresh}
                  disabled={loading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh data</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setEditingWidget(widget)}
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configure widget</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeWidget(widget.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove widget</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {loading && !hasData ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : error && !hasData ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-lg bg-amber-500/10 p-4">
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Rate Limit Exceeded</span>
            </div>
            <p className="text-sm font-medium text-foreground">No cached data available</p>
            <p className="mt-2 text-xs text-muted-foreground max-w-xs">{error}</p>
            <button
              onClick={onRefresh}
              className="mt-4 text-xs text-primary hover:underline"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {error && (
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="font-semibold">Rate Limit</span>
                <span className="text-muted-foreground">Showing cached data</span>
              </div>
            )}
            {children}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>Updated: {formatLastUpdated(lastFetched)}</span>
        </div>
        {widget.refreshInterval > 0 && (
          <span className="flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
            </span>
            {widget.refreshInterval}s refresh
          </span>
        )}
      </div>
    </motion.div>
    </div>
  );
}

export function WidgetCardSkeleton() {
  return (
    <div className="finance-card">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}
