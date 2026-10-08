# weft — documentation graph browser

default:
    @just --list

# Install dependencies
install:
    pnpm install

# Start dev server
dev:
    pnpm dev

# Run the app (dev server)
run: dev

# Build all packages
build:
    pnpm -r run build

# Run all checks (lint + typecheck + test)
check: lint typecheck test

# Lint and check formatting
lint:
    pnpm biome check .

# Fix lint and formatting issues
fix:
    pnpm biome check . --write

# Type-check all packages
typecheck:
    pnpm -r run typecheck

# Run all tests
test:
    pnpm -r run test

# Build the embeddable bundle. Its own build step asserts the bundle ships no
# rule that can reach a host page — the check that source-level tests cannot do.
build-embed:
    pnpm --filter @lepid-labs/weft-core build
    pnpm --filter @lepid-labs/weft-ui exec svelte-kit sync
    pnpm --filter @lepid-labs/weft-embed build

# Build the GitHub Pages site into _site/
pages: build-embed
    node scripts/gen-manifest.mjs
    mkdir -p _site/docs
    cp site/index.html _site/index.html
    cp site/docs/index.html _site/docs/index.html
    cp packages/embed/dist/weft.iife.js _site/weft.iife.js
    cp packages/embed/dist/weft.css _site/weft.css
    cp -r docs/.weft _site/docs/.weft
    rsync -a --include='*/' --include='*.md' --exclude='*' --prune-empty-dirs docs/ _site/

# Start a release: branch from main, bump every package, roll the changelog, commit
release version:
    #!/usr/bin/env bash
    # Merge the pull request this branch becomes, then run `just release-tag <version>`.
    set -euo pipefail
    if ! git diff --quiet || ! git diff --cached --quiet; then
        echo "Commit or stash your changes first." >&2
        exit 1
    fi
    git switch main
    git pull --ff-only
    if git rev-parse --verify --quiet "refs/heads/release/v{{version}}" >/dev/null; then
        echo "Branch release/v{{version}} already exists." >&2
        exit 1
    fi
    # The changelog check fails on an empty Unreleased before anything is written.
    node scripts/roll-changelog.mjs {{version}}
    node scripts/set-version.mjs {{version}}
    git switch -c release/v{{version}}
    git add CHANGELOG.md packages/*/package.json
    git commit -m "chore: release v{{version}}"
    echo "Next: push release/v{{version}}, open a pull request titled 'chore: release v{{version}}',"
    echo "merge it, then run: just release-tag {{version}}"

# Tag the merged release commit on main and push the tag, which runs the Release workflow
release-tag version:
    #!/usr/bin/env bash
    # Pull requests are squash-merged, so the tag goes on main's copy of the release
    # commit; the one on the release branch never reaches main.
    set -euo pipefail
    git switch main
    git pull --ff-only
    subject="chore: release v{{version}}"
    commit=$(git log --format='%H %s' | awk -v s="$subject" '{ subj = substr($0, 42) } !found && (subj == s || index(subj, s " (#") == 1) { found = $1 } END { print found }')
    if [ -z "$commit" ]; then
        echo "No '$subject' commit on main. Merge the release pull request first." >&2
        exit 1
    fi
    actual=$(git show "$commit:packages/cli/package.json" | node -p "JSON.parse(require('fs').readFileSync(0, 'utf8')).version")
    if [ "$actual" != "{{version}}" ]; then
        echo "$(git log -1 --format=%h "$commit") is at version $actual, not {{version}}." >&2
        exit 1
    fi
    git tag v{{version}} "$commit"
    git push origin v{{version}}
    echo "Tagged $(git log -1 --format='%h %s' "$commit"). Watch the Release workflow: gh run watch"

# Publish from this machine instead of CI (a new package's first release, before npm trusts CI)
publish:
    pnpm -r publish --access public

# Remove build artifacts and node_modules
clean:
    rm -rf node_modules dist .svelte-kit _site

# Reinstall from scratch
fresh: clean install
