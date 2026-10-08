import type { RenderOptions } from "$lib/markdown.js";
import type { MermaidLoader } from "$lib/mermaid.js";
import {
	type SectionError,
	type SectionTarget,
	type SectionUrlTarget,
	rawFileUrl,
} from "$lib/section.js";
import { assertServableStyles } from "$lib/styles.js";
import type { StyleConfig } from "@lepid-labs/weft-core/browser";
import { mount, unmount } from "svelte";
import { loadRemoteIfNeeded, resolveContainer } from "../mount-helpers.js";
import SectionRoot from "./SectionRoot.svelte";
import { createSectionState } from "./section-state.svelte.js";

// Every lepid-design theme, as in the full bundle — `style` accepts the same
// names here, and each rule is inert outside Weft's own containers.
import "@lepid-labs/styles/all";

export { SectionError } from "$lib/section.js";
export type { SectionErrorKind, SectionTarget, SectionUrlTarget } from "$lib/section.js";
export type { MermaidApi, MermaidLoader } from "$lib/mermaid.js";

/**
 * How a section's file is fetched, when it is not a public GitHub repo or URL.
 *
 * One method, taking the same `path` the mount was given. A private repo goes
 * through here: the host's own backend holds the token and does the fetch, so
 * no credential ever reaches the browser. A full `WeftClient` satisfies it.
 */
export interface SectionClient {
	fetchDoc(path: string): Promise<string>;
}

/** What a mounted section may be re-pointed at. */
export interface SectionMountState {
	/**
	 * The file: a repo-relative path for `repo`, a path under `baseUrl`, or
	 * whatever `client.fetchDoc` accepts.
	 */
	path: string;
	/** A heading anchor (`#flags`); the section runs to the next heading as deep or shallower. Omit for the whole file. */
	anchor?: string;
}

/** A link inside the section that points into the docs. */
export interface SectionLink extends SectionTarget {
	/** Where the link leads by default, if anywhere — see `resolveUrl`. */
	url?: string;
}

export interface SectionMountOptions extends SectionMountState {
	/**
	 * GitHub `owner/repo` the docs live in. Files are fetched from it unless
	 * `client` or `baseUrl` is set, and links point at it unless `baseUrl` is.
	 */
	repo?: string;
	/**
	 * Branch, tag or commit to read. Defaults to `main`. Pin a tag to take doc
	 * changes only when you release; follow a branch to take them live.
	 */
	ref?: string;
	/** A base URL serving files at their paths — an alternative to `repo`. */
	baseUrl?: string;
	/** Fetch files yourself — for a private repo, through your own backend. */
	client?: SectionClient;
	/** Render the section's heading at this level (1–6), its subsections below it. */
	headingLevel?: number;
	/** Leave out the heading the section starts with — for a host that titles it itself. */
	hideHeading?: boolean;
	/**
	 * Where a relative link or image in the section points. Return undefined to
	 * keep the default: links open the file on GitHub (or under `baseUrl`), and
	 * images load from the raw file. A private repo's images need this — the
	 * browser cannot read raw files from a private repo.
	 */
	resolveUrl?: (target: SectionUrlTarget) => string | undefined;
	/**
	 * Called when a link into the docs is followed; the mount then does nothing
	 * else. Without it, the link opens its `url` in a new tab.
	 */
	onLinkClick?: (link: SectionLink) => void;
	/**
	 * Called when the section cannot be shown — the file failed to load, the
	 * anchor names no heading, or rendering threw. The mount then renders
	 * nothing, leaving the fallback to you. Without it, the mount shows the
	 * error's message in place.
	 */
	onError?: (error: SectionError) => void;
	remarkPlugins?: RenderOptions["remarkPlugins"];
	rehypePlugins?: RenderOptions["rehypePlugins"];
	extendSchema?: RenderOptions["extendSchema"];
	/** How mermaid is loaded, or `false` for none — as on `mountDoc`. */
	mermaid?: false | MermaidLoader;
	/** lepid-design style, as on `mountDoc`: a pair follows the host's `data-theme`. */
	style?: StyleConfig;
	/** Where to load a non-bundled style name from, as on `mountDoc`. */
	styleUrl?: string;
}

/** A mounted section. `update` re-points it; `destroy` removes it. */
export interface SectionMount {
	/** Show another file or section. Takes the whole state, as `mountDoc` does. */
	update(state: SectionMountState): void;
	destroy(): void;
}

/** Fetch raw files from the repo or base URL, unauthenticated. */
function urlClient(options: SectionMountOptions): SectionClient {
	return {
		async fetchDoc(path) {
			const url = rawFileUrl(options, path) as string;
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`.trim());
			return res.text();
		},
	};
}

/**
 * Render one section of one file into an element.
 *
 * The smallest of the mounts: no manifest, no document tree, no search — a
 * file, a heading in it, and the rendered section in the host's own layout.
 * For help text in a tool, kept in the docs where it is written and checked,
 * rather than copied into the tool where it drifts.
 *
 * Include links in the section render as the links they are; expanding them
 * needs the manifest's edges, which is `mountDoc`'s job.
 *
 * @example
 * const section = mountSection('#help', {
 *   repo: 'acme/tool', ref: 'v2.1.0',
 *   path: 'docs/cli.md', anchor: '#flags',
 *   headingLevel: 3,
 *   onError: () => showFallback(),
 * });
 * section.update({ path: 'docs/cli.md', anchor: '#exit-codes' });
 */
export function mountSection(
	target: string | HTMLElement,
	options: SectionMountOptions
): SectionMount {
	const container = resolveContainer(target);
	if (!options.client && !options.repo && !options.baseUrl) {
		throw new Error("Weft: mountSection needs `repo`, `baseUrl` or `client`");
	}
	if (!options.path) {
		throw new Error("Weft: mountSection needs a `path`");
	}
	const { headingLevel } = options;
	if (
		headingLevel !== undefined &&
		!(Number.isInteger(headingLevel) && headingLevel >= 1 && headingLevel <= 6)
	) {
		throw new RangeError(`Weft: headingLevel must be 1–6, got ${headingLevel}`);
	}
	assertServableStyles(options.style, options.styleUrl);
	loadRemoteIfNeeded(options.style, options.styleUrl);

	const view = createSectionState({ path: options.path, anchor: options.anchor });
	const app = mount(SectionRoot, {
		target: container,
		props: { options, client: options.client ?? urlClient(options), view },
	});

	return {
		update(next) {
			view.path = next.path;
			view.anchor = next.anchor;
		},
		destroy: () => unmount(app),
	};
}
