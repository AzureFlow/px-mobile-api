/** @type {import("prettier").Config} */
module.exports = {
	printWidth: 128,
	trailingComma: "all",
	useTabs: true,
	tabWidth: 4,
	semi: true,
	singleQuote: false,
	quoteProps: "as-needed",
	endOfLine: "lf",
	bracketSpacing: true,

	overrides: [
		{
			files: "*.md",
			options: {
				tabWidth: 2,
			},
		},
		{
			files: "README.md",
			options: {},
		},
	],
};
