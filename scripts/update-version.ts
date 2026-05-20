// Interactive version bump. Reads the current version from the first
// file in VERSIONED_FILES, offers patch / minor / major / manual, then
// writes the new version into every file in that list.
//
// After the bump, commit and tag manually:
//   git commit -am "release: <new>"
//   git tag v<new>
//   git push && git push --tags
// Pushing the tag triggers .github/workflows/release.yml.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// All JSON files whose `version` field must stay in lockstep.
const VERSIONED_FILES: ReadonlyArray<string> = ['dist/theme.json', 'package.json'];

interface Versioned {
  version?: string;
  [key: string]: unknown;
}

interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

async function readJson(path: string): Promise<Versioned> {
  return JSON.parse(await readFile(path, 'utf-8')) as Versioned;
}

async function writeJson(path: string, data: Versioned): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function parseVersion(version: string): SemVer {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isInteger(n) || n < 0)) {
    throw new Error(`Not a valid semver: ${version}`);
  }
  const [major, minor, patch] = parts as [number, number, number];
  return { major, minor, patch };
}

function increment(version: string, type: 'major' | 'minor' | 'patch'): string {
  const v = parseVersion(version);
  switch (type) {
    case 'major':
      return `${v.major + 1}.0.0`;
    case 'minor':
      return `${v.major}.${v.minor + 1}.0`;
    case 'patch':
      return `${v.major}.${v.minor}.${v.patch + 1}`;
  }
}

const files = VERSIONED_FILES.map((rel) => resolve(root, rel));
const datas = await Promise.all(files.map(readJson));

const currentVersion = datas[0]?.version;
if (typeof currentVersion !== 'string') {
  console.error(`No version field found in ${VERSIONED_FILES[0]}.`);
  process.exit(1);
}

console.log(`\n🌟  Current version: \x1b[36m${currentVersion}\x1b[0m\n`);

const newPatch = increment(currentVersion, 'patch');
const newMinor = increment(currentVersion, 'minor');
const newMajor = increment(currentVersion, 'major');

console.log('🔄  How would you like to update the version?\n');
console.log(`   1️⃣  Auto update \x1b[33mpatch\x1b[0m version   (new version: \x1b[32m${newPatch}\x1b[0m)`);
console.log(`   2️⃣  Auto update \x1b[33mminor\x1b[0m version   (new version: \x1b[32m${newMinor}\x1b[0m)`);
console.log(`   3️⃣  Auto update \x1b[33mmajor\x1b[0m version   (new version: \x1b[32m${newMajor}\x1b[0m)`);
console.log(`   4️⃣  Input version \x1b[33mmanually\x1b[0m`);
console.log('   0️⃣  Quit without updating\n');

const choice = (prompt('👉  Please choose (1/2/3/4):') ?? '').trim();

let newVersion: string;
switch (choice) {
  case '1':
    newVersion = newPatch;
    break;
  case '2':
    newVersion = newMinor;
    break;
  case '3':
    newVersion = newMajor;
    break;
  case '4': {
    const manual = (prompt('✍️  Please enter the new version (in a.b.c format):') ?? '').trim();
    try {
      parseVersion(manual);
    } catch (err) {
      console.error(`\n❌  ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
    newVersion = manual;
    break;
  }
  case '0':
    console.log('\n🛑  Skipping version update.');
    process.exit(0);
  default:
    console.log('\n❌  Invalid option, no version update.');
    process.exit(1);
}

await Promise.all(
  files.map((path, i) => writeJson(path, { ...datas[i], version: newVersion })),
);

console.log(`\n✅  Version successfully updated to: \x1b[32m${newVersion}\x1b[0m`);
console.log('\nNext steps:');
console.log(`   git commit -am "release: ${newVersion}"`);
console.log(`   git tag v${newVersion}`);
console.log(`   git push && git push --tags    # triggers the release workflow`);
