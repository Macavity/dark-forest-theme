# Dark Forest

A moss-green dark forest theme for [Grove](https://github.com/grove-notes/grove) — Cormorant Garamond display serif, DM Sans body, JetBrains Mono code, with a warm dappled-light accent. Ships light and dark in a single CSS file via the browser's `light-dark()` function and follows your OS color scheme.

![Dark Forest preview](screenshots/cherrymon.png)

## Install

1. **Drop the theme into a Grove workspace:**

   ```sh
   ln -s "$PWD" /path/to/your/workspace/.grove/themes/dark-forest
   ```

   (Or just `cp -R`. The directory name must be `dark-forest` — it has to match the manifest `id`.)

2. **Build the bundled fonts** (only required if you cloned this repo; published releases include `fonts/`):

   ```sh
   pnpm install
   pnpm run build:fonts
   ```

3. **Pick the theme** in Grove → Settings → Marketplace → Themes → Dark Forest. Set it as the active light *and* dark theme — a single CSS file covers both schemes.

## What's in here

| File | Purpose |
| --- | --- |
| `theme.json` | Grove manifest (`id`, `modes`, `entry`, …) |
| `theme.css` | The whole theme — `@font-face` declarations + `--px-*` token overrides |
| `fonts/*.woff2` | Bundled latin subsets of Cormorant Garamond, DM Sans (variable), JetBrains Mono |
| `scripts/build-fonts.mjs` | Copies the `.woff2` files out of `@fontsource` packages into `fonts/` |
| `scripts/validate-manifest.mjs` | Validates `theme.json` against `@grove-notes/manifest-schema` |

## Requirements

- **Grove ≥ 0.8.0** (theme marketplace shipped in 0.8.0)
- For local development: Node ≥ 18, pnpm ≥ 8

## License

MIT © 2026 Alexander Pape. Fonts retain their upstream licenses (Cormorant Garamond — OFL; DM Sans — OFL; JetBrains Mono — OFL).
