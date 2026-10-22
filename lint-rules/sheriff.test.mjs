import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleIdsFor } from './lint-snippet.mjs';

const dependencyRule = '@softarc/sheriff/dependency-rule';
const encapsulation = '@softarc/sheriff/encapsulation';

test("rejects importing another module's internal/ file", async () => {
  const code = `import { injectReturnUrl } from '../../auth/internal/return-url';\n\nexport const returnUrl = injectReturnUrl;\n`;
  assert.ok((await ruleIdsFor(code, 'src/app/home/internal/home.ts')).includes(encapsulation));
});

test('accepts a module importing its own internal/ file', async () => {
  const code = `import { injectReturnUrl } from './internal/return-url';\n\nexport const returnUrl = injectReturnUrl;\n`;
  assert.ok(!(await ruleIdsFor(code, 'src/app/auth/auth.routes.ts')).includes(encapsulation));
});

test('rejects a Baseline module importing a Feature', async () => {
  const code = `import { notesRoutes } from '../features/notes/notes.routes';\n\nexport const routes = notesRoutes;\n`;
  assert.ok((await ruleIdsFor(code, 'src/app/profile/profile.routes.ts')).includes(dependencyRule));
});

test('accepts a Feature importing a Baseline module', async () => {
  const code = `import { signedInGuard } from '../../auth/auth-guards';\n\nexport const guard = signedInGuard;\n`;
  assert.ok(
    !(await ruleIdsFor(code, 'src/app/features/notes/notes.routes.ts')).includes(dependencyRule),
  );
});
