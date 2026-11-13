// Bundles the API and the migration script into self-contained files in dist/,
// so the runtime image needs only Node: no pnpm, no node_modules, no TypeScript.
import { build } from "esbuild";

await build({
  entryPoints: {
    index: "src/index.ts",
    migrate: "../../packages/database/scripts/migrate.ts",
  },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  sourcemap: true,
  // pg's optional native driver; not installed, never loaded.
  external: ["pg-native"],
  // CommonJS dependencies call require() for Node built-ins; ESM output has no require.
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
  logLevel: "info",
});
