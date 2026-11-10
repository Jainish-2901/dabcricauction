const db = require('../services/dbService');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');

const createTournament = async (req, res) => {
    try {
        if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.logo, 'dabcricauction/tournaments', req.body.name || 'tournament');
            if (uploaded?.secure_url) {
                req.body.logo = uploaded.secure_url;
            }
        }
        const tournament = await db.createTournament(req.body);
        res.status(201).json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournaments = async (req, res) => {
    try {
        const tournaments = await db.getTournaments();
        res.json(tournaments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournamentById = async (req, res) => {
    try {
        const tournament = await db.getTournamentById(req.params.id);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTournament = async (req, res) => {
    try {
        const existingTournament = await db.getTournamentById(req.params.id);
        if (req.body.logo && typeof req.body.logo === 'string' && req.body.logo.startsWith('data:image/')) {
            const uploaded = await uploadImage(
                req.body.logo,
                'dabcricauction/tournaments',
                req.body.name || existingTournament?.name || req.params.id,
                existingTournament?.logo
            );
            if (uploaded?.secure_url) {
                req.body.logo = uploaded.secure_url;
            }
        } else if ((req.body.logo === '' || req.body.logo === null) && existingTournament?.logo) {
            await deleteImage(existingTournament.logo);
        }

        const tournament = await db.updateTournament(req.params.id, req.body);
        if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
        res.json(tournament);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteTournament = async (req, res) => {
    try {
        const id = req.params.id;
        const [existingTournament, teams, players] = await Promise.all([
            db.getTournamentById(id),
            db.getTeamsByTournament(id),
            db.getPlayersByTournament(id)
        ]);
        const urlsToDelete = [
            existingTournament?.logo,
            ...(teams || []).flatMap(t => [t.logo, t.captainPhoto]),
            ...(players || []).map(p => p.image)
        ].filter(Boolean);
        if (urlsToDelete.length > 0) {
            await Promise.allSettled(urlsToDelete.map(u => deleteImage(u)));
        }

        await db.deleteTournament(id);
        res.json({ message: 'Tournament deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournamentCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const creds = await db.getTournamentCredentials(id);
        res.json(creds);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const setTournamentCredentials = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await db.setTournamentCredentials(id, req.body);
        res.json({ message: 'Credentials updated successfully', data: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const addTournamentCredential = async (req, res) => {
    try {
        const { id } = req.params;

        // Auto Cloudinary upload for captain photo if provided (stored by captain name)
        if (req.body.captainPhoto && typeof req.body.captainPhoto === 'string' && req.body.captainPhoto.startsWith('data:image/')) {
            const uploaded = await uploadImage(
                req.body.captainPhoto,
                'dabcricauction/captains',
                req.body.captainName || req.body.username || 'captain'
            );
            if (uploaded?.secure_url) {
                req.body.captainPhoto = uploaded.secure_url;
            }
        }

        const newCred = await db.addTournamentCredential(id, req.body);
        res.status(201).json({ message: 'Credential created successfully', credential: newCred });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateTournamentCredential = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const existingUser = await db.findUserById(userId);
        const capName = req.body.captainName || existingUser?.captainName || req.body.username || existingUser?.username || 'captain';

        // Auto Cloudinary upload / overwrite / delete for captain photo if provided
        if (req.body.captainPhoto && typeof req.body.captainPhoto === 'string' && req.body.captainPhoto.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.captainPhoto, 'dabcricauction/captains', capName, existingUser?.captainPhoto);
            if (uploaded?.secure_url) {
                req.body.captainPhoto = uploaded.secure_url;
            }
        } else if ((req.body.captainPhoto === '' || req.body.captainPhoto === null) && existingUser?.captainPhoto) {
            await deleteImage(existingUser.captainPhoto);
        }

        const updated = await db.updateTournamentCredential(id, userId, req.body);
        res.json({ message: 'Credential updated successfully', credential: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteTournamentCredential = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const existingUser = await db.findUserById(userId);
        if (existingUser?.captainPhoto) {
            await deleteImage(existingUser.captainPhoto);
        }
        await db.deleteTournamentCredential(id, userId);
        res.json({ message: 'Credential deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const registerPlayerSelf = async (req, res) => {
    try {
        const { id } = req.params;
        const tournament = await db.getTournamentById(id);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        if (tournament.registrationOpen === false) {
            return res.status(403).json({
                message: 'Player self-registration is currently CLOSED by the tournament organizer.'
            });
        }

        // Automatic Cloudinary Upload for Self Player Registration (stored by player name)
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.image, 'dabcricauction/players', req.body.name || 'player');
            if (uploaded?.secure_url) {
                req.body.image = uploaded.secure_url;
            }
        }

        const player = await db.registerPlayerSelf(id, req.body);
        res.status(201).json({ message: 'Player registered successfully for auction', player });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- SLOTS MANAGEMENT ---
const getTournamentSlots = async (req, res) => {
    try {
        const { id } = req.params;
        const slots = await db.getSlotsByTournament(id);
        res.json(slots);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createTournamentSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const slot = await db.createSlot(id, req.body);
        res.status(201).json({ message: 'Slot created successfully', slot });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateTournamentSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        const updated = await db.updateSlot(slotId, req.body);
        res.json({ message: 'Slot updated successfully', slot: updated });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const deleteTournamentSlot = async (req, res) => {
    try {
        const { slotId } = req.params;
        await db.deleteSlot(slotId);
        res.json({ message: 'Slot deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const assignPlayersToTournamentSlot = async (req, res) => {
    try {
        const { id, slotId } = req.params;
        const { playerIds } = req.body;
        const result = await db.assignPlayersToSlot(id, slotId, playerIds);
        res.json({ message: 'Players shifted to slot and base prices updated automatically', ...result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const reopenUnsoldPlayersToSlot = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.bringUnsoldPlayersToAuction(id);
        res.json({ message: 'All unsold players brought into auction slot successfully', ...result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// --- CSV EXPORT ---
const exportTournamentPlayersCSV = async (req, res) => {
    try {
        const { id } = req.params;
        const csv = await db.exportPlayersCSV(id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=players_feed_${id}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const exportTournamentSummaryCSV = async (req, res) => {
    try {
        const { id } = req.params;
        const csv = await db.exportTournamentSummaryCSV(id);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=auction_teams_summary_${id}.csv`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTournamentBids = async (req, res) => {
    try {
        const { id } = req.params;
        const { playerId } = req.query;
        const bids = await db.getBids(id, playerId);
        res.json(bids);
    } catch (err) {
        console.error('getTournamentBids error:', err);
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
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
    getTournamentBids
};
