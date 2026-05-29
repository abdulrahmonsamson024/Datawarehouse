/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Interval types for CockroachDB candle data
export type MarketInterval = '1m' | '3m' | '5m' | '15m' | '30m' | '45m' | '1h' | '2h' | '4h' | '6h' | '8h' | '12h' | '1d' | '1w' | '1M';

// Historical Financial News Item Schema (Supabase)
export interface FinancialNews {
  id: string; // UUID or string
  published_at: string; // ISO Timestamp
  title: string;
  content: string;
  source: string;
  url: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  tickers: string[]; // Ticker symbols referenced e.g., ["BTC", "AAPL"]
  impact?: 'high' | 'medium' | 'low' | 'none';
}

// Candlestick Data Schema (CockroachDB)
export interface Candlestick {
  id?: string | number;
  pair: string; // e.g. "BTC/USD", "EUR/USD"
  interval: MarketInterval;
  source?: string; // e.g. "axiory", "exness", "dukascopy"
  timestamp: string; // ISO or date string
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  bid_open?: number;
  bid_high?: number;
  bid_low?: number;
  bid_close?: number;
  ask_open?: number;
  ask_high?: number;
  ask_low?: number;
  ask_close?: number;
  spread?: number | {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  spread_open?: number;
  spread_high?: number;
  spread_low?: number;
  spread_close?: number;
  volume: number;
  repaired?: boolean;
  news?: FinancialNews[];
}

// Database Connection Status Overview
export interface DBStatus {
  connected: boolean | null; // true, false or null (untested)
  error?: string;
  schemaChecked?: boolean;
  tableCount?: number;
}

export interface CockroachInstance {
  id: string;
  name: string;
  url: string;
  pairs: string[]; // up to 4 unique pairs per database, unique globally
  source?: "axiory" | "exness" | "dukascopy";
}

export interface DetectedGap {
  start: string;
  end: string;
  missingCount: number;
}

export interface PairSourceStat {
  pair: string;
  source: string;
  count: number;
  count_1m?: number;
  count_1h?: number;
  count_1w?: number;
  min_ts: string | null;
  max_ts: string | null;
  startWeek: string;  // e.g. "2015wk32"
  endWeek: string;    // e.g. "2026wk10"
  totalSize: string;  // e.g. "450 KB"
  gapsCount: number;
  gaps: DetectedGap[];
  repairedCount: number;
}

export interface CockroachInstanceStatus {
  instance: CockroachInstance;
  connected: boolean | null;
  error?: string;
  diagnostics: {
    totalSize: string;
    tableSize: string;
    indexSize: string;
    rowCount: number;
    info: string;
    engine: string;
  };
  pairSourceStats?: PairSourceStat[];
}

export interface AppDBState {
  supabase: DBStatus & { url?: string };
  cockroachInstances: CockroachInstanceStatus[];
}

