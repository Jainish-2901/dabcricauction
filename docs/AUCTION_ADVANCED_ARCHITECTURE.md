# CricAuction Pro: Multi-Platform Architecture & Supabase Blueprint
*(React Native Expo + React Web + Supabase Realtime Engine)*

---

## 1. System Vision & Multi-Platform Topology

CricAuction Pro is architected as a cross-platform live auction ecosystem powered by **Supabase**:

```
                                  +-------------------------------------------------------+
                                  |                 SUPABASE BACKEND                      |
                                  |  - PostgreSQL Database (ACID, RLS, Audit Logs)        |
                                  |  - Realtime Channels (Broadcast, Presence, Postgres)  |
                                  |  - Supabase Auth (RBAC: Admin, Auctioneer, Owner)     |
                                  |  - Storage (Player Photos, Team Logos, Banners)       |
                                  |  - Database RPCs (Atomic Bids, Sales, Rollbacks)      |
                                  +---------------------------+---------------------------+
                                                              |
                                  +---------------------------+---------------------------+
                                  |                                                       |
        +-------------------------v-------------------+         +-------------------------v-------------------+
        |                REACT WEB PORTAL             |         |            REACT NATIVE EXPO APP            |
        |  (Super Admin, Auctioneer, Public Screen)   |         |           (Team Owners, Mobile View)        |
        |---------------------------------------------|         |---------------------------------------------|
        | - SuperAdmin Dashboard & Tournaments        |         | - Real-time Owner Bidding Room              |
        | - Slot & Set Manager (Custom / Categories)  |         | - Quick Bids (+10L, +20L, Custom)           |
        | - Auctioneer Master Console (Pause/Rollback)|         | - Team Purse & Squad Breakdown              |
        | - Projector / Public TV Broadcast Screen    |         | - Competitor Purse Radar & Live Alerts      |
        +---------------------------------------------+         +---------------------------------------------+
```

---

## 2. Core Functional Requirements Checklist

### 2.1. Dual-Mode Slot & Set System
1. **Mode A: Category-Wise Random Slots**:
   - Random player selection inside a designated category: **Batsmen**, **Bowlers**, **All-Rounders**, **Wicket Keepers**.
   - Ensures equal representation and pacing across skill types.
2. **Mode B: Custom Admin-Defined Slots / Sets**:
   - Admins can create unlimited custom sets (e.g., *Set 1: Marquee Batsmen*, *Set 2: Tier-1 Fast Bowlers*, *Set 3: Emerging Spinners*, *Accelerated Round*).
   - Drag-and-drop or select players into custom sets.
   - Dynamic set switching on the fly during the live auction.
   - Set status tracking (`Upcoming`, `In Progress`, `Completed`, `Paused`).

### 2.2. Master Auctioneer Controls
- **Lifecycle Control**: `Start Bidding`, `Pause Bidding` (instantly locks owner apps with pause banner), `Resume Bidding`, and `Stop/Close`.
- **Settlement Actions**:
  - `Sold to Leader`: Finalizes player to the current highest bidder.
  - `Mark Unsold`: Sends player to the unsold pool for accelerated rounds.
  - `Manual Force-Sell`: Manually select any team and enter a custom hammer price (for phone/offline bids).

### 2.3. Zero-Loss Undo & Rollback Engine
- **Step-by-Step Erase Last Bid (Undo Recent Bid)**:
  - Reverts only the single most recent bid in history back to the previous bidder and amount (e.g. 20k → 50k → 70k → 90k, clicking undo erases only 90k and restores bidding back to 70k) rather than resetting the round to base price.
- **Rollback Sale & Re-Auction**:
  - If a sale was closed mistakenly (e.g. hammer dropped before an incoming bid):
  - Refunds the team's purse automatically in Postgres.
  - Removes the player from the winning team's roster.
  - Restores player status back to active bidding (`bidding`).
  - Broadcasts room re-opening so all owners can continue bidding seamlessly.

### 2.4. Squad & Pool Governance
- **1-Click Squad Release to Unsold Pool**:
  - SuperAdmin and Auctioneer can remove any player from an acquired team squad directly back into the **Unsold Pool** without requiring a player exchange.
  - Team's purse is refunded automatically by the exact sold price.
  - The player immediately enters the Unsold Pool, eligible for Re-Auction or Direct Sale.
- **Direct Manual Player Sale/Allocation**:
  - SuperAdmin can manually sell/assign any player from the **Unsold Pool** or **Pending Pool** directly to any team at an entered price.
  - Validates team budget, squad capacity limit, and updates PostgreSQL/local DB with zero latency.
- **Dedicated Pending Pool & Status Filters**:
  - Centralized Pending Players Pool card and quick status filter pills (`ALL`, `Pending`, `Sold`, `Unsold`, `Injured`) with real-time player counters.
- **Captain Priority & Retention Fee Accounting**:
  - Captains are pinned to the top row (#1) of all squad tables across Web and Mobile.
  - Captain retention fees are accurately factored into team spent and purse balance calculations.

---

## 3. Supabase Database Schema (PostgreSQL DDL)

```sql
-- 1. Profiles & Roles
CREATE TYPE user_role AS ENUM ('superadmin', 'auctioneer', 'team_owner', 'public');

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    role user_role DEFAULT 'team_owner',
    tournament_id UUID,
    team_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tournaments
CREATE TYPE tournament_status AS ENUM ('upcoming', 'live', 'completed', 'paused');
CREATE TYPE auction_type AS ENUM ('owner_driven', 'admin_driven');
CREATE TYPE bidding_state AS ENUM ('idle', 'active', 'paused', 'stopped');

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

-- 3. Slots / Sets
CREATE TYPE slot_type AS ENUM ('category_random', 'custom');
CREATE TYPE slot_status AS ENUM ('upcoming', 'active', 'paused', 'completed');

CREATE TABLE slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type slot_type DEFAULT 'custom',
    category_target TEXT DEFAULT 'Any', -- 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper', 'Any'
    order_index INT DEFAULT 1,
    status slot_status DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Teams
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    short_name TEXT,
    logo_url TEXT,
    budget NUMERIC NOT NULL DEFAULT 100, -- In Crores / Lakhs
    spent NUMERIC NOT NULL DEFAULT 0,
    owner_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Players
CREATE TYPE player_status AS ENUM ('pending', 'bidding', 'sold', 'unsold');

CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES slots(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Batsman, Bowler, All-Rounder, Wicket Keeper
    base_price NUMERIC NOT NULL DEFAULT 20, -- In Lakhs
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

-- 6. Audit & Rollback Ledger
CREATE TYPE audit_action AS ENUM ('BID_PLACED', 'BID_UNDONE', 'PLAYER_SOLD', 'SALE_UNDONE', 'PLAYER_UNSOLD', 'MANUAL_OVERRIDE');

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
```

---

## 4. Atomic PostgreSQL RPCs (ACID Concurrency & Rollbacks)

To guarantee no race conditions during millisecond bid collisions, Supabase PostgreSQL Stored Procedures handle bids and rollbacks atomically:

### 4.1. Atomic Bid Placement RPC
```sql
CREATE OR REPLACE FUNCTION place_auction_bid(
    p_tournament_id UUID,
    p_player_id UUID,
    p_team_id UUID,
    p_bid_amount NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_team RECORD;
    v_tournament RECORD;
BEGIN
    -- Check tournament status
    SELECT * INTO v_tournament FROM tournaments WHERE id = p_tournament_id;
    IF v_tournament.bidding_state != 'active' THEN
        RAISE EXCEPTION 'Bidding is currently paused or inactive';
    END IF;

    -- Lock player row
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF v_player.status NOT IN ('pending', 'bidding') THEN
        RAISE EXCEPTION 'Player is not available for bidding';
    END IF;

    IF p_bid_amount <= COALESCE(v_player.current_bid, v_player.base_price - 1) THEN
        RAISE EXCEPTION 'Bid must be strictly higher than current bid';
    END IF;

    -- Check team remaining budget
    SELECT * INTO v_team FROM teams WHERE id = p_team_id;
    IF (v_team.budget - v_team.spent) < p_bid_amount THEN
        RAISE EXCEPTION 'Team does not have sufficient purse budget';
    END IF;

    -- Record in Audit Log
    INSERT INTO auction_action_logs (
        tournament_id, player_id, action,
        previous_bid, previous_lead_team_id,
        new_bid, new_lead_team_id
    ) VALUES (
        p_tournament_id, p_player_id, 'BID_PLACED',
        v_player.current_bid, v_player.current_lead_team_id,
        p_bid_amount, p_team_id
    );

    -- Update Player
    UPDATE players 
    SET current_bid = p_bid_amount, 
        current_lead_team_id = p_team_id, 
        status = 'bidding',
        updated_at = NOW()
    WHERE id = p_player_id;

    RETURN jsonb_build_object(
        'success', true,
        'playerId', p_player_id,
        'bidAmount', p_bid_amount,
        'teamId', p_team_id
    );
END;
$$ LANGUAGE plpgsql;
```

### 4.2. Atomic Rollback Sale RPC (Zero Data Loss)
```sql
CREATE OR REPLACE FUNCTION rollback_player_sale(
    p_tournament_id UUID,
    p_player_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_sold_team_id UUID;
    v_sold_price NUMERIC;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF v_player.status != 'sold' THEN
        RAISE EXCEPTION 'Player is not in sold status';
    END IF;

    v_sold_team_id := v_player.sold_to_team_id;
    v_sold_price := v_player.sold_price;

    -- 1. Refund Team Spent Purse
    UPDATE teams 
    SET spent = spent - v_sold_price,
        updated_at = NOW()
    WHERE id = v_sold_team_id;

    -- 2. Restore Player to Active Bidding
    UPDATE players 
    SET status = 'bidding',
        sold_to_team_id = NULL,
        sold_price = 0,
        current_bid = v_sold_price,
        current_lead_team_id = v_sold_team_id,
        updated_at = NOW()
    WHERE id = p_player_id;

    -- 3. Log Rollback in Audit Log
    INSERT INTO auction_action_logs (
        tournament_id, player_id, action,
        sold_price, sold_team_id, reverted
    ) VALUES (
        p_tournament_id, p_player_id, 'SALE_UNDONE',
        v_sold_price, v_sold_team_id, true
    );

    RETURN jsonb_build_object(
        'success', true,
        'playerId', p_player_id,
        'refundedTeamId', v_sold_team_id,
        'refundedPrice', v_sold_price
    );
END;
$$ LANGUAGE plpgsql;
```

---

## 5. Supabase Realtime Architecture

Both the **React Web Portal** and **React Native Expo App** connect to the same Supabase Realtime Channel:

```javascript
// Channel: auction:{tournamentId}
const auctionChannel = supabase.channel(`auction:${tournamentId}`, {
  config: { broadcast: { self: true } }
});

// Broadcast Events Handled by Both Web & Mobile:
auctionChannel
  .on('broadcast', { event: 'bid_update' }, ({ payload }) => {
    // payload: { playerId, amount, team }
  })
  .on('broadcast', { event: 'bidding_state_changed' }, ({ payload }) => {
    // payload: { state: 'active' | 'paused' | 'stopped' }
    // Mobile: disable bid buttons & show PAUSED modal
  })
  .on('broadcast', { event: 'new_player_on_stage' }, ({ payload }) => {
    // payload: { player, slot }
  })
  .on('broadcast', { event: 'player_sold' }, ({ payload }) => {
    // payload: { player, team, price }
  })
  .on('broadcast', { event: 'player_unsold' }, ({ payload }) => {
    // payload: { player }
  })
  .on('broadcast', { event: 'sale_rolled_back' }, ({ payload }) => {
    // payload: { player, refundedTeamId }
  })
  .on('broadcast', { event: 'bid_undone' }, ({ payload }) => {
    // payload: { previousBid, previousLeadTeam }
  })
  .subscribe();
```

---

## 6. Multi-Platform Directory Structure

```
CricAuction/
├── web/                       # React (Vite) Web Application
│   ├── src/
│   │   ├── pages/
│   │   │   ├── SuperAdminDashboard.jsx     # Tournaments, Teams, Slots CRUD
│   │   │   ├── AdminAuctionConsole.jsx     # Master Controls, Pause, Rollback, Force-Sell
│   │   │   └── PublicAuctionScreen.jsx     # Projector / Big Screen Broadcast View
│   │   ├── components/
│   │   │   ├── SlotManagerModal.jsx        # Custom Sets & Drag-and-Drop Order
│   │   │   └── RollbackConfirmDialog.jsx   # Safe Double-Confirm for Undos
│   │   └── lib/supabase.js
│
├── mobile/                    # React Native Expo Application
│   ├── app/
│   │   ├── (auth)/login.tsx                # Owner Login
│   │   ├── (tabs)/
│   │   │   ├── index.tsx                   # Live Bidding Room (Fast Hammer Buttons)
│   │   │   ├── squad.tsx                   # Current Purchased Squad
│   │   │   └── radar.tsx                   # Competitor Purses & Remaining Slots
│   │   ├── components/
│   │   │   ├── PauseOverlay.tsx                # Visual Dimmer when Auctioneer pauses
│   │   │   └── QuickBidButtons.tsx             # +10L, +20L, +50L with Purse Safeguards
│   │   ├── lib/supabase.ts
│   └── app.json
│
├── supabase/                  # Supabase Config & Migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql          # Tables, Enums, RLS
│   │   └── 002_auction_rpc.sql             # Atomic Bids, Sales & Rollbacks
│   └── seed.sql
│
└── docs/
    └── AUCTION_ADVANCED_ARCHITECTURE.md
```

---

## 7. Step-by-Step Transition & Execution Plan

| Phase | Milestone | Deliverables |
| :---: | :--- | :--- |
| **Phase 1** | **Supabase Database & RPCs** | Apply PostgreSQL schemas, RLS policies, and stored procedures (`place_auction_bid`, `rollback_player_sale`, `undo_auction_bid`). |
| **Phase 2** | **Web Admin Upgrade** | Build Slot/Set Manager, add Pause/Resume/Stop controls, Rollback buttons, and Force-Sell overrides in `AdminAuctionConsole.jsx`. |
| **Phase 3** | **Web Public Screen** | Build projector-ready Public Screen with active set banners and hammer animations. |
| **Phase 4** | **React Native Expo Mobile App** | Initialize Expo app with Supabase Auth, Live Bidding Room, Quick Bids, Squad view, and Pause Overlays. |
| **Phase 5** | **End-to-End Testing** | Simulate live auction scenarios with multiple mobile owners bidding simultaneously, pausing mid-bid, and executing rollbacks. |
| **Phase 6** | **Trades, Injury Subs & Audit Engine** | Real-time franchise player swaps, dynamic price differential calculations, automated purse re-balancing, injury replacements from unsold pool, and Supabase `transfers` audit persistence. |

---

## 8. Post-Auction Transfers, Trades & Injury Replacements Engine

CricAuction Pro includes a comprehensive post-auction squad management engine:

### 8.1. Franchise Player Trades (`trade`)
- Swaps players between two franchises with dynamic price differential calculation: `|PriceA - PriceB|`.
- Re-balances team purses automatically: debits the team acquiring the higher-priced player and refunds the team receiving the lower-priced player.
- Emits real-time trade logs recorded in Supabase `public.transfers`.

### 8.2. Injury Replacement Window (`injury_replacement`)
- Squad players can be flagged as injured (`status = 'injured'`, `is_injured = true`).
- The franchise receives an immediate purse refund equal to the injured player's acquisition price.
- A replacement player is drafted from the unsold pool (`status = 'sold'`) and their fee is debited from the team's remaining purse.

### 8.3. Injury Recovery & Re-Auction Pool (`injury_recovered`)
- Recovered players can be restored to the unsold pool (`status = 'unsold'`, `is_injured = false`) with 1 click for upcoming accelerated auction rounds.
- Complete audit logging ensures zero financial discrepancies across Web and Mobile.
