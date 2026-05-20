// Copies the specific .woff2 subsets we ship out of @fontsource packages
// into ./dist/fonts/, with stable filenames that theme.css references.
//
// Run after `bun install`:  bun run build:fonts
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const fontsDir = resolve(root, 'dist', 'fonts');
const nm = resolve(root, 'node_modules');

const copies: ReadonlyArray<readonly [string, string]> = [
  // Cormorant Garamond — display serif
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2', 'cormorant-garamond-400.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-500-normal.woff2', 'cormorant-garamond-500.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff2', 'cormorant-garamond-600.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-italic.woff2', 'cormorant-garamond-italic-400.woff2'],
  ['@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-italic.woff2', 'cormorant-garamond-italic-600.woff2'],
  // DM Sans — body (variable wght axis)
  ['@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', 'dm-sans-variable.woff2'],
  // JetBrains Mono — code
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2', 'jetbrains-mono-400.woff2'],
  ['@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2', 'jetbrains-mono-500.woff2'],
];

await mkdir(fontsDir, { recursive: true });

let copied = 0;
const missing: string[] = [];
for (const [from, to] of copies) {
  const src = resolve(nm, from);
  const dst = resolve(fontsDir, to);
  try {
    await access(src);
  } catch {
    missing.push(from);
    continue;
  }
  await copyFile(src, dst);
  copied++;
  console.log(`  ${to}`);
}

if (missing.length) {
  console.error('\nMissing source files — run `bun install` first:');
  for (const m of missing) console.error(`  ${m}`);
  process.exit(1);
}

console.log(`\nCopied ${copied} font files into dist/fonts/`);
