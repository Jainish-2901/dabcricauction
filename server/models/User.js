const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['superadmin', 'auctioneer', 'team_owner'],
        default: 'team_owner'
    },
    // If user is restricted to a specific tournament (e.g. team owner / auctioneer of one tournament)
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    // If user is a team owner, link them to a specific team
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
