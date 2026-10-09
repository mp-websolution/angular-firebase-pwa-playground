import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // A test can make several emulator round trips, each waiting up to `slowEmulatorTimeout`,
    // so together they exceed Vitest's 5 s default.
    testTimeout: 20_000,
  },
});
