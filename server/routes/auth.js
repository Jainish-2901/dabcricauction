const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getUsersByTournament,
    updateUser,
    deleteUser,
    checkUsername,
    resetPassword
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/check-username', checkUsername);
router.post('/reset-password', resetPassword);
router.get('/users/:tournamentId', getUsersByTournament);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
