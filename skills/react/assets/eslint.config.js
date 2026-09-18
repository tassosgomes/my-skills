import fs from 'node:fs';

import js from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import { importX } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Bloqueia import entre features. O bulletproof-react escreve uma zona por feature à mão,
 * o que faz toda feature nova nascer sem isolamento até alguém lembrar de editar este arquivo.
 * Aqui as zonas são geradas a partir do disco.
 */
const featureZones = fs
  .readdirSync('./src/features', { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({
    target: `./src/features/${entry.name}`,
    from: './src/features',
    except: [`./${entry.name}`],
    message: 'Features não se importam. Componha os dois domínios em src/app.',
  }));

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat['recommended-latest'],
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
    },
    plugins: { 'import-x': importX, 'check-file': checkFile },
    settings: {
      'import-x/resolver': { typescript: true },
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            ...featureZones,
            // Fluxo unidirecional: compartilhado -> features -> app.
            {
              target: './src/features',
              from: './src/app',
              message: 'Feature não conhece a camada de composição.',
            },
            {
              target: [
                './src/components',
                './src/hooks',
                './src/lib',
                './src/stores',
                './src/types',
                './src/utils',
              ],
              from: ['./src/features', './src/app'],
              message: 'O compartilhado não pode depender de feature nem de app.',
            },
          ],
        },
      ],
      'import-x/no-cycle': 'error',

      // kebab-case em arquivo e pasta, inclusive componente: user-profile.tsx exporta UserProfile.
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { 'src/**/!(__tests__)': 'KEBAB_CASE' },
      ],

      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/index', '@/features/*/index.ts'],
              message: 'Sem barrel: importe o arquivo direto.',
            },
          ],
        },
      ],
    },
  },
);

/**
 * Ausente de propósito: eslint-plugin-jsx-a11y. A versão 6.10.2 declara peer
 * `eslint@^3..^9` e a instalação falha com ESLint 10 (ERESOLVE). Acrescente quando
 * o plugin suportar a major — a11y continua sendo requisito, só não é lintável aqui.
 */
