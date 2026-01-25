/**
 * Currency Conversion Service for FinBoard
 * Provides real-time and fallback exchange rates
 */

import { cache } from './api';
import { CACHE_DURATION } from './constants';

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

export interface ExchangeRates {
    [key: string]: number;
}

// Fallback rates if API fails
const FALLBACK_RATES: ExchangeRates = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 151.42,
    INR: 83.12,
    CAD: 1.35,
    AUD: 1.52,
    CHF: 0.90,
    CNY: 7.23,
};

/**
 * Fetch latest exchange rates from USD
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
    const cacheKey = 'exchange-rates-usd';
    const cached = cache.get<ExchangeRates>(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetch(EXCHANGE_RATE_API);
        if (!response.ok) throw new Error('Failed to fetch exchange rates');

        const data = await response.json();
        const rates = data.rates;

        cache.set(cacheKey, rates, 24 * 60 * 60 * 1000); // Cache for 24 hours
        return rates;
    } catch (error) {
        console.warn('Using fallback exchange rates:', error);
        return FALLBACK_RATES;
    }
}

/**
 * Convert value from one currency to another
 */
export async function convertCurrency(
    value: number,
    from: string = 'USD',
    to: string = 'USD'
): Promise<number> {
    if (from === to) return value;

    const rates = await getExchangeRates();

    // Convert from 'from' to USD first
    const usdValue = from === 'USD' ? value : value / (rates[from] || 1);

    // Then from USD to 'to'
    const finalValue = to === 'USD' ? usdValue : usdValue * (rates[to] || 1);

    return finalValue;
}

/**
 * Synchronous version for UI display (uses fallback or cached values)
 */
export function convertCurrencySync(
    value: number,
    from: string = 'USD',
    to: string = 'USD'
): number {
    if (from === to) return value;

    const cached = cache.get<ExchangeRates>('exchange-rates-usd');
    const rates = cached || FALLBACK_RATES;

    const usdValue = from === 'USD' ? value : value / (rates[from] || 1);
    const finalValue = to === 'USD' ? usdValue : usdValue * (rates[to] || 1);

    return finalValue;
}
