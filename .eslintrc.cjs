/** @type { import("eslint").Linter.Config } */
module.exports = {
	root: true,
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:svelte/recommended', 'prettier'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020,
		extraFileExtensions: ['.svelte']
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		// Disable any-type errors
		'@typescript-eslint/no-explicit-any': 'off',
		// Disable no-undef (TypeScript handles this)
		'no-undef': 'off',
		// Downgrade compilable errors to warnings
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-expressions': 'warn',
		'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-expect-error': false }],
		'no-empty': ['warn', { allowEmptyCatch: true }],
		'no-constant-condition': 'warn',
		'prefer-const': 'warn',
		'svelte/no-unused-svelte-ignore': 'warn',
		'svelte/valid-compile': 'warn'
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			},
			rules: {
				// Svelte $: reactive declarations trigger this rule incorrectly
				'@typescript-eslint/no-unused-expressions': 'off'
			}
		}
	]
};
