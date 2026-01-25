/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_FINNHUB_API_KEY: string;
	readonly VITE_FINNHUB_BASE_URL?: string;
	readonly VITE_FINNHUB_WS_URL?: string;
	readonly VITE_INDIAN_API_KEY: string;
	readonly VITE_INDIAN_API_BASE_URL?: string;
	readonly VITE_ALPHA_VANTAGE_API_KEY?: string;
	readonly VITE_ALPHA_VANTAGE_BASE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
