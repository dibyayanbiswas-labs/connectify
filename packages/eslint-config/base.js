import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";

/**
 * Rules shared by every package. Exported without Prettier so that each final
 * config can append Prettier last: it only turns rules off, so anything listed
 * after it could turn a formatting rule back on.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const sharedConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      // process.env.X must be declared in turbo.json, or Turbo strips it from tasks.
      "turbo/no-undeclared-env-vars": "error",
    },
  },
  {
    ignores: ["dist/**", ".turbo/**", "coverage/**"],
  },
];

/**
 * Config for packages with no runtime-specific globals.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [...sharedConfig, eslintConfigPrettier];
