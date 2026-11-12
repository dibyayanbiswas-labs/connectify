# `@repo/eslint-config`

Shared ESLint flat configs.

| Export                        | For                                       |
| ----------------------------- | ----------------------------------------- |
| `@repo/eslint-config/base`    | Packages with no runtime-specific globals |
| `@repo/eslint-config/node-js` | api, services, database, trpc, logger     |
| `@repo/eslint-config/next-js` | apps/web                                  |

Prettier's config is always the last entry, because it only switches rules off.

ESLint 10. React rules come from `@eslint-react/eslint-plugin`, because
`eslint-plugin-react` does not support ESLint 10 (and ESLint 9 is no longer supported).
TypeScript comes from the workspace root; `typescript-eslint` supports `<6.1`.
