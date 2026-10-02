/**
 * The DOM half of Mermaid rendering: find the placeholders, read the palette
 * the page is actually showing, and put each outcome where its block was.
 * The decisions — theme mapping, isolation, serialization — live in
 * `mermaid.ts`, which needs no DOM.
 */
import {
	COLOR_TOKENS,
	type DiagramBlock,
	type MermaidLoader,
	type Palette,
	renderDiagrams,
	themeVariables,
} from "./mermaid.js";

/** Placeholders not yet drawn, and diagrams already drawn — the latter to redraw on a theme change. */
const TARGETS = 'pre[data-lang="mermaid"], div.weft-mermaid';

/** Each drawn diagram's source, so a theme change can redraw it. */
const sources = new WeakMap<Element, string>();

/** Opaque `#rrggbb` for a colour token, composited over `backdrop`. */
function resolveColor(
	root: HTMLElement,
	ctx: CanvasRenderingContext2D,
	token: string,
	backdrop: string
): string | undefined {
	// A probe rather than reading the custom property: its computed `color` has
	// every `var()` and `color-mix()` resolved, which the raw token does not.
	const probe = document.createElement("span");
	probe.style.color = `var(${token})`;
	probe.hidden = true;
	root.appendChild(probe);
	const color = getComputedStyle(probe).color;
	probe.remove();
	if (!color) return undefined;

	// One pixel, painted over the backdrop: flattens translucency (several
	// styles' accent glows are rgba) and converts any colour space to sRGB.
	ctx.fillStyle = backdrop;
	ctx.fillRect(0, 0, 1, 1);
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, 1, 1);
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
	return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** The palette in effect at `root` — its own scope, so an embed reads its mount's style. */
export function readPalette(root: HTMLElement): Palette {
	const font = getComputedStyle(root).getPropertyValue("--w-font-sans").trim() || undefined;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = 1;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return { colors: {}, font };

	const colors: Palette["colors"] = {};
	const bg = resolveColor(root, ctx, "--w-bg", "#ffffff");
	if (bg) colors["--w-bg"] = bg;
	for (const token of COLOR_TOKENS) {
		if (token === "--w-bg") continue;
		const value = resolveColor(root, ctx, token, bg ?? "#ffffff");
		if (value) colors[token] = value;
	}
	return { colors, font };
}

function errorBlock(message: string, source: string): HTMLElement {
	const box = document.createElement("div");
	box.className = "weft-mermaid-error";

	const notice = document.createElement("p");
	const label = document.createElement("strong");
	label.textContent = "Diagram could not be rendered.";
	// textContent, never innerHTML: mermaid's messages quote the source.
	notice.append(label, ` ${message}`);

	const pre = document.createElement("pre");
	const code = document.createElement("code");
	code.textContent = source;
	pre.append(code);

	box.append(notice, pre);
	return box;
}

/**
 * Draw (or redraw) every diagram under `root`. Resolves `true` when there were
 * any, so the caller knows layout below them has moved.
 */
export async function renderMermaidIn(root: HTMLElement, load: MermaidLoader): Promise<boolean> {
	const targets = [...root.querySelectorAll<HTMLElement>(TARGETS)];
	if (!targets.length) return false;

	// Mermaid measures label text as it lays out; measured in a fallback font,
	// boxes come out the wrong size once the webfont arrives.
	await document.fonts?.ready;

	const blocks = targets.map((target): DiagramBlock => {
		const source = sources.get(target) ?? target.textContent ?? "";
		// A newer render may have replaced the document meanwhile; drawing into a
		// detached element is harmless, but there is no point.
		const replace = (next: HTMLElement) => {
			if (target.isConnected) target.replaceWith(next);
		};
		return {
			source,
			render(svg) {
				const figure = document.createElement("div");
				figure.className = "weft-mermaid";
				figure.innerHTML = svg;
				sources.set(figure, source);
				replace(figure);
			},
			fail(message) {
				replace(errorBlock(message, source));
			},
		};
	});

	await renderDiagrams(blocks, load, themeVariables(readPalette(root)));
	return true;
}
