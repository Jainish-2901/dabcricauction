import { Platform } from 'react-native';

const LAN_IP = '10.216.88.61'; // Current machine Wi-Fi IPv4 address

export const getCandidateUrls = (): string[] => {
    const list: string[] = [];
    const envUrl = process.env.EXPO_PUBLIC_API_URL;

    if (Platform.OS === 'android') {
        // On Android:
        // If envUrl is provided and does NOT point to localhost/127.0.0.1, prioritize it
        if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
            list.push(envUrl);
        }
        // Wi-Fi LAN IP (works for physical phone on same Wi-Fi and emulator)
        list.push(`http://${LAN_IP}:5001`);
        // Standard Android Emulator loopback
        list.push('http://10.0.2.2:5001');
        // Web fallback
        list.push('http://localhost:5001');
    } else if (Platform.OS === 'web') {
        list.push(envUrl || 'http://localhost:5001');
        list.push(`http://${LAN_IP}:5001`);
    } else {
        // iOS or default
        if (envUrl) list.push(envUrl);
        list.push('http://localhost:5001');
        list.push(`http://${LAN_IP}:5001`);
    }

    return Array.from(new Set(list.filter(Boolean)));
};

let cachedWorkingUrl: string | null = null;

export const getApiUrl = (): string => {
    if (cachedWorkingUrl) return cachedWorkingUrl;
    const candidates = getCandidateUrls();
    return candidates[0] || 'http://localhost:5001';
};

/**
 * Auto-fallback fetch wrapper:
 * Tries candidates in order so Android never fails with "failed to connect to localhost/127.0.0.1:5001"
 */
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const candidates = getCandidateUrls();

    const ordered = cachedWorkingUrl
        ? [cachedWorkingUrl, ...candidates.filter(c => c !== cachedWorkingUrl)]
        : candidates;

    let lastError: any = null;

    for (const base of ordered) {
        try {
            const url = `${base}${path}`;
            const res = await fetch(url, options);
            cachedWorkingUrl = base;
            return res;
        } catch (err: any) {
            lastError = err;
        }
    }

    throw lastError || new Error(`Unable to connect to backend server at ${ordered.join(', ')}. Please verify the server is running on port 5001.`);
};

export default apiFetch;

