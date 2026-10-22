import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleIdsFor } from './lint-snippet.mjs';

const rule = 'local/no-comments-in-function-bodies';
const filePath = 'src/app/browser/reload-page.ts';

test('rejects a comment inside a function body', async () => {
  const code = `export function reload(): void {
  // Explains the next line.
  location.reload();
}
`;
  assert.ok((await ruleIdsFor(code, filePath)).includes(rule));
});

test('accepts comments outside function bodies', async () => {
  const code = `// Not a secret: access is controlled by Auth and the security rules.
const apiKey = 'demo';

/** Reloads the page. */
export function reload(): void {
  location.reload();
}

export class Reloader {
  /** How many times the page was reloaded. */
  count = 0;

  // A warning above a method, outside its body.
  reload(): string {
    return apiKey;
  }
}
`;
  assert.ok(!(await ruleIdsFor(code, filePath)).includes(rule));
});

for (const directive of [
  '// eslint-disable-next-line no-restricted-globals',
  '/* eslint-disable no-restricted-globals */',
  '// @ts-expect-error reload takes no argument',
  '// @vitest-environment node',
  '// prettier-ignore',
]) {
  test(`accepts the tool directive \`${directive}\` inside a function body`, async () => {
    const code = `export function reload(): void {
  ${directive}
  location.reload();
}
`;
    assert.ok(!(await ruleIdsFor(code, filePath)).includes(rule));
  });
}
