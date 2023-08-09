/* eslint-env node */
/** @type {import("eslint").Linter.Config} */
module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	plugins: ["@typescript-eslint", "import"],
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:prettier/recommended"],
	parserOptions: {
		sourceType: "module",
		ecmaVersion: "ES2021",
	},
	rules: {
		"@typescript-eslint/no-explicit-any": "error",
		"@typescript-eslint/no-unused-vars": "off",
		"no-debugger": "error",
		"import/consistent-type-specifier-style": ["error", "prefer-inline"],
	},
	ignorePatterns: ["**/dist/*"],
};
