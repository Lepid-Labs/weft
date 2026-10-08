# Combine docs from several repositories

For teams whose documentation is spread across repositories. After it you can index docs roots from other
repositories into one graph, keep each machine's checkout locations out of the committed config, link with GitHub
URLs that work both on GitHub and in weft, and serve the whole graph without cloning anything. It builds on
[Index several projects into one graph](multiple-projects.md).

## Map repositories to checkouts

A docs root does not have to live in the repo weft runs from. A `projects` entry may name a `repo` — an `org/repo`
identity — and the `repos` map says where that repo is checked out on this machine:

```yaml
# weft.config.yaml (committed)
repos:
  acme/alpha: ../alpha

projects:
  - name: Meta
    docsDir: docs
  - name: Alpha
    repo: acme/alpha
    docsDir: docs        # relative to the mapped checkout
```

Everything then works as in any multi-project setup: nodes from every repo land in one namespaced graph, links
crossing repos resolve to edges, and each root's git history comes from its own repository, so every node carries its
own repo's dates.

`repos` values are paths — relative to the project root, absolute, or `~`-prefixed. Why projects name repos rather
than paths is recorded in [0020](../decisions/0020-multi-repo-roots-by-identity.md).

## Local overrides

Where a checkout lives is one machine's business, so the mapping belongs in `weft.config.local.yaml`, which should be
gitignored:

```yaml
# weft.config.local.yaml (gitignored)
repos:
  acme/alpha: ~/src/alpha
```

Local entries override committed ones per identity. The local file may set **only** `repos`, `style`, and `styleUrl`
(the last two so one developer can preview the corpus in a different theme) — any other option there is an error, so
committed and local config cannot quietly diverge. A project naming a `repo` that no map supplies fails at load with
an error pointing at the local file.

## GitHub blob URLs

A link to `https://github.com/acme/alpha/blob/main/docs/api.md` in any indexed document normally stays an external
link. With `acme/alpha` mapped, the URL resolves against the checkout, and when the file falls inside a configured docs
root it becomes a normal graph edge — same node, same validation, same sidebar presence as a relative link. The same
Markdown is fully functional on GitHub *and* in weft.

```markdown
See the [Alpha API](https://github.com/acme/alpha/blob/main/docs/api.md#endpoints).
```

That holds for [composed documents](composed-documents.md#which-link-is-the-include) too: a blob URL standing alone as
a block expands like a relative link, and a sidecar `target` may be the same URL, copied from the link it describes.

The edge records the URL as written in `resolvedFrom`. Any `blob/<ref>/` segment is accepted — weft serves the working
tree, so which ref the URL claims does not affect resolution. A URL into an unmapped repo, a non-`blob` URL (`tree/`,
issues, other hosts), or a path landing outside every docs root stays an ordinary external link. Nothing is ever
fetched over the network — unless you opt in with `weft serve --repo`, below.

## Serving without a checkout

Reading a cross-repo graph should not cost what authoring one does. `weft serve --repo` fetches instead of requiring
checkouts:

```sh
weft serve --repo acme/design-review          # remote HEAD
weft serve --repo acme/design-review --ref v2 # branch, tag, or commit sha
weft serve --gh acme/design-review --open     # --gh is an alias of --repo; --open launches the browser
```

Weft fetches that repo, reads its `weft.config.yaml`, fetches the repos it references, and serves the merged graph. A
repo in the `repos` map that resolves to a real local path keeps winning — fetching only fills the gaps, so someone
with three of five repos checked out reads their local working trees for those three and fetched copies of the rest.

Each fetched root keeps its full git history, so `modified` dates and the history-reading checks work exactly as over
a local checkout. Clones land in a cache (location set by `WEFT_CACHE_DIR`; see the
[README's environment variables](../../README.md#prerequisites)) keyed by resolved commit sha, so a moved branch
invalidates cleanly. A branch's ref resolution is re-checked after 15 minutes, or immediately with `--refresh`.
Fetched checkouts are read-only: nothing is written into them, and they are not watched for changes. How fetching
works is in [Repo fetching](../design/repo-fetching.md).

### Several sites in one repo

One repo can hold several sites, each a directory with its own `weft.config.yaml` and docs. `--dir` serves one of
them: the config, `docsDir` and `repos` paths all resolve from that directory, as if it were the repo root. It must be
a relative path that stays inside the repo, and it works the same over a local root.

```sh
weft serve --repo acme/docs --dir sites/help  # the help site in acme/docs
weft serve . --dir sites/help                 # the same, from a checkout
```

### Private repositories

Private repos authenticate with `GH_TOKEN` or `GITHUB_TOKEN`, falling back to `gh auth token` when the GitHub CLI is
installed. GitHub reports a private repo it will not serve exactly like a repo that does not exist, so a not-found
error always means one of the two. GitHub only; other hosts are out of scope.

## Manifest placement

`weft index` never writes into a checkout it does not own. A root living outside the project root gets its
per-project manifest under the meta repo instead — `.weft/projects/<slug>/manifest.json` — and `.weft/projects.json`
records where each manifest actually is. When the single implicit `docsDir` points outside the project root, the
merged manifest likewise lands under the project root's `.weft/` rather than in the external tree.

Set `manifestInRepo: true` on a project to opt a co-owned checkout back into `<docsDir>/.weft/manifest.json`
alongside its docs.
