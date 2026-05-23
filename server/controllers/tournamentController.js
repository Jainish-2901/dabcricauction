const Tournament = require('../models/Tournament');

const createTournament = async (req, res) => {
    try {
        const tournament = await Tournament.create(req.body);
        res.status(201).json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ createdAt: -1 });
        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournamentById = async (req, res) => {
    try {
        const tournament = await Tournament.findById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTournament = async (req, res) => {
    try {
        const tournament = await Tournament.findByIdAndDelete(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json({ message: 'Tournament deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createTournament, getTournaments, getTournamentById, updateTournament, deleteTournament };
