/**
 * `vi.waitFor` options for waiting on an emulator's answer: on a cold CI runner it can take
 * seconds, but `vi.waitFor` gives up after 1 s by default.
 */
export const slowEmulatorTimeout = { timeout: 5_000 };
