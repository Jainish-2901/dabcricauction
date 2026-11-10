import { io } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { getApiUrl } from './api';

export const socket = io(getApiUrl(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

// Smart Keep-Alive: Only ping backend if socket is actively connected (during active bidding room)
setInterval(async () => {
    try {
        if (socket && socket.connected) {
            const url = `${getApiUrl().replace(/\/$/, '')}/api/health`;
            await fetch(url).catch(() => {});
        }
    } catch {
        // ignore
    }
}, 8 * 60 * 1000);

// Auto Reconnect when App comes back to foreground
AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
        const url = getApiUrl();
        if (url && !socket.connected) {
            console.log('[Socket] App became active, reconnecting...');
            socket.connect();
        }
    }
});

export default socket;
