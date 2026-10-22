import { test } from 'node:test';
import { accepts, rejects } from './lint-snippet.mjs';

const dependencyRule = '@softarc/sheriff/dependency-rule';
const encapsulationRule = '@softarc/sheriff/encapsulation';

test("rejects importing another module's internal/ file", async () => {
  const code = `import { injectReturnUrl } from '../../auth/internal/return-url';\n\nexport const returnUrl = injectReturnUrl;\n`;
  await rejects(code, 'src/app/home/internal/home.ts', encapsulationRule);
});

test('accepts a module importing its own internal/ file', async () => {
  const code = `import { injectReturnUrl } from './internal/return-url';\n\nexport const returnUrl = injectReturnUrl;\n`;
  await accepts(code, 'src/app/auth/auth.routes.ts', encapsulationRule);
});

test('rejects a Baseline module importing a Feature', async () => {
  const code = `import { notesRoutes } from '../features/notes/notes.routes';\n\nexport const routes = notesRoutes;\n`;
  await rejects(code, 'src/app/profile/profile.routes.ts', dependencyRule);
});

test('accepts a Feature importing a Baseline module', async () => {
  const code = `import { signedInGuard } from '../../auth/auth-guards';\n\nexport const guard = signedInGuard;\n`;
  await accepts(code, 'src/app/features/notes/notes.routes.ts', dependencyRule);
});
