// Produces dark-forest-<version>.zip from dist/ in the repo root.
// The zip is what Grove's marketplace install flow expects — theme.json
// at the zip root, with the entry CSS and any referenced assets next
// to it. Re-validates the manifest before zipping.
//
// Requires the `zip` CLI (preinstalled on macOS / most Linux distros).

import { existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const distDir = resolve(root, 'dist');

if (!existsSync(distDir)) {
  console.error('dist/ does not exist. Run `pnpm install && pnpm run build:fonts` first.');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(resolve(distDir, 'theme.json'), 'utf-8'));
try {
  parseThemeManifest(manifest);
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

try {
  execFileSync('zip', ['-rq', zipPath, '.'], { cwd: distDir, stdio: 'inherit' });
} catch (err) {
  console.error('zip failed — is the `zip` CLI installed?');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const bytes = statSync(zipPath).size;
const kib = (bytes / 1024).toFixed(1);
console.log(`Built ${zipName}  (${kib} KiB)`);
console.log(`Contents are zipped from the dist/ root — theme.json at the top level.`);
