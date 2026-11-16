-- ==============================================================================
-- Dab Cric Auction - Supabase Migration: 003_transfers_table.sql
-- Description: Creates the public.transfers table for franchise trades,
--              injury replacements, and recovery logs.
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Click "Run"
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.transfers (
    _id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'trade', 'injury_replacement', 'injury_recovered'
    
    -- Trade specifics
    team_a_id TEXT,
    team_a_name TEXT,
    team_a_logo TEXT,
    player_a_id TEXT,
    player_a_name TEXT,
    player_a_price NUMERIC DEFAULT 0,
    
    team_b_id TEXT,
    team_b_name TEXT,
    team_b_logo TEXT,
    player_b_id TEXT,
    player_b_name TEXT,
    player_b_price NUMERIC DEFAULT 0,
    
    -- Injury replacement specifics
    team_id TEXT,
    team_name TEXT,
    team_logo TEXT,
    injured_player_id TEXT,
    injured_player_name TEXT,
    injured_player_price NUMERIC DEFAULT 0,
    replacement_player_id TEXT,
    replacement_player_name TEXT,
    replacement_player_price NUMERIC DEFAULT 0,
    refund_amount NUMERIC DEFAULT 0,
    replacement_fee NUMERIC DEFAULT 0,
    
    -- Recovery / General specifics
    player_id TEXT,
    player_name TEXT,
    player_category TEXT,
    player_base_price NUMERIC DEFAULT 0,
    player_image TEXT,
    note TEXT,
    notes TEXT,
    
    price_difference NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & Add Public Policies for API/Anon Access
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all transfers" ON public.transfers;
CREATE POLICY "Allow all transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);
