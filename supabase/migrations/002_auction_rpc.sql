-- ==============================================================================
-- CricAuction Pro - Atomic Stored Procedures (RPCs)
-- Migration: 002_auction_rpc.sql
-- ==============================================================================

-- 1. Atomic Bid Placement RPC
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

    -- Lock player row to prevent concurrent race conditions
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF v_player.status NOT IN ('pending', 'bidding') THEN
        RAISE EXCEPTION 'Player is not currently open for bidding';
    END IF;

    IF p_bid_amount <= COALESCE(v_player.current_bid, v_player.base_price - 1) THEN
        RAISE EXCEPTION 'Bid amount must be strictly higher than current bid';
    END IF;

    -- Check team purse budget (1 Large Unit = 100 Small Units)
    SELECT * INTO v_team FROM teams WHERE id = p_team_id;
    IF (v_team.budget - v_team.spent) < (p_bid_amount / 100.0) THEN
        RAISE EXCEPTION 'Insufficient purse budget remaining';
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

    -- Update Player state
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Atomic Finalize Sale RPC
CREATE OR REPLACE FUNCTION sell_player(
    p_tournament_id UUID,
    p_player_id UUID,
    p_team_id UUID,
    p_sold_price NUMERIC
) RETURNS JSONB AS $$
DECLARE
    v_player RECORD;
    v_team RECORD;
BEGIN
    SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
    IF v_player.status = 'sold' THEN
        RAISE EXCEPTION 'Player has already been marked as sold';
    END IF;

    SELECT * INTO v_team FROM teams WHERE id = p_team_id FOR UPDATE;
    IF (v_team.budget - v_team.spent) < (p_sold_price / 100.0) THEN
        RAISE EXCEPTION 'Team does not have enough budget to finalize this sale';
    END IF;

    -- Update team spent purse (1 Large Unit = 100 Small Units)
    UPDATE teams 
    SET spent = spent + (p_sold_price / 100.0),
        updated_at = NOW()
    WHERE id = p_team_id;

    -- Update player
    UPDATE players 
    SET status = 'sold',
        sold_to_team_id = p_team_id,
        sold_price = p_sold_price,
        current_bid = p_sold_price,
        current_lead_team_id = p_team_id,
        updated_at = NOW()
    WHERE id = p_player_id;

    -- Record in Audit Log
    INSERT INTO auction_action_logs (
        tournament_id, player_id, action,
        sold_price, sold_team_id
    ) VALUES (
        p_tournament_id, p_player_id, 'PLAYER_SOLD',
        p_sold_price, p_team_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'playerId', p_player_id,
        'teamId', p_team_id,
        'soldPrice', p_sold_price
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atomic Rollback Player Sale RPC (Re-Auction Engine)
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

    -- 1. Refund Team Spent Purse (1 Large Unit = 100 Small Units)
    UPDATE teams 
    SET spent = spent - (v_sold_price / 100.0),
        updated_at = NOW()
    WHERE id = v_sold_team_id;

    -- 2. Restore Player to Active Bidding state
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
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Atomic Undo Last Bid RPC
CREATE OR REPLACE FUNCTION undo_last_bid(
    p_tournament_id UUID,
    p_player_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_last_log RECORD;
    v_reverted_bid NUMERIC;
    v_reverted_team_id UUID;
BEGIN
    -- Fetch the last valid bid action
    SELECT * INTO v_last_log 
    FROM auction_action_logs 
    WHERE tournament_id = p_tournament_id 
      AND player_id = p_player_id 
      AND action = 'BID_PLACED' 
      AND reverted = FALSE
    ORDER BY created_at DESC 
    LIMIT 1;

    IF v_last_log.id IS NULL THEN
        RAISE EXCEPTION 'No recent bid found to undo';
    END IF;

    -- Mark that action log as reverted
    UPDATE auction_action_logs 
    SET reverted = TRUE 
    WHERE id = v_last_log.id;

    -- Get previous bid parameters
    v_reverted_bid := COALESCE(v_last_log.previous_bid, 0);
    v_reverted_team_id := v_last_log.previous_lead_team_id;

    -- Restore player
    UPDATE players 
    SET current_bid = v_reverted_bid,
        current_lead_team_id = v_reverted_team_id,
        status = CASE WHEN v_reverted_bid > 0 THEN 'bidding' ELSE 'pending' END,
        updated_at = NOW()
    WHERE id = p_player_id;

    -- Log the undo action
    INSERT INTO auction_action_logs (
        tournament_id, player_id, action,
        previous_bid, previous_lead_team_id,
        new_bid, new_lead_team_id
    ) VALUES (
        p_tournament_id, p_player_id, 'BID_UNDONE',
        v_last_log.new_bid, v_last_log.new_lead_team_id,
        v_reverted_bid, v_reverted_team_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'playerId', p_player_id,
        'restoredBid', v_reverted_bid,
        'restoredLeadTeamId', v_reverted_team_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

