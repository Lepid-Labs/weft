# Publish a new package

Run this once, by hand, when a new workspace package is first released. npm trusted publishing can only be set up
for a package that already exists, so the Release workflow cannot publish a package's first version; after this,
[Release a version](release-a-version.md) publishes it with the others.

## Prerequisites

- An npm account with publish rights on the `@lepid-labs` scope, logged in (`npm whoami` prints the account), with
  two-factor authentication at hand.
- The package is ready to ship: it is not `private`, its `files` list names its build output, it has a README, and
  its `version` matches the other packages.

## Steps

1. Add the package's directory to the `PUBLISHED` list in `scripts/set-version.mjs`, so later releases bump it, and
   merge that change.
2. From an up-to-date `main`, build every package:

   ```sh
   pnpm -r run build
   ```

3. Publish whatever is not yet on npm:

   ```sh
   just publish
   ```

   pnpm skips every package whose version is already published, so only the new one goes out. Expect a prompt for a
   one-time password.
4. On npmjs.com, open the new package's settings and add a trusted publisher: GitHub Actions, organization
   `Lepid-Labs`, repository `weft`, workflow `release.yml`.

## Verify

`npm view @lepid-labs/<package> version` prints the version, and the package's settings page lists the trusted
publisher. The next run of the Release workflow publishes the package with provenance.

## Recovery

- **The wrong contents were published.** Within 72 hours, `npm unpublish @lepid-labs/<package>@<version>` removes
  it. After that, deprecate it and publish a fixed version.
- **The next release fails to publish this package with an authentication error.** The trusted publisher settings
  do not match the workflow; correct them in step 4 and re-run the Release workflow.
