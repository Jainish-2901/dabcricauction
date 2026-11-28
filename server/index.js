const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require("socket.io");
const db = require('./services/dbService');
const supabase = require('./config/supabase');
const registerVoiceHandlers = require('./voice/voiceSocket');

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Trusted origins for CORS
const allowedOrigins = [
    'https://dabcricauction.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5001',
    process.env.CLIENT_URL,
    process.env.APP_URL
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingInterval: 20000,
    pingTimeout: 25000,
    transports: ['websocket', 'polling']
});

// Security HTTP Headers (Helmet)
app.disable('x-powered-by');
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false // Allows dynamic assets, web fonts and mobile web views
}));

// CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
            callback(null, true);
        } else {
            callback(null, true); // Allow during transition but validated
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Input sanitization middleware: strip dangerous <script> tags from string fields
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        const sanitizeObj = (obj) => {
            for (const key of Object.keys(obj)) {
                if (typeof obj[key] === 'string') {
                    obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                } else if (obj[key] && typeof obj[key] === 'object') {
                    sanitizeObj(obj[key]);
                }
            }
        };
        sanitizeObj(req.body);
    }
    next();
});

// Rate Limiting Layers
const generalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 600, // 600 requests per 15 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this network. Please try again after 15 minutes.' }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 25, // 25 attempts per 15 minutes
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login or authentication attempts. Please try again after 15 minutes.' }
});

const playerRegLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 40, // 40 submissions per hour per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Registration submission limit reached for this network. Please try again later.' }
});

app.use('/api', generalApiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api/tournaments/:id/register-player', playerRegLimiter);

// Root Health Check Route
app.get('/', (req, res) => {
    res.json({
        message: 'Dab Cric Auction API Server is Running!',
        status: 'healthy',
        database: 'Supabase + Unified DB Service',
        supabaseConnected: !!supabase,
        frontendUrl: process.env.CLIENT_URL || 'https://dabcricauction.vercel.app',
        endpoints: {
            auth: '/api/auth',
            tournaments: '/api/tournaments',
            players: '/api/players',
            teams: '/api/teams',
            supabase: '/api/supabase'
        }
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        timestamp: Date.now()
    });
});

// Routes connections
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/supabase', require('./routes/supabaseRoutes'));
app.use('/api/upload', require('./routes/upload'));

// Centralized Error Handling Middleware (prevents server crashes and leaks)
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'An internal server error occurred.' 
            : err.message || 'Internal Server Error'
    });
});

const PORT = process.env.PORT || 5001;

// Active 10-second countdown timers for last bids (shared across all socket connections)
const finalBidTimers = {};
// Anti-spam bid cooldown tracker (per socket connection)
const socketBidCooldown = new Map();

// Socket.io logic
io.on('connection', (socket) => {
    console.log('User connected to socket:', socket.id);

    // Modular WebRTC voice signaling & moderation handlers
    registerVoiceHandlers(io, socket);

    socket.on('join_auction', (tournamentId) => {
        socket.join(tournamentId);
    });

    socket.on('start_auction', async ({ tournamentId, activeSlotId, slotDrawMode }) => {
        try {
            const updateData = {
                status: 'live',
                biddingState: 'active'
            };
            if (activeSlotId !== undefined) {
                updateData.activeSlotId = activeSlotId;
            }
            if (slotDrawMode !== undefined) {
                updateData.slotDrawMode = slotDrawMode;
            }
            const tournament = await db.updateTournament(tournamentId, updateData);
            io.to(tournamentId).emit('auction_status_changed', {
                status: 'live',
                biddingState: 'active',
                tournament
            });
            io.to(tournamentId).emit('bidding_state_changed', { state: 'active' });
            if (activeSlotId !== undefined || slotDrawMode !== undefined) {
                io.to(tournamentId).emit('slot_changed', {
                    activeSlotId: tournament.activeSlotId,
                    slotDrawMode: tournament.slotDrawMode || slotDrawMode || 'order',
                    tournament
                });
            }
        } catch (e) {
            console.error('start_auction error:', e);
        }
    });

    socket.on('end_auction', async ({ tournamentId }) => {
        try {
            const tournament = await db.updateTournament(tournamentId, {
                status: 'completed',
                biddingState: 'stopped',
                activeSlotId: null
            });
            io.to(tournamentId).emit('auction_ended', { tournamentId, tournament });
            io.to(tournamentId).emit('auction_status_changed', {
                status: 'completed',
                biddingState: 'stopped',
                tournament
            });
            io.to(tournamentId).emit('bidding_state_changed', { state: 'stopped' });
        } catch (e) {
            console.error('end_auction error:', e);
        }
    });

    socket.on('set_active_slot', async ({ tournamentId, slotId, slotDrawMode }) => {
        try {
            const updateObj = {
                activeSlotId: slotId || null
            };
            if (slotDrawMode !== undefined) {
                updateObj.slotDrawMode = slotDrawMode;
            }
            const tournament = await db.updateTournament(tournamentId, updateObj);
            io.to(tournamentId).emit('slot_changed', {
                activeSlotId: slotId || null,
                slotDrawMode: tournament.slotDrawMode || slotDrawMode || 'order',
                tournament
            });
            io.to(tournamentId).emit('auction_status_changed', {
                tournament
            });
        } catch (e) {
            console.error('set_active_slot error:', e);
        }
    });

    socket.on('bring_unsold_to_auction', async ({ tournamentId }, callback) => {
        try {
            const result = await db.bringUnsoldPlayersToAuction(tournamentId);
            const tournament = await db.getTournamentById(tournamentId);
            io.to(tournamentId).emit('unsold_reopened_to_slot', result);
            io.to(tournamentId).emit('slot_changed', {
                activeSlotId: result.unsoldSlot._id,
                tournament
            });
            io.to(tournamentId).emit('auction_status_changed', {
                tournament,
                biddingState: 'active'
            });
            if (typeof callback === 'function') {
                callback({ success: true, ...result });
            }
        } catch (e) {
            console.error('bring_unsold_to_auction error:', e);
            if (typeof callback === 'function') {
                callback({ success: false, error: e.message });
            }
        }
    });

    socket.on('place_bid', async (data) => {
        try {
            // Anti-spam bid rate limiting: 200ms minimum interval between bids per socket
            const now = Date.now();
            const lastBidTime = socketBidCooldown.get(socket.id) || 0;
            if (now - lastBidTime < 200) {
                socket.emit('bid_error', {
                    message: 'Bids placed too rapidly. Please wait a moment.'
                });
                return;
            }
            socketBidCooldown.set(socket.id, now);

            let { playerId, tournamentId, bidAmount, teamId, amount } = data;
            const finalBidAmount = Number(bidAmount !== undefined ? bidAmount : amount);
            if (!playerId && tournamentId) {
                const tourney = await db.getTournamentById(tournamentId);
                playerId = tourney?.currentBiddingPlayerId;
            }
            if (!playerId) return;

            const player = await db.getPlayerById(playerId);
            if (!player) return;

            const team = await db.getTeamById(teamId);

            // Squad limit check: Enforce Admin-fixed squad size limit
            if (team && tournamentId) {
                const tournament = await db.getTournamentById(tournamentId);
                const maxSquadLimit = tournament?.squadSizeLimit ? Number(tournament.squadSizeLimit) : 25;
                const currentSquad = (team.players || []).length;
                if (currentSquad >= maxSquadLimit) {
                    socket.emit('bid_error', {
                        message: `${team.name} has reached the maximum squad limit of ${maxSquadLimit} players fixed by admin!`
                    });
                    return;
                }
            }

            // If a 10-second countdown timer was running, cancel it immediately when a new bid arrives!
            if (tournamentId && finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
                io.to(tournamentId).emit('timer_cancelled', {
                    reason: 'new_bid',
                    amount: finalBidAmount,
                    team: team || { _id: teamId, name: 'Bidder' }
                });
            }

            player.currentBid = finalBidAmount;
            player.current_bid = finalBidAmount;
            player.currentLeadTeamId = team || { _id: teamId, name: 'Bidder' };
            player.status = 'bidding';
            await db.updatePlayer(playerId, player);

            // Persist bid record to database ledger
            const bidTimestamp = new Date().toISOString();
            const bidLog = {
                _id: 'bid_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                tournamentId,
                playerId,
                teamId,
                teamName: team?.name || 'Bidder',
                teamLogo: team?.logo || '',
                teamShortName: team?.shortName || '',
                bidAmount: finalBidAmount,
                createdAt: bidTimestamp
            };
            await db.recordBid(bidLog);

            io.to(tournamentId).emit('bid_update', {
                playerId,
                amount: finalBidAmount,
                team: player.currentLeadTeamId,
                timestamp: bidTimestamp,
                bidId: bidLog._id
            });
        } catch (e) {
            console.error('place_bid error:', e);
        }
    });

    socket.on('sell_player', async (data) => {
        try {
            let { playerId, tournamentId, teamId, soldPrice, bidAmount } = data;
            if (tournamentId && finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
            }
            if (!playerId && tournamentId) {
                const tourney = await db.getTournamentById(tournamentId);
                playerId = tourney?.currentBiddingPlayerId;
            }
            if (!playerId) return;

            const player = await db.getPlayerById(playerId);
            if (!player) return;

            const leadTeamId = (player.currentLeadTeamId?._id || player.currentLeadTeamId) || teamId;
            if (!leadTeamId) return;

            const team = await db.getTeamById(leadTeamId);
            if (!team) return;

            // Squad limit check: Enforce Admin-fixed squad size limit before finalizing sale
            if (tournamentId) {
                const tournament = await db.getTournamentById(tournamentId);
                const maxSquadLimit = tournament?.squadSizeLimit ? Number(tournament.squadSizeLimit) : 25;
                const currentSquad = (team.players || []).length;
                if (currentSquad >= maxSquadLimit) {
                    socket.emit('auction_error', {
                        message: `Cannot sell player: ${team.name} has already reached the maximum squad limit of ${maxSquadLimit} players fixed by admin!`
                    });
                    return;
                }
            }

            const explicitPrice = Number(soldPrice !== undefined ? soldPrice : bidAmount);
            const winningBid = explicitPrice > 0
                ? explicitPrice
                : (Number(player.currentBid) > 0 ? Number(player.currentBid) : (Number(player.basePrice) || 0));

            // 1. Mark player as sold first so calculations can find soldPrice immediately
            player.status = 'sold';
            player.soldToTeamId = team._id;
            player.soldToTeamName = team.name;
            player.soldPrice = winningBid;
            player.sold_price = winningBid;
            player.currentBid = winningBid;
            player.current_bid = winningBid;

            // If player was in re-auction unsold slot, restore slotId to category slot
            if (player.slotId && (String(player.slotId).includes('slot_unsold_') || player.isReAuction)) {
                if (player.originalSlotId) {
                    player.slotId = player.originalSlotId;
                } else if (tournamentId) {
                    const allSlots = await db.getTournamentSlots(tournamentId);
                    const matchingSlot = (allSlots || []).find(s => s.role === player.category || s.name?.toLowerCase().includes(player.category?.toLowerCase()));
                    if (matchingSlot) {
                        player.slotId = matchingSlot._id;
                    }
                }
            }
            await db.updatePlayer(playerId, player);

            // 2. Add player to team squad and recalculate spent purse
            if (!team.players) team.players = [];
            if (!team.players.includes(player._id)) team.players.push(player._id);
            await db.recalculateTeamSpent(team._id);
            const updatedTeam = await db.getTeamById(team._id);

            io.to(tournamentId).emit('player_sold', {
                player,
                team: updatedTeam || team
            });
            io.to(tournamentId).emit('team_updated', {
                team: updatedTeam || team
            });
        } catch (e) {
            console.error('sell_player error:', e);
        }
    });

    socket.on('manual_sell_player', async (data, callback) => {
        try {
            const { tournamentId, playerId, teamId, soldPrice } = data;
            const result = await db.manualAssignPlayer(tournamentId, playerId, teamId, soldPrice);

            io.to(tournamentId).emit('player_sold', {
                player: result.player,
                team: result.team,
                soldPrice: result.soldPrice
            });
            io.to(tournamentId).emit('team_updated', { team: result.team });
            io.to(tournamentId).emit('player_updated', result.player);

            if (typeof callback === 'function') {
                callback({ success: true, ...result });
            }
        } catch (e) {
            console.error('manual_sell_player error:', e);
            if (typeof callback === 'function') {
                callback({ success: false, error: e.message });
            }
            socket.emit('auction_error', { message: e.message });
        }
    });

    socket.on('mark_unsold', async (data) => {
        try {
            const { playerId, tournamentId } = data;
            if (tournamentId && finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
            }
            const player = await db.getPlayerById(playerId);
            if (!player) return;

            player.status = 'unsold';
            player.currentLeadTeamId = null;
            await db.updatePlayer(playerId, player);

            io.to(tournamentId).emit('player_unsold', { player });
        } catch (e) {
            console.error('mark_unsold error:', e);
        }
    });

    socket.on('pass_player', async ({ tournamentId, playerId }) => {
        try {
            if (tournamentId && finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
            }
            const player = await db.getPlayerById(playerId);
            if (!player || player.status === 'sold' || player.status === 'unsold') return;

            player.status = 'passed';
            player.currentLeadTeamId = null;
            player.currentBid = player.basePrice || 0;
            await db.updatePlayer(playerId, player);

            io.to(tournamentId).emit('player_passed', { player });
        } catch (e) {
            console.error('pass_player error:', e);
        }
    });

    socket.on('reopen_passed_to_auction', async ({ tournamentId }, callback) => {
        try {
            const result = await db.reopenPassedPlayers(tournamentId);
            io.to(tournamentId).emit('passed_reopened', result);
            if (typeof callback === 'function') callback({ success: true, ...result });
        } catch (e) {
            console.error('reopen_passed_to_auction error:', e);
            if (typeof callback === 'function') callback({ success: false, error: e.message });
        }
    });

    socket.on('set_bidding_state', async ({ tournamentId, state, activeSlotId }) => {
        try {
            // state can be: 'active', 'paused', 'break', 'stopped'
            const statusUpdate = state === 'stopped' ? 'upcoming' : (state === 'paused' || state === 'break') ? 'paused' : 'live';
            const updateData = {
                biddingState: state,
                status: statusUpdate
            };
            if (activeSlotId !== undefined) {
                updateData.activeSlotId = activeSlotId;
            }
            const tournament = await db.updateTournament(tournamentId, updateData);
            io.to(tournamentId).emit('bidding_state_changed', { state });
            io.to(tournamentId).emit('auction_status_changed', {
                status: statusUpdate,
                biddingState: state,
                tournament
            });
            if (activeSlotId !== undefined) {
                io.to(tournamentId).emit('slot_changed', { activeSlotId, tournament });
            }
        } catch (err) {
            console.error('set_bidding_state error:', err);
        }
    });

    socket.on('rollback_sale', async ({ tournamentId, playerId }) => {
        try {
            const player = await db.getPlayerById(playerId);
            if (!player || player.status !== 'sold') return;

            const soldTeamId = player.soldToTeamId;
            const soldPrice = Number(player.soldPrice || player.currentBid || player.basePrice) || 0;

            if (soldTeamId) {
                const team = await db.getTeamById(soldTeamId);
                if (team) {
                    const refundInCrores = Number((soldPrice / 100).toFixed(2));
                    team.spent = Number(Math.max(0, (team.spent || 0) - refundInCrores).toFixed(2));
                    team.players = (team.players || []).filter(p => p !== playerId);
                    await db.updateTeam(team._id, team);
                    io.to(tournamentId).emit('team_updated', { team });
                }
            }

            player.status = 'bidding';
            player.soldToTeamId = null;
            player.soldToTeamName = null;
            player.soldPrice = 0;
            await db.updatePlayer(playerId, player);

            io.to(tournamentId).emit('sale_rolled_back', {
                player,
                refundedTeamId: soldTeamId,
                refundedAmount: soldPrice
            });
        } catch (err) {
            console.error('rollback_sale error:', err);
        }
    });

    socket.on('release_player_to_pending', async ({ tournamentId, playerId, teamId, targetStatus = 'unsold' }) => {
        try {
            if (!playerId) return;
            const player = await db.getPlayerById(playerId);
            if (!player) return;

            if (player.isCaptain || String(player._id || '').startsWith('pl_cap_') || String(player._id || '').startsWith('owner_cap_')) {
                socket.emit('auction_error', { message: 'Retained Captain cannot be removed from team.' });
                return;
            }

            const result = await db.releasePlayerToPending(tournamentId, playerId, teamId, targetStatus);

            io.to(tournamentId).emit('player_released_to_pending', {
                player: result.player,
                team: result.team,
                teamId: result.team?._id,
                refundedAmount: result.refundedAmount,
                message: `${result.player.name} was removed from ${result.team?.name || 'team'} and moved to ${result.player.status === 'unsold' ? 'Unsold' : 'Pending'} pool.`
            });
            if (result.team) {
                io.to(tournamentId).emit('team_updated', { team: result.team });
            }
            io.to(tournamentId).emit('player_updated', result.player);
        } catch (err) {
            console.error('release_player_to_pending error:', err);
            socket.emit('auction_error', { message: 'Failed to release player: ' + err.message });
        }
    });

    socket.on('undo_last_bid', async ({ tournamentId, playerId }) => {
        try {
            if (!tournamentId) return;
            if (!playerId) {
                const tourney = await db.getTournamentById(tournamentId);
                playerId = tourney?.currentBiddingPlayerId;
            }
            if (!playerId) return;

            const player = await db.getPlayerById(playerId);
            if (!player) return;

            // Immediately cancel final countdown timer if running so player is not accidentally sold
            if (tournamentId && finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
                io.to(tournamentId).emit('timer_cancelled', {
                    reason: 'undo_bid',
                    player
                });
            }

            // Fetch bids recorded for this player (ordered by created_at desc, index 0 is latest bid)
            const recentBids = await db.getBids(tournamentId, playerId);

            if (recentBids && recentBids.length > 0) {
                const erasedBid = recentBids[0];
                await db.deleteBid(erasedBid._id, tournamentId, playerId);

                const previousBid = recentBids[1];
                if (previousBid) {
                    const prevTeam = await db.getTeamById(previousBid.teamId);
                    const restoredBid = Number(previousBid.bidAmount);
                    player.currentBid = restoredBid;
                    player.current_bid = restoredBid;
                    player.currentLeadTeamId = prevTeam || {
                        _id: previousBid.teamId,
                        name: previousBid.teamName,
                        logo: previousBid.teamLogo || '',
                        shortName: previousBid.teamShortName || ''
                    };
                } else {
                    const defaultBase = Number(player.basePrice) >= 0 ? Number(player.basePrice) : 0;
                    player.currentBid = defaultBase;
                    player.current_bid = defaultBase;
                    player.currentLeadTeamId = null;
                }
            } else {
                const defaultBase = Number(player.basePrice) >= 0 ? Number(player.basePrice) : 0;
                player.currentBid = defaultBase;
                player.current_bid = defaultBase;
                player.currentLeadTeamId = null;
            }

            await db.updatePlayer(playerId, player);

            const updatedBids = await db.getBids(tournamentId, playerId);

            io.to(tournamentId).emit('bid_undone', {
                playerId: player._id,
                currentBid: player.currentBid,
                leadTeam: player.currentLeadTeamId,
                bids: updatedBids,
                message: `Erased last bid. Bidding reverted to ₹${player.currentBid}.`
            });
        } catch (err) {
            console.error('undo_last_bid error:', err);
        }
    });

    socket.on('select_player', async ({ tournamentId, playerId }) => {
        try {
            const tournament = await db.getTournamentById(tournamentId);
            const updateObj = { currentBiddingPlayerId: playerId };
            let statusChanged = false;
            if (tournament && (tournament.status === 'upcoming' || tournament.biddingState === 'stopped')) {
                updateObj.status = 'live';
                updateObj.biddingState = 'active';
                statusChanged = true;
            }
            const updatedT = await db.updateTournament(tournamentId, updateObj);
            const player = await db.getPlayerById(playerId);
            if (player) {
                player.status = 'bidding';
                await db.updatePlayer(playerId, player);
            }
            if (statusChanged && updatedT) {
                io.to(tournamentId).emit('auction_status_changed', {
                    status: updatedT.status,
                    biddingState: updatedT.biddingState,
                    tournament: updatedT
                });
                io.to(tournamentId).emit('bidding_state_changed', { state: updatedT.biddingState });
            }
            io.to(tournamentId).emit('new_player', player);
        } catch (err) {
            console.error('select_player error:', err);
        }
    });

    // --- 10-SECOND FINAL COUNTDOWN TIMER TRIGGER (Going Once, Going Twice...) ---
    socket.on('trigger_final_countdown', async ({ tournamentId, playerId }) => {
        try {
            if (finalBidTimers[tournamentId]) {
                clearInterval(finalBidTimers[tournamentId].interval);
                delete finalBidTimers[tournamentId];
            }

            let targetPlayerId = playerId;
            if (!targetPlayerId) {
                const allPlayers = await db.getPlayers(tournamentId);
                const activeP = (allPlayers || []).find(p => p.status === 'pending');
                if (activeP) targetPlayerId = activeP._id;
            }

            const player = targetPlayerId ? await db.getPlayerById(targetPlayerId) : null;
            if (!player) {
                console.warn('trigger_final_countdown: No player found for tournament', tournamentId);
                return;
            }

            let timeLeft = 10;

            io.to(tournamentId).emit('timer_tick', {
                timeLeft: 10,
                duration: 10,
                status: 'running',
                playerId: targetPlayerId,
                leadTeam: player.currentLeadTeamId,
                currentBid: player.currentBid || player.basePrice
            });

            const interval = setInterval(async () => {
                timeLeft -= 1;

                if (timeLeft > 0) {
                    io.to(tournamentId).emit('timer_tick', {
                        timeLeft,
                        duration: 10,
                        status: 'running',
                        playerId: targetPlayerId
                    });
                } else {
                    // 10 SECONDS EXPIRED WITH NO NEW BIDS!
                    clearInterval(interval);
                    delete finalBidTimers[tournamentId];

                    io.to(tournamentId).emit('timer_tick', {
                        timeLeft: 0,
                        duration: 10,
                        status: 'expired',
                        playerId: targetPlayerId
                    });

                    // Auto-sell to the highest bidding team, or mark unsold if no bids
                    const freshPlayer = await db.getPlayerById(targetPlayerId);
                    if (!freshPlayer) return;

                    if (freshPlayer.currentLeadTeamId) {
                        const leadTeamId = freshPlayer.currentLeadTeamId._id || freshPlayer.currentLeadTeamId;
                        const team = await db.getTeamById(leadTeamId);
                        if (team) {
                            const winningBid = Number(freshPlayer.currentBid) > 0 ? Number(freshPlayer.currentBid) : (Number(freshPlayer.basePrice) || 0);
                            const autoSoldInCrores = Number((winningBid / 100).toFixed(2));
                            team.spent = Number(((team.spent || 0) + autoSoldInCrores).toFixed(2));
                            if (!team.players) team.players = [];
                            if (!team.players.includes(freshPlayer._id)) team.players.push(freshPlayer._id);
                            await db.updateTeam(team._id, team);

                            freshPlayer.status = 'sold';
                            freshPlayer.soldToTeamId = team._id;
                            freshPlayer.soldToTeamName = team.name;
                            freshPlayer.soldPrice = winningBid;
                            freshPlayer.sold_price = winningBid;
                            freshPlayer.currentBid = winningBid;
                            freshPlayer.current_bid = winningBid;

                            // If player was in re-auction unsold slot, restore slotId to category slot
                            if (freshPlayer.slotId && (String(freshPlayer.slotId).includes('slot_unsold_') || freshPlayer.isReAuction)) {
                                if (freshPlayer.originalSlotId) {
                                    freshPlayer.slotId = freshPlayer.originalSlotId;
                                } else if (tournamentId) {
                                    const allSlots = await db.getTournamentSlots(tournamentId);
                                    const matchingSlot = (allSlots || []).find(s => s.role === freshPlayer.category || s.name?.toLowerCase().includes(freshPlayer.category?.toLowerCase()));
                                    if (matchingSlot) {
                                        freshPlayer.slotId = matchingSlot._id;
                                    }
                                }
                            }
                            await db.updatePlayer(targetPlayerId, freshPlayer);

                            io.to(tournamentId).emit('player_sold', {
                                player: freshPlayer,
                                team
                            });
                            io.to(tournamentId).emit('team_updated', {
                                team
                            });
                            io.to(tournamentId).emit('timer_completed', {
                                outcome: 'sold',
                                player: freshPlayer,
                                team
                            });
                        }
                    } else {
                        // Mark unsold
                        freshPlayer.status = 'unsold';
                        freshPlayer.currentLeadTeamId = null;
                        await db.updatePlayer(targetPlayerId, freshPlayer);

                        io.to(tournamentId).emit('player_unsold', { player: freshPlayer });
                        io.to(tournamentId).emit('timer_completed', {
                            outcome: 'unsold',
                            player: freshPlayer
                        });
                    }
                }
            }, 1000);

            finalBidTimers[tournamentId] = { interval, playerId: targetPlayerId };
        } catch (err) {
            console.error('trigger_final_countdown error:', err);
        }
    });

    socket.on('cancel_final_countdown', ({ tournamentId }) => {
        if (finalBidTimers[tournamentId]) {
            clearInterval(finalBidTimers[tournamentId].interval);
            delete finalBidTimers[tournamentId];
            io.to(tournamentId).emit('timer_cancelled', {
                reason: 'cancelled_by_admin'
            });
        }
    });

    // Synchronized General Auction Timers
    const auctionTimers = {};

    socket.on('start_timer', ({ tournamentId, duration = 15 }) => {
        if (auctionTimers[tournamentId]) {
            clearInterval(auctionTimers[tournamentId]);
        }

        let timeLeft = duration;
        io.to(tournamentId).emit('timer_tick', { timeLeft, status: 'running' });

        auctionTimers[tournamentId] = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
                clearInterval(auctionTimers[tournamentId]);
                delete auctionTimers[tournamentId];
                io.to(tournamentId).emit('timer_tick', { timeLeft: 0, status: 'expired' });
            } else {
                io.to(tournamentId).emit('timer_tick', { timeLeft, status: 'running' });
            }
        }, 1000);
    });

    socket.on('stop_timer', ({ tournamentId }) => {
        if (auctionTimers[tournamentId]) {
            clearInterval(auctionTimers[tournamentId]);
            delete auctionTimers[tournamentId];
            io.to(tournamentId).emit('timer_tick', { timeLeft: 0, status: 'stopped' });
        }
    });

    socket.on('disconnect', () => {
        socketBidCooldown.delete(socket.id);
    });
});

app.set('socketio', io);

// Global Error Handler guaranteeing JSON responses instead of Express HTML error pages
app.use((err, req, res, next) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Uploaded file is too large. Please select a smaller photo.' });
    }
    console.error('Express request error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Initial direct hydration from Supabase Cloud DB before accepting traffic
const startServer = async () => {
    try {
        if (typeof db.init === 'function') {
            await db.init();
        }
    } catch (err) {
        console.warn('⚠️ Notice: DB initialization hydration skipped:', err.message);
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`⚡ Dab Cric Auction Server running on http://0.0.0.0:${PORT} (LAN accessible)`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use. Please terminate the process using port ${PORT} or check running instances.`);
        } else {
            console.error('Server error:', err);
        }
    });
};

startServer();
