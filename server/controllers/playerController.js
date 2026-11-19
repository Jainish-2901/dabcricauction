const db = require('../services/dbService');
const { scrapeCricHeroesProfile } = require('../utils/scraper');
const { uploadImage, deleteImage } = require('../services/cloudinaryService');

const createPlayer = async (req, res) => {
    try {
        if (!req.body.tournamentId) {
            return res.status(400).json({ message: 'tournamentId is strictly required. Players cannot be added globally.' });
        }

        // Automatic Cloudinary Upload for Player Photo (stored by player name)
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
            const uploaded = await uploadImage(
                req.body.image,
                req.body.isCaptain ? 'dabcricauction/captains' : 'dabcricauction/players',
                req.body.name || 'player'
            );
            if (uploaded?.secure_url) {
                req.body.image = uploaded.secure_url;
            }
        }

        const player = await db.createPlayer(req.body);
        res.status(201).json(player);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPlayersByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const players = await db.getPlayersByTournament(tournamentId);
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const importCricHeroesPlayer = async (req, res) => {
    try {
        const { profileUrl, tournamentId, basePrice } = req.body;
        const scrapedData = await scrapeCricHeroesProfile(profileUrl);

        let finalImage = scrapedData.image;
        if (finalImage && typeof finalImage === 'string' && finalImage.startsWith('data:image/')) {
            const uploaded = await uploadImage(finalImage, 'dabcricauction/players', scrapedData.name || 'player');
            if (uploaded?.secure_url) {
                finalImage = uploaded.secure_url;
            }
        }

        const newPlayer = await db.createPlayer({
            name: scrapedData.name,
            image: finalImage,
            category: scrapedData.category,
            stats: scrapedData.stats,
            cricHeroesProfileUrl: profileUrl,
            tournamentId,
            basePrice: basePrice || 20
        });

        res.status(201).json(newPlayer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error importing player: ' + error.message });
    }
};

const updatePlayer = async (req, res) => {
    try {
        const id = req.params.id;
        const isVirtualCap = id && id.startsWith('owner_cap_');
        const existingPlayer = !isVirtualCap ? await db.getPlayerById(id) : null;
        const existingTeam = isVirtualCap ? await db.getTeamById(id.replace('owner_cap_', '')) : null;
        const existingImage = existingPlayer?.image || existingTeam?.captainPhoto || '';
        const isCap = isVirtualCap || Boolean(existingPlayer?.isCaptain) || String(id).startsWith('pl_cap_');
        const targetFolder = isCap ? 'dabcricauction/captains' : 'dabcricauction/players';
        const entityName = req.body.name || existingPlayer?.name || existingTeam?.captainName || existingTeam?.name || id;

        // Automatic Cloudinary Upload / Overwrite for Player or Captain Photo
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
            try {
                const uploaded = await uploadImage(req.body.image, targetFolder, entityName, existingImage);
                if (uploaded?.secure_url) {
                    req.body.image = uploaded.secure_url;
                }
            } catch (imgErr) {
                console.warn('Cloudinary upload warning, keeping original image:', imgErr?.message);
            }
        } else if ((req.body.image === '' || req.body.image === null) && existingImage) {
            // Image cleared in UI -> delete from Cloudinary
            await deleteImage(existingImage);
        }

        const player = await db.updatePlayer(id, req.body);
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json(player);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ message: error.message });
    }
};

const deletePlayer = async (req, res) => {
    try {
        const id = req.params.id;
        const isVirtualCap = id && id.startsWith('owner_cap_');
        const existingPlayer = !isVirtualCap ? await db.getPlayerById(id) : null;
        const existingTeam = isVirtualCap ? await db.getTeamById(id.replace('owner_cap_', '')) : null;
        const existingImage = existingPlayer?.image || existingTeam?.captainPhoto || '';
        if (existingImage) {
            await deleteImage(existingImage);
        }

        await db.deletePlayer(id);
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const releasePlayerToPending = async (req, res) => {
    try {
        const id = req.params.id;
        const { tournamentId, teamId, targetStatus = 'unsold' } = req.body;
        const result = await db.releasePlayerToPending(tournamentId, id, teamId, targetStatus);

        const io = req.app.get('io');
        if (io && tournamentId) {
            io.to(tournamentId).emit('player_released_to_pending', {
                player: result.player,
                team: result.team,
                teamId: result.team?._id,
                refundedAmount: result.refundedAmount,
                message: `${result.player.name} was removed from ${result.team?.name || 'team'} and moved to ${result.player.status === 'unsold' ? 'Unsold' : 'Pending'} pool.`
            });
            if (result.team) io.to(tournamentId).emit('team_updated', { team: result.team });
            io.to(tournamentId).emit('player_updated', result.player);
        }

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error releasing player to pending:', error);
        res.status(500).json({ message: error.message });
    }
};

const manualAssignPlayer = async (req, res) => {
    try {
        const id = req.params.id;
        const { tournamentId, teamId, soldPrice } = req.body;
        if (!tournamentId || !teamId || soldPrice === undefined) {
            return res.status(400).json({ message: 'tournamentId, teamId, and soldPrice are required' });
        }

        const result = await db.manualAssignPlayer(tournamentId, id, teamId, soldPrice);

        const io = req.app.get('io');
        if (io && tournamentId) {
            io.to(tournamentId).emit('player_sold', {
                player: result.player,
                team: result.team,
                soldPrice: result.soldPrice
            });
            io.to(tournamentId).emit('team_updated', { team: result.team });
            io.to(tournamentId).emit('player_updated', result.player);
        }

        res.json({ success: true, ...result });
    } catch (error) {
        console.error('Error in manualAssignPlayer:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createPlayer, getPlayersByTournament, importCricHeroesPlayer, updatePlayer, deletePlayer, releasePlayerToPending, manualAssignPlayer };
