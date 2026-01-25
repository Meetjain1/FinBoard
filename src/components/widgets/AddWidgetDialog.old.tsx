/**
 * Add Widget Dialog Component
 * Modal for creating new widgets with API configuration
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  LineChart,
  Table2,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  Zap,
  Star,
  Plus,
  Bitcoin,
  TrendingUp,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { testApiEndpoint } from '@/lib/api';
import { POPULAR_SYMBOLS, POPULAR_CRYPTO, INDIAN_SYMBOLS, ALPHA_VANTAGE_BASE_URL, ALPHA_VANTAGE_API_KEY, CURRENCIES } from '@/lib/constants';
import type { WidgetConfig, WidgetType, WidgetField, ChartType, TimeInterval, DisplayMode } from '@/types/widget';
import { useToast } from '@/hooks/use-toast';

export function AddWidgetDialog() {
  const { isAddWidgetOpen, setAddWidgetOpen, addWidget, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  // Form state
  const [step, setStep] = useState<'type' | 'config' | 'fields'>('type');
  const [widgetType, setWidgetType] = useState<WidgetType>('card');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('daily');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('card');
  const [currency, setCurrency] = useState('USD');
  const [isCrypto, setIsCrypto] = useState(false);
  const [cryptoSymbol, setCryptoSymbol] = useState('BTC');
  const [targetCurrencies, setTargetCurrencies] = useState<string[]>(['USD', 'INR']);
  const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
  const [newWatchlistSymbol, setNewWatchlistSymbol] = useState('');

  // API testing state
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    fields?: WidgetField[];
    arrayFields?: WidgetField[];
    error?: string;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<WidgetField[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showArraysOnly, setShowArraysOnly] = useState(false);
  const [selectedArrayPath, setSelectedArrayPath] = useState('');

  const resetForm = useCallback(() => {
    setStep('type');
    setWidgetType('card');
    setName('');
    setSymbol('');
    setApiUrl('');
    setRefreshInterval(60);
    setChartType('area');
    setTimeInterval('daily');
    setDisplayMode('card');
    setCurrency('USD');
    setIsCrypto(false);
    setCryptoSymbol('BTC');
    setTargetCurrencies(['USD', 'INR']);
    setApiTestResult(null);
    setSelectedFields([]);
    setFieldSearch('');
    setShowArraysOnly(false);
    setSelectedArrayPath('');
    setWatchlistSymbols([]);
    setNewWatchlistSymbol('');
  }, []);

  const handleClose = useCallback(() => {
    setAddWidgetOpen(false);
    setTimeout(resetForm, 300);
  }, [setAddWidgetOpen, resetForm]);

  // Determine which presets to show based on dashboard type
  const getVisiblePresets = (): Array<'quote' | 'chart' | 'gainers' | 'watchlist' | 'crypto' | 'indian'> => {
    switch (currentDashboardType) {
      case 'crypto':
        return ['crypto'];
      case 'indian-market':
        return ['quote', 'chart', 'watchlist', 'indian'];
      case 'active-trader':
      case 'trader':
        return ['quote', 'chart', 'gainers', 'watchlist'];
      default: // starter
        return ['quote', 'chart', 'gainers', 'crypto', 'watchlist', 'indian'];
    }
  };

  // Determine which symbols to show based on dashboard type
  const getPopularSymbols = () => {
    return currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS;
  };

  const handleSelectPreset = useCallback((preset: 'quote' | 'chart' | 'gainers' | 'watchlist' | 'crypto' | 'indian') => {
    if (preset === 'quote') {
      setIsCrypto(false);
      setWidgetType('card');
      setName(`Stock Quote - ${symbol || 'AAPL'}`);
      setStep('config');
    } else if (preset === 'chart') {
      setIsCrypto(false);
      setWidgetType('chart');
      setName(`Price Chart - ${symbol || 'AAPL'}`);
      setStep('config');
    } else if (preset === 'gainers') {
      setIsCrypto(false);
      setWidgetType('table');
      setName('Market Movers');
      setApiUrl(`${ALPHA_VANTAGE_BASE_URL}?function=TOP_GAINERS_LOSERS&apikey=${ALPHA_VANTAGE_API_KEY}`);
      setStep('config');
    } else if (preset === 'watchlist') {
      setIsCrypto(false);
      setWidgetType('watchlist');
      setName('My Watchlist');
      setStep('config');
    } else if (preset === 'crypto') {
      setIsCrypto(true);
      setWidgetType('card');
      setCryptoSymbol('BTC');
      setTargetCurrencies(['USD', 'INR']);
      setName('Crypto Price - BTC');
      setApiUrl('https://api.coinbase.com/v2/exchange-rates?currency=BTC');
      setStep('config');
    } else if (preset === 'indian') {
      setIsCrypto(false);
      setWidgetType('card');
      setSymbol('RELIANCE');
      setName('Indian Stock - RELIANCE');
      setStep('config');
    }
  }, [symbol]);

  const handleTestApi = useCallback(async () => {
    if (!apiUrl) return;
    
    setIsTestingApi(true);
    setApiTestResult(null);
    
    const result = await testApiEndpoint(apiUrl);
    setApiTestResult(result);
    
    if (result.success && result.fields) {
      setStep('fields');
    }
    
    setIsTestingApi(false);
  }, [apiUrl]);

  const handleToggleField = useCallback((field: WidgetField) => {
    setSelectedFields((prev) => {
      const exists = prev.find((f) => f.path === field.path);
      if (exists) {
        return prev.filter((f) => f.path !== field.path);
      }
      return [...prev, field];
    });
  }, []);

  const handleAddWatchlistSymbol = useCallback(() => {
    const sym = newWatchlistSymbol.toUpperCase().trim();
    if (sym && !watchlistSymbols.includes(sym)) {
      setWatchlistSymbols((prev) => [...prev, sym]);
      setNewWatchlistSymbol('');
    }
  }, [newWatchlistSymbol, watchlistSymbols]);

  useEffect(() => {
    if (!isCrypto) return;
    const rates = targetCurrencies.length > 0 ? targetCurrencies : ['USD', 'INR'];
    const fields: WidgetField[] = [
      { path: 'data.currency', label: 'Currency', type: 'string' },
      ...rates.map((code) => ({ path: `data.rates.${code}`, label: `${code} Rate`, type: 'string' as const })),
    ];
    setSelectedFields(fields);
    setApiUrl(`https://api.coinbase.com/v2/exchange-rates?currency=${cryptoSymbol}`);
    if (!name) {
      setName(`Crypto Price - ${cryptoSymbol}`);
    }
  }, [isCrypto, cryptoSymbol, targetCurrencies, name]);

  const handleAddWidget = useCallback(() => {
    const activeTargets = targetCurrencies.length > 0 ? targetCurrencies : ['USD', 'INR'];
    const cryptoFields = isCrypto
      ? [
          { path: 'data.currency', label: 'Currency', type: 'string' as const },
          ...activeTargets.map((code) => ({ path: `data.rates.${code}`, label: `${code} Rate`, type: 'string' as const })),
        ]
      : selectedFields;

    const widget: WidgetConfig = {
      id: `widget-${Date.now()}`,
      name: name || (widgetType === 'watchlist' ? 'My Watchlist' : `${symbol || cryptoSymbol} Widget`),
      type: widgetType,
      apiUrl: widgetType === 'watchlist'
        ? ''
        : (isCrypto
          ? `https://api.coinbase.com/v2/exchange-rates?currency=${cryptoSymbol}`
          : (apiUrl || `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`)),
      refreshInterval,
      selectedFields: cryptoFields,
      chartType: widgetType === 'chart' ? chartType : undefined,
      timeInterval: widgetType === 'chart' ? timeInterval : undefined,
      symbol: !isCrypto ? symbol || undefined : undefined,
      symbols: widgetType === 'watchlist' ? watchlistSymbols : undefined,
      currency: isCrypto ? undefined : currency,
      cryptoSymbol: isCrypto ? cryptoSymbol : undefined,
      targetCurrencies: isCrypto ? activeTargets : undefined,
      apiProvider: isCrypto ? 'custom' : undefined,
      displayMode: displayMode,
      arrayPath: selectedArrayPath || undefined,
      position: { x: 0, y: 0, w: widgetType === 'table' ? 2 : 1, h: 1 },
      createdAt: Date.now(),
    };

    addWidget(widget);
    handleClose();
    
    toast({
      title: 'Widget Added',
      description: `${widget.name} has been added to your dashboard.`,
    });
  }, [isCrypto, name, widgetType, symbol, cryptoSymbol, apiUrl, refreshInterval, selectedFields, chartType, timeInterval, watchlistSymbols, currency, targetCurrencies, displayMode, selectedArrayPath, addWidget, handleClose, toast]);

  const filteredFields = apiTestResult?.fields?.filter((field) => {
    const matchesSearch = field.path.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.label.toLowerCase().includes(fieldSearch.toLowerCase());
    
    if (showArraysOnly) {
      return matchesSearch && field.type === 'array';
    }
    return matchesSearch;
  });

  return (
    <Dialog open={isAddWidgetOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Add New Widget
          </DialogTitle>
          <DialogDescription>
            Create a custom widget to display finance data on your dashboard.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Quick Presets */}
              <div>
                <Label className="text-base">Quick Start</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose a pre-configured widget type
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {getVisiblePresets().includes('quote') && (
                    <PresetCard
                      icon={<CreditCard className="h-6 w-6" />}
                      title="Stock Quote"
                      description="Real-time price"
                      onClick={() => handleSelectPreset('quote')}
                    />
                  )}
                  {getVisiblePresets().includes('chart') && (
                    <PresetCard
                      icon={<LineChart className="h-6 w-6" />}
                      title="Price Chart"
                      description="Historical trends"
                      onClick={() => handleSelectPreset('chart')}
                    />
                  )}
                  {getVisiblePresets().includes('gainers') && (
                    <PresetCard
                      icon={<Table2 className="h-6 w-6" />}
                      title="Market Movers"
                      description="Gainers & losers"
                      onClick={() => handleSelectPreset('gainers')}
                    />
                  )}
                  {getVisiblePresets().includes('crypto') && (
                    <PresetCard
                      icon={<Bitcoin className="h-6 w-6" />}
                      title="Crypto Price"
                      description="USD / INR rates"
                      onClick={() => handleSelectPreset('crypto')}
                    />
                  )}
                  {getVisiblePresets().includes('indian') && (
                    <PresetCard
                      icon={<TrendingUp className="h-6 w-6" />}
                      title="Indian Stocks"
                      description="NSE Market"
                      onClick={() => handleSelectPreset('indian')}
                    />
                  )}
                  {getVisiblePresets().includes('watchlist') && (
                    <PresetCard
                      icon={<Star className="h-6 w-6" />}
                      title="Watchlist"
                      description="Track favorites"
                      onClick={() => handleSelectPreset('watchlist')}
                    />
                  )}
                </div>
              </div>

              {/* Widget Type Selection */}
              <div>
                <Label className="text-base">Choose widget view</Label>
                <Tabs value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)} className="mt-3">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="card" className="gap-1 text-xs">
                      <CreditCard className="h-3.5 w-3.5" />
                      Card
                    </TabsTrigger>
                    <TabsTrigger value="chart" className="gap-1 text-xs">
                      <LineChart className="h-3.5 w-3.5" />
                      Chart
                    </TabsTrigger>
                    <TabsTrigger value="table" className="gap-1 text-xs">
                      <Table2 className="h-3.5 w-3.5" />
                      Table
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </motion.div>
          )}

          {step === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Widget Name</Label>
                    <Input
                      id="name"
                      placeholder={widgetType === 'watchlist' ? 'My Watchlist' : 'e.g., Apple Stock Price'}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {/* Watchlist specific config */}
                  {widgetType === 'watchlist' && (
                    <div className="grid gap-2">
                      <Label>Add Symbols to Watchlist</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g., AAPL"
                          value={newWatchlistSymbol}
                          onChange={(e) => setNewWatchlistSymbol(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddWatchlistSymbol()}
                          className="flex-1"
                        />
                        <Button variant="outline" onClick={handleAddWatchlistSymbol}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getPopularSymbols().slice(0, 5).map((s) => (
                          <button
                            key={s.symbol}
                            onClick={() => {
                              if (!watchlistSymbols.includes(s.symbol)) {
                                setWatchlistSymbols((prev) => [...prev, s.symbol]);
                              }
                            }}
                            disabled={watchlistSymbols.includes(s.symbol)}
                            className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                          >
                            + {s.symbol}
                          </button>
                        ))}
                      </div>
                      {watchlistSymbols.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {watchlistSymbols.map((sym) => (
                            <Badge
                              key={sym}
                              variant="secondary"
                              className="cursor-pointer"
                              onClick={() => setWatchlistSymbols((prev) => prev.filter((s) => s !== sym))}
                            >
                              {sym}
                              <XCircle className="ml-1 h-3 w-3" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(widgetType === 'card' || widgetType === 'chart') && !isCrypto && (
                    <>
                      <div className="grid gap-2">
                        <Label>Stock Symbol</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={currentDashboardType === 'indian-market' ? 'e.g., RELIANCE, TCS' : 'e.g., AAPL, GOOGL, MSFT'}
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Select value={symbol} onValueChange={setSymbol}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Popular" />
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

                      <div className="grid gap-2">
                        <Label>Currency Display</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.symbol} {c.code} - {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {isCrypto && (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label>Cryptocurrency</Label>
                        <Select value={cryptoSymbol} onValueChange={(value) => setCryptoSymbol(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select crypto" />
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
                              <Badge
                                key={c.code}
                                variant={active ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => {
                                  setTargetCurrencies((prev) =>
                                    prev.includes(c.code)
                                      ? prev.filter((code) => code !== c.code)
                                      : [...prev, c.code]
                                  );
                                }}
                              >
                                {c.symbol} {c.code}
                              </Badge>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">Pick at least one currency to show.</p>
                      </div>
                    </div>
                  )}

                  {widgetType === 'chart' && (
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

                  {widgetType !== 'watchlist' && (
                    <div className="grid gap-2">
                      <Label htmlFor="apiUrl">Custom API URL (Optional)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="apiUrl"
                          placeholder="https://api.example.com/data"
                          value={apiUrl}
                          onChange={(e) => setApiUrl(e.target.value)}
                          className="flex-1"
                          disabled={isCrypto}
                        />
                        <Button
                          variant="outline"
                          onClick={handleTestApi}
                          disabled={!apiUrl || isTestingApi || isCrypto}
                        >
                          {isTestingApi ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                      </div>
                      {apiTestResult && (
                        <div className={`flex items-center gap-2 text-sm ${
                          apiTestResult.success ? 'text-gain' : 'text-loss'
                        }`}>
                          {apiTestResult.success ? (
                            <>
                              <CheckCircle2 className="h-4 w-4" />
                              API connected! {apiTestResult.fields?.length} fields found.
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4" />
                              {apiTestResult.error}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {widgetType === 'table' && apiTestResult?.success && (
                    <div className="grid gap-2">
                      <Label>Display Mode</Label>
                      <Tabs value={displayMode} onValueChange={(v) => setDisplayMode(v as DisplayMode)}>
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="card">Card</TabsTrigger>
                          <TabsTrigger value="table">Table</TabsTrigger>
                          <TabsTrigger value="chart">Chart</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="refresh">Refresh Interval (seconds)</Label>
                    <Input
                      id="refresh"
                      type="number"
                      min={0}
                      max={3600}
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Set to 0 to disable auto-refresh. Note: Alpha Vantage has rate limits (5/min).
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('type')}>
                  Back
                </Button>
                <Button onClick={handleAddWidget} disabled={widgetType !== 'watchlist' && !isCrypto && !name && !symbol}>
                  Add Widget
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'fields' && (
            <motion.div
              key="fields"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <Label>Select Fields to Display</Label>
                  <div className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={showArraysOnly}
                      onCheckedChange={setShowArraysOnly}
                    />
                    <span className="text-muted-foreground">Show arrays only (for table view)</span>
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {selectedFields.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Selected Fields</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map((field) => (
                      <Badge
                        key={field.path}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => handleToggleField(field)}
                      >
                        {field.customLabel || field.label}
                        <XCircle className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Available Fields</Label>
                <ScrollArea className="h-[250px] rounded-lg border">
                  <div className="p-2 space-y-1">
                    {filteredFields?.map((field) => {
                      const isSelected = selectedFields.some((f) => f.path === field.path);
                      const isArray = field.type === 'array';
                      return (
                        <div
                          key={field.path}
                          className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                          } ${isArray ? 'border-l-2 border-primary' : ''}`}
                          onClick={() => {
                            if (isArray && displayMode === 'table') {
                              setSelectedArrayPath(field.path);
                            } else {
                              handleToggleField(field);
                            }
                          }}
                        >
                          <Checkbox checked={isSelected || (isArray && selectedArrayPath === field.path)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{field.path}</p>
                              {isArray && (
                                <Badge variant="outline" className="text-[10px] h-4">
                                  ARRAY
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {field.type} {field.value !== undefined && `• ${String(field.value).slice(0, 50)}`}
                            </p>
                          </div>
                          {isArray && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedArrayPath(field.path);
                              }}
                            >
                              Use for Table
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {selectedArrayPath && (
                <div className="p-2 rounded-lg bg-primary/10 text-sm">
                  <span className="text-muted-foreground">Array for table: </span>
                  <span className="font-mono">{selectedArrayPath}</span>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Back
                </Button>
                <Button onClick={handleAddWidget}>
                  Add Widget ({selectedFields.length} fields{selectedArrayPath && ', 1 array'})
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function PresetCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
    >
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}
