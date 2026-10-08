import type { Finding, Rule, Validator } from "../types.js";

export const ENTRY_POINT_MISSING: Rule = {
	id: "entry-point-missing",
	description: "The configured entryPoint names no document, so the UI opens its default instead",
	// The site still works — it lands where it would have without the option —
	// so this is a warning, and a project upgrading to a weft that honours
	// entryPoint does not fail a build over a value that was never read before.
	defaultSeverity: "warn",
};

/**
 * Check that `entryPoint` names a document. The manifest carries the entry
 * point only when it resolved, so a configured value with nothing in the
 * manifest is one that matched no node, or matched an artifact.
 */
export const entryPointValidator: Validator = {
	rules: [ENTRY_POINT_MISSING],

	run({ config, manifest }) {
		if (!config.entryPoint || manifest.site?.entryPoint) return [];
		const finding: Finding = {
			rule: ENTRY_POINT_MISSING.id,
			message: `entryPoint "${config.entryPoint}" names no document`,
			target: { kind: "graph" },
			hint: "Give a path relative to the project root (docs/overview.md) or a node id (overview.md) of an indexed document.",
			data: { entryPoint: config.entryPoint },
		};
		return [finding];
	},
};
