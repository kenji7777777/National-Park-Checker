import react from "eslint-plugin-react";

// Catches references to undefined names across the split modules (npm run lint).
export default [
  {
    plugins: { react },
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        React: "readonly", ReactDOM: "readonly", window: "readonly", document: "readonly",
        navigator: "readonly", localStorage: "readonly", console: "readonly", setTimeout: "readonly",
        clearTimeout: "readonly", Blob: "readonly", URL: "readonly", File: "readonly", FileReader: "readonly",
        fetch: "readonly", Image: "readonly", Date: "readonly", Math: "readonly", JSON: "readonly",
        encodeURIComponent: "readonly", requestAnimationFrame: "readonly", cancelAnimationFrame: "readonly",
        performance: "readonly", Path2D: "readonly",
      },
    },
    rules: { "no-undef": "error", "no-dupe-keys": "error", "react/jsx-no-undef": "error", "react/jsx-uses-vars": "error", "react/jsx-uses-react": "error", "no-unused-vars": ["warn", { varsIgnorePattern: "^_", args: "none" }] },
  },
];
