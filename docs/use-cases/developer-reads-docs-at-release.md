# UC-014 Developer reads the documentation as it was at a release

A project publishes releases on GitHub, and a developer needs to check the API spec as it existed in v2.3, not as it
is on the current main branch.

## Primary flow

1. The developer asks Weft to serve the project at v2.3.
2. Weft fetches the project as it was at that release, builds the graph, and serves it.
3. The developer navigates the full documentation graph as it existed at that release.

## Alternate flows

- 1a. The developer selects the version in the browser UI instead, then continues at step 3.

## Postconditions

The developer has read the docs of that release without checking out old branches or digging through git history.
