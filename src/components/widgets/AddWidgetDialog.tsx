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
  Search,
  Zap,
  Plus,
  X,
} from 'lucide-react';
import { useDashboardStore } from '@/store/dashboardStore';
import { testApiEndpoint } from '@/lib/api';
import { convertCurrencySync } from '@/lib/currency';
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
  const [cardLayout, setCardLayout] = useState<'single' | 'list' | 'movers'>('single');

  // API testing state
  const [apiTestResult, setApiTestResult] = useState<{
    success: boolean;
    fields?: WidgetField[];
    arrayFields?: WidgetField[];
    error?: string;
  } | null>(null);
  const [selectedFields, setSelectedFields] = useState<WidgetField[]>([]);
  const [fieldSearch, setFieldSearch] = useState('');
  const [selectedArrayPath, setSelectedArrayPath] = useState('');

  // Derived state
  const isMovers = widgetType === 'card' && cardLayout === 'movers';

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
  }, [currentDashboardType, isAddWidgetOpen]);

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
    if (sym && !symbols.includes(sym)) {
      setSymbols((prev) => [...prev, sym]);
    }
  }, [symbol, symbols]);

  const handleRemoveSymbol = useCallback((sym: string) => {
    setSymbols((prev) => prev.filter((s) => s !== sym));
  }, []);

  const handleAddWidget = useCallback(() => {
    const isWatchlist = widgetType === 'card' && cardLayout === 'list';
    const resolvedType: WidgetType = isWatchlist ? 'watchlist' : widgetType;

    const primarySymbol = isMovers ? undefined : (widgetType === 'card' && cardLayout === 'single' ? symbol : (symbols[0] || symbol));
    const finalSymbols = isMovers ? undefined : ((resolvedType === 'watchlist' || resolvedType === 'table') ? symbols : [primarySymbol]);

    const defaultName = name || (
      isMovers ? 'Market Movers' :
        resolvedType === 'watchlist' ? 'Watchlist' :
          resolvedType === 'card' ? 'Finance Card' :
            resolvedType === 'chart' ? 'Chart Widget' :
              'Table Widget'
    );

    const defaultApi = apiUrl || (
      isMovers ? (
        currentDashboardType === 'crypto' ? 'crypto-movers' :
          currentDashboardType === 'indian-market' ? 'https://api.indianapi.in/trending' :
            'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=demo'
      ) :
        resolvedType === 'table'
          ? `${ALPHA_VANTAGE_BASE_URL}?function=TIME_SERIES_DAILY&symbol=${primarySymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
          : `${ALPHA_VANTAGE_BASE_URL}?function=${resolvedType === 'chart' ? 'TIME_SERIES_DAILY' : 'GLOBAL_QUOTE'}&symbol=${primarySymbol}&apikey=${ALPHA_VANTAGE_API_KEY}`
    );

    const widget: WidgetConfig = {
      id: `temp-${Date.now()}`,
      name: defaultName,
      type: resolvedType,
      apiUrl: resolvedType === 'table' ? '' : defaultApi,
      refreshInterval,
      selectedFields: selectedFields.length > 0 ? selectedFields : [],
      chartType: resolvedType === 'chart' ? chartType : undefined,
      timeInterval: resolvedType === 'chart' ? timeInterval : undefined,
      symbol: (resolvedType === 'card' || resolvedType === 'chart') ? primarySymbol : undefined,
      symbols: (resolvedType === 'watchlist' || resolvedType === 'table') ? (finalSymbols as string[]) : undefined,
      currency,
      cardLayout: resolvedType === 'card' ? cardLayout : undefined,
      arrayPath: selectedArrayPath || undefined,
      apiProvider: resolvedType === 'table'
        ? (currentDashboardType === 'crypto' ? 'crypto' : currentDashboardType === 'indian-market' ? 'indianapi' : 'finnhub')
        : (apiUrl.includes('indianapi') || (isMovers && currentDashboardType === 'indian-market')) ? 'indianapi' : currentDashboardType === 'crypto' ? 'crypto' : 'custom',
      position: { x: 0, y: 0, w: (resolvedType === 'table' ? 2 : 1), h: (resolvedType === 'chart' ? 2 : 1) },
      createdAt: Date.now(),
      displayMode: resolvedType === 'table' ? 'table' : 'card',
      enableWebSocket: resolvedType === 'card' && currentDashboardType !== 'crypto' && !isMovers,
    };

    addWidget(widget);
    handleClose();

    toast({
      title: 'Widget Added',
      description: `${widget.name} has been added to your dashboard.`,
    });
  }, [name, widgetType, cardLayout, symbols, symbol, apiUrl, refreshInterval, selectedFields, chartType, timeInterval, currency, selectedArrayPath, currentDashboardType, addWidget, handleClose, toast, isMovers]);

  const filteredFields = apiTestResult?.fields?.filter((field) => {
    return field.path.toLowerCase().includes(fieldSearch.toLowerCase()) ||
      field.label.toLowerCase().includes(fieldSearch.toLowerCase());
  });

  return (
    <Dialog open={isAddWidgetOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Add Widget
          </DialogTitle>
          <DialogDescription>
            Choose from three widget types to add to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden relative mt-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <WidgetTypeCard
                      icon={<CreditCard className="h-8 w-8" />}
                      title="Finance Cards"
                      description="Quotes and Movers"
                      active={widgetType === 'card'}
                      onClick={() => {
                        setWidgetType('card');
                        setStep('config');
                      }}
                    />
                    {currentDashboardType !== 'crypto' && (
                      <WidgetTypeCard
                        icon={<LineChart className="h-8 w-8" />}
                        title="Charts"
                        description="Price patterns"
                        active={widgetType === 'chart'}
                        onClick={() => {
                          setWidgetType('chart');
                          setStep('config');
                        }}
                      />
                    )}
                    <WidgetTypeCard
                      icon={<Table2 className="h-8 w-8" />}
                      title="Table"
                      description="Tabular data"
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
                className="space-y-4 flex flex-col h-full"
              >
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Widget Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., My Portfolio"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    {widgetType === 'card' && (
                      <>
                        <div className="grid gap-2">
                          <Label>Card Layout</Label>
                          <Tabs value={cardLayout} onValueChange={(v) => setCardLayout(v as 'single' | 'list' | 'movers')}>
                            <TabsList className="grid w-full grid-cols-3">
                              <TabsTrigger value="single">Single</TabsTrigger>
                              <TabsTrigger value="list">Watchlist</TabsTrigger>
                              <TabsTrigger value="movers">Movers</TabsTrigger>
                            </TabsList>
                          </Tabs>
                        </div>

                        {!isMovers && (
                          cardLayout === 'list' ? (
                            <div className="grid gap-2">
                              <Label>Watchlist Symbols</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="e.g. BTC, ETH"
                                  value={symbol}
                                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                  onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                                  className="flex-1"
                                />
                                <Button variant="outline" size="icon" onClick={handleAddSymbol}>
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {symbols.map((sym) => (
                                  <Badge key={sym} variant="secondary" className="flex items-center gap-1">
                                    {sym}
                                    <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSymbol(sym)} />
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              <Label>Stock Symbol</Label>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="e.g. AAPL"
                                  value={symbol}
                                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                  className="flex-1"
                                />
                                <Select value={symbol} onValueChange={setSymbol}>
                                  <SelectTrigger className="w-[120px]">
                                    <SelectValue placeholder="Popular" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).map((s) => (
                                      <SelectItem key={s.symbol} value={s.symbol}>{s.symbol}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          )
                        )}
                      </>
                    )}

                    {widgetType === 'chart' && (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Source Symbol</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g. TSLA"
                              value={symbol}
                              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                              className="flex-1"
                            />
                            <Select value={symbol} onValueChange={setSymbol}>
                              <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Popular" />
                              </SelectTrigger>
                              <SelectContent>
                                {(currentDashboardType === 'crypto' ? POPULAR_CRYPTO : currentDashboardType === 'indian-market' ? INDIAN_SYMBOLS : POPULAR_SYMBOLS).map((s) => (
                                  <SelectItem key={s.symbol} value={s.symbol}>{s.symbol}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label>Chart View</Label>
                            <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="line">Line</SelectItem>
                                <SelectItem value="candlestick">Candlestick</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label>Interval</Label>
                            <Select value={timeInterval} onValueChange={(v) => setTimeInterval(v as TimeInterval)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}

                    {widgetType === 'table' && (
                      <div className="grid gap-2">
                        <Label>Table Symbols</Label>
                        <Input
                          placeholder="e.g. RELIANCE, TCS"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {symbols.map((sym) => (
                            <Badge key={sym} variant="secondary" className="flex items-center gap-1">
                              {sym}
                              <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveSymbol(sym)} />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid gap-2">
                      <Label>Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Refresh (seconds)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={refreshInterval}
                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('type')}>Back</Button>
                  <Button onClick={handleAddWidget}>Add Widget</Button>
                </div>
              </motion.div>
            )}

            {step === 'fields' && (
              <motion.div
                key="fields"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4 flex flex-col h-full"
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search fields..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="flex-1 rounded-lg border">
                  <div className="p-2 space-y-1">
                    {filteredFields?.map((field) => (
                      <div
                        key={field.path}
                        className={`flex items-center gap-3 rounded-lg p-2 cursor-pointer transition-colors ${selectedFields.some(f => f.path === field.path) ? 'bg-primary/10' : 'hover:bg-muted'}`}
                        onClick={() => handleToggleField(field)}
                      >
                        <Checkbox checked={selectedFields.some(f => f.path === field.path)} />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{field.label || field.path}</p>
                          <p className="text-xs text-muted-foreground truncate">{String(field.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep('config')}>Back</Button>
                  <Button onClick={handleAddWidget}>Finish ({selectedFields.length})</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WidgetTypeCard({ icon, title, description, active, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all ${active
        ? 'border-primary bg-primary/10 shadow-glow'
        : 'border-border bg-card hover:border-primary hover:bg-primary/5'
        }`}
    >
      <div className={`rounded-lg p-3 ${active ? 'text-primary' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
