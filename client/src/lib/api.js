import axios from 'axios';

// Resolve Backend API URL from environment variables
// In production on Vercel: Points to Render backend (e.g., https://your-server.onrender.com)
// In local dev: defaults to http://localhost:5001 or window.location.origin
const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_SOCKET_URL;
    if (envUrl) {
        // Strip trailing slash
        const clean = envUrl.replace(/\/$/, '');
        // If it accidentally points to frontend vercel domain, ignore it so it doesn't hit static vercel routes
        if (typeof window !== 'undefined' && (clean === window.location.origin || clean.includes('vercel.app'))) {
            return '';
        }
        if (!clean.includes('localhost') || typeof window !== 'undefined') {
            return clean;
        }
    }
    return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Configure axios default baseURL globally
if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL;
}

/**
 * Universal apiFetch wrapper that prefixes API_BASE_URL in production
 * Prevents Vercel 404/rewrite errors when hitting /api/* endpoints
 */
export const apiFetch = (endpoint, options = {}) => {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
    return fetch(fullUrl, options);
};

export default axios;

