-- ==============================================================================
-- CricAuction Pro - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- ==============================================================================

-- 1. Custom Types & Enums
CREATE TYPE user_role AS ENUM ('superadmin', 'auctioneer', 'team_owner', 'public');
CREATE TYPE tournament_status AS ENUM ('upcoming', 'live', 'completed', 'paused');
CREATE TYPE auction_type AS ENUM ('owner_driven', 'admin_driven');
CREATE TYPE bidding_state AS ENUM ('idle', 'active', 'paused', 'stopped');
CREATE TYPE slot_type AS ENUM ('category_random', 'custom');
CREATE TYPE slot_status AS ENUM ('upcoming', 'active', 'paused', 'completed');
CREATE TYPE player_status AS ENUM ('pending', 'bidding', 'sold', 'unsold');
CREATE TYPE audit_action AS ENUM ('BID_PLACED', 'BID_UNDONE', 'PLAYER_SOLD', 'SALE_UNDONE', 'PLAYER_UNSOLD', 'MANUAL_OVERRIDE');

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'team_owner',
    tournament_id UUID,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tournaments Table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    status tournament_status DEFAULT 'upcoming',
    auction_type auction_type DEFAULT 'owner_driven',
    bidding_state bidding_state DEFAULT 'idle',
    active_slot_id UUID,
    current_player_id UUID,
    squad_size_limit INT DEFAULT 25,
    theme_color TEXT DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Slots / Sets Table
CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type slot_type DEFAULT 'custom',
    category_target TEXT DEFAULT 'Any',
    order_index INT DEFAULT 1,
    status slot_status DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    logo_url TEXT,
    budget NUMERIC NOT NULL DEFAULT 100, -- in Crores / Lakhs
    spent NUMERIC NOT NULL DEFAULT 0,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Players Table
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Batsman, Bowler, All-Rounder, Wicket Keeper
    base_price NUMERIC NOT NULL DEFAULT 20, -- in Lakhs
    current_bid NUMERIC DEFAULT 0,
    sold_price NUMERIC DEFAULT 0,
    status player_status DEFAULT 'pending',
    current_lead_team_id UUID REFERENCES teams(id),
    sold_to_team_id UUID REFERENCES teams(id),
    image_url TEXT,
    cric_heroes_url TEXT,
    stats JSONB DEFAULT '{"matches": 0, "runs": 0, "wickets": 0, "battingAverage": 0, "bowlingAverage": 0}'::jsonb,
    auction_order INT DEFAULT 999,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit & Rollback Ledger
CREATE TABLE auction_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    action audit_action NOT NULL,
    previous_bid NUMERIC,
    previous_lead_team_id UUID REFERENCES teams(id),
    new_bid NUMERIC,
    new_lead_team_id UUID REFERENCES teams(id),
    sold_price NUMERIC,
    sold_team_id UUID REFERENCES teams(id),
    reverted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Foreign Key Constraints that circular-reference tournaments
ALTER TABLE tournaments 
    ADD CONSTRAINT fk_tournaments_active_slot 
    FOREIGN KEY (active_slot_id) REFERENCES slots(id) ON DELETE SET NULL;

ALTER TABLE tournaments 
    ADD CONSTRAINT fk_tournaments_current_player 
    FOREIGN KEY (current_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- 8. Indexes for Real-Time Query Performance
CREATE INDEX idx_slots_tournament ON slots(tournament_id);
CREATE INDEX idx_teams_tournament ON teams(tournament_id);
CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_players_slot ON players(slot_id);
CREATE INDEX idx_players_status ON players(status);
CREATE INDEX idx_action_logs_tournament ON auction_action_logs(tournament_id);
CREATE INDEX idx_action_logs_player ON auction_action_logs(player_id);

-- 9. Row Level Security (RLS) Enablement
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_action_logs ENABLE ROW LEVEL SECURITY;

-- Public read access policies for spectator screens & live bidders
CREATE POLICY "Public can view tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Public can view slots" ON slots FOR SELECT USING (true);
CREATE POLICY "Public can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Public can view players" ON players FOR SELECT USING (true);
CREATE POLICY "Public can view action logs" ON auction_action_logs FOR SELECT USING (true);
CREATE POLICY "Users can read profiles" ON profiles FOR SELECT USING (true);

-- Admin modification policies
CREATE POLICY "Admins have full access to tournaments" ON tournaments FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'auctioneer'))
);
CREATE POLICY "Admins have full access to slots" ON slots FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'auctioneer'))
);
CREATE POLICY "Admins have full access to teams" ON teams FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'auctioneer'))
);
CREATE POLICY "Admins have full access to players" ON players FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'auctioneer'))
);
CREATE POLICY "Admins have full access to action logs" ON auction_action_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'auctioneer'))
);

