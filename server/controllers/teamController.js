const db = require('../services/dbService');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');

const createTeam = async (req, res) => {
    try {
        if (!req.body.tournamentId) {
            return res.status(400).json({ message: 'tournamentId is strictly required. Teams cannot be added globally.' });
        }

        // Automatic Cloudinary Upload for Team Logo (stored by team name)
        if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.startsWith('data:image/')) {
            const uploaded = await uploadImage(
                req.body.logo,
                'dabcricauction/teams',
                req.body.name || req.body.shortName || 'team'
            );
            if (uploaded?.secure_url) {
                req.body.logo = uploaded.secure_url;
            }
        }

        // Automatic Cloudinary Upload for Captain Photo (stored by captain name)
        if (req.body.captainPhoto && typeof req.body.captainPhoto === 'string' && req.body.captainPhoto.startsWith('data:image/')) {
            const uploaded = await uploadImage(
                req.body.captainPhoto,
                'dabcricauction/captains',
                req.body.captainName || `${req.body.name || 'team'}_captain`
            );
            if (uploaded?.secure_url) {
                req.body.captainPhoto = uploaded.secure_url;
            }
        }

        const team = await db.createTeam(req.body);
        res.status(201).json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTeamsByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const teams = await db.getTeamsByTournament(tournamentId);
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTeam = async (req, res) => {
    try {
        const existingTeam = await db.getTeamById(req.params.id);
        const teamName = req.body.name || existingTeam?.name || existingTeam?.shortName || req.params.id;
        const capName = req.body.captainName || existingTeam?.captainName || `${teamName}_captain`;

        // Automatic Cloudinary Upload / Overwrite / Delete for Team Logo
        if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.logo, 'dabcricauction/teams', teamName, existingTeam?.logo);
            if (uploaded?.secure_url) {
                req.body.logo = uploaded.secure_url;
            }
        } else if ((req.body.logo === '' || req.body.logo === null) && existingTeam?.logo) {
            await deleteImage(existingTeam.logo);
        }

        // Automatic Cloudinary Upload / Overwrite / Delete for Captain Photo
        if (req.body.captainPhoto && typeof req.body.captainPhoto === 'string' && req.body.captainPhoto.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.captainPhoto, 'dabcricauction/captains', capName, existingTeam?.captainPhoto);
            if (uploaded?.secure_url) {
                req.body.captainPhoto = uploaded.secure_url;
            }
        } else if ((req.body.captainPhoto === '' || req.body.captainPhoto === null) && existingTeam?.captainPhoto) {
            await deleteImage(existingTeam.captainPhoto);
        }

        const team = await db.updateTeam(req.params.id, req.body);
        if (!team) return res.status(404).json({ message: 'Team not found' });
        res.json(team);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTeam = async (req, res) => {
    try {
        const existingTeam = await db.getTeamById(req.params.id);
        if (existingTeam?.logo) await deleteImage(existingTeam.logo);
        if (existingTeam?.captainPhoto) await deleteImage(existingTeam.captainPhoto);

        await db.deleteTeam(req.params.id);
        res.json({ message: 'Team deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createTeam, getTeamsByTournament, updateTeam, deleteTeam };
