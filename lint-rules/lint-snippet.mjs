import assert from 'node:assert/strict';
import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)) });

/**
 * Lints `code` with the repo's `eslint.config.js` as if it were the file at `filePath`
 * (relative to the repo root), and returns the IDs of the rules it breaks.
 */
export async function ruleIdsFor(code, filePath) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

/** Asserts that `code`, linted as the file at `filePath`, breaks `rule`. */
export async function rejects(code, filePath, rule) {
  const ruleIds = await ruleIdsFor(code, filePath);
  assert.ok(ruleIds.includes(rule), `expected ${rule}, got ${JSON.stringify(ruleIds)}`);
}

/** Asserts that `code`, linted as the file at `filePath`, doesn't break `rule`. */
export async function accepts(code, filePath, rule) {
  const ruleIds = await ruleIdsFor(code, filePath);
  assert.ok(!ruleIds.includes(rule), `expected no ${rule}, got ${JSON.stringify(ruleIds)}`);
}
