// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const sheriff = require('@softarc/eslint-plugin-sheriff');
const noCommentsInFunctionBodies = require('./lint-rules/no-comments-in-function-bodies');

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    plugins: {
      local: { rules: { 'no-comments-in-function-bodies': noCommentsInFunctionBodies } },
    },
    rules: {
      'local/no-comments-in-function-bodies': 'error',
      '@angular-eslint/component-max-inline-declarations': ['error', { template: 10 }],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [sheriff.configs.all],
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'BoundEvent[name="submit"]',
          message:
            'Declare submission in form() options and bind the form with [formRoot] (CODING_STANDARDS.md, Signal forms).',
        },
        {
          selector: 'TextAttribute[name="novalidate"]',
          message:
            '[formRoot] already turns off native validation (CODING_STANDARDS.md, Signal forms).',
        },
      ],
    },
  },
]);
