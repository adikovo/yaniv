const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
    { ignores: ["node_modules/**", "coverage/**"] },
    js.configs.recommended,
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            // Express middleware idiom: handlers (incl. the 4-arg error handler,
            // which must keep `next` to be recognized as one) often leave args
            // unused. Don't flag unused function args; still catch unused vars/imports.
            "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
        },
    },
    {
        // Test files (Jest) get Jest globals on top of Node.
        files: ["**/*.test.js", "tests/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
    },
];
