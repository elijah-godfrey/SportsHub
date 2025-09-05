import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['tests/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
                '**/*.d.ts',
                'tests/**',
                'vitest.config.ts',
            ],
        },
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules/', 'dist/'],
    },
});
