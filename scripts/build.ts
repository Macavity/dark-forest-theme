// Produces dist/ from the source assets at the repo root: theme.json,
// theme.css, and fonts/. Re-validates the manifest first so schema
// regressions fail here instead of at install time.
//
// fonts/ is a build artifact, not a checked-in source: if it's missing
// or empty, this script invokes `bun run build:fonts` once to populate
// it from the @fontsource devDependencies, then continues.
//
// Optimization hook: minify theme.json by dropping the indent on the
// JSON.stringify call below, or swap copyFile() for lightningcss on
// theme.css. The dist/ layout stays the same in either case.

import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');
const distFontsDir = resolve(distDir, 'fonts');
const srcFontsDir = resolve(root, 'fonts');

async function listFontFiles(): Promise<string[]> {
  try {
    const entries = await readdir(srcFontsDir);
    return entries.filter((f) => f.endsWith('.woff2'));
  } catch {
    return [];
  }
}

async function ensureFonts(): Promise<string[]> {
  let woff2 = await listFontFiles();
  if (woff2.length > 0) return woff2;

  console.log('  fonts/ is empty — running build:fonts to fetch from @fontsource…');
  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', resolve(here, 'build-fonts.ts')],
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (proc.exitCode !== 0) {
    console.error('\nbuild:fonts failed.');
    process.exit(proc.exitCode ?? 1);
  }

  woff2 = await listFontFiles();
  if (woff2.length === 0) {
    console.error('\nbuild:fonts ran but fonts/ is still empty.');
    process.exit(1);
  }
  return woff2;
}

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

async function buildFonts(woff2: string[]): Promise<void> {
  await mkdir(distFontsDir, { recursive: true });
  for (const file of woff2) {
    await copyFile(join(srcFontsDir, file), join(distFontsDir, file));
    console.log(`  fonts/${file}`);
  }
}

// Resolve fonts BEFORE clearing dist/ — if build:fonts itself fails,
// at least the prior dist/ is still around.
const woff2 = await ensureFonts();

// Clear dist/ for a clean rebuild — guards against stale artifacts when
// source files are renamed or deleted.
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await buildManifest();
await buildCss();
await buildFonts(woff2);

console.log('\nBuild complete. dist/ is ready to symlink or zip.');
