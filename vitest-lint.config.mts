import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['lint-tests/**/*.spec.ts'],
    environment: 'node',
  },
});
