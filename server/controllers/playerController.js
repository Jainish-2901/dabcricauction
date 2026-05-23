const Player = require('../models/Player');
const { scrapeCricHeroesProfile } = require('../utils/scraper');

const createPlayer = async (req, res) => {
    try {
        const player = await Player.create(req.body);
        res.status(201).json(player);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPlayersByTournament = async (req, res) => {
    try {
        const { tournamentId } = req.params;
        const players = await Player.find({ tournamentId }).sort({ order: 1 });
        res.json(players);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const importCricHeroesPlayer = async (req, res) => {
    try {
        const { profileUrl, tournamentId, basePrice } = req.body;

        // Scrape data
        const scrapedData = await scrapeCricHeroesProfile(profileUrl);

        // Create player with scraped data + manual inputs
        const newPlayer = new Player({
            name: scrapedData.name,
            image: scrapedData.image,
            category: scrapedData.category,
            stats: scrapedData.stats,
            cricHeroesProfileUrl: profileUrl,
            tournamentId,
            basePrice: basePrice || 0
        });

        await newPlayer.save();
        res.status(201).json(newPlayer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error importing player: ' + error.message });
    }
};

const updatePlayer = async (req, res) => {
    try {
        const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json(player);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deletePlayer = async (req, res) => {
    try {
        const player = await Player.findByIdAndDelete(req.params.id);
        if (!player) return res.status(404).json({ message: 'Player not found' });
        res.json({ message: 'Player deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createPlayer, getPlayersByTournament, importCricHeroesPlayer, updatePlayer, deletePlayer };
