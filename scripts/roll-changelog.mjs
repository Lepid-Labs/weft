// Move CHANGELOG.md's Unreleased entries under a new version heading dated
// today, leave an empty Unreleased above it, and repoint the compare links.
// Refuses an empty Unreleased section, so a release always says what changed.
// Usage: node scripts/roll-changelog.mjs <version>
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "CHANGELOG.md";
const UNRELEASED = "## [Unreleased]\n";
const UNRELEASED_LINK = /^\[Unreleased\]: (.+)\/compare\/v(.+)\.\.\.HEAD$/m;

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
	console.error("usage: node scripts/roll-changelog.mjs <major.minor.patch[-pre]>");
	process.exit(1);
}

const source = readFileSync(PATH, "utf8");
const start = source.indexOf(UNRELEASED);
if (start === -1) fail(`no "${UNRELEASED.trim()}" heading`);
if (source.includes(`## [${version}]`)) fail(`${version} already has a section`);

const bodyStart = start + UNRELEASED.length;
const next = source.indexOf("\n## [", bodyStart);
const body = source.slice(bodyStart, next === -1 ? undefined : next);
if (!body.trim()) fail("nothing under Unreleased to release");

const link = source.match(UNRELEASED_LINK);
if (!link) fail("no [Unreleased]: <repo>/compare/v<previous>...HEAD link");
const [, repo, previous] = link;

// en-CA formats as YYYY-MM-DD, in the releaser's own time zone.
const date = new Date().toLocaleDateString("en-CA");
const updated = source
	.replace(UNRELEASED, `${UNRELEASED}\n## [${version}] - ${date}\n`)
	.replace(
		UNRELEASED_LINK,
		`[Unreleased]: ${repo}/compare/v${version}...HEAD\n[${version}]: ${repo}/compare/v${previous}...v${version}`
	);
writeFileSync(PATH, updated);
console.log(`CHANGELOG.md: Unreleased is now ${version} - ${date}`);

function fail(message) {
	console.error(`${PATH}: ${message}`);
	process.exit(1);
}
