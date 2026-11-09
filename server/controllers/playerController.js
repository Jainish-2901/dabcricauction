const db = require('../services/dbService');
const { scrapeCricHeroesProfile } = require('../utils/scraper');
const { uploadImage } = require('../services/cloudinaryService');

const createPlayer = async (req, res) => {
    try {
        if (!req.body.tournamentId) {
            return res.status(400).json({ message: 'tournamentId is strictly required. Players cannot be added globally.' });
        }

        // Automatic Cloudinary Upload for Player Photo
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
            const uploaded = await uploadImage(req.body.image, 'dabcricauction/players');
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
            const uploaded = await uploadImage(finalImage, 'dabcricauction/players');
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
        // Automatic Cloudinary Upload for Player Photo
        if (req.body.image && typeof req.body.image === 'string' && req.body.image.startsWith('data:image/')) {
            try {
                const uploaded = await uploadImage(req.body.image, 'dabcricauction/players');
                if (uploaded?.secure_url) {
                    req.body.image = uploaded.secure_url;
                }
            } catch (imgErr) {
                console.warn('Cloudinary upload warning, keeping original image:', imgErr?.message);
            }
        }

        const player = await db.updatePlayer(req.params.id, req.body);
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json(player);
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ message: error.message });
    }
};

const deletePlayer = async (req, res) => {
    try {
        await db.deletePlayer(req.params.id);
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createPlayer, getPlayersByTournament, importCricHeroesPlayer, updatePlayer, deletePlayer };
