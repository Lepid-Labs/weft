# Deploy the docs site

Run this to redeploy weft's public site by hand, or to recover it. The site normally deploys itself on every push to
`main` that changes it; this runbook is for when that did not happen or went wrong.

## Topology

Weft runs nowhere as a service. It is delivered to two places:

| Where | What | Deployed by |
|-------|------|-------------|
| npm registry | The `@lepid-labs/weft*` packages | The Release workflow, on a `v*` tag ([Release a version](release-a-version.md)) |
| GitHub Pages, <https://lepid-labs.github.io/weft/> | The landing page, and a docs browser over this repository's own docs | The Pages workflow, on a push to `main` |

The Pages workflow runs when a push changes `site/`, `docs/`, `packages/core/`, `packages/embed/` or
`scripts/gen-manifest.mjs`. It builds the embed bundle, writes this repository's manifest, and assembles `_site/`:

- `site/index.html` at the root, and `site/docs/index.html` at `docs/`, which mounts the embed bundle with
  `baseUrl: '..'`;
- the embed bundle (`weft.iife.js`, `weft.css`) at the root;
- the manifest at `docs/.weft/manifest.json`;
- every Markdown file under `docs/` at the site root, keeping its subdirectory, because node ids are relative to
  `docsDir` and the embed fetches each document at `<baseUrl>/<node id>`.

## Prerequisites

- Permission to run workflows in the GitHub repository, and the `gh` CLI logged in.

## Steps

1. To check the build locally first, run `just pages` and serve `_site/` with any static file server; the docs
   browser is at `/docs/`.
2. Start the deploy:

   ```sh
   gh workflow run pages.yml
   ```

3. Follow it to the end with `gh run watch`. The `deploy` job prints the page URL when it finishes.

## Verify

Open <https://lepid-labs.github.io/weft/docs/>. The document tree lists this repository's docs, and opening a
decision record under `decisions/` renders it. A request for
<https://lepid-labs.github.io/weft/docs/.weft/manifest.json> returns 200.

## Recovery

- **The build job failed.** Its log names the step. A failure in "Build @lepid-labs/weft-embed" is usually the
  bundle's own scoping or mermaid check; reproduce it with `just build-embed`.
- **The site deployed but is broken.** Revert the offending commit on `main` through a pull request; the push
  redeploys the previous state. To restore it sooner, re-run the last good Pages run (`gh run rerun <run-id>`).
