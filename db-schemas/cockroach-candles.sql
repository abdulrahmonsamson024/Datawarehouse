-- ====================================================================
-- Database: CockroachDB
-- Entity: Financial Pair Candlesticks (pair_candles)
-- Description: Store historical financial candle data for various tickers
-- at multiple intervals (1m = 1-minute, 1h = 1-hour, 1w = 1-week).
-- Design Note: Optimized with clustered primary keys mapping to 
-- CockroachDB range keys.
-- ====================================================================

-- 1. Create table with structured composites for fast range scans
CREATE TABLE IF NOT EXISTS public.pair_candles (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    pair VARCHAR(20) NOT NULL,                    -- e.g. 'BTC/USD', 'EUR/USD', 'AAPL'
    interval VARCHAR(5) NOT NULL,                 -- '1m', '1h', '1w'
    timestamp TIMESTAMPTZ NOT NULL,               -- Bar open time
    open NUMERIC(20, 8) NOT NULL,
    high NUMERIC(20, 8) NOT NULL,
    low NUMERIC(20, 8) NOT NULL,
    close NUMERIC(20, 8) NOT NULL,
    volume NUMERIC(24, 8) NOT NULL DEFAULT 0.0,
    
    -- In CockroachDB, composite Primary Keys define actual shard clustering
    -- Sorting by (pair, interval, timestamp DESC) groups identical series
    -- together sequentially on disk, enabling lightning-fast range/chart queries.
    PRIMARY KEY (pair, interval, timestamp DESC)
);

-- 2. Optional: Index on id for UUID lookups if needed elsewhere
CREATE UNIQUE INDEX IF NOT EXISTS idx_pair_candles_id ON public.pair_candles (id);

-- 3. Prepopulate intervals constraint to keep data strict
ALTER TABLE public.pair_candles ADD CONSTRAINT check_interval 
CHECK (interval IN ('1m', '1h', '1w'));
