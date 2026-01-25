/**
 * Widget Types for FinBoard Dashboard
 * Defines all widget-related interfaces and types
 */

export type WidgetType = 'card' | 'chart' | 'table' | 'watchlist';
export type ChartType = 'line' | 'candlestick' | 'area';
export type TimeInterval = 'daily' | 'weekly' | 'monthly';
export type DisplayMode = 'card' | 'table' | 'chart';
export type ApiProvider = 'finnhub' | 'indianapi' | 'alphavantage' | 'crypto' | 'custom';

export interface WidgetField {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  value?: unknown;
  customLabel?: string;
}

export interface WidgetConfig {
  id: string;
  name: string;
  type: WidgetType;
  apiUrl: string;
  apiKey?: string;
  apiProvider?: ApiProvider;
  refreshInterval: number; // in seconds
  selectedFields: WidgetField[];
  chartType?: ChartType;
  timeInterval?: TimeInterval;
  symbol?: string;
  symbols?: string[]; // For watchlist
  currency?: string; // For currency display
  cryptoSymbol?: string; // For crypto price widgets
  targetCurrencies?: string[]; // For crypto rate display
  displayMode?: DisplayMode; // Card, table, or chart view
  arrayPath?: string; // Path to array data for table display
  enableWebSocket?: boolean; // Enable real-time WebSocket updates
  dashboardType?: string; // Track which dashboard this widget belongs to
  cardLayout?: 'single' | 'list'; // For card layout selection
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  createdAt: number;
  lastUpdated?: number;
}

export interface WidgetData {
  id: string;
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  createdAt: number;
  updatedAt: number;
}

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: Omit<WidgetConfig, 'id' | 'createdAt'>[];
}

export interface ApiTestResult {
  success: boolean;
  data?: Record<string, unknown>;
  fields?: WidgetField[];
  error?: string;
  arrayFields?: WidgetField[]; // Fields that are arrays
}

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  latestTradingDay: string;
}

export interface TimeSeriesData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketGainer {
  ticker: string;
  price: string;
  change_amount: string;
  change_percentage: string;
  volume: string;
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  quote?: StockQuote;
  loading?: boolean;
  error?: string;
}

export type SortDirection = 'asc' | 'desc' | null;
export interface TableSortConfig {
  column: string;
  direction: SortDirection;
}

// Real-time trade data from WebSocket
export interface TradeData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
}
