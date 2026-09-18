import { configDefaults, defineConfig } from "vitest/config";

// vitest 4 dropped `**/dist/**` from its default excludes. `tsc` emits the
// compiled tests alongside the sources, so without this the dist copies run
// too and fail on fixture paths that only exist under src/.
export default defineConfig({
	test: {
		exclude: [...configDefaults.exclude, "**/dist/**"],
	},
});
