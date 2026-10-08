import { loadRemoteStyles } from "$lib/style-loader.js";
import { isBundledStyle } from "$lib/styles.js";
import type { StyleConfig } from "@lepid-labs/weft-core/browser";

/**
 * What every mount entry does before mounting, kept apart from both entries so
 * the section bundle can share it without importing the full app's.
 */

/** Fetch any non-bundled theme (CSS + fonts) from the configured styleUrl. */
export function loadRemoteIfNeeded(
	style: StyleConfig | undefined,
	styleUrl: string | undefined
): void {
	if (!styleUrl || !style) return;
	const names = (typeof style === "string" ? [style] : [style.dark, style.light]).filter(
		(name) => !isBundledStyle(name)
	);
	void loadRemoteStyles(styleUrl, names, { stylesheets: true });
}

/** The element a mount renders into, from a selector or the element itself. */
export function resolveContainer(target: string | HTMLElement): HTMLElement {
	const container =
		typeof target === "string" ? (document.querySelector(target) as HTMLElement | null) : target;

	if (!container) {
		throw new Error(`Weft: container not found: ${target}`);
	}
	return container;
}
