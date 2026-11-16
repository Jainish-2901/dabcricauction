const express = require('express');
const router = express.Router();
const {
    createTournament,
    getTournaments,
    getTournamentById,
    updateTournament,
    deleteTournament,
    getTournamentCredentials,
    setTournamentCredentials,
    addTournamentCredential,
    updateTournamentCredential,
    deleteTournamentCredential,
    registerPlayerSelf,
    getTournamentSlots,
    createTournamentSlot,
    updateTournamentSlot,
    deleteTournamentSlot,
    assignPlayersToTournamentSlot,
    reopenUnsoldPlayersToSlot,
    exportTournamentPlayersCSV,
    exportTournamentSummaryCSV,
    getTournamentBids,
    replaceInjuredPlayer,
    tradePlayers,
    getTournamentTransfers,
    moveInjuredToUnsold
} = require('../controllers/tournamentController');

router.post('/', createTournament);
router.get('/', getTournaments);
router.get('/:id', getTournamentById);
router.put('/:id', updateTournament);
router.delete('/:id', deleteTournament);

// Tournament Credentials Management (Admin assigns Auctioneer & Team Owners with full CRUD)
router.get('/:id/credentials', getTournamentCredentials);
router.post('/:id/credentials', setTournamentCredentials);
router.post('/:id/credentials/add', addTournamentCredential);
router.put('/:id/credentials/:userId', updateTournamentCredential);
router.delete('/:id/credentials/:userId', deleteTournamentCredential);

// Slots / Sets Management
router.post('/:id/reopen-unsold', reopenUnsoldPlayersToSlot);
router.post('/:id/slots/reopen-unsold', reopenUnsoldPlayersToSlot);
router.get('/:id/slots', getTournamentSlots);
router.post('/:id/slots', createTournamentSlot);
router.put('/:id/slots/:slotId', updateTournamentSlot);
router.delete('/:id/slots/:slotId', deleteTournamentSlot);
router.post('/:id/slots/:slotId/assign-players', assignPlayersToTournamentSlot);

// Player Self-Registration Form Submission
router.post('/:id/register-player', registerPlayerSelf);

// Export Players Feed & Teams Summary to CSV
router.get('/:id/export-players-csv', exportTournamentPlayersCSV);
router.get('/:id/export-teams-summary-csv', exportTournamentSummaryCSV);

// Bid Logs & Audit Trail
router.get('/:id/bids', getTournamentBids);

// Injury Replacements & Player Trading
router.post('/:id/replace-injured', replaceInjuredPlayer);
router.post('/:id/trade-players', tradePlayers);
router.get('/:id/transfers', getTournamentTransfers);
router.post('/:id/players/:playerId/move-injured-to-unsold', moveInjuredToUnsold);
router.post('/:id/move-injured-to-unsold', moveInjuredToUnsold);

module.exports = router;
