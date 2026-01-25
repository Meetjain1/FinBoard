/**
 * Application Constants for FinBoard
 * Supports multiple API providers: Finnhub, IndianAPI, Alpha Vantage
 */

import type { DashboardTemplate } from '@/types/widget';

// Finnhub API Configuration (60 calls/minute)
export const FINNHUB_API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || '';
export const FINNHUB_BASE_URL = import.meta.env.VITE_FINNHUB_BASE_URL || 'https://finnhub.io/api/v1';
export const FINNHUB_WS_URL = import.meta.env.VITE_FINNHUB_WS_URL || 'wss://ws.finnhub.io';

// IndianAPI Configuration (Higher rate limits for Indian stocks)
export const INDIAN_API_KEY = import.meta.env.VITE_INDIAN_API_KEY || '';
export const INDIAN_API_BASE_URL = (import.meta.env.VITE_INDIAN_API_BASE_URL || 'https://api.indianapi.in').replace(/\/$/, '');
export const INDIAN_API_FALLBACK_BASES = [
  INDIAN_API_BASE_URL,
  'https://indianapi.in/api',
  'https://indianapi.in/api/v1',
];

// Alpha Vantage API Configuration (Fallback - 5 calls/minute)
export const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || '';
export const ALPHA_VANTAGE_BASE_URL = import.meta.env.VITE_ALPHA_VANTAGE_BASE_URL || 'https://www.alphavantage.co/query';

// API Provider Types
export type ApiProvider = 'finnhub' | 'indianapi' | 'alphavantage' | 'custom';

// API Rate Limiting (per provider)
export const API_RATE_LIMITS = {
  finnhub: { requestsPerMinute: 60, requestsPerDay: 1000 },
  indianapi: { requestsPerMinute: 100, requestsPerDay: 5000 },
  alphavantage: { requestsPerMinute: 5, requestsPerDay: 500 },
};

// Cache Configuration (in milliseconds)
export const CACHE_DURATION = {
  quote: 30 * 1000, // 30 seconds
  timeSeries: 5 * 60 * 1000, // 5 minutes
  gainersLosers: 2 * 60 * 1000, // 2 minutes
  custom: 60 * 1000, // 1 minute
  indianStocks: 60 * 1000, // 1 minute
};

// Default Widget Configuration
export const DEFAULT_REFRESH_INTERVAL = 30; // seconds

// Popular US Stock Symbols
export const POPULAR_SYMBOLS = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'US' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'US' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'US' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'US' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'US' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'US' },
];

// Popular crypto assets
export const POPULAR_CRYPTO = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'MATIC', name: 'Polygon' },
  { symbol: 'XRP', name: 'XRP' },
];

// Popular Indian Stock Symbols
export const INDIAN_SYMBOLS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys', exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', exchange: 'NSE' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', exchange: 'NSE' },
  { symbol: 'ITC', name: 'ITC Limited', exchange: 'NSE' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE' },
];

// Currency Options
export const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

// Widget Size Presets
export const WIDGET_SIZES = {
  small: { w: 1, h: 1 },
  medium: { w: 2, h: 1 },
  large: { w: 2, h: 2 },
  wide: { w: 3, h: 1 },
  tall: { w: 1, h: 2 },
};

// Dashboard Templates
export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'starter',
    name: 'Starter Dashboard',
    description: 'Essential US stock widgets using Finnhub API',
    icon: 'rocket',
    widgets: [
      {
        name: 'Apple Stock',
        type: 'card',
        apiUrl: `${FINNHUB_BASE_URL}/quote?symbol=AAPL&token=${FINNHUB_API_KEY}`,
        refreshInterval: 30,
        selectedFields: [],
        symbol: 'AAPL',
        apiProvider: 'finnhub',
        position: { x: 0, y: 0, w: 1, h: 1 },
      },
      {
        name: 'Microsoft Stock',
        type: 'card',
        apiUrl: `${FINNHUB_BASE_URL}/quote?symbol=MSFT&token=${FINNHUB_API_KEY}`,
        refreshInterval: 30,
        selectedFields: [],
        symbol: 'MSFT',
        apiProvider: 'finnhub',
        position: { x: 1, y: 0, w: 1, h: 1 },
      },
      {
        name: 'Tesla Stock',
        type: 'card',
        apiUrl: `${FINNHUB_BASE_URL}/quote?symbol=TSLA&token=${FINNHUB_API_KEY}`,
        refreshInterval: 30,
        selectedFields: [],
        symbol: 'TSLA',
        apiProvider: 'finnhub',
        position: { x: 2, y: 0, w: 1, h: 1 },
      },
    ],
  },
  {
    id: 'indian-market',
    name: 'Indian Market',
    description: 'Track NSE stocks with IndianAPI',
    icon: 'indian-rupee',
    widgets: [
      {
        name: 'Reliance Industries',
        type: 'card',
        apiUrl: `${INDIAN_API_BASE_URL}/stock?name=Reliance`,
        refreshInterval: 60,
        selectedFields: [
          { path: 'companyName', label: 'Company', type: 'string' },
          { path: 'currentPrice.NSE', label: 'NSE Price', type: 'number' },
          { path: 'percentChange', label: 'Change %', type: 'number' },
          { path: 'yearHigh', label: '52W High', type: 'number' },
        ],
        apiProvider: 'indianapi',
        displayMode: 'card',
        position: { x: 0, y: 0, w: 1, h: 1 },
      },
      {
        name: 'TCS',
        type: 'card',
        apiUrl: `${INDIAN_API_BASE_URL}/stock?name=TCS`,
        refreshInterval: 60,
        selectedFields: [
          { path: 'companyName', label: 'Company', type: 'string' },
          { path: 'currentPrice.NSE', label: 'NSE Price', type: 'number' },
          { path: 'percentChange', label: 'Change %', type: 'number' },
        ],
        apiProvider: 'indianapi',
        displayMode: 'card',
        position: { x: 1, y: 0, w: 1, h: 1 },
      },
      {
        name: 'HDFC Bank',
        type: 'card',
        apiUrl: `${INDIAN_API_BASE_URL}/stock?name=HDFC%20Bank`,
        refreshInterval: 60,
        selectedFields: [
          { path: 'companyName', label: 'Company', type: 'string' },
          { path: 'currentPrice.NSE', label: 'NSE Price', type: 'number' },
          { path: 'percentChange', label: 'Change %', type: 'number' },
        ],
        apiProvider: 'indianapi',
        displayMode: 'card',
        position: { x: 2, y: 0, w: 1, h: 1 },
      },
      {
        name: 'NSE Stocks Table',
        type: 'table',
        apiUrl: '',
        refreshInterval: 60,
        selectedFields: [],
        symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK'],
        apiProvider: 'indianapi',
        displayMode: 'table',
        position: { x: 0, y: 1, w: 3, h: 2 },
      },
    ],
  },
  {
    id: 'crypto',
    name: 'Crypto Tracker',
    description: 'Track cryptocurrency prices using Coinbase API',
    icon: 'bitcoin',
    widgets: [
      {
        name: 'Bitcoin Price',
        type: 'card',
        apiUrl: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
        refreshInterval: 30,
        selectedFields: [
          { path: 'data.currency', label: 'Currency', type: 'string' },
          { path: 'data.rates.USD', label: 'USD Rate', type: 'string' },
          { path: 'data.rates.INR', label: 'INR Rate', type: 'string' },
        ],
        displayMode: 'card',
        position: { x: 0, y: 0, w: 2, h: 1 },
      },
      {
        name: 'Crypto Watchlist',
        type: 'watchlist',
        apiUrl: '',
        refreshInterval: 30,
        selectedFields: [],
        symbols: ['BTC', 'ETH', 'SOL', 'XRP'],
        apiProvider: 'crypto',
        displayMode: 'card',
        position: { x: 0, y: 1, w: 2, h: 1 },
      },
    ],
  },
];

// Time Interval Options
export const TIME_INTERVALS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

// Local Storage Keys
export const STORAGE_KEYS = {
  dashboard: 'finboard-dashboard',
  theme: 'finboard-theme',
  cache: 'finboard-cache',
  preferences: 'finboard-preferences',
  watchlist: 'finboard-watchlist',
};

// API Endpoints for each provider
export const API_ENDPOINTS = {
  finnhub: {
    quote: (symbol: string) => `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`,
    candles: (symbol: string, resolution: string, from: number, to: number) => 
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
    news: () => `${FINNHUB_BASE_URL}/news?category=general&token=${FINNHUB_API_KEY}`,
    marketStatus: () => `${FINNHUB_BASE_URL}/stock/market-status?exchange=US&token=${FINNHUB_API_KEY}`,
    search: (query: string) => `${FINNHUB_BASE_URL}/search?q=${query}&token=${FINNHUB_API_KEY}`,
  },
  indianapi: {
    stocks: () => `${INDIAN_API_BASE_URL}/stock`,
    stockDetails: (name: string) => `${INDIAN_API_BASE_URL}/stock?name=${encodeURIComponent(name)}`,
    mutualFunds: () => `${INDIAN_API_BASE_URL}/mutual_funds`,
    ipo: () => `${INDIAN_API_BASE_URL}/ipo`,
    trending: () => `${INDIAN_API_BASE_URL}/trending`,
  },
};
