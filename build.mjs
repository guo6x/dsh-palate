/**
 * dsh-palate build: ESM host for Node 22 + ModuleLoader client bundle.
 * Mirrors the dsh-pilot build. Zero runtime dependencies (node:sqlite is built in).
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'

mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/index.js'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: ['node:sqlite', 'node:fs', 'node:fs/promises', 'node:path', 'node:os'],
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.jsx'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [
    '@deepseek-ai/cordis', '@deepseek-ai/dsh-*',
    'react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler',
  ],
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-palate', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})
