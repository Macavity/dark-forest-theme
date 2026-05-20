// Symlinks this theme into one of the host app's registered workspaces.
//
// By default reads the host's `recent-workspaces.json` (the same file the
// desktop app uses to populate its workspace dropdown). Pass
// `--api <url>` (or set WORKSPACE_API_URL) to instead query a running
// host's `/api/workspaces/recent` endpoint.
//
// Other flags:
//   --workspace <name|path|id>   skip the prompt and link straight in
//   --force                      replace an existing target without asking

import { existsSync, readFileSync, lstatSync, rmSync, mkdirSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir, platform } from 'node:os';

interface Workspace {
  id: string;
  path: string;
  name: string;
  icon?: string;
  lastOpened?: number;
}

interface CliArgs {
  workspace: string | null;
  force: boolean;
  api: string | null;
}

const here = dirname(fileURLToPath(import.meta.url));
// Symlink only `dist/` — the dev repo root has node_modules, scripts,
// package.json, etc. that the host would otherwise serve via its static
// theme mount as application/octet-stream.
const themeRoot = resolve(here, '..', 'dist');
const themeId = 'dark-forest';

function userDataDir(): string {
  const home = homedir();
  switch (platform()) {
    case 'darwin':
      return join(home, 'Library', 'Application Support', 'Grove');
    case 'win32':
      return join(process.env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Grove');
    default:
      return join(process.env.XDG_CONFIG_HOME ?? join(home, '.config'), 'Grove');
  }
}

function isWorkspace(value: unknown): value is Workspace {
  if (!value || typeof value !== 'object') return false;
  const w = value as Record<string, unknown>;
  return typeof w.id === 'string' && typeof w.path === 'string' && typeof w.name === 'string';
}

function readWorkspacesFromFile(): Workspace[] {
  const file = join(userDataDir(), 'recent-workspaces.json');
  if (!existsSync(file)) {
    console.error(`No workspace registry found at:\n  ${file}\n`);
    console.error('Open a workspace in the host app at least once, then try again.');
    process.exit(1);
  }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf-8')) as unknown;
    if (!Array.isArray(parsed)) throw new Error('expected an array');
    return parsed.filter(isWorkspace).filter((w) => existsSync(w.path));
  } catch (err) {
    console.error(`Could not parse ${file}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

async function readWorkspacesFromApi(baseUrl: string): Promise<Workspace[]> {
  const url = baseUrl.replace(/\/$/, '') + '/api/workspaces/recent';
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(2000) });
  } catch (err) {
    console.error(`Could not reach the API at ${url}: ${err instanceof Error ? err.message : err}`);
    console.error('Is the host app running on that port?');
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`API returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }
  const body = (await res.json()) as unknown;
  const list = Array.isArray(body) ? body : (body as { workspaces?: unknown }).workspaces;
  if (!Array.isArray(list)) {
    console.error('Unexpected response shape from the API.');
    process.exit(1);
  }
  return list.filter(isWorkspace).filter((w) => existsSync(w.path));
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { workspace: null, force: false, api: process.env.WORKSPACE_API_URL ?? null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force' || a === '-f') args.force = true;
    else if (a === '--workspace' || a === '-w') args.workspace = argv[++i] ?? null;
    else if (a === '--api') args.api = argv[++i] ?? null;
    else if (a === '--help' || a === '-h') {
      console.log(
        `Usage: bun run install:theme [--workspace <name|path|id>] [--api <url>] [--force]\n` +
          `  --api          query a running host app (e.g. http://127.0.0.1:60557).\n` +
          `                 Also honoured via WORKSPACE_API_URL. Defaults to reading\n` +
          `                 recent-workspaces.json from the user data dir.`,
      );
      process.exit(0);
    }
  }
  return args;
}

function pickWorkspaceByQuery(workspaces: Workspace[], q: string): Workspace | undefined {
  return workspaces.find(
    (w) => w.id === q || w.path === q || w.name === q || w.path.endsWith(q),
  );
}

function promptChoice(workspaces: Workspace[]): Workspace {
  console.log('\nRegistered workspaces:\n');
  workspaces.forEach((w, i) => {
    const idx = String(i + 1).padStart(2, ' ');
    console.log(`  ${idx}.  ${w.icon ?? '·'}  ${w.name}`);
    console.log(`        ${w.path}`);
  });
  console.log('');
  const answer = prompt(`Install Dark Forest into [1-${workspaces.length}] (q to cancel):`);
  const t = (answer ?? '').trim().toLowerCase();
  if (t === 'q' || t === '') {
    console.log('Cancelled.');
    process.exit(0);
  }
  const n = Number.parseInt(t, 10);
  if (!Number.isInteger(n) || n < 1 || n > workspaces.length) {
    console.error(`Not a valid choice: ${answer}`);
    process.exit(1);
  }
  return workspaces[n - 1]!;
}

function confirmOverwrite(target: string): boolean {
  const answer = prompt(`  ${target} already exists. Replace? [y/N]:`);
  return (answer ?? '').trim().toLowerCase().startsWith('y');
}

const args = parseArgs(process.argv);

if (!existsSync(themeRoot)) {
  console.error('dist/ does not exist. Run `bun run build` first.');
  process.exit(1);
}

const workspaces = args.api
  ? await readWorkspacesFromApi(args.api)
  : readWorkspacesFromFile();
if (workspaces.length === 0) {
  console.error('No reachable workspaces in the recent list.');
  process.exit(1);
}

let chosen: Workspace | undefined;
if (args.workspace) {
  chosen = pickWorkspaceByQuery(workspaces, args.workspace);
  if (!chosen) {
    console.error(`No registered workspace matches "${args.workspace}".`);
    console.error('Known workspaces:');
    for (const w of workspaces) console.error(`  - ${w.name}  (${w.path})`);
    process.exit(1);
  }
} else {
  chosen = promptChoice(workspaces);
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
} catch {
  // not present — nothing to clear
}

if (occupied) {
  if (!args.force && !confirmOverwrite(target)) {
    console.log('Cancelled.');
    process.exit(0);
  }
  rmSync(target, { recursive: true, force: true });
}

symlinkSync(themeRoot, target, 'dir');

console.log(`\nLinked: ${target}`);
console.log(`     →  ${themeRoot}`);
console.log(`\nOpen "${chosen.name}" → Settings → Marketplace → Themes → Dark Forest.`);
