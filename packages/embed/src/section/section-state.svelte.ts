/**
 * The mutable part of a `mountSection` — the counterpart of `doc-state`, so
 * `update()` re-points a mounted section without rebuilding it.
 */
export function createSectionState(initial: { path: string; anchor?: string }) {
	const state = $state({ path: initial.path, anchor: initial.anchor });
	return state;
}

export type SectionState = ReturnType<typeof createSectionState>;
