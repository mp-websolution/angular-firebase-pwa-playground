/**
 * A fresh uid starting with `name`, for rules specs: other test files share the emulator, so a
 * test that reuses a uid could see another test's data.
 */
export function uidNoOtherTestUses(name: string): string {
  return `${name}-${crypto.randomUUID()}`;
}
