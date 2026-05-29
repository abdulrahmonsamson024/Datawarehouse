/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SUPABASE_NEWS_SQL = `-- Historical Financial News Schema (Supabase)
-- Stores tagged articles, source info, impact tier and sentiment scoring

CREATE TABLE IF NOT EXISTS public.history_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    url TEXT,
    sentiment VARCHAR(15) CHECK (sentiment IN ('bullish', 'bearish', 'neutral')) NOT NULL DEFAULT 'neutral',
    tickers TEXT[] NOT NULL DEFAULT '{}',
    impact VARCHAR(20) DEFAULT 'none'             -- 'high' | 'medium' | 'low' | 'none'
);

-- Optimize date lookups for timelines
CREATE INDEX IF NOT EXISTS idx_history_news_published_at 
ON public.history_news (published_at DESC);

-- GIN Index for fast array queries (e.g. search tickers)
CREATE INDEX IF NOT EXISTS idx_history_news_tickers 
ON public.history_news USING GIN (tickers);

-- Enable RLS & set policy
ALTER TABLE public.history_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access for all" ON public.history_news FOR SELECT USING (true);`;

export const COCKROACH_CANDLES_SQL = `-- Multi-Interval Candle Schema (CockroachDB)
-- Supports 1m, 1h, and 1w intervals optimized with high-performance BID/ASK levels

CREATE TABLE IF NOT EXISTS public.pair_candles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    pair VARCHAR(20) NOT NULL,                    -- e.g. 'BTCUSD', 'EURUSD'
    interval VARCHAR(5) NOT NULL,                 -- '1m', '1h', '1w'
    source VARCHAR(50) NOT NULL DEFAULT 'exness',  -- 'exness', 'dukascopy', 'sandbox'
    timestamp TIMESTAMPTZ NOT NULL,               -- Candle open time (UTC)
    bid_open NUMERIC(20, 8) NOT NULL,
    bid_high NUMERIC(20, 8) NOT NULL,
    bid_low NUMERIC(20, 8) NOT NULL,
    bid_close NUMERIC(20, 8) NOT NULL,
    ask_open NUMERIC(20, 8) NOT NULL,
    ask_high NUMERIC(20, 8) NOT NULL,
    ask_low NUMERIC(20, 8) NOT NULL,
    ask_close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    repaired BOOLEAN NOT NULL DEFAULT FALSE,      -- Filled via secondary source
    
    -- Composite primary key groups consecutive data ranges on the range shards,
    -- allowing extreme sub-millisecond range and chart aggregations.
    PRIMARY KEY (pair, interval, source, timestamp DESC)
);

-- Add support constraints
ALTER TABLE public.pair_candles ADD CONSTRAINT check_interval 
CHECK (interval IN ('1m', '1h', '1w'));

-- Index on ID for individual lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_candles_id ON public.pair_candles (id);`;
