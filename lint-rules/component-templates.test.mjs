import { test } from 'node:test';
import { accepts, rejects } from './lint-snippet.mjs';

const maxInlineRule = '@angular-eslint/component-max-inline-declarations';
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
  await rejects(componentWithInlineTemplate(11), componentPath, maxInlineRule);
});

const templatePath = 'src/app/features/notes/internal/note-form.html';

test('rejects a (submit) handler', async () => {
  const template = `<form (submit)="save()"><button type="submit">Save</button></form>\n`;
  await rejects(template, templatePath, 'no-restricted-syntax');
});

test('rejects novalidate', async () => {
  const template = `<form novalidate [formRoot]="noteForm"><button type="submit">Save</button></form>\n`;
  await rejects(template, templatePath, 'no-restricted-syntax');
});

test('accepts a form bound with [formRoot]', async () => {
  const template = `<form [formRoot]="noteForm"><button type="submit">Save</button></form>\n`;
  await accepts(template, templatePath, 'no-restricted-syntax');
});

test('accepts an inline template of 10 lines', async () => {
  await accepts(componentWithInlineTemplate(10), componentPath, maxInlineRule);
});

test('accepts a 4-line inline styles block', async () => {
  const code = `import { Component } from '@angular/core';

@Component({
  selector: 'app-update-prompt',
  template: \`<p>Update ready</p>\`,
  styles: \`
    :host {
      display: block;
      padding: 1rem;
    }
  \`,
})
export class UpdatePrompt {}
`;
  await accepts(code, componentPath, maxInlineRule);
});
