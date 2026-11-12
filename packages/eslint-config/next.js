import eslintReact from "@eslint-react/eslint-plugin";
import pluginNext from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier";
import pluginReactHooks from "eslint-plugin-react-hooks";
import { globalIgnores } from "eslint/config";
import globals from "globals";

import { sharedConfig } from "./base.js";

/**
 * ESLint config for the Next.js app.
 *
 * React rules come from @eslint-react (TypeScript-aware, supports ESLint 10).
 * eslint-plugin-react was dropped because it does not support ESLint 10.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nextJsConfig = [
  ...sharedConfig,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  eslintReact.configs["recommended-typescript"],
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
    },
  },
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },
  eslintConfigPrettier,
];
