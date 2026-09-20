export default [
  {
    // The blocks plugin owns its own toolchain: its JSX under src/ is parsed and
    // linted by wp-scripts (npm run lint:js in plugins/docspress-blocks), and
    // build/ is compiled output. Espree here cannot parse JSX.
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "plugins/docspress-blocks/build/**",
      "plugins/docspress-blocks/src/**"
    ]
  },
  {
    files: ["src/**/*.js", "test/**/*.js", "scripts/**/*.mjs", "bin/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        console: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "off"
    }
  }
];
