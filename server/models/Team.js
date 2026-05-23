const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    shortName: String,
    logo: String,
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    budget: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }]
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);
