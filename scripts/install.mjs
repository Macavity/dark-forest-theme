// Symlinks this theme into one of Grove's registered workspaces.
//
// Reads Grove's `recent-workspaces.json` (the same file the desktop app
// uses to populate its "Open workspace" dropdown), prints a numbered
// list, and links `<chosen>/.grove/themes/dark-forest` → this repo.
//
// Pass `--workspace <name|path|id>` to skip the prompt, or `--force` to
// replace an existing target without asking.

import { existsSync, readFileSync, lstatSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
const themeRoot = resolve(here, '..');
const themeId = 'dark-forest';

function userDataDir() {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Grove');
    case 'win32':
      return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'), 'Grove');
    default:
      return join(process.env.XDG_CONFIG_HOME || join(home, '.config'), 'Grove');
  }
}

function readWorkspaces() {
  const file = join(userDataDir(), 'recent-workspaces.json');
  if (!existsSync(file)) {
    console.error(`No Grove workspace registry found at:\n  ${file}\n`);
    console.error('Open a workspace in Grove at least once, then try again.');
    process.exit(1);
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf-8'));
  } catch (err) {
    console.error(`Could not parse ${file}: ${err.message}`);
    process.exit(1);
  }
  return parsed.filter((w) => w && typeof w.path === 'string' && existsSync(w.path));
}

function parseArgs(argv) {
  const args = { workspace: null, force: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') args.force = true;
    else if (a === '--workspace' || a === '-w') args.workspace = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: pnpm run install:theme [--workspace <name|path|id>] [--force]`);
      process.exit(0);
    }
  }
  return args;
}

function pickWorkspaceByQuery(workspaces, q) {
  return workspaces.find(
    (w) => w.id === q || w.path === q || w.name === q || w.path.endsWith(q),
  );
}

async function promptChoice(workspaces) {
  const rl = createInterface({ input: stdin, output: stdout });
  console.log('\nRegistered Grove workspaces:\n');
  workspaces.forEach((w, i) => {
    const idx = String(i + 1).padStart(2, ' ');
    console.log(`  ${idx}.  ${w.icon || '·'}  ${w.name}`);
    console.log(`        ${w.path}`);
  });
  console.log('');
  const answer = await rl.question(`Install Dark Forest into [1-${workspaces.length}] (q to cancel): `);
  rl.close();
  const t = answer.trim().toLowerCase();
  if (t === 'q' || t === '') {
    console.log('Cancelled.');
    process.exit(0);
  }
  const n = Number.parseInt(t, 10);
  if (!Number.isInteger(n) || n < 1 || n > workspaces.length) {
    console.error(`Not a valid choice: ${answer}`);
    process.exit(1);
  }
  return workspaces[n - 1];
}

async function confirmOverwrite(target) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`  ${target} already exists. Replace? [y/N]: `);
  rl.close();
  return answer.trim().toLowerCase().startsWith('y');
}

const args = parseArgs(process.argv);
const workspaces = readWorkspaces();
if (workspaces.length === 0) {
  console.error('No reachable workspaces in Grove\'s recent list.');
  process.exit(1);
}

let chosen;
if (args.workspace) {
  chosen = pickWorkspaceByQuery(workspaces, args.workspace);
  if (!chosen) {
    console.error(`No registered workspace matches "${args.workspace}".`);
    console.error('Known workspaces:');
    for (const w of workspaces) console.error(`  - ${w.name}  (${w.path})`);
    process.exit(1);
  }
} else {
  chosen = await promptChoice(workspaces);
}

const themesDir = join(chosen.path, '.grove', 'themes');
const target = join(themesDir, themeId);

mkdirSync(themesDir, { recursive: true });

// existsSync() follows symlinks, so a broken symlink returns false there.
// lstat() catches both broken links and real files/dirs.
let occupied = false;
try {
  lstatSync(target);
  occupied = true;
} catch {}

if (occupied) {
  if (!args.force) {
    const ok = await confirmOverwrite(target);
    if (!ok) {
      console.log('Cancelled.');
      process.exit(0);
    }
  }
  rmSync(target, { recursive: true, force: true });
}

symlinkSync(themeRoot, target, 'dir');

console.log(`\nLinked: ${target}`);
console.log(`     →  ${themeRoot}`);
console.log(`\nOpen "${chosen.name}" in Grove → Settings → Marketplace → Themes → Dark Forest.`);
