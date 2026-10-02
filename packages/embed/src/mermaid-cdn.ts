import type { MermaidLoader } from "$lib/mermaid.js";

/** The mermaid version this build was made against — replaced at build time. */
declare const __MERMAID_VERSION__: string;

/**
 * Where the embed loads mermaid from unless the host says otherwise.
 *
 * Not bundled: the IIFE build cannot split a chunk off, so bundling would put
 * several MB of mermaid into `weft.iife.js` for every host, diagrams or not.
 * Pinned to the exact version the build was tested with, so a mermaid release
 * cannot change a host's diagrams under it.
 */
export const MERMAID_CDN_URL = `https://cdn.jsdelivr.net/npm/mermaid@${__MERMAID_VERSION__}/dist/mermaid.esm.min.mjs`;

export const loadMermaidFromCdn: MermaidLoader = () =>
	import(/* @vite-ignore */ MERMAID_CDN_URL).then((module) => module.default);

/** The loader a host's `mermaid` option selects: its own, the CDN default, or none. */
export function mermaidLoader(
	option: false | MermaidLoader | undefined
): MermaidLoader | undefined {
	if (option === false) return undefined;
	return option ?? loadMermaidFromCdn;
}
