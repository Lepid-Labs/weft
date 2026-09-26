import { existsSync, statSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * The directory `serve --dir` names inside a root: a checkout or a fetched
 * repo. It must be relative and stay inside the root, since with `--repo` the
 * root is a cache entry and anything outside it is another repo's clone.
 */
export function resolveSubRoot(root: string, dir: string | undefined): string {
	if (dir === undefined || dir === "" || dir === ".") return root;
	if (isAbsolute(dir)) {
		throw new Error(`--dir "${dir}" must be relative to the served root`);
	}
	const target = resolve(root, dir);
	const rel = relative(root, target);
	if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
		throw new Error(`--dir "${dir}" leaves the served root`);
	}
	if (!existsSync(target) || !statSync(target).isDirectory()) {
		throw new Error(`--dir "${dir}" is not a directory in ${root}`);
	}
	return target;
}
