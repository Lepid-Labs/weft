# Run weft from the command line

For anyone serving, indexing or checking a docs graph with the `weft` CLI. After it you can browse a project's docs
locally, rebuild the manifest without the UI, and fail a CI build on broken links or stale claims.

## Start a server

```sh
# Install globally, or run any command as `npx @lepid-labs/weft <command>`
npm install -g @lepid-labs/weft

# From your project root (where weft.config.yaml lives)
weft serve
```

This opens the graph browser at `http://localhost:7777`. Weft watches your docs directory and rebuilds the manifest on
every file change. To read a repository's graph without cloning it, see
[Serving without a checkout](multiple-repositories.md#serving-without-a-checkout).

Every command takes an optional `[root-dir]`, the directory holding `weft.config.yaml`. It defaults to the current
directory. What goes in that file is in [Configure weft](configuration.md).

## weft serve

Starts the Weft UI server and watches for changes.

```sh
weft serve               # uses current directory
weft serve /path/to/repo # explicit root
weft serve --port 8080   # custom port
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `7777` | Port to listen on |
| `--host` | `127.0.0.1` | Interface to listen on; `0.0.0.0` or `::` exposes it on every interface |
| `--open` | `false` | Open the browser once the server is up |
| `--style` | from config | lepid-design style: one theme name, or a `dark/light` pair such as `luminous-precision/summer-cloud`; outranks `style` in both config files (see [Pick a style](theming.md#pick-a-style)) |
| `--style-url` | from config | Base URL serving lepid-design theme CSS and `manifest.json`, for a style newer than the bundled set (see [Styles newer than the bundled set](theming.md#styles-newer-than-the-bundled-set)) |
| `--repo`, `--gh` | — | Serve a GitHub repo (`org/repo`) without a checkout, fetching into a cache (see [Serving without a checkout](multiple-repositories.md#serving-without-a-checkout)) |
| `--ref` | remote HEAD | Branch, tag or commit sha to fetch, with `--repo` |
| `--refresh` | `false` | Re-resolve fetched refs even when the cached resolution is fresh |
| `--dir` | — | Serve this subdirectory of the root, or of the fetched repo, as the root (see [Several sites in one repo](multiple-repositories.md#several-sites-in-one-repo)) |
| `--dev` | `false` | Serve the UI from source through Vite with hot reload; needs a checkout of the weft repo |

On start it prints how many docs and edges were indexed, the Node version and the socket it is listening on, then
requests the UI and the API from inside the process before announcing the url or opening a browser.
`[OK] Weft server running at …` with a browser that still cannot connect points at the browser's side: a proxy that
does not bypass localhost, or a policy. `[FAIL]` names the socket error. A port that is already taken (another Weft,
say) is reported as such; pass `--port` to pick another.

The server rebuilds and hot-reloads the manifest whenever docs change. Shut down with `Ctrl-C`.

## weft index

Rebuilds the manifest without starting the UI. Writes `docs/.weft/manifest.json`, or the paths in
[The manifest](configuration.md#the-manifest) when several projects are configured.

```sh
weft index               # current directory
weft index --quiet       # suppress output
weft index /path/to/repo
```

Useful in CI to pre-build the manifest, or to verify graph state without launching a browser.

| Flag | Default | Description |
|------|---------|-------------|
| `--quiet` | `false` | Suppress output |

## weft analyze

Builds the graph, runs every validation rule over it, and reports what they found. Always exits 0: it reports, it does
not gate.

```sh
weft analyze                 # current directory
weft analyze --json          # machine-readable result
weft analyze --list-rules    # rule ids and their default severities
```

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | `false` | Emit the full result as JSON, including counts and which rules ran |
| `--list-rules` | `false` | List the registered rules and exit without validating |

`--list-rules` is how you find the ids to put in the [`rules`](validation.md#severities) config block.

## weft check

The same validation, for CI. Exits `1` if any rule reports an **error**; warnings and notes report but pass, so a rule
can be adopted at `warn` before being promoted.

```sh
weft check               # current directory
weft check --json        # machine-readable result
```

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | `false` | Emit the full result as JSON |

Turn a noisy rule down or off per project with the [`rules`](validation.md#severities) config block rather than
dropping the command from CI. What each rule reports is in [Validate your docs](validation.md).
