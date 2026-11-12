import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

import { sharedConfig } from "./base.js";

/**
 * ESLint config for Node.js packages (api, services, database, trpc).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  ...sharedConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
];
