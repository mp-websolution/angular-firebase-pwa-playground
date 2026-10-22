import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { ESLint } from 'eslint';

const eslint = new ESLint({ cwd: new URL('..', import.meta.url).pathname });

async function ruleIdsFor(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

async function sheriffRuleIdsFor(filePath, importStatement) {
  const ruleIds = await ruleIdsFor(filePath, `${importStatement}\n`);
  return ruleIds.filter((ruleId) => ruleId?.startsWith('@softarc/sheriff/'));
}

describe('module dependency rules (ADR 0005)', () => {
  const forbidden = [
    [
      'a Baseline file importing a Feature',
      'src/app/auth/auth-session.ts',
      "import { notesRoutes } from '../features/notes/notes.routes';",
    ],
    [
      'a Feature importing another Feature',
      'src/app/features/other/other.ts',
      "import { notesRoutes } from '../notes/notes.routes';",
    ],
    [
      'production code importing the test helpers',
      'src/app/home/internal/home.ts',
      "import { renderApp } from '../../testing/render-app';",
    ],
    [
      'a Baseline spec importing a Feature fake',
      'src/app/auth/auth-guards.spec.ts',
      "import { FakeNotesData } from '../features/notes/internal/testing/fake-notes-data';",
    ],
  ];
  for (const [name, filePath, importStatement] of forbidden) {
    test(`fails lint for ${name}`, async () => {
      assert.ok(
        (await sheriffRuleIdsFor(filePath, importStatement)).includes(
          '@softarc/sheriff/dependency-rule',
        ),
      );
    });
  }
});

describe('module-private internal/ folders (ADR 0006, ADR 0007)', () => {
  const forbidden = [
    [
      "home importing auth's return URL helpers",
      'src/app/home/internal/home.ts',
      "import { injectReturnUrl } from '../../auth/internal/return-url';",
    ],
    [
      "home importing auth's signedOutGuard",
      'src/app/home/internal/home.ts',
      "import { signedOutGuard } from '../../auth/internal/signed-out-guard';",
    ],
    [
      'the app routes importing the sign-in page',
      'src/app/app.routes.ts',
      "import { SignIn } from './auth/internal/sign-in/sign-in';",
    ],
    [
      'the Feature route list importing the notes page',
      'src/app/features/features.routes.ts',
      "import { Notes } from './notes/internal/notes';",
    ],
    [
      "the test helpers importing auth's credentials form",
      'src/app/testing/render-app.ts',
      "import { CredentialsForm } from '../auth/internal/credentials-form';",
    ],
    [
      "another module's spec importing auth's failure model",
      'src/app/live-data/inject-live-data.integration.spec.ts',
      "import { AuthFailure } from '../auth/internal/auth-failure.model';",
    ],
  ];
  for (const [name, filePath, importStatement] of forbidden) {
    test(`fails lint for ${name}`, async () => {
      assert.ok(
        (await sheriffRuleIdsFor(filePath, importStatement)).includes(
          '@softarc/sheriff/encapsulation',
        ),
      );
    });
  }

  const allowed = [
    [
      'the app routes importing a routes file',
      'src/app/app.routes.ts',
      "import { authRoutes } from './auth/auth.routes';",
    ],
    [
      "sign-in importing its own module's credentials form",
      'src/app/auth/internal/sign-in/sign-in.ts',
      "import { CredentialsForm } from '../credentials-form';",
    ],
    [
      'the notes routes importing the notes page',
      'src/app/features/notes/notes.routes.ts',
      "import { Notes } from './internal/notes';",
    ],
  ];
  for (const [name, filePath, importStatement] of allowed) {
    test(`passes lint for ${name}`, async () => {
      assert.deepEqual(await sheriffRuleIdsFor(filePath, importStatement), []);
    });
  }
});

describe('comments (CODING_STANDARDS.md, Comments and naming)', () => {
  test('fails lint for a comment inside a function body', async () => {
    const code =
      'export function reload(): void {\n  // Explains a step.\n  location.reload();\n}\n';
    assert.ok(
      (await ruleIdsFor('src/app/browser/reload-page.ts', code)).includes(
        'local/no-comments-in-function-bodies',
      ),
    );
  });

  test('passes lint for a one-line warning above a declaration and a tool directive', async () => {
    const code =
      '// No SVG: it can carry scripts.\nexport function reload(): void {\n  // eslint-disable-next-line no-restricted-globals\n  location.reload();\n}\n';
    assert.ok(
      !(await ruleIdsFor('src/app/browser/reload-page.ts', code)).includes(
        'local/no-comments-in-function-bodies',
      ),
    );
  });
});

describe('component templates (CODING_STANDARDS.md, Component templates)', () => {
  const component = (lines) =>
    `import { Component } from '@angular/core';\n\n@Component({\n  selector: 'app-probe',\n  template: \`\n${'    <p>line</p>\n'.repeat(lines)}  \`,\n})\nexport class Probe {}\n`;

  test('fails lint for an inline template longer than 10 lines', async () => {
    assert.ok(
      (await ruleIdsFor('src/app/pwa/update-prompt.ts', component(11))).includes(
        '@angular-eslint/component-max-inline-declarations',
      ),
    );
  });

  test('passes lint for an inline template of 10 lines or fewer', async () => {
    assert.ok(
      !(await ruleIdsFor('src/app/pwa/update-prompt.ts', component(8))).includes(
        '@angular-eslint/component-max-inline-declarations',
      ),
    );
  });
});

describe('signal forms (CODING_STANDARDS.md, Signal forms)', () => {
  test('fails lint for a (submit) handler', async () => {
    assert.ok(
      (await ruleIdsFor('src/app/probe.html', '<form (submit)="save()"></form>\n')).includes(
        'no-restricted-syntax',
      ),
    );
  });

  test('fails lint for novalidate', async () => {
    assert.ok(
      (await ruleIdsFor('src/app/probe.html', '<form novalidate></form>\n')).includes(
        'no-restricted-syntax',
      ),
    );
  });
});
