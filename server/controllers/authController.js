const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../services/dbService');

const register = async (req, res) => {
    try {
        const { username, password, role, tournamentId, teamId, teamName, name, organizationName, phone } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required' });
        }

        // Public registration is strictly for Tournament Organizers (superadmin) who host & create tournaments
        const newUser = await db.createUser({
            username: username.trim(),
            password: password.trim(),
            name,
            organizationName,
            phone,
            role: 'superadmin',
            tournamentId,
            teamId,
            teamName
        });

        const token = jwt.sign({
            id: newUser._id,
            role: newUser.role,
            tournamentId: newUser.tournamentId,
            teamId: newUser.teamId
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                _id: newUser._id,
                username: newUser.username,
                name: newUser.name,
                organizationName: newUser.organizationName,
                phone: newUser.phone,
                role: newUser.role,
                tournamentId: newUser.tournamentId,
                teamId: newUser.teamId
            }
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Please provide username and password' });
        }

        const user = await db.findUserByUsername(username.trim());
        if (!user) {
            return res.status(404).json({ message: 'User not found. Please check username or create an account.' });
        }

        const isMatch = bcrypt.compareSync(password.trim(), user.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid password. Please check your credentials.' });
        }

        const token = jwt.sign({
            id: user._id,
            role: user.role,
            tournamentId: user.tournamentId,
            teamId: user.teamId
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({
            token,
            user: {
                _id: user._id,
                id: user._id,
                username: user.username,
                role: user.role,
                tournamentId: user.tournamentId,
                teamId: user.teamId
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUsersByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const users = await db.getUsersByTournament(tournamentId);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const user = await db.updateUser(req.params.id, req.body);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        await db.deleteUser(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const checkUsername = async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            return res.status(400).json({ message: 'Username is required' });
        }
        const user = await db.findUserByUsername(username.trim());
        if (!user) {
            return res.status(404).json({ message: 'No account found with this username' });
        }
        res.json({
            exists: true,
            username: user.username,
            role: user.role,
            hasPhone: !!user.phone,
            phoneHint: user.phone ? user.phone.slice(-4) : null,
            organizationName: user.organizationName || null
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { username, phone, newPassword } = req.body;
        if (!username || !newPassword) {
            return res.status(400).json({ message: 'Username and new password are required' });
        }
        if (newPassword.trim().length < 4) {
            return res.status(400).json({ message: 'Password must be at least 4 characters long' });
        }

        const user = await db.findUserByUsername(username.trim());
        if (!user) {
            return res.status(404).json({ message: 'Account not found with this username' });
        }

        // If user has a phone registered and phone is passed, verify it
        if (user.phone && phone) {
            const cleanUserPhone = user.phone.replace(/[^0-9]/g, '');
            const cleanInputPhone = phone.replace(/[^0-9]/g, '');
            if (!cleanUserPhone.endsWith(cleanInputPhone) && cleanUserPhone !== cleanInputPhone) {
                return res.status(400).json({ message: 'Phone number does not match registered account' });
            }
        }

        await db.resetUserPassword(username.trim(), newPassword.trim());

        res.json({
            success: true,
            message: 'Password reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    register,
    login,
    getUsersByTournament,
    updateUser,
    deleteUser,
    checkUsername,
    resetPassword
};
