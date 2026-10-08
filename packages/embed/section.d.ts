/**
 * Types for `@lepid-labs/weft-embed/section`.
 *
 * Written by hand, so they stand alone: the implementation's own types reach
 * into Weft's UI sources and into unified, neither of which a host installs.
 * `src/section/declaration-sync.ts` fails the typecheck if this file and the
 * implementation stop naming the same options.
 */

/** A file in the docs source, and optionally a heading in it. */
export interface SectionTarget {
	/** Path as the source names it: repo-relative for GitHub, or what the client fetches. */
	path: string;
	/** A heading anchor, `#`-prefixed. */
	anchor?: string;
}

/** A relative URL in the section, and whether it came from a link or an image. */
export interface SectionUrlTarget extends SectionTarget {
	kind: "link" | "image";
}

/** A link inside the section that points into the docs. */
export interface SectionLink extends SectionTarget {
	/** Where the link leads by default, if anywhere — see `resolveUrl`. */
	url?: string;
}

/** Why a section could not be shown. */
export type SectionErrorKind = "load" | "anchor" | "render";

/**
 * A section that could not be shown. `kind` tells a host which failure it is:
 * `"load"` — the file could not be fetched; `"anchor"` — the file has no such
 * heading, usually because it was renamed; `"render"` — a plugin threw.
 */
export declare class SectionError extends Error {
	readonly kind: SectionErrorKind;
	readonly path: string;
	readonly anchor?: string;
	constructor(kind: SectionErrorKind, target: SectionTarget, message: string, cause?: unknown);
}

/** How a private source is fetched: the host's backend holds the credentials. */
export interface SectionClient {
	fetchDoc(path: string): Promise<string>;
}

/** The part of mermaid's API Weft uses. */
export interface MermaidApi {
	initialize(config: object): void;
	render(id: string, text: string): Promise<{ svg: string }>;
}

/** Resolves mermaid on first use, only for a section that has a diagram. */
export type MermaidLoader = () => Promise<MermaidApi>;

/** One lepid-design style name, or a pair the mount picks between by the host's `data-theme`. */
export type StyleConfig = string | { dark: string; light: string };

/** A unified plugin, preset, or `[plugin, options]` tuple — unified's `Pluggable`. */
export type Pluggable = unknown;

/** rehype-sanitize's schema: an allowlist of tags and attributes. */
export type SanitizeSchema = Record<string, unknown>;

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
	 * Called when the section cannot be shown. The mount then renders nothing,
	 * leaving the fallback to you. Without it, the mount shows the message.
	 */
	onError?: (error: SectionError) => void;
	/** Extra remark plugins, applied to the Markdown tree. */
	remarkPlugins?: Pluggable[];
	/** Extra rehype plugins, applied to the HTML tree before it is sanitized. */
	rehypePlugins?: Pluggable[];
	/** Widen the sanitizer's allowlist to cover what `rehypePlugins` emit. */
	extendSchema?: (schema: SanitizeSchema) => SanitizeSchema;
	/** How mermaid is loaded, or `false` for none. Defaults to a pinned jsDelivr build. */
	mermaid?: false | MermaidLoader;
	/** lepid-design style. Defaults to dark=luminous-precision / light=summer-cloud. */
	style?: StyleConfig;
	/** Where to load a style name newer than the bundled set from. */
	styleUrl?: string;
}

/** A mounted section. `update` re-points it; `destroy` removes it. */
export interface SectionMount {
	/** Show another file or section. Takes the whole state: an omitted anchor means the whole file. */
	update(state: SectionMountState): void;
	destroy(): void;
}

/** Render one section of one file into an element. */
export declare function mountSection(
	target: string | HTMLElement,
	options: SectionMountOptions
): SectionMount;
