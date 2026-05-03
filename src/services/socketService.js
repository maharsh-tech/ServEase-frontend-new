import { io } from 'socket.io-client';
import { API_BASE_URL, getIdToken } from './apiService';

// Extract the base domain (remove /api)
// Example: http://192.168.1.5:8080/api -> http://192.168.1.5:8080
const SOCKET_URL = API_BASE_URL.replace(/\/api$/, '');

let socket = null;

export const connectSocket = async () => {
    if (socket && socket.connected) return socket;

    try {
        const token = await getIdToken();
        
        socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'], // Force websocket transport (bypasses some Expo polling issues)
        });

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket Connection Error:', error.message);
        });

        return socket;
    } catch (error) {
        console.error('Failed to initialize socket:', error);
        return null;
    }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
