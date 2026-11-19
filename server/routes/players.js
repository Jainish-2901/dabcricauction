const express = require('express');
const router = express.Router();
const { createPlayer, getPlayersByTournament, importCricHeroesPlayer, updatePlayer, deletePlayer, releasePlayerToPending, manualAssignPlayer } = require('../controllers/playerController');

router.post('/', createPlayer);
router.get('/:tournamentId', getPlayersByTournament);
router.post('/import', importCricHeroesPlayer);
router.put('/:id', updatePlayer);
router.delete('/:id', deletePlayer);
router.post('/:id/release-to-pending', releasePlayerToPending);
router.post('/:id/manual-assign', manualAssignPlayer);

module.exports = router;
