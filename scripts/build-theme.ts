// Copies the source theme files (theme.json, theme.css at the repo root)
// into ./dist/. Re-validates the manifest before writing. Fonts come
// from `bun run build:fonts` and land in dist/fonts/ separately.
//
// This is the natural place to add minification or other optimization
// later (lightningcss for the stylesheet, minified JSON for the manifest)
// — extend the two functions below.

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');

async function buildManifest(): Promise<void> {
  const srcPath = resolve(root, 'theme.json');
  const dstPath = resolve(distDir, 'theme.json');
  const raw = JSON.parse(await readFile(srcPath, 'utf-8')) as unknown;
  // Throws on schema violations — better here than at install time.
  const validated = parseThemeManifest(raw);
  // Indented for readability inside the release zip. Switch to
  // `JSON.stringify(validated)` to minify.
  await writeFile(dstPath, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
  console.log('  theme.json');
}

async function buildCss(): Promise<void> {
  const srcPath = resolve(root, 'theme.css');
  const dstPath = resolve(distDir, 'theme.css');
  // Straight copy for now. To minify, replace this with e.g.
  //   import { transform } from 'lightningcss';
  //   const { code } = transform({ filename: srcPath, code: await readFile(srcPath), minify: true });
  //   await writeFile(dstPath, code);
  await copyFile(srcPath, dstPath);
  console.log('  theme.css');
}

await mkdir(distDir, { recursive: true });
await buildManifest();
await buildCss();
console.log('\nWrote theme files into dist/');
