# Dark Forest

A moss-green dark forest theme — Cormorant Garamond display serif, DM Sans body, JetBrains Mono code, with a warm dappled-light accent. Ships light and dark in a single CSS file via the browser's `light-dark()` function and follows your OS color scheme.

![Dark Forest preview](screenshots/cherrymon.png)

## Install

1. **Install deps and build the `dist/` output:**

   ```sh
   bun install
   bun run build       # theme.json + theme.css + fonts → dist/
   ```

   On a fresh clone, `bun run build` notices `fonts/` is empty and runs `build:fonts` first to pull the woff2 subsets from `@fontsource`. After that the directory is cached locally; subsequent builds skip the fetch. Run `bun run build:fonts` explicitly to force a refresh after bumping the `@fontsource/*` devDependencies.

2. **Drop the theme into a workspace.** Easiest path — pick one of your registered workspaces interactively:

   ```sh
   bun run install:theme
   ```

   That reads the host's `recent-workspaces.json`, prompts you to choose, and creates a symlink at `<workspace>/.grove/themes/dark-forest/`. Pass `--workspace <name|path|id>` to skip the prompt, `--force` to replace an existing target.

   If the host app is running, you can query its live API instead of the on-disk file — handy if you're not sure the file is up to date:

   ```sh
   bun run install:theme --api http://127.0.0.1:60557
   # or
   WORKSPACE_API_URL=http://127.0.0.1:60557 bun run install:theme
   ```

   (The port is OS-assigned; find it in the host's devtools or via `lsof -nP -iTCP -sTCP:LISTEN`.)

   Or do it by hand if you prefer:

   ```sh
   ln -s "$PWD/dist" /path/to/your/workspace/.grove/themes/dark-forest
   ```

   (Link `dist/`, not the repo root — see the note below. The directory name must be `dark-forest` to match the manifest `id`.)

3. **Pick the theme** in Settings → Marketplace → Themes → Dark Forest. Set it as the active light *and* dark theme — a single CSS file covers both schemes.

## What's in here

Theme sources (`theme.json`, `theme.css`, the scripts) are committed to git. `dist/` and `fonts/` are both build artifacts — gitignored and regenerated from `@fontsource` and the sources by `bun run build`.

| Path | Purpose |
| --- | --- |
| `theme.json` | Source manifest (`id`, `modes`, `entry`, …) |
| `theme.css` | Source stylesheet — `@font-face` declarations + `--grove-*` token overrides |
| `fonts/*.woff2` | *Gitignored.* Latin subsets of Cormorant Garamond, DM Sans (variable), JetBrains Mono, copied out of the pinned `@fontsource` devDependencies on first build. |
| `scripts/build.ts` | Validates `theme.json`, ensures `fonts/` exists, copies manifest + CSS + fonts into `dist/`. Hook point for minification. |
| `scripts/build-fonts.ts` | Refreshes `fonts/` from `@fontsource`. Auto-invoked by `build.ts` when `fonts/` is empty; run it directly to refresh after bumping the `@fontsource/*` deps. |
| `scripts/build-zip.ts` | Produces `dark-forest-<version>.zip` from `dist/` for GitHub releases |
| `scripts/validate-manifest.ts` | Validates the root `theme.json` against the published manifest schema |
| `scripts/install.ts` | Picks one of your registered workspaces and symlinks `dist/` into it |
| `scripts/update-version.ts` | Interactive semver bump — keeps `theme.json` and `package.json` in sync |
| `.github/workflows/release.yml` | Builds + publishes the release zip on `v*.*.*` tag push |

### Why a `dist/` subdirectory?

The theme dir is served as static assets to the renderer. If you symlinked the whole dev repo, that mount would serve `node_modules/`, `package.json`, `bun.lock`, and the scripts as `application/octet-stream`. Linking only `dist/` keeps the surface area minimal — and matches exactly what gets zipped for a marketplace release. Keeping `dist/` separate from sources also means `build.ts` is the obvious place to slot in minification (lightningcss for the CSS, minified JSON for the manifest) without touching anything else.

## Release

```sh
bun run version:bump        # interactive: bumps theme.json + package.json in lockstep
git commit -am "release: 0.2.0"
git tag v0.2.0
git push && git push --tags
```

Pushing the tag triggers `.github/workflows/release.yml`, which re-installs deps, rebuilds `dist/`, zips it, and attaches `dark-forest-<version>.zip` to a new GitHub release. The marketplace install flow downloads from `github.com`, `codeload.github.com`, or `objects.githubusercontent.com` only, so a GitHub release asset is the simplest distribution channel.

To build the zip locally without releasing:

```sh
bun install
bun run validate           # check theme.json against the published schema
bun run build              # populate dist/ (fonts + theme files)
bun run build:zip          # produces dark-forest-<version>.zip at the repo root
```

## Requirements

- A host app that loads themes via the `--grove-*` token namespace and a `theme.json` manifest. Minimum host version is declared in `theme.json` (`minGroveVersion`).
- For local development: [Bun](https://bun.sh) ≥ 1.3 and a `zip` CLI (preinstalled on macOS / most Linux distros)

## License

MIT © 2026 Alexander Pape. Fonts retain their upstream licenses (Cormorant Garamond — OFL; DM Sans — OFL; JetBrains Mono — OFL).
