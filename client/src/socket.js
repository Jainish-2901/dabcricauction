import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000
});

// Smart Keep-Alive: Only ping server if socket is actively connected (during active auction sessions)
if (typeof window !== 'undefined') {
    setInterval(() => {
        try {
            if (socket && socket.connected) {
                const apiBase = SOCKET_URL.replace(/\/$/, '');
                fetch(`${apiBase}/api/health`, { method: 'GET', keepalive: true }).catch(() => {});
            }
        } catch {
            // ignore network errors
        }
    }, 8 * 60 * 1000);
}

export default socket;
