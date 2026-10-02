/**
 * Mermaid diagrams, drawn in the browser after the sanitizer has run.
 *
 * The render pipeline leaves a ` ```mermaid ` fence as the code block it always
 * was — `pre[data-lang="mermaid"]` — and that block is the placeholder. Once it
 * is in the DOM, this swaps it for mermaid's SVG. Without JavaScript, or when
 * mermaid cannot be loaded, the reader keeps the source as a code block, which
 * is exactly what the page showed before diagrams existed.
 *
 * Client side rather than server-rendered SVG so the allowlist stays as it is:
 * SVG is a large surface to admit through `extendSchema`, and a placeholder is
 * nothing new to admit. The SVG is trusted to mermaid's own `strict` mode
 * instead — labels through DOMPurify, no click bindings — which a document's
 * `%%{init}%%` directive cannot lift, because `securityLevel` is one of
 * mermaid's `secure` keys.
 *
 * The library itself is never imported here. A loader arrives through Svelte
 * context, so each host decides how it is fetched: the standalone app as a lazy
 * chunk, the embed from a pinned CDN URL, and a host with no loader simply
 * keeps the code blocks.
 *
 * This module holds the decisions and needs no DOM; `mermaid-dom.ts` applies
 * them to the page.
 */

/** The part of mermaid's API used here — narrow, so a CDN build of any recent version fits. */
export interface MermaidApi {
	initialize(config: MermaidSettings): void;
	render(id: string, text: string): Promise<{ svg: string }>;
}

export interface MermaidSettings {
	startOnLoad: boolean;
	securityLevel: "strict";
	suppressErrorRendering: boolean;
	theme: "base";
	themeVariables: ThemeVariables;
}

/** Resolves mermaid on first use. Called only on a page that has a diagram. */
export type MermaidLoader = () => Promise<MermaidApi>;

/** Context key the host app sets its `MermaidLoader` under. */
export const MERMAID_LOADER_KEY = "weft:mermaid";

export type ThemeVariables = Record<string, string | boolean>;

/** The colour tokens a diagram is drawn from. */
export const COLOR_TOKENS = [
	"--w-bg",
	"--w-bg-secondary",
	"--w-bg-elevated",
	"--w-text",
	"--w-text-secondary",
	"--w-accent",
	"--w-accent-subtle",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** Tokens as resolved on the page: colours as opaque `#rrggbb`, the font as written. */
export interface Palette {
	colors: Partial<Record<ColorToken, string>>;
	font?: string;
}

/**
 * Which token each of mermaid's `base` theme variables takes.
 *
 * `--w-border` is deliberately absent: several styles draw it as translucent
 * white, which is invisible on a light page — fine as a hairline under a
 * heading, useless as the outline of a box. Structure is drawn in the
 * secondary text colour instead, and node outlines in the accent.
 */
const VARIABLES: Record<string, ColorToken> = {
	background: "--w-bg",
	edgeLabelBackground: "--w-bg",
	primaryColor: "--w-bg-elevated",
	mainBkg: "--w-bg-elevated",
	actorBkg: "--w-bg-elevated",
	labelBoxBkgColor: "--w-bg-elevated",
	secondaryColor: "--w-accent-subtle",
	tertiaryColor: "--w-bg-secondary",
	clusterBkg: "--w-bg-secondary",
	noteBkgColor: "--w-bg-secondary",
	activationBkgColor: "--w-bg-secondary",
	primaryBorderColor: "--w-accent",
	nodeBorder: "--w-accent",
	actorBorder: "--w-accent",
	labelBoxBorderColor: "--w-accent",
	activationBorderColor: "--w-accent",
	noteBorderColor: "--w-accent",
	secondaryBorderColor: "--w-text-secondary",
	tertiaryBorderColor: "--w-text-secondary",
	clusterBorder: "--w-text-secondary",
	lineColor: "--w-text-secondary",
	signalColor: "--w-text-secondary",
	actorLineColor: "--w-text-secondary",
	primaryTextColor: "--w-text",
	secondaryTextColor: "--w-text",
	tertiaryTextColor: "--w-text",
	textColor: "--w-text",
	nodeTextColor: "--w-text",
	titleColor: "--w-text",
	noteTextColor: "--w-text",
	actorTextColor: "--w-text",
	signalTextColor: "--w-text",
	labelTextColor: "--w-text",
	loopTextColor: "--w-text",
};

const HEX = /^#[0-9a-f]{6}$/i;

/** WCAG relative luminance of a `#rrggbb` colour. */
export function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const channel = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Mermaid theme variables for a resolved palette.
 *
 * Mermaid's colour parser rejects `var()`, `color-mix()` and `oklch()`, so only
 * opaque hex reaches it; anything else is omitted and mermaid derives its own.
 * Dark mode is read off the background rather than `data-theme`, because a
 * fixed-scheme style such as `neon-butterfly` is dark whatever the toggle says.
 */
export function themeVariables(palette: Palette): ThemeVariables {
	const out: ThemeVariables = {};
	for (const [variable, token] of Object.entries(VARIABLES)) {
		const value = palette.colors[token];
		if (value && HEX.test(value)) out[variable] = value;
	}
	const bg = palette.colors["--w-bg"];
	if (bg && HEX.test(bg)) out.darkMode = luminance(bg) < 0.5;
	if (palette.font) out.fontFamily = palette.font;
	return out;
}

/** One diagram to draw, and where its outcome goes. */
export interface DiagramBlock {
	source: string;
	render(svg: string): void;
	fail(message: string): void;
}

let queue: Promise<void> = Promise.resolve();
let sequence = 0;

/**
 * Draw every block, each in isolation: a diagram that fails to parse marks only
 * its own block, and a loader that fails marks them all. Rejects only if a
 * block's own `fail` throws.
 *
 * Serialized across the page, because `initialize` is global — two mounts in
 * different styles interleaving would draw one's diagrams in the other's
 * colours.
 */
export function renderDiagrams(
	blocks: DiagramBlock[],
	load: MermaidLoader,
	variables: ThemeVariables
): Promise<void> {
	const run = queue.then(() => draw(blocks, load, variables));
	// A throwing outcome callback must not wedge every later page's diagrams.
	queue = run.catch(() => undefined);
	return run;
}

function messageOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function draw(
	blocks: DiagramBlock[],
	load: MermaidLoader,
	variables: ThemeVariables
): Promise<void> {
	if (!blocks.length) return;

	let mermaid: MermaidApi;
	try {
		mermaid = await load();
		mermaid.initialize({
			startOnLoad: false,
			securityLevel: "strict",
			// Otherwise mermaid appends its own "Syntax error" graphic to <body> —
			// a host's body, in an embed.
			suppressErrorRendering: true,
			theme: "base",
			themeVariables: variables,
		});
	} catch (error) {
		for (const block of blocks) block.fail(`Mermaid could not be loaded: ${messageOf(error)}`);
		return;
	}

	for (const block of blocks) {
		// Unique across the page, not the document: two mounts share one DOM.
		const id = `weft-mermaid-${++sequence}`;
		try {
			const { svg } = await mermaid.render(id, block.source);
			block.render(svg);
		} catch (error) {
			block.fail(messageOf(error));
		}
	}
}
