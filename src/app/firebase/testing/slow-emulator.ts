/**
 * `vi.waitFor` options for waiting on an emulator's answer: on a cold CI runner it can take
 * seconds, but `vi.waitFor` gives up after 1 s by default.
 */
export const slowEmulatorTimeout = { timeout: 5_000 };

/**
 * `describe` options for a suite whose tests make several emulator round trips: each can wait up
 * to {@link slowEmulatorTimeout}, as long as Vitest's 5 s default test timeout, so together they
 * exceed it.
 */
export const slowEmulatorTestTimeout = { timeout: 20_000 };
