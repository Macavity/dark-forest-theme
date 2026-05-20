// Umbrella build: copies fonts and theme files into dist/.
// Equivalent to `bun run build:fonts && bun run build:theme`, but
// shorter to type and gives a single composite exit code.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const steps: Array<readonly [string, string]> = [
  ['fonts', resolve(here, 'build-fonts.ts')],
  ['theme', resolve(here, 'build-theme.ts')],
];

for (const [label, script] of steps) {
  console.log(`\n→ build:${label}`);
  const proc = Bun.spawnSync({
    cmd: ['bun', 'run', script],
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (proc.exitCode !== 0) {
    console.error(`\nbuild:${label} failed.`);
    process.exit(proc.exitCode ?? 1);
  }
}

console.log('\nBuild complete. dist/ is ready to symlink or zip.');
