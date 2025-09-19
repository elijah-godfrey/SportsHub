// WebRTC type definitions for backend compatibility
export interface RTCSessionDescriptionInit {
    type: 'offer' | 'answer';
    sdp: string;
}

export interface RTCIceCandidateInit {
    candidate: string;
    sdpMLineIndex?: number;
    sdpMid?: string;
}

export interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
}

// Screen sharing types (subset needed for backend)
export interface ScreenShareSession {
    id: string;
    hostUserId: string;
    gameId?: string;
    title: string;
    description?: string;
    status: 'ACTIVE' | 'PAUSED' | 'ENDED';
    isPublic: boolean;
    maxViewers?: number;
    currentViewers: number;
    totalViews: number;
    startedAt: string;
    endedAt?: string;
    createdAt: string;
    updatedAt: string;

    // Populated relations (when included)
    host?: {
        id: string;
        name: string;
        image?: string;
    };
    game?: {
        id: string;
        homeTeam: { name: string };
        awayTeam: { name: string };
        status: string;
    };
}

export interface ScreenShareViewer {
    id: string;
    sessionId: string;
    userId?: string;
    joinedAt: string;
    leftAt?: string;
    isActive: boolean;

    // Populated relations
    user?: {
        id: string;
        name: string;
        image?: string;
    };
}

// API Request/Response types
export interface CreateScreenShareRequest {
    title: string;
    description?: string;
    gameId?: string;
    isPublic?: boolean;
    maxViewers?: number;
}

export interface UpdateScreenShareRequest {
    title?: string;
    description?: string;
    status?: 'ACTIVE' | 'PAUSED' | 'ENDED';
    isPublic?: boolean;
    maxViewers?: number;
}

export interface ScreenShareSessionResponse {
    success: boolean;
    data?: ScreenShareSession;
    error?: string;
}

export interface ScreenShareSessionsResponse {
    success: boolean;
    data?: ScreenShareSession[];
    count?: number;
    error?: string;
}

export interface JoinScreenShareResponse {
    success: boolean;
    data?: {
        session: ScreenShareSession;
        viewerId: string;
        iceServers: RTCIceServer[];
    };
    error?: string;
}
