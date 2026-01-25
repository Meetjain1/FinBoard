/**
 * Add Widget Dialog - Simplified to 3 main widget types
 * Finance Cards | Charts | Table
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
  Search,
  Zap,
  Plus,
  X,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { testApiEndpoint } from '@/lib/api';
import { POPULAR_SYMBOLS, INDIAN_SYMBOLS, POPULAR_CRYPTO, ALPHA_VANTAGE_BASE_URL, ALPHA_VANTAGE_API_KEY, CURRENCIES } from '@/lib/constants';
import type { WidgetConfig, WidgetType, WidgetField, ChartType, TimeInterval } from '@/types/widget';
import { useToast } from '@/hooks/use-toast';

export function AddWidgetDialog() {
  const { isAddWidgetOpen, setAddWidgetOpen, addWidget, currentDashboardType } = useDashboardStore();
  const { toast } = useToast();

  // Form state
  const [step, setStep] = useState<'type' | 'config' | 'fields'>('type');
  const [widgetType, setWidgetType] = useState<WidgetType>('card');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('AAPL');
  const [symbols, setSymbols] = useState<string[]>(['AAPL']);
  const [apiUrl, setApiUrl] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeInterval, setTimeInterval] = useState<TimeInterval>('daily');
  const [currency, setCurrency] = useState('USD');
  const [cardLayout, setCardLayout] = useState<'single' | 'list'>('single');

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
  const [selectedArrayPath, setSelectedArrayPath] = useState('');

  useEffect(() => {
    if (currentDashboardType === 'crypto') {
      setSymbol('BTC');
      setSymbols(['BTC', 'ETH', 'SOL']);
      setCardLayout('list');
    } else if (currentDashboardType === 'indian-market') {
      setSymbol('RELIANCE');
      setSymbols(['RELIANCE', 'TCS', 'INFY']);
      setCardLayout('single');
    } else {
      setSymbol('AAPL');
      setSymbols(['AAPL']);
      setCardLayout('single');
    }
  }, [currentDashboardType]);

  const resetForm = useCallback(() => {
    setStep('type');
    setWidgetType('card');
    setName('');
    const defaultSymbol = currentDashboardType === 'crypto' ? 'BTC' : currentDashboardType === 'indian-market' ? 'RELIANCE' : 'AAPL';
    const defaultSymbols = currentDashboardType === 'crypto' ? ['BTC', 'ETH', 'SOL'] : currentDashboardType === 'indian-market' ? ['RELIANCE', 'TCS', 'INFY'] : ['AAPL'];
    setSymbol(defaultSymbol);
    setSymbols(defaultSymbols);
    setApiUrl('');
    setRefreshInterval(60);
    setChartType('line');
    setTimeInterval('daily');
    setCurrency('USD');
    setCardLayout(currentDashboardType === 'crypto' ? 'list' : 'single');
    setApiTestResult(null);
    setSelectedFields([]);
    setFieldSearch('');
    setSelectedArrayPath('');
  }, [currentDashboardType]);

  const handleClose = useCallback(() => {
    setAddWidgetOpen(false);
    setTimeout(resetForm, 300);
  }, [setAddWidgetOpen, resetForm]);

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

  const handleAddSymbol = useCallback(() => {
    const sym = symbol.toUpperCase().trim();
    if (sym && !symbols.includes(sym) && widgetType === 'card') {
      setSymbols((prev) => [...prev, sym]);
    }
  }, [symbol, symbols, widgetType]);

  const handleRemoveSymbol = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  const handleAddWidget = useCallback(() => {
    const isWatchlist = widgetType === 'card' && cardLayout === 'list';
    const resolvedType: WidgetType = isWatchlist ? 'watchlist' : widgetType;

    // Fix: If single card, use 'symbol'. If watchlist/table, use 'symbols'.
    const primarySymbol = widgetType === 'card' && cardLayout === 'single' ? symbol : (symbols[0] || symbol);
    const finalSymbols = (resolvedType === 'watchlist' || resolvedType === 'table') ? symbols : [primarySymbol];

    const defaultName = name || (resolvedType === 'watchlist' ? 'Watchlist' : resolvedType === 'card' ? 'Finance Card' : resolvedType === 'chart' ? 'Chart Widget' : 'Table Widget');

    const defaultApi = apiUrl || (resolvedType === 'table'
      ? `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${primarySymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
      : `${ALPHA_VANTAGE_BASE_URL}?function=${resolvedType === 'chart' ? 'TIME_SERIES_DAILY' : 'GLOBAL_QUOTE'}&symbol=${primarySymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`);

    const widget: WidgetConfig = {
      id: `temp-${Date.now()}`, // Temporary ID, store will replace it
      name: defaultName,
      type: resolvedType,
      apiUrl: resolvedType === 'table' ? '' : defaultApi,
      refreshInterval,
      selectedFields: selectedFields.length > 0 ? selectedFields : [],
      chartType: resolvedType === 'chart' ? chartType : undefined,
      timeInterval: resolvedType === 'chart' ? timeInterval : undefined,
      symbol: (resolvedType === 'card' || resolvedType === 'chart') ? primarySymbol : undefined,
      symbols: (resolvedType === 'watchlist' || resolvedType === 'table') ? finalSymbols : undefined,
      currency,
      cardLayout: resolvedType === 'card' ? cardLayout : undefined,
      arrayPath: selectedArrayPath || undefined,
      apiProvider: resolvedType === 'table'
        ? (currentDashboardType === 'crypto' ? 'crypto' : currentDashboardType === 'indian-market' ? 'indianapi' : 'finnhub')
        : apiUrl.includes('indianapi') ? 'indianapi' : currentDashboardType === 'crypto' ? 'crypto' : 'custom',
      position: { x: 0, y: 0, w: resolvedType === 'table' ? 2 : 1, h: resolvedType === 'chart' ? 2 : 1 },
      createdAt: Date.now(),
      displayMode: resolvedType === 'table' ? 'table' : 'card',
      enableWebSocket: resolvedType === 'card' && currentDashboardType !== 'crypto',
    };

    addWidget(widget);
    handleClose();

    toast({
      title: 'Widget Added',
      description: `${widget.name} has been added to your dashboard.`,
    });
  }, [name, widgetType, cardLayout, symbols, symbol, apiUrl, refreshInterval, selectedFields, chartType, timeInterval, currency, selectedArrayPath, currentDashboardType, addWidget, handleClose, toast]);

  const filteredFields = apiTestResult?.fields?.filter((field) => {
    const matchesSearch = field.path.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.label.toLowerCase().includes(fieldSearch.toLowerCase());
    return matchesSearch;
  });

  return (
    <Dialog open={isAddWidgetOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Add Widget
          </DialogTitle>
          <DialogDescription>
            Choose from three widget types to add to your dashboard.
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
              <div>
                <Label className="text-base">Choose Widget Type</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Select one of the three main widget options
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <WidgetTypeCard
                    icon={<CreditCard className="h-6 w-6 sm:h-8 sm:w-8" />}
                    title="Finance Cards"
                    description="Display stock quotes and financial data"
                    active={widgetType === 'card'}
                    onClick={() => {
                      setWidgetType('card');
                      setStep('config');
                    }}
                  />
                  {currentDashboardType !== 'crypto' && (
                    <WidgetTypeCard
                      icon={<LineChart className="h-6 w-6 sm:h-8 sm:w-8" />}
                      title="Charts"
                      description="Show price trends and patterns"
                      active={widgetType === 'chart'}
                      onClick={() => {
                        setWidgetType('chart');
                        setStep('config');
                      }}
                    />
                  )}
                  <WidgetTypeCard
                    icon={<Table2 className="h-6 w-6 sm:h-8 sm:w-8" />}
                    title="Table"
                    description="Display data in tabular format"
                    active={widgetType === 'table'}
                    onClick={() => {
                      setWidgetType('table');
                      setStep('config');
                    }}
                  />
                </div>
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
                <div className="grid gap-4 pr-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Widget Name</Label>
                    <Input
                      id="name"
                      placeholder={`e.g., ${widgetType === 'card' ? 'Apple Stock Price' : widgetType === 'chart' ? 'AAPL Price Trend' : 'Market Data'}`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  {widgetType === 'card' && (
                    <>
                      <div className="grid gap-2">
                        <Label>Card Layout</Label>
                        <Tabs value={cardLayout} onValueChange={(v) => setCardLayout(v as 'single' | 'list')}>
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Single Card</TabsTrigger>
                            <TabsTrigger value="list">Watchlist</TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </div>

                      {cardLayout === 'list' ? (
                        <div className="grid gap-2">
                          <Label>Stock Symbols</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder={currentDashboardType === 'crypto' ? 'e.g., BTC, ETH' : currentDashboardType === 'indian-market' ? 'e.g., RELIANCE, TCS' : 'e.g., AAPL, GOOGL'}
                              value={symbol}
                              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                              className="flex-1"
                            />
                            <Button variant="outline" onClick={handleAddSymbol}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="space-y-1 mt-2">
                            <Label className="text-xs text-muted-foreground">Popular</Label>
                            <div className="flex flex-wrap gap-1">
                              {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).slice(0, 8).map((s) => (
                                <button
                                  key={s.symbol}
                                  onClick={() => {
                                    if (!symbols.includes(s.symbol)) {
                                      setSymbols((prev) => [...prev, s.symbol]);
                                    }
                                  }}
                                  disabled={symbols.includes(s.symbol)}
                                  className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                                >
                                  + {s.symbol}
                                </button>
                              ))}
                            </div>
                          </div>
                          {symbols.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {symbols.map((sym) => (
                                <Badge
                                  key={sym}
                                  variant="secondary"
                                  className="cursor-pointer"
                                  onClick={() => handleRemoveSymbol(sym)}
                                >
                                  {sym}
                                  <X className="ml-1 h-3 w-3" />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-2">
                          <Label>Stock Symbol</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder={currentDashboardType === 'crypto' ? 'e.g., BTC' : currentDashboardType === 'indian-market' ? 'e.g., RELIANCE' : 'e.g., AAPL'}
                              value={symbol}
                              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                              className="flex-1"
                            />
                            <Select value={symbol} onValueChange={setSymbol}>
                              <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Choose Stock" />
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
                        </div>
                      )}

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

                  {widgetType === 'chart' && (
                    <>
                      <div className="grid gap-2">
                        <Label>Stock Symbol</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={currentDashboardType === 'crypto' ? 'e.g., BTC' : 'e.g., AAPL'}
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            className="flex-1"
                          />
                          <Select value={symbol} onValueChange={setSymbol}>
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Popular" />
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
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Chart Type</Label>
                          <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="line">Line Chart</SelectItem>
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
                    </>
                  )}

                  {widgetType === 'table' && (
                    <>
                      <div className="grid gap-2">
                        <Label>Stock Symbols</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder={currentDashboardType === 'crypto' ? 'e.g., BTC, ETH' : currentDashboardType === 'indian-market' ? 'e.g., RELIANCE, TCS' : 'e.g., AAPL, GOOGL'}
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && setSymbols((prev) => prev.includes(symbol) ? prev : [...prev, symbol])}
                            className="flex-1"
                          />
                          <Button variant="outline" onClick={() => setSymbols((prev) => prev.includes(symbol) ? prev : [...prev, symbol])}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).slice(0, 8).map((s) => (
                            <button
                              key={s.symbol}
                              onClick={() => {
                                if (!symbols.includes(s.symbol)) {
                                  setSymbols((prev) => [...prev, s.symbol]);
                                }
                              }}
                              disabled={symbols.includes(s.symbol)}
                              className="rounded-md bg-muted px-2 py-1 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors disabled:opacity-50"
                            >
                              + {s.symbol}
                            </button>
                          ))}
                        </div>
                        {symbols.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {symbols.map((sym) => (
                              <Badge
                                key={sym}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => setSymbols((prev) => prev.filter((s) => s !== sym))}
                              >
                                {sym}
                                <XCircle className="ml-1 h-3 w-3" />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Leave API URL empty to auto-fetch quotes for selected symbols.</p>
                    </>
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
                      Set to 0 to disable auto-refresh. Note: APIs have rate limits.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('type')}>
                  Back
                </Button>
                <Button
                  onClick={widgetType === 'table' && apiTestResult?.success ? () => setStep('fields') : handleAddWidget}
                  disabled={!name && widgetType !== 'card'}
                >
                  {widgetType === 'table' && apiTestResult?.success ? 'Select Fields' : 'Add Widget'}
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
                <Label>Select Fields to Display (Paginated table shows 6-10 rows)</Label>
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
                      return (
                        <div
                          key={field.path}
                          className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'
                            }`}
                          onClick={() => handleToggleField(field)}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{field.path}</p>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {field.type} {field.value !== undefined && `• ${String(field.value).slice(0, 50)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep('config')}>
                  Back
                </Button>
                <Button onClick={handleAddWidget}>
                  Add Widget ({selectedFields.length} fields)
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function WidgetTypeCard({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-colors ${active
        ? 'border-primary bg-primary/10'
        : 'border-border bg-card hover:border-primary hover:bg-primary/5'
        }`}
    >
      <div className={`rounded-lg p-3 ${active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </motion.button>
  );
}

function XCircle({ className }: { className: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
