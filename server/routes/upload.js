const express = require('express');
const router = express.Router();
const { uploadImage, isConfigured } = require('../services/cloudinaryService');

/**
 * POST /api/upload/image
 * Body: { file: "data:image/jpeg;base64,...", folder: "dabcricauction/teams" | "dabcricauction/players" }
 */
router.post('/image', async (req, res) => {
    try {
        const { file, folder } = req.body;
        if (!file) {
            return res.status(400).json({ error: 'Image file data is required (base64 Data URL or URL).' });
        }

        const targetFolder = folder || 'dabcricauction/general';
        const result = await uploadImage(file, targetFolder);

        if (!result) {
            return res.status(400).json({ error: 'Upload failed' });
        }

        res.json({
            success: true,
            url: result.secure_url || result.url,
            secure_url: result.secure_url || result.url,
            public_id: result.public_id,
            folder: targetFolder,
            cloudinaryConfigured: isConfigured()
        });
    } catch (err) {
        console.error('Upload endpoint error:', err);
        res.status(500).json({ error: err.message || 'Image upload failed' });
    }
});

module.exports = router;

