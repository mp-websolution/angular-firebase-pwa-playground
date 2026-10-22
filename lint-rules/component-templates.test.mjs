import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleIdsFor } from './lint-snippet.mjs';

const componentPath = 'src/app/pwa/update-prompt.ts';

function componentWithInlineTemplate(lineCount) {
  const lines = Array.from({ length: lineCount }, (_, i) => `    <p>Line ${i + 1}</p>`);
  return `import { Component } from '@angular/core';

@Component({
  selector: 'app-update-prompt',
  template: \`
${lines.join('\n')}
  \`,
})
export class UpdatePrompt {}
`;
}

test('rejects an inline template longer than 10 lines', async () => {
  assert.ok(
    (await ruleIdsFor(componentWithInlineTemplate(11), componentPath)).includes(
      '@angular-eslint/component-max-inline-declarations',
    ),
  );
});

const templatePath = 'src/app/features/notes/internal/note-form.html';

test('rejects a (submit) handler', async () => {
  const template = `<form (submit)="save()"><button type="submit">Save</button></form>\n`;
  assert.ok((await ruleIdsFor(template, templatePath)).includes('no-restricted-syntax'));
});

test('rejects novalidate', async () => {
  const template = `<form novalidate [formRoot]="noteForm"><button type="submit">Save</button></form>\n`;
  assert.ok((await ruleIdsFor(template, templatePath)).includes('no-restricted-syntax'));
});

test('accepts a form bound with [formRoot]', async () => {
  const template = `<form [formRoot]="noteForm"><button type="submit">Save</button></form>\n`;
  assert.ok(!(await ruleIdsFor(template, templatePath)).includes('no-restricted-syntax'));
});

test('accepts an inline template of 10 lines', async () => {
  assert.ok(
    !(await ruleIdsFor(componentWithInlineTemplate(10), componentPath)).includes(
      '@angular-eslint/component-max-inline-declarations',
    ),
  );
});
