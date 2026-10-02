/**
 * Percent-decode a link destination part (`My%20Report.md` -> `My Report.md`).
 * `decodeURIComponent` throws on a malformed escape, and a literal `%` in a file
 * name (`100%.md`) is legal, so a part that does not decode is returned as
 * written, whole: its valid escapes are left alone too. Uncaught, the throw
 * would fail the whole manifest build, not just this link.
 *
 * Browser-safe, because the renderer has to read a link exactly the way link
 * extraction read it.
 */
export function decodePercent(text: string): string {
	try {
		return decodeURIComponent(text);
	} catch {
		return text;
	}
}
