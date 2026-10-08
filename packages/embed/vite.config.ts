import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// The version the CDN loader pins (src/mermaid-cdn.ts): the one installed here,
// so a lockfile bump is the whole cost of moving to a new mermaid.
const { version: mermaidVersion } = createRequire(import.meta.url)("mermaid/package.json");

/**
 * Two bundles, one build each: lib-mode IIFE takes a single entry. The default
 * mode is the full reader (`weft.*`, global `Weft`); `--mode section` is the
 * section mount alone (`section.*`, global `WeftSection`), which leaves out the
 * app, tree and search so a host showing one section does not pay for them.
 */
const BUNDLES = {
	full: { entry: "src/index.ts", name: "Weft", fileName: "weft" },
	section: { entry: "src/section/index.ts", name: "WeftSection", fileName: "section" },
} as const;

export default defineConfig(({ mode }) => {
	const bundle = mode === "section" ? BUNDLES.section : BUNDLES.full;

	return {
		plugins: [svelte()],
		define: {
			__MERMAID_VERSION__: JSON.stringify(mermaidVersion),
		},
		build: {
			lib: {
				entry: path.resolve(__dirname, bundle.entry),
				name: bundle.name,
				fileName: bundle.fileName,
				formats: ["es", "iife"],
			},
			cssCodeSplit: false,
			// The section build runs second and writes beside the full one.
			emptyOutDir: bundle === BUNDLES.full,
		},
		resolve: {
			alias: [
				// Resolve SvelteKit's $lib alias to the UI package's lib directory
				{ find: "$lib", replacement: path.resolve(__dirname, "../ui/src/lib") },
				// neon-butterfly's .ld-bg page artwork is a 1.2MB PNG, and lib-mode
				// Vite inlines every CSS asset as a data URI — shipping it in
				// dist/weft.css for a page treatment no embed renders. A transparent
				// pixel keeps the rule valid; the blend color still paints.
				{
					find: /^.*butterfly-circuit\.png$/,
					replacement: path.resolve(__dirname, "src/transparent-pixel.png"),
				},
			],
		},
		// Prevent Vite from trying to bundle Node.js built-ins referenced by @lepid-labs/weft-core's
		// server-side modules (they're tree-shaken away, but need to be marked external
		// at the rollup level so the browser build doesn't choke on them)
		optimizeDeps: {
			exclude: ["@lepid-labs/weft-core"],
		},
		ssr: {
			noExternal: [],
		},
	};
});
