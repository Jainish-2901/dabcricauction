const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true }, // Batsman, Bowler, All-Rounder, Wicket Keeper
    stats: {
        matches: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        battingAverage: { type: Number, default: 0.0 },
        bowlingAverage: { type: Number, default: 0.0 }
    },
    basePrice: { type: Number, required: true },
    currentBid: { type: Number, default: 0 },
    soldPrice: { type: Number, default: 0 },
    status: { type: String, enum: ['unsold', 'sold', 'pending', 'bidding'], default: 'pending' },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    soldToTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
    image: String,
    cricHeroesProfileUrl: String,
    order: { type: Number, default: 999 }, // Auction order
    currentLeadTeamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
}, { timestamps: true });

module.exports = mongoose.model('Player', PlayerSchema);
