import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
import hooks from "eslint-plugin-react-hooks";

export default ts.config(
  {
    ignores: [
      "**/dist/**",
      "**/.wrangler/**",
      "**/.cache/**",
      ".npm-cache/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": hooks },
    rules: hooks.configs.recommended.rules,
  },
);
