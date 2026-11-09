-- ==============================================================================
-- CricAuction Pro - Demo Seed Data
-- ==============================================================================

-- 1. Create Demo Tournament
INSERT INTO tournaments (id, name, description, status, auction_type, bidding_state, squad_size_limit)
VALUES (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'Premier Cricket League 2026',
    'Grand cricket championship auction with custom marquee sets and category slots.',
    'live',
    'owner_driven',
    'active',
    25
) ON CONFLICT DO NOTHING;

-- 2. Create Slots / Sets
INSERT INTO slots (id, tournament_id, name, type, category_target, order_index, status)
VALUES 
    ('b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Set 1: Marquee Batsmen', 'custom', 'Batsman', 1, 'active'),
    ('b2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Set 2: Fast Bowlers', 'custom', 'Bowler', 2, 'upcoming'),
    ('b3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Set 3: All-Rounders', 'category_random', 'All-Rounder', 3, 'upcoming')
ON CONFLICT DO NOTHING;

-- Set active slot in tournament
UPDATE tournaments 
SET active_slot_id = 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e'
WHERE id = 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';

-- 3. Create Teams
INSERT INTO teams (id, tournament_id, name, short_name, budget, spent)
VALUES 
    ('c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c71', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Mumbai Strikers', 'MS', 100, 0),
    ('c2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c72', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Chennai Titans', 'CT', 100, 0),
    ('c3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c73', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Delhi Royals', 'DR', 100, 0),
    ('c4b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c74', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Kolkata Knights', 'KK', 100, 0)
ON CONFLICT DO NOTHING;

-- 4. Create Players
INSERT INTO players (id, tournament_id, slot_id, name, category, base_price, status, auction_order)
VALUES
    ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c81', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'Rohit Sharma', 'Batsman', 200, 'pending', 1),
    ('d2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c82', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'Virat Kohli', 'Batsman', 200, 'pending', 2),
    ('d3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c83', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6e', 'Shubman Gill', 'Batsman', 150, 'pending', 3),
    ('d4b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c84', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', 'Jasprit Bumrah', 'Bowler', 200, 'pending', 1),
    ('d5b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c85', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6f', 'Mohammed Shami', 'Bowler', 150, 'pending', 2),
    ('d6b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c86', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70', 'Hardik Pandya', 'All-Rounder', 200, 'pending', 1),
    ('d7b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c87', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'b3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c70', 'Ravindra Jadeja', 'All-Rounder', 150, 'pending', 2)
ON CONFLICT DO NOTHING;

