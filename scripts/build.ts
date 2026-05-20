// Produces dist/ from the committed source assets at the repo root:
// theme.json, theme.css, fonts/. Re-validates the manifest first so
// schema regressions fail here instead of at install time.
//
// Optimization hook: minify theme.json by dropping the indent on the
// JSON.stringify call below, or swap copyFile() for lightningcss on
// theme.css. The dist/ layout stays the same in either case.
//
// `bun run build:fonts` is a separate, rarely-used refresh tool that
// repopulates ./fonts/ from @fontsource. It is NOT part of `build`.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const distFontsDir = resolve(distDir, 'fonts');
const srcFontsDir = resolve(root, 'fonts');

async function buildManifest(): Promise<void> {
  const src = resolve(root, 'theme.json');
  const dst = resolve(distDir, 'theme.json');
  const raw = JSON.parse(await readFile(src, 'utf-8')) as unknown;
  const validated = parseThemeManifest(raw);
  await writeFile(dst, JSON.stringify(validated, null, 2) + '\n', 'utf-8');
  console.log('  theme.json');
}

async function buildCss(): Promise<void> {
  const src = resolve(root, 'theme.css');
  const dst = resolve(distDir, 'theme.css');
  await copyFile(src, dst);
  console.log('  theme.css');
}

async function buildFonts(): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(srcFontsDir);
  } catch {
    console.error('\nfonts/ does not exist. Run `bun run build:fonts` once to populate it.');
    process.exit(1);
  }
  const woff2 = entries.filter((f) => f.endsWith('.woff2'));
  if (woff2.length === 0) {
    console.error('\nfonts/ is empty. Run `bun run build:fonts` to populate it.');
    process.exit(1);
  }
  await mkdir(distFontsDir, { recursive: true });
  for (const file of woff2) {
    await copyFile(join(srcFontsDir, file), join(distFontsDir, file));
    console.log(`  fonts/${file}`);
  }
}

// Clear dist/ for a clean rebuild — guards against stale artifacts when
// source files are renamed or deleted.
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await buildManifest();
await buildCss();
await buildFonts();

console.log('\nBuild complete. dist/ is ready to symlink or zip.');
