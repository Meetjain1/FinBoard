/**
 * Dashboard Grid Component
 * Main container for widgets with drag and drop functionality
 */

import { useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardStore } from '@/store/dashboardStore';
import type { DashboardType } from '@/store/dashboardStore';
import { StockQuoteWidget } from '@/components/widgets/StockQuoteWidget';
import { StockChartWidget } from '@/components/widgets/StockChartWidget';
import { MarketMoversWidget } from '@/components/widgets/MarketMoversWidget';
import { CustomApiWidget } from '@/components/widgets/CustomApiWidget';
import { WatchlistWidget } from '@/components/widgets/WatchlistWidget';
import { DataTableWidget } from '@/components/widgets/DataTableWidget';
import type { WidgetConfig } from '@/types/widget';

function AddWidgetButton() {
  const { currentDashboardType, setAddWidgetOpen } = useDashboardStore();

  const connectionText = {
    'crypto': 'Connect to Coinbase API',
    'indian-market': 'Connect to IndianAPI',
    'active-trader': 'Connect to Finnhub API',
    'trader': 'Connect to Finnhub API',
    'starter': 'Connect to Finnhub or IndianAPI',
  }[currentDashboardType];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setAddWidgetOpen(true)}
      className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
    >
      <div className="rounded-full bg-muted p-3">
        <Plus className="h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="font-medium">Add Widget</p>
        <p className="text-xs">{connectionText}</p>
      </div>
    </motion.button>
  );
}

export function DashboardGrid() {
  const { widgets, reorderWidgets, setAddWidgetOpen, currentDashboardType } = useDashboardStore();

  // Filter widgets by current dashboard type
  const filteredWidgets = widgets.filter((w) => !w.dashboardType || w.dashboardType === currentDashboardType);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = filteredWidgets.findIndex((w) => w.id === active.id);
      const newIndex = filteredWidgets.findIndex((w) => w.id === over.id);
      const newOrder = arrayMove(filteredWidgets, oldIndex, newIndex);
      reorderWidgets(newOrder);
    }
  }, [filteredWidgets, reorderWidgets]);

  const renderWidget = (widget: WidgetConfig) => {
    // Handle watchlist widgets
    if (widget.type === 'watchlist' || (widget.cardLayout === 'list' && widget.symbols && widget.symbols.length > 1)) {
      return (
        <div key={widget.id} className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <WatchlistWidget widget={{ ...widget, type: 'watchlist' }} />
        </div>
      );
    }

    // Handle table widgets
    if (widget.type === 'table' || widget.displayMode === 'table') {
      return (
        <div key={widget.id} className="col-span-1 sm:col-span-2 lg:col-span-3 xl:col-span-4">
          <DataTableWidget widget={{ ...widget, type: 'table' }} />
        </div>
      );
    }

    // Market movers special case
    if (widget.cardLayout === 'movers' || widget.apiUrl?.includes('TOP_GAINERS_LOSERS') || widget.name?.includes('Market Movers') || widget.name?.includes('NSE Stocks')) {
      return (
        <div key={widget.id} className="col-span-1 sm:col-span-2 lg:col-span-2 xl:col-span-2">
          <MarketMoversWidget widget={widget} />
        </div>
      );
    }

    // Chart widgets
    if (widget.type === 'chart' && widget.symbol) {
      return <StockChartWidget key={widget.id} widget={{ ...widget, type: 'chart' }} />;
    }

    // Card widgets
    if (widget.type === 'card' && widget.symbol) {
      return <StockQuoteWidget key={widget.id} widget={{ ...widget, type: 'card' }} />;
    }

    // Custom API widget fallback
    return <CustomApiWidget key={widget.id} widget={widget} />;
  };

  if (filteredWidgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20"
      >
        <div className="mb-6 rounded-2xl bg-primary/10 p-6">
          <LayoutGrid className="h-12 w-12 text-primary" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-foreground">Build Your Finance Dashboard</h2>
        <p className="mb-6 max-w-md text-center text-muted-foreground">
          Create custom widgets by connecting to Finnhub or IndianAPI. Track US & Indian stocks, monitor market movers,
          and visualize price trends in real-time with WebSocket updates.
        </p>
        <Button size="lg" onClick={() => setAddWidgetOpen(true)} className="gap-2 shadow-glow">
          <Plus className="h-5 w-5" />
          Add Your First Widget
        </Button>
      </motion.div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={filteredWidgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <motion.div
          className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <AnimatePresence>
            {filteredWidgets.map((widget) => renderWidget(widget))}
          </AnimatePresence>

          {/* Add Widget Card */}
          <AddWidgetButton />
        </motion.div>
      </SortableContext>
    </DndContext>
  );
}
