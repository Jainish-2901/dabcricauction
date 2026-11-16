-- ==============================================================================
-- Dab Cric Auction - Supabase Production Schema
-- File: supabase/supabase_schema_for_dabcricauction.sql
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Click "Run"
-- ==============================================================================

-- 1. Create Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
    _id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'upcoming',
    auction_type TEXT DEFAULT 'owner_driven',
    bidding_state TEXT DEFAULT 'idle',
    squad_size_limit INT DEFAULT 25,
    start_date TEXT,
    time TEXT,
    description TEXT,
    logo TEXT,
    active_slot_id TEXT,
    current_bidding_player_id TEXT,
    bid_increment_rules JSONB DEFAULT '[]'::jsonb,
    registration_open BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Teams Table
CREATE TABLE IF NOT EXISTS public.teams (
    _id TEXT PRIMARY KEY,
    tournament_id TEXT,
    name TEXT NOT NULL,
    short_name TEXT,
    logo TEXT,
    budget NUMERIC DEFAULT 100,
    spent NUMERIC DEFAULT 0,
    is_owner_captain BOOLEAN DEFAULT false,
    captain_name TEXT,
    captain_price NUMERIC DEFAULT 0,
    captain_photo TEXT,
    players JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Slots Table
CREATE TABLE IF NOT EXISTS public.slots (
    _id TEXT PRIMARY KEY,
    tournament_id TEXT,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Batsman',
    base_price NUMERIC DEFAULT 20,
    "order" INT DEFAULT 1,
    is_default_unsold BOOLEAN DEFAULT false,
    slot_type TEXT DEFAULT 'custom',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Players Table
CREATE TABLE IF NOT EXISTS public.players (
    _id TEXT PRIMARY KEY,
    tournament_id TEXT,
    slot_id TEXT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Batsman',
    batting_style TEXT,
    bowling_style TEXT,
    base_price NUMERIC DEFAULT 20,
    current_bid NUMERIC DEFAULT 0,
    sold_price NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'pending',
    current_lead_team_id JSONB,
    sold_to_team_id TEXT,
    image TEXT,
    cric_heroes_profile_url TEXT,
    mobile TEXT,
    age INT,
    stats JSONB DEFAULT '{"matches": 0, "runs": 0, "wickets": 0, "highestScore": "", "bestBowling": ""}'::jsonb,
    is_re_auction BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Users / Credentials Table
CREATE TABLE IF NOT EXISTS public.users (
    _id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    organization_name TEXT,
    phone TEXT,
    password_hash TEXT NOT NULL,
    plain_password TEXT,
    role TEXT DEFAULT 'team_owner',
    tournament_id TEXT,
    team_id TEXT,
    team_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create Bids Audit Table
CREATE TABLE IF NOT EXISTS public.bids (
    _id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    player_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    team_name TEXT,
    bid_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create Transfers & Replacements History Table
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

-- 8. Enable Row Level Security (RLS) & Add Public Policies for API Access
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- Allow full access to authenticated / anon keys
DROP POLICY IF EXISTS "Allow all tournaments" ON public.tournaments;
CREATE POLICY "Allow all tournaments" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all teams" ON public.teams;
CREATE POLICY "Allow all teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all slots" ON public.slots;
CREATE POLICY "Allow all slots" ON public.slots FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all players" ON public.players;
CREATE POLICY "Allow all players" ON public.players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all users" ON public.users;
CREATE POLICY "Allow all users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all bids" ON public.bids;
CREATE POLICY "Allow all bids" ON public.bids FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all transfers" ON public.transfers;
CREATE POLICY "Allow all transfers" ON public.transfers FOR ALL USING (true) WITH CHECK (true);

