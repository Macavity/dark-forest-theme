// Parses theme.json against the published manifest schema and prints the
// validated, normalized form. Exits non-zero on validation failure.
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseThemeManifest } from '@grove-notes/manifest-schema';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, '..', 'theme.json');
const raw = JSON.parse(await readFile(manifestPath, 'utf-8')) as unknown;

try {
  const ok = parseThemeManifest(raw);
  console.log('theme.json is valid:');
  console.log(JSON.stringify(ok, null, 2));
} catch (err) {
  console.error('theme.json is INVALID:');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
