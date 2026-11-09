const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Middleware to check if Supabase is connected
const checkSupabase = (req, res, next) => {
    if (!supabase) {
        return res.status(503).json({
            message: 'Supabase is not configured on the server. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env'
        });
    }
    next();
};

// 1. Get Tournaments from Supabase
router.get('/tournaments', checkSupabase, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*, slots(*), teams(*)')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Atomic Place Bid via Supabase RPC
router.post('/bids', checkSupabase, async (req, res) => {
    const { tournamentId, playerId, teamId, bidAmount } = req.body;
    try {
        const { data, error } = await supabase.rpc('place_auction_bid', {
            p_tournament_id: tournamentId,
            p_player_id: playerId,
            p_team_id: teamId,
            p_bid_amount: Number(bidAmount)
        });

        if (error) throw error;

        // Broadcast via Socket.io if active
        const io = req.app.get('socketio');
        if (io) {
            io.to(tournamentId).emit('bid_update', {
                playerId,
                amount: Number(bidAmount),
                team: { _id: teamId }
            });
        }

        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 3. Atomic Finalize Sale via Supabase RPC
router.post('/sell', checkSupabase, async (req, res) => {
    const { tournamentId, playerId, teamId, soldPrice } = req.body;
    try {
        const { data, error } = await supabase.rpc('sell_player', {
            p_tournament_id: tournamentId,
            p_player_id: playerId,
            p_team_id: teamId,
            p_sold_price: Number(soldPrice)
        });

        if (error) throw error;

        const io = req.app.get('socketio');
        if (io) {
            io.to(tournamentId).emit('player_sold', {
                player: { _id: playerId, soldPrice },
                team: { _id: teamId }
            });
        }

        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 4. Atomic Rollback Player Sale via Supabase RPC
router.post('/rollback-sale', checkSupabase, async (req, res) => {
    const { tournamentId, playerId } = req.body;
    try {
        const { data, error } = await supabase.rpc('rollback_player_sale', {
            p_tournament_id: tournamentId,
            p_player_id: playerId
        });

        if (error) throw error;

        const io = req.app.get('socketio');
        if (io) {
            io.to(tournamentId).emit('sale_rolled_back', {
                player: { _id: playerId },
                refundedTeamId: data.refundedTeamId,
                refundedAmount: data.refundedPrice
            });
        }

        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// 5. Atomic Undo Last Bid via Supabase RPC
router.post('/undo-bid', checkSupabase, async (req, res) => {
    const { tournamentId, playerId } = req.body;
    try {
        const { data, error } = await supabase.rpc('undo_last_bid', {
            p_tournament_id: tournamentId,
            p_player_id: playerId
        });

        if (error) throw error;

        const io = req.app.get('socketio');
        if (io) {
            io.to(tournamentId).emit('bid_undone', {
                playerId,
                currentBid: data.restoredBid,
                leadTeam: data.restoredLeadTeamId ? { _id: data.restoredLeadTeamId } : null
            });
        }

        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;

