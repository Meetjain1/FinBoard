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
import { POPULAR_SYMBOLS, POPULAR_CRYPTO, CURRENCIES, INDIAN_SYMBOLS } from '@/lib/constants';
import type { ChartType, TimeInterval } from '@/types/widget';
import { useToast } from '@/hooks/use-toast';

export function EditWidgetDialog() {
  const { editingWidget, setEditingWidget, updateWidget, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  const getPopularSymbols = () => {
    return currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS;
  };

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('daily');
  const [isCrypto, setIsCrypto] = useState(false);
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [targetCurrencies, setTargetCurrencies] = useState<string[]>(['USD', 'INR']);

  useEffect(() => {
    if (editingWidget) {
      const cryptoMode = !!editingWidget.cryptoSymbol || (editingWidget.apiUrl || '').includes('coinbase.com/v2/exchange-rates');
      setIsCrypto(cryptoMode);
      setName(editingWidget.name);
      setSymbol(editingWidget.symbol || '');
      setRefreshInterval(editingWidget.refreshInterval);
      setChartType(editingWidget.chartType || 'area');
      setTimeInterval(editingWidget.timeInterval || 'daily');
      setCryptoSymbol(editingWidget.cryptoSymbol || 'BTC');
      setTargetCurrencies(editingWidget.targetCurrencies || ['USD', 'INR']);
    }
  }, [editingWidget]);

  const handleClose = useCallback(() => {
    setEditingWidget(null);
  }, [setEditingWidget]);

  const handleSave = useCallback(() => {
    if (!editingWidget) return;

    const activeTargets = targetCurrencies.length > 0 ? targetCurrencies : ['USD', 'INR'];
    const updates = {
      name,
      refreshInterval,
      chartType: editingWidget.type === 'chart' ? chartType : undefined,
      timeInterval: editingWidget.type === 'chart' ? timeInterval : undefined,
      symbol: !isCrypto ? (symbol || undefined) : undefined,
      cryptoSymbol: isCrypto ? cryptoSymbol : undefined,
      targetCurrencies: isCrypto ? activeTargets : undefined,
      apiUrl: isCrypto ? `https://api.coinbase.com/v2/exchange-rates?currency=${cryptoSymbol}` : editingWidget.apiUrl,
      apiProvider: isCrypto ? 'custom' : editingWidget.apiProvider,
      selectedFields: isCrypto
        ? [
            { path: 'data.currency', label: 'Currency', type: 'string' as const },
            ...activeTargets.map((code) => ({ path: `data.rates.${code}`, label: `${code} Rate`, type: 'string' as const })),
          ]
        : editingWidget.selectedFields,
    };

    updateWidget(editingWidget.id, updates);

    toast({
      title: 'Widget Updated',
      description: 'Your changes have been saved.',
    });

    handleClose();
  }, [editingWidget, name, symbol, refreshInterval, chartType, timeInterval, cryptoSymbol, targetCurrencies, isCrypto, updateWidget, handleClose, toast]);

  if (!editingWidget) return null;

  return (
    <Dialog open={!!editingWidget} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Edit Widget
          </DialogTitle>
          <DialogDescription>
            Update the configuration for this widget.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
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

          {(editingWidget.type === 'card' || editingWidget.type === 'chart') && !isCrypto && (
            <div className="grid gap-2">
              <Label>Stock Symbol</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., AAPL"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Select value={symbol} onValueChange={setSymbol}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {getPopularSymbols().map((s) => (
                      <SelectItem key={s.symbol} value={s.symbol}>
                        {s.symbol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {isCrypto && (
            <div className="space-y-3">
              <div className="grid gap-2">
                <Label>Cryptocurrency</Label>
                <Select value={cryptoSymbol} onValueChange={setCryptoSymbol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {POPULAR_CRYPTO.map((asset) => (
                      <SelectItem key={asset.symbol} value={asset.symbol}>
                        {asset.symbol} - {asset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Display rates for</Label>
                <div className="flex flex-wrap gap-2">
                  {CURRENCIES.filter((c) => ['USD', 'INR', 'EUR'].includes(c.code)).map((c) => {
                    const active = targetCurrencies.includes(c.code);
                    return (
                      <Button
                        key={c.code}
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          setTargetCurrencies((prev) =>
                            prev.includes(c.code)
                              ? prev.filter((code) => code !== c.code)
                              : [...prev, c.code]
                          )
                        }
                      >
                        {c.symbol} {c.code}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {editingWidget.type === 'chart' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Chart Type</Label>
                <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="candlestick">Candlestick</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Time Interval</Label>
                <Select value={timeInterval} onValueChange={(v) => setTimeInterval(v as TimeInterval)}>
                  <SelectTrigger>
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
            <p className="text-xs text-muted-foreground">
              Set to 0 to disable auto-refresh.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
