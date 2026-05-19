# Dark Forest

A moss-green dark forest theme for [Grove](https://github.com/grove-notes/grove) — Cormorant Garamond display serif, DM Sans body, JetBrains Mono code, with a warm dappled-light accent. Ships light and dark in a single CSS file via the browser's `light-dark()` function and follows your OS color scheme.

![Dark Forest preview](screenshots/cherrymon.png)

## Install

1. **Build the bundled fonts** (only required if you cloned this repo; published releases include `fonts/`):

   ```sh
   pnpm install
   pnpm run build:fonts
   ```

2. **Drop the theme into a Grove workspace.** Easiest path — pick one of your registered workspaces interactively:

   ```sh
   pnpm run install:theme
   ```

   That reads Grove's `recent-workspaces.json`, prompts you to choose, and creates a symlink at `<workspace>/.grove/themes/dark-forest/`. Pass `--workspace <name|path|id>` to skip the prompt, `--force` to replace an existing target.

   If Grove is running, you can query its live API instead of the on-disk file — handy if you're not sure the file is up to date:

   ```sh
   pnpm run install:theme --api http://127.0.0.1:60557
   # or
   GROVE_API_URL=http://127.0.0.1:60557 pnpm run install:theme
   ```

   (The port is OS-assigned; find it in Grove's devtools or via `lsof -nP -iTCP -sTCP:LISTEN -c Grove`.)

   Or do it by hand if you prefer:

   ```sh
   ln -s "$PWD/src" /path/to/your/workspace/.grove/themes/dark-forest
   ```

   (Link `src/`, not the repo root — see the note below. The directory name must be `dark-forest` to match the manifest `id`.)

3. **Pick the theme** in Grove → Settings → Marketplace → Themes → Dark Forest. Set it as the active light *and* dark theme — a single CSS file covers both schemes.

## What's in here

The repo splits into two halves: `src/` is *the theme* (what Grove sees), everything else is *dev/build scaffolding* (only used to produce `src/`).

| File | Purpose |
| --- | --- |
| `src/theme.json` | Grove manifest (`id`, `modes`, `entry`, …) |
| `src/theme.css` | The whole theme — `@font-face` declarations + `--px-*` token overrides |
| `src/fonts/*.woff2` | Bundled latin subsets of Cormorant Garamond, DM Sans (variable), JetBrains Mono |
| `scripts/build-fonts.mjs` | Copies the `.woff2` files out of `@fontsource` packages into `src/fonts/` |
| `scripts/validate-manifest.mjs` | Validates `src/theme.json` against `@grove-notes/manifest-schema` |
| `scripts/install.mjs` | Picks one of your registered Grove workspaces and symlinks `src/` into it |

### Why a `src/` subdirectory?

Grove's theme dir is served as static assets to the renderer — anything inside `<workspace>/.grove/themes/<id>/` is reachable on `/api/workspaces/<wid>/themes/<id>/<path>`. If you symlinked the whole dev repo, that mount would serve `node_modules/`, `package.json`, `pnpm-lock.yaml`, and the scripts as `application/octet-stream`. Linking only `src/` keeps the surface area minimal and reproduces what an official marketplace release (zip) would contain.

## Requirements

- **Grove ≥ 0.8.0** (theme marketplace shipped in 0.8.0)
- For local development: Node ≥ 18, pnpm ≥ 8

## License

MIT © 2026 Alexander Pape. Fonts retain their upstream licenses (Cormorant Garamond — OFL; DM Sans — OFL; JetBrains Mono — OFL).
