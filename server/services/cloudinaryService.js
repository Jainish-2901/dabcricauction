const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dlsxkuhty';
const apiKey = process.env.CLOUDINARY_API_KEY || '';
const apiSecret = process.env.CLOUDINARY_API_SECRET || 'zDQ9d5XIrEvnmC93B1h5ZDUtiJ0';

if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
} else {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}

/**
 * Checks if Cloudinary is fully configured with required credentials
 */
const isConfigured = () => {
    const config = cloudinary.config();
    return Boolean(config.cloud_name && config.api_key && config.api_secret);
};

/**
 * Uploads an image (Base64 data URL, remote URL, or local path) to Cloudinary
 * with automatic folder creation.
 *
 * @param {string} fileData - Base64 Data URL (data:image/...) or Image URL
 * @param {string} folder - Target folder in Cloudinary (e.g. 'dabcricauction/teams')
 * @returns {Promise<{ url: string, secure_url: string, public_id: string }>}
 */
const uploadImage = async (fileData, folder = 'dabcricauction/general') => {
    if (!fileData) return null;

    // If it's already an uploaded Cloudinary / HTTP URL, no re-upload needed
    if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
        return {
            url: fileData,
            secure_url: fileData,
            public_id: null
        };
    }

    if (!isConfigured()) {
        console.warn('⚠️ Cloudinary is missing API_KEY. Need the 15-digit numeric API Key from Cloudinary Dashboard.');
        // Return original data URL as fallback so nothing breaks
        return {
            url: fileData,
            secure_url: fileData,
            public_id: null,
            fallback: true
        };
    }

    try {
        const uploadPromise = cloudinary.uploader.upload(fileData, {
            folder: folder,
            resource_type: 'image',
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ]
        });

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Cloudinary upload timed out (6s)')), 6000)
        );

        const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);

        return {
            url: uploadResult.url,
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id
        };
    } catch (err) {
        console.error('❌ Cloudinary Upload Error / Fallback to local Base64:', err.message || err);
        // Fallback to original fileData
        return {
            url: fileData,
            secure_url: fileData,
            public_id: null,
            error: err.message
        };
    }
};

module.exports = {
    cloudinary,
    uploadImage,
    isConfigured
};

