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

// WebRTC Signaling Events
export interface SignalingEvents {
    // Session management
    'screen-share:start': (data: {
        sessionId: string;
        title: string;
        description?: string;
        gameId?: string;
        isPublic: boolean;
        maxViewers?: number;
    }) => void;

    'screen-share:join': (data: {
        sessionId: string;
        userId?: string;
    }) => void;

    'screen-share:leave': (data: {
        sessionId: string;
        userId?: string;
    }) => void;

    'screen-share:end': (data: {
        sessionId: string;
    }) => void;

    // WebRTC signaling
    'screen-share:offer': (data: {
        sessionId: string;
        viewerId: string;
        offer: RTCSessionDescriptionInit;
    }) => void;

    'screen-share:answer': (data: {
        sessionId: string;
        viewerId: string;
        answer: RTCSessionDescriptionInit;
    }) => void;

    'screen-share:ice-candidate': (data: {
        sessionId: string;
        viewerId: string;
        candidate: RTCIceCandidateInit;
    }) => void;

    // Session updates
    'screen-share:session-updated': (session: ScreenShareSession) => void;
    'screen-share:viewer-joined': (data: { sessionId: string; viewer: ScreenShareViewer }) => void;
    'screen-share:viewer-left': (data: { sessionId: string; viewerId: string }) => void;
    'screen-share:host-disconnected': (data: { sessionId: string }) => void;
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
