-- ====================================================================
-- Database: Supabase (PostgreSQL)
-- Entity: Historical Financial News (history_news)
-- Description: Stores high-frequency, tagged, and sentiment-scored 
-- financial market news articles. Supports rapid index lookup and full text-search.
-- ====================================================================

-- 1. Create the Historical News table
CREATE TABLE IF NOT EXISTS public.history_news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    url TEXT,
    sentiment VARCHAR(15) CHECK (sentiment IN ('bullish', 'bearish', 'neutral')) NOT NULL DEFAULT 'neutral',
    tickers TEXT[] NOT NULL DEFAULT '{}'
);

-- 2. Create index on published_at (most common sort key)
CREATE INDEX IF NOT EXISTS idx_history_news_published_at 
ON public.history_news (published_at DESC);

-- 3. Create GIN index on tickers array for lightning-fast array queries
-- Useful for queries like: WHERE tickers @> ARRAY['BTC']
CREATE INDEX IF NOT EXISTS idx_history_news_tickers 
ON public.history_news USING GIN (tickers);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.history_news ENABLE ROW LEVEL SECURITY;

-- 5. Open basic RLS policies
-- Allow insert from authenticated service/origin loaders
CREATE POLICY "Allow read access for all users" 
ON public.history_news FOR SELECT USING (true);

CREATE POLICY "Allow write access for authenticated users only"
ON public.history_news FOR INSERT WITH CHECK (auth.role() = 'authenticated');
