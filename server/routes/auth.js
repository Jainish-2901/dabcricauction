const express = require('express');
const router = express.Router();
const { register, login, getUsersByTournament, updateUser, deleteUser } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/users/:tournamentId', getUsersByTournament);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
