// Set one version across every published workspace package, so pnpm can
// rewrite their workspace:* links to matching versions at publish time.
// Edits only the top-level "version" line so the file keeps its formatting
// (a JSON round-trip re-wraps arrays and fails `biome check`).
// Usage: node scripts/set-version.mjs <version>
import { readFileSync, writeFileSync } from "node:fs";

const PUBLISHED = ["packages/core", "packages/cli", "packages/ui"];
const VERSION_LINE = /^(\t"version":\s*")[^"]*(")/m;

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
	console.error("usage: node scripts/set-version.mjs <major.minor.patch[-pre]>");
	process.exit(1);
}

for (const dir of PUBLISHED) {
	const path = `${dir}/package.json`;
	const source = readFileSync(path, "utf8");
	if (!VERSION_LINE.test(source)) {
		console.error(`${path}: no top-level "version" field found`);
		process.exit(1);
	}
	const updated = source.replace(VERSION_LINE, `$1${version}$2`);
	writeFileSync(path, updated);
	console.log(`${JSON.parse(updated).name}@${version}`);
}
