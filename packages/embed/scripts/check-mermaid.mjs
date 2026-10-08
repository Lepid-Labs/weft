/**
 * Fail the build if a bundle carries mermaid itself, or loads a version other
 * than the one installed.
 *
 * A build step for the same reason `check-scoping.mjs` is one: both are facts
 * about files the build has just written. Nothing at source level shows that
 * an innocent `import("mermaid")` somewhere in `$lib` would put several MB
 * into `weft.iife.js` — lib-mode IIFE cannot split a chunk off, so it inlines.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const { version } = createRequire(import.meta.url)("mermaid/package.json");
const pinned = `mermaid@${version}/dist/mermaid.esm.min.mjs`;

/**
 * String literals only mermaid's own code contains — they survive its
 * minification and ours. Any one of them in a bundle means mermaid was bundled.
 */
const MERMAID_MARKERS = [
	"Denied attempt to modify a secure key",
	"Syntax error in text",
	"maxTextSize",
];

let failed = false;
for (const name of ["weft.js", "weft.iife.js", "section.js", "section.iife.js"]) {
	const source = readFileSync(fileURLToPath(new URL(`../dist/${name}`, import.meta.url)), "utf-8");

	if (!source.includes(pinned)) {
		console.error(`weft: dist/${name} does not load ${pinned} — the CDN pin is missing or stale.`);
		failed = true;
	}
	const found = MERMAID_MARKERS.filter((marker) => source.includes(marker));
	if (found.length) {
		console.error(`weft: dist/${name} bundles mermaid (found: ${found.join(", ")}).`);
		failed = true;
	}
}

if (failed) process.exit(1);
console.log(`weft: every bundle loads ${pinned} and bundles none of it.`);
