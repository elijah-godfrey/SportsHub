import type { RTCIceServer } from '../types/screenShare.js';

interface ScreenShareConfig {
    stun: {
        url: string;
    };
    turn?: {
        url: string;
        username: string;
        credential: string;
    };
    limits: {
        maxBitrate: number;
        maxViewersPerSession: number;
        sessionTimeoutMinutes: number;
    };
    iceServers: RTCIceServer[];
}

function parseIceServers(jsonString: string): RTCIceServer[] {
    try {
        return JSON.parse(jsonString);
    } catch {
        // Fallback to default STUN server
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
}

function getScreenShareConfig(): ScreenShareConfig {
    const config: ScreenShareConfig = {
        stun: {
            url: process.env.STUN_SERVER_URL || 'stun:stun.l.google.com:19302',
        },
        limits: {
            maxBitrate: parseInt(process.env.SCREEN_SHARE_MAX_BITRATE || '2500000'),
            maxViewersPerSession: parseInt(process.env.SCREEN_SHARE_MAX_VIEWERS_PER_SESSION || '50'),
            sessionTimeoutMinutes: parseInt(process.env.SCREEN_SHARE_SESSION_TIMEOUT_MINUTES || '180'),
        },
        iceServers: parseIceServers(
            process.env.WEBRTC_ICE_SERVERS ||
            '[{"urls":"stun:stun.l.google.com:19302"}]'
        ),
    };

    // Add TURN server if configured
    if (process.env.TURN_SERVER_URL && process.env.TURN_SERVER_USERNAME && process.env.TURN_SERVER_CREDENTIAL) {
        config.turn = {
            url: process.env.TURN_SERVER_URL,
            username: process.env.TURN_SERVER_USERNAME,
            credential: process.env.TURN_SERVER_CREDENTIAL,
        };

        // Add TURN server to ICE servers
        config.iceServers.push({
            urls: config.turn.url,
            username: config.turn.username,
            credential: config.turn.credential,
        });
    }

    return config;
}

export const screenShareConfig = getScreenShareConfig();
export type { ScreenShareConfig };
