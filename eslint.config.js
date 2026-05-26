import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

const apiRules = {
    ...js.configs.recommended.rules,
    ...tsPlugin.configs.recommended.rules,
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-undef': 'off',
    'no-redeclare': 'off',
    'no-unused-vars': 'off',
    'curly': ['warn', 'all'],
    '@stylistic/array-bracket-spacing': ['warn', 'never'],
    '@stylistic/arrow-spacing': 'warn',
    '@stylistic/block-spacing': 'warn',
    '@stylistic/brace-style': ['warn', '1tbs', { allowSingleLine: false }],
    '@stylistic/comma-dangle': ['warn', 'never'],
    '@stylistic/comma-spacing': 'warn',
    '@stylistic/comma-style': 'warn',
    '@stylistic/eol-last': 'warn',
    '@stylistic/function-call-spacing': ['warn', 'never'],
    '@stylistic/indent': ['error', 4],
    '@stylistic/key-spacing': 'warn',
    '@stylistic/keyword-spacing': 'warn',
    '@stylistic/member-delimiter-style': ['warn', {
        multiline: {
            delimiter: 'semi',
            requireLast: true
        },
        singleline: {
            delimiter: 'semi',
            requireLast: true
        }
    }],
    '@stylistic/newline-per-chained-call': ['warn', { ignoreChainWithDepth: 1 }],
    '@stylistic/no-extra-semi': 'warn',
    '@stylistic/no-mixed-spaces-and-tabs': 'warn',
    '@stylistic/no-multi-spaces': 'warn',
    '@stylistic/no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
    '@stylistic/no-tabs': 'warn',
    '@stylistic/no-trailing-spaces': 'warn',
    '@stylistic/object-curly-spacing': ['warn', 'always'],
    '@stylistic/quotes': ['warn', 'single', { avoidEscape: true }],
    '@stylistic/semi': ['warn', 'always'],
    '@stylistic/semi-spacing': 'warn',
    '@stylistic/space-before-blocks': 'warn',
    '@stylistic/space-before-function-paren': ['warn', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
    }],
    '@stylistic/space-in-parens': ['warn', 'never'],
    '@stylistic/space-infix-ops': 'warn',
    '@stylistic/type-annotation-spacing': 'warn',
    'padding-line-between-statements': [
        'warn',
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] }
    ]
};

export default [
    {
        ignores: [
            'build/**',
            'node_modules/**',
            '.svelte-kit/**',
            'package/**',
            '.wrangler/**',
            'coverage/**',
            'test-results/**',
            'package-lock.json'
        ]
    },
    ...sveltePlugin.configs['flat/recommended'],
    {
        files: ['**/*.{js,cjs,mjs,ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsParser
        },
        plugins: {
            '@stylistic': stylistic,
            '@typescript-eslint': tsPlugin
        },
        rules: apiRules
    },
    {
        files: ['**/*.cjs'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off'
        }
    },
    {
        files: ['**/*.{ts,tsx,svelte}'],
        rules: {
            '@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': false }],
            'no-constant-condition': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-unreachable': 'warn'
        }
    },
    {
        files: ['**/*.svelte'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: svelteParser,
            parserOptions: {
                parser: tsParser,
                extraFileExtensions: ['.svelte']
            }
        },
        plugins: {
            '@stylistic': stylistic,
            '@typescript-eslint': tsPlugin,
            svelte: sveltePlugin
        },
        rules: {
            ...apiRules,
            '@stylistic/indent': 'off',
            '@stylistic/no-tabs': 'off',
            '@typescript-eslint/no-unused-expressions': 'off',
            'no-constant-condition': 'warn',
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-inner-declarations': 'off',
            'no-self-assign': 'warn',
            'no-unreachable': 'warn',
            'svelte/indent': ['error', {
                indent: 'tab',
                indentScript: true,
                ignoredNodes: [
                    'SvelteAttribute',
                    'SvelteDirective',
                    'SvelteDirectiveKey',
                    'SvelteElement',
                    'SvelteIfBlock',
                    'SvelteElseBlock',
                    'SvelteEndTag',
                    'SvelteLiteral',
                    'SvelteMemberExpressionName',
                    'SvelteName',
                    'SvelteShorthandAttribute',
                    'SvelteStartTag',
                    'SvelteStyleElement'
                ],
                switchCase: 1
            }],
            'svelte/no-unused-svelte-ignore': 'warn',
            'svelte/valid-compile': 'warn'
        }
    }
];
