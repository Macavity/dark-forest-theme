# Dark Forest

A moss-green dark forest theme for [Grove](https://github.com/grove-notes/grove) — Cormorant Garamond display serif, DM Sans body, JetBrains Mono code, with a warm dappled-light accent. Ships light and dark in a single CSS file via the browser's `light-dark()` function and follows your OS color scheme.

![Dark Forest preview](screenshots/cherrymon.png)

## Install

1. **Build the bundled fonts** (only required if you cloned this repo; published releases include `fonts/`):

   ```sh
   bun install
   bun run build:fonts
   ```

2. **Drop the theme into a Grove workspace.** Easiest path — pick one of your registered workspaces interactively:

   ```sh
   bun run install:theme
   ```

   That reads Grove's `recent-workspaces.json`, prompts you to choose, and creates a symlink at `<workspace>/.grove/themes/dark-forest/`. Pass `--workspace <name|path|id>` to skip the prompt, `--force` to replace an existing target.

   If Grove is running, you can query its live API instead of the on-disk file — handy if you're not sure the file is up to date:

   ```sh
   bun run install:theme --api http://127.0.0.1:60557
   # or
   GROVE_API_URL=http://127.0.0.1:60557 bun run install:theme
   ```

   (The port is OS-assigned; find it in Grove's devtools or via `lsof -nP -iTCP -sTCP:LISTEN -c Grove`.)

   Or do it by hand if you prefer:

   ```sh
   ln -s "$PWD/dist" /path/to/your/workspace/.grove/themes/dark-forest
   ```

   (Link `dist/`, not the repo root — see the note below. The directory name must be `dark-forest` to match the manifest `id`.)

3. **Pick the theme** in Grove → Settings → Marketplace → Themes → Dark Forest. Set it as the active light *and* dark theme — a single CSS file covers both schemes.

## What's in here

The repo splits into two halves: `dist/` is *the theme* (what Grove sees and what gets zipped for release), everything else is *dev/build scaffolding* (only used to produce `dist/`).

| File | Purpose |
| --- | --- |
| `dist/theme.json` | Grove manifest (`id`, `modes`, `entry`, …) |
| `dist/theme.css` | The whole theme — `@font-face` declarations + `--grove-*` token overrides |
| `dist/fonts/*.woff2` | Bundled latin subsets of Cormorant Garamond, DM Sans (variable), JetBrains Mono |
| `scripts/build-fonts.ts` | Copies the `.woff2` files out of `@fontsource` packages into `dist/fonts/` |
| `scripts/build-zip.ts` | Produces `dark-forest-<version>.zip` from `dist/` for GitHub releases |
| `scripts/validate-manifest.ts` | Validates `dist/theme.json` against `@grove-notes/manifest-schema` |
| `scripts/install.ts` | Picks one of your registered Grove workspaces and symlinks `dist/` into it |
| `scripts/update-version.ts` | Interactive semver bump — keeps `dist/theme.json` and `package.json` in sync |
| `.github/workflows/release.yml` | Builds + publishes the release zip on `v*.*.*` tag push |

### Why a `dist/` subdirectory?

Grove's theme dir is served as static assets to the renderer. If you symlinked the whole dev repo, that mount would serve `node_modules/`, `package.json`, `bun.lock`, and the scripts as `application/octet-stream`. Linking only `dist/` keeps the surface area minimal — and matches exactly what gets zipped for a marketplace release.

## Release

```sh
bun run version:bump        # interactive: bumps dist/theme.json + package.json in lockstep
git commit -am "release: 0.2.0"
git tag v0.2.0
git push && git push --tags
```

Pushing the tag triggers `.github/workflows/release.yml`, which re-installs deps, rebuilds the fonts and zip, and attaches `dark-forest-<version>.zip` to a new GitHub release. Grove's marketplace install flow downloads from `github.com`, `codeload.github.com`, or `objects.githubusercontent.com` only, so a GitHub release asset is the simplest distribution channel.

To build the zip locally without releasing:

```sh
bun install
bun run build:fonts        # populate dist/fonts/
bun run validate           # check theme.json against the published schema
bun run build:zip          # produces dark-forest-<version>.zip at the repo root
```

## Requirements

- **Grove ≥ 0.8.0** (theme marketplace shipped in 0.8.0; the `--grove-*` token rename ships in the next release)
- For local development: [Bun](https://bun.sh) ≥ 1.3 and a `zip` CLI (preinstalled on macOS / most Linux distros)

## License

MIT © 2026 Alexander Pape. Fonts retain their upstream licenses (Cormorant Garamond — OFL; DM Sans — OFL; JetBrains Mono — OFL).
