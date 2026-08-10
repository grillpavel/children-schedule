import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Enforces hard rule #3: packages/domain must stay pure.
 * Only the standard library, zod and date-fns are allowed.
 */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react-dom',
                'next',
                'next/*',
                '@react*',
                'zustand',
                'immer',
              ],
              message:
                'packages/domain musí zůstat čistá — žádný import z React/Next/state knihoven.',
            },
          ],
          paths: [
            {
              name: 'node:fs',
              message: 'Doména nesmí sahat na síť ani filesystem.',
            },
            {
              name: 'node:https',
              message: 'Doména nesmí sahat na síť ani filesystem.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Doména nesmí volat fetch.' },
        { name: 'window', message: 'Doména nesmí sahat na DOM.' },
        { name: 'document', message: 'Doména nesmí sahat na DOM.' },
      ],
    },
  },
);
