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
/**
 * Sanitize an entity name into a deterministic, Cloudinary-safe public_id slug.
 */
const sanitizePublicId = (name, fallbackId = '') => {
    const raw = String(name || '').trim().toLowerCase();
    const cleaned = raw
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);
    if (cleaned) return cleaned;
    const fb = String(fallbackId || 'asset').replace(/[^a-zA-Z0-9_-]+/g, '_');
    return fb || `asset_${Date.now()}`;
};

/**
 * Extract Cloudinary public_id (including folder path, without extension or version) from a Cloudinary URL.
 * Example: https://res.cloudinary.com/demo/image/upload/v1710000000/dabcricauction/players/virat_kohli.png
 * -> dabcricauction/players/virat_kohli
 */
const extractPublicId = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    if (!imageUrl.includes('res.cloudinary.com') || !imageUrl.includes('/upload/')) return null;
    try {
        const afterUpload = imageUrl.split('/upload/')[1];
        if (!afterUpload) return null;
        // Strip query string / hash
        const noQuery = afterUpload.split('?')[0].split('#')[0];
        const segments = noQuery.split('/').filter(Boolean);
        // Remove optional transformation segments or version segment (v123456789)
        const versionIdx = segments.findIndex(seg => /^v\d+$/.test(seg));
        const relevant = versionIdx >= 0 ? segments.slice(versionIdx + 1) : segments;
        if (relevant.length === 0) return null;
        const joined = relevant.join('/');
        // Strip trailing file extension
        return joined.replace(/\.[a-zA-Z0-9]+$/, '');
    } catch {
        return null;
    }
};

/**
 * Delete an image from Cloudinary by URL or public_id and invalidate CDN cache.
 */
const deleteImage = async (imageUrlOrPublicId) => {
    if (!imageUrlOrPublicId || typeof imageUrlOrPublicId !== 'string') return { result: 'skipped' };
    if (!isConfigured()) return { result: 'unconfigured' };

    const publicId = imageUrlOrPublicId.startsWith('http')
        ? extractPublicId(imageUrlOrPublicId)
        : imageUrlOrPublicId;

    if (!publicId) return { result: 'not_cloudinary' };

    try {
        const res = await cloudinary.uploader.destroy(publicId, {
            resource_type: 'image',
            invalidate: true
        });
        return res;
    } catch (err) {
        console.error('❌ Cloudinary Destroy Error:', err.message || err);
        return { result: 'error', error: err.message };
    }
};

const uploadImage = async (fileData, folder = 'dabcricauction/general', customPublicId = null, existingUrl = null) => {
    if (!fileData) return null;

    // If it's already an uploaded Cloudinary / HTTP URL, no re-upload needed
    if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://'))) {
        return {
            url: fileData,
            secure_url: fileData,
            public_id: extractPublicId(fileData)
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
        const existingPublicId = extractPublicId(existingUrl);
        let uploadOptions = {
            resource_type: 'image',
            overwrite: true,
            invalidate: true,
            transformation: [
                { quality: 'auto', fetch_format: 'auto' }
            ]
        };

        if (customPublicId) {
            const safeSlug = sanitizePublicId(customPublicId);
            const targetFullId = `${folder}/${safeSlug}`;
            // If entity was renamed / previously stored under a different public_id, clean up old asset
            if (existingPublicId && existingPublicId !== targetFullId) {
                await deleteImage(existingPublicId);
            }
            uploadOptions.folder = folder;
            uploadOptions.public_id = safeSlug;
            uploadOptions.unique_filename = false;
            uploadOptions.use_filename = false;
        } else if (existingPublicId) {
            // Overwrite the exact existing public_id if no custom name was supplied
            uploadOptions.public_id = existingPublicId;
            uploadOptions.unique_filename = false;
        } else {
            uploadOptions.folder = folder;
        }

        const uploadPromise = cloudinary.uploader.upload(fileData, uploadOptions);

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
    deleteImage,
    extractPublicId,
    sanitizePublicId,
    isConfigured
};

