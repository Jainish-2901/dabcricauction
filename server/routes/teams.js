const express = require('express');
const router = express.Router();
const { createTeam, getTeamsByTournament, updateTeam, deleteTeam } = require('../controllers/teamController');

router.post('/', createTeam);
router.get('/:tournamentId', getTeamsByTournament);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

module.exports = router;
