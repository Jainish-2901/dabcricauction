const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const register = async (req, res) => {
    try {
        const { username, password, role, tournamentId, teamId } = req.body;

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            password: hashedPassword,
            role: role || 'team_owner',
            tournamentId,
            teamId // Optional: assign team on creation
        });

        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        // Include teamId in token if needed, or just return it in user object
        const token = jwt.sign({
            id: user._id,
            role: user.role,
            tournamentId: user.tournamentId,
            teamId: user.teamId
        }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });

        res.json({
            token, user: {
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
        const users = await User.find({ tournamentId }).populate('teamId'); // Populate team details
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateUser = async (req, res) => {
    try {
        const { username, role, teamId } = req.body;
        const updateData = { username, role, teamId };

        // If password is being updated (optional)
        if (req.body.password) {
            updateData.password = await bcrypt.hash(req.body.password, 10);
        }

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { register, login, getUsersByTournament, updateUser, deleteUser };
