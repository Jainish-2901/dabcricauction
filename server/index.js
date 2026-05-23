const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

app.use(cors());
app.use(express.json());

// Routes connections
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/players', require('./routes/players'));
app.use('/api/teams', require('./routes/teams'));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cricket_auction';

mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.log(err));

// Socket.io logic
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_auction', (tournamentId) => {
        socket.join(tournamentId);
        console.log(`User ${socket.id} joined auction: ${tournamentId}`);
    });

    const Player = require('./models/Player');
    const Team = require('./models/Team');

    socket.on('place_bid', async (data) => {
        try {
            const { playerId, tournamentId, bidAmount, teamId } = data;

            const player = await Player.findById(playerId);
            if (!player) return;

            // Optional: Check if bid is valid (greater than current)
            if (bidAmount <= player.currentBid) {
                // socket.emit('error', 'Bid must be higher');
                return;
            }

            player.currentBid = bidAmount;
            player.currentLeadTeamId = teamId;
            player.status = 'bidding';
            await player.save();

            // Populate logic if you want team name etc
            const updatedPlayer = await Player.findById(playerId).populate('currentLeadTeamId');

            io.to(tournamentId).emit('bid_update', {
                playerId,
                amount: bidAmount,
                team: updatedPlayer.currentLeadTeamId
            });
        } catch (e) {
            console.error(e);
        }
    });

    socket.on('sell_player', async (data) => {
        try {
            const { playerId, tournamentId } = data;

            const player = await Player.findById(playerId);
            if (!player || !player.currentLeadTeamId) return;

            const team = await Team.findById(player.currentLeadTeamId);
            if (!team) return;

            // Transaction
            if (team.budget < player.currentBid) {
                // In real world, handle error. For now, assume validation happened before bid
            }

            team.budget -= player.currentBid;
            team.spent += player.currentBid;
            team.players.push(player._id);
            await team.save();

            player.status = 'sold';
            player.soldToTeamId = team._id;
            player.soldPrice = player.currentBid;
            await player.save();

            io.to(tournamentId).emit('player_sold', {
                player,
                team
            });

        } catch (e) {
            console.error(e);
        }
    });

    socket.on('select_player', async ({ tournamentId, playerId }) => {
        const Tournament = require('./models/Tournament');
        const Player = require('./models/Player');
        try {
            await Tournament.findByIdAndUpdate(tournamentId, { currentBiddingPlayerId: playerId });
            const player = await Player.findById(playerId);
            io.to(tournamentId).emit('new_player', player);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Make io accessible in routes
app.set('socketio', io);

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
