// Symlinks this theme into one of Grove's registered workspaces.
//
// By default reads Grove's `recent-workspaces.json` (the same file the
// desktop app uses to populate its workspace dropdown). Pass
// `--api <url>` (or set GROVE_API_URL) to instead query a running Grove
// instance's `/api/workspaces/recent` endpoint.
//
// Other flags:
//   --workspace <name|path|id>   skip the prompt and link straight in
//   --force                      replace an existing target without asking

import { existsSync, readFileSync, lstatSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const here = dirname(fileURLToPath(import.meta.url));
// Symlink only `dist/` — the dev repo root has node_modules, scripts,
// package.json, etc. that Grove would otherwise serve via its static
// theme mount as application/octet-stream.
const themeRoot = resolve(here, '..', 'dist');
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

function readWorkspacesFromFile() {
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

async function readWorkspacesFromApi(baseUrl) {
  const url = baseUrl.replace(/\/$/, '') + '/api/workspaces/recent';
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    console.error(`Could not reach Grove API at ${url}: ${err.message}`);
    console.error('Is Grove running on that port?');
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`Grove API returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const body = await res.json();
  const list = Array.isArray(body) ? body : body.workspaces;
  if (!Array.isArray(list)) {
    console.error('Unexpected response shape from Grove API.');
    process.exit(1);
  }
  return list.filter((w) => w && typeof w.path === 'string' && existsSync(w.path));
}

function parseArgs(argv) {
  const args = { workspace: null, force: false, api: process.env.GROVE_API_URL || null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') args.force = true;
    else if (a === '--workspace' || a === '-w') args.workspace = argv[++i];
    else if (a === '--api') args.api = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: pnpm run install:theme [--workspace <name|path|id>] [--api <url>] [--force]\n` +
          `  --api          query a running Grove (e.g. http://127.0.0.1:60557).\n` +
          `                 Also honoured via GROVE_API_URL. Defaults to reading\n` +
          `                 recent-workspaces.json from the user data dir.`,
      );
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
const workspaces = args.api
  ? await readWorkspacesFromApi(args.api)
  : readWorkspacesFromFile();
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
