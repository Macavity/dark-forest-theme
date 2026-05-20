// Produces dark-forest-<version>.zip from dist/ in the repo root.
// The zip is what the marketplace install flow expects — theme.json at
// the zip root, with the entry CSS and any referenced assets next to it.
// Re-validates the manifest before zipping.
//
// Requires the `zip` CLI (preinstalled on macOS / most Linux distros;
// installable via `apt-get install zip` / `brew install zip`).

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ does not exist. Run `bun install && bun run build:fonts` first.');
  process.exit(1);
}

const manifestRaw = JSON.parse(readFileSync(resolve(distDir, 'theme.json'), 'utf-8')) as unknown;
let manifest: ReturnType<typeof parseThemeManifest>;
try {
  manifest = parseThemeManifest(manifestRaw);
} catch (err) {
  console.error('dist/theme.json failed validation:');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const entry = resolve(distDir, manifest.entry);
if (!existsSync(entry)) {
  console.error(`Manifest entry "${manifest.entry}" is missing from dist/.`);
  process.exit(1);
}

const zipName = `${manifest.id}-${manifest.version}.zip`;
const zipPath = resolve(root, zipName);
if (existsSync(zipPath)) rmSync(zipPath);

const proc = Bun.spawnSync({
  cmd: ['zip', '-rq', zipPath, '.'],
  cwd: distDir,
  stdout: 'inherit',
  stderr: 'inherit',
});

if (proc.exitCode !== 0) {
  console.error('zip failed — is the `zip` CLI installed?');
  process.exit(proc.exitCode ?? 1);
}

const bytes = statSync(zipPath).size;
const kib = (bytes / 1024).toFixed(1);
console.log(`Built ${zipName}  (${kib} KiB)`);
console.log('Contents are zipped from the dist/ root — theme.json at the top level.');
