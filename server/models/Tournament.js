const mongoose = require('mongoose');

const TournamentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    startDate: Date,
    time: String,
    endDate: Date,
    squadSizeLimit: { type: Number, default: 25 },
    status: { type: String, enum: ['upcoming', 'live', 'completed', 'paused'], default: 'upcoming' },
    auctioneerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBiddingPlayerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    logo: String,
    banner: String,
    themeColor: { type: String, default: '#3b82f6' },
    auctionType: { type: String, enum: ['admin_driven', 'owner_driven'], default: 'owner_driven' },
}, { timestamps: true });

module.exports = mongoose.model('Tournament', TournamentSchema);
