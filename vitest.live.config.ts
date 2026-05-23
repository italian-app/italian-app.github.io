import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/live/**/*.test.ts'],
    testTimeout: 90000,
    hookTimeout: 90000
  }
});
