import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { StyleConfig } from "@lepid-labs/weft-core";
import { validateStyle } from "@lepid-labs/weft-core";

/**
 * `--style <name>` picks one theme; `--style <dark>/<light>` a pair the
 * light/dark toggle switches between. Same shapes `style` takes in
 * weft.config.yaml, and the same shape check.
 */
export function parseStyleFlag(value: string): StyleConfig {
	const parts = value.split("/");
	const style: unknown = parts.length === 2 ? { dark: parts[0], light: parts[1] } : value;
	if (parts.length > 2 || parts.some((p) => p.length === 0)) {
		throw new Error(
			`serve: --style takes a style name, or a dark/light pair such as luminous-precision/summer-cloud (got "${value}")`
		);
	}
	validateStyle(style, "--style");
	return style;
}

/** The theme roster: name → scheme it renders in. */
export type StyleRoster = Record<string, { scheme: "dark" | "light" }>;

/**
 * Read the ui-std-lib manifest the UI was built against. The CLI does not
 * depend on @nazuraki/styles itself — it is the UI's dependency — so resolve
 * it from the UI package's directory, which works under both pnpm's nested
 * layout and npm's hoisted one.
 */
export function loadStyleRoster(uiRoot: string): StyleRoster {
	const require = createRequire(resolve(uiRoot, "package.json"));
	const manifest = require("@nazuraki/styles/manifest") as { themes: StyleRoster };
	return manifest.themes;
}

/** A style the bundled roster lacks, with no `styleUrl` to fetch it from. */
export class UnknownStyleError extends Error {
	constructor(name: string, roster: StyleRoster) {
		super(
			`unknown style "${name}" — bundled styles are ${Object.keys(roster).join(", ")}; pass --style-url to load a newer one`
		);
		this.name = "UnknownStyleError";
	}
}

/**
 * Reject a style nothing can serve: a name the bundled roster lacks with no
 * `styleUrl` to fetch it from. Mirrors the UI's own check, but runs before the
 * server starts, so a typo fails here rather than in the browser.
 */
export function assertServableStyle(
	style: StyleConfig | undefined,
	styleUrl: string | undefined,
	roster: StyleRoster
): void {
	if (!style || styleUrl) return;
	const names = typeof style === "string" ? [style] : [style.dark, style.light];
	for (const name of names) {
		if (!(name in roster)) throw new UnknownStyleError(name, roster);
	}
}
