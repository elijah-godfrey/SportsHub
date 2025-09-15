import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const auth = betterAuth({
    baseURL: 'http://localhost:5000',
    database: prismaAdapter(prisma, { provider: 'postgresql' }),

    user: { modelName: 'User' },

    account: {
        modelName: 'Account',
        fields: {
            providerId: 'provider',
            accountId: 'providerAccountId',
            accessToken: 'access_token',
            refreshToken: 'refresh_token',
            accessTokenExpiresAt: 'expires_at',
            idToken: 'id_token',
            scope: 'scope',
            tokenType: 'token_type',
            sessionState: 'session_state',
        },
    },

    session: {
        modelName: 'Session',
        fields: {
            token: 'sessionToken',
            expiresAt: 'expires',
        },
        expiresIn: 60 * 60 * 24 * 7,   // 7 days
        updateAge: 60 * 60 * 24,       // 1 day
        cookieName: 'sh.sid',
    },

    verification: {
        modelName: 'verification',
        fields: {
            value: 'value',
            expiresAt: 'expiresAt',
        },
    },

    trustedOrigins: ['http://localhost:3000'],

    emailAndPassword: { enabled: true },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        },
    },

    secret: process.env.AUTH_SECRET || 'fallback-secret-for-dev',
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
