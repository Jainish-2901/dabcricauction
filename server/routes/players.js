const express = require('express');
const router = express.Router();
const { createPlayer, getPlayersByTournament, importCricHeroesPlayer, updatePlayer, deletePlayer } = require('../controllers/playerController');

router.post('/', createPlayer);
router.get('/:tournamentId', getPlayersByTournament);
router.post('/import', importCricHeroesPlayer);
router.put('/:id', updatePlayer);
router.delete('/:id', deletePlayer);

module.exports = router;
