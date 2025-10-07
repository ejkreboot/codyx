import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
    plugins: [sveltekit()],
    test: {
        include: ['src/**/*.{test,spec}.{js,ts}'],
        exclude: ['src/test/e2e/**/*', 'node_modules/**/*'],
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.js']
    }
});