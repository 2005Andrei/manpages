/** "SEE ALSO" -> "See also"; leave mixed-case headings alone. */
export function prettyHeading(text: string) {
    const t = text.replace(/:$/, "");
    if (t !== t.toUpperCase()) return t;
    return t.charAt(0) + t.slice(1).toLowerCase();
}
