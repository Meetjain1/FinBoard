/**
 * Edit Widget Dialog Component
 * Modal for editing existing widget configuration
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings } from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { POPULAR_SYMBOLS, INDIAN_SYMBOLS, POPULAR_CRYPTO, CURRENCIES } from '@/lib/constants';
import type { ChartType, TimeInterval } from '@/types/widget';
import { useToast } from '@/hooks/use-toast';

export function EditWidgetDialog() {
  const { editingWidget, setEditingWidget, updateWidget, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('daily');
  const [currency, setCurrency] = useState('USD');
  const [cardLayout, setCardLayout] = useState<'single' | 'list'>('single');

  useEffect(() => {
    if (editingWidget) {
      setName(editingWidget.name);
      setSymbol(editingWidget.symbol || '');
      setRefreshInterval(editingWidget.refreshInterval);
      setChartType(editingWidget.chartType || 'line');
      setTimeInterval(editingWidget.timeInterval || 'daily');
      setCurrency(editingWidget.currency || 'USD');
      setCardLayout(editingWidget.cardLayout || 'single');
    }
  }, [editingWidget]);

  const handleSave = useCallback(() => {
    if (!editingWidget) return;

    updateWidget(editingWidget.id, {
      name: name || editingWidget.name,
      symbol: symbol || editingWidget.symbol,
      refreshInterval,
      chartType: editingWidget.type === 'chart' ? chartType : undefined,
      timeInterval: editingWidget.type === 'chart' ? timeInterval : undefined,
      currency: editingWidget.type === 'card' ? currency : undefined,
      cardLayout: editingWidget.type === 'card' ? cardLayout : undefined,
    });

    setEditingWidget(null);
    toast({
      title: 'Widget Updated',
      description: 'Your widget configuration has been saved.',
    });
  }, [editingWidget, name, symbol, refreshInterval, chartType, timeInterval, currency, cardLayout, updateWidget, setEditingWidget, toast]);

  return (
    <Dialog open={!!editingWidget} onOpenChange={(open) => !open && setEditingWidget(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Widget
          </DialogTitle>
          <DialogDescription>
            Adjust your widget configuration below.
          </DialogDescription>
        </DialogHeader>

        {editingWidget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Widget Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {editingWidget.type === 'card' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-symbol">Stock Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="edit-symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).map((s) => (
                        <SelectItem key={s.symbol} value={s.symbol}>
                          {s.symbol} - {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="edit-currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger id="edit-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editingWidget.type === 'chart' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-chart-symbol">Stock Symbol</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="edit-chart-symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).map((s) => (
                        <SelectItem key={s.symbol} value={s.symbol}>
                          {s.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-chart-type">Chart Type</Label>
                    <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                      <SelectTrigger id="edit-chart-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="candlestick">Candlestick</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="edit-interval">Time Interval</Label>
                    <Select value={timeInterval} onValueChange={(v) => setTimeInterval(v as TimeInterval)}>
                      <SelectTrigger id="edit-interval">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-refresh">Refresh Interval (seconds)</Label>
              <Input
                id="edit-refresh"
                type="number"
                min={0}
                max={3600}
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setEditingWidget(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  );
}
