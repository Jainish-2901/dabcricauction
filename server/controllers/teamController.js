const Team = require('../models/Team');

const createTeam = async (req, res) => {
    try {
        const team = await Team.create(req.body);
        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTeamsByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const teams = await Team.find({ tournamentId }).populate('ownerId');
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createTeam, getTeamsByTournament, updateTeam, deleteTeam };
