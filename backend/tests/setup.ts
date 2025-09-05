import { beforeAll, afterAll } from 'vitest';

// Global test setup
beforeAll(async () => {
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.AUTH_SECRET = 'test-secret-for-testing-only';

    // Suppress console logs during tests
    if (!process.env.DEBUG_TESTS) {
        console.log = () => { };
        console.warn = () => { };
    }
});

afterAll(async () => {
    // Clean up after all tests
});

// Export common test utilities
export const createTestUser = () => ({
    id: '123',
    email: 'test@example.com',
    name: 'Test User'
});

export const createTestHeaders = (token?: string) => ({
    'content-type': 'application/json',
    ...(token && { authorization: `Bearer ${token}` })
});
