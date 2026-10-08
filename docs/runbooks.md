# Runbooks

Operational procedures for releasing weft and deploying its public site, one procedure per file. Weft runs nowhere as
a service; its deployment topology, the npm registry and GitHub Pages, is described in
[Deploy the docs site](runbooks/deploy-the-docs-site.md#topology).

| Runbook | Summary |
|---------|---------|
| [Release a version](runbooks/release-a-version.md) | Bump every package to one version, tag it, and let the Release workflow publish to npm. |
| [Publish a new package](runbooks/publish-a-new-package.md) | Publish a new package's first version by hand so it can be given a trusted publisher. |
| [Deploy the docs site](runbooks/deploy-the-docs-site.md) | Redeploy or recover the GitHub Pages site, and where everything is deployed. |
